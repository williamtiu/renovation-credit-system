'use client'

import { useState } from 'react'
import { BookOpen, Copy, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Endpoint {
  method: 'GET' | 'POST' | 'DELETE' | 'PATCH'
  path: string
  title: string
  desc: string
  body?: string
  curl: string
  python?: string
  response: string
}

const ENDPOINTS: Endpoint[] = [
  {
    method: 'GET',
    path: '/api/robot/state',
    title: '機械人狀態',
    desc: '完整狀態快照：生命周期、控制模式、7 關節 q/dq/tau/temp、錯誤碼。對應 ROS /robot_state topic。',
    curl: 'curl http://<host>:3000/api/robot/state',
    python: `import requests
r = requests.get("http://<host>:3000/api/robot/state")
state = r.json()["data"]
for i, j in enumerate(state["joints"], 1):
    print(f"J{i}: q={j['q']:.3f} dq={j['dq']:.3f} tau={j['tau']:.2f} temp={j['temp']:.1f}")`,
    response: `{
  "ok": true,
  "data": {
    "lifecycle": "active",
    "connected": true,
    "driverMode": "bridge",
    "controlMode": "foc",
    "estop": false,
    "joints": [{ "q": 0.0, "dq": 0.0, "tau": 0.02, "temp": 33.5 }, ...],
    ...
  }
}`,
  },
  {
    method: 'POST',
    path: '/api/robot/command',
    title: '發送控制指令（支援 API Key 認證）',
    desc: '核心指令入口。type: foc | home | goto | stop | zero_torque | clear | reset。goto 需要 joints (7 元素, rad) 同 duration (s)。帶 X-API-Key 時強制角色權限（zero_torque/reset 需 admin）。',
    body: `{
  "type": "goto",
  "joints": [0.5, 0.35, 0.0, 1.2, 0.0, 0.2, 0.0],
  "duration": 2.5
}`,
    curl: `# 帶 API key（X-API-Key header）
curl -X POST http://<host>:3000/api/robot/command \\
  -H "X-API-Key: r1a_sk_xxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"type":"goto","joints":[0.5,0.35,0,1.2,0,0.2,0],"duration":2.5}'`,
    python: `import requests
r = requests.post("http://<host>:3000/api/robot/command",
    headers={"X-API-Key": "r1a_sk_xxxxxxxxxxxx"},
    json={
        "type": "goto",
        "joints": [0.5, 0.35, 0.0, 1.2, 0.0, 0.2, 0.0],
        "duration": 2.5,
    },
)
print(r.json())  # {"ok": true, "message": "指令 goto 已執行", ...}`,
    response: `{
  "ok": true,
  "message": "指令 goto 已執行",
  "latencyMs": 1.2
}`,
  },
  {
    method: 'POST',
    path: '/api/robot/estop',
    title: '緊急停止',
    desc: '最高優先級 E-STOP。任何狀態下可用，即時停止所有關節並鎖定指令（只容許 clear 解除）。',
    curl: 'curl -X POST http://<host>:3000/api/robot/estop',
    python: `import requests
requests.post("http://<host>:3000/api/robot/estop")`,
    response: `{
  "ok": true,
  "message": "緊急停止已執行"
}`,
  },
  {
    method: 'GET',
    path: '/api/robot/joints',
    title: '關節元數據',
    desc: '7 個關節嘅名稱、位置限制 (rad)、速度/力矩上限、Home 位置。用於客戶端輸入驗證。',
    curl: 'curl http://<host>:3000/api/robot/joints',
    response: `{
  "ok": true,
  "data": [
    { "id": 1, "name": "arm_pitch", "label": "肩關節俯仰",
      "min": -2.87, "max": 2.87, "vMax": 3.14, "tauMax": 88, "home": 0.0 },
    ...
  ]
}`,
  },
  {
    method: 'GET',
    path: '/api/poses',
    title: '姿勢庫列表',
    desc: '所有預設姿勢（系統 + 自訂），含關節向量同執行時間。',
    curl: 'curl http://<host>:3000/api/poses',
    response: `{
  "ok": true,
  "data": [
    { "id": "...", "name": "Home 歸零位", "category": "home",
      "joints": [0, 0.1, 0, 0.55, 0, 0, 0], "duration": 2.5, "isSystem": true },
    ...
  ]
}`,
  },
  {
    method: 'POST',
    path: '/api/poses',
    title: '新增自訂姿勢',
    desc: '儲存自訂姿勢到姿勢庫。',
    body: `{
  "name": "抓取準備位",
  "joints": [0.8, 0.4, 0, 1.3, 0, 0.1, 0],
  "duration": 2.0,
  "description": "工作台抓取準備姿勢"
}`,
    curl: `curl -X POST http://<host>:3000/api/poses \\
  -H "Content-Type: application/json" \\
  -d '{"name":"抓取準備位","joints":[0.8,0.4,0,1.3,0,0.1,0],"duration":2.0}'`,
    response: `{
  "ok": true,
  "data": { "id": "cm...", "name": "抓取準備位", ... }
}`,
  },
  {
    method: 'POST',
    path: '/api/poses/{id}/execute',
    title: '執行姿勢',
    desc: '執行姿勢庫入面嘅指定姿勢（內部調用 goto）。',
    curl: 'curl -X POST http://<host>:3000/api/poses/<pose_id>/execute',
    response: `{
  "ok": true,
  "message": "指令 goto 已執行"
}`,
  },
  {
    method: 'GET',
    path: '/api/robot/logs',
    title: '指令日誌',
    desc: '審計日誌：所有指令嘅來源、參數、狀態、延遲。支援 limit/offset 分頁。',
    curl: 'curl "http://<host>:3000/api/robot/logs?limit=50&offset=0"',
    response: `{
  "ok": true,
  "total": 128,
  "data": [
    { "source": "web", "command": "goto", "status": "ok",
      "latencyMs": 0.8, "createdAt": "..." },
    ...
  ]
}`,
  },
  {
    method: 'GET',
    path: '/api/trajectories',
    title: '軌跡庫列表',
    desc: '已錄製嘅軌跡（名稱、點數、時長）。對應 ROS2 joint trajectory 概念。',
    curl: 'curl http://<host>:3000/api/trajectories',
    response: `{
  "ok": true,
  "data": [
    { "id": "...", "name": "pick-and-place", "pointCount": 42,
      "duration": 4.1, "createdAt": "..." },
    ...
  ]
}`,
  },
  {
    method: 'POST',
    path: '/api/trajectories',
    title: '儲存軌跡',
    desc: '保存路徑點序列。points: [{ joints: number[7], dt: 秒 }] — dt 為到下一點嘅時間間隔。',
    body: `{
  "name": "wave-hello",
  "description": "演示揮手動作",
  "points": [
    { "joints": [0, 0.1, 0, 0.55, 0, 0, 0], "dt": 0.5 },
    { "joints": [0.4, 0.9, 0, 1.4, 0, 0.3, 0.6], "dt": 1.2 },
    { "joints": [0.4, 0.9, 0, 1.0, 0, -0.3, -0.6], "dt": 0.8 }
  ]
}`,
    curl: `curl -X POST http://<host>:3000/api/trajectories \\
  -H "Content-Type: application/json" \\
  -d '{"name":"wave","points":[{"joints":[0,0.1,0,0.55,0,0,0],"dt":0.5},{"joints":[0.4,0.9,0,1.4,0,0.3,0.6],"dt":1.0}]}'`,
    response: `{
  "ok": true,
  "data": { "id": "cm...", "name": "wave-hello", "pointCount": 3, "duration": 2.5 }
}`,
  },
  {
    method: 'POST',
    path: '/api/trajectories/{id}/execute',
    title: '回放軌跡',
    desc: '逐點 goto + cosine 插補回放。speed: 0.25–2.0 倍率。E-stop / 指令被拒時自動中止；同時只容許一個回放。',
    body: `{
  "speed": 1.0
}`,
    curl: `curl -X POST http://<host>:3000/api/trajectories/<traj_id>/execute \\
  -H "Content-Type: application/json" \\
  -d '{"speed":1.0}'`,
    response: `{
  "ok": true,
  "data": { "trajectoryId": "...", "name": "wave-hello", "pointCount": 3, "speed": 1.0 }
}`,
  },
  {
    method: 'GET',
    path: '/api/trajectories/playback',
    title: '回放進度查詢',
    desc: '輪詢回放狀態：當前點 / 總點數 / 進度百分比 / 中止原因。',
    curl: 'curl http://<host>:3000/api/trajectories/playback',
    response: `{
  "ok": true,
  "data": {
    "running": true, "status": "running",
    "trajectoryName": "wave-hello",
    "point": 2, "total": 3, "progress": 0.67
  }
}`,
  },
  {
    method: 'POST',
    path: '/api/trajectories/playback/cancel',
    title: '取消回放',
    desc: '取消進行中嘅回放 — 即時發送 stop 指令停低機械臂。',
    curl: 'curl -X POST http://<host>:3000/api/trajectories/playback/cancel',
    response: `{
  "ok": true,
  "data": { "message": "已請求取消，機械臂即將停止" }
}`,
  },
  {
    method: 'POST',
    path: '/api/keys',
    title: '建立 API Key',
    desc: '角色：viewer（唯讀）/ operator（一般控制）/ admin（全部含危險指令）。完整 key 只回傳一次。',
    body: `{
  "name": "python-script",
  "role": "operator"
}`,
    curl: `curl -X POST http://<host>:3000/api/keys \\
  -H "Content-Type: application/json" \\
  -d '{"name":"python-script","role":"operator"}'`,
    response: `{
  "ok": true,
  "data": {
    "id": "cm...", "name": "python-script", "role": "operator",
    "apiKey": "r1a_sk_a1b2c3d4e5f6..."
  }
}`,
  },
  {
    method: 'PATCH',
    path: '/api/keys/{id}',
    title: '更新 API Key',
    desc: '改名 / 切換角色 / 啟用停用。身體：{ name?, role?, active? }。',
    curl: `curl -X PATCH http://<host>:3000/api/keys/<key_id> \\
  -H "Content-Type: application/json" \\
  -d '{"active":false}'`,
    response: `{
  "ok": true,
  "data": { "id": "...", "name": "python-script", "role": "operator", "active": false }
}`,
  },
  {
    method: 'POST',
    path: '/api/keys/{id}/regenerate',
    title: '重新生成 API Key',
    desc: '生成新 key，舊 key 即時失效。',
    curl: 'curl -X POST http://<host>:3000/api/keys/<key_id>/regenerate',
    response: `{
  "ok": true,
  "data": { "apiKey": "r1a_sk_newkey..." }
}`,
  },
  {
    method: 'POST',
    path: '/api/system/configure',
    title: '驅動模式配置',
    desc: '生命周期管理。action: configure | activate | deactivate | cleanup。mode: simulation | serial | bridge。',
    body: `{
  "action": "configure",
  "mode": "bridge",
  "port": "127.0.0.1:15000",
  "baudrate": 6000000
}`,
    curl: `curl -X POST http://<host>:3000/api/system/configure \\
  -H "Content-Type: application/json" \\
  -d '{"action":"configure","mode":"bridge","port":"127.0.0.1:15000"}'`,
    response: `{
  "ok": true,
  "state": { "lifecycle": "active", "driverMode": "bridge", ... }
}`,
  },
]

const METHOD_COLOR: Record<string, string> = {
  GET: 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10',
  POST: 'border-amber-500/50 text-amber-400 bg-amber-500/10',
  DELETE: 'border-red-500/50 text-red-400 bg-red-500/10',
  PATCH: 'border-fuchsia-500/50 text-fuchsia-400 bg-fuchsia-500/10',
}

const PY_WS_EXAMPLE = `# WebSocket 即時遙測（經 rosbridge 風格閘道）
# pip install "python-socketio[client]"
import socketio, time

sio = socketio.Client()

@sio.on('topic:/joint_states')
def on_joints(data):
    for i, j in enumerate(data['joints'], 1):
        print(f"J{i}: q={j['q']:.3f} dq={j['dq']:.3f}")

sio.connect('http://<host>', socketio_path='/', transports=['websocket'])
sio.emit('subscribe', {'topics': ['/joint_states']})

# 發送指令（帶 ack 回呼）
sio.emit('command', {'type': 'home'}, callback=lambda r: print(r))
time.sleep(30)`

const NODE_WS_EXAMPLE = `// Node.js 客戶端 — 即時遙測 + 指令
import { io } from 'socket.io-client'

const socket = io('http://<host>/?XTransformPort=3003', { path: '/' })

socket.on('connect', () => {
  socket.emit('subscribe', { topics: ['/joint_states', '/robot_state'] })
})

socket.on('topic:/joint_states', (d) => {
  console.log('關節狀態 @10Hz:', d.joints.map(j => j.q.toFixed(3)))
})

// 發送 goto 指令
socket.emit('command', {
  type: 'goto',
  joints: [0.5, 0.35, 0, 1.2, 0, 0.2, 0],
  duration: 2.0,
}, (ack) => console.log('結果:', ack))`

export function ApiDocs() {
  const [copied, setCopied] = useState<string | null>(null)

  const copy = (text: string, key: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 1500)
    })
  }

  return (
    <div className="space-y-4">
      {/* 總覽 */}
      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <BookOpen className="h-4 w-4 text-amber-400" aria-hidden />
            API 介面總覽
          </CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            平台提供兩類介面：<strong className="text-zinc-300">REST API</strong>（一次性請求，適合整合）
            同 <strong className="text-zinc-300">WebSocket API</strong>（即時遙測 @10Hz，rosbridge 風格 pub/sub）。
            所有關節數值使用 <span className="font-mono text-amber-400/90">URDF frame (rad)</span>。
            外部程序調用時以 <code className="font-mono text-amber-400/90">X-API-Key</code> header 認證
            （到 API Keys 頁建立），角色權限：viewer 唯讀 · operator 一般控制 · admin 全部。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
              <div className="text-xs font-semibold text-zinc-200 mb-1">REST API</div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                埠 3000，JSON over HTTP。控制、狀態、姿勢、軌跡、金鑰管理、日誌全功能。
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
              <div className="text-xs font-semibold text-zinc-200 mb-1">WebSocket Topics</div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                <span className="font-mono text-zinc-400">/joint_states</span> ·{' '}
                <span className="font-mono text-zinc-400">/robot_state</span> ·{' '}
                <span className="font-mono text-zinc-400">/events</span>（subscribe 指令訂閱）
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
              <div className="text-xs font-semibold text-zinc-200 mb-1">安全設計</div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                關節限制驗證 · 指令去抖 30ms · E-stop 鎖定 · 完整審計日誌
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 端點列表 */}
      {ENDPOINTS.map((ep) => (
        <Card key={ep.path + ep.method} className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn('font-mono text-[11px] font-bold', METHOD_COLOR[ep.method])}>
                {ep.method}
              </Badge>
              <code className="font-mono text-sm text-zinc-100">{ep.path}</code>
            </div>
            <CardTitle className="text-sm text-zinc-300">{ep.title}</CardTitle>
            <CardDescription className="text-xs leading-relaxed">{ep.desc}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="curl" className="w-full">
              <TabsList className="bg-zinc-950 h-8">
                {['curl', 'python'].map((lang) => (
                  <TabsTrigger
                    key={lang}
                    value={lang}
                    disabled={lang === 'python' && !ep.python}
                    className="text-[11px] h-6 data-[state=active]:bg-zinc-800"
                  >
                    {lang === 'curl' ? 'cURL' : 'Python'}
                  </TabsTrigger>
                ))}
                {ep.body && (
                  <TabsTrigger value="body" className="text-[11px] h-6 data-[state=active]:bg-zinc-800">
                    Body
                  </TabsTrigger>
                )}
                <TabsTrigger value="response" className="text-[11px] h-6 data-[state=active]:bg-zinc-800">
                  Response
                </TabsTrigger>
              </TabsList>
              <TabsContent value="curl">
                <CodeBlock code={ep.curl} onCopy={() => copy(ep.curl, ep.path + '-curl')} copied={copied === ep.path + '-curl'} />
              </TabsContent>
              {ep.python && (
                <TabsContent value="python">
                  <CodeBlock code={ep.python} onCopy={() => copy(ep.python, ep.path + '-py')} copied={copied === ep.path + '-py'} />
                </TabsContent>
              )}
              {ep.body && (
                <TabsContent value="body">
                  <CodeBlock code={ep.body} onCopy={() => copy(ep.body, ep.path + '-body')} copied={copied === ep.path + '-body'} />
                </TabsContent>
              )}
              <TabsContent value="response">
                <CodeBlock code={ep.response} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ))}

      {/* WebSocket 指南 */}
      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-zinc-200">
            WebSocket 即時遙測（rosbridge 風格）
          </CardTitle>
          <CardDescription className="text-xs">
            subscribe → 接收 topic 推送 @10Hz；command 帶 ack 回呼。內部埠 3003，外部經閘道存取。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="node" className="w-full">
            <TabsList className="bg-zinc-950 h-8">
              <TabsTrigger value="node" className="text-[11px] h-6 data-[state=active]:bg-zinc-800">
                Node.js
              </TabsTrigger>
              <TabsTrigger value="python" className="text-[11px] h-6 data-[state=active]:bg-zinc-800">
                Python
              </TabsTrigger>
            </TabsList>
            <TabsContent value="node">
              <CodeBlock code={NODE_WS_EXAMPLE} onCopy={() => copy(NODE_WS_EXAMPLE, 'ws-node')} copied={copied === 'ws-node'} />
            </TabsContent>
            <TabsContent value="python">
              <CodeBlock code={PY_WS_EXAMPLE} onCopy={() => copy(PY_WS_EXAMPLE, 'ws-py')} copied={copied === 'ws-py'} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

function CodeBlock({ code, onCopy, copied }: { code: string; onCopy?: () => void; copied?: boolean }) {
  return (
    <div className="relative group rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden">
      {onCopy && (
        <button
          onClick={onCopy}
          className="absolute right-2 top-2 z-10 rounded-md border border-zinc-700 bg-zinc-900 p-1.5 text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-zinc-200 focus:opacity-100"
          aria-label="複製代碼"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      )}
      <pre className="overflow-x-auto p-3 text-[11px] leading-relaxed font-mono text-zinc-300 custom-scroll">
        <code>{code}</code>
      </pre>
    </div>
  )
}
