'use client'

import { useEffect, useState } from 'react'
import { Activity, Layers, Clock, Terminal, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { JointCard } from './joint-card'
import { TelemetryChart } from './telemetry-chart'
import type { RobotContext } from '@/hooks/use-robot'

interface EventItem {
  ts: number
  level: string
  message: string
}

const LEVEL_STYLE: Record<string, string> = {
  info: 'text-zinc-400',
  warn: 'text-amber-400',
  error: 'text-red-400',
}

export function Dashboard({ robot }: { robot: RobotContext }) {
  const { state, jointsMeta, events, telemetryHistory } = robot
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const uptime = state?.uptime ?? 0
  const uptimeStr = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`

  return (
    <div className="space-y-4">
      {/* 架構 + 系統狀態列 */}
      <div className="grid gap-4 lg:grid-cols-4 md:grid-cols-2">
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
              <Layers className="h-4 w-4 text-amber-400" aria-hidden />
              系統架構
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-xs">
            {[
              { name: 'Web UI', detail: 'Next.js :3000', live: true },
              { name: 'WS Gateway', detail: 'socket.io :3003', live: robot.wsStatus === 'live' },
              { name: 'Control Service', detail: 'HAL+Safety :3002', live: !!state?.connected },
              {
                name: 'Hardware',
                detail:
                  state?.driverMode === 'simulation'
                    ? '模擬引擎 200Hz'
                    : state?.driverMode === 'bridge'
                      ? 'C++ Bridge → SDK'
                      : 'IM6014 串口',
                live: !!state?.connected && state.lifecycle === 'active',
              },
            ].map((l, i, arr) => (
              <div key={l.name} className="flex items-center gap-2">
                <span
                  className={cn(
                    'inline-block h-2 w-2 rounded-full shrink-0',
                    l.live ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'
                  )}
                  aria-hidden
                />
                <div className="flex items-baseline gap-1.5 min-w-0">
                  <span className="text-zinc-200 font-medium">{l.name}</span>
                  <span className="text-zinc-500 font-mono text-[10px] truncate">{l.detail}</span>
                </div>
                {i < arr.length - 1 && <ArrowRight className="h-3 w-3 text-zinc-700 ml-auto" aria-hidden />}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
              <Activity className="h-4 w-4 text-amber-400" aria-hidden />
              遙測
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1.5">
            <Row k="Topic /joint_states" v={`${state?.telemetryHz ?? 0} Hz`} />
            <Row k="接口" v={robot.wsStatus === 'live' ? 'WebSocket' : 'REST 輪詢'} />
            <Row k="關節數" v="7 (URDF frame)" />
            <Row k="歷史窗口" v="12 秒 (120 點)" />
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
              <Clock className="h-4 w-4 text-amber-400" aria-hidden />
              運行時間
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1.5">
            <Row k="服務運行" v={uptimeStr} mono />
            <Row k="串口" v={`${state?.serial.port ?? '/dev/ttyUSB0'} @ ${(state?.serial.baudrate ?? 6000000).toLocaleString()}`} mono />
            <Row k="錯誤碼" v={state?.errorCode ? String(state.errorCode) : '0 (正常)'} />
            <Row
              k="E-STOP"
              v={state?.estop ? '已觸發' : '待命'}
              warn={state?.estop}
            />
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
              <Terminal className="h-4 w-4 text-amber-400" aria-hidden />
              即時事件
            </CardTitle>
            <CardDescription className="text-[10px] text-zinc-500">
              控制器日誌流（/events topic）
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[104px] pr-2">
              {events.length === 0 ? (
                <p className="text-[11px] text-zinc-600">暫無事件，等待指令…</p>
              ) : (
                <ul className="space-y-1" aria-live="polite">
                  {events.slice(0, 8).map((e: EventItem, i) => (
                    <li key={`${e.ts}-${i}`} className="text-[11px] leading-tight">
                      <span className="text-zinc-600 font-mono">
                        {new Date(e.ts).toLocaleTimeString('zh-HK', { hour12: false })}
                      </span>{' '}
                      <span className={LEVEL_STYLE[e.level] ?? 'text-zinc-400'}>{e.message}</span>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* 即時關節狀態 */}
      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-zinc-200">
            關節即時狀態 <span className="text-zinc-500 font-normal">/joint_states</span>
          </CardTitle>
          <CardDescription className="text-xs">
            位置 q (rad) · 速度 dq (rad/s) · 力矩 τ (N·m) · 溫度 (°C) — URDF frame
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jointsMeta.length === 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-[120px] rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              {jointsMeta.map((m) => (
                <JointCard key={m.id} meta={m} state={state?.joints[m.id - 1]} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 關節位置趨勢圖 */}
      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-zinc-200">
            關節位置趨勢 <span className="text-zinc-500 font-normal">(rad)</span>
          </CardTitle>
          <CardDescription className="text-xs flex flex-wrap gap-1.5 items-center">
            {[1, 2, 3, 4, 5, 6, 7].map((j) => (
              <Badge
                key={j}
                variant="outline"
                className="text-[9px] font-mono px-1.5 py-0 border-zinc-700 text-zinc-300"
                style={{ color: undefined }}
              >
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full mr-1"
                  style={{ backgroundColor: ['#f59e0b', '#10b981', '#f43f5e', '#a78bfa', '#14b8a6', '#eab308', '#fb923c'][j - 1] }}
                  aria-hidden
                />
                J{j}
              </Badge>
            ))}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {telemetryHistory.length < 2 ? (
            <div className="h-[220px] flex items-center justify-center text-xs text-zinc-600">
              正在收集遙測數據…
            </div>
          ) : (
            <TelemetryChart history={telemetryHistory} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Row({ k, v, mono, warn }: { k: string; v: string; mono?: boolean; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-zinc-500">{k}</span>
      <span className={cn('truncate', mono && 'font-mono', warn ? 'text-red-400 font-semibold' : 'text-zinc-200')}>
        {v}
      </span>
    </div>
  )
}
