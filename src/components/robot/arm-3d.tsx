'use client'

/**
 * Arm3D — R1-7A 機械臂 3D 交互控制台（UR Pendant / RoboDK 風格）
 *
 * 三種模式：
 *   觀察     — 被動可視化（10Hz 遙測驅動）
 *   IK 拖動  — 拖拽 TCP 目標 gizmo → DLS IK 即時預覽 → 放手執行 goto
 *   關節拖動 — 拖拽關節環直接旋轉單一關節 → 放手執行 goto
 *
 * 附 UR Pendant 風格 TCP 讀數（mm / deg）+ TCP 線性點動 + 關節點動。
 * 所有移動指令仍經安全層（限位 + 去抖 + E-stop 聯鎖）。
 *
 * lint 合規模式：讀數由 render 推導（唔喺 effect 內 setState）；
 * 場景一次性初始化經 ref 存取最新回調（gotoRef / toastRef / optRef）。
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import type { RobotContext } from '@/hooks/use-robot'
import {
  forwardKinematics, tcpPose, solveIK, estimateGotoDuration, limitsFromMeta,
  SHOULDER, DEFAULT_JOINTS, norm,
  type Vec3, type Mat3, type JointLimit,
} from '@/lib/kinematics'
import {
  createArmScene,
  type Mode, type DragPlane, type IKStatus, type ViewName, type ArmSceneApi,
} from './arm-3d-scene'

const JOINT_NAMES = ['肩俯仰', '肩側擺', '肩旋轉', '肘屈伸', '前臂旋轉', '腕俯仰', '腕旋轉']
const HOME_Q = DEFAULT_JOINTS.map((j) => j.home)
const fmtMm = (v: number) => `${v >= 0 ? '+' : ''}${(v * 1000).toFixed(1)}`
const fmtDeg = (v: number) => `${v >= 0 ? '+' : ''}${((v * 180) / Math.PI).toFixed(1)}°`

export function Arm3D({ robot }: { robot: RobotContext }) {
  const { toast } = useToast()
  const { state, jointsMeta, sendCommand } = robot

  const mountRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<ArmSceneApi | null>(null)
  const [ready, setReady] = useState(false)
  const [view, setView] = useState<ViewName>('iso')
  const [showTrail, setShowTrail] = useState(true)
  const [renderMode, setRenderMode] = useState<'solid' | 'wireframe'>('solid')

  // 模式與選項
  const [mode, setMode] = useState<Mode>('observe')
  const [plane, setPlane] = useState<DragPlane>('screen')
  const [orientLock, setOrientLock] = useState(false)
  const [postureStrength, setPostureStrength] = useState(0.6)
  const [autoExec, setAutoExec] = useState(true)
  const [jogStep, setJogStep] = useState('0.025')
  const [dragging, setDragging] = useState<null | 'tcp' | number>(null)
  const [ikStatus, setIkStatus] = useState<IKStatus>('ok')
  const [pendingPreview, setPendingPreview] = useState(false)
  /** 拖拽預覽關節（render 讀數用；null = 顯示遙測） */
  const [previewQ, setPreviewQ] = useState<number[] | null>(null)

  // 參考（事件回調存取；唔喺 render 讀寫）
  const lastQRef = useRef<number[]>(HOME_Q)
  const ikQRef = useRef<number[] | null>(null)
  const orientRef = useRef<Mat3 | null>(null)
  const qStartRef = useRef<number[]>([])
  const limitsRef = useRef<JointLimit[]>(limitsFromMeta([]))
  const optRef = useRef({ orientLock: false, postureStrength: 0.6, autoExec: true })
  const lastCmdRef = useRef(0)
  const previewTsRef = useRef(0)
  const canCtlRef = useRef(true)
  const gotoRef = useRef<(q: number[], label: string) => Promise<void>>(async () => {})
  const toastRef = useRef(toast)
  const modeRef = useRef<Mode>('observe')

  const estop = !!state?.estop
  const canControl =
    !estop && state?.lifecycle === 'active' && state?.controlMode !== 'zero_torque'

  // 限位：由元數據推導（render 用）；ref 同步畀場景回調
  const limits = useMemo(
    () => limitsFromMeta(jointsMeta?.length === 7 ? jointsMeta : []),
    [jointsMeta]
  )
  useEffect(() => {
    limitsRef.current = limits
    optRef.current = { orientLock, postureStrength, autoExec }
    canCtlRef.current = canControl
    toastRef.current = toast
  })

  // ---------- GOTO 送出（去抖 + toast 回報） ----------
  const executeGoto = async (q: number[], label: string) => {
    const now = Date.now()
    if (now - lastCmdRef.current < 180) return
    lastCmdRef.current = now
    const duration = estimateGotoDuration(lastQRef.current, q, limitsRef.current)
    const ack = await sendCommand('goto', q, Number(duration.toFixed(2)))
    if (ack.ok) {
      toastRef.current({ title: `✓ ${label} → goto 執行（${duration.toFixed(1)}s）` })
    } else {
      toastRef.current({ title: 'goto 被拒', description: ack.message, variant: 'destructive' })
    }
    apiRef.current?.setPreview(null)
    ikQRef.current = null
    setPendingPreview(false)
    setPreviewQ(null)
  }
  useEffect(() => {
    gotoRef.current = executeGoto
  })

  // ---------- 場景初始化（一次性；回調全部經 ref 存取最新值） ----------
  useEffect(() => {
    let disposed = false
    void (async () => {
      if (!mountRef.current) return
      const api = await createArmScene(mountRef.current, {
        onTcpDragStart: () => {
          const q = lastQRef.current
          ikQRef.current = [...q]
          orientRef.current = forwardKinematics(q).R
          setDragging('tcp')
          setIkStatus('ok')
        },
        onTcpDragMove: (pos) => {
          if (!ikQRef.current) return
          const r = solveIK(ikQRef.current, {
            targetPos: pos,
            targetRot: optRef.current.orientLock ? orientRef.current : null,
            limits: limitsRef.current,
            kPosture: optRef.current.postureStrength,
            maxIter: 14,
            tolPos: 0.003,
          })
          ikQRef.current = r.q
          apiRef.current?.setPreview(r.q)
          setIkStatus(r.converged ? 'ok' : 'unreachable')
          // 讀數狀態節流（~20Hz）
          const now = performance.now()
          if (now - previewTsRef.current > 50) {
            previewTsRef.current = now
            setPreviewQ([...r.q])
          }
        },
        onTcpDragEnd: () => {
          setDragging(null)
          const q = ikQRef.current
          if (!q) return
          if (!canCtlRef.current) {
            apiRef.current?.setPreview(null)
            ikQRef.current = null
            setPreviewQ(null)
            toastRef.current({ title: 'E-stop / 未激活 — 拖拽結果已丟棄', variant: 'destructive' })
            return
          }
          if (optRef.current.autoExec) {
            void gotoRef.current(q, 'IK 拖動')
          } else {
            setPendingPreview(true)
            toastRef.current({ title: '已鎖定預覽姿態（未執行）', description: '按「執行 GOTO」送出指令' })
          }
        },
        onJointDragStart: (i) => {
          qStartRef.current = [...lastQRef.current]
          ikQRef.current = [...lastQRef.current]
          setDragging(i)
        },
        onJointDragMove: (i, dq) => {
          const q = [...qStartRef.current]
          const lim = limitsRef.current[i]
          q[i] = Math.min(Math.max(q[i] + dq, lim.min), lim.max)
          ikQRef.current = q
          apiRef.current?.setPreview(q)
          const now = performance.now()
          if (now - previewTsRef.current > 50) {
            previewTsRef.current = now
            setPreviewQ([...q])
          }
        },
        onJointDragEnd: (i) => {
          setDragging(null)
          const q = ikQRef.current
          if (!q) return
          const moved = Math.abs(q[i] - qStartRef.current[i]) > 0.01
          if (!canCtlRef.current || !moved) {
            apiRef.current?.setPreview(null)
            ikQRef.current = null
            setPreviewQ(null)
            return
          }
          if (optRef.current.autoExec) {
            void gotoRef.current(q, `J${i + 1} 關節拖動`)
          } else {
            setPendingPreview(true)
          }
        },
      })
      if (disposed) {
        api.dispose()
        return
      }
      apiRef.current = api
      api.applyTelemetry(lastQRef.current)
      api.setMode(modeRef.current)
      setReady(true)
    })()
    return () => {
      disposed = true
      apiRef.current?.dispose()
      apiRef.current = null
      setReady(false)
    }
  }, [])

  // ---------- 遙測 → 場景（讀數由 render 推導，唔設 state） ----------
  const telQ = state?.joints?.map((j) => j.q) ?? null
  useEffect(() => {
    if (!telQ || telQ.length !== 7) return
    lastQRef.current = telQ
    apiRef.current?.applyTelemetry(telQ)
  }, [telQ])

  useEffect(() => {
    apiRef.current?.setEstop(!!state?.estop)
  }, [state?.estop])

  useEffect(() => {
    apiRef.current?.setDragEnabled(canControl)
  }, [canControl, ready])

  // 模式切換 → 場景命令（純命令，唔設 state）
  useEffect(() => {
    modeRef.current = mode
    const api = apiRef.current
    if (!api || !ready) return
    api.setMode(mode)
    if (mode === 'ik') api.setTargetPos(forwardKinematics(lastQRef.current).tcp)
    if (mode === 'observe' && ikQRef.current) {
      api.setPreview(null)
      ikQRef.current = null
    }
  }, [mode, ready])

  useEffect(() => {
    if (ready) apiRef.current?.setPlane(plane)
  }, [plane, ready])

  // 顯示用 IK 狀態（不可控制時一律 inactive）
  const ikStatusShown: IKStatus = canControl ? ikStatus : 'inactive'
  useEffect(() => {
    if (ready) apiRef.current?.setIKStatus(ikStatusShown)
  }, [ikStatusShown, ready])

  // ---------- 推導讀數 ----------
  const dispQ = previewQ ?? telQ
  const pose = useMemo(() => (dispQ ? tcpPose(dispQ) : null), [dispQ])

  // ---------- 面板動作 ----------
  const switchMode = (m: Mode) => {
    setMode(m)
    setIkStatus('ok')
    if (m === 'observe' && ikQRef.current) {
      apiRef.current?.setPreview(null)
      ikQRef.current = null
      setPreviewQ(null)
    }
    setPendingPreview(false)
  }

  const onView = (v: ViewName) => {
    setView(v)
    apiRef.current?.setView(v)
  }
  const onToggleTrail = (on: boolean) => {
    setShowTrail(on)
    apiRef.current?.toggleTrail(on)
  }
  const onRenderMode = (m: 'solid' | 'wireframe') => {
    setRenderMode(m)
    apiRef.current?.setRenderMode(m)
  }

  const snapToTcp = () => {
    apiRef.current?.setTargetPos(forwardKinematics(lastQRef.current).tcp)
    setIkStatus('ok')
  }

  /** TCP 線性點動（UR Pendant 風格） */
  const tcpJog = async (axis: 0 | 1 | 2, sign: 1 | -1) => {
    if (!canControl) {
      toast({ title: '目前不可控制（E-stop / 未激活）', variant: 'destructive' })
      return
    }
    const step = Number(jogStep)
    const q = lastQRef.current
    const fk = forwardKinematics(q)
    const target: Vec3 = [fk.tcp[0], fk.tcp[1], fk.tcp[2]]
    target[axis] += sign * step
    const rel: Vec3 = [target[0] - SHOULDER[0], target[1] - SHOULDER[1], target[2] - SHOULDER[2]]
    if (norm(rel) > 0.81) {
      toast({ title: '超出工作空間', description: `目標距肩 ${norm(rel).toFixed(2)}m > 0.81m`, variant: 'destructive' })
      return
    }
    const r = solveIK(q, {
      targetPos: target,
      targetRot: orientLock ? fk.R : null,
      limits: limitsRef.current,
      kPosture: postureStrength,
    })
    if (!r.converged) {
      toast({ title: 'IK 無解（不可達）', variant: 'destructive' })
      return
    }
    const label = `TCP 點動 ${['X', 'Y', 'Z'][axis]}${sign > 0 ? '+' : '−'}${(step * 100).toFixed(1)}cm`
    await executeGoto(r.q, label)
  }

  /** 關節點動 ±5° */
  const jointJog = async (i: number, sign: 1 | -1) => {
    if (!canControl) {
      toast({ title: '目前不可控制（E-stop / 未激活）', variant: 'destructive' })
      return
    }
    const q = [...lastQRef.current]
    const lim = limits[i]
    const nv = Math.min(Math.max(q[i] + sign * (5 * Math.PI) / 180, lim.min), lim.max)
    if (Math.abs(nv - q[i]) < 0.001) {
      toast({ title: `J${i + 1} 已到限位`, variant: 'destructive' })
      return
    }
    q[i] = nv
    await executeGoto(q, `J${i + 1} 點動 ${sign > 0 ? '+' : '−'}5°`)
  }

  // ---------- 渲染 ----------
  const modeBtn = (m: Mode, label: string, hint: string) => (
    <button
      type="button"
      onClick={() => switchMode(m)}
      className={cn(
        'flex-1 rounded-lg border px-2 py-2 text-xs transition-colors',
        mode === m
          ? 'border-amber-500/50 bg-amber-500/15 text-amber-400'
          : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
      )}
    >
      <div className="font-semibold">{label}</div>
      <div className="text-[10px] text-zinc-500">{hint}</div>
    </button>
  )

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      {/* 3D 畫布 */}
      <Card className="border-zinc-800 bg-zinc-900/60 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
            🧊 3D 交互控制台
            <span className="text-zinc-500 font-normal">IK 拖拽 · RoboDK / UR 風格</span>
            {estop && (
              <Badge variant="destructive" className="text-[10px] animate-pulse">E-STOP</Badge>
            )}
            {dragging !== null && (
              <Badge className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/40">
                拖拽中
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="text-xs">
            {mode === 'observe' && '拖拽旋轉視角 · 滾輪縮放 · 右鍵平移 — 綠色曲線為 TCP 軌跡'}
            {mode === 'ik' && '拖拽綠色目標球移動 TCP → 即時 IK 預覽 → 放手自動執行'}
            {mode === 'joint' && '拖拽琥珀色關節環旋轉單一關節 → 放手自動執行'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 relative">
          <div ref={mountRef} className="w-full h-[480px] lg:h-[560px]" aria-label="機械臂 3D 視圖" />
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/70 text-xs text-zinc-500">
              正在載入 3D 引擎…
            </div>
          )}
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
          {/* IK 狀態指示 */}
          {mode === 'ik' && ready && (
            <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-zinc-950/80 backdrop-blur px-3 py-1.5 border border-zinc-800">
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  ikStatusShown === 'ok' && 'bg-emerald-500',
                  ikStatusShown === 'unreachable' && 'bg-red-500 animate-pulse',
                  ikStatusShown === 'inactive' && 'bg-zinc-600'
                )}
              />
              <span className="text-[11px] text-zinc-400">
                {ikStatusShown === 'ok' && '目標可達 — IK 已收斂'}
                {ikStatusShown === 'unreachable' && '目標不可達（超出工作空間 / 限位）'}
                {ikStatusShown === 'inactive' && '拖拽已禁用（E-stop / 未激活）'}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 右側控制欄 */}
      <div className="space-y-4 max-h-[860px] lg:overflow-y-auto pr-0.5 custom-scroll">
        {/* 模式 */}
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-200">交互模式</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              {modeBtn('observe', '👁 觀察', '被動可視化')}
              {modeBtn('ik', '🎯 IK 拖動', '拖 TCP 目標')}
              {modeBtn('joint', '🦴 關節拖動', '拖關節環')}
            </div>
            {!canControl && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-[11px] text-red-400">
                {estop ? 'E-stop 已觸發 — 拖拽禁用' : '控制節點未激活 — 拖拽禁用'}
              </div>
            )}
            <p className="text-[10px] text-zinc-600 leading-relaxed">
              IK 求解：DLS + 零空間姿態（7-DOF 冗餘）；所有指令經安全層驗證（限位 / 去抖 / E-stop 聯鎖）。
            </p>
          </CardContent>
        </Card>

        {/* TCP 讀數（UR 風格） */}
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-semibold text-zinc-200">
              TCP 位姿讀數
              {pose && (
                <Badge
                  className={cn(
                    'text-[10px]',
                    previewQ
                      ? 'bg-sky-500/15 text-sky-400 border-sky-500/40'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  )}
                >
                  {previewQ ? 'IK 預覽' : '即時'}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!pose ? (
              <div className="space-y-1.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-5 rounded bg-zinc-800/60 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                {(['X', 'Y', 'Z'] as const).map((ax, i) => (
                  <div key={ax} className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500 font-mono">{ax}</span>
                    <span className="text-zinc-200 font-mono tabular-nums">{fmtMm(pose.pos[i])} mm</span>
                  </div>
                ))}
                {(['RX', 'RY', 'RZ'] as const).map((ax, i) => (
                  <div key={ax} className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500 font-mono">{ax}</span>
                    <span className="text-zinc-200 font-mono tabular-nums">{fmtDeg(pose.rpy[i])}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* IK 拖動選項 */}
        {mode === 'ik' && (
          <Card className="border-zinc-800 bg-zinc-900/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-zinc-200">拖動選項</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-[11px] text-zinc-400">拖動平面</Label>
                <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                  {([
                    ['screen', '視平面'],
                    ['horizontal', '水平面'],
                    ['vertical', '鉛垂面'],
                  ] as Array<[DragPlane, string]>).map(([p, label]) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPlane(p)}
                      className={cn(
                        'rounded-lg border px-2 py-1.5 text-[11px] transition-colors',
                        plane === p
                          ? 'border-amber-500/50 bg-amber-500/15 text-amber-400'
                          : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-[10px] text-zinc-600">
                  {plane === 'screen' && '跟隨鏡頭方向自由拖動（預設，最直觀）'}
                  {plane === 'horizontal' && '鎖定高度 — 同平面水平移動（如桌面）'}
                  {plane === 'vertical' && '垂直平面 — 上下/前後移動'}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs text-zinc-300">姿態保持</Label>
                  <p className="text-[10px] text-zinc-600">拖動時鎖定 TCP 方向（6D IK）</p>
                </div>
                <Switch checked={orientLock} onCheckedChange={setOrientLock} />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-zinc-300">姿態強度</Label>
                  <span className="text-[11px] font-mono text-amber-400">{postureStrength.toFixed(1)}</span>
                </div>
                <Slider
                  value={[postureStrength]}
                  min={0}
                  max={1.5}
                  step={0.1}
                  onValueChange={(v) => setPostureStrength(v[0])}
                  className="mt-1.5"
                />
                <p className="text-[10px] text-zinc-600">零空間姿態增益 — 越高越貼近自然 home 姿態</p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs text-zinc-300">放手自動執行</Label>
                  <p className="text-[10px] text-zinc-600">關閉 = 只預覽，手動按鈕執行</p>
                </div>
                <Switch checked={autoExec} onCheckedChange={setAutoExec} />
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1 h-8 text-[11px] border-zinc-700"
                  onClick={snapToTcp}
                >
                  回到 TCP
                </Button>
                {pendingPreview && (
                  <Button
                    size="sm"
                    className="flex-1 h-8 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white"
                    onClick={() => ikQRef.current && void executeGoto(ikQRef.current, '手動執行預覽')}
                  >
                    執行 GOTO ▶
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 關節狀態（關節模式詳細 / 其他模式簡潔） */}
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-200">
              關節 {mode === 'joint' ? '拖動' : '讀數'}
              <span className="text-zinc-500 font-normal text-[11px] ml-1">rad</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {!dispQ
              ? Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="h-6 rounded bg-zinc-800/60 animate-pulse" />
                ))
              : dispQ.map((v, i) => {
                  const lim = limits[i]
                  const pct = ((v - lim.min) / (lim.max - lim.min)) * 100
                  const atLimit = v <= lim.min + 0.03 || v >= lim.max - 0.03
                  const isDragging = dragging === i
                  return (
                    <div
                      key={i}
                      className={cn(
                        'flex items-center gap-2 text-xs rounded px-1 py-0.5',
                        isDragging && 'bg-emerald-500/10'
                      )}
                    >
                      <span className="text-zinc-500 font-mono w-5">J{i + 1}</span>
                      <span className="text-zinc-600 text-[10px] w-12 truncate">{JOINT_NAMES[i]}</span>
                      <span
                        className={cn(
                          'font-mono tabular-nums w-14 text-right',
                          isDragging ? 'text-emerald-400' : 'text-zinc-200'
                        )}
                      >
                        {v >= 0 ? '+' : ''}
                        {v.toFixed(3)}
                      </span>
                      <div className="flex-1 h-1 rounded bg-zinc-800 overflow-hidden">
                        <div
                          className={cn('h-full rounded', atLimit ? 'bg-red-500' : 'bg-amber-500/70')}
                          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
          </CardContent>
        </Card>

        {/* 點動 Jog（UR Pendant 風格） */}
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-200">點動 Jog</CardTitle>
            <CardDescription className="text-[11px]">
              TCP 線性（IK 求解）+ 關節 ±5° — 每步經安全層
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-zinc-400">TCP 步距</Label>
              <Select value={jogStep} onValueChange={setJogStep}>
                <SelectTrigger className="h-7 w-24 text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.01" className="text-xs">1 cm</SelectItem>
                  <SelectItem value="0.025" className="text-xs">2.5 cm</SelectItem>
                  <SelectItem value="0.05" className="text-xs">5 cm</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                ['X', 0], ['Y', 1], ['Z', 2],
              ] as Array<[string, 0 | 1 | 2]>).map(([label, axis]) => (
                <div key={label} className="flex flex-col gap-1">
                  <button
                    type="button"
                    disabled={!canControl}
                    onClick={() => void tcpJog(axis, 1)}
                    className="h-7 rounded-md border border-zinc-700 bg-zinc-900 text-xs text-zinc-300 hover:border-emerald-500/50 hover:text-emerald-400 disabled:opacity-40"
                  >
                    {label}+
                  </button>
                  <button
                    type="button"
                    disabled={!canControl}
                    onClick={() => void tcpJog(axis, -1)}
                    className="h-7 rounded-md border border-zinc-700 bg-zinc-900 text-xs text-zinc-300 hover:border-emerald-500/50 hover:text-emerald-400 disabled:opacity-40"
                  >
                    {label}−
                  </button>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-1">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex gap-0.5">
                  <button
                    type="button"
                    disabled={!canControl}
                    onClick={() => void jointJog(i, -1)}
                    className="h-6 flex-1 rounded border border-zinc-700 bg-zinc-900 text-[10px] text-zinc-400 hover:text-amber-400 hover:border-amber-500/40 disabled:opacity-40"
                    title={`J${i + 1} ${JOINT_NAMES[i]} −5°`}
                  >
                    J{i + 1}−
                  </button>
                  <button
                    type="button"
                    disabled={!canControl}
                    onClick={() => void jointJog(i, 1)}
                    className="h-6 flex-1 rounded border border-zinc-700 bg-zinc-900 text-[10px] text-zinc-400 hover:text-amber-400 hover:border-amber-500/40 disabled:opacity-40"
                    title={`J${i + 1} ${JOINT_NAMES[i]} +5°`}
                  >
                    J{i + 1}+
                  </button>
                </div>
              ))}
              <div className="h-6 flex items-center justify-center text-[10px] text-zinc-600">±5°</div>
            </div>
          </CardContent>
        </Card>

        {/* 顯示選項 */}
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
              <span>TCP 軌跡追踪</span>
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
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-zinc-800">
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
