import { NextRequest, NextResponse } from 'next/server'
import { controlGet } from '@/lib/control-client'

export const dynamic = 'force-dynamic'

/** GET /api/robot/state — 完整機械人狀態（ROS /robot_state topic 快照） */
export async function GET(_req: NextRequest) {
  const res = await controlGet<unknown>('/state')
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: res.error }, { status: 503 })
  }
  return NextResponse.json(res)
}
