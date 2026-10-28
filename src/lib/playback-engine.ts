/**
 * 軌跡回放引擎（module-level 單例）
 *
 * 對應 ROS2 嘅 joint trajectory action server 概念：
 *   - execute  = 接收目標 → 逐點 goto（cosine 插補由 controller 完成）
 *   - cancel   = 取消目標（發送 stop 即刻停止）
 *   - status   = 輪詢進度（cycle 輪次 + point/total 點數）
 *   - loop     = 循環模式：loop = 1 單次；loop = N 播 N 次；loop = 0 無限循環
 *
 * 狀態存放喺 module scope — 同一 Next.js 進程內所有 route 共享。
 */

import { db } from '@/lib/db'
import { controlPost, controlGet } from '@/lib/control-client'

export interface TrajPoint {
  joints: number[]
  dt: number
}

export interface PlaybackState {
  trajectoryId: string
  trajectoryName: string
  point: number // 當前執行到第幾點（1-based）
  total: number
  cycle: number // 當前第幾輪（1-based）
  totalCycles: number // 0 = 無限循環
  loop: number // 請求嘅循環次數（0 = 無限）
  speed: number
  running: boolean
  status: 'running' | 'completed' | 'aborted' | 'failed'
  message: string
  startedAt: number
  endedAt: number | null
  source: string
}

let playback: PlaybackState | null = null
let cancelRequested = false

/** 循環之間暫停（秒）— 畀機械臂 FOC 穩定同避免指令風暴 */
const CYCLE_PAUSE_S = 0.4

export function getPlayback(): PlaybackState | null {
  return playback
}

export function isCancelRequested(): boolean {
  return cancelRequested
}

/** 開始回放（異步 fire-and-forget，立即返回） */
export function startPlayback(
  trajectoryId: string,
  trajectoryName: string,
  points: TrajPoint[],
  speed: number,
  source: string,
  loop = 1
): void {
  cancelRequested = false
  playback = {
    trajectoryId,
    trajectoryName,
    point: 0,
    total: points.length,
    cycle: 0,
    totalCycles: loop,
    loop,
    speed,
    running: true,
    status: 'running',
    message: '',
    startedAt: Date.now(),
    endedAt: null,
    source,
  }
  void runPlayback(points)
}

/** 請求取消（下一步前生效）+ 立即發 stop 停低機械臂 */
export async function cancelPlayback(): Promise<void> {
  cancelRequested = true
  if (playback?.running) {
    await controlPost('/command', { type: 'stop', source: 'traj:cancel' })
  }
}

function updatePlayback(patch: Partial<PlaybackState>): void {
  if (playback) playback = { ...playback, ...patch }
}

/** 檢查 E-stop 聯鎖（回傳 true = 需中止） */
async function estopTriggered(): Promise<boolean> {
  const st = await controlGet<{ estop?: boolean }>('/state')
  return !!(st.ok && st.data?.estop)
}

async function runPlayback(points: TrajPoint[]): Promise<void> {
  const name = playback?.trajectoryName ?? 'unknown'
  const speed = playback?.speed ?? 1
  const loop = playback?.loop ?? 1
  const infinite = loop === 0
  const targetCycles = infinite ? Number.POSITIVE_INFINITY : Math.max(1, Math.floor(loop))

  let executed = 0 // 累計執行點數（跨輪）
  let completedCycles = 0
  let status: 'completed' | 'aborted' | 'failed' = 'completed'
  let message = ''

  try {
    for (let cycle = 1; cycle <= targetCycles; cycle++) {
      updatePlayback({ cycle, point: 0 })
      completedCycles = cycle

      // 每輪開始前：取消 / E-stop 檢查 + 輪間暫停（第二輪起）
      if (cycle > 1) {
        if (cancelRequested) {
          status = 'aborted'
          message = '使用者取消回放'
          break
        }
        if (await estopTriggered()) {
          status = 'aborted'
          message = `檢測到緊急停止，回放於第 ${cycle} 輪開始前中止`
          break
        }
        await sleep(CYCLE_PAUSE_S * 1000)
      }

      for (let i = 0; i < points.length; i++) {
        const p = points[i]
        updatePlayback({ point: i + 1 })

        if (cancelRequested) {
          status = 'aborted'
          message = '使用者取消回放'
          break
        }

        // 每點 duration：dt / speed；最後一點適度縮短（goto 完成後仍有 FOC 保持）
        const dt = i === points.length - 1 ? Math.max(p.dt * 0.8, 0.3) : p.dt
        const duration = Math.min(Math.max(dt / speed, 0.05), 30)

        const res = await controlPost('/command', {
          type: 'goto',
          joints: p.joints,
          duration,
          source: `traj:${name}#${cycle}`,
        })
        if (!res.ok) {
          status = 'failed'
          message = `第 ${cycle} 輪第 ${i + 1} 點被拒: ${res.error ?? res.message ?? '未知錯誤'}`
          break
        }
        executed++

        await sleep(duration * 1000)

        if (cancelRequested) {
          status = 'aborted'
          message = '使用者取消回放'
          break
        }
        // 每步檢查 E-stop 聯鎖
        if (await estopTriggered()) {
          status = 'aborted'
          message = `檢測到緊急停止，回放於第 ${cycle} 輪第 ${i + 1} 點中止`
          break
        }
      }

      if (status !== 'completed') break
    }

    if (status === 'completed' && infinite) {
      // 理論上無限循環只會經 cancel/estop 離開；防禦性處理
      status = 'aborted'
      message = '無限循環回放已停止'
    }
  } catch (err) {
    status = 'failed'
    message = `回放異常: ${(err as Error).message}`
  }

  const cycleText = infinite
    ? `無限循環已執行 ${completedCycles} 輪`
    : `${completedCycles}/${targetCycles} 輪`

  updatePlayback({ running: false, status, message, endedAt: Date.now() })

  await db.commandLog.create({
    data: {
      source: 'web',
      command: 'trajectory_execute',
      params: JSON.stringify({ trajectory: name, pointCount: points.length, speed, loop }),
      status: status === 'completed' ? 'ok' : status,
      message:
        status === 'completed'
          ? `回放完成: ${name}（${cycleText}，共 ${executed} 點）`
          : `回放中止: ${name} — ${message}（${cycleText}，已執行 ${executed} 點）`,
    },
  }).catch(() => undefined)
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
