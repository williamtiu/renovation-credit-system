'use client'

import { useCallback, useState } from 'react'
import {
  Play, Home, Hand, Square, PowerOff, RotateCcw, Undo2, Rocket, Workflow,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { JointCard } from './joint-card'
import type { RobotContext } from '@/hooks/use-robot'

/**
 * Control Panel — 手動控制介面
 * 
 * 操作流程：
 *   1. 拖動滑條設定各關節目標（實時預覽，唔會即時發送）
 *   2. 調整執行時間
 *   3. 按「執行 Goto」一次過發送 goto 指令（cosine 軌跡）
 * 
 * 安全設計：目標值受關節限制夾限；E-stop 狀態下禁止執行
 */
export function ControlPanel({ robot }: { robot: RobotContext }) {
  const { state, jointsMeta, sendCommand } = robot
  const { toast } = useToast()

  // 滑條目標值：未修改時跟隨即時位置；用戶拖動後鎖定為 override
  const [override, setOverride] = useState<number[] | null>(null)
  const [duration, setDuration] = useState(2.0)

  const liveTargets =
    state?.joints?.length === 7 ? state.joints.map((j) => j.q) : null
  const targets = override ?? liveTargets

  const exec = useCallback(
    async (label: string, fn: () => Promise<{ ok: boolean; message: string }>) => {
      const res = await fn()
      toast({
        title: res.ok ? `✓ ${label}` : `✗ ${label}`,
        description: res.message,
        variant: res.ok ? undefined : 'destructive',
      })
    },
    [toast]
  )

  const estopActive = state?.estop ?? false
  const disabled = !state || state.lifecycle !== 'active' || estopActive
  const dirty =
    targets != null &&
    state?.joints != null &&
    override != null &&
    targets.some((t, i) => Math.abs(t - (state.joints[i]?.q ?? t)) > 0.02)

  if (targets === null || jointsMeta.length === 0) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardContent className="py-16 text-center text-sm text-zinc-500">
          正在載入關節數據…
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* 指令按鈕列 */}
      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-zinc-200">底層控制指令</CardTitle>
          <CardDescription className="text-xs">
            對應 r1-7a_sdk 嘅低階指令集（ROS service call 等價物）
          </CardDescription>
        </CardHeader>
        <CardContent>
          {estopActive && (
            <div className="mb-3 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2.5 text-xs text-red-300">
              🛑 緊急停止已觸發 — 先執行「清除錯誤」恢復操作
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <CmdButton
              icon={<Rocket className="h-4 w-4" />}
              label="執行 Goto"
              desc={`cosine 軌跡 ${duration.toFixed(1)}s`}
              primary
              disabled={disabled || !dirty}
              onClick={() =>
                exec('Goto 移動', async () => {
                  const r = await sendCommand(
                    'goto',
                    targets!.map((t) => Math.round(t * 1000) / 1000),
                    duration
                  )
                  // 發送後解除鎖定，滑條重新跟隨即時位置
                  setOverride(null)
                  return r
                })
              }
            />
            <CmdButton
              icon={<Home className="h-4 w-4" />}
              label="Home 歸零"
              desc="返 URDF 零位"
              disabled={disabled}
              onClick={() => exec('Home 歸零', () => sendCommand('home'))}
            />
            <CmdButton
              icon={<Hand className="h-4 w-4" />}
              label="FOC 保持"
              desc="力矩鎖定當前姿勢"
              disabled={disabled}
              onClick={() => exec('FOC 保持', () => sendCommand('foc'))}
            />
            <CmdButton
              icon={<Square className="h-4 w-4" />}
              label="Stop 停止"
              desc="停止移動保留力矩"
              disabled={!state}
              onClick={() => exec('Stop', () => sendCommand('stop'))}
            />
            <CmdButton
              icon={<PowerOff className="h-4 w-4" />}
              label="零力矩"
              desc="馬達鬆弛（小心重力）"
              warn
              disabled={disabled}
              onClick={() => exec('零力矩', () => sendCommand('zero_torque'))}
            />
            <CmdButton
              icon={<Undo2 className="h-4 w-4" />}
              label="清除錯誤"
              desc="clear + 解除 E-stop"
              disabled={!estopActive && !(state && state.errorCode !== 0)}
              onClick={() => exec('清除錯誤', () => sendCommand('clear'))}
            />
          </div>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <CmdButton
              icon={<RotateCcw className="h-4 w-4" />}
              label="Reset 馬達重置"
              desc="重置馬達驅動器（維修用）"
              warn
              disabled={disabled}
              onClick={() => exec('Reset', () => sendCommand('reset'))}
            />
            <CmdButton
              icon={<Workflow className="h-4 w-4" />}
              label="同步滑條到當前"
              desc="將滑條重設為即時位置"
              disabled={!state}
              onClick={() => {
                setOverride(null)
                toast({ title: '已同步', description: '滑條已重設為當前關節位置' })
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* 關節滑條 */}
      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-zinc-200">
            關節目標設定 <span className="text-zinc-500 font-normal">(拖動滑條 → 執行 Goto)</span>
          </CardTitle>
          <CardDescription className="text-xs">
            {dirty ? (
              <span className="text-amber-400">● 有未執行嘅修改（同當前位置有差異）</span>
            ) : (
              <span className="text-zinc-500">滑條同當前位置同步</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {jointsMeta.map((m, i) => (
              <JointCard
                key={m.id}
                meta={m}
                state={state?.joints[m.id - 1]}
                interactive
                previewValue={targets[i]}
                disabled={disabled}
                onPreview={(v) =>
                  setOverride((prev) => {
                    const base = prev ?? liveTargets ?? [0, 0, 0, 0, 0, 0, 0]
                    return base.map((t, j) => (j === i ? v : t))
                  })
                }
              />
            ))}
          </div>

          {/* 執行時間 */}
          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-300">
                Goto 執行時間（cosine 軌跡時長）
              </span>
              <span className="font-mono text-sm text-amber-400">{duration.toFixed(1)} s</span>
            </div>
            <Slider
              value={[duration]}
              min={0.5}
              max={10}
              step={0.1}
              onValueChange={(v) => setDuration(v[0])}
              aria-label="Goto 執行時間"
            />
            <div className="flex justify-between font-mono text-[10px] text-zinc-600 mt-1">
              <span>0.5s (快)</span>
              <span>10s (慢)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function CmdButton({
  icon,
  label,
  desc,
  onClick,
  disabled,
  primary,
  warn,
}: {
  icon: React.ReactNode
  label: string
  desc: string
  onClick: () => void
  disabled?: boolean
  primary?: boolean
  warn?: boolean
}) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'h-auto flex-col items-start gap-0.5 px-3 py-2.5 text-left border-zinc-700 hover:border-zinc-500',
        primary &&
          'border-amber-500/60 bg-amber-500/10 hover:bg-amber-500/20 hover:border-amber-400',
        warn && 'border-red-500/40 text-red-300 hover:bg-red-500/10 hover:border-red-400/70',
        disabled && 'opacity-40'
      )}
      aria-label={label}
    >
      <span className="flex items-center gap-1.5 font-semibold text-[13px]">
        {icon}
        {label}
      </span>
      <span className="text-[10px] font-normal text-zinc-500">{desc}</span>
    </Button>
  )
}
