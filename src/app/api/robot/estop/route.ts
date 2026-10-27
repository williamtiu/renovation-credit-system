import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { controlPost } from '@/lib/control-client'

export const dynamic = 'force-dynamic'

/** POST /api/robot/estop — 緊急停止（最高優先級，任何狀態下可用） */
export async function POST(_req: NextRequest) {
  const res = await controlPost('/estop')
  await db.commandLog.create({
    data: {
      source: 'api',
      command: 'estop',
      params: '{}',
      status: 'ok',
      message: '緊急停止已執行',
    },
  })
  return NextResponse.json(res)
}
