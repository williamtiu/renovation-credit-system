import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/** DELETE /api/poses/[id] — 刪除自訂姿勢（系統姿勢唔可以刪） */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const pose = await db.posePreset.findUnique({ where: { id } })
  if (!pose) {
    return NextResponse.json({ ok: false, error: '姿勢不存在' }, { status: 404 })
  }
  if (pose.isSystem) {
    return NextResponse.json({ ok: false, error: '系統內建姿勢唔可以刪除' }, { status: 403 })
  }
  await db.posePreset.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

/** PATCH /api/poses/[id] — 更新自訂姿勢 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const pose = await db.posePreset.findUnique({ where: { id } })
  if (!pose) {
    return NextResponse.json({ ok: false, error: '姿勢不存在' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const joints = Array.isArray(body.joints) && body.joints.length === 7
    ? JSON.stringify(body.joints)
    : undefined

  const updated = await db.posePreset.update({
    where: { id },
    data: {
      name: typeof body.name === 'string' && !pose.isSystem ? body.name : undefined,
      description: typeof body.description === 'string' ? body.description : undefined,
      joints,
      duration: typeof body.duration === 'number' ? Math.min(Math.max(body.duration, 0.5), 30) : undefined,
    },
  })
  return NextResponse.json({ ok: true, data: { ...updated, joints: JSON.parse(updated.joints) } })
}
