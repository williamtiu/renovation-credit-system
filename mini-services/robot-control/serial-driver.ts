/**
 * Serial Driver — IM6014 串列匯流排驅動（真機模式）
 *
 * Direct frame-level access to the IM6014 bus over the Linux serial port
 * (default /dev/ttyUSB0 @ 6,000,000 baud). Packets are produced by
 * im6014-protocol.ts, which is byte-identical to the SDK's MotorProtocol.
 *
 * Three behaviours come from the hardware, not from the spec, and are encoded
 * here deliberately:
 *
 *   1. Reading is not passive. A motor answers only after it receives a packet,
 *      so live telemetry requires monitor-class traffic: a position-hold whose
 *      target is each joint's own measured angle (commanded == measured, net
 *      motion zero). Nothing is transmitted until the guard allows it.
 *   2. Commands are always built from the **absolute** measured angle. The
 *      encoders are absolute multi-turn counters that are un-cleared; commanding
 *      a relative angle would drive the motors toward absolute zero.
 *   3. kp = kd = 0 does NOT engage FOC — the motor keeps reporting mode 0. The
 *      hold loop therefore always sends gains. Feedback `mode` is informational
 *      only; only a non-zero error_code takes a joint out of the loop.
 *
 * The timeout bit stays off. Bit 7 arms the motor's packet-timeout protection;
 * the SDK feeds the bus at 1 kHz where it never trips, this driver sends at
 * 5-100 Hz where it does, and a protected motor ignores the position command
 * completely.
 */

import { emptyJointState, JOINTS } from './robot-model'
import type { HalDriver, DriverConfig, DriverEvent, LowLevelCommand, Telemetry } from './hal-types'
import { HalError } from './hal-types'
import {
  buildControlPacket, buildClearPacket, buildResetPacket, parseFeedbackPacket,
  FEEDBACK_HEADER, FEEDBACK_PACKET_SIZE, DEFAULT_BAUDRATE, JOINT_COUNT,
} from './im6014-protocol'
import type { MotorFeedback } from './im6014-protocol'
import { loadJointCalibrationFile, ZeroReferenceStore } from './joint-calibration'
import type { JointCalibration, ZeroReference } from './joint-calibration'
import { MotionGuard, MAX_HOLD_STEP_RAD, MAX_HOLD_KP, MAX_HOLD_KD } from './motion-guard'
import { TtyTransport } from './tty-transport'
import { JogRunner } from './jog-runner'
import { JOG_TICK_DT, DEFAULT_JOG_RATE, DEFAULT_JOG_KP, DEFAULT_JOG_KD } from './jog-constants'

// serialport is deliberately NOT used: its native binding calls uv_poll_init,
// which Bun does not support on this platform, so opening a port crashes the
// process. tty-transport.ts drives the char device through fs instead.

/** Half-duplex RS485: pace per-joint writes so a command does not collide with
 *  the reply a previous command triggered. */
const INTER_WRITE_DELAY_S = 0.000115
const MIN_RATE_HZ = 5.0
const MAX_RATE_HZ = 100.0
const FAULT_REPROBE_S = 2.0
const READ_INTERVAL_MS = 5

interface JointSnapshot {
  joint: number
  motorId: number
  present: boolean
  lastRx: number | null
  mode: number
  tempDriver: number
  tempWinding: number
  voltage: number
  errorCode: number
  warningCode: number
  /** URDF frame absolute — what the motor reports. */
  qAbs: number
  /** URDF frame relative to the operator-declared zero. */
  q: number
  dq: number
  tau: number
}

/** Resync-tolerant framer for the 26-byte feedback stream. */
export class PacketFramer {
  private buffer = Buffer.alloc(0)
  resyncs = 0

  feed(data: Buffer): MotorFeedback[] {
    this.buffer = Buffer.concat([this.buffer, data])
    const packets: MotorFeedback[] = []
    let search = 0
    const header = Buffer.from(FEEDBACK_HEADER)
    const size = FEEDBACK_PACKET_SIZE

    for (;;) {
      const idx = this.buffer.indexOf(header, search)
      if (idx < 0) {
        const keep = header.length - 1
        if (this.buffer.length > keep) this.buffer = this.buffer.subarray(this.buffer.length - keep)
        return packets
      }
      if (idx > search) this.resyncs++
      if (this.buffer.length - idx < size) {
        this.buffer = this.buffer.subarray(idx)
        return packets
      }
      const raw = this.buffer.subarray(idx, idx + size)
      const parsed = parseFeedbackPacket(raw)
      if (parsed === null) {
        // Header matched but CRC failed: step past it and keep hunting.
        this.resyncs++
        search = idx + 2
        continue
      }
      packets.push(parsed)
      this.buffer = this.buffer.subarray(idx + size)
      search = 0
      if (this.buffer.length > 8192) this.buffer = this.buffer.subarray(this.buffer.length - 8192)
    }
  }
}

