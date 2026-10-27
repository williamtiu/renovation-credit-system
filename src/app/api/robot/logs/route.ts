import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/** GET /api/robot/logs?limit=50&offset=0 — 指令日誌（audit trail） */
export async function GET(req: NextRequest) {
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '50', 10) || 50, 200)
  const offset = parseInt(req.nextUrl.searchParams.get('offset') ?? '0', 10) || 0

  const [logs, total] = await Promise.all([
    db.commandLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: { apiUser: { select: { name: true } } },
    }),
    db.commandLog.count(),
  ])

  return NextResponse.json({ ok: true, data: logs, total, limit, offset })
}
