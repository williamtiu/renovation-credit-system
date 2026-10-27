import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/** GET /api/trajectories/[id] — 軌跡詳情（含全部路徑點） */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const traj = await db.trajectory.findUnique({ where: { id } })
  if (!traj) {
    return NextResponse.json({ ok: false, error: '軌跡不存在' }, { status: 404 })
  }
  return NextResponse.json({
    ok: true,
    data: {
      id: traj.id,
      name: traj.name,
      description: traj.description,
      duration: traj.duration,
      pointCount: traj.pointCount,
      createdAt: traj.createdAt,
      points: JSON.parse(traj.points),
    },
  })
}

/** PATCH /api/trajectories/[id] — 改名/描述 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const traj = await db.trajectory.findUnique({ where: { id } })
  if (!traj) {
    return NextResponse.json({ ok: false, error: '軌跡不存在' }, { status: 404 })
  }
  const body = await req.json().catch(() => ({}))
  if (typeof body.name === 'string' && body.name.trim() && body.name !== traj.name) {
    const exists = await db.trajectory.findUnique({ where: { name: body.name.trim() } })
    if (exists) {
      return NextResponse.json({ ok: false, error: `軌跡名稱已存在: ${body.name}` }, { status: 409 })
    }
  }
  const updated = await db.trajectory.update({
    where: { id },
    data: {
      name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : undefined,
      description: typeof body.description === 'string' ? body.description : undefined,
    },
  })
  return NextResponse.json({ ok: true, data: { id: updated.id, name: updated.name } })
}

/** DELETE /api/trajectories/[id] — 刪除軌跡 */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const traj = await db.trajectory.findUnique({ where: { id } })
  if (!traj) {
    return NextResponse.json({ ok: false, error: '軌跡不存在' }, { status: 404 })
  }
  await db.trajectory.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