export interface SerialDriverStatus {
  port: string
  baudrate: number
  rxBytes: number
  rxPackets: number
  crcErrors: number
  resyncs: number
  lastRx: number | null
  holdCycles: number
  probeCycles: number
  zeroReference: ZeroReference | null
  faults: Array<{ joint: number; errorCode: number }>
  motorIds: number[]
}

export class SerialDriver implements HalDriver {
  readonly mode = 'serial' as const
  readonly guard = new MotionGuard()

  private transport = new TtyTransport()
  private readTimer: ReturnType<typeof setInterval> | null = null
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private connected = false
  private eventCb: ((ev: DriverEvent) => void) | null = null

  private config: DriverConfig = { port: '/dev/ttyUSB0', baudrate: DEFAULT_BAUDRATE }
  private calib: JointCalibration[] = []
  private zeroStore: ZeroReferenceStore | null = null
  private zeroRef: number[] | null = null
  private zeroInfo: ZeroReference | null = null

  private framer = new PacketFramer()
  private snapshots: JointSnapshot[] = []
  private motorIds: number[] = []
  private holdTarget: Array<number | null> = []
  private reprobeAt: number[] = []

  private rateHz = 50
  private holdKp = 20.0
  private holdKd = 0.5

  // The ramp is what moves the arm. A mode-1 packet whose velocity is zero is
  // accepted by the motor and moves nothing, so goto/home run through this
  // runner, which streams velocity-limited anchored steps at 60 Hz.
  private jog: JogRunner | null = null
  private jogTimer: ReturnType<typeof setInterval> | null = null
  private jogRate = DEFAULT_JOG_RATE
  private jogKp = DEFAULT_JOG_KP
  private jogKd = DEFAULT_JOG_KD

  private rxBytes = 0
  private rxPackets = 0
  private crcErrors = 0
  private lastRx: number | null = null
  private holdCycles = 0
  private probeCycles = 0
  private lastError: string | null = null

  telemetry: Telemetry = {
    joints: emptyJointState(),
    errorCode: 0,
    errorMessage: null,
    temp: 36,
  }

  // ---------- 生命周期 ----------

