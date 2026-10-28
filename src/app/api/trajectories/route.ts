import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { controlPost } from '@/lib/control-client'
import { authenticateApiKey, hasRole } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export interface TrajPoint {
  joints: number[] // 7 元素 (rad)
  dt: number // 與下一點嘅時間間隔 (秒)
}

/** 驗證軌跡點格式 */
function validatePoints(points: unknown): { ok: boolean; error?: string; parsed?: TrajPoint[]; duration?: number } {
  if (!Array.isArray(points) || points.length < 2) {
    return { ok: false, error: 'points 必須係至少 2 個路徑點嘅陣列' }
  }
  if (points.length > 2000) {
    return { ok: false, error: '路徑點過多（上限 2000）' }
  }
  let duration = 0
  for (let i = 0; i < points.length; i++) {
    const p = points[i] as { joints?: unknown; dt?: unknown }
    if (!Array.isArray(p.joints) || p.joints.length !== 7 || p.joints.some((j) => typeof j !== 'number' || Number.isNaN(j))) {
      return { ok: false, error: `第 ${i + 1} 點 joints 必須係 7 元素數值陣列` }
    }
    if (typeof p.dt !== 'number' || p.dt < 0 || p.dt > 60) {
      return { ok: false, error: `第 ${i + 1} 點 dt 必須係 0-60 秒` }
    }
    if (i < points.length - 1) duration += p.dt
  }
  return { ok: true, parsed: points as TrajPoint[], duration: Math.round(duration * 100) / 100 }
}

/** GET /api/trajectories — 軌跡庫列表 */
export async function GET() {
  const trajs = await db.trajectory.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json({
    ok: true,
    data: trajs.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      duration: t.duration,
      pointCount: t.pointCount,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })),
  })
}

/**
 * POST /api/trajectories — 儲存錄製嘅軌跡
 * Body: { name, description?, points: [{ joints: number[7], dt: 秒 }] }
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) {
    return NextResponse.json({ ok: false, error: '需要 name（軌跡名稱）' }, { status: 400 })
  }

  const v = validatePoints(body.points)
  if (!v.ok) {
    return NextResponse.json({ ok: false, error: v.error }, { status: 400 })
  }

  const exists = await db.trajectory.findUnique({ where: { name } })
  if (exists) {
    return NextResponse.json({ ok: false, error: `軌跡名稱已存在: ${name}` }, { status: 409 })
  }

  const traj = await db.trajectory.create({
    data: {
      name,
      description: typeof body.description === 'string' ? body.description : null,
      points: JSON.stringify(v.parsed),
      duration: v.duration ?? 0,
      pointCount: v.parsed?.length ?? 0,
    },
  })

  return NextResponse.json(
    {
      ok: true,
      data: { id: traj.id, name: traj.name, duration: traj.duration, pointCount: traj.pointCount },
    },
    { status: 201 }
  )
}
