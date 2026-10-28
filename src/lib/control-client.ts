/**
 * Robot Control Service 客戶端（服務器端內部通訊）
 * Next.js API routes → http://localhost:3002 (robot-control mini-service)
 */

const CONTROL_URL = process.env.ROBOT_CONTROL_URL ?? 'http://localhost:3002'

export interface ControlCommand {
  type: 'foc' | 'home' | 'goto' | 'stop' | 'zero_torque' | 'clear' | 'reset'
  joints?: number[]
  duration?: number
  source?: string
}

export async function controlFetch<T>(
  path: string,
  init?: RequestInit
): Promise<{ ok: boolean; data?: T; error?: string; message?: string; latencyMs?: number }> {
  try {
    const res = await fetch(`${CONTROL_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      cache: 'no-store',
    })
    const body = await res.json()
    return body
  } catch (err) {
    return { ok: false, error: `控制服務連線失敗: ${(err as Error).message}（請確認 robot-control 服務已啟動）` }
  }
}

export function controlGet<T>(path: string) {
  return controlFetch<T>(path)
}

export function controlPost<T>(path: string, body?: unknown) {
  return controlFetch<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) })
}
