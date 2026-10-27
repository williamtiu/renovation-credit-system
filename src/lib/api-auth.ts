/**
 * API Key 認證模組（對應 ROS2 嘅 auth/permission 層）
 *
 * 認證模型：
 *   - 無 API Key（Web UI 本地操作）→ 視為內部使用者，保留全部權限
 *   - 有 API Key（外部程序調用）→ 強制角色檢查：
 *       viewer   唯讀（狀態/日誌/列表）
 *       operator 一般控制（foc/home/goto/stop/clear、姿勢/軌跡執行）
 *       admin    全部（包括 zero_torque / reset 等危險指令）
 *
 * Key 傳遞方式（二選一）：
 *   1. HTTP Header:  X-API-Key: r1a_sk_xxxxxxxx
 *   2. JSON Body:    { "apiKey": "r1a_sk_xxxxxxxx" }  (legacy 兼容)
 */

import { NextRequest } from 'next/server'
import { randomBytes } from 'crypto'
import { db } from '@/lib/db'

export type ApiRole = 'admin' | 'operator' | 'viewer'

export interface AuthUser {
  id: string
  name: string
  role: ApiRole
}

export interface AuthResult {
  ok: boolean
  status: number
  error?: string
  user?: AuthUser
  viaKey: boolean
}

const ROLE_RANK: Record<ApiRole, number> = { viewer: 0, operator: 1, admin: 2 }

/** 生成新 API Key: r1a_sk_ + 32 hex chars */
export function generateApiKey(): string {
  return `r1a_sk_${randomBytes(16).toString('hex')}`
}

/** Key 掩碼顯示：r1a_sk_a1b2c3d4…wxyz */
export function maskApiKey(key: string): string {
  if (key.length <= 14) return key
  return `${key.slice(0, 12)}…${key.slice(-4)}`
}

/** 從請求提取 API Key（header 優先，body 兼容） */
export function extractApiKey(req: NextRequest, body?: { apiKey?: string }): string | null {
  return req.headers.get('x-api-key') ?? body?.apiKey ?? null
}

/**
 * 認證請求：
 *   - 無 key → ok（內部使用者，viaKey=false）
 *   - 有 key → 驗證存在 + 啟用，更新 lastUsedAt
 */
export async function authenticateApiKey(
  req: NextRequest,
  body?: { apiKey?: string }
): Promise<AuthResult> {
  const key = extractApiKey(req, body)
  if (!key) return { ok: true, viaKey: false }

  const user = await db.apiUser.findUnique({ where: { apiKey: key } })
  if (!user) {
    return { ok: false, status: 401, error: 'API key 無效', viaKey: true }
  }
  if (!user.active) {
    return { ok: false, status: 403, error: `API key 已停用（${user.name}）`, viaKey: true }
  }

  await db.apiUser.update({
    where: { id: user.id },
    data: { lastUsedAt: new Date() },
  })

  return { ok: true, user: { id: user.id, name: user.name, role: user.role as ApiRole }, viaKey: true }
}

/** 檢查角色權限（無 key 內部使用者 → 全部允許） */
export function hasRole(user: AuthUser | undefined, min: ApiRole): boolean {
  if (!user) return true // 內部使用者（Web UI）
  return ROLE_RANK[user.role] >= ROLE_RANK[min]
}

/** 需要 admin 權限嘅危險指令 */
export const ADMIN_COMMANDS = ['zero_torque', 'reset']
/** viewer 不可用嘅全部控制指令 */
export const OPERATOR_COMMANDS = ['foc', 'home', 'goto', 'stop', 'clear', ...ADMIN_COMMANDS]

/** 指令權限檢查：回傳錯誤訊息或 null（通過） */
export function checkCommandPermission(user: AuthUser | undefined, command: string): string | null {
  if (!user) return null
  if (ADMIN_COMMANDS.includes(command)) {
    return hasRole(user, 'admin') ? null : `指令 ${command} 需要 admin 權限（當前角色: ${user.role}）`
  }
  return hasRole(user, 'operator') ? null : `控制指令需要 operator 以上權限（當前角色: ${user.role}）`
}
