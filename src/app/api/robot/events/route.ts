import { NextResponse } from 'next/server'
import { controlGet } from '@/lib/control-client'

export const dynamic = 'force-dynamic'

/** GET /api/robot/events — 控制器事件日誌（驅動事件、指令審計流） */
export async function GET() {
  const res = await controlGet<unknown[]>('/events')
  return NextResponse.json(res, { status: res.ok ? 200 : 503 })
}
