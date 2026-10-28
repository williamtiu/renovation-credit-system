/**
 * JogRunner — velocity-limited ramp from the arm's pose to each target
 *
 * Port of r1ui/jog.py. Not a thread: the driver ticks it at 60 Hz, the same
 * clock that runs the guard deadman, and every tick beats the deadman.
 *
 * The pieces that are not optional, all of them measured on this hardware and
 * recorded in the Python program:
 *
 *   * The packet carries a **velocity**. A mode-1 packet whose speed limit is
 *     zero is accepted by the motor and moves nothing — that is what made a
 *     first goto reach the wire with the arm sitting still.
 *   * The ramp is anchored to the *measured* angle (the SDK mover's
 *     `q = measured + clamp(target - measured, lead)`). A command that runs
 *     ahead of the arm is the runaway to catch: a motor that is not following
 *     keeps accelerating.
 *   * A commanded pose more than MAX_JOG_LAG_RAD behind the real one means the
 *     arm is not tracking the ramp — drop that joint, do not chase it.
 *   * Pinned at the anchor lead with the arm not advancing is a bound joint,
 *     and the packets hold kp*lead torque on a stalled motor while the winding
 *     heats. Release it after STALL_RELEASE_S.
 */

import {
  MAX_JOG_LAG_RAD, ANCHOR_LEAD_RAD, ANCHOR_SLACK_RAD, JOG_SETTLE_EPS,
  STALL_RELEASE_S, JOG_TICK_DT, MAX_JOG_SPEED, MAX_JOG_KP, MAX_JOG_KD, KEEPALIVE_HZ,
} from './jog-constants'
import type { MotionGuard } from './motion-guard'

export interface JogBus {
  /** URDF-frame relative angles, per joint index; present false = not answering. */
  snapshots: () => Array<{ joint: number; present: boolean; errorCode: number; q: number }>
  /** One mode-1 jog packet: qAbs/dqAbs are URDF ABSOLUTE (encoder) frame. */
  writeJog: (joint: number, qAbs: number, dqAbs: number, kp: number, kd: number) => Promise<boolean>
  zeroRef: () => number[]
}

export interface JogStatus {
  active: boolean
  targets: Record<number, number>
  command: Record<number, number>
  stalled: number[]
  halted: string[]
  keepaliveBursts: number
}

const copysign = (mag: number, sign: number) => (sign >= 0 ? Math.abs(mag) : -Math.abs(mag))
const clampRate = (v: number) => Math.max(0.01, Math.min(MAX_JOG_SPEED, v))

export class JogRunner {
  private targets = new Map<number, number>()
  private cmd = new Map<number, number>()
  private settled = new Map<number, boolean>()
  private stalled = new Set<number>()
  private stallTime = new Map<number, number>()
  private moving = false
  private rate: number
  private kp: number
  private kd: number
  private halted: string[] = []
  // Keep-alive clock: while the ramp is settled we still have to ask the bus,
  // because on a polled bus the arm stops answering as soon as nothing asks it.
  private clock = 0
  private keepalivePeriod = 1.0 / KEEPALIVE_HZ
  private keepaliveBursts = 0
  private planCalls = 0

  constructor(
    private bus: JogBus,
    private guard: MotionGuard,
    rate = 0.25,
    kp = 30.0,
    kd = 1.5
  ) {
    this.rate = clampRate(rate)
    this.kp = Math.max(0, Math.min(MAX_JOG_KP, kp))
    this.kd = Math.max(0, Math.min(MAX_JOG_KD, kd))
  }

  setRate(value: number): number {
    this.rate = clampRate(value)
    return this.rate
  }

  getRate(): number {
    return this.rate
  }

  /**
   * Ramp gains. kp is the torque lever that decides whether a bound joint moves
   * at all — measured on this arm a bound joint held its command at 2.6 Nm, so
   * the default 30 (≈1.0–1.4 Nm here) can pin a joint without moving it.
   * Capped at MAX_JOG_KP for the same reason the rate is capped.
   */
  setGains(kp: number, kd: number): { kp: number; kd: number } {
    this.kp = Math.max(0, Math.min(MAX_JOG_KP, kp))
    this.kd = Math.max(0, Math.min(MAX_JOG_KD, kd))
    return { kp: this.kp, kd: this.kd }
  }

  getGains(): { kp: number; kd: number } {
    return { kp: this.kp, kd: this.kd }
  }

