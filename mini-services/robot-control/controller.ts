/**
 * Controller — 機械臂控制器（ROS2 Lifecycle Node 概念）
 * 
 * 生命周期: unconfigured → inactive → active
 *   - configure(): 建立 driver 連線 → inactive
 *   - activate(): 進入 active，開始發佈遙測
 *   - deactivate()/cleanup()/shutdown()
 * 
 * 安全層（所有指令必經）:
 *   1. 關節位置限制（URDF frame）
 *   2. Goto duration 限制 [0.5, 30] s
 *   3. 指令頻率限制（每命令類型 20ms 去抖）
 *   4. E-stop 狀態下只容許 stop/clear
 */

import {
  DOF, JOINTS, ARM_HOME, clamp, validateJointTargets, emptyJointState,
} from './robot-model'
import type { RobotState, DriverMode, ControlMode, LifecycleState } from './robot-model'
import type { HalDriver, DriverEvent, LowLevelCommand } from './hal-types'
import { HalError } from './hal-types'
import { SimulationDriver } from './simulation-driver'
import { SerialDriver } from './serial-driver'
import { BridgeDriver } from './bridge-driver'

export interface CommandRequest {
  type: 'foc' | 'home' | 'goto' | 'stop' | 'zero_torque' | 'clear' | 'reset'
  joints?: number[]
  duration?: number
}

export interface CommandResult {
  ok: boolean
  message: string
  latencyMs: number
}

export type StateListener = (state: RobotState) => void

const CMD_DEBOUNCE_MS = 30

export class RobotController {
  private driver: HalDriver = new SimulationDriver()
  private driverMode: DriverMode = 'simulation'
  private lifecycle: LifecycleState = 'unconfigured'
  private controlMode: ControlMode = 'stopped'
  private estop = false
  private moving = false
  private moveRemaining = 0
  private lastCmdTs = new Map<string, number>()
  private listeners = new Set<StateListener>()
  private eventLog: Array<{ ts: number; level: string; message: string }> = []
  private stateTimer: ReturnType<typeof setInterval> | null = null
  private moveTimer: ReturnType<typeof setInterval> | null = null
  private startTs = Date.now()
  private serialConfig = { port: '/dev/ttyUSB0', baudrate: 6000000 }
  private telemetryHz = 50

  constructor() {
    this.driver.onEvent(ev => this.handleDriverEvent(ev))
  }

  // ---------- 生命周期 ----------

  async configure(mode: DriverMode, port?: string, baudrate?: number): Promise<void> {
    await this.shutdownDriver()
    if (port) this.serialConfig.port = port
    if (baudrate) this.serialConfig.baudrate = baudrate
    this.driverMode = mode

    this.driver =
      mode === 'simulation' ? new SimulationDriver()
      : mode === 'serial' ? new SerialDriver()
      : new BridgeDriver()

    this.driver.onEvent(ev => this.handleDriverEvent(ev))

    try {
      await this.driver.connect({
        port: this.serialConfig.port,
        baudrate: this.serialConfig.baudrate,
      })
      this.lifecycle = 'inactive'
      this.controlMode = 'stopped'
      this.estop = false
      this.log('info', `已連接 (${mode}) → inactive`)
    } catch (err) {
      this.lifecycle = 'unconfigured'
      this.log('error', `連線失敗: ${(err as Error).message}`)
      throw err
    }
    this.emitState()
  }

  async activate(): Promise<void> {
    if (this.lifecycle !== 'inactive') {
      throw new HalError(`activate 需要 inactive 狀態（當前: ${this.lifecycle}）`, 40)
    }
    // 上電預設 FOC 保持
    await this.driver.sendCommand({ type: 'foc' })
    this.lifecycle = 'active'
    this.controlMode = 'foc'
    this.startLoops()
    this.log('info', '控制器已激活 → active (FOC 保持模式)')
    this.emitState()
  }

  async deactivate(): Promise<void> {
    if (this.lifecycle !== 'active') return
    this.stopLoops()
    await this.driver.sendCommand({ type: 'stop' })
    this.lifecycle = 'inactive'
    this.controlMode = 'stopped'
    this.log('info', '控制器已停用 → inactive')
    this.emitState()
  }

  async cleanup(): Promise<void> {
    await this.shutdownDriver()
    this.lifecycle = 'unconfigured'
    this.log('info', '已清理 → unconfigured')
    this.emitState()
  }

  // ---------- 指令入口（安全層） ----------

