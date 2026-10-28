/**
 * ArmScene — R1-7A 3D 場景工廠（Three.js 動態載入）
 *
 * 三種交互模式（參考 RoboDK / UR Robot UI）：
 *   observe — 被動可視化（遙測驅動）
 *   ik      — TCP 目標 gizmo 拖拽（拖動平面約束）+ 即時 IK 預覽
 *   joint   — 關節環拖拽（沿關節軸旋轉）
 *
 * 場景只負責交互幾何（raycast / 平面 / 環），IK 求解與指令由 React 層回調處理。
 * 運動學計算一律用 @/lib/kinematics（與場景 pivot 鏈完全對應）。
 */

import {
  forwardKinematics, DEFAULT_JOINTS, SHOULDER,
  type Vec3,
} from '@/lib/kinematics'

export type Mode = 'observe' | 'ik' | 'joint'
export type DragPlane = 'screen' | 'horizontal' | 'vertical'
export type IKStatus = 'ok' | 'unreachable' | 'inactive'
export type ViewName = 'front' | 'side' | 'top' | 'iso'

export interface ArmSceneCallbacks {
  /** TCP gizmo 開始拖拽 */
  onTcpDragStart?: () => void
  /** TCP gizmo 拖拽中（世界座標，已 Clamp 於工作空間） */
  onTcpDragMove?: (pos: Vec3) => void
  /** TCP gizmo 結束拖拽 */
  onTcpDragEnd?: () => void
  /** 關節環開始拖拽（0-based 關節索引） */
  onJointDragStart?: (index: number) => void
  /** 關節環拖拽（累計角度差 rad，由拖拽起點起算） */
  onJointDragMove?: (index: number, deltaRad: number) => void
  /** 關節環結束拖拽 */
  onJointDragEnd?: (index: number) => void
}

export interface ArmSceneApi {
  applyTelemetry(q: number[]): void
  /** null = 結束預覽，恢復遙測驅動 */
  setPreview(q: number[] | null): void
  setMode(m: Mode): void
  setPlane(p: DragPlane): void
  setIKStatus(s: IKStatus): void
  /** false（E-stop / 未激活）→ gizmo 變灰 + 拖拽禁用 */
  setDragEnabled(on: boolean): void
  setView(v: ViewName): void
  toggleTrail(on: boolean): void
  setRenderMode(m: 'solid' | 'wireframe'): void
  setEstop(on: boolean): void
  getTargetPos(): Vec3
  setTargetPos(p: Vec3): void
  dispose(): void
}

/** 關節環規格：半徑 + 沿自身軸偏移（分開同原點嘅環） */
const RING_SPEC = [
  { r: 0.105, off: -0.115 }, // J1 肩（X 軸）
  { r: 0.105, off: 0.115 }, // J2 肩（Z 軸）
  { r: 0.105, off: 0 }, // J3 肩（Y 軸）
  { r: 0.088, off: 0.1 }, // J4 肘（X 軸）
  { r: 0.068, off: 0.082 }, // J5 腕（Y 軸）
  { r: 0.068, off: 0 }, // J6 腕（X 軸）
  { r: 0.068, off: -0.082 }, // J7 腕（Y 軸）
]

const HOME_Q = DEFAULT_JOINTS.map((j) => j.home)
/** 拖拽 Clamp：工作半徑（< MAX_REACH 0.84）+ 地板高度 */
const DRAG_MAX_R = 0.815
const DRAG_MIN_Y = 0.06