  /** Why a jog is not allowed right now, or null when it is. */
  gate(): string | null {
    if (this.guard.isLocked()) return 'motion is LOCKED - unlock with the phrase and console code'
    const zero = this.bus.zeroRef()
    if (!zero || zero.length < 7) {
      return 'no zero reference - targets are relative to a pose and none is captured; declare zero first'
    }
    return null
  }

  /** Set one joint target in URDF relative frame. Returns the reason it was refused. */
  target(joint: number, qRelative: number): string | null {
    const why = this.gate()
    if (why) return why
    this.targets.set(joint, qRelative)
    this.settled.delete(joint)
    this.stalled.delete(joint)
    this.stallTime.delete(joint)
    this.guard.logEvent(`JOG target J${joint} -> ${qRelative.toFixed(4)} rad @ ${this.rate.toFixed(2)} rad/s`)
    return null
  }

  targetsAll(values: number[]): string | null {
    const why = this.gate()
    if (why) return why
    values.forEach((v, i) => {
      this.targets.set(i, v)
      this.settled.delete(i)
      this.stalled.delete(i)
      this.stallTime.delete(i)
    })
    this.guard.logEvent(`JOG ${values.length} target(s) @ ${this.rate.toFixed(2)} rad/s`)
    return null
  }

  clear(reason = 'operator clear'): number {
    const count = this.targets.size
    this.targets.clear()
    this.cmd.clear()
    this.settled.clear()
    this.stalled.clear()
    this.stallTime.clear()
    this.moving = false
    this.guard.logEvent(`JOG ${reason} - ${count} target(s) dropped`)
    return count
  }

  isMoving(): boolean {
    return this.moving
  }

  /** Time remaining on the ramp, for the UI. */
  remaining(): number {
    if (!this.moving) return 0
    const snaps = this.snapshotMap()
    let worst = 0
    for (const [joint, target] of this.targets) {
      const s = snaps.get(joint)
      if (!s || !s.present) continue
      const cur = this.cmd.get(joint) ?? s.q
      worst = Math.max(worst, Math.abs(target - cur) / this.rate)
    }
    return worst
  }

  status(): JogStatus {
    const targets: Record<number, number> = {}
    const command: Record<number, number> = {}
    this.targets.forEach((v, k) => (targets[k] = v))
    this.cmd.forEach((v, k) => (command[k] = v))
    return {
      active: this.targets.size > 0,
      targets,
      command,
      stalled: Array.from(this.stalled),
      halted: [...this.halted],
      keepaliveBursts: this.keepaliveBursts,
      // Gains are read back so the UI can show what is actually applied —
      // without these the kp/kd inputs have no verification path.
      rate: this.rate,
      kp: this.kp,
      kd: this.kd,
      planCalls: this.planCalls,
    }
  }

  private snapshotMap(): Map<number, { joint: number; present: boolean; errorCode: number; q: number }> {
    const m = new Map<number, { joint: number; present: boolean; errorCode: number; q: number }>()
    for (const s of this.bus.snapshots()) m.set(s.joint, s)
    return m
  }

  /** Advance every target one velocity-limited step and transmit it. */
  tick(dt: number = JOG_TICK_DT): number {
    const stepDt = Math.max(0, Math.min(dt, 0.05))
    const writes = this.plan(stepDt)
    let sent = 0
    for (const w of writes) {
      this.guard.beat()
      void this.bus.writeJog(w.joint, w.qAbs, w.dqAbs, this.kp, this.kd)
      sent++
    }
    return sent
  }

