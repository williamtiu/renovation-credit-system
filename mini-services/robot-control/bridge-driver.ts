/**
 * Bridge Driver — C++ Hardware Bridge 客戶端（真機推薦模式）
 * 
 * 架構（同 ROS2 hardware_interface + micro-ROS agent 概念一致）：
 * 
 *   [Node.js Control Service] ←UDP JSON-RPC→ [C++ Bridge (r1-7a_sdk)] ←IM6014→ [R1-7A 手臂]
 * 
 * C++ Bridge（部署包 hardware-bridge/ 目錄提供完整源碼）：
 *   - 直接連結 r1-7a_sdk 靜態庫（ArmMotorBus）
 *   - 內部 500Hz 讀取馬達遙測，URDF↔motor 轉換喺 SDK 邊界完成
 *   - 對上以 UDP JSON-RPC 提供 getState / foc / home / goto / stop / zeroTorque / clear / reset
 * 
 * 協議（UDP datagram, UTF-8 JSON）：
 *   請求: { "id": 1, "method": "goto", "params": { "joints": [...], "duration": 2.0 } }
 *   回應: { "id": 1, "ok": true, "data": { ... } }
 *   遙測推送（bridge 主動推送 @ 100Hz 到客戶端埠）:
 *         { "push": "telemetry", "data": { "q": [...], "dq": [...], "tau": [...], "temp": [...] } }
 */

import dgram from 'node:dgram'
import { emptyJointState } from './robot-model'
import type {
  HalDriver, DriverConfig, DriverEvent, LowLevelCommand, Telemetry,
} from './hal-types'
import { HalError } from './hal-types'

const BRIDGE_HOST_DEFAULT = '127.0.0.1'
const BRIDGE_PORT_DEFAULT = 15000
const RPC_TIMEOUT_MS = 1000
const MAX_SEQ_AGE_MS = 3000 // 超過 3 秒冇遙測推送 → 視為斷線

interface PendingRpc {
  resolve: (v: any) => void
  reject: (e: Error) => void
  timer: ReturnType<typeof setTimeout>
}

export class BridgeDriver implements HalDriver {
  readonly mode = 'bridge' as const
  private sock: dgram.Socket | null = null
  private connected = false
  private eventCb: ((ev: DriverEvent) => void) | null = null
  private rpcId = 0
  private pending = new Map<number, PendingRpc>()
  private bridgeHost = BRIDGE_HOST_DEFAULT
  private bridgePort = BRIDGE_PORT_DEFAULT
  private localPort = 0
  private telemetry: Telemetry = {
    joints: emptyJointState(),
    errorCode: 0,
    errorMessage: null,
    temp: 36,
  }
  private lastTelemetryTs = 0
  private watchdog: ReturnType<typeof setInterval> | null = null

  async connect(config: DriverConfig): Promise<void> {
    if (this.connected) return
    // config.port 格式: "host:port" 或者 "/dev/ttyUSB0"（用預設埠）
    if (config.port.includes(':')) {
      const [h, p] = config.port.split(':')
      this.bridgeHost = h || BRIDGE_HOST_DEFAULT
      this.bridgePort = parseInt(p, 10) || BRIDGE_PORT_DEFAULT
    }
    // baudrate 對 bridge 冇意義（bridge 自己管理串口），但保留喺 config 內

    await new Promise<void>((resolve, reject) => {
      const sock = dgram.createSocket('udp4')
      const failTimer = setTimeout(() => {
        sock.close()
        reject(new HalError(
          `連唔上 C++ Hardware Bridge (${this.bridgeHost}:${this.bridgePort})。` +
          `請確認 bridge 已啟動（hardware-bridge/build/r1a_bridge）。`,
          30
        ))
      }, RPC_TIMEOUT_MS)

      sock.once('message', (buf) => {
        clearTimeout(failTimer)
        this.sock = sock
        this.localPort = sock.address().port as number
        this.connected = true
        try {
          const msg = JSON.parse(buf.toString('utf-8'))
          if (msg.push === 'telemetry') this.ingestTelemetry(msg.data)
        } catch { /* 第一幀可能係 ping 回覆 */ }
        this.emit({ kind: 'info', message: `Hardware Bridge 已連線 (${this.bridgeHost}:${this.bridgePort})` })
        resolve()
      })

      sock.on('message', (buf) => this.onMessage(buf))
      sock.on('error', (err) => {
        this.emit({ kind: 'error', message: `UDP 錯誤: ${err.message}`, code: 31 })
      })
      sock.bind(() => {
        // 發送 ping 註冊遙測推送
        this.sendRpc('ping', {}).catch(() => { /* 由 failTimer 處理 timeout */ })
      })
      // 暫存 sock 俾 sendRpc 用
      this.sock = sock
    })

    // watchdog: 偵測遙測流中斷
    this.watchdog = setInterval(() => {
      if (this.connected && Date.now() - this.lastTelemetryTs > MAX_SEQ_AGE_MS) {
        this.emit({ kind: 'disconnect', message: 'Hardware Bridge 遙測超時', code: 32 })
        this.connected = false
      }
    }, 1000)
  }