export async function createArmScene(
  mount: HTMLDivElement,
  cb: ArmSceneCallbacks
): Promise<ArmSceneApi> {
  const THREE = await import('three')
  const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')

  const w = mount.clientWidth
  const h = mount.clientHeight

  // --- 基礎場景 ---
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#09090b')
  scene.fog = new THREE.Fog('#09090b', 4, 12)

  const camera = new THREE.PerspectiveCamera(45, w / h, 0.05, 50)
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(w, h)
  renderer.domElement.style.touchAction = 'none'
  mount.appendChild(renderer.domElement)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.minDistance = 0.6
  controls.maxDistance = 6
  controls.target.set(0, 0.7, 0)

  scene.add(new THREE.AmbientLight('#ffffff', 0.55))
  const keyLight = new THREE.DirectionalLight('#ffd9a0', 1.6)
  keyLight.position.set(2.5, 4, 2)
  scene.add(keyLight)
  const rim = new THREE.DirectionalLight('#7dd3fc', 0.5)
  rim.position.set(-3, 2, -2.5)
  scene.add(rim)

  const grid = new THREE.GridHelper(4, 20, '#3f3f46', '#27272a')
  ;(grid.material as { opacity: number; transparent: boolean }).opacity = 0.55
  ;(grid.material as { opacity: number; transparent: boolean }).transparent = true
  scene.add(grid)
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(2, 48).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: '#18181b', roughness: 0.95 })
  )
  floor.position.y = -0.002
  scene.add(floor)

  // --- 軀幹 ---
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.17, 1.15, 24),
    new THREE.MeshStandardMaterial({ color: '#27272a', roughness: 0.7, metalness: 0.2 })
  )
  trunk.position.set(-0.1, 0.575, 0)
  scene.add(trunk)
  const trunkTop = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 24, 16),
    new THREE.MeshStandardMaterial({ color: '#3f3f46', roughness: 0.5, metalness: 0.3 })
  )
  trunkTop.position.set(-0.1, 1.15, 0)
  scene.add(trunkTop)

  // --- 機械臂連桿/關節 ---
  const L_UPPER = 0.32
  const L_FOREARM = 0.28
  const L_HAND = 0.16

  const linkMat = new THREE.MeshStandardMaterial({ color: '#d4d4d8', roughness: 0.35, metalness: 0.55 })
  const linkMatWire = new THREE.MeshBasicMaterial({ color: '#f59e0b', wireframe: true })
  const jointMats = {
    normal: new THREE.MeshStandardMaterial({ color: '#f59e0b', emissive: '#92400e', roughness: 0.3, metalness: 0.4 }),
    estop: new THREE.MeshStandardMaterial({ color: '#ef4444', emissive: '#7f1d1d', roughness: 0.3 }),
  }
  const jointSpheres: THREE.Mesh[] = []
  const makeJointSphere = (parent: THREE.Object3D) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.042, 18, 14), jointMats.normal)
    parent.add(s)
    jointSpheres.push(s)
    return s
  }
  const makeLink = (parent: THREE.Object3D, len: number, radius: number): THREE.Mesh => {
    const geo = new THREE.CylinderGeometry(radius, radius * 0.85, len, 16)
    const solid = new THREE.Mesh(geo, linkMat)
    const wire = new THREE.Mesh(geo, linkMatWire)
    wire.visible = false
    const g = new THREE.Group()
    g.add(solid)
    g.add(wire)
    g.position.y = -len / 2
    parent.add(g)
    ;(g as unknown as { __wire: THREE.Mesh }).__wire = wire
    ;(g as unknown as { __solid: THREE.Mesh }).__solid = solid
    return g as unknown as THREE.Mesh
  }

  const shoulderMount = new THREE.Group()
  shoulderMount.position.set(SHOULDER[0], SHOULDER[1], SHOULDER[2])
  scene.add(shoulderMount)

  const j1 = new THREE.Group(); shoulderMount.add(j1)
  const j2 = new THREE.Group(); j1.add(j2)
  const j3 = new THREE.Group(); j2.add(j3)
  makeJointSphere(j3)
  makeLink(j3, L_UPPER, 0.052)
  const j4 = new THREE.Group(); j4.position.y = -L_UPPER; j3.add(j4)
  makeJointSphere(j4)
  makeLink(j4, L_FOREARM, 0.04)
  const j5 = new THREE.Group(); j5.position.y = -L_FOREARM; j4.add(j5)
  const j6 = new THREE.Group(); j5.add(j6)
  const j7 = new THREE.Group(); j6.add(j7)
  makeJointSphere(j7)
  makeLink(j7, L_HAND, 0.03)
  const ee = new THREE.Group()
  ee.position.y = -L_HAND
  j7.add(ee)
  const palmMat = new THREE.MeshStandardMaterial({ color: '#52525b', roughness: 0.4, metalness: 0.5 })
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.07), palmMat)
  ee.add(palm)
  const fingerGeo = new THREE.BoxGeometry(0.016, 0.07, 0.03)
  const f1 = new THREE.Mesh(fingerGeo, palmMat); f1.position.set(-0.022, -0.05, 0)
  const f2 = new THREE.Mesh(fingerGeo, palmMat); f2.position.set(0.022, -0.05, 0)
  ee.add(f1, f2)
  const eeDot = new THREE.Mesh(
    new THREE.SphereGeometry(0.014, 12, 10),
    new THREE.MeshBasicMaterial({ color: '#10b981' })
  )
  eeDot.position.y = -0.08
  ee.add(eeDot)

  const pivots = [j1, j2, j3, j4, j5, j6, j7]
  const axes: Array<'x' | 'y' | 'z'> = ['x', 'z', 'y', 'x', 'y', 'x', 'y']

  // --- 末端軌跡 ---
  const MAX_TRAIL = 600
  const trailPositions = new Float32Array(MAX_TRAIL * 3)
  let trailCount = 0
  const trailGeo = new THREE.BufferGeometry()
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3))
  trailGeo.setDrawRange(0, 0)
  const trail = new THREE.Line(
    trailGeo,
    new THREE.LineBasicMaterial({ color: '#10b981', transparent: true, opacity: 0.85 })
  )
  scene.add(trail)
  let lastTrailTs = 0

  // --- 狀態 ---
  let teleQ: number[] = [...HOME_Q]
  let previewQ: number[] | null = null
  let mode: Mode = 'observe'
  let planeKind: DragPlane = 'screen'
  let dragEnabled = true
  let ikStatus: IKStatus = 'ok'
  let estopVisual = false
  let selectedJoint: number | null = null

  const applyJoints = (q: number[]) => {
    for (let i = 0; i < 7; i++) {
      const val = Number.isFinite(q?.[i]) ? q[i] : HOME_Q[i]
      pivots[i].rotation[axes[i]] = val
    }
  }
  const applyEstopVisual = () => {
    for (const s of jointSpheres) s.material = estopVisual ? jointMats.estop : jointMats.normal
  }
  applyJoints(HOME_Q)

  // --- TCP 目標 gizmo（IK 模式） ---
  const gizmo = new THREE.Group()
  gizmo.visible = false
  scene.add(gizmo)
  const gizmoStatusColor: Record<IKStatus, string> = {
    ok: '#10b981',
    unreachable: '#ef4444',
    inactive: '#71717a',
  }
  const gizmoMat = new THREE.MeshBasicMaterial({ color: gizmoStatusColor.ok })
  const gizmoSphere = new THREE.Mesh(new THREE.SphereGeometry(0.021, 20, 14), gizmoMat)
  const gizmoHit = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 8, 6),
    new THREE.MeshBasicMaterial({ visible: false })
  )
  gizmo.add(gizmoSphere, gizmoHit)
  // 三軸箭頭（TCP 姿態參考，世界系）
  const axX = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 0.09, '#ef4444', 0.026, 0.014)
  const axY = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), 0.09, '#22c55e', 0.026, 0.014)
  const axZ = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(), 0.09, '#3b82f6', 0.026, 0.014)
  gizmo.add(axX, axY, axZ)
  // 目標 → 實際 TCP 虛線
  const lineGeo = new THREE.BufferGeometry()
  lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3))
  const gizmoLine = new THREE.Line(
    lineGeo,
    new THREE.LineDashedMaterial({ color: '#a1a1aa', dashSize: 0.018, gapSize: 0.012, transparent: true, opacity: 0.8 })
  )
  gizmoLine.visible = false
  scene.add(gizmoLine)

  const setGizmoColor = () => gizmoMat.color.set(gizmoStatusColor[ikStatus])

  // --- 關節環（joint 模式） ---
  interface RingObj {
    group: THREE.Group
    visual: THREE.Mesh
    hit: THREE.Mesh
    mat: THREE.MeshBasicMaterial
    hover: boolean
  }
  const rings: RingObj[] = []
  const ringMatBase = { transparent: true, depthWrite: false }
  for (let i = 0; i < 7; i++) {
    const spec = RING_SPEC[i]
    const mat = new THREE.MeshBasicMaterial({ color: '#f59e0b', opacity: 0.75, ...ringMatBase })
    const visual = new THREE.Mesh(new THREE.TorusGeometry(spec.r, 0.007, 10, 48), mat)
    const hit = new THREE.Mesh(
      new THREE.TorusGeometry(spec.r, 0.022, 8, 32),
      new THREE.MeshBasicMaterial({ visible: false })
    )
    const group = new THREE.Group()
    group.add(visual, hit)
    group.visible = false
    group.userData.jointIndex = i
    hit.userData.jointIndex = i
    scene.add(group)
    rings.push({ group, visual, hit, mat, hover: false })
  }

  const ringActiveColor = { normal: '#f59e0b', hover: '#10b981', disabled: '#52525b' }

  const updateRingTransforms = (q: number[]) => {
    const fk = forwardKinematics(q)
    const zAxis = new THREE.Vector3(0, 0, 1)
    const axisV = new THREE.Vector3()
    const posV = new THREE.Vector3()
    for (let i = 0; i < 7; i++) {
      const a = fk.axes[i]
      const o = fk.origins[i]
      const spec = RING_SPEC[i]
      axisV.set(a[0], a[1], a[2]).normalize()
      posV.set(o[0] + a[0] * spec.off, o[1] + a[1] * spec.off, o[2] + a[2] * spec.off)
      rings[i].group.position.copy(posV)
      rings[i].group.quaternion.setFromUnitVectors(zAxis, axisV)
      const active = mode === 'joint' && dragEnabled
      const isSel = selectedJoint === i
      rings[i].mat.color.set(
        !active ? ringActiveColor.disabled : isSel || rings[i].hover ? ringActiveColor.hover : ringActiveColor.normal
      )
      rings[i].mat.opacity = active ? (rings[i].hover || isSel ? 0.95 : 0.7) : 0.25
    }
  }
  updateRingTransforms(HOME_Q)

  // --- 視角 ---
  const views: Record<ViewName, [number, number, number]> = {
    front: [0, 1.0, 2.6],
    side: [2.6, 1.0, 0],
    top: [0.01, 3.4, 0.01],
    iso: [1.9, 1.6, 2.0],
  }
  const setCameraView = (v: ViewName) => {
    const [x, y, z] = views[v]
    camera.position.set(x, y, z)
    controls.target.set(0, 0.72, 0)
    controls.update()
  }
  setCameraView('iso')

  // --- 拖拽交互 ---
  const raycaster = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  const dragPlane = new THREE.Plane()
  const hitPoint = new THREE.Vector3()
  const tmpV = new THREE.Vector3()

  let tcpDragging = false
  let jointDragging = -1
  let jointDragR0 = new THREE.Vector3() // 拖拽起點半徑向量
  const jointPlaneCenter = new THREE.Vector3()
  const jointPlaneAxis = new THREE.Vector3()
  let lastTarget = new THREE.Vector3()

  const toNdc = (e: PointerEvent) => {
    const rect = renderer.domElement.getBoundingClientRect()
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
  }

  const clampTarget = (v: THREE.Vector3) => {
    // 工作球 Clamp（以肩為中心）+ 地板高度
    tmpV.set(v.x - SHOULDER[0], v.y - SHOULDER[1], v.z - SHOULDER[2])
    const d = tmpV.length()
    if (d > DRAG_MAX_R) tmpV.multiplyScalar(DRAG_MAX_R / d)
    v.set(SHOULDER[0] + tmpV.x, Math.max(SHOULDER[1] + tmpV.y, DRAG_MIN_Y), SHOULDER[2] + tmpV.z)
  }

  const setupDragPlane = () => {
    if (planeKind === 'horizontal') {
      dragPlane.set(new THREE.Vector3(0, 1, 0), -lastTarget.y)
    } else if (planeKind === 'vertical') {
      const dir = camera.getWorldDirection(tmpV.clone()).clone()
      const n = new THREE.Vector3(dir.x, 0, dir.z)
      if (n.lengthSq() < 1e-6) n.set(0, 0, 1)
      n.normalize()
      dragPlane.set(n, -n.dot(lastTarget))
    } else {
      // 視平面：法向 = 相機方向，過當前目標
      const n = camera.getWorldDirection(new THREE.Vector3())
      dragPlane.set(n, -n.dot(lastTarget))
    }
  }

  const onPointerDown = (e: PointerEvent) => {
    if (!dragEnabled) return
    toNdc(e)
    raycaster.setFromCamera(ndc, camera)

    if (mode === 'ik') {
      const hits = raycaster.intersectObject(gizmoHit, false)
      if (hits.length > 0) {
        tcpDragging = true
        controls.enabled = false
        renderer.domElement.setPointerCapture(e.pointerId)
        renderer.domElement.style.cursor = 'grabbing'
        setupDragPlane()
        cb.onTcpDragStart?.()
        return
      }
    } else if (mode === 'joint') {
      const hits = raycaster.intersectObjects(rings.map((r) => r.hit))
      if (hits.length > 0) {
        const idx = hits[0].object.userData.jointIndex as number
        jointDragging = idx
        controls.enabled = false
        renderer.domElement.setPointerCapture(e.pointerId)
        renderer.domElement.style.cursor = 'grabbing'
        // 環平面：法向 = 關節軸，過環中心
        const fk = forwardKinematics(previewQ ?? teleQ)
        const a = fk.axes[idx]
        jointPlaneAxis.set(a[0], a[1], a[2]).normalize()
        jointPlaneCenter.copy(rings[idx].group.position)
        dragPlane.set(jointPlaneAxis, -jointPlaneAxis.dot(jointPlaneCenter))
        // 起點半徑向量
        if (raycaster.ray.intersectPlane(dragPlane, hitPoint)) {
          jointDragR0.copy(hitPoint).sub(jointPlaneCenter)
          if (jointDragR0.length() < 0.02) jointDragR0.setLength(0.02)
        }
        cb.onJointDragStart?.(idx)
        return
      }
    }
  }

  const onPointerMove = (e: PointerEvent) => {
    // 非拖拽 hover 效果（關節環）
    if (!tcpDragging && jointDragging < 0 && mode === 'joint' && dragEnabled) {
      toNdc(e)
      raycaster.setFromCamera(ndc, camera)
      const hits = raycaster.intersectObjects(rings.map((r) => r.hit))
      const hoverIdx = hits.length > 0 ? (hits[0].object.userData.jointIndex as number) : -1
      let changed = false
      rings.forEach((r, i) => {
        const hv = i === hoverIdx
        if (r.hover !== hv) {
          r.hover = hv
          changed = true
        }
      })
      if (changed) {
        renderer.domElement.style.cursor = hoverIdx >= 0 ? 'grab' : 'default'
        updateRingTransforms(previewQ ?? teleQ)
      }
      return
    }

    toNdc(e)
    raycaster.setFromCamera(ndc, camera)

    if (tcpDragging) {
      if (raycaster.ray.intersectPlane(dragPlane, hitPoint)) {
        // 限制單步跳變（射線近乎平行平面時防止彈飛）
        if (hitPoint.distanceTo(lastTarget) < 0.5) {
          clampTarget(hitPoint)
          lastTarget.copy(hitPoint)
          gizmo.position.copy(lastTarget)
          cb.onTcpDragMove?.([lastTarget.x, lastTarget.y, lastTarget.z])
        }
      }
      return
    }

    if (jointDragging >= 0) {
      if (raycaster.ray.intersectPlane(dragPlane, hitPoint)) {
        const r1 = hitPoint.clone().sub(jointPlaneCenter)
        if (r1.length() > 0.02) {
          const r0 = jointDragR0
          const cross = new THREE.Vector3().crossVectors(r0, r1)
          const dotv = Math.max(-1, Math.min(1, r0.dot(r1) / (r0.length() * r1.length())))
          let ang = Math.atan2(cross.dot(jointPlaneAxis), dotv)
          if (!Number.isFinite(ang)) ang = 0
          cb.onJointDragMove?.(jointDragging, ang)
        }
      }
      return
    }
  }

  const onPointerUp = (e: PointerEvent) => {
    if (tcpDragging) {
      tcpDragging = false
      controls.enabled = true
      renderer.domElement.style.cursor = 'default'
      try { renderer.domElement.releasePointerCapture(e.pointerId) } catch { /* noop */ }
      cb.onTcpDragEnd?.()
    } else if (jointDragging >= 0) {
      const idx = jointDragging
      jointDragging = -1
      controls.enabled = true
      renderer.domElement.style.cursor = 'default'
      try { renderer.domElement.releasePointerCapture(e.pointerId) } catch { /* noop */ }
      cb.onJointDragEnd?.(idx)
    }
  }

  renderer.domElement.addEventListener('pointerdown', onPointerDown)
  renderer.domElement.addEventListener('pointermove', onPointerMove)
  renderer.domElement.addEventListener('pointerup', onPointerUp)
  renderer.domElement.addEventListener('pointercancel', onPointerUp)

  // --- 渲染循環 ---
  const clock = new THREE.Clock()
  const trailV = new THREE.Vector3()
  let raf = 0
  const tick = () => {
    raf = requestAnimationFrame(tick)
    controls.update()
    const t = clock.getElapsedTime()
    // 軌跡取樣（~20Hz）— 預覽模式下暫停（避免假軌跡）
    if (t - lastTrailTs > 0.05 && trailCount < MAX_TRAIL && !previewQ) {
      lastTrailTs = t
      trailV.setFromMatrixPosition(eeDot.matrixWorld)
      trailPositions[trailCount * 3] = trailV.x
      trailPositions[trailCount * 3 + 1] = trailV.y
      trailPositions[trailCount * 3 + 2] = trailV.z
      trailCount++
      trailGeo.setDrawRange(0, trailCount)
      trailGeo.attributes.position.needsUpdate = true
    }
    // gizmo → TCP 虛線
    if (gizmo.visible) {
      trailV.setFromMatrixPosition(eeDot.matrixWorld)
      const p = lineGeo.attributes.position as THREE.BufferAttribute
      const arr = p.array as Float32Array
      arr[0] = lastTarget.x; arr[1] = lastTarget.y; arr[2] = lastTarget.z
      arr[3] = trailV.x; arr[4] = trailV.y; arr[5] = trailV.z
      p.needsUpdate = true
      gizmoLine.computeLineDistances()
    }
    renderer.render(scene, camera)
  }
  tick()

  // --- resize ---
  const ro = new ResizeObserver(() => {
    const nw = mount.clientWidth
    const nh = mount.clientHeight
    if (nw > 0 && nh > 0) {
      camera.aspect = nw / nh
      camera.updateProjectionMatrix()
      renderer.setSize(nw, nh)
    }
  })
  ro.observe(mount)

  // --- 線框切換收集 ---
  const linkGroups: Array<{ __solid: THREE.Mesh; __wire: THREE.Mesh }> = []
  scene.traverse((obj) => {
    const g = obj as unknown as { __solid?: THREE.Mesh; __wire?: THREE.Mesh }
    if (g.__solid && g.__wire) linkGroups.push(g as { __solid: THREE.Mesh; __wire: THREE.Mesh })
  })

  // --- API ---
  const api: ArmSceneApi = {
    applyTelemetry(q) {
      teleQ = [...q]
      if (!previewQ) {
        applyJoints(teleQ)
        updateRingTransforms(teleQ)
      }
    },
    setPreview(q) {
      previewQ = q ? [...q] : null
      if (previewQ) {
        applyJoints(previewQ)
        updateRingTransforms(previewQ)
      } else {
        applyJoints(teleQ)
        updateRingTransforms(teleQ)
      }
    },
    setMode(m) {
      mode = m
      gizmo.visible = m === 'ik'
      gizmoLine.visible = m === 'ik'
      for (const r of rings) r.group.visible = m === 'joint'
      updateRingTransforms(previewQ ?? teleQ)
    },
    setPlane(p) {
      planeKind = p
    },
    setIKStatus(s) {
      ikStatus = s
      setGizmoColor()
    },
    setDragEnabled(on) {
      dragEnabled = on
      if (!on) {
        ikStatus = 'inactive'
        setGizmoColor()
      } else {
        ikStatus = 'ok'
        setGizmoColor()
      }
      updateRingTransforms(previewQ ?? teleQ)
    },
    setView: (v) => setCameraView(v),
    toggleTrail(on) {
      trail.visible = on
      if (on) {
        trailCount = 0
        trailGeo.setDrawRange(0, 0)
      }
    },
    setRenderMode(m) {
      for (const g of linkGroups) {
        g.__solid.visible = m === 'solid'
        g.__wire.visible = m === 'wireframe'
      }
    },
    setEstop(on) {
      estopVisual = on
      applyEstopVisual()
    },
    getTargetPos() {
      return [lastTarget.x, lastTarget.y, lastTarget.z]
    },
    setTargetPos(p) {
      lastTarget.set(p[0], p[1], p[2])
      clampTarget(lastTarget)
      gizmo.position.copy(lastTarget)
    },
    dispose() {
      cancelAnimationFrame(raf)
      ro.disconnect()
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.domElement.removeEventListener('pointermove', onPointerMove)
      renderer.domElement.removeEventListener('pointerup', onPointerUp)
      renderer.domElement.removeEventListener('pointercancel', onPointerUp)
      controls.dispose()
      renderer.dispose()
      scene.traverse((obj) => {
        const m = obj as THREE.Mesh
        if (m.geometry) m.geometry.dispose()
      })
      linkMat.dispose()
      linkMatWire.dispose()
      jointMats.normal.dispose()
      jointMats.estop.dispose()
      palmMat.dispose()
      gizmoMat.dispose()
      for (const r of rings) {
        r.mat.dispose()
        ;(r.hit.material as THREE.Material).dispose()
      }
      ;(gizmoLine.material as THREE.Material).dispose()
      ;(trail.material as THREE.Material).dispose()
      mount.removeChild(renderer.domElement)
    },
  }

  return api
}
