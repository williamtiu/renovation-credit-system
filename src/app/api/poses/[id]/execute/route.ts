import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { controlPost } from '@/lib/control-client'

export const dynamic = 'force-dynamic'

/** POST /api/poses/[id]/execute — 執行姿勢（goto） */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const pose = await db.posePreset.findUnique({ where: { id } })
  if (!pose) {
    return NextResponse.json({ ok: false, error: '姿勢不存在' }, { status: 404 })
  }

  const joints: number[] = JSON.parse(pose.joints)
  const res = await controlPost('/command', {
    type: 'goto',
    joints,
    duration: pose.duration,
    source: `pose:${pose.name}`,
  })

  await db.commandLog.create({
    data: {
      source: 'web',
      command: 'goto',
      params: JSON.stringify({ pose: pose.name, joints, duration: pose.duration }),
      status: res.ok ? 'ok' : 'rejected',
      message: res.ok ? `執行姿勢: ${pose.name}` : (res.error ?? null),
      latencyMs: res.latencyMs ?? null,
    },
  })

  return NextResponse.json(res, { status: res.ok ? 200 : 400 })
}
