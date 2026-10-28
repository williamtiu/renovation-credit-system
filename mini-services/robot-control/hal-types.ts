/**
 * HAL — Hardware Abstraction Layer 接口定義
 * 
 * 所有驅動實作統一接口，上層（Controller/Safety）完全唔需要理會硬體差異。
 * 對應 ROS2 嘅 hardware_interface 概念。
 */

import type { JointState, DriverMode } from './robot-model'

export interface Telemetry {
  joints: JointState[]
  errorCode: number
  errorMessage: string | null
  temp: number // 控制器溫度
}

export type LowLevelCommand =
  | { type: 'foc' }                        // FOC 力矩控制保持當前姿勢
  | { type: 'home' }                       // 回 URDF 零位
  | { type: 'goto'; joints: number[]; duration: number } // 移動到目標關節
  | { type: 'stop' }                       // 停止（保留力矩）
  | { type: 'zero_torque' }                // 零力矩（鬆弛）
  | { type: 'clear' }                      // 清除錯誤
  | { type: 'reset' }                      // 重置馬達

export interface HalDriver {
  readonly mode: DriverMode
  /** 連接硬體（生命周期: unconfigured → inactive） */
  connect(config: DriverConfig): Promise<void>
  /** 斷開（→ unconfigured） */
  disconnect(): Promise<void>
  /** 是否已連線 */
  isConnected(): boolean
  /** 讀取最新遙測（內部高頻循環更新） */
  getTelemetry(): Telemetry
  /** 發送低階指令 */
  sendCommand(cmd: LowLevelCommand): Promise<void>
  /** 驅動級事件回調（錯誤、斷線等） */
  onEvent(cb: (ev: DriverEvent) => void): void
}

export interface DriverConfig {
  port: string      // /dev/ttyUSB0
  baudrate: number  // 6000000
}

export interface DriverEvent {
  kind: 'error' | 'disconnect' | 'info'
  message: string
  code?: number
}

export class HalError extends Error {
  constructor(
    message: string,
    public code: number = 1
  ) {
    super(message)
    this.name = 'HalError'
  }
}
