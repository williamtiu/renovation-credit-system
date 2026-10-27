'use client'

import { useCallback, useEffect, useState } from 'react'
import { ScrollText, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { RobotContext } from '@/hooks/use-robot'

interface LogEntry {
  id: string
  source: string
  command: string
  params: string
  status: string
  message: string | null
  latencyMs: number | null
  createdAt: string
  apiUser?: { name: string } | null
}

const STATUS_STYLE: Record<string, string> = {
  ok: 'border-emerald-500/40 text-emerald-400',
  rejected: 'border-red-500/40 text-red-400',
  error: 'border-red-500/40 text-red-400',
}

const SOURCE_ICON: Record<string, string> = {
  web: '🖥️',
  api: '🔌',
  system: '⚙️',
}

export function LogsPanel({ robot }: { robot: RobotContext }) {
  const { api } = robot
  const [logs, setLogs] = useState<LogEntry[] | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    // 注意：await 之後先 setState（避免 effect 內同步 setState）
    const res = await api('/api/robot/logs?limit=100')
    if (res.ok) {
      setLogs(res.data)
      setTotal(res.total)
    }
    setLoading(false)
  }, [api])

  useEffect(() => {
    // 初始載入用 setTimeout 異步調度（避免 effect 內同步 setState）
    const initial = setTimeout(() => void load(), 0)
    const t = setInterval(() => void load(), 5000)
    return () => {
      clearTimeout(initial)
      clearInterval(t)
    }
  }, [load])

  return (
    <Card className="border-zinc-800 bg-zinc-900/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
              <ScrollText className="h-4 w-4 text-amber-400" aria-hidden />
              指令日誌（Audit Trail）
            </CardTitle>
            <CardDescription className="text-xs">
              所有經 REST API / Web 介面發出嘅指令審計記錄（共 {total} 條，每 5 秒自動刷新）
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void load()}
            className="gap-1.5 h-8 border-zinc-700"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} aria-hidden />
            刷新
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {logs === null ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-md" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <p className="py-10 text-center text-sm text-zinc-500">
            暫無指令記錄 — 去控制頁發送第一個指令
          </p>
        ) : (
          <div className="max-h-[560px] overflow-y-auto rounded-lg border border-zinc-800 custom-scroll">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-zinc-950/95 backdrop-blur z-10">
                <tr className="border-b border-zinc-800 text-left text-zinc-500">
                  <th className="px-3 py-2 font-medium">時間</th>
                  <th className="px-3 py-2 font-medium">來源</th>
                  <th className="px-3 py-2 font-medium">指令</th>
                  <th className="px-3 py-2 font-medium hidden md:table-cell">參數</th>
                  <th className="px-3 py-2 font-medium">狀態</th>
                  <th className="px-3 py-2 font-medium hidden sm:table-cell">延遲</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => {
                  let paramsShort = ''
                  try {
                    const p = JSON.parse(l.params)
                    if (p.joints) {
                      paramsShort = `[${(p.joints as number[]).map((j) => j.toFixed(2)).join(', ')}]`
                      if (p.duration) paramsShort += ` ${p.duration}s`
                    } else if (p.pose) {
                      paramsShort = p.pose as string
                    } else if (p.mode) {
                      paramsShort = `${p.mode} ${p.port ?? ''}`
                    }
                  } catch {
                    paramsShort = l.params
                  }
                  return (
                    <tr
                      key={l.id}
                      className="border-b border-zinc-800/60 hover:bg-zinc-800/30 transition-colors"
                    >
                      <td className="px-3 py-2 font-mono text-zinc-400 whitespace-nowrap">
                        {new Date(l.createdAt).toLocaleTimeString('zh-HK', { hour12: false })}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="mr-1">{SOURCE_ICON[l.source] ?? '📡'}</span>
                        <span className="text-zinc-300">{l.source}</span>
                        {l.apiUser?.name && (
                          <span className="text-zinc-500 text-[10px] ml-1">({l.apiUser.name})</span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-amber-400/90 whitespace-nowrap">
                        {l.command}
                      </td>
                      <td className="px-3 py-2 font-mono text-zinc-500 hidden md:table-cell max-w-[280px] truncate">
                        {paramsShort}
                      </td>
                      <td className="px-3 py-2">
                        <Badge
                          variant="outline"
                          className={cn('text-[10px]', STATUS_STYLE[l.status] ?? 'border-zinc-600 text-zinc-400')}
                        >
                          {l.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 font-mono text-zinc-400 hidden sm:table-cell">
                        {l.latencyMs != null ? `${l.latencyMs.toFixed(1)}ms` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
