import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { controlPost } from '@/lib/control-client'
import { authenticateApiKey } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

/** POST /api/robot/estop — 緊急停止（最高優先級，任何狀態下可用） */
export async function POST(req: NextRequest) {
  // 認證：任何有效 key（包括 viewer）都容許觸發 E-stop — 安全優先
  const auth = await authenticateApiKey(req)
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  const res = await controlPost('/estop')
  await db.commandLog.create({
    data: {
      source: auth.user ? `api:${auth.user.name}` : 'api',
      command: 'estop',
      params: '{}',
      status: 'ok',
      message: '緊急停止已執行',
      apiUserId: auth.user?.id ?? null,
    },
  })
  return NextResponse.json(res)
}
