'use client'

import { Gauge, Zap, Thermometer } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import type { JointState, JointMeta } from '@/hooks/use-robot'

interface JointCardProps {
  meta: JointMeta
  state?: JointState
  /** 滑條拖動中嘅預覽值（控制模式） */
  previewValue?: number
  onPreview?: (v: number) => void
  /** 控制模式（顯示滑條）還是監控模式（只顯示數據） */
  interactive?: boolean
  disabled?: boolean
}

export function JointCard({
  meta,
  state,
  previewValue,
  onPreview,
  interactive = false,
  disabled = false,
}: JointCardProps) {
  const q = state?.q ?? meta.home
  const dq = state?.dq ?? 0
  const tau = state?.tau ?? 0
  const temp = state?.temp ?? 0
  const sliderVal = previewValue ?? q

  // 溫度警告
  const tempWarn = temp > 55
  const tempDanger = temp > 70

  return (
    <div
      className={cn(
        'rounded-xl border bg-zinc-900/60 p-4 transition-colors',
        tempDanger
          ? 'border-red-500/50'
          : tempWarn
            ? 'border-amber-500/50'
            : 'border-zinc-800'
      )}
      aria-label={`關節 J${meta.id} ${meta.label}`}
    >
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="font-mono text-sm font-bold text-amber-400 shrink-0">J{meta.id}</span>
          <span className="text-xs text-zinc-400 truncate">{meta.label}</span>
        </div>
        <span className="font-mono text-sm font-semibold text-zinc-100 shrink-0">
          {q.toFixed(3)}<span className="text-[10px] text-zinc-500 ml-0.5">rad</span>
        </span>
      </div>

      {interactive ? (
        <div className={cn('mt-2', disabled && 'opacity-40 pointer-events-none')}>
          <Slider
            value={[sliderVal]}
            min={meta.min}
            max={meta.max}
            step={0.01}
            onValueChange={(v) => onPreview?.(v[0])}
            aria-label={`J${meta.id} 目標位置`}
          />
          <div className="flex justify-between font-mono text-[10px] text-zinc-600 mt-1">
            <span>{meta.min}</span>
            <span className="text-amber-400/90">目標 {sliderVal.toFixed(2)}</span>
            <span>{meta.max}</span>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-2 mt-3 text-center">
        <div className="rounded-md bg-zinc-800/60 px-1.5 py-1.5">
          <div className="flex items-center justify-center gap-1 text-[10px] text-zinc-500">
            <Gauge className="h-3 w-3" aria-hidden />速度
          </div>
          <div className="font-mono text-xs text-zinc-200 tabular-nums">{dq.toFixed(3)}</div>
        </div>
        <div className="rounded-md bg-zinc-800/60 px-1.5 py-1.5">
          <div className="flex items-center justify-center gap-1 text-[10px] text-zinc-500">
            <Zap className="h-3 w-3" aria-hidden />力矩
          </div>
          <div className="font-mono text-xs text-zinc-200 tabular-nums">{tau.toFixed(2)}</div>
        </div>
        <div
          className={cn(
            'rounded-md px-1.5 py-1.5',
            tempDanger ? 'bg-red-500/15' : tempWarn ? 'bg-amber-500/15' : 'bg-zinc-800/60'
          )}
        >
          <div className="flex items-center justify-center gap-1 text-[10px] text-zinc-500">
            <Thermometer className="h-3 w-3" aria-hidden />溫度
          </div>
          <div
            className={cn(
              'font-mono text-xs tabular-nums',
              tempDanger ? 'text-red-400' : tempWarn ? 'text-amber-400' : 'text-zinc-200'
            )}
          >
            {temp.toFixed(1)}°
          </div>
        </div>
      </div>
    </div>
  )
}
