/**
 * 軌跡回放引擎（module-level 單例）
 *
 * 對應 ROS2 嘅 joint trajectory action server 概念：
 *   - execute  = 接收目標 → 逐點 goto（cosine 插補由 controller 完成）
 *   - cancel   = 取消目標（發送 stop 即刻停止）
 *   - status   = 輪詢進度（point/total）
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
  source: string
): void {
  cancelRequested = false
  playback = {
    trajectoryId,
    trajectoryName,
    point: 0,
    total: points.length,
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

async function runPlayback(points: TrajPoint[]): Promise<void> {
  const name = playback?.trajectoryName ?? 'unknown'
  const speed = playback?.speed ?? 1
  let executed = 0
  let status: 'completed' | 'aborted' | 'failed' = 'completed'
  let message = ''

  try {
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
        source: `traj:${name}`,
      })
      if (!res.ok) {
        status = 'failed'
        message = `第 ${i + 1} 點被拒: ${res.error ?? res.message ?? '未知錯誤'}`
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
      const st = await controlGet<{ estop?: boolean }>('/state')
      if (st.ok && st.data?.estop) {
        status = 'aborted'
        message = '檢測到緊急停止，回放中止'
        break
      }
    }
  } catch (err) {
    status = 'failed'
    message = `回放異常: ${(err as Error).message}`
  }

  updatePlayback({ running: false, status, message, endedAt: Date.now() })

  await db.commandLog.create({
    data: {
      source: 'web',
      command: 'trajectory_execute',
      params: JSON.stringify({ trajectory: name, pointCount: points.length, speed }),
      status: status === 'completed' ? 'ok' : status,
      message:
        status === 'completed'
          ? `回放完成: ${name}（${executed}/${points.length} 點）`
          : `回放中止: ${name} — ${message}（已執行 ${executed}/${points.length} 點）`,
    },
  }).catch(() => undefined)
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
