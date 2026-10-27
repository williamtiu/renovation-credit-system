/**
 * kinematics.ts 單元測試（獨立運行：bun run scripts/test-kinematics.ts）
 * 1. FK 與 Three.js 場景圖數值對照（手推已知位形）
 * 2. Jacobian 數值微分驗證
 * 3. IK 收斂測試（位置 / 位置+姿態）
 */

import {
  forwardKinematics, jacobian, solveIK, tcpPose, estimateGotoDuration,
  DEFAULT_JOINTS, SHOULDER, L1, L2, L3, limitsFromMeta,
  type Vec3, type Mat3, mat3Mul, mat3Apply, rotX, rotZ, rotY, norm,
} from '../src/lib/kinematics'

let pass = 0
let fail = 0
const t = (name: string, cond: boolean, detail = '') => {
  if (cond) {
    pass++
    console.log(`  ✓ ${name}`)
  } else {
    fail++
    console.log(`  ✗ ${name} ${detail}`)
  }
}
const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps
const nearV = (a: Vec3, b: Vec3, eps = 1e-9) => norm([a[0] - b[0], a[1] - b[1], a[2] - b[2]]) < eps

// ---------- 1. FK 手推對照 ----------
console.log('\n[1] FK 已知位形對照')

// 全零位形：鏈垂直向下
{
  const fk = forwardKinematics([0, 0, 0, 0, 0, 0, 0])
  // 肘 = 肩 - (0, L1, 0)；腕 = 肘 - (0, L2, 0)；TCP = 腕 - (0, L3, 0)
  const expectElbow: Vec3 = [SHOULDER[0], SHOULDER[1] - L1, SHOULDER[2]]
  const expectTcp: Vec3 = [SHOULDER[0], SHOULDER[1] - L1 - L2 - L3, SHOULDER[2]]
  t('零位形 肘位置', nearV(fk.elbow, expectElbow))
  t('零位形 TCP 位置', nearV(fk.tcp, expectTcp))
  t('零位形 TCP = 肩正下方 0.84m', near(fk.tcp[1], 1.02 - 0.84))
  t('零位形 R = 單位陣', fk.R.every((v, i) => near(v, i % 4 === 0 ? 1 : 0)))
}

// 純 J1 = π/2（繞 X 轉 90°）：-Y 鏈轉向 -Z... Rx(90°)·(0,-1,0) = ?
// Rx(θ)·(0,-1,0) = (0, -cosθ, -sinθ)；θ=90° → (0, 0, -1)
{
  const fk = forwardKinematics([Math.PI / 2, 0, 0, 0, 0, 0, 0])
  const expectTcp: Vec3 = [SHOULDER[0], SHOULDER[1], SHOULDER[2] - (L1 + L2 + L3)]
  t('J1=90° TCP 指向 -Z', nearV(fk.tcp, expectTcp), JSON.stringify(fk.tcp))
}

// 純 J2 = π/2（繞 Z 轉 90°）：Rz(90°)·(0,-1,0) = (1, 0, 0)·? 
// Rz(θ)·(0,-1,0) = (sinθ, -cosθ, 0)；θ=90° → (1, 0, 0)
{
  const fk = forwardKinematics([0, Math.PI / 2, 0, 0, 0, 0, 0])
  const expectTcp: Vec3 = [SHOULDER[0] + (L1 + L2 + L3), SHOULDER[1], SHOULDER[2]]
  t('J2=90° TCP 指向 +X', nearV(fk.tcp, expectTcp), JSON.stringify(fk.tcp))
}

// 肘彎 90°：J4 = -π/2 → 前臂由 -Y 轉向 -X？
// Rx(-90°)·(0,-1,0) = (0, -cos(-90°), -sin(-90°)) = (0, 0, 1)
{
  const fk = forwardKinematics([0, 0, 0, -Math.PI / 2, 0, 0, 0])
  // 上臂：肩→肘 = (0,-L1,0)；前臂：Rx(-90°)·(0,-L2,0) = (0, 0, L2)；手同向
  const expectWrist: Vec3 = [SHOULDER[0], SHOULDER[1] - L1, SHOULDER[2] + L2]
  const expectTcp: Vec3 = [SHOULDER[0], SHOULDER[1] - L1, SHOULDER[2] + L2 + L3]
  t('J4=-90° 腕位置', nearV(fk.wrist, expectWrist), JSON.stringify(fk.wrist))
  t('J4=-90° TCP 位置', nearV(fk.tcp, expectTcp), JSON.stringify(fk.tcp))
}

// home 位形 TCP 讀數
{
  const home = DEFAULT_JOINTS.map((j) => j.home)
  const pose = tcpPose(home)
  console.log(`    home TCP = (${pose.pos.map((v) => v.toFixed(3))}) rpy = (${pose.rpy.map((v) => v.toFixed(3))})`)
  t('home TCP y < 肩', pose.pos[1] < SHOULDER[1])
}

