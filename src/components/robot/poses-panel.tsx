'use client'

import { useCallback, useEffect, useState } from 'react'
import { Play, Trash2, Save, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import type { RobotContext } from '@/hooks/use-robot'

interface Pose {
  id: string
  name: string
  description: string | null
  category: string
  joints: number[]
  duration: number
  isSystem: boolean
}

const CATEGORY_COLOR: Record<string, string> = {
  home: 'border-emerald-500/40 text-emerald-400',
  safe: 'border-teal-500/40 text-teal-400',
  working: 'border-amber-500/40 text-amber-400',
  demo: 'border-fuchsia-500/40 text-fuchsia-400',
  custom: 'border-zinc-600 text-zinc-400',
}

export function PosesPanel({ robot }: { robot: RobotContext }) {
  const { state, api, sendCommand } = robot
  const { toast } = useToast()
  const [poses, setPoses] = useState<Pose[] | null>(null)
  const [name, setName] = useState('')
  const [duration, setDuration] = useState('2.0')
  const [saving, setSaving] = useState(false)
  const [executing, setExecuting] = useState<string | null>(null)

  const load = useCallback(async () => {
    // await 之後先 setState（避免 effect 內同步 setState）
    const res = await api('/api/poses')
    if (res.ok) setPoses(res.data)
  }, [api])

  useEffect(() => {
    // 異步調度初始載入（避免 effect 內同步 setState）
    const t = setTimeout(() => void load(), 0)
    return () => clearTimeout(t)
  }, [load])

  const execute = async (pose: Pose) => {
    setExecuting(pose.id)
    const res = await sendCommand('goto', pose.joints, pose.duration)
    setExecuting(null)
    toast({
      title: res.ok ? `✓ 執行姿勢: ${pose.name}` : `✗ 執行失敗`,
      description: res.message,
      variant: res.ok ? undefined : 'destructive',
    })
  }

  const remove = async (pose: Pose) => {
    const res = await api(`/api/poses/${pose.id}`, { method: 'DELETE' })
    toast({
      title: res.ok ? `已刪除 ${pose.name}` : '刪除失敗',
      description: res.ok ? undefined : res.error,
      variant: res.ok ? undefined : 'destructive',
    })
    void load()
  }

  /** 由當前位置另存新姿勢 */
  const saveCurrent = async () => {
    if (!state?.joints || state.joints.length !== 7) return
    if (!name.trim()) {
      toast({ title: '請輸入姿勢名稱', variant: 'destructive' })
      return
    }
    setSaving(true)
    const res = await api('/api/poses', {
      method: 'POST',
      body: JSON.stringify({
        name: name.trim(),
        joints: state.joints.map((j) => Math.round(j.q * 1000) / 1000),
        duration: parseFloat(duration) || 2.0,
        category: 'custom',
        description: `由 Web 介面擷取 (${new Date().toLocaleString('zh-HK', { hour12: false })})`,
      }),
    })
    setSaving(false)
    if (res.ok) {
      toast({ title: `✓ 已儲存姿勢: ${name.trim()}` })
      setName('')
      void load()
    } else {
      toast({ title: '儲存失敗', description: res.error, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      {/* 另存當前姿勢 */}
      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <Sparkles className="h-4 w-4 text-amber-400" aria-hidden />
            擷取當前姿勢
          </CardTitle>
          <CardDescription className="text-xs">
            將機械臂目前嘅關節位置儲存成可重用姿勢（可用控制頁滑條先擺位）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[180px] space-y-1">
              <label htmlFor="pose-name" className="text-xs text-zinc-400">
                姿勢名稱
              </label>
              <Input
                id="pose-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：抓取準備位"
                className="bg-zinc-950 border-zinc-700 h-9"
                maxLength={40}
              />
            </div>
            <div className="w-28 space-y-1">
              <label htmlFor="pose-dur" className="text-xs text-zinc-400">
                執行時間 (s)
              </label>
              <Input
                id="pose-dur"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                type="number"
                min={0.5}
                max={30}
                step={0.5}
                className="bg-zinc-950 border-zinc-700 h-9 font-mono"
              />
            </div>
            <Button
              onClick={saveCurrent}
              disabled={saving || !state?.joints}
              className="h-9 gap-1.5 bg-amber-500 text-zinc-950 hover:bg-amber-400 font-semibold"
            >
              <Save className="h-4 w-4" aria-hidden />
              {saving ? '儲存中…' : '另存姿勢'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 姿勢列表 */}
      {poses === null ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[168px] rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {poses.map((p) => (
            <Card key={p.id} className="border-zinc-800 bg-zinc-900/60 flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm font-semibold text-zinc-100">{p.name}</CardTitle>
                  <Badge
                    variant="outline"
                    className={cn('text-[10px] shrink-0', CATEGORY_COLOR[p.category] ?? CATEGORY_COLOR.custom)}
                  >
                    {p.category}
                  </Badge>
                </div>
                {p.description && (
                  <CardDescription className="text-[11px] leading-snug">{p.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="mt-auto space-y-2.5">
                <div className="font-mono text-[10px] text-zinc-500 bg-zinc-950/60 rounded-md px-2 py-1.5 leading-relaxed break-all">
                  {p.joints.map((j) => j.toFixed(2)).join(', ')}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => execute(p)}
                    disabled={executing === p.id || state?.estop}
                    className="flex-1 gap-1.5 bg-amber-500 text-zinc-950 hover:bg-amber-400 font-semibold h-8"
                  >
                    <Play className="h-3.5 w-3.5" aria-hidden />
                    {executing === p.id ? '執行中…' : `執行 (${p.duration}s)`}
                  </Button>
                  {!p.isSystem && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => remove(p)}
                      className="h-8 w-8 p-0 border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      aria-label={`刪除 ${p.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
