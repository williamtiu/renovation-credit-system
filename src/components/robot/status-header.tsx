'use client'

import { Cpu, Wifi, WifiOff, RefreshCw, OctagonAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { RobotState, WsStatus } from '@/hooks/use-robot'

interface StatusHeaderProps {
  state: RobotState | null
  wsStatus: WsStatus
  onEstop: () => void
}

const LIFECYCLE_STYLE: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
  inactive: 'bg-amber-500/15 text-amber-400 border-amber-500/40',
  unconfigured: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/40',
}

const MODE_LABEL: Record<string, string> = {
  foc: 'FOC 力矩保持',
  home: 'Home 歸零中',
  goto: 'Goto 移動中',
  zero_torque: '零力矩 (鬆弛)',
  stopped: '已停止',
}

export function StatusHeader({ state, wsStatus, onEstop }: StatusHeaderProps) {
  const estopActive = state?.estop ?? false
  const lifecycle = state?.lifecycle ?? 'unconfigured'

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Logo + 標題 */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 border border-amber-500/40">
              <Cpu className="h-5 w-5 text-amber-400" aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold tracking-tight text-zinc-100 truncate">
                R1-7A 機械臂控制平台
              </h1>
              <p className="text-[11px] text-zinc-500 font-mono truncate">
                Unitree R1 · 7-DOF · ROS2-inspired · Linux
              </p>
            </div>
          </div>

          {/* 狀態徽章 */}
          <div className="flex flex-wrap items-center gap-2 ml-auto" aria-live="polite">
            <Badge
              variant="outline"
              className={cn('font-mono text-[11px]', LIFECYCLE_STYLE[lifecycle] ?? '')}
            >
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-current" />
              lifecycle: {lifecycle}
            </Badge>

            <Badge variant="outline" className="font-mono text-[11px] border-zinc-700 text-zinc-300">
              {state?.driverMode === 'simulation' && '🧪 模擬模式'}
              {state?.driverMode === 'serial' && '🔌 串口直連'}
              {state?.driverMode === 'bridge' && '🛠️ C++ Bridge'}
              {!state && '⏳ 連線中…'}
            </Badge>

            <Badge
              variant="outline"
              className={cn(
                'font-mono text-[11px] gap-1',
                wsStatus === 'live'
                  ? 'border-emerald-500/40 text-emerald-400'
                  : 'border-amber-500/40 text-amber-400'
              )}
            >
              {wsStatus === 'live' ? (
                <>
                  <Wifi className="h-3 w-3" /> WS 即時
                </>
              ) : wsStatus === 'polling' ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin" /> REST 輪詢
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" /> 連線中
                </>
              )}
            </Badge>

            {state?.controlMode && !estopActive && (
              <Badge variant="outline" className="font-mono text-[11px] border-zinc-700 text-zinc-300">
                {MODE_LABEL[state.controlMode] ?? state.controlMode}
                {state.moving && ` · ${(state.moveRemaining ?? 0).toFixed(1)}s`}
              </Badge>
            )}

            {/* E-STOP — 永遠最高優先級 */}
            <Button
              variant={estopActive ? 'destructive' : 'outline'}
              size="sm"
              onClick={onEstop}
              aria-label="緊急停止"
              className={cn(
                'font-bold gap-1.5 h-9 min-w-[112px]',
                !estopActive &&
                  'border-red-500/60 text-red-400 hover:bg-red-500/10 hover:text-red-300'
              )}
            >
              <OctagonAlert className="h-4 w-4" aria-hidden />
              {estopActive ? 'E-STOP 已觸發' : '緊急停止'}
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
