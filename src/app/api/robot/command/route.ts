import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { controlPost } from '@/lib/control-client'

export const dynamic = 'force-dynamic'

const VALID = ['foc', 'home', 'goto', 'stop', 'zero_torque', 'clear', 'reset']

/**
 * POST /api/robot/command — 機械臂指令入口（ROS service call 等價物）
 * Body: { type, joints?: number[7], duration?: number, source?: string }
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

  // API key 認證（可選：提供 apiKey 就驗證；web 介面唔需要）
  let apiUserId: string | undefined
  if (body.apiKey) {
    const user = await db.apiUser.findUnique({ where: { apiKey: body.apiKey } })
    if (!user || !user.active) {
      return NextResponse.json({ ok: false, error: 'API key 無效' }, { status: 401 })
    }
    apiUserId = user.id
    await db.apiUser.update({ where: { id: user.id }, data: { lastUsedAt: new Date() } })
  }

  const res = await controlPost<{ message?: string }>('/command', {
    type,
    joints: body.joints,
    duration: body.duration,
    source: body.source ?? 'api',
  })

  // 寫入指令日誌（audit trail）
  await db.commandLog.create({
    data: {
      source: apiUserId ? 'api' : (body.source ?? 'api'),
      command: type,
      params: JSON.stringify({ joints: body.joints, duration: body.duration }),
      status: res.ok ? 'ok' : 'rejected',
      message: res.ok ? (res.message ?? null) : (res.error ?? null),
      latencyMs: res.latencyMs ?? null,
      apiUserId: apiUserId ?? null,
    },
  })

  return NextResponse.json(res, { status: res.ok ? 200 : 400 })
}
