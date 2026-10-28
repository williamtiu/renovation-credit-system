import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { controlGet, controlPost } from '@/lib/control-client'
import { authenticateApiKey } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

const ACTIONS = ['arm-monitor', 'unlock', 'lock', 'beat'] as const

/**
 * GET /api/robot/guard — 安全閘狀態（只讀）
 * POST /api/robot/guard — { action, phrase?, code?, reason? }
 *
 * 授權閘設計：arm-monitor / unlock 要同時帶正確 phrase 同 console code。
 * 冇帶住嘅請求會喺到達任何傳輸代碼之前被控制服務拒絕（403），
 * 所以呢個端點本身唔會移動機械臂 — 空 body 探測永遠安全。
 */
export async function GET() {
  const res = await controlGet('/guard')
  return NextResponse.json(res, { status: res.ok ? 200 : 502 })
}

export async function POST(req: NextRequest) {
  const auth = await authenticateApiKey(req)
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }
  // 解鎖運動屬高危：只容許 admin / operator
  const body = await req.json().catch(() => ({}))
  const action = body.action as (typeof ACTIONS)[number]
  if (!ACTIONS.includes(action)) {
    return NextResponse.json(
      { ok: false, error: 'action 必須係 arm-monitor | unlock | lock | beat' },
      { status: 400 }
    )
  }

  const res = await controlPost(`/guard/${action}`, {
    phrase: body.phrase,
    code: body.code,
    reason: body.reason,
  })

  await db.commandLog.create({
    data: {
      source: auth.user ? `api:${auth.user.name}` : 'web',
      command: `guard:${action}`,
      // phrase/code 唔入庫 — 审计只需要邊個嘗試咗邊樣嘢
      params: JSON.stringify({ reason: body.reason ?? null }),
      status: res.ok ? 'ok' : 'rejected',
      message: res.ok ? (res.message ?? null) : (res.error ?? null),
      apiUserId: auth.user?.id ?? null,
    },
  })

  return NextResponse.json(res, { status: res.ok ? 200 : 403 })
}