  async connect(config: DriverConfig): Promise<void> {
    this.config = { ...this.config, ...config }
    if (this.connected) return

    // Calibration drives every angle we report, so a missing/unreadable table
    // must stop configuration rather than silently report motor-frame angles.
    const calibPath = config.calibPath
    if (!calibPath) {
      throw new HalError(
        'serial 模式需要關節校準檔案（calibPath）。格式：「joint dir scale offset」，' +
        '對應 urdf = dir * scale * motor + offset。冇校準表就報嘅唔係 URDF frame。',
        27
      )
    }
    try {
      this.calib = loadJointCalibrationFile(calibPath)
    } catch (err) {
      throw new HalError(`讀取校準檔案失敗 (${calibPath}): ${(err as Error).message}`, 27)
    }

    this.motorIds = this.calib.map((_, i) => i)
    this.snapshots = this.motorIds.map((mid, i) => this.blankSnapshot(i, mid))
    this.holdTarget = Array(JOINT_COUNT).fill(null)
    this.reprobeAt = Array(JOINT_COUNT).fill(0)

    if (config.rateHz) this.rateHz = Math.max(MIN_RATE_HZ, Math.min(MAX_RATE_HZ, config.rateHz))
    if (typeof config.holdKp === 'number') this.holdKp = Math.max(0, Math.min(MAX_HOLD_KP, config.holdKp))
    if (typeof config.holdKd === 'number') this.holdKd = Math.max(0, Math.min(MAX_HOLD_KD, config.holdKd))

    // The declared zero belongs to the arm, not to this process: reopening the
    // port must bring back the pose the operator named as 0.
    if (config.zeroPath) {
      this.zeroStore = new ZeroReferenceStore(config.zeroPath)
      const restored = this.zeroStore.load()
      if (restored) {
        this.zeroRef = restored.qAbs
        this.zeroInfo = restored
        this.emit({ kind: 'info', message: `零位參考已從磁碟恢復（source=${restored.source}）` })
      } else {
        this.zeroRef = null
        this.zeroInfo = null
      }
    } else {
      this.zeroStore = null
      this.zeroRef = null
      this.zeroInfo = null
    }

    const baudRate = this.config.baudrate ?? DEFAULT_BAUDRATE
    let openRes
    try {
      openRes = this.transport.open(this.config.port, baudRate, {
        allowSharedBus: config.allowSharedBus === true,
      })
    } catch (err) {
      throw new HalError(
        `無法打開 ${this.config.port} @ ${baudRate}: ${(err as Error).message}。` +
        `串口係單擁有者 — 確認冇其他程序（例如 ROS 2 arm_bridge）佔用，` +
        `並確認已加入 dialout 群組。`,
        20
      )
    }

    this.connected = true
    this.startReadLoop()

    // Reading this bus is not passive, but what the poller sends is net-zero,
    // and it yields the instant motion is unlocked — so opening may start
    // reading on its own while moving the arm still needs the phrase.
    const armed = this.guard.autoArmMonitor('auto-armed on connect')
    this.startPollLoop()

    this.emit({
      kind: 'info',
      message:
        `串口已連線: ${this.config.port} @ ${baudRate} (IM6014 bus) — ` +
        `motion LOCKED, monitor ${armed ? 'auto-armed' : 'armed'}`,
    })
    if (!openRes.baudConfigured) {
      // The port is usable, but the wire speed was not applied — at the wrong
      // baud the bus returns garbage frames, so say so out loud.
      this.emit({ kind: 'error', message: `波特率未設定成功: ${openRes.baudMessage}`, code: 28 })
    }
  }

  async disconnect(): Promise<void> {
    this.teardown()
    this.emit({ kind: 'info', message: '串口已斷開' })
  }

  isConnected(): boolean {
    return this.connected
  }

  getTelemetry(): Telemetry {
    this.refreshTelemetry()
    return this.telemetry
  }

  // ---------- 運動 ramp（goto / home 行呢度，唔係單個 packet） ----------

  /**
   * One mode-1 jog packet in the encoder absolute frame. The velocity is not
   * decoration: a mode-1 packet with a zero speed limit is accepted by the
   * motor and moves nothing, which is exactly what made a first goto reach the
   * wire with the arm sitting still.
   */
  writeJog = async (joint: number, qAbs: number, dqAbs: number, kp: number, kd: number): Promise<boolean> => {
    if (!this.transport.isOpen || !this.calib.length) return false
    const ratioQ = this.calib[joint].toMotor(qAbs)
    const ratioDq = this.calib[joint].vecToMotor(dqAbs)
    await this.write(buildControlPacket({
      motorId: this.motorIds[joint], mode: 1, timeout: false,
      torque: 0, speed: ratioDq, position: ratioQ, kp, kd,
    }))
    return true
  }

  private ensureJog(): JogRunner {
    if (!this.jog) {
      this.jog = new JogRunner(
        {
          snapshots: () => this.snapshots.map((s) => ({
            joint: s.joint, present: s.present, errorCode: s.errorCode, q: s.q,
          })),
          writeJog: this.writeJog,
          zeroRef: () => this.zeroRef ?? [],
        },
        this.guard,
        this.jogRate, this.jogKp, this.jogKd
      )
    }
    return this.jog
  }

  private startJogTick(): void {
    if (this.jogTimer) return
    // Tick unconditionally. plan() clears state when there are no targets; the
    // old "only tick while moving" gate was self-defeating, because moving is
    // set BY plan() - so the first tick was skipped and the ramp never started.
    this.jogTimer = setInterval(() => {
      if (!this.jog) return
      this.jog.tick(JOG_TICK_DT)
    }, Math.round(1000 / 60))
  }

  /** Start a ramped move. Returns the refusal reason, or null when accepted. */
  jogTo(targets: number[]): string | null {
    const runner = this.ensureJog()
    const why = runner.targetsAll(targets)
    if (why) return why
    this.startJogTick()
    return null
  }

