'use client'

/**
 * useRobot — 機械人即時狀態 Hook
 * 
 * 連接 WebSocket Gateway (:3003，經 Caddy 閘道) 訂閱 ROS topics：
 *   /joint_states — 關節遙測 @10Hz
 *   /robot_state  — 整體狀態 @10Hz
 *   /events       — 事件流
 * 
 * WS 斷線時自動 fallback 到 REST 輪詢（5s），保證儀表板永遠有數據。
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

export interface JointState {
  q: number
  dq: number
  tau: number
  temp: number
}

export interface GuardStatus {
  locked: boolean
  monitorArmed: boolean
  txPackets: number
  txBlocked: number
  lockReason: string
  monitorReason: string
  nonceHint: string
}

export interface BusStatus {
  rxBytes: number
  rxPackets: number
  crcErrors: number
  resyncs: number
  lastRx: number | null
  holdCycles: number
  probeCycles: number
  zeroDeclared: boolean
  faults: Array<{ joint: number; errorCode: number }>
}

export interface RobotState {
  lifecycle: string
  connected: boolean
  driverMode: string
  controlMode: string
  estop: boolean
  errorCode: number
  errorMessage: string | null
  joints: JointState[]
  moving: boolean
  moveRemaining: number
  serial: {
    port: string
    baudrate: number
    calibPath?: string
    zeroPath?: string
    rateHz?: number
    holdKp?: number
    holdKd?: number
  }
  guard?: GuardStatus
  bus?: BusStatus
  telemetryHz: number
  uptime: number
}

export interface JointMeta {
  id: number
  name: string
  label: string
  min: number
  max: number
  vMax: number
  tauMax: number
  home: number
}

export interface ControlEvent {
  ts: number
  level: string
  message: string
}

export interface CommandAck {
  ok: boolean
  message: string
  latencyMs?: number
}

export type WsStatus = 'connecting' | 'live' | 'polling'

export function useRobot() {
  const [state, setState] = useState<RobotState | null>(null)
  const [jointsMeta, setJointsMeta] = useState<JointMeta[]>([])
  const [events, setEvents] = useState<ControlEvent[]>([])
  const [wsStatus, setWsStatus] = useState<WsStatus>('connecting')
  const [telemetryHistory, setTelemetryHistory] = useState<Array<Record<string, number>>>(
    []
  )
  const socketRef = useRef<Socket | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const historyRef = useRef<Array<Record<string, number>>>([])
  const tsRef = useRef(0)

  // ---------- REST helpers ----------
  const api = useCallback(
    async (path: string, init?: RequestInit) => {
      try {
        const res = await fetch(path, {
          ...init,
          headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
        })
        return await res.json()
      } catch (err) {
        return { ok: false, error: (err as Error).message }
      }
    },
    []
  )

  const sendCommand = useCallback(
    async (type: string, joints?: number[], duration?: number): Promise<CommandAck> => {
      const res = await api('/api/robot/command', {
        method: 'POST',
        body: JSON.stringify({ type, joints, duration, source: 'web' }),
      })
      return { ok: !!res.ok, message: res.message ?? res.error ?? 'unknown', latencyMs: res.latencyMs }
    },
    [api]
  )

  const estop = useCallback(async (): Promise<CommandAck> => {
    const res = await api('/api/robot/estop', { method: 'POST' })
    return { ok: !!res.ok, message: res.ok ? '緊急停止已執行' : (res.error ?? '失敗') }
  }, [api])

  // ---------- 初始載入關節元數據 ----------
  useEffect(() => {
    void api('/api/robot/joints').then((res) => {
      if (res.ok && Array.isArray(res.data)) setJointsMeta(res.data)
    })
  }, [api])

  // ---------- WebSocket 連線 ----------
  useEffect(() => {
    // 經 Caddy 閘道轉發到 ws-gateway (:3003) — 查詢參數指定埠，路徑必須係 '/'
    // io() 建構唔會同步拋錯（連線錯誤經 connect_error 事件回報），因此無需 try/catch
    const socket: Socket = io('/?XTransformPort=3003', {
      path: '/',
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 4000,
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setWsStatus('live')
      socket!.emit('subscribe', { topics: ['/joint_states', '/robot_state', '/events'] })
    })

    socket.on('disconnect', () => setWsStatus('polling'))

    socket.on('connect_error', () => setWsStatus('polling'))

    socket.on('topic:/robot_state', (s: RobotState) => {
      setState(s)
    })

    socket.on('topic:/joint_states', (d: { ts: number; joints: JointState[] }) => {
      setState((prev) => (prev ? { ...prev, joints: d.joints, moving: d.moving, moveRemaining: d.moveRemaining } : prev))
      // 遙測歷史（圖表用，保留 120 點 = ~12 秒）
      const row: Record<string, number> = { t: tsRef.current++ }
      d.joints.forEach((j, i) => (row[`J${i + 1}`] = j.q))
      historyRef.current.push(row)
      if (historyRef.current.length > 120) historyRef.current.shift()
      setTelemetryHistory([...historyRef.current])
    })

    socket.on('topic:/events', (evs: ControlEvent[]) => setEvents(evs))

    // ---------- Fallback 輪詢 ----------
    const startPolling = () => {
      if (pollRef.current) return
      pollRef.current = setInterval(async () => {
        const res = await api('/api/robot/state')
        if (res.ok && res.data) {
          setState(res.data)
          const row: Record<string, number> = { t: tsRef.current++ }
          res.data.joints.forEach((j: JointState, i: number) => (row[`J${i + 1}`] = j.q))
          historyRef.current.push(row)
          if (historyRef.current.length > 120) historyRef.current.shift()
          setTelemetryHistory([...historyRef.current])
        }
      }, 500)
    }
    startPolling() // WS 連上後 topic 推送會覆蓋；polling 保留作安全網
    // 等 WS live 之後就停 polling（topic 推送係主動脈）
    const stopPollingWhenLive = setInterval(() => {
      if (socket?.connected && pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
        clearInterval(stopPollingWhenLive)
      }
    }, 2000)

    return () => {
      socket?.close()
      if (pollRef.current) clearInterval(pollRef.current)
      clearInterval(stopPollingWhenLive)
    }
  }, [api])

  return {
    state,
    jointsMeta,
    events,
    wsStatus,
    telemetryHistory,
    sendCommand,
    estop,
    api,
  }
}

export type RobotContext = ReturnType<typeof useRobot>
