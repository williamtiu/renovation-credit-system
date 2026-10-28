/**
 * R1-7A 運動學模組 — FK / Jacobian / IK 求解器
 *
 * 與 arm-3d.tsx 嘅 Three.js 場景圖完全對應（URDF 概念模型）：
 *
 *   shoulderMount (0.2, 1.02, 0)
 *     └ J1 Rx(q1) ─ J2 Rz(q2) ─ J3 Ry(q3)          ← 肩部三軸（同原點）
 *         ↓ Ty(-L1)
 *       J4 Rx(q4)                                    ← 肘
 *         ↓ Ty(-L2)
 *       J5 Ry(q5) ─ J6 Rx(q6) ─ J7 Ry(q7)           ← 腕部三軸（同原點）
 *         ↓ Ty(-L3) → TCP
 *
 * IK 採用 Damped Least Squares（Levenberg-Marquardt）：
 *   dq = Jᵀ(JJᵀ + λ²I)⁻¹ e + N·(k_posture·(q_home − q) + k_lim·∇limit)
 *   N = I − J⁺J（零空間投影）→ 7-DOF 冗餘度用嚟保持自然姿態 + 避開關節限位
 *
 * 參考交互模式：UR Robot UI（TCP 讀數/點動）+ RoboDK（3D 拖拽）
 */

// ---------- 基礎型別 ----------

export type Vec3 = [number, number, number]
/** 3x3 旋轉矩陣（row-major） */
export type Mat3 = [number, number, number, number, number, number, number, number, number]

export const SHOULDER: Vec3 = [0.2, 1.02, 0]
export const L1 = 0.32 // 肩 → 肘
export const L2 = 0.28 // 肘 → 腕
export const L3 = 0.16 + 0.08 // 腕 → TCP（手長 + 末端點偏移）
export const MAX_REACH = L1 + L2 + L3

/** 關節軸（與 Three.js pivots 對應） */
const JOINT_AXES: Array<'x' | 'y' | 'z'> = ['x', 'z', 'y', 'x', 'y', 'x', 'y']

/** 後備關節限位（運行時優先用 /api/robot/joints 元數據） */
export const DEFAULT_JOINTS = [
  { min: -2.87, max: 2.87, vMax: 3.14, home: 0.0 },
  { min: -0.61, max: 3.14, vMax: 3.14, home: 0.1 },
  { min: -2.35, max: 2.35, vMax: 3.14, home: 0.0 },
  { min: -0.52, max: 2.44, vMax: 3.14, home: 0.55 },
  { min: -2.61, max: 2.61, vMax: 3.93, home: 0.0 },
  { min: -1.57, max: 1.05, vMax: 3.93, home: 0.0 },
  { min: -1.57, max: 1.57, vMax: 3.93, home: 0.0 },
]

// ---------- 矩陣工具 ----------

const rotX = (q: number): Mat3 => [1, 0, 0, 0, Math.cos(q), -Math.sin(q), 0, Math.sin(q), Math.cos(q)]
const rotY = (q: number): Mat3 => [Math.cos(q), 0, Math.sin(q), 0, 1, 0, -Math.sin(q), 0, Math.cos(q)]
const rotZ = (q: number): Mat3 => [Math.cos(q), -Math.sin(q), 0, Math.sin(q), Math.cos(q), 0, 0, 0, 1]

export function mat3Mul(a: Mat3, b: Mat3): Mat3 {
  const r = new Array(9) as unknown as Mat3
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]
    }
  }
  return r
}

export function mat3Apply(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ]
}

/** 取旋轉矩陣嘅第 k 列（即局部軸 e_k 喺世界方向） */
const col = (m: Mat3, k: number): Vec3 => [m[k], m[3 + k], m[6 + k]]

export function mat3Transpose(m: Mat3): Mat3 {
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]
}

// ---------- 正運動學 FK ----------

export interface FKResult {
  /** TCP 位置（世界） */
  tcp: Vec3
  /** TCP 姿態（世界） */
  R: Mat3
  /** 各關節世界軸向 */
  axes: Vec3[]
  /** 各關節世界原點 */
  origins: Vec3[]
  /** 肘部位置（冗餘度參考） */
  elbow: Vec3
  /** 腕部位置 */
  wrist: Vec3
}

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s]
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
export const norm = (a: Vec3): number => Math.sqrt(dot(a, a))