  async disconnect(): Promise<void> {
    this.connected = false
    if (this.watchdog) clearInterval(this.watchdog)
    this.watchdog = null
    for (const [, p] of this.pending) {
      clearTimeout(p.timer)
      p.reject(new HalError('連線已關閉', 33))
    }
    this.pending.clear()
    if (this.sock) {
      try { this.sock.close() } catch { /* ignore */ }
      this.sock = null
    }
    this.emit({ kind: 'info', message: 'Hardware Bridge 已斷開' })
  }

  isConnected(): boolean {
    return this.connected
  }

  getTelemetry(): Telemetry {
    return this.telemetry
  }

  async sendCommand(cmd: LowLevelCommand): Promise<void> {
    if (!this.connected) throw new HalError('Hardware Bridge 未連線', 34)
    switch (cmd.type) {
      case 'foc':
        await this.sendRpc('foc', {})
        break
      case 'home':
        await this.sendRpc('home', {})
        break
      case 'goto':
        await this.sendRpc('goto', { joints: cmd.joints, duration: cmd.duration })
        break
      case 'stop':
        await this.sendRpc('stop', {})
        break
      case 'zero_torque':
        await this.sendRpc('zeroTorque', {})
        break
      case 'clear':
        await this.sendRpc('clear', {})
        break
      case 'reset':
        await this.sendRpc('reset', {})
        break
      default:
        throw new HalError(`未知指令: ${(cmd as any).type}`, 2)
    }
  }

  onEvent(cb: (ev: DriverEvent) => void): void {
    this.eventCb = cb
  }

  // ---------- 內部 ----------

  private ingestTelemetry(d: {
    q?: number[]; dq?: number[]; tau?: number[]; temp?: number[];
    errorCode?: number; errorMessage?: string | null; temp_ctrl?: number
  }): void {
    const n = this.telemetry.joints.length
    for (let i = 0; i < n; i++) {
      const j = this.telemetry.joints[i]
      if (d.q) j.q = d.q[i] ?? j.q
      if (d.dq) j.dq = d.dq[i] ?? j.dq
      if (d.tau) j.tau = d.tau[i] ?? j.tau
      if (d.temp) j.temp = d.temp[i] ?? j.temp
    }
    this.telemetry.errorCode = d.errorCode ?? 0
    this.telemetry.errorMessage = d.errorMessage ?? null
    this.telemetry.temp = d.temp_ctrl ?? this.telemetry.temp
    this.lastTelemetryTs = Date.now()
  }

  private onMessage(buf: Buffer): void {
    let msg: any
    try {
      msg = JSON.parse(buf.toString('utf-8'))
    } catch {
      return
    }
    if (msg.push === 'telemetry' && msg.data) {
      this.ingestTelemetry(msg.data)
      return
    }
    if (typeof msg.id === 'number') {
      const p = this.pending.get(msg.id)
      if (p) {
        this.pending.delete(msg.id)
        clearTimeout(p.timer)
        if (msg.ok) p.resolve(msg.data)
        else p.reject(new HalError(msg.error ?? 'bridge 指令失敗', msg.code ?? 35))
      }
    }
  }

  private sendRpc(method: string, params: Record<string, unknown>): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.sock) return reject(new HalError('UDP socket 未初始化', 36))
      const id = ++this.rpcId
      const payload = JSON.stringify({ id, method, params })
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new HalError(`bridge RPC 超時: ${method}`, 37))
      }, RPC_TIMEOUT_MS)
      this.pending.set(id, { resolve, reject, timer })
      this.sock.send(payload, this.bridgePort, this.bridgeHost, (err) => {
        if (err) {
          this.pending.delete(id)
          clearTimeout(timer)
          reject(new HalError(`發送失敗: ${err.message}`, 38))
        }
      })
    })
  }

  private emit(ev: DriverEvent): void {
    this.eventCb?.(ev)
  }
}