  /** Build this tick's packets and advance the ramp. No I/O happens here. */
  private plan(stepDt: number): Array<{ joint: number; qAbs: number; dqAbs: number }> {
    this.planCalls++
    if (this.gate() !== null) {
      if (this.targets.size) {
        this.guard.logEvent('JOG HALTED - motion authority lost')
        this.halted.push('motion authority lost')
      }
      this.targets.clear(); this.cmd.clear(); this.settled.clear()
      this.stalled.clear(); this.stallTime.clear(); this.moving = false
      return []
    }
    if (!this.targets.size) {
      this.moving = false
      return []
    }

    const stepMax = this.rate * stepDt
    const snaps = this.snapshotMap()
    const zero = this.bus.zeroRef()
    const writes: Array<{ joint: number; qAbs: number; dqAbs: number }> = []
    let moving = false

    for (const [joint, target] of [...this.targets].sort((a, b) => a[0] - b[0])) {
      const item = snaps.get(joint)
      // A joint that is not answering, or is faulted, is not jogged.
      if (!item || !item.present || item.errorCode !== 0) continue

      const measured = item.q
      const current = this.cmd.get(joint) ?? measured
      const lag = Math.abs(current - measured)
      if (lag > MAX_JOG_LAG_RAD) {
        this.targets.delete(joint); this.settled.delete(joint); this.cmd.delete(joint)
        this.stalled.delete(joint); this.stallTime.delete(joint)
        this.guard.logEvent(`JOG HALTED joint ${joint} - lagging ${lag.toFixed(3)} rad behind the command`)
        this.halted.push(`J${joint} lag ${lag.toFixed(3)}`)
        continue
      }

      const travel = target - measured
      const delta = target - current
      let position: number, velocity: number

      if (Math.abs(delta) <= Math.max(JOG_SETTLE_EPS, stepMax)) {
        if (this.settled.get(joint)) {
          this.stalled.delete(joint)
          continue
        }
        position = target; velocity = 0.0            // arrival packet, once
        this.settled.set(joint, true)
      } else {
        const dir = delta > 0 ? 1.0 : -1.0
        position = current + dir * stepMax
        velocity = dir * this.rate
        this.settled.set(joint, false)
        moving = true
      }

      const leadAllow = Math.max(stepMax, ANCHOR_LEAD_RAD)
      // Sign comes from the direction of travel, not from the difference: a
      // command behind the measured angle on a negative move is ahead of the arm.
      const lead = (position - measured) * (travel > 0 ? 1.0 : -1.0)
      if (travel && lead > leadAllow + ANCHOR_SLACK_RAD) {
        position = measured + copysign(leadAllow, travel)
        velocity = copysign(Math.min(this.rate, Math.abs(travel) * 60.0), travel)
        if (!this.stalled.has(joint)) {
          this.stalled.add(joint)
          this.guard.logEvent(`JOG joint ${joint} not tracking - ramp limited to the arm's pace`)
        }
        this.stallTime.set(joint, (this.stallTime.get(joint) ?? 0) + stepDt)
        if ((this.stallTime.get(joint) ?? 0) >= STALL_RELEASE_S) {
          this.targets.delete(joint); this.settled.delete(joint); this.cmd.delete(joint)
          this.stalled.delete(joint); this.stallTime.delete(joint)
          this.guard.logEvent(`JOG HALTED joint ${joint} - no motion for ${STALL_RELEASE_S}s, jog released`)
          this.halted.push(`J${joint} stalled`)
          continue
        }
      } else {
        this.stalled.delete(joint)
        this.stallTime.delete(joint)
      }

      this.cmd.set(joint, position)
      // The wire wants the encoder ABSOLUTE frame.
      writes.push({
        joint,
        qAbs: position + (zero[joint] ?? 0),
        dqAbs: velocity,
      })
    }

    this.moving = moving
    if (moving) {
      this.clock = 0
      return writes
    }

    // Settled. On a polled bus the arm stops answering as soon as nothing asks
    // it, so we keep asking at 20 Hz — and a joint with a target is held **at
    // the target**, not at where it happened to settle. Feeding the measured
    // angle back to a joint that is short of its target is what cements the
    // droop, so a jog that lands short stays short.
    this.clock += stepDt
    if (this.clock < this.keepalivePeriod) return writes
    this.clock = 0
    this.keepaliveBursts++
    return writes.concat(this.planKeepalive(snaps, zero))
  }

  /**
   * Keep the bus answering, and keep jogged joints at their target.
   * qAbs frame: value + zeroRef. Untargeted joints are asked their own measured
   * angle (commanded == measured, net motion zero).
   */
  private planKeepalive(
    snaps: Map<number, { joint: number; present: boolean; errorCode: number; q: number }>,
    zero: number[]
  ): Array<{ joint: number; qAbs: number; dqAbs: number }> {
    const writes: Array<{ joint: number; qAbs: number; dqAbs: number }> = []
    for (const s of [...snaps.values()].sort((a, b) => a.joint - b.joint)) {
      if (!s.present || s.errorCode !== 0) continue
      const target = this.targets.get(s.joint)
      writes.push({
        joint: s.joint,
        qAbs: (target ?? s.q) + (zero[s.joint] ?? 0),
        dqAbs: 0,
      })
    }
    return writes
  }
}