  async command(req: CommandRequest, source = 'api'): Promise<CommandResult> {
    const t0 = Date.now()
    const reject = (message: string): CommandResult => {
      this.log('warn', `[${source}] 指令被拒: ${req.type} — ${message}`)
      return { ok: false, message, latencyMs: Date.now() - t0 }
    }

    if (this.lifecycle !== 'active') {
      return reject(`控制器未激活（當前: ${this.lifecycle}）`)
    }
    // E-stop 只容許 stop / clear
    if (this.estop && req.type !== 'stop' && req.type !== 'clear') {
      return reject('緊急停止已觸發，只容許 stop / clear 指令')
    }
    // 去抖
    const last = this.lastCmdTs.get(req.type) ?? 0
    if (Date.now() - last < CMD_DEBOUNCE_MS) {
      return reject('指令頻率過高（去抖 30ms）')
    }

    let lowCmd: LowLevelCommand
    switch (req.type) {
      case 'goto': {
        if (!req.joints) return reject('goto 需要 joints 參數')
        const v = validateJointTargets(req.joints)
        if (!v.ok) return reject(`關節目標非法: ${v.errors.join('; ')}`)
        const duration = clamp(req.duration ?? 2.0, 0.5, 30)
        lowCmd = { type: 'goto', joints: req.joints, duration }
        this.moveRemaining = duration
        this.moving = true
        break
      }
      case 'foc':
      case 'home':
      case 'stop':
      case 'zero_torque':
      case 'clear':
      case 'reset':
        lowCmd = { type: req.type } as LowLevelCommand
        break
      default:
        return reject(`未知指令類型: ${(req as any).type}`)
    }

    try {
      await this.driver.sendCommand(lowCmd)
      this.lastCmdTs.set(req.type, Date.now())
      // 更新控制模式
      if (req.type === 'goto') this.controlMode = 'goto'
      else if (req.type === 'foc') this.controlMode = 'foc'
      else if (req.type === 'home') { this.controlMode = 'home'; this.moving = true; this.moveRemaining = 2.0 }
      else if (req.type === 'zero_torque') this.controlMode = 'zero_torque'
      else if (req.type === 'stop') { this.controlMode = 'stopped'; this.moving = false; this.moveRemaining = 0 }
      else if (req.type === 'clear') { this.estop = false }
      this.log('info', `[${source}] ${req.type} ✓${req.joints ? ` joints=[${req.joints.map(j => j.toFixed(2)).join(', ')}]` : ''}`)
      this.emitState()
      return { ok: true, message: `指令 ${req.type} 已執行`, latencyMs: Date.now() - t0 }
    } catch (err) {
      const e = err as HalError
      this.log('error', `[${source}] ${req.type} ✗ ${e.message} (code ${e.code ?? '?'})`)
      this.emitState()
      return { ok: false, message: e.message, latencyMs: Date.now() - t0 }
    }
  }

  /** 緊急停止 */
  async emergencyStop(): Promise<void> {
    this.estop = true
    this.moving = false
    this.moveRemaining = 0
    if (this.lifecycle === 'active') {
      try { await this.driver.sendCommand({ type: 'stop' }) } catch { /* best effort */ }
    }
    this.controlMode = 'stopped'
    this.log('error', '🛑 緊急停止已觸發 (E-STOP)')
    this.emitState()
  }

  // ---------- 狀態 ----------

  getState(): RobotState {
    const tel = this.driver.getTelemetry()
    const joints = tel.joints.length === DOF ? tel.joints : emptyJointState()
    return {
      lifecycle: this.lifecycle,
      connected: this.driver.isConnected(),
      driverMode: this.driverMode,
      controlMode: this.controlMode,
      estop: this.estop,
      errorCode: tel.errorCode,
      errorMessage: tel.errorMessage,
      joints,
      moving: this.moving,
      moveRemaining: this.moveRemaining,
      serial: { ...this.serialConfig },
      telemetryHz: this.telemetryHz,
      uptime: (Date.now() - this.startTs) / 1000,
    }
  }

  getEventLog() {
    return this.eventLog.slice(-100).reverse()
  }

  onState(cb: StateListener): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  // ---------- 內部 ----------

  private startLoops(): void {
    this.stopLoops()
    // 遙測發佈 50Hz（模擬 /joint_states topic）
    this.stateTimer = setInterval(() => this.emitState(), 1000 / this.telemetryHz)
    // 軌跡剩餘時間倒數
    this.moveTimer = setInterval(() => {
      if (this.moving) {
        this.moveRemaining = Math.max(0, this.moveRemaining - 0.2)
        if (this.moveRemaining === 0) this.moving = false
      }
    }, 200)
  }

  private stopLoops(): void {
    if (this.stateTimer) clearInterval(this.stateTimer)
    if (this.moveTimer) clearInterval(this.moveTimer)
    this.stateTimer = null
    this.moveTimer = null
  }

  private async shutdownDriver(): Promise<void> {
    this.stopLoops()
    try { await this.driver.disconnect() } catch { /* ignore */ }
  }

  private handleDriverEvent(ev: DriverEvent): void {
    const level = ev.kind === 'error' ? 'error' : ev.kind === 'disconnect' ? 'warn' : 'info'
    this.log(level, ev.message)
    if (ev.kind === 'error') this.estop = true
    this.emitState()
  }

  private log(level: string, message: string): void {
    this.eventLog.push({ ts: Date.now(), level, message })
    if (this.eventLog.length > 500) this.eventLog.splice(0, this.eventLog.length - 500)
    const tag = level === 'error' ? '✗' : level === 'warn' ? '⚠' : 'ℹ'
    console.log(`[${new Date().toISOString()}] ${tag} ${message}`)
  }

  private emitState(): void {
    const s = this.getState()
    for (const cb of this.listeners) {
      try { cb(s) } catch { /* listener 錯誤唔影響主循環 */ }
    }
  }
}
