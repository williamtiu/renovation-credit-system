'use client'

import { useState } from 'react'
import { Settings2, FlaskConical, Cable, Boxes, Power } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import type { RobotContext } from '@/hooks/use-robot'

type Mode = 'simulation' | 'serial' | 'bridge'

const MODES: Array<{
  id: Mode
  icon: React.ReactNode
  name: string
  desc: string
  badge: string
}> = [
  {
    id: 'simulation',
    icon: <FlaskConical className="h-4 w-4" />,
    name: '模擬模式 (Simulation)',
    desc: '內置 200Hz 物理引擎模擬 7-DOF 動力學。開發、教學、演示用，唔需要真機。',
    badge: '開發/演示',
  },
  {
    id: 'serial',
    icon: <Cable className="h-4 w-4" />,
    name: '串口直連 (Serial)',
    desc: '透過 serialport 直接同 IM6014 匯流排通訊。需要按照 SDK 協議補全幀格式（進階）。',
    badge: '進階',
  },
  {
    id: 'bridge',
    icon: <Boxes className="h-4 w-4" />,
    name: 'C++ Bridge（推薦真機）',
    desc: '透過 UDP JSON-RPC 調用 C++ Hardware Bridge（包裝 r1-7a_sdk 靜態庫）。最穩陣嘅真機方案。',
    badge: '生產環境',
  },
]

export function SettingsPanel({ robot }: { robot: RobotContext }) {
  const { state, api } = robot
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)

  // 衍生預設值：未編輯時跟隨即時狀態；用戶修改後鎖定為 draft
  const [draft, setDraft] = useState<{ mode: Mode; port: string; baudrate: string } | null>(null)
  const live = {
    mode: (state?.driverMode ?? 'simulation') as Mode,
    port: state?.serial.port ?? '/dev/ttyUSB0',
    baudrate: String(state?.serial.baudrate ?? 6000000),
  }
  const mode = draft?.mode ?? live.mode
  const port = draft?.port ?? live.port
  const baudrate = draft?.baudrate ?? live.baudrate

  const apply = async (targetMode: Mode, p: string, b: string) => {
    setBusy(true)
    const res = await api('/api/system/configure', {
      method: 'POST',
      body: JSON.stringify({
        action: 'configure',
        mode: targetMode,
        port: p,
        baudrate: parseInt(b, 10) || 6000000,
      }),
    })
    setBusy(false)
    setDraft(null)
    if (res.ok) {
      toast({
        title: `✓ 已切換到 ${targetMode} 模式`,
        description: '控制器已重新配置並激活',
      })
    } else {
      toast({
        title: '✗ 配置失敗',
        description: res.error ?? '未知錯誤',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <Settings2 className="h-4 w-4 text-amber-400" aria-hidden />
            硬體驅動模式（HAL 配置）
          </CardTitle>
          <CardDescription className="text-xs">
            ROS2 Lifecycle Node 配置 — 切換模式會重新 configure + activate 控制器
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 模式選擇 */}
          <div className="grid gap-3 md:grid-cols-3" role="radiogroup" aria-label="驅動模式">
            {MODES.map((m) => (
              <button
                key={m.id}
                role="radio"
                aria-checked={mode === m.id}
                onClick={() => setDraft({ ...live, mode: m.id })}
                className={cn(
                  'rounded-xl border p-4 text-left transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/50',
                  mode === m.id
                    ? 'border-amber-500/70 bg-amber-500/10'
                    : 'border-zinc-800 bg-zinc-950/50 hover:border-zinc-600'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={cn(mode === m.id ? 'text-amber-400' : 'text-zinc-400')}>
                    {m.icon}
                  </span>
                  <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[9px] text-zinc-500">
                    {m.badge}
                  </span>
                </div>
                <div className="text-sm font-semibold text-zinc-100 mb-1">{m.name}</div>
                <div className="text-[11px] text-zinc-500 leading-relaxed">{m.desc}</div>
              </button>
            ))}
          </div>

          {/* 串口參數 */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="serial-port" className="text-xs text-zinc-300">
                {mode === 'bridge' ? 'Bridge 位址 (host:port)' : '串口裝置路徑'}
              </Label>
              <Input
                id="serial-port"
                value={port}
                onChange={(e) => setDraft({ mode, port: e.target.value, baudrate })}
                placeholder={mode === 'bridge' ? '127.0.0.1:15000' : '/dev/ttyUSB0'}
                className="bg-zinc-950 border-zinc-700 font-mono h-9"
              />
              <p className="text-[10px] text-zinc-600">
                {mode === 'bridge'
                  ? 'C++ Hardware Bridge 嘅 UDP 監聽位址（預設 127.0.0.1:15000）'
                  : '用戶指定裝置：/dev/ttyUSB0（需 dialout 權限）'}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="serial-baud" className="text-xs text-zinc-300">
                波特率 (Baudrate)
              </Label>
              <Input
                id="serial-baud"
                value={baudrate}
                onChange={(e) => setDraft({ mode, port, baudrate: e.target.value })}
                type="number"
                className="bg-zinc-950 border-zinc-700 font-mono h-9"
              />
              <p className="text-[10px] text-zinc-600">
                r1-7a_sdk 預設 6000000（bridge 模式下由 bridge 自行管理）
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => apply(mode, port, baudrate)}
              disabled={busy}
              className="gap-1.5 bg-amber-500 text-zinc-950 hover:bg-amber-400 font-semibold"
            >
              <Power className="h-4 w-4" aria-hidden />
              {busy ? '配置中…' : '套用配置並激活'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 部署拓撲說明 */}
      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-zinc-200">Linux 部署拓撲</CardTitle>
          <CardDescription className="text-xs">
            真機部署架構（Ubuntu 20.04+，gcc 9.4+）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-[11px] font-mono leading-relaxed text-zinc-400 custom-scroll">
{`┌─ Ubuntu Linux (部署機) ────────────────────────────────────┐
│                                                            │
│  瀏覽器 ──HTTP/WS──▶ Next.js Web UI (:3000)                │
│                        │        ▲                          │
│                  REST API    WebSocket (:3003)              │
│                        ▼        │                          │
│               Robot Control Service (:3002)                 │
│                        │  UDP JSON-RPC                      │
│                        ▼                                    │
│           C++ Hardware Bridge (:15000)                      │
│              │  r1-7a_sdk (IM6014 serial bus)               │
│              ▼                                             │
│        /dev/ttyUSB0 @ 6000000 baud ──▶ R1-7A 機械臂         │
│                                                            │
│  # 裝置權限: sudo usermod -aG dialout $USER && reboot       │
└────────────────────────────────────────────────────────────┘`}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
