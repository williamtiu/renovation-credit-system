'use client'

import { useState, useEffect } from 'react'
import { Settings2, FlaskConical, Cable, Boxes, Power } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { ShieldCheck, ShieldX, Eye, RadioTower, LockOpen, Lock, Crosshair, Trash2, Gauge } from 'lucide-react'
import type { RobotContext } from '@/hooks/use-robot'

type Mode = 'simulation' | 'serial' | 'bridge'

interface SerialDraft {
  mode: Mode
  port: string
  baudrate: string
  calibPath: string
  zeroPath: string
  rateHz: string
  holdKp: string
  holdKd: string
}

const DEFAULT_CALIB_PATH = '/home/orangepi/r17a/r1-7a_sdk-main/r1-7a_sdk-main/config/joint_calib.txt'
const DEFAULT_ZERO_PATH = '/home/orangepi/r17a/r1-7a_sdk-main/r1-7a_sdk-main/config/joint_zero.json'

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
    desc: 'serialport 直接行 IM6014 幀（20-byte 控制 / 26-byte 遙測，byte-exact 對齊 SDK）。要俾校準表先可以配置；預設 LOCKED，零位元組輸出。',
    badge: '真機',
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
  const [draft, setDraft] = useState<SerialDraft | null>(null)
  const live: SerialDraft = {
    mode: (state?.driverMode ?? 'simulation') as Mode,
    port: state?.serial.port ?? '/dev/ttyUSB0',
    baudrate: String(state?.serial.baudrate ?? 6000000),
    calibPath: state?.serial.calibPath ?? DEFAULT_CALIB_PATH,
    zeroPath: state?.serial.zeroPath ?? DEFAULT_ZERO_PATH,
    rateHz: String(state?.serial.rateHz ?? 50),
    holdKp: String(state?.serial.holdKp ?? 20),
    holdKd: String(state?.serial.holdKd ?? 0.5),
  }
  const mode = draft?.mode ?? live.mode
  const port = draft?.port ?? live.port
  const baudrate = draft?.baudrate ?? live.baudrate
  const calibPath = draft?.calibPath ?? live.calibPath
  const zeroPath = draft?.zeroPath ?? live.zeroPath
  const rateHz = draft?.rateHz ?? live.rateHz
  const holdKp = draft?.holdKp ?? live.holdKp
  const holdKd = draft?.holdKd ?? live.holdKd
  // Any field edit must carry the current (draft-or-live) values of all the others.
  const draftBase: SerialDraft = {
    mode, port, baudrate, calibPath, zeroPath, rateHz, holdKp, holdKd,
  }

  const apply = async (targetMode: Mode, p: string, b: string) => {
    setBusy(true)
    const res = await api('/api/system/configure', {
      method: 'POST',
      body: JSON.stringify({
        action: 'configure',
        mode: targetMode,
        port: p,
        baudrate: parseInt(b, 10) || 6000000,
        calibPath: calibPath.trim(),
        zeroPath: zeroPath.trim(),
        rateHz: parseFloat(rateHz) || 50,
        holdKp: parseFloat(holdKp) || 0,
        holdKd: parseFloat(holdKd) || 0,
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

            {mode === 'serial' && (
              <>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="serial-calib" className="text-xs text-zinc-300">
                    關節校準表（joint_calib.txt）
                  </Label>
                  <Input
                    id="serial-calib"
                    value={calibPath}
                    onChange={(e) => setDraft({ ...draftBase, calibPath: e.target.value })}
                    className="bg-zinc-950 border-zinc-700 font-mono h-9 text-[11px]"
                  />
                  <p className="text-[10px] text-zinc-600">
                    格式「joint dir scale offset」，即 urdf = dir × scale × motor + offset。
                    serial 模式冇校準表就 configuration 會拒絕 —— 報返出嚟嘅唔係 URDF frame。
                  </p>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="serial-zero" className="text-xs text-zinc-300">
                    零位參考檔案（joint_zero.json）
                  </Label>
                  <Input
                    id="serial-zero"
                    value={zeroPath}
                    onChange={(e) => setDraft({ ...draftBase, zeroPath: e.target.value })}
                    className="bg-zinc-950 border-zinc-700 font-mono h-9 text-[11px]"
                  />
                  <p className="text-[10px] text-zinc-600">
                    操作者宣告嘅零位會寫喺呢度並喺重啟後恢復 —— 重啟唔可以重新定義零位。
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="serial-rate" className="text-xs text-zinc-300">
                    監控循環頻率 (Hz)
                  </Label>
                  <Input
                    id="serial-rate"
                    value={rateHz}
                    onChange={(e) => setDraft({ ...draftBase, rateHz: e.target.value })}
                    type="number"
                    min={5}
                    max={100}
                    className="bg-zinc-950 border-zinc-700 font-mono h-9"
                  />
                  <p className="text-[10px] text-zinc-600">
                    position-hold 循環 5–100 Hz（IM6014 需要主機主動問，馬達先會答）
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="serial-kp" className="text-xs text-zinc-300">
                      hold kp
                    </Label>
                    <Input
                      id="serial-kp"
                      value={holdKp}
                      onChange={(e) => setDraft({ ...draftBase, holdKp: e.target.value })}
                      type="number"
                      className="bg-zinc-950 border-zinc-700 font-mono h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="serial-kd" className="text-xs text-zinc-300">
                      hold kd
                    </Label>
                    <Input
                      id="serial-kd"
                      value={holdKd}
                      onChange={(e) => setDraft({ ...draftBase, holdKd: e.target.value })}
                      type="number"
                      className="bg-zinc-950 border-zinc-700 font-mono h-9"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-600 sm:col-span-2">
                    kp = kd = 0 唔會啟用 FOC（實測 firmware 行為）；上限 kp 60 / kd 5。
                  </p>
                </div>
              </>
            )}
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

      {/* 傳輸安全閘（serial 模式） */}
      {mode === 'serial' && <GuardPanel robot={robot} />}

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

const MONITOR_PHRASE = 'ARM POSITION-HOLD MONITORING'
const UNLOCK_PHRASE = 'I ACCEPT FULL MOTION CONTROL'

/**
 * 傳輸安全閘面板（serial 模式）
 *
 * LOCKED 係預設，預設零位元組輸出。解鎖要同時輸入正確嘅 phrase 同 console
 * code — 少任何一樣都喺到達傳輸代碼之前被拒（403），永遠唔會寫出一個 byte。
 */
function GuardPanel({ robot }: { robot: RobotContext }) {
  const { state, api } = robot
  const { toast } = useToast()
  const [busy, setBusy] = useState<string | null>(null)
  const [phrase, setPhrase] = useState('')
  const [code, setCode] = useState('')

  const guard = state?.guard
  const bus = state?.bus

  // 運動 ramp：rate 決定 lag 幾快逼近 abort 邊界，所以佢係操作參數
  const [jogRate, setJogRate] = useState(String(state?.jogRate ?? 0.25))
  const [jogKp, setJogKp] = useState('30')
  const [jogKd, setJogKd] = useState('1.5')
  const [jogInfo, setJogInfo] = useState<{
    rate?: number; moving?: boolean; active?: boolean; keepaliveBursts?: number
  } | null>(null)

  useEffect(() => {
    let stop = false
    const pull = async () => {
      const res = await api('/api/robot/jog')
      if (!stop && res.ok && res.data) {
        setJogInfo(res.data)
        if (typeof res.data.rate === 'number') setJogRate(String(res.data.rate))
      }
    }
    pull()
    const t = setInterval(pull, 2000)
    return () => { stop = true; clearInterval(t) }
  }, [api])

  const applyJog = async () => {
    const rate = parseFloat(jogRate)
    const kp = parseFloat(jogKp)
    const kd = parseFloat(jogKd)
    if (!Number.isFinite(rate) || rate < 0.01 || rate > 1.0) {
      toast({ title: '✗ ramp 速度非法', description: '要喺 0.01 至 1.0 rad/s 之間', variant: 'destructive' })
      return
    }
    if (!Number.isFinite(kp) || kp < 0 || kp > 60 || !Number.isFinite(kd) || kd < 0 || kd > 5) {
      toast({ title: '✗ ramp gains 非法', description: 'kp 0–60、kd 0–5（MAX_JOG_KP / MAX_JOG_KD）', variant: 'destructive' })
      return
    }
    setBusy('jog rate')
    const res = await api('/api/robot/jog', { method: 'POST', body: JSON.stringify({ rate, kp, kd }) })
    setBusy(null)
    if (res.ok) {
      toast({
        title: `✓ ramp 已套用`,
        description: `rate ${rate} rad/s · kp ${res.data?.gains?.kp ?? kp} · kd ${res.data?.gains?.kd ?? kd}`,
      })
      setJogInfo(res.data?.jog ?? jogInfo)
    } else {
      toast({ title: '✗ 設定失敗', description: res.error ?? 'jog 只喺 serial 模式可用', variant: 'destructive' })
    }
  }

  const clearJog = async () => {
    setBusy('jog clear')
    const res = await api('/api/robot/jog', { method: 'POST', body: JSON.stringify({ clear: true }) })
    setBusy(null)
    if (res.ok) toast({ title: `✓ 已清除 ${res.dropped ?? 0} 個 ramp target`, description: '機械臂保持喺最後命令位置' })
    else toast({ title: '✗ 清除失敗', description: res.error ?? '未知錯誤', variant: 'destructive' })
  }

  const act = async (label: string, action: string, extra?: Record<string, string>) => {
    setBusy(label)
    const res = await api('/api/robot/guard', {
      method: 'POST',
      body: JSON.stringify({ action, phrase, code, ...extra }),
    })
    setBusy(null)
    if (res.ok) {
      toast({ title: `✓ ${label}`, description: res.message ?? '' })
    } else {
      toast({ title: `✗ ${label}`, description: res.error ?? res.message ?? '被拒絕', variant: 'destructive' })
    }
  }

  const zero = async (label: string, action: 'capture' | 'clear') => {
    setBusy(label)
    const res = await api('/api/robot/zero', { method: 'POST', body: JSON.stringify({ action }) })
    setBusy(null)
    if (res.ok) toast({ title: `✓ ${label}`, description: res.message ?? '' })
    else toast({ title: `✗ ${label}`, description: res.error ?? '被拒絕', variant: 'destructive' })
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900/60">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
          {guard?.locked ? (
            <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden />
          ) : (
            <ShieldX className="h-4 w-4 text-red-400" aria-hidden />
          )}
          傳輸安全閘（IM6014 transmit gate）
        </CardTitle>
        <CardDescription className="text-xs">
          預設 LOCKED = 零位元組輸出。解鎖運動要 phrase + console code 兩樣齊；
          監控（讀遙測）要 separately arm —— 呢條 bus 要主機問咗，馬達先會答。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-4">
          <Stat label="Motion" value={guard ? (guard.locked ? 'LOCKED' : 'UNLOCKED') : '—'}
            tone={guard && !guard.locked ? 'danger' : 'safe'} />
          <Stat label="Monitor" value={guard ? (guard.monitorArmed ? 'ARMED' : 'IDLE') : '—'}
            tone={guard?.monitorArmed ? 'warn' : 'muted'} />
          <Stat label="TX" value={guard ? `${guard.txPackets}` : '—'} tone="muted" />
          <Stat label="被拒" value={guard ? `${guard.txBlocked}` : '—'} tone="muted" />
        </div>

        {guard?.lockReason && (
          <p className="text-[11px] text-zinc-500">
            <span className="font-mono text-zinc-400">{guard.lockReason}</span>
            {' · '}
            <span className="font-mono text-zinc-400">{guard.monitorReason}</span>
            {' · '}code <span className="font-mono text-zinc-400">{guard.nonceHint}</span>
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="guard-phrase" className="text-xs text-zinc-300">Phrase</Label>
            <Input
              id="guard-phrase"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder={UNLOCK_PHRASE}
              className="bg-zinc-950 border-zinc-700 font-mono h-9 text-[11px]"
            />
            <p className="text-[10px] text-zinc-600">
              監控：<span className="font-mono">{MONITOR_PHRASE}</span>
              <br />
              解鎖：<span className="font-mono">{UNLOCK_PHRASE}</span>
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="guard-code" className="text-xs text-zinc-300">Console code</Label>
            <Input
              id="guard-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="控制台解鎖碼"
              className="bg-zinc-950 border-zinc-700 font-mono h-9 text-[11px]"
            />
            <p className="text-[10px] text-zinc-600">唔啱就 403，永遠唔會到達傳輸代碼</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={busy !== null} onClick={() => act('Arm monitor', 'arm-monitor')}
            className="gap-1.5 bg-zinc-800 text-zinc-100 hover:bg-zinc-700">
            <Eye className="h-4 w-4" aria-hidden />
            {busy === 'Arm monitor' ? '處理中…' : 'Arm 監控（讀遙測）'}
          </Button>
          <Button size="sm" disabled={busy !== null} onClick={() => act('Unlock motion', 'unlock')}
            className="gap-1.5 bg-red-600 text-white hover:bg-red-500 font-semibold">
            <LockOpen className="h-4 w-4" aria-hidden />
            {busy === 'Unlock motion' ? '處理中…' : '解鎖運動授權'}
          </Button>
          <Button size="sm" disabled={busy !== null}
            onClick={() => act('Lock', 'lock', { reason: 'operator lock from UI' })}
            className="gap-1.5 bg-zinc-800 text-zinc-100 hover:bg-zinc-700">
            <Lock className="h-4 w-4" aria-hidden />
            {busy === 'Lock' ? '處理中…' : '重新鎖定'}
          </Button>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs text-zinc-300">
            <RadioTower className="h-4 w-4 text-cyan-400" aria-hidden />
            匯流排計數
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            <Stat label="RX bytes" value={bus ? `${bus.rxBytes}` : '—'} tone="muted" />
            <Stat label="RX packets" value={bus ? `${bus.rxPackets}` : '—'} tone="muted" />
            <Stat label="CRC 錯" value={bus ? `${bus.crcErrors}` : '—'}
              tone={bus && bus.crcErrors ? 'danger' : 'safe'} />
            <Stat label="Resync" value={bus ? `${bus.resyncs}` : '—'} tone="muted" />
          </div>
          <p className="text-[10px] text-zinc-600">
            遙測要 monitor 類傳輸先會更新（commanded == measured，淨位移零）。
            {bus?.zeroDeclared === false && ' · 未宣告零位 — 報嘅係 encoder 絕對角。'}
            {bus && bus.faults.length > 0 && ` · 錯誤碼關節：${bus.faults.map((f) => f.joint).join(', ')}`}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy !== null} onClick={() => zero('宣告現時姿勢為零位', 'capture')}
              className="gap-1.5 bg-zinc-800 text-zinc-100 hover:bg-zinc-700">
              <Crosshair className="h-4 w-4" aria-hidden />
              {busy === '宣告現時姿勢為零位' ? '處理中…' : '宣告現時姿勢為零位'}
            </Button>
            <Button size="sm" disabled={busy !== null} onClick={() => zero('清除零位參考', 'clear')}
              className="gap-1.5 bg-zinc-800 text-zinc-100 hover:bg-zinc-700">
              <Trash2 className="h-4 w-4" aria-hidden />
              {busy === '清除零位參考' ? '處理中…' : '清除零位參考'}
            </Button>
          </div>
        </div>

        {/* 運動 ramp（jog）— rate 決定 lag 幾快逼近 abort 邊界 */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs text-zinc-300">
            <Gauge className="h-4 w-4 text-purple-400" aria-hidden />
            運動 ramp（jog）
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="jog-rate" className="text-xs text-zinc-300">
                ramp 速度 (rad/s)
              </Label>
              <Input
                id="jog-rate"
                value={jogRate}
                onChange={(e) => setJogRate(e.target.value)}
                type="number"
                step="0.01"
                min="0.01"
                max="1"
                className="bg-zinc-950 border-zinc-700 font-mono h-9"
              />
              <p className="text-[10px] text-zinc-600">
                上限 1.0 rad/s（實測）。呢部機械臂實際追蹤約 0.01–0.02 rad/s，
                rate 太高 lag 會逼到 0.05 rad abort 邊界。
              </p>
            </div>
            <div className="space-y-1.5">
              <span className="text-[9px] uppercase tracking-wide text-zinc-600">ramp 狀態</span>
              <div className="grid gap-2 sm:grid-cols-2">
                <Stat label="moving" value={state?.moving ? '郁緊' : '停'} tone={state?.moving ? 'warn' : 'safe'} />
                <Stat label="keepalive" value={`${jogInfo?.keepaliveBursts ?? 0}`} tone="muted" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="jog-kp" className="text-xs text-zinc-300">
                ramp kp (Nm/rad)
              </Label>
              <Input
                id="jog-kp"
                value={jogKp}
                onChange={(e) => setJogKp(e.target.value)}
                type="number"
                step="5"
                min="0"
                max="60"
                className="bg-zinc-950 border-zinc-700 font-mono h-9"
              />
              <p className="text-[10px] text-zinc-600">
                上限 60（MAX_JOG_KP）。實測：卡住嘅關節要 ~2.6 Nm 先郁到，
                kp=30 淨係給到 ~1.0–1.4 Nm，所以會 pin 住唔郁。
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="jog-kd" className="text-xs text-zinc-300">
                ramp kd (Nm/(rad/s))
              </Label>
              <Input
                id="jog-kd"
                value={jogKd}
                onChange={(e) => setJogKd(e.target.value)}
                type="number"
                step="0.5"
                min="0"
                max="5"
                className="bg-zinc-950 border-zinc-700 font-mono h-9"
              />
              <p className="text-[10px] text-zinc-600">上限 5（MAX_JOG_KD）</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy !== null} onClick={applyJog}
              className="gap-1.5 bg-purple-600 text-white hover:bg-purple-500 font-semibold">
              <Gauge className="h-4 w-4" aria-hidden />
              {busy === 'jog rate' ? '設定中…' : '套用 ramp 參數'}
            </Button>
            <Button size="sm" disabled={busy !== null} onClick={clearJog}
              className="gap-1.5 bg-zinc-800 text-zinc-100 hover:bg-zinc-700">
              <Trash2 className="h-4 w-4" aria-hidden />
              {busy === 'jog clear' ? '處理中…' : '清除 ramp targets'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone: 'safe' | 'warn' | 'danger' | 'muted' }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">
      <div className="text-[9px] uppercase tracking-wide text-zinc-600">{label}</div>
      <div
        className={cn(
          'font-mono text-sm',
          tone === 'safe' && 'text-emerald-400',
          tone === 'warn' && 'text-amber-400',
          tone === 'danger' && 'text-red-400',
          tone === 'muted' && 'text-zinc-300'
        )}
      >
        {value}
      </div>
    </div>
  )
}
