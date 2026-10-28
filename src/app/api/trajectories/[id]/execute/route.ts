import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { controlGet } from '@/lib/control-client'
import { authenticateApiKey, hasRole } from '@/lib/api-auth'
import { getPlayback, startPlayback, type TrajPoint } from '@/lib/playback-engine'

export const dynamic = 'force-dynamic'

/**
 * POST /api/trajectories/[id]/execute — 回放軌跡（逐點 goto + cosine 插補）
 * Body: { speed?: 0.25–2.0 (倍率), loop?: 0|1|N (0 = 無限循環，預設 1) }
 * 認證：需要 operator 以上權限（X-API-Key / body.apiKey）
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  const auth = await authenticateApiKey(req)
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }
  if (!hasRole(auth.user, 'operator')) {
    return NextResponse.json(
      { ok: false, error: `回放需要 operator 以上權限（當前角色: ${auth.user?.role}）` },
      { status: 403 }
    )
  }

  // 並發檢查：同時只容許一個回放（含循環模式）
  const current = getPlayback()
  if (current?.running) {
    const cycleText = current.totalCycles === 0 ? `無限循環第 ${current.cycle} 輪` : `第 ${current.cycle}/${current.totalCycles} 輪`
    return NextResponse.json(
      {
        ok: false,
        error: `回放進行中（${current.trajectoryName}，${cycleText} 第 ${current.point}/${current.total} 點），請先取消`,
      },
      { status: 409 }
    )
  }

  const traj = await db.trajectory.findUnique({ where: { id } })
  if (!traj) {
    return NextResponse.json({ ok: false, error: '軌跡不存在' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const speed = typeof body.speed === 'number' ? Math.min(Math.max(body.speed, 0.25), 2.0) : 1.0
  // 循環次數：1 = 單次；N > 1 = 循環 N 次；0 = 無限循環（可隨時 cancel / E-stop 中止）
  const rawLoop = typeof body.loop === 'number' ? body.loop : 1
  if (!Number.isFinite(rawLoop) || rawLoop < 0 || rawLoop > 999 || !Number.isInteger(rawLoop)) {
    return NextResponse.json(
      { ok: false, error: 'loop 必須為 0（無限）或 1–999 嘅整數' },
      { status: 400 }
    )
  }
  const loop = rawLoop
  const source = auth.user ? `api:${auth.user.name}` : 'web'

  // E-stop 聯鎖預檢
  const st = await controlGet<{ estop?: boolean }>('/state')
  if (st.ok && st.data?.estop) {
    return NextResponse.json(
      { ok: false, error: '緊急停止已觸發，請先清除錯誤（clear）再回放' },
      { status: 409 }
    )
  }

  const points: TrajPoint[] = JSON.parse(traj.points)
  startPlayback(traj.id, traj.name, points, speed, source, loop)

  await db.commandLog.create({
    data: {
      source: auth.user ? 'api' : 'web',
      command: 'trajectory_execute',
      params: JSON.stringify({ trajectory: traj.name, pointCount: points.length, speed, loop }),
      status: 'ok',
      message: `開始回放軌跡: ${traj.name}（${points.length} 點 @ ${speed}x${loop === 0 ? '，無限循環' : loop > 1 ? `，循環 ${loop} 次` : ''}）`,
      apiUserId: auth.user?.id ?? null,
    },
  })

  return NextResponse.json({
    ok: true,
    data: {
      trajectoryId: traj.id,
      name: traj.name,
      pointCount: points.length,
      speed,
      loop,
      infinite: loop === 0,
    },
  })
}
