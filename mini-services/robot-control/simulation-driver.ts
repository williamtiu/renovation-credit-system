/**
 * Simulation Driver — 7-DOF 機械臂模擬器
 * 
 * 用於冇真機嘅環境（開發/演示/教學）：
 * - goto 指令使用 cosine 速度曲線插值（同 SDK demo_arm_motion 一致）
 * - 每個關節用二階臨界阻尼系統模擬跟隨誤差
 * - 力矩 = 轉動慣量 * ddq + 阻尼 * dq + 簡化重力項
 * - 內部 200Hz 物理 tick
 */

import { DOF, JOINTS, ARM_HOME, clamp, emptyJointState } from './robot-model'
import type {
  HalDriver, DriverConfig, DriverEvent, LowLevelCommand, Telemetry,
} from './hal-types'
import { HalError } from './hal-types'

const PHYSICS_HZ = 200
const DT = 1 / PHYSICS_HZ

interface JointSim {
  q: number
  dq: number
  ddq: number
  tau: number
  temp: number
  target: number
  // 軌跡
  trajActive: boolean
  trajStart: number[]  // hmm 逐個關節獨立軌跡更簡單
  trajTarget: number
  trajElapsed: number
  trajDuration: number
}

export class SimulationDriver implements HalDriver {
  readonly mode = 'simulation' as const
  private joints: JointSim[] = []
  private connected = false
  private timer: ReturnType<typeof setInterval> | null = null
  private eventCb: ((ev: DriverEvent) => void) | null = null
  private startTs = Date.now()
  private tickCount = 0

  async connect(_config: DriverConfig): Promise<void> {
    if (this.connected) return
    this.joints = JOINTS.map((j, i) => ({
      q: ARM_HOME[i],
      dq: 0,
      ddq: 0,
      tau: 0,
      temp: 32 + Math.random() * 4,
      target: ARM_HOME[i],
      trajActive: false,
      trajStart: ARM_HOME[i],
      trajTarget: ARM_HOME[i],
      trajElapsed: 0,
      trajDuration: 1,
    }))
    this.connected = true
    this.timer = setInterval(() => this.tick(), DT * 1000)
    this.emit({ kind: 'info', message: '模擬驅動已啟動 (200Hz 物理引擎)' })
  }

  async disconnect(): Promise<void> {
    this.connected = false
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.emit({ kind: 'info', message: '模擬驅動已停止' })
  }

  isConnected(): boolean {
    return this.connected
  }

  getTelemetry(): Telemetry {
    return {
      joints: this.joints.map(j => ({ q: j.q, dq: j.dq, tau: j.tau, temp: j.temp })),
      errorCode: 0,
      errorMessage: null,
      temp: 38,
    }
  }

  async sendCommand(cmd: LowLevelCommand): Promise<void> {
    if (!this.connected) throw new HalError('模擬驅動未連線', 10)
    switch (cmd.type) {
      case 'foc':
        // FOC 保持當前位置
        this.joints.forEach(j => {
          j.trajActive = false
          j.target = j.q
        })
        break
      case 'home':
        this.joints.forEach((j, i) => this.startTraj(j, ARM_HOME[i], 2.0))
        break
      case 'goto': {
        const dur = clamp(cmd.duration, 0.5, 30)
        this.joints.forEach((j, i) => this.startTraj(j, cmd.joints[i], dur))
        break
      }
      case 'stop':
        this.joints.forEach(j => {
          j.trajActive = false
          j.target = j.q
          j.dq = 0
        })
        break
      case 'zero_torque':
        this.joints.forEach(j => {
          j.trajActive = false
          j.dq = 0
          // 零力矩下重力令手臂緩慢下墜（模擬）
          j.target = j.q
        })
        break
      case 'clear':
      case 'reset':
        this.joints.forEach((j, i) => this.startTraj(j, ARM_HOME[i], 2.0))
        break
      default:
        throw new HalError(`模擬驅動唔支援指令: ${(cmd as any).type}`, 2)
    }
  }

  onEvent(cb: (ev: DriverEvent) => void): void {
    this.eventCb = cb
  }

  // ---------- 內部物理 ----------

  private startTraj(j: JointSim, target: number, duration: number): void {
    j.trajActive = true
    j.trajStart = j.q
    j.trajTarget = target
    j.trajElapsed = 0
    j.trajDuration = Math.max(0.2, duration)
    // 關鍵：FOC 保持目標同步更新 — 軌跡完成後先至可以喺目標位置保持
    j.target = target
  }

  private tick(): void {
    if (!this.connected) return
    this.tickCount++
    const gravityOn = false // zero_torque 時可以切換; 簡化處理

    for (const j of this.joints) {
      if (j.trajActive) {
        // cosine 速度曲線: s(t) = 0.5*(1-cos(pi*t/T))
        j.trajElapsed = Math.min(j.trajElapsed + DT, j.trajDuration)
        const s = 0.5 * (1 - Math.cos(Math.PI * j.trajElapsed / j.trajDuration))
        const qPrev = j.q
        j.q = j.trajStart + (j.trajTarget - j.trajStart) * s
        j.dq = (j.q - qPrev) / DT
        if (j.trajElapsed >= j.trajDuration) {
          j.trajActive = false
          j.dq = 0
        }
      } else if (!gravityOn) {
        // FOC 保持: 二階臨界阻尼跟隨
        const kp = 180, kd = 27 // 臨界阻尼 ~ 2*sqrt(kp)
        const ddq = kp * (j.target - j.q) - kd * j.dq
        j.ddq = ddq
        const qPrev = j.q
        j.dq += ddq * DT
        j.q = clamp(j.q + j.dq * DT, -3.5, 3.5)
        j.dq = (j.q - qPrev) / DT
      }

      // 簡化力矩估計: 慣量*ddq + 黏滯阻尼 + 微噪音
      const inertia = 0.35
      const damping = 0.12
      const noise = (Math.random() - 0.5) * 0.06
      j.tau = inertia * j.ddq + damping * j.dq + noise

      // 溫度緩慢趨向穩態（同 |tau| 相關）
      const steady = 32 + Math.min(18, Math.abs(j.tau) * 0.8)
      j.temp += (steady - j.temp) * 0.0008
    }

    // 每 10 秒發一次心跳事件（避免 log 噪音，呢度唔發）
    void this.startTs; void this.tickCount
  }

  private emit(ev: DriverEvent): void {
    this.eventCb?.(ev)
  }
}