export function forwardKinematics(q: number[]): FKResult {
  const rot = (i: number, val: number): Mat3 =>
    JOINT_AXES[i] === 'x' ? rotX(val) : JOINT_AXES[i] === 'y' ? rotY(val) : rotZ(val)

  // 逐級複合（只追蹤旋轉；平移獨立計）
  let R: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1]
  const axes: Vec3[] = []
  const origins: Vec3[] = []

  // 關節 i 嘅旋轉軸（世界）= 上一級複合旋轉嘅對應列
  const axisOf = (i: number): Vec3 => col(R, JOINT_AXES[i] === 'x' ? 0 : JOINT_AXES[i] === 'y' ? 1 : 2)

  // J1/J2/J3 同原點（肩）
  for (let i = 0; i < 3; i++) {
    axes.push(axisOf(i))
    origins.push([...SHOULDER] as Vec3)
    R = mat3Mul(R, rot(i, q[i] ?? 0))
  }
  // 肘：J3 之後沿 -Y 平移 L1
  const elbow = add(SHOULDER, mat3Apply(R, [0, -L1, 0]))
  const R3 = R
  // J4
  axes.push(col(R, 0)) // x 軸
  origins.push(elbow)
  R = mat3Mul(R, rot(3, q[3] ?? 0))
  // 腕：J4 之後沿 -Y 平移 L2
  const wrist = add(elbow, mat3Apply(R, [0, -L2, 0]))
  const R4 = R
  // J5/J6/J7 同原點（腕）
  for (let i = 4; i < 7; i++) {
    axes.push(col(R, JOINT_AXES[i] === 'x' ? 0 : 1))
    origins.push([...wrist] as Vec3)
    R = mat3Mul(R, rot(i, q[i] ?? 0))
  }
  // TCP：J7 之後沿 -Y 平移 L3
  const tcp = add(wrist, mat3Apply(R, [0, -L3, 0]))

  return { tcp, R, axes, origins, elbow, wrist }
}

/** TCP 顯示用：位置（m）+ ZYX 歐拉角（rad）— UR Pendant 風格讀數 */
export function tcpPose(q: number[]): { pos: Vec3; rpy: Vec3 } {
  const { tcp, R } = forwardKinematics(q)
  // R = Rz(ψ)·Ry(θ)·Rx(φ)
  const phi = Math.atan2(R[7], R[8]) // roll  (X)
  const theta = Math.atan2(-R[6], Math.sqrt(R[7] * R[7] + R[8] * R[8])) // pitch (Y)
  const psi = Math.atan2(R[3], R[0]) // yaw   (Z)
  return { pos: tcp, rpy: [phi, theta, psi] }
}

// ---------- Jacobian ----------

/** 幾何 Jacobian（6×7）：上 3 行線速度、下 3 行角速度（世界系） */
export function jacobian(fk: FKResult): number[][] {
  const J: number[][] = []
  for (let i = 0; i < 7; i++) {
    const arm = sub(fk.tcp, fk.origins[i])
    const lin = cross(fk.axes[i], arm)
    const ang = fk.axes[i]
    J.push([lin[0], lin[1], lin[2], ang[0], ang[1], ang[2]])
  }
  return J // 7×6（每行一個關節）
}

// ---------- 線性代數（小矩陣高斯消去） ----------

/** 解 A·x = b（A 為 n×n）；奇異（pivot ≈ 0）回傳 null */
function solveLinear(A: number[][], b: number[]): number[] | null {
  const n = b.length
  const M = A.map((row, i) => [...row, b[i]]) // 增廣矩陣
  for (let c = 0; c < n; c++) {
    // 部分選主元
    let piv = c
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r
    if (Math.abs(M[piv][c]) < 1e-9) return null // 奇異 → 由調用方降級
    ;[M[c], M[piv]] = [M[piv], M[c]]
    for (let r = 0; r < n; r++) {
      if (r === c) continue
      const f = M[r][c] / M[c][c]
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]
    }
  }
  return M.map((row, i) => row[n] / row[i]) // Gauss-Jordan 後為對角陣：x_i = b_i / M[i][i]
}