  jogClear(reason: string): number {
    return this.jog?.clear(reason) ?? 0
  }

  isJogging(): boolean {
    return this.jog?.isMoving() ?? false
  }

  jogRemaining(): number {
    return this.jog?.remaining() ?? 0
  }

  jogStatus() {
    return this.jog?.status() ?? null
  }

  setJogRate(v: number): number {
    this.jogRate = this.ensureJog().setRate(v)
    return this.jogRate
  }

  getJogRate(): number {
    return this.jogRate
  }

  zeroRefArray(): number[] | null {
    return this.zeroRef
  }

  // ---------- 指令（所有傳輸必經 guard） ----------

  async sendCommand(cmd: LowLevelCommand): Promise<void> {
    if (!this.connected || !this.transport.isOpen) {
      throw new HalError('串口未連線', 23)
    }

    // Without a declared zero, the angles we report are raw absolute
    // multi-turn encoder counts, not joint positions — a "valid" target is
    // meaningless and a goto could command a wild move. Motion requires zero.
    if ((cmd.type === 'goto' || cmd.type === 'home') && !this.zeroRef) {
      throw new HalError(
        '未宣告零位參考 — 運動指令被拒。編碼器報嘅係絕對多圈計數，冇零位就冇「關節角」呢個概念；' +
        '請先喺安全姿勢宣告零位（Settings → 宣告現時姿勢為零位）。',
        29
      )
    }

    switch (cmd.type) {
      case 'clear':
        this.guard.authorize('fault clear', 'motion')
        for (const mid of this.motorIds) await this.write(buildClearPacket(mid))
        return
      case 'reset':
        this.guard.authorize('motor reset', 'motion')
        for (const mid of this.motorIds) await this.write(buildResetPacket(mid))
        return
      case 'stop':
        this.guard.authorize('stop', 'motion')
        for (const mid of this.motorIds)
          await this.write(buildControlPacket({ motorId: mid, mode: 0, timeout: false, torque: 0, speed: 0, position: 0, kp: 0, kd: 0 }))
        return
      case 'zero_torque':
        this.guard.authorize('zero torque', 'motion')
        for (const mid of this.motorIds)
          await this.write(buildControlPacket({ motorId: mid, mode: 1, timeout: false, torque: 0, speed: 0, position: 0, kp: 0, kd: 0 }))
        return
      case 'foc':
        // Hold at the currently measured absolute pose.
        this.guard.authorize('foc', 'motion')
        await this.holdCycle(this.holdKp, this.holdKd)
        return
      case 'goto': {
        if (cmd.joints.length !== JOINT_COUNT) throw new HalError(`goto 需要 ${JOINT_COUNT} 個關節值`, 24)
        // A single mode-1 packet with a zero speed limit is accepted by the
        // motor and moves nothing. Motion is a ramp: velocity-limited,
        // anchored to the measured angle, streamed at 60 Hz, beating the
        // guard deadman as it goes.
        this.guard.authorize('goto', 'motion')
        const why = this.jogTo(cmd.joints)
        if (why) throw new HalError(`goto 被拒: ${why}`, 29)
        return
      }
      case 'home': {
        this.guard.authorize('home', 'motion')
        const why = this.jogTo(JOINTS.map((j) => j.home))
        if (why) throw new HalError(`home 被拒: ${why}`, 29)
        return
      }
      default:
        throw new HalError(`指令未支援: ${(cmd as any).type}`, 24)
    }
  }

  onEvent(cb: (ev: DriverEvent) => void): void {
    this.eventCb = cb
  }

  // ---------- 零位參考 ----------

  captureZeroReference(): { ok: boolean; message: string } {
    const missing = this.snapshots.filter((s) => !s.present).map((s) => s.joint)
    if (missing.length) {
      return { ok: false, message: `joint ${missing.join(', ')} 未有回饋，唔能宣告零位` }
    }
    const qAbs = this.snapshots.map((s) => s.qAbs)
    this.zeroRef = qAbs
    this.zeroInfo = { capturedAt: Date.now() / 1000, source: 'operator', qAbs }
    try {
      this.zeroStore?.save(this.zeroInfo)
    } catch (err) {
      this.lastError = `zero reference not saved: ${(err as Error).message}`
    }
    this.guard.logEvent(
      'zero reference captured at ' + qAbs.map((a) => `${a >= 0 ? '+' : ''}${a.toFixed(4)}`).join(' ')
    )
    return { ok: true, message: '已將現時姿勢宣告為零位' }
  }

