import { NextResponse } from 'next/server'
import { controlGet } from '@/lib/control-client'

export const dynamic = 'force-dynamic'

/** GET /api/robot/joints — 關節元數據（名稱、限制、Home 位置） */
export async function GET() {
  const res = await controlGet<unknown[]>('/joints')
  return NextResponse.json(res, { status: res.ok ? 200 : 503 })
}
