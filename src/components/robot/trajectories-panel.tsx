'use client'

/**
 * TrajectoriesPanel — 軌跡錄製回放
 *
 * 錄製：訂閱 /joint_states（10Hz）收集關節路徑點 → 儲存到軌跡庫
 * 回放：逐點 goto（cosine 插補）+ 即時進度輪詢 + 可隨時取消
 *
 * 對應 ROS2 嘅 joint trajectory recorder / playback action 概念
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Circle, CircleStop, Play, Square, Trash2, Save, History, Gauge,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import type { RobotContext } from '@/hooks/use-robot'

interface TrajItem {
  id: string
  name: string
  description: string | null
  duration: number
  pointCount: number
  createdAt: string
}

interface PlaybackInfo {
  running: boolean
  status: 'idle' | 'running' | 'completed' | 'aborted' | 'failed'
  message: string
  trajectoryId?: string
  trajectoryName?: string
  point?: number
  total?: number
  cycle?: number
  totalCycles?: number
  infinite?: boolean
  speed?: number
  progress?: number
}

const MAX_RECORD_SECONDS = 60
const MAX_RECORD_POINTS = 600

export function TrajectoriesPanel({ robot }: { robot: RobotContext }) {
  const { toast } = useToast()
  const { state, sendCommand } = robot

  const [trajs, setTrajs] = useState<TrajItem[]>([])
  const [loading, setLoading] = useState(true)

  // 錄製狀態
  const [recording, setRecording] = useState(false)
  const [recSecs, setRecSecs] = useState(0)
  const [recPoints, setRecPoints] = useState(0)
  const recBufRef = useRef<Array<{ joints: number[]; ts: number }>>([])
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 儲存對話框
  const [saveOpen, setSaveOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveDesc, setSaveDesc] = useState('')
  const [saving, setSaving] = useState(false)

  // 回放狀態
  const [playback, setPlayback] = useState<PlaybackInfo | null>(null)
  const [speed, setSpeed] = useState('1')
  const [loop, setLoop] = useState('1') // 1 | 2 | 5 | 10 | 0（無限）
  const [deleteTarget, setDeleteTarget] = useState<TrajItem | null>(null)

  const wasRunningRef = useRef(false)
  const notifiedDoneRef = useRef(false)

  // ---------- 載入軌跡庫 ----------
  const loadTrajs = useCallback(async () => {
    try {
      const res = await fetch('/api/trajectories')
      const body = await res.json()
      if (body.ok) setTrajs(body.data)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTrajs()
  }, [loadTrajs])

  // ---------- 錄製：收集關節點（10Hz） ----------
  useEffect(() => {
    if (!recording) return
    const q = state?.joints?.map((j) => j.q)
    if (!q || q.length !== 7) return
    const buf = recBufRef.current
    buf.push({ joints: q, ts: Date.now() })
    setRecPoints(buf.length)
    if (buf.length >= MAX_RECORD_POINTS) stopRecording()
     
  }, [state?.joints, recording])

  // 錄製計時器
  const startRecording = () => {
    if (playback?.running) {
      toast({ title: '回放進行中，請先取消回放', variant: 'destructive' })
      return
    }
    if (state?.estop) {
      toast({ title: 'E-stop 已觸發，請先清除', variant: 'destructive' })
      return
    }
    recBufRef.current = []
    setRecPoints(0)
    setRecSecs(0)
    setRecording(true)
    toast({
      title: '⏺ 開始錄製',
      description: '而家去 Control 頁操控機械臂 — 所有關節移動將被記錄（上限 60 秒）',
    })
    recTimerRef.current = setInterval(() => {
      setRecSecs((s) => {
        if (s + 1 >= MAX_RECORD_SECONDS) {
          stopRecording()
          return MAX_RECORD_SECONDS
        }
        return s + 1
      })
    }, 1000)
  }

  const stopRecording = () => {
    if (recTimerRef.current) {
      clearInterval(recTimerRef.current)
      recTimerRef.current = null
    }
    setRecording(false)
    if (recBufRef.current.length >= 2) {
      setSaveOpen(true)
    } else if (recBufRef.current.length > 0) {
      toast({ title: '錄製太短（少於 2 點），已丟棄' })
    }
  }

  // ---------- 儲存軌跡 ----------
  const saveTrajectory = async () => {
    const buf = recBufRef.current
    if (!saveName.trim() || buf.length < 2) return
    setSaving(true)
    try {
      // 生成路徑點：dt = 相鄰實際時間差（秒）
      const points = buf.map((p, i) => ({
        joints: p.joints,
        dt:
          i < buf.length - 1
            ? Math.max((buf[i + 1].ts - p.ts) / 1000, 0.05)
            : Math.max((Date.now() - p.ts) / 1000, 0.2),
      }))
      const res = await fetch('/api/trajectories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: saveName.trim(),
          description: saveDesc.trim() || null,
          points,
        }),
      })
      const body = await res.json()
      if (body.ok) {
        toast({
          title: '✅ 軌跡已保存',
          description: `${body.data.name} — ${body.data.pointCount} 點 / ${body.data.duration.toFixed(1)} 秒`,
        })
        setSaveOpen(false)
        setSaveName('')
        setSaveDesc('')
        await loadTrajs()
      } else {
        toast({ title: '保存失敗', description: body.error, variant: 'destructive' })
      }
    } finally {
      setSaving(false)
    }
  }

  // ---------- 回放 ----------
  const executeTraj = async (t: TrajItem) => {
    if (recording) {
      toast({ title: '錄製中，請先停止錄製', variant: 'destructive' })
      return
    }
    if (state?.estop) {
      toast({ title: 'E-stop 已觸發，請先清除', variant: 'destructive' })
      return
    }
    const res = await fetch(`/api/trajectories/${t.id}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speed: parseFloat(speed), loop: parseInt(loop, 10) }),
    })
    const body = await res.json()
    if (body.ok) {
      notifiedDoneRef.current = false
      setPlayback({
        running: true,
        status: 'running',
        message: '',
        trajectoryName: t.name,
        point: 0,
        total: body.data.pointCount,
        cycle: 1,
        totalCycles: parseInt(loop, 10),
        infinite: parseInt(loop, 10) === 0,
        speed: parseFloat(speed),
        progress: 0,
      })
      const loopText =
        loop === '0' ? '∞ 無限循環' : loop === '1' ? '單次' : `循環 ${loop} 次`
      toast({
        title: `▶ 開始回放: ${t.name}`,
        description: `${body.data.pointCount} 點 @ ${speed}x · ${loopText}`,
      })
    } else {
      toast({ title: '回放失敗', description: body.error, variant: 'destructive' })
    }
  }

  const cancelPlayback = async () => {
    const res = await fetch('/api/trajectories/playback/cancel', { method: 'POST' })
    const body = await res.json()
    if (body.ok) {
      toast({ title: '⏹ 已請求取消', description: '機械臂即將停止' })
    } else {
      toast({ title: '取消失敗', description: body.error, variant: 'destructive' })
    }
  }

  // 回放進度輪詢（running 時 500ms）
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/api/trajectories/playback')
        const body = await res.json()
        if (body.ok) {
          const pb = body.data as PlaybackInfo
          setPlayback((prev) => {
            // 完成通知（一次）
            if (wasRunningRef.current && !pb.running && !notifiedDoneRef.current) {
              notifiedDoneRef.current = true
              if (pb.status === 'completed') {
                toast({ title: '✅ 回放完成', description: pb.trajectoryName })
              } else if (pb.status !== 'idle') {
                toast({
                  title: pb.status === 'aborted' ? '⏹ 回放已中止' : '❌ 回放失敗',
                  description: pb.message,
                  variant: pb.status === 'aborted' ? undefined : 'destructive',
                })
              }
            }
            wasRunningRef.current = pb.running
            return pb.running || pb.status !== 'idle' ? pb : prev
          })
        }
      } catch {
        /* ignore */
      }
    }
    void poll() // 初始（頁面載入時可能有進行中回放）
    const t = setInterval(() => void poll(), 600)
    return () => clearInterval(t)
  }, [toast])

  const deleteTraj = async () => {
    if (!deleteTarget) return
    const res = await fetch(`/api/trajectories/${deleteTarget.id}`, { method: 'DELETE' })
    const body = await res.json()
    if (body.ok) {
      setTrajs((prev) => prev.filter((x) => x.id !== deleteTarget.id))
      toast({ title: `已刪除 ${deleteTarget.name}` })
    }
    setDeleteTarget(null)
  }

  const playing = playback?.running === true
  const pbPct = playback?.progress != null ? Math.round(playback.progress * 100) : 0
  const cycleText = playback?.infinite
    ? `第 ${playback?.cycle ?? 1} 輪`
    : playback?.totalCycles && playback.totalCycles > 1
      ? `第 ${playback?.cycle ?? 1}/${playback.totalCycles} 輪`
      : null

  return (
    <div className="space-y-4">
      {/* 錄製 + 回放狀態 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className={cn('border-zinc-800 bg-zinc-900/60', recording && 'border-red-500/50')}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
              <Circle className={cn('h-4 w-4', recording ? 'text-red-500 fill-red-500 animate-pulse' : 'text-zinc-500')} aria-hidden />
              軌跡錄製
            </CardTitle>
            <CardDescription className="text-xs">
              錄製期間嘅所有關節移動（10Hz 採樣）— 去 Control 頁操控即時記錄
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">
                <div className="text-[10px] text-zinc-500">時長</div>
                <div className="font-mono text-lg text-zinc-100 tabular-nums">
                  {recSecs.toFixed(0)}<span className="text-xs text-zinc-500">s / {MAX_RECORD_SECONDS}s</span>
                </div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">
                <div className="text-[10px] text-zinc-500">路徑點</div>
                <div className="font-mono text-lg text-zinc-100 tabular-nums">
                  {recPoints}<span className="text-xs text-zinc-500"> / {MAX_RECORD_POINTS}</span>
                </div>
              </div>
            </div>
            {recording ? (
              <Button
                className="w-full bg-red-600 hover:bg-red-500 text-white"
                onClick={stopRecording}
              >
                <CircleStop className="h-4 w-4" aria-hidden />
                停止錄製並保存
              </Button>
            ) : (
              <Button
                className="w-full bg-amber-500 text-zinc-950 hover:bg-amber-400"
                onClick={startRecording}
                disabled={playing}
              >
                <Circle className="h-4 w-4 fill-current" aria-hidden />
                開始錄製
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className={cn('border-zinc-800 bg-zinc-900/60', playing && 'border-amber-500/50')}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
              <Gauge className="h-4 w-4 text-amber-400" aria-hidden />
              回放狀態
            </CardTitle>
            <CardDescription className="text-xs">
              逐點 goto + cosine 插補 — E-stop 觸發時自動中止
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">
                {playback?.trajectoryName ? (
                  <span className="text-zinc-200 font-medium">{playback.trajectoryName}</span>
                ) : (
                  '待機'
                )}
              </span>
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px]',
                  playing
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-400 animate-pulse'
                    : playback?.status === 'completed'
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                      : playback?.status === 'aborted' || playback?.status === 'failed'
                        ? 'border-red-500/40 bg-red-500/10 text-red-400'
                        : 'border-zinc-700 text-zinc-500'
                )}
              >
                {playing
                  ? `${cycleText ? `${cycleText} · ` : ''}${playback?.point ?? 0}/${playback?.total ?? 0} 點`
                  : (playback?.status ?? 'idle')}
              </Badge>
            </div>
            <Progress value={pbPct} className="h-2 bg-zinc-800" />
            {playing && cycleText && (
              <div className="flex items-center justify-between text-[11px] text-zinc-500">
                <span>
                  {playback?.infinite
                    ? '無限循環模式 — 撳「取消」或 E-stop 可隨時停止'
                    : `循環回放：${cycleText}`}
                </span>
                {playback?.infinite && (
                  <span className="font-mono text-amber-400">∞ LOOP</span>
                )}
              </div>
            )}
            {playback?.message && playing === false && (
              <p className="text-[11px] text-zinc-500">{playback.message}</p>
            )}
            {playing && (
              <Button
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                onClick={() => void cancelPlayback()}
              >
                <Square className="h-3.5 w-3.5" aria-hidden />
                取消回放（立即停止）
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 軌跡庫 */}
      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <History className="h-4 w-4 text-amber-400" aria-hidden />
            軌跡庫
            <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-400">
              {trajs.length} 條
            </Badge>
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-xs text-zinc-500">回放速度</span>
            <Select value={speed} onValueChange={setSpeed}>
              <SelectTrigger className="h-7 w-[90px] text-xs border-zinc-700 bg-zinc-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="0.5">0.5x 慢速</SelectItem>
                <SelectItem value="1">1x 原速</SelectItem>
                <SelectItem value="2">2x 快速</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-zinc-500 ml-1">循環次數</span>
            <Select value={loop} onValueChange={setLoop} disabled={playing}>
              <SelectTrigger className="h-7 w-[100px] text-xs border-zinc-700 bg-zinc-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="1">單次</SelectItem>
                <SelectItem value="2">2 次</SelectItem>
                <SelectItem value="5">5 次</SelectItem>
                <SelectItem value="10">10 次</SelectItem>
                <SelectItem value="0">∞ 無限</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : trajs.length === 0 ? (
            <div className="text-center py-8 text-xs text-zinc-600">
              軌跡庫係空嘅 — 撳「開始錄製」，去 Control 頁做一輪動作，然後停止錄製保存
            </div>
          ) : (
            <div className="space-y-2">
              {trajs.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-200 truncate">{t.name}</span>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-zinc-700 text-zinc-400">
                        {t.pointCount} 點 · {t.duration.toFixed(1)}s
                      </Badge>
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-0.5 truncate">
                      {t.description || new Date(t.createdAt).toLocaleString('zh-HK', { hour12: false })}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      className="h-8 bg-amber-500 text-zinc-950 hover:bg-amber-400"
                      disabled={playing || recording}
                      onClick={() => void executeTraj(t)}
                    >
                      <Play className="h-3.5 w-3.5" aria-hidden />
                      {loop === '0' ? '循環 ∞' : loop === '1' ? '回放' : `回放 ×${loop}`}
                    </Button>
                    <Button
                      size="sm" variant="ghost"
                      className="h-8 w-8 p-0 text-zinc-500 hover:text-red-400"
                      onClick={() => setDeleteTarget(t)}
                      title="刪除"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-zinc-600 mt-3 leading-relaxed">
            💡 回放以逐點 goto 執行（每點 cosine 插補），經安全層驗證限位；循環模式下每輪之間檢查 E-stop。
            如中途觸發 E-stop、指令被拒或撳取消，回放立即中止（包括無限循環）。
          </p>
        </CardContent>
      </Card>

      {/* 儲存對話框 */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-100 flex items-center gap-2">
              <Save className="h-4 w-4 text-amber-400" aria-hidden />
              保存錄製軌跡
            </DialogTitle>
            <DialogDescription className="text-xs">
              已錄製 {recPoints} 點（{recSecs.toFixed(0)} 秒）
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="traj-name" className="text-xs text-zinc-400">名稱</Label>
              <Input
                id="traj-name"
                placeholder="例如：pick-and-place、wave-hello"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                className="bg-zinc-950 border-zinc-700 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="traj-desc" className="text-xs text-zinc-400">描述（可選）</Label>
              <Input
                id="traj-desc"
                placeholder="呢條軌跡嘅用途…"
                value={saveDesc}
                onChange={(e) => setSaveDesc(e.target.value)}
                className="bg-zinc-950 border-zinc-700 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="text-zinc-400" onClick={() => setSaveOpen(false)}>
              丟棄
            </Button>
            <Button
              className="bg-amber-500 text-zinc-950 hover:bg-amber-400"
              disabled={saving || !saveName.trim()}
              onClick={() => void saveTrajectory()}
            >
              {saving ? '保存中…' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 刪除確認 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-100">刪除軌跡？</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              將永久刪除 <span className="text-zinc-200 font-medium">{deleteTarget?.name}</span>
              （{deleteTarget?.pointCount} 點 / {deleteTarget?.duration?.toFixed(1)}s）。此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-zinc-300">取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-500"
              onClick={() => void deleteTraj()}
            >
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
