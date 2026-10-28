import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { controlPost } from '@/lib/control-client'
import { authenticateApiKey } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

const VALID = ['foc', 'home', 'goto', 'stop', 'zero_torque', 'clear', 'reset']

/**
 * POST /api/robot/command — 機械臂指令入口（ROS service call 等價物）
 * Body: { type, joints?: number[7], duration?: number, source?: string }
 * 認證：X-API-Key header 或 body.apiKey（可選；無 key = 內部使用者）
 * 權限：viewer ✗ / operator: foc|home|goto|stop|clear / admin: +zero_torque|reset
 */
export async function POST(req: NextRequest) {
  let body: {
    type?: string
    joints?: number[]
    duration?: number
    source?: string
    apiKey?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON body 解析失敗' }, { status: 400 })
  }

  const type = body.type
  if (!type || !VALID.includes(type)) {
    return NextResponse.json(
      { ok: false, error: `type 必須係: ${VALID.join(' | ')}` },
      { status: 400 }
    )
  }

  // API key 認證（X-API-Key header 優先，body.apiKey 兼容；無 key = 內部使用者）
  const auth = await authenticateApiKey(req, body)
  if (!auth.ok) {
    await db.commandLog.create({
      data: {
        source: 'api',
        command: type,
        params: JSON.stringify({ joints: body.joints, duration: body.duration }),
        status: 'rejected',
        message: auth.error,
      },
    })
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  // 角色權限檢查（zero_torque/reset 需要 admin）
  const permErr = auth.user ? requireCommandRole(auth.user.role, type) : null
  if (permErr) {
    await db.commandLog.create({
      data: {
        source: 'api',
        command: type,
        params: JSON.stringify({ joints: body.joints, duration: body.duration }),
        status: 'rejected',
        message: permErr,
        apiUserId: auth.user?.id,
      },
    })
    return NextResponse.json({ ok: false, error: permErr }, { status: 403 })
  }

  const res = await controlPost<{ message?: string }>('/command', {
    type,
    joints: body.joints,
    duration: body.duration,
    source: auth.user ? `api:${auth.user.name}` : (body.source ?? 'api'),
  })

  // 寫入指令日誌（audit trail）
  await db.commandLog.create({
    data: {
      source: auth.user ? 'api' : (body.source ?? 'api'),
      command: type,
      params: JSON.stringify({ joints: body.joints, duration: body.duration }),
      status: res.ok ? 'ok' : 'rejected',
      message: res.ok ? (res.message ?? null) : (res.error ?? null),
      latencyMs: res.latencyMs ?? null,
      apiUserId: auth.user?.id ?? null,
    },
  })

  return NextResponse.json(res, { status: res.ok ? 200 : 400 })
}

const ADMIN_COMMANDS = ['zero_torque', 'reset']
const ROLE_RANK: Record<string, number> = { viewer: 0, operator: 1, admin: 2 }

function requireCommandRole(role: string, command: string): string | null {
  if (ADMIN_COMMANDS.includes(command)) {
    return ROLE_RANK[role] >= ROLE_RANK.admin ? null : `指令 ${command} 需要 admin 權限（當前角色: ${role}）`
  }
  return ROLE_RANK[role] >= ROLE_RANK.operator ? null : `控制指令需要 operator 以上權限（當前角色: ${role}）`
}
