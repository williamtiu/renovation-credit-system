/**
 * WebSocket Gateway — rosbridge 風格即時閘道 (port 3003)
 * 
 * 職責：
 *   1. 訂閱 Robot Control Service 嘅 SSE 遙測流（/joint_states + /robot_state）
 *   2. 以 socket.io rooms 實現 ROS2 topic 訂閱模型：
 *        client → emit('subscribe', { topics: ['/joint_states', '/robot_state', '/events'] })
 *        server → 廣播到對應 room
 *   3. 接受 WS 指令並轉發到 Control Service（service call 模型）：
 *        client → emit('command', { type, joints?, duration? }, ack)
 *   4. 節流：遙測以 ~10Hz 轉發俾瀏覽器（人眼足夠，慳頻寬）
 */

import { createServer } from 'http'
import { Server, Socket } from 'socket.io'

const ROBOT_CONTROL = process.env.ROBOT_CONTROL_URL ?? 'http://localhost:3002'
const PORT = 3003
const BROADCAST_HZ = 10 // 轉發俾瀏覽器嘅頻率

interface RobotStateLite {
  lifecycle: string
  connected: boolean
  driverMode: string
  controlMode: string
  estop: boolean
  errorCode: number
  moving: boolean
  moveRemaining: number
  joints: Array<{ q: number; dq: number; tau: number; temp: number }>
  uptime: number
}

const httpServer = createServer()
const io = new Server(httpServer, {
  // DO NOT change the path, it is used by Caddy to forward the request
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// ---------- 訂閱 Control Service SSE ----------

let latestState: RobotStateLite | null = null
let lastBroadcastTs = 0
const controlEvents: Array<{ ts: number; level: string; message: string }> = []

async function subscribeControlService(): Promise<void> {
  try {
    const res = await fetch(`${ROBOT_CONTROL}/stream`, {
      headers: { Accept: 'text/event-stream' },
    })
    if (!res.ok || !res.body) throw new Error(`SSE 連線失敗: HTTP ${res.status}`)

    const reader = (res.body as ReadableStream<Uint8Array>).getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // 解析 SSE 幀
      let idx: number
      while ((idx = buffer.indexOf('\n\n')) >= 0) {
        const frame = buffer.slice(0, idx)
        buffer = buffer.slice(idx + 2)
        const lines = frame.split('\n')
        const eventLine = lines.find(l => l.startsWith('event: '))
        const dataLine = lines.find(l => l.startsWith('data: '))
        if (!dataLine) continue
        const event = eventLine?.slice(7).trim() ?? 'message'
        if (event === 'state') {
          try {
            latestState = JSON.parse(dataLine.slice(6)) as RobotStateLite
            broadcastThrottled()
          } catch { /* 忽略壞幀 */ }
        }
      }
    }
  } catch (err) {
    console.error('SSE 訂閱中斷，3 秒後重連:', (err as Error).message)
    await new Promise(r => setTimeout(r, 3000))
  }
  // 重連
  void subscribeControlService()
}

function broadcastThrottled(): void {
  const now = Date.now()
  if (now - lastBroadcastTs < 1000 / BROADCAST_HZ) return
  lastBroadcastTs = now
  if (latestState) {
    io.to('topic:/joint_states').emit('topic:/joint_states', {
      ts: now,
      joints: latestState.joints,
      moving: latestState.moving,
      moveRemaining: latestState.moveRemaining,
    })
    io.to('topic:/robot_state').emit('topic:/robot_state', latestState)
  }
}

// 每 2 秒拉一次事件日誌
async function pollEvents(): Promise<void> {
  try {
    const res = await fetch(`${ROBOT_CONTROL}/events`)
    if (res.ok) {
      const body = await res.json()
      if (Array.isArray(body.data)) {
        controlEvents.splice(0, controlEvents.length, ...body.data.slice(0, 50))
        io.to('topic:/events').emit('topic:/events', controlEvents.slice(0, 30))
      }
    }
  } catch { /* control service 未就緒 */ }
}

// ---------- Socket.io 客戶端處理 ----------

io.on('connection', (socket: Socket) => {
  console.log(`WS 客戶端已連線: ${socket.id}`)

  // 訂閱 topic（ROS2 pub/sub 模型）
  socket.on('subscribe', (data: { topics?: string[] }) => {
    const topics = data?.topics ?? ['/joint_states', '/robot_state', '/events']
    for (const raw of topics) {
      // 標準化 room 名：容許 '/joint_states' 或 'topic:/joint_states' 兩種寫法
      const room = raw.startsWith('topic:') ? raw : `topic:${raw}`
      if (room.startsWith('topic:/')) socket.join(room)
    }
    // 立即推一次最新狀態
    if (latestState && topics.includes('/joint_states')) {
      socket.emit('topic:/joint_states', {
        ts: Date.now(),
        joints: latestState.joints,
        moving: latestState.moving,
        moveRemaining: latestState.moveRemaining,
      })
    }
    if (latestState && topics.includes('/robot_state')) {
      socket.emit('topic:/robot_state', latestState)
    }
    socket.emit('subscribed', { topics })
  })

  socket.on('unsubscribe', (data: { topics?: string[] }) => {
    for (const t of data?.topics ?? []) socket.leave(t)
  })

  // 指令轉發（service call 模型，帶 ack 回呼）
  socket.on(
    'command',
    async (data: { type: string; joints?: number[]; duration?: number }, ack?: (r: any) => void) => {
      try {
        const res = await fetch(`${ROBOT_CONTROL}/command`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, source: `ws:${socket.id.slice(0, 6)}` }),
        })
        const body = await res.json()
        ack?.({ ok: body.ok, message: body.message, latencyMs: body.latencyMs })
      } catch (err) {
        ack?.({ ok: false, message: (err as Error).message })
      }
    }
  )

  // 緊急停止
  socket.on('estop', async (ack?: (r: any) => void) => {
    try {
      const res = await fetch(`${ROBOT_CONTROL}/estop`, { method: 'POST' })
      const body = await res.json()
      ack?.({ ok: body.ok })
    } catch (err) {
      ack?.({ ok: false, message: (err as Error).message })
    }
  })

  socket.on('disconnect', () => {
    console.log(`WS 客戶端已斷開: ${socket.id}`)
  })
})

// ---------- 啟動 ----------

httpServer.listen(PORT, () => {
  console.log(`🔌 WebSocket Gateway 已啟動: ws://localhost:${PORT}`)
  console.log(`   訂閱上游: ${ROBOT_CONTROL}/stream (SSE)`)
  void subscribeControlService()
  setInterval(() => void pollEvents(), 2000)
})

process.on('SIGTERM', () => httpServer.close(() => process.exit(0)))
process.on('SIGINT', () => httpServer.close(() => process.exit(0)))