// ---------- 2. Jacobian 數值微分 ----------
console.log('\n[2] Jacobian 數值驗證（ vs 有限差分）')
{
  const q = [0.3, 0.8, -0.5, 1.1, 0.4, -0.3, 0.6]
  const fk = forwardKinematics(q)
  const J = jacobian(fk) // 7×6
  let maxErr = 0
  const h = 1e-6
  for (let k = 0; k < 7; k++) {
    const qp = [...q]; qp[k] += h
    const qm = [...q]; qm[k] -= h
    const fp = forwardKinematics(qp).tcp
    const fm = forwardKinematics(qm).tcp
    for (let c = 0; c < 3; c++) {
      const num = (fp[c] - fm[c]) / (2 * h)
      maxErr = Math.max(maxErr, Math.abs(num - J[k][c]))
    }
  }
  t(`線速度 Jacobian 誤差 < 1e-6`, maxErr < 1e-6, `maxErr=${maxErr.toExponential(2)}`)
}

// 角速度 Jacobian：驗證 J1（x 軸）與 J2
{
  const q = [0.3, 0.8, -0.5, 1.1, 0.4, -0.3, 0.6]
  const fk = forwardKinematics(q)
  const J = jacobian(fk)
  t('J1 角軸 = (1,0,0)', nearV([J[0][3], J[0][4], J[0][5]], [1, 0, 0], 1e-12))
  // J2 軸 = Rx(q1)·ez = (0, -sin q1, cos q1)
  const e2: Vec3 = [0, -Math.sin(q[0]), Math.cos(q[0])]
  t('J2 角軸 = Rx(q1)·ez', nearV([J[1][3], J[1][4], J[1][5]], e2, 1e-12))
}

// ---------- 3. IK 收斂 ----------
console.log('\n[3] IK 求解')
const limits = limitsFromMeta([])

{
  // 目標 = home TCP + 10cm 往 +X
  const home = DEFAULT_JOINTS.map((j) => j.home)
  const fkHome = forwardKinematics(home)
  const target: Vec3 = [fkHome.tcp[0] + 0.1, fkHome.tcp[1], fkHome.tcp[2]]
  const r = solveIK(home, { targetPos: target, limits })
  const fkNew = forwardKinematics(r.q)
  console.log(`    位置 IK: iter=${r.iterations} posErr=${r.posErr.toFixed(5)}m`)
  t('位置 IK 收斂', r.converged, `posErr=${r.posErr}`)
  t('位置 IK 到位（<2mm）', norm([fkNew.tcp[0] - target[0], fkNew.tcp[1] - target[1], fkNew.tcp[2] - target[2]]) < 0.002)
}

{
  // 目標 = home TCP + 15cm 往 +Z + 姿態保持
  const home = DEFAULT_JOINTS.map((j) => j.home)
  const fkHome = forwardKinematics(home)
  const target: Vec3 = [fkHome.tcp[0], fkHome.tcp[1] + 0.05, fkHome.tcp[2] + 0.15]
  const r = solveIK(home, { targetPos: target, targetRot: fkHome.R, limits })
  console.log(`    位形 IK: iter=${r.iterations} posErr=${r.posErr.toFixed(5)}m rotErr=${r.rotErr.toFixed(4)}rad`)
  t('位形 IK 收斂（位置+姿態）', r.converged)
  t('位形 IK 姿態誤差 < 2°', r.rotErr < 0.035)
}

{
  // 不可達目標：肩上方 2m
  const home = DEFAULT_JOINTS.map((j) => j.home)
  const r = solveIK(home, { targetPos: [0.2, 3.0, 0], limits })
  t('不可達 → converged=false', !r.converged)
  t('不可達 → 盡量接近（posErr < 1.2m）', r.posErr < 1.2, `posErr=${r.posErr.toFixed(3)}`)
}

{
  // 暖啟動快速收斂（模擬連續拖拽）
  const home = DEFAULT_JOINTS.map((j) => j.home)
  const fkHome = forwardKinematics(home)
  let q = [...home]
  // 目標：home TCP + (5cm X, 2cm Y, 4cm -Z) — 喺 0.81m 半徑內（最大 0.84），確定可達
  const target: Vec3 = [fkHome.tcp[0] + 0.05, fkHome.tcp[1] + 0.02, fkHome.tcp[2] - 0.04]
  let iters = 0
  for (let i = 0; i < 5; i++) {
    const targetI: Vec3 = [
      fkHome.tcp[0] + 0.05 * (i / 4),
      fkHome.tcp[1] + 0.02 * (i / 4),
      fkHome.tcp[2] - 0.04 * (i / 4),
    ]
    const r = solveIK(q, { targetPos: targetI, limits, maxIter: 12 })
    console.log(`    substep ${i}: iter=${r.iterations} posErr=${r.posErr.toFixed(5)} conv=${r.converged}`)
    q = r.q
    iters += r.iterations
  }
  const fkEnd = forwardKinematics(q)
  const err = norm([fkEnd.tcp[0] - target[0], fkEnd.tcp[1] - target[1], fkEnd.tcp[2] - target[2]])
  t('暖啟動連續求解（≤12 iter/步）', err < 0.004, `err=${err.toFixed(4)} 總iter=${iters}`)
}

{
  // goto 時長估算
  const home = DEFAULT_JOINTS.map((j) => j.home)
  const d1 = estimateGotoDuration(home, home, limits)
  const d2 = estimateGotoDuration(home, [1.0, 0.5, 0, 1.0, 0, 0, 0], limits)
  t('時長估算：零移動最短', d1 >= 0.35 && d1 < 0.6, `d1=${d1.toFixed(2)}`)
  t('時長估算：大動作較長', d2 > 0.8, `d2=${d2.toFixed(2)}`)
}

console.log(`\n結果: ${pass} passed, ${fail} failed`)
process.exit(fail > 0 ? 1 : 0)
