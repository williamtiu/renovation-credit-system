/**
 * R1-7A 機械臂模型定義
 * 
 * 對應 Unitree R1 7-DOF 機械臂（r1-7a_sdk）
 * 關節值統一使用 URDF frame（rad / rad/s / N·m）
 * 轉換公式（於 Hardware Bridge 層執行）: urdf = dir * scale * motor + offset
 */

export interface JointDef {
  /** 關節編號 1-7 */
  id: number
  /** ROS 風格關節名 */
  name: string
  /** 中文名稱/描述 */
  label: string
  /** 位置下限 (rad, URDF frame) */
  min: number
  /** 位置上限 (rad, URDF frame) */
  max: number
  /** 最大速度 (rad/s) */
  vMax: number
  /** 最大力矩 (N·m) */
  tauMax: number
  /** Home 位置 (rad) — 對應 SDK Home 指令嘅 URDF zero */
  home: number
}

export const JOINTS: JointDef[] = [
  { id: 1, name: 'arm_pitch',      label: '肩關節俯仰 (Shoulder Pitch)',   min: -2.87, max: 2.87, vMax: 3.14, tauMax: 88,  home: 0.0 },
  { id: 2, name: 'arm_roll',       label: '肩關節側擺 (Shoulder Roll)',    min: -0.61, max: 3.14, vMax: 3.14, tauMax: 88,  home: 0.10 },
  { id: 3, name: 'arm_yaw',        label: '肩關節旋轉 (Shoulder Yaw)',     min: -2.35, max: 2.35, vMax: 3.14, tauMax: 50,  home: 0.0 },
  { id: 4, name: 'forearm_pitch',  label: '肘關節屈伸 (Elbow Pitch)',      min: -0.52, max: 2.44, vMax: 3.14, tauMax: 50,  home: 0.55 },
  { id: 5, name: 'forearm_yaw',    label: '前臂旋轉 (Forearm Yaw)',        min: -2.61, max: 2.61, vMax: 3.93, tauMax: 28,  home: 0.0 },
  { id: 6, name: 'hand_pitch',     label: '腕關節俯仰 (Wrist Pitch)',      min: -1.57, max: 1.05, vMax: 3.93, tauMax: 28,  home: 0.0 },
  { id: 7, name: 'hand_yaw',       label: '腕關節旋轉 (Wrist Yaw)',        min: -1.57, max: 1.57, vMax: 3.93, tauMax: 28,  home: 0.0 },
]

export const DOF = JOINTS.length

export const ARM_HOME = JOINTS.map(j => j.home)

/** 安全姿勢：手臂自然下垂貼近身體 */
export const ARM_SAFE_POSE = [0.0, 0.12, 0.0, 0.5, 0.0, 0.0, 0.0]

/** 預設演示姿勢（參考 SDK demo_arm_motion 嘅 cosine-profile 演示） */
export const DEMO_POSES = {
  home: ARM_HOME,
  ready: [0.0, 0.35, 0.0, 1.2, 0.0, 0.0, 0.0],
  wave1: [0.4, 0.9, 0.0, 1.4, 0.0, 0.3, 0.6],
  wave2: [0.4, 0.9, 0.0, 1.0, 0.0, -0.3, -0.6],
  reach: [0.9, 0.5, 0.3, 1.5, 0.5, 0.2, 0.3],
}

export interface JointState {
  /** 位置 (rad) */
  q: number
  /** 速度 (rad/s) */
  dq: number
  /** 力矩 (N·m) */
  tau: number
  /** 馬達溫度 (°C) */
  temp: number
}

export interface RobotState {
  /** 生命周期狀態: unconfigured | inactive | active */
  lifecycle: LifecycleState
  /** 硬體連線狀態 */
  connected: boolean
  /** 驅動模式: simulation | serial | bridge */
  driverMode: DriverMode
  /** 控制模式: foc | home | goto | zero_torque | stopped */
  controlMode: ControlMode
  /** 緊急停止已觸發 */
  estop: boolean
  /** 錯誤碼（0 = 無錯誤） */
  errorCode: number
  /** 錯誤訊息 */
  errorMessage: string | null
  /** 各關節狀態 */
  joints: JointState[]
  /** 是否正在執行 goto 軌跡 */
  moving: boolean
  /** 當前軌跡剩餘時間 (s) */
  moveRemaining: number
  /** 串口設定（serial 模式含校準/零位/監控參數） */
  serial: {
    port: string
    baudrate: number
    calibPath?: string
    zeroPath?: string
    rateHz?: number
    holdKp?: number
    holdKd?: number
  }
  /** 傳輸安全閘狀態（serial 模式；locked 為預設，預設零位元組輸出） */
  guard?: {
    locked: boolean
    monitorArmed: boolean
    txPackets: number
    txBlocked: number
    lockReason: string
    monitorReason: string
    nonceHint: string
  }
  /** serial 模式匯流排計數（rx/crc/resync/零位參考） */
  bus?: {
    rxBytes: number
    rxPackets: number
    crcErrors: number
    resyncs: number
    lastRx: number | null
    holdCycles: number
    probeCycles: number
    zeroDeclared: boolean
    faults: Array<{ joint: number; errorCode: number }>
  }
  /** 遙測頻率 (Hz) */
  telemetryHz: number
  /** 運行時間 (s) */
  uptime: number
}

export type LifecycleState = 'unconfigured' | 'inactive' | 'active'
export type DriverMode = 'simulation' | 'serial' | 'bridge'
export type ControlMode = 'foc' | 'home' | 'goto' | 'zero_torque' | 'stopped'

export function emptyJointState(): JointState[] {
  return JOINTS.map(j => ({ q: j.home, dq: 0, tau: 0, temp: 32 }))
}

/** 數值夾限 */
export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

export interface ValidationResult {
  ok: boolean
  errors: string[]
}

/** 驗證目標關節向量（安全層第一道防線） */
export function validateJointTargets(targets: number[]): ValidationResult {
  const errors: string[] = []
  if (!Array.isArray(targets) || targets.length !== DOF) {
    return { ok: false, errors: [`關節向量長度必須為 ${DOF}（收到 ${targets?.length ?? 0}）`] }
  }
  targets.forEach((t, i) => {
    if (typeof t !== 'number' || Number.isNaN(t)) {
      errors.push(`J${i + 1} (${JOINTS[i].name}): 非數值`)
      return
    }
    if (t < JOINTS[i].min || t > JOINTS[i].max) {
      errors.push(
        `J${i + 1} (${JOINTS[i].name}): ${t.toFixed(3)} rad 超出範圍 [${JOINTS[i].min}, ${JOINTS[i].max}]`
      )
    }
  })
  return { ok: errors.length === 0, errors }
}