  clearZeroReference(): void {
    this.zeroRef = null
    this.zeroInfo = null
    try {
      this.zeroStore?.clear()
    } catch { /* file already gone */ }
  }

  status(): SerialDriverStatus {
    return {
      port: this.config.port,
      baudrate: this.config.baudrate ?? DEFAULT_BAUDRATE,
      rxBytes: this.rxBytes,
      rxPackets: this.rxPackets,
      crcErrors: this.crcErrors,
      resyncs: this.framer.resyncs,
      lastRx: this.lastRx,
      holdCycles: this.holdCycles,
      probeCycles: this.probeCycles,
      zeroReference: this.zeroInfo,
      faults: this.snapshots.filter((s) => s.errorCode !== 0).map((s) => ({ joint: s.joint, errorCode: s.errorCode })),
      motorIds: [...this.motorIds],
    }
  }

  configurePoller(opts: { rateHz?: number; holdKp?: number; holdKd?: number }): { rate_hz: number; hold_kp: number; hold_kd: number } {
    if (typeof opts.rateHz === 'number') this.rateHz = Math.max(MIN_RATE_HZ, Math.min(MAX_RATE_HZ, opts.rateHz))
    if (typeof opts.holdKp === 'number') this.holdKp = Math.max(0, Math.min(MAX_HOLD_KP, opts.holdKp))
    if (typeof opts.holdKd === 'number') this.holdKd = Math.max(0, Math.min(MAX_HOLD_KD, opts.holdKd))
    this.holdTarget = Array(JOINT_COUNT).fill(null)
    if (this.pollTimer) { clearInterval(this.pollTimer); this.startPollLoop() }
    return { rate_hz: this.rateHz, hold_kp: this.holdKp, hold_kd: this.holdKd }
  }

  // ---------- 讀取 ----------

  private blankSnapshot(joint: number, motorId: number): JointSnapshot {
    return {
      joint, motorId, present: false, lastRx: null, mode: 0, tempDriver: 0, tempWinding: 0,
      voltage: 0, errorCode: 0, warningCode: 0, qAbs: 0, q: 0, dq: 0, tau: 0,
    }
  }

  private onData(chunk: Buffer): void {
    this.rxBytes += chunk.length
    for (const fb of this.framer.feed(chunk)) this.apply(fb)
  }

  private apply(fb: MotorFeedback): void {
    this.rxPackets++
    this.lastRx = Date.now() / 1000

    const joint = this.motorIds.indexOf(fb.motorId)
    if (joint < 0) return

    const cal = this.calib[joint]
    const snap = this.snapshots[joint]
    snap.present = true
    snap.lastRx = Date.now() / 1000
    snap.mode = fb.mode
    snap.tempDriver = fb.tempDriver
    snap.tempWinding = fb.tempWinding
    snap.voltage = fb.voltage
    snap.errorCode = fb.errorCode
    snap.warningCode = fb.warningCode
    snap.qAbs = cal.toUrdf(fb.position)
    // toUrdf is affine with a constant offset, so subtracting two absolute
    // angles cancels it and leaves a pure relative angle.
    snap.q = this.zeroRef ? snap.qAbs - this.zeroRef[joint] : snap.qAbs
    snap.dq = cal.vecToUrdf(fb.speed)
    snap.tau = cal.vecToUrdf(fb.torque)
  }

  private startReadLoop(): void {
    // A raw fd has no 'data' events, so the bus is polled. 200 Hz is the
    // design target for the IM6014 feedback stream.
    this.readTimer = setInterval(() => {
      if (!this.transport.isOpen) return
      const chunk = this.transport.read()
      if (chunk.length) this.onData(chunk)
      this.refreshTelemetry()
    }, READ_INTERVAL_MS)
  }

  // ---------- position-hold 監控循環（唯一嘅 monitor 類傳輸來源） ----------

  private startPollLoop(): void {
    this.pollTimer = setInterval(() => {
      if (!this.connected || !this.transport.isOpen) return
      if (!this.guard.isMonitorArmed()) return
      // Motion unlocked → the poller yields so two controllers never fight.
      if (!this.guard.isLocked()) return
      void this.cycle()
    }, Math.round(1000 / this.rateHz))
  }

