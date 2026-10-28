'use client'

/**
 * KeysPanel — API Key 認證管理
 *
 * 功能：
 *   - Key 列表（掩碼顯示 / 角色 / 最後使用 / 啟用狀態）
 *   - 建立新 key（完整 key 只顯示一次 + 複製）
 *   - 角色切換（viewer / operator / admin）
 *   - 啟用 / 停用、重新生成、刪除
 *   - 權限說明 + 調用示例
 */

import { useCallback, useEffect, useState } from 'react'
import { KeyRound, Plus, Copy, Check, RefreshCw, Trash2, ShieldAlert, ExternalLink, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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

interface ApiKeyItem {
  id: string
  name: string
  email: string | null
  role: 'admin' | 'operator' | 'viewer'
  active: boolean
  keyMasked: string
  lastUsedAt: string | null
  expiresAt: string | null
  expired: boolean
  createdAt: string
}

const ROLE_STYLE: Record<string, string> = {
  admin: 'border-red-500/40 bg-red-500/10 text-red-400',
  operator: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
  viewer: 'border-sky-500/40 bg-sky-500/10 text-sky-400',
}

const ROLE_DESC: Record<string, string> = {
  admin: '全部權限，包括 zero_torque / reset 等危險指令',
  operator: '一般控制：foc / home / goto / stop / clear、姿勢同軌跡執行',
  viewer: '唯讀：狀態查詢 / 日誌 / 姿勢庫列表（可觸發 E-stop）',
}

/** 有效期狀態描述 */
function expiryInfo(k: ApiKeyItem): { label: string; cls: string } {
  if (!k.expiresAt) return { label: '永久', cls: 'border-zinc-700 text-zinc-500' }
  if (k.expired) return { label: '已過期', cls: 'border-red-500/50 bg-red-500/10 text-red-400' }
  const ms = new Date(k.expiresAt).getTime() - Date.now()
  const hours = ms / 3600000
  if (hours < 24) {
    return { label: `剩 ${Math.max(1, Math.round(hours))} 小時`, cls: 'border-amber-500/50 bg-amber-500/10 text-amber-400' }
  }
  const days = Math.round(hours / 24)
  if (days <= 3) return { label: `剩 ${days} 天`, cls: 'border-amber-500/50 bg-amber-500/10 text-amber-400' }
  return { label: `剩 ${days} 天`, cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' }
}

export function KeysPanel() {
  const { toast } = useToast()
  const [keys, setKeys] = useState<ApiKeyItem[]>([])
  const [loading, setLoading] = useState(true)

  // 建立對話框
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState<'admin' | 'operator' | 'viewer'>('operator')
  const [newExpiry, setNewExpiry] = useState('never') // never | 1 | 7 | 30 | 90 | custom
  const [customDays, setCustomDays] = useState('14')
  const [creating, setCreating] = useState(false)

  // 新 key 一次性顯示
  const [freshKey, setFreshKey] = useState<{ name: string; apiKey: string } | null>(null)
  const [copied, setCopied] = useState(false)

  // 刪除確認
  const [deleteTarget, setDeleteTarget] = useState<ApiKeyItem | null>(null)

  const loadKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/keys')
      const body = await res.json()
      if (body.ok) setKeys(body.data)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadKeys()
  }, [loadKeys])

  const createKey = async () => {
    if (!newName.trim()) {
      toast({ title: '請輸入 key 名稱', variant: 'destructive' })
      return
    }
    setCreating(true)
    try {
      let expiresInDays: number | null = null
      if (newExpiry === 'custom') {
        const d = Number(customDays)
        if (!Number.isFinite(d) || d <= 0 || d > 3650) {
          toast({ title: '自訂天數必須為 0–3650', variant: 'destructive' })
          return
        }
        expiresInDays = d
      } else if (newExpiry !== 'never') {
        expiresInDays = Number(newExpiry)
      }
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), role: newRole, expiresInDays }),
      })
      const body = await res.json()
      if (body.ok) {
        setCreateOpen(false)
        setFreshKey({ name: body.data.name, apiKey: body.data.apiKey })
        if (body.data.expiresAt) {
          toast({
            title: '⏳ Key 已建立（限期）',
            description: `有效期至 ${new Date(body.data.expiresAt).toLocaleString('zh-HK', { hour12: false })}`,
          })
        }
        setNewName('')
        await loadKeys()
      } else {
        toast({ title: '建立失敗', description: body.error, variant: 'destructive' })
      }
    } finally {
      setCreating(false)
    }
  }

  /** 延期 / 設為永久 */
  const extendKey = async (k: ApiKeyItem, action: string) => {
    let payload: Record<string, unknown>
    if (action === 'never') payload = { expiresInDays: null }
    else payload = { extendDays: Number(action) }
    const res = await fetch(`/api/keys/${k.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const body = await res.json()
    if (body.ok) {
      setKeys((prev) =>
        prev.map((x) =>
          x.id === k.id
            ? { ...x, expiresAt: body.data.expiresAt, expired: false }
            : x
        )
      )
      toast({
        title: `${k.name} 已${action === 'never' ? '設為永久' : `延期 +${action} 天`}`,
        description: body.data.expiresAt
          ? `新到期：${new Date(body.data.expiresAt).toLocaleString('zh-HK', { hour12: false })}`
          : undefined,
      })
    } else {
      toast({ title: '操作失敗', description: body.error, variant: 'destructive' })
    }
  }

  const toggleActive = async (k: ApiKeyItem, active: boolean) => {
    const res = await fetch(`/api/keys/${k.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active }),
    })
    const body = await res.json()
    if (body.ok) {
      setKeys((prev) => prev.map((x) => (x.id === k.id ? { ...x, active } : x)))
      toast({ title: active ? `已啟用 ${k.name}` : `已停用 ${k.name}` })
    }
  }

  const changeRole = async (k: ApiKeyItem, role: string) => {
    const res = await fetch(`/api/keys/${k.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    const body = await res.json()
    if (body.ok) {
      setKeys((prev) => prev.map((x) => (x.id === k.id ? { ...x, role } as ApiKeyItem : x)))
      toast({ title: `${k.name} 角色已改為 ${role}` })
    }
  }

  const regenerate = async (k: ApiKeyItem) => {
    const res = await fetch(`/api/keys/${k.id}/regenerate`, { method: 'POST' })
    const body = await res.json()
    if (body.ok) {
      setFreshKey({ name: k.name, apiKey: body.data.apiKey })
      toast({ title: `已重新生成 ${k.name} 嘅 key`, description: '舊 key 已即時失效' })
    }
  }

  const deleteKey = async () => {
    if (!deleteTarget) return
    const res = await fetch(`/api/keys/${deleteTarget.id}`, { method: 'DELETE' })
    const body = await res.json()
    if (body.ok) {
      setKeys((prev) => prev.filter((x) => x.id !== deleteTarget.id))
      toast({ title: `已刪除 ${deleteTarget.name}` })
    }
    setDeleteTarget(null)
  }

  const copyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard 不可用 */
    }
  }

  return (
    <div className="space-y-4">
      {/* 說明卡 */}
      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <ShieldAlert className="h-4 w-4 text-amber-400" aria-hidden />
            API Key 認證
          </CardTitle>
          <CardDescription className="text-xs">
            外部程序經 REST / WS 調用時以 <code className="text-amber-400 font-mono">X-API-Key</code> header 認證。
            Web UI 本地操作無需 key；提供 key 時強制執行角色權限。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3 font-mono text-[11px] text-zinc-400 overflow-x-auto">
            <span className="text-zinc-600"># 帶 key 調用示例</span>
            <br />
            curl -X POST http://localhost:3000/api/robot/command \
            <br />
            &nbsp;&nbsp;-H &quot;<span className="text-amber-400">X-API-Key: r1a_sk_your_key_here</span>&quot; \
            <br />
            &nbsp;&nbsp;-H &quot;Content-Type: application/json&quot; \
            <br />
            &nbsp;&nbsp;-d &apos;{`{"type":"goto","joints":[0,0.35,0,1.2,0,0,0],"duration":2}`}&apos;
          </div>
        </CardContent>
      </Card>

      {/* Key 列表 */}
      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                <KeyRound className="h-4 w-4 text-amber-400" aria-hidden />
                Key 列表
                <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-400">
                  {keys.length} 個
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                完整 key 只喺建立 / 重新生成時顯示一次，請立即保存
              </CardDescription>
            </div>
            <Button
              size="sm"
              className="bg-amber-500 text-zinc-950 hover:bg-amber-400 h-8"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              新增 Key
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : keys.length === 0 ? (
            <div className="text-center py-8 text-xs text-zinc-600">
              暫時冇 API key — 建立一個俾外部程序調用
            </div>
          ) : (
            <div className="space-y-2">
              {keys.map((k) => (
                <div
                  key={k.id}
                  className={cn(
                    'flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors',
                    k.active ? 'border-zinc-800 bg-zinc-950/60' : 'border-zinc-800/50 bg-zinc-950/30 opacity-60'
                  )}
                >
                  {/* 名稱 + key */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-zinc-200 truncate">{k.name}</span>
                      <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0', ROLE_STYLE[k.role])}>
                        {k.role}
                      </Badge>
                      <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0 gap-0.5', expiryInfo(k).cls)}>
                        <Clock className="h-2.5 w-2.5" aria-hidden />
                        {expiryInfo(k).label}
                      </Badge>
                      {!k.active && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-zinc-600 text-zinc-500">
                          已停用
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-zinc-500 mt-0.5">
                      {k.keyMasked}
                      <span className="mx-2 text-zinc-700">·</span>
                      <span className="text-zinc-600">
                        {k.lastUsedAt
                          ? `最後使用 ${new Date(k.lastUsedAt).toLocaleString('zh-HK', { hour12: false })}`
                          : '從未使用'}
                      </span>
                      {k.expiresAt && (
                        <>
                          <span className="mx-2 text-zinc-700">·</span>
                          <span className={k.expired ? 'text-red-400' : 'text-zinc-600'}>
                            到期 {new Date(k.expiresAt).toLocaleString('zh-HK', { hour12: false })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 有效期操作 */}
                  <Select value="" onValueChange={(v) => v && void extendKey(k, v)}>
                    <SelectTrigger
                      className="h-8 w-[96px] text-[11px] border-zinc-700 bg-zinc-900 text-zinc-400"
                      title="有效期管理"
                    >
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" aria-hidden />
                        <span>有效期</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      <SelectItem value="1" className="text-xs">延期 +1 天</SelectItem>
                      <SelectItem value="7" className="text-xs">延期 +7 天</SelectItem>
                      <SelectItem value="30" className="text-xs">延期 +30 天</SelectItem>
                      <SelectItem value="never" className="text-xs">改為永久</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* 角色 */}
                  <Select value={k.role} onValueChange={(v) => void changeRole(k, v)}>
                    <SelectTrigger className="h-8 w-[110px] text-xs border-zinc-700 bg-zinc-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      <SelectItem value="viewer">viewer</SelectItem>
                      <SelectItem value="operator">operator</SelectItem>
                      <SelectItem value="admin">admin</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* 啟用開關 */}
                  <Switch
                    checked={k.active}
                    onCheckedChange={(v) => void toggleActive(k, v)}
                    aria-label={`啟用 ${k.name}`}
                  />

                  {/* 操作 */}
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm" variant="ghost" className="h-8 w-8 p-0 text-zinc-500 hover:text-amber-400"
                      onClick={() => void regenerate(k)}
                      title="重新生成 key（舊 key 失效）"
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                    <Button
                      size="sm" variant="ghost" className="h-8 w-8 p-0 text-zinc-500 hover:text-red-400"
                      onClick={() => setDeleteTarget(k)}
                      title="刪除"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 建立對話框 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">新增 API Key</DialogTitle>
            <DialogDescription className="text-xs">
              建立後完整 key 只顯示一次。角色權限：
              <ul className="mt-1.5 space-y-0.5">
                <li>· <span className="text-sky-400 font-mono">viewer</span> — {ROLE_DESC.viewer}</li>
                <li>· <span className="text-amber-400 font-mono">operator</span> — {ROLE_DESC.operator}</li>
                <li>· <span className="text-red-400 font-mono">admin</span> — {ROLE_DESC.admin}</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="key-name" className="text-xs text-zinc-400">名稱</Label>
              <Input
                id="key-name"
                placeholder="例如：python-script、scara-cell、ci-runner"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="bg-zinc-950 border-zinc-700 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">角色</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as typeof newRole)}>
                <SelectTrigger className="h-9 bg-zinc-950 border-zinc-700 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value="viewer">viewer（唯讀）</SelectItem>
                  <SelectItem value="operator">operator（一般控制）</SelectItem>
                  <SelectItem value="admin">admin（全部）</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">
                有效期
                <span className="text-zinc-600 ml-1">— 過期後認證即時失效（401）</span>
              </Label>
              <Select value={newExpiry} onValueChange={setNewExpiry}>
                <SelectTrigger className="h-9 bg-zinc-950 border-zinc-700 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value="never">永久有效</SelectItem>
                  <SelectItem value="1">1 天</SelectItem>
                  <SelectItem value="7">7 天</SelectItem>
                  <SelectItem value="30">30 天</SelectItem>
                  <SelectItem value="90">90 天</SelectItem>
                  <SelectItem value="custom">自訂天數…</SelectItem>
                </SelectContent>
              </Select>
              {newExpiry === 'custom' && (
                <div className="flex items-center gap-2 pt-1">
                  <Input
                    type="number"
                    min={1}
                    max={3650}
                    value={customDays}
                    onChange={(e) => setCustomDays(e.target.value)}
                    className="h-8 bg-zinc-950 border-zinc-700 text-sm w-24"
                    aria-label="自訂天數"
                  />
                  <span className="text-xs text-zinc-500">天（支援小數：0.04 ≈ 1 小時）</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="text-zinc-400" onClick={() => setCreateOpen(false)}>
              取消
            </Button>
            <Button
              className="bg-amber-500 text-zinc-950 hover:bg-amber-400"
              disabled={creating || !newName.trim()}
              onClick={() => void createKey()}
            >
              {creating ? '建立中…' : '建立'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 新 key 一次性顯示 */}
      <Dialog open={!!freshKey} onOpenChange={(open) => !open && setFreshKey(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-100 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-amber-400" aria-hidden />
              {freshKey?.name} 嘅 API Key
            </DialogTitle>
            <DialogDescription className="text-xs text-amber-400/90">
              ⚠️ 完整 key 只顯示呢一次 — 請立即複製保存
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 p-3">
            <code className="flex-1 font-mono text-xs text-amber-300 break-all">
              {freshKey?.apiKey}
            </code>
            <Button
              size="sm" variant="outline"
              className="h-8 shrink-0 border-zinc-700 text-zinc-300 hover:text-amber-400"
              onClick={() => void copyKey(freshKey?.apiKey ?? '')}
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
              {copied ? '已複製' : '複製'}
            </Button>
          </div>
          <DialogFooter className="flex-row items-center justify-between">
            <a
              href="#api"
              className="text-[11px] text-zinc-500 hover:text-amber-400 inline-flex items-center gap-1"
              onClick={() => setFreshKey(null)}
            >
              <ExternalLink className="h-3 w-3" aria-hidden /> 查看 API 文檔用法
            </a>
            <Button className="bg-zinc-800 text-zinc-200 hover:bg-zinc-700" onClick={() => setFreshKey(null)}>
              我已保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 刪除確認 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-100">刪除 API Key？</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              將永久刪除 <span className="text-zinc-200 font-medium">{deleteTarget?.name}</span>（{deleteTarget?.keyMasked}）。
              使用此 key 嘅程序將立即失去存取權限。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-zinc-300">取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-500"
              onClick={() => void deleteKey()}
            >
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
