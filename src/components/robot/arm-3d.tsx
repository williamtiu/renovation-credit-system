'use client'

/**
 * Arm3D — R1-7A 機械臂 3D 即時可視化（Three.js）
 *
 * - 依據 URDF 關節軸向建立 7-DOF 運動鏈（pitch→X / roll→Z / yaw→Y）
 * - 即時由 /joint_states（10Hz WS）更新關節旋轉
 * - OrbitControls 拖拽旋轉 / 滾輪縮放
 * - 末端執行器軌跡追踪（最近 6 秒）
 * - E-stop 狀態視覺警示（關節球轉紅）
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { RobotContext } from '@/hooks/use-robot'

// ---------- 場景 API（初始化後由 React 層調用） ----------

interface SceneApi {
  updateJoints: (q: number[]) => void
  setView: (view: ViewName) => void
  toggleTrail: (on: boolean) => void
  setRenderMode: (mode: 'solid' | 'wireframe') => void
  setEstop: (on: boolean) => void
  dispose: () => void
}

type ViewName = 'front' | 'side' | 'top' | 'iso'

// R1-7A 連桿長度（米，按比例）
const L_UPPER = 0.32 // 肩 → 肘
const L_FOREARM = 0.28 // 肘 → 腕
const L_HAND = 0.16 // 腕 → 末端

export function Arm3D({ robot }: { robot: RobotContext }) {
  const mountRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<SceneApi | null>(null)
  const [ready, setReady] = useState(false)
  const [view, setView] = useState<ViewName>('iso')
  const [showTrail, setShowTrail] = useState(true)
  const [renderMode, setRenderMode] = useState<'solid' | 'wireframe'>('solid')

  const { state } = robot
  const estop = !!state?.estop

  // ---------- 初始化場景（一次性） ----------
  useEffect(() => {
    let disposed = false
    let raf = 0

    void (async () => {
      const THREE = await import('three')
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')
      if (disposed || !mountRef.current) return

      const mount = mountRef.current
      const w = mount.clientWidth
      const h = mount.clientHeight

      // --- 基礎 ---
      const scene = new THREE.Scene()
      scene.background = new THREE.Color('#09090b') // zinc-950
      scene.fog = new THREE.Fog('#09090b', 4, 12)

      const camera = new THREE.PerspectiveCamera(45, w / h, 0.05, 50)
      const renderer = new THREE.WebGLRenderer({ antialias: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setSize(w, h)
      mount.appendChild(renderer.domElement)

      const controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.08
      controls.minDistance = 0.6
      controls.maxDistance = 6
      controls.target.set(0, 0.7, 0)

      // --- 燈光 ---
      scene.add(new THREE.AmbientLight('#ffffff', 0.55))
      const key = new THREE.DirectionalLight('#ffd9a0', 1.6)
      key.position.set(2.5, 4, 2)
      scene.add(key)
      const rim = new THREE.DirectionalLight('#7dd3fc', 0.5)
      rim.position.set(-3, 2, -2.5)
      scene.add(rim)

      // --- 地面網格 + 底座 ---
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

      // --- 軀幹（示意） ---
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

      // --- 材質共用 ---
      const linkMat = new THREE.MeshStandardMaterial({
        color: '#d4d4d8',
        roughness: 0.35,
        metalness: 0.55,
      })
      const linkMatWire = new THREE.MeshBasicMaterial({ color: '#f59e0b', wireframe: true })
      const jointMats = {
        normal: new THREE.MeshStandardMaterial({
          color: '#f59e0b',
          emissive: '#92400e',
          roughness: 0.3,
          metalness: 0.4,
        }),
        estop: new THREE.MeshStandardMaterial({
          color: '#ef4444',
          emissive: '#7f1d1d',
          roughness: 0.3,
        }),
      }

      const jointSpheres: THREE.Mesh[] = []
      const makeJointSphere = (parent: THREE.Object3D) => {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.042, 18, 14), jointMats.normal)
        parent.add(s)
        jointSpheres.push(s)
        return s
      }

      const makeLink = (
        parent: THREE.Object3D,
        len: number,
        radius: number
      ): THREE.Mesh => {
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

      // --- 7-DOF 運動鏈 ---
      // 肩部位於軀幹右側（+X），手臂沿 -Y 自然下垂
      const shoulderMount = new THREE.Group()
      shoulderMount.position.set(0.2, 1.02, 0)
      scene.add(shoulderMount)

      // J1 arm_pitch — 繞 X（前後擺）
      const j1 = new THREE.Group()
      shoulderMount.add(j1)
      // J2 arm_roll — 繞 Z（側向擺）
      const j2 = new THREE.Group()
      j1.add(j2)
      // J3 arm_yaw — 繞 Y（上臂自轉）
      const j3 = new THREE.Group()
      j2.add(j3)
      makeJointSphere(j3)
      makeLink(j3, L_UPPER, 0.052)

      // J4 forearm_pitch（肘）— 繞 X
      const j4 = new THREE.Group()
      j4.position.y = -L_UPPER
      j3.add(j4)
      makeJointSphere(j4)
      makeLink(j4, L_FOREARM, 0.04)

      // J5 forearm_yaw — 繞 Y
      const j5 = new THREE.Group()
      j5.position.y = -L_FOREARM
      j4.add(j5)
      // J6 hand_pitch — 繞 X
      const j6 = new THREE.Group()
      j5.add(j6)
      // J7 hand_yaw — 繞 Y
      const j7 = new THREE.Group()
      j6.add(j7)
      makeJointSphere(j7)

      // 末端：腕 → 夾爪
      makeLink(j7, L_HAND, 0.03)
      const ee = new THREE.Group()
      ee.position.y = -L_HAND
      j7.add(ee)
      const palmMat = new THREE.MeshStandardMaterial({ color: '#52525b', roughness: 0.4, metalness: 0.5 })
      const palm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.07), palmMat)
      ee.add(palm)
      const fingerGeo = new THREE.BoxGeometry(0.016, 0.07, 0.03)
      const f1 = new THREE.Mesh(fingerGeo, palmMat)
      f1.position.set(-0.022, -0.05, 0)
      const f2 = new THREE.Mesh(fingerGeo, palmMat)
      f2.position.set(0.022, -0.05, 0)
      ee.add(f1, f2)
      const eeDot = new THREE.Mesh(
        new THREE.SphereGeometry(0.014, 12, 10),
        new THREE.MeshBasicMaterial({ color: '#10b981' })
      )
      eeDot.position.y = -0.08
      ee.add(eeDot)

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

      // --- 關節更新 ---
      const pivots = [j1, j2, j3, j4, j5, j6, j7]
      const axes: Array<'x' | 'y' | 'z'> = ['x', 'z', 'y', 'x', 'y', 'x', 'y']
      const homeQ = [0, 0.1, 0, 0.55, 0, 0, 0]
      let estopVisual = false
      const applyEstopVisual = () => {
        for (const s of jointSpheres) s.material = estopVisual ? jointMats.estop : jointMats.normal
      }
      const updateJoints = (q: number[]) => {
        for (let i = 0; i < 7; i++) {
          const val = Number.isFinite(q?.[i]) ? q[i] : homeQ[i]
          pivots[i].rotation[axes[i]] = val
        }
      }
      updateJoints(homeQ)

      // --- 視角預設 ---
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

      // --- 渲染循環 ---
      const clock = new THREE.Clock()
      const tmpVec = new THREE.Vector3()
      const tick = () => {
        raf = requestAnimationFrame(tick)
        controls.update()
        // 軌跡取樣（~20Hz）
        const t = clock.getElapsedTime()
        if (t - lastTrailTs > 0.05 && trailCount < MAX_TRAIL) {
          lastTrailTs = t
          tmpVec.setFromMatrixPosition(eeDot.matrixWorld)
          trailPositions[trailCount * 3] = tmpVec.x
          trailPositions[trailCount * 3 + 1] = tmpVec.y
          trailPositions[trailCount * 3 + 2] = tmpVec.z
          trailCount++
          trailGeo.setDrawRange(0, trailCount)
          trailGeo.attributes.position.needsUpdate = true
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

      // --- API ---
      const linkGroups: Array<{ __solid: THREE.Mesh; __wire: THREE.Mesh }> = []
      scene.traverse((obj) => {
        const g = obj as unknown as { __solid?: THREE.Mesh; __wire?: THREE.Mesh }
        if (g.__solid && g.__wire) linkGroups.push(g as { __solid: THREE.Mesh; __wire: THREE.Mesh })
      })

      apiRef.current = {
        updateJoints: (q) => updateJoints(q),
        setView: (v) => setCameraView(v),
        toggleTrail: (on) => {
          trail.visible = on
          if (on) {
            trailCount = 0
            trailGeo.setDrawRange(0, 0)
          }
        },
        setRenderMode: (mode) => {
          for (const g of linkGroups) {
            g.__solid.visible = mode === 'solid'
            g.__wire.visible = mode === 'wireframe'
          }
        },
        setEstop: (on) => {
          estopVisual = on
          applyEstopVisual()
        },
        dispose: () => {
          cancelAnimationFrame(raf)
          ro.disconnect()
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
          mount.removeChild(renderer.domElement)
        },
      }
      setReady(true)
    })()

    return () => {
      disposed = true
      apiRef.current?.dispose()
      apiRef.current = null
      setReady(false)
    }
   
  }, [])

  // ---------- 即時關節更新（10Hz） ----------
  useEffect(() => {
    const q = state?.joints?.map((j) => j.q)
    if (q && apiRef.current) apiRef.current.updateJoints(q)
  }, [state?.joints])

  // E-stop 視覺狀態同步
  useEffect(() => {
    if (apiRef.current) apiRef.current.setEstop(!!state?.estop)
  }, [state?.estop])

  const onView = useCallback((v: ViewName) => {
    setView(v)
    apiRef.current?.setView(v)
  }, [])

  const onToggleTrail = useCallback((on: boolean) => {
    setShowTrail(on)
    apiRef.current?.toggleTrail(on)
  }, [])

  const onRenderMode = useCallback((m: 'solid' | 'wireframe') => {
    setRenderMode(m)
    // 切換場景內所有 link solid/wire
    apiRef.current?.setRenderMode?.(m)
  }, [])

  const jointRows = state?.joints ?? []

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      {/* 3D 畫布 */}
      <Card className="border-zinc-800 bg-zinc-900/60 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
            🧊 3D 即時可視化
            <span className="text-zinc-500 font-normal">URDF 運動鏈 · Three.js</span>
            {estop && (
              <Badge variant="destructive" className="text-[10px] animate-pulse">
                E-STOP
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="text-xs">
            拖拽旋轉 · 滾輪縮放 · 右鍵平移 — 綠色曲線為末端執行器軌跡
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 relative">
          <div
            ref={mountRef}
            className="w-full h-[480px] lg:h-[560px]"
            aria-label="機械臂 3D 視圖"
          />
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/70 text-xs text-zinc-500">
              正在載入 3D 引擎…
            </div>
          )}
          {/* 視角快捷鍵（懸浮） */}
          <div className="absolute top-3 right-3 flex gap-1.5">
            {(['front', 'side', 'top', 'iso'] as ViewName[]).map((v) => (
              <Button
                key={v}
                size="sm"
                variant={view === v ? 'default' : 'secondary'}
                className={cn(
                  'h-7 px-2.5 text-[11px] backdrop-blur',
                  view === v
                    ? 'bg-amber-500 text-zinc-950 hover:bg-amber-400'
                    : 'bg-zinc-900/80 text-zinc-300 hover:text-zinc-100 border border-zinc-700'
                )}
                onClick={() => onView(v)}
              >
                {v === 'front' ? '前視' : v === 'side' ? '側視' : v === 'top' ? '俯視' : '45°'}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 控制欄 */}
      <div className="space-y-4">
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-200">顯示選項</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <button
              type="button"
              onClick={() => onToggleTrail(!showTrail)}
              className={cn(
                'w-full flex items-center justify-between rounded-lg border px-3 py-2 text-xs transition-colors',
                showTrail
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
              )}
            >
              <span>末端軌跡追踪</span>
              <span className="font-mono">{showTrail ? 'ON' : 'OFF'}</span>
            </button>
            <button
              type="button"
              onClick={() => onRenderMode(renderMode === 'solid' ? 'wireframe' : 'solid')}
              className={cn(
                'w-full flex items-center justify-between rounded-lg border px-3 py-2 text-xs transition-colors',
                renderMode === 'wireframe'
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
              )}
            >
              <span>線框模式</span>
              <span className="font-mono">{renderMode === 'wireframe' ? 'ON' : 'OFF'}</span>
            </button>
            <p className="text-[10px] text-zinc-600 leading-relaxed pt-1">
              關節球（琥珀色）= 7 個主動關節；綠點 = 末端執行器 TCP。E-stop 觸發時關節球轉紅。
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-200">
              關節即時讀數 <span className="text-zinc-500 font-normal">rad</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {jointRows.length === 0
              ? Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="h-6 rounded bg-zinc-800/60 animate-pulse" />
                ))
              : jointRows.map((j, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500 font-mono">J{i + 1}</span>
                    <span className="text-zinc-200 font-mono tabular-nums">
                      {j.q >= 0 ? '+' : ''}
                      {j.q.toFixed(3)}
                    </span>
                  </div>
                ))}
            <div className="pt-1.5 mt-1 border-t border-zinc-800 flex items-center justify-between text-[11px]">
              <span className="text-zinc-500">控制模式</span>
              <span className={cn('font-mono', estop ? 'text-red-400' : 'text-emerald-400')}>
                {estop ? 'E-STOP 🔴' : (state?.controlMode ?? '—')}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