// ---------- 旋轉誤差 ----------

/** R_des·R_curᵀ → 旋轉向量（axis·angle，世界系） */
function rotationError(Rdes: Mat3, Rcur: Mat3): Vec3 {
  const Rerr = mat3Mul(Rdes, mat3Transpose(Rcur))
  const tr = Rerr[0] + Rerr[4] + Rerr[8]
  const angle = Math.acos(Math.min(1, Math.max(-1, (tr - 1) / 2)))
  if (angle < 1e-6) return [0, 0, 0]
  // 反對稱部分 → 軸
  let ax: Vec3
  if (angle > Math.PI - 0.01) {
    // 接近 180°：由對角項提取軸
    const x = Math.sqrt(Math.max(0, (Rerr[0] + 1) / 2))
    const y = Math.sqrt(Math.max(0, (Rerr[4] + 1) / 2))
    const z = Math.sqrt(Math.max(0, (Rerr[8] + 1) / 2))
    ax = [x, y, z]
    if (Rerr[1] < 0) ax[1] = -ax[1]
    if (Rerr[2] < 0) ax[2] = -ax[2]
    if (Rerr[5] < 0) ax[2] = -ax[2]
    const n = norm(ax) || 1
    ax = scale(ax, 1 / n)
  } else {
    ax = [(Rerr[7] - Rerr[5]) / 2, (Rerr[2] - Rerr[6]) / 2, (Rerr[3] - Rerr[1]) / 2]
    const n = norm(ax) || 1
    ax = scale(ax, 1 / n)
  }
  return scale(ax, angle)
}

// ---------- IK 求解器 ----------

export interface JointLimit {
  min: number
  max: number
  vMax: number
  home: number
}

export interface IKOptions {
  targetPos: Vec3
  /** 目標姿態（null = 只解位置，腕部由零空間姿態項決定） */
  targetRot?: Mat3 | null
  limits: JointLimit[]
  maxIter?: number
  tolPos?: number
  tolRot?: number
  lambda?: number
  /** 零空間姿態增益（0–2，「姿態強度」） */
  kPosture?: number
  /** 限位避讓增益 */
  kLimit?: number
  /** 每步最大關節變化（rad，數值穩定用） */
  maxStep?: number
}

export interface IKResult {
  q: number[]
  converged: boolean
  posErr: number
  rotErr: number
  iterations: number
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)

/**
 * DLS IK 求解 — 由 q0（暖啟動）迭代趨近目標 TCP 位形
 * 即時拖拽用：maxIter 較細 + 暖啟動之下通常 1–3 次迭代收斂
 */
