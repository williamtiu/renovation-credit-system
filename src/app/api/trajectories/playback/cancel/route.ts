import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiKey } from '@/lib/api-auth'
import { cancelPlayback, getPlayback } from '@/lib/playback-engine'

export const dynamic = 'force-dynamic'

/** POST /api/trajectories/playback/cancel — 取消進行中嘅回放（即時 stop） */
export async function POST(req: NextRequest) {
  const auth = await authenticateApiKey(req)
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  const current = getPlayback()
  if (!current?.running) {
    return NextResponse.json({ ok: false, error: '冇進行中嘅回放' }, { status: 409 })
  }

  await cancelPlayback()
  return NextResponse.json({ ok: true, data: { message: '已請求取消，機械臂即將停止' } })
}