  private async cycle(): Promise<void> {
    const missing = this.snapshots.filter((s) => !s.present)
    if (missing.length) {
      await this.probeCycle(missing)
      return
    }
    await this.holdCycle(this.holdKp, this.holdKd)
  }

  /** Zero-torque FOC so the motors answer and we learn the start pose.
   *  kp = kd = tau = 0 requests no effort: the arm is only asked to report. */
  private async probeCycle(missing: JointSnapshot[]): Promise<void> {
    try {
      for (const snap of missing) {
        this.guard.authorize('probe', 'monitor')
        await this.write(buildControlPacket({
          motorId: snap.motorId, mode: 1, timeout: false,
          torque: 0, speed: 0, position: 0, kp: 0, kd: 0,
        }))
      }
      this.probeCycles++
    } catch (err) {
      this.lastError = (err as Error).message
    }
  }

  /** Position-hold at the measured absolute pose. The commanded angle walks
   *  toward the measurement no faster than MAX_HOLD_STEP_RAD per cycle, so a
   *  feedback spike cannot drag the arm. */
  private async holdCycle(kp: number, kd: number): Promise<void> {
    try {
      const faults: number[] = []
      for (const snap of this.snapshots) {
        if (snap.errorCode !== 0) {
          faults.push(snap.joint)
          this.holdTarget[snap.joint] = null
          if (Date.now() / 1000 - this.reprobeAt[snap.joint] >= FAULT_REPROBE_S) {
            this.reprobeAt[snap.joint] = Date.now() / 1000
            this.guard.authorize('fault re-probe', 'monitor')
            await this.write(buildControlPacket({
              motorId: snap.motorId, mode: 1, timeout: false,
              torque: 0, speed: 0, position: 0, kp: 0, kd: 0,
            }))
          }
          continue
        }

        const measured = snap.qAbs
        const previous = this.holdTarget[snap.joint]
        const target = previous === null
          ? measured
          : previous + Math.max(-MAX_HOLD_STEP_RAD, Math.min(MAX_HOLD_STEP_RAD, measured - previous))

        this.guard.authorize('hold', 'monitor')
        await this.write(buildControlPacket({
          motorId: snap.motorId, mode: 1, timeout: false,
          torque: 0, speed: 0, position: this.calib[snap.joint].toMotor(target),
          kp, kd,
        }))
        this.holdTarget[snap.joint] = target
      }
      this.holdCycles++
      if (faults.length) this.lastError = `joint ${faults.join(', ')} 有錯誤碼，暫離 hold 循環`
    } catch (err) {
      this.lastError = (err as Error).message
    }
  }

  private async write(packet: Buffer): Promise<void> {
    this.transport.write(packet)
    // Half-duplex RS485 pacing.
    await new Promise((r) => setTimeout(r, INTER_WRITE_DELAY_S * 1000))
  }

  private refreshTelemetry(): void {
    if (!this.snapshots.length) return
    const joints = this.snapshots.map((s) => ({
      q: s.present ? s.q : (this.zeroRef ? 0 : JOINTS[s.joint].home),
      dq: s.present ? s.dq : 0,
      tau: s.present ? s.tau : 0,
      temp: s.present ? Math.max(s.tempWinding, s.tempDriver) : 32,
    }))
    const faultJoint = this.snapshots.find((s) => s.errorCode !== 0)
    this.telemetry = {
      joints,
      errorCode: faultJoint ? 1 : 0,
      errorMessage: this.lastError ?? (faultJoint ? `joint ${faultJoint.joint} error_code=${faultJoint.errorCode}` : null),
      temp: joints.reduce((m, j) => Math.max(m, j.temp), 0),
    }
  }

  // ---------- 斷線 / 重連 ----------

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null
      try {
        await this.connect(this.config)
      } catch {
        this.scheduleReconnect()
      }
    }, 2000)
  }

  private teardown(): void {
    this.connected = false
    if (this.readTimer) clearInterval(this.readTimer)
    this.readTimer = null
    if (this.pollTimer) clearInterval(this.pollTimer)
    this.pollTimer = null
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
    this.transport.close()
  }

  private emit(ev: DriverEvent): void {
    this.eventCb?.(ev)
  }
}