export function solveIK(q0: number[], opts: IKOptions): IKResult {
  const {
    targetPos,
    targetRot,
    limits,
    maxIter = 50,
    tolPos = 0.0015, // 1.5mm
    tolRot = 0.03, // ~1.7°
    lambda = 0.06,
    kPosture = 0.6,
    kLimit = 1.5,
    maxStep = 0.35,
  } = opts

  const q = q0.map((v, i) => clamp(v, limits[i].min, limits[i].max))
  const useOri = !!targetRot
  const m = useOri ? 6 : 3 // 任務空間維度
  let best: IKResult = { q: [...q], converged: false, posErr: Infinity, rotErr: Infinity, iterations: 0 }

  for (let iter = 1; iter <= maxIter; iter++) {
    const fk = forwardKinematics(q)
    const ePos = sub(targetPos, fk.tcp)
    const posErr = norm(ePos)
    let rotErr = 0
    const e: number[] = [ePos[0], ePos[1], ePos[2]]
    if (useOri) {
      const eRot = rotationError(targetRot!, fk.R)
      rotErr = norm(eRot)
      e.push(eRot[0], eRot[1], eRot[2])
    }

    if (posErr < best.posErr) {
      best = { q: [...q], converged: posErr < tolPos && (!useOri || rotErr < tolRot), posErr, rotErr, iterations: iter }
    }
    if (posErr < tolPos && (!useOri || rotErr < tolRot)) {
      return { q: [...q], converged: true, posErr, rotErr, iterations: iter }
    }

    // Jacobian 7×m
    const Jfull = jacobian(fk)
    const J: number[][] = Jfull.map((row) => row.slice(0, m)) // 7×m

    // A = J·Jᵀ + λ²I  (m×m)（阻尼 — 主步穩定用）
    const lam2 = lambda * lambda
    const A: number[][] = []
    const JJt: number[][] = []
    for (let i = 0; i < m; i++) {
      A.push([])
      JJt.push([])
      for (let j = 0; j < m; j++) {
        let s = 0
        for (let k = 0; k < 7; k++) s += J[k][i] * J[k][j]
        A[i].push(s + (i === j ? lam2 : 0))
        JJt[i].push(s)
      }
    }
    // y = A⁻¹·e（阻尼逆 — 奇異亦必有解）
    const yDamped = solveLinear(A, [...e]) ?? new Array(m).fill(0)

    // dq_main = Jᵀ·y
    const dqMain: number[] = []
    for (let k = 0; k < 7; k++) {
      let s = 0
      for (let i = 0; i < m; i++) s += J[k][i] * yDamped[i]
      dqMain.push(s)
    }

    // 零空間：姿態項 + 限位避讓
    // 用「精確投影」N = I − Jᵀ(JJᵀ)⁻¹J（唔帶阻尼）→ 姿態項完全唔會洩漏到任務空間
    // 奇異時降級用阻尼逆（仍有輕微洩漏，但收斂後 e≈0 時主步會拉返）
    const nullGrad: number[] = []
    for (let k = 0; k < 7; k++) {
      const lim = limits[k]
      const posture = kPosture * (lim.home - q[k])
      // 限位避讓梯度（緩衝區 0.35 rad）
      const buf = 0.35
      let limGrad = 0
      if (q[k] < lim.min + buf) limGrad = kLimit * (lim.min + buf - q[k])
      else if (q[k] > lim.max - buf) limGrad = -kLimit * (q[k] - (lim.max - buf))
      nullGrad.push(posture + limGrad)
    }
    // J·nullGrad
    const Jg: number[] = []
    for (let i = 0; i < m; i++) {
      let s = 0
      for (let k = 0; k < 7; k++) s += J[k][i] * nullGrad[k]
      Jg.push(s)
    }
    const yExact = solveLinear(JJt, Jg) // 精確逆；奇異回 null
    let yNull: number[] | null = yExact
    if (!yNull) yNull = solveLinear(A, Jg) // 降級：阻尼逆
    if (!yNull) yNull = new Array<number>(m).fill(0)
    const dqNull: number[] = nullGrad.map((g, k) => {
      let s = 0
      for (let i = 0; i < m; i++) s += J[k][i] * yNull[i]
      return g - s
    })

    // 合成 + 步長限制
    for (let k = 0; k < 7; k++) {
      let dq = dqMain[k] + dqNull[k] * 0.5
      dq = clamp(dq, -maxStep, maxStep)
      q[k] = clamp(q[k] + dq, limits[k].min, limits[k].max)
    }
  }

  return best
}

// ---------- 軌跡時長估算（goto duration） ----------

/** 由關節差 + 速度上限估算安全 goto 時間（秒） */
export function estimateGotoDuration(qFrom: number[], qTo: number[], limits: JointLimit[]): number {
  let t = 0.15
  for (let i = 0; i < 7; i++) {
    const dq = Math.abs((qTo[i] ?? 0) - (qFrom[i] ?? 0))
    t = Math.max(t, dq / Math.max(limits[i].vMax * 0.45, 0.2))
  }
  return Math.min(Math.max(t * 1.35, 0.35), 5)
}

/** 由 jointsMeta（/api/robot/joints）產生 IK 限位表 */
export function limitsFromMeta(
  meta: Array<{ min: number; max: number; vMax: number; home: number }>
): JointLimit[] {
  if (meta && meta.length === 7) return meta.map((m) => ({ min: m.min, max: m.max, vMax: m.vMax, home: m.home }))
  return DEFAULT_JOINTS.map((j) => ({ ...j }))
}
