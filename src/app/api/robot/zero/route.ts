import { NextRequest, NextResponse } from 'next/server'
import { controlPost } from '@/lib/control-client'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * POST /api/robot/zero — { action: 'capture' | 'clear' }
 *
 * capture 將機械臂現時姿勢宣告為零位（寫入 joint_zero.json，重啟會恢復）。
 * 呢個唔係運動指令 —— 佢只改變報角嘅參考點。
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const action = body.action
  if (!['capture', 'clear'].includes(action)) {
    return NextResponse.json({ ok: false, error: 'action 必須係 capture | clear' }, { status: 400 })
  }

  const res = await controlPost(`/zero/${action}`)

  await db.commandLog.create({
    data: {
      source: 'web',
      command: `zero:${action}`,
      params: JSON.stringify({}),
      status: res.ok ? 'ok' : 'rejected',
      message: res.ok ? (res.message ?? null) : (res.error ?? null),
    },
  })

  return NextResponse.json(res, { status: res.ok ? 200 : 409 })
}
