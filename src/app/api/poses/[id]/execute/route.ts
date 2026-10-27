import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { controlPost } from '@/lib/control-client'
import { authenticateApiKey, hasRole } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

/** POST /api/poses/[id]/execute — 執行姿勢（goto）需要 operator 以上權限 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  const auth = await authenticateApiKey(req)
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }
  if (!hasRole(auth.user, 'operator')) {
    return NextResponse.json(
      { ok: false, error: `執行姿勢需要 operator 以上權限（當前角色: ${auth.user?.role}）` },
      { status: 403 }
    )
  }

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
      source: auth.user ? 'api' : 'web',
      command: 'goto',
      params: JSON.stringify({ pose: pose.name, joints, duration: pose.duration }),
      status: res.ok ? 'ok' : 'rejected',
      message: res.ok ? `執行姿勢: ${pose.name}` : (res.error ?? null),
      latencyMs: res.latencyMs ?? null,
      apiUserId: auth.user?.id ?? null,
    },
  })

  return NextResponse.json(res, { status: res.ok ? 200 : 400 })
}
