import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { controlGet, controlPost } from '@/lib/control-client'
import { authenticateApiKey } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

/**
 * GET  /api/robot/jog — ramp 狀態（rate / targets / commanded / keepalive 次數）
 * POST /api/robot/jog — { rate: number } 設定 ramp 速度，或 { clear: true } 清除 targets
 *
 * ramp 速度直接決定 lag 幾快逼近 abort 邊界，所以佢係操作參數，要經審計。
 */
export async function GET() {
  const res = await controlGet('/jog')
  return NextResponse.json(res, { status: res.ok ? 200 : 400 })
}

export async function POST(req: NextRequest) {
  const auth = await authenticateApiKey(req)
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }
  const body = await req.json().catch(() => ({}))

  const rate = typeof body.rate === 'number' ? body.rate : undefined
  const clear = body.clear === true
  if (rate === undefined && !clear) {
    return NextResponse.json({ ok: false, error: '需要 rate (rad/s) 或 clear:true' }, { status: 400 })
  }
  if (rate !== undefined && (rate < 0.01 || rate > 1.0)) {
    return NextResponse.json(
      { ok: false, error: 'rate 要喺 0.01 至 1.0 rad/s 之間（上限係實測MAX_JOG_SPEED）' },
      { status: 400 }
    )
  }

  const res = await controlPost('/jog', body)

  await db.commandLog.create({
    data: {
      source: auth.user ? `api:${auth.user.name}` : 'web',
      command: 'jog:configure',
      params: JSON.stringify({ rate, clear }),
      status: res.ok ? 'ok' : 'rejected',
      message: res.ok ? (res.message ?? null) : (res.error ?? null),
      apiUserId: auth.user?.id ?? null,
    },
  })

  return NextResponse.json(res, { status: res.ok ? 200 : 400 })
}
