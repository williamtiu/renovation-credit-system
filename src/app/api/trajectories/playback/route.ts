import { NextResponse } from 'next/server'
import { getPlayback } from '@/lib/playback-engine'

export const dynamic = 'force-dynamic'

/** GET /api/trajectories/playback — 查詢回放進度（輪詢用） */
export async function GET() {
  const pb = getPlayback()
  if (!pb) {
    return NextResponse.json({
      ok: true,
      data: { running: false, status: 'idle' as const, message: '' },
    })
  }
  return NextResponse.json({
    ok: true,
    data: {
      running: pb.running,
      status: pb.status,
      message: pb.message,
      trajectoryId: pb.trajectoryId,
      trajectoryName: pb.trajectoryName,
      point: pb.point,
      total: pb.total,
      cycle: pb.cycle,
      totalCycles: pb.totalCycles,
      infinite: pb.totalCycles === 0,
      speed: pb.speed,
      // 總體進度：當前輪內點進度（循環模式下為當前輪進度）
      progress: pb.total > 0 ? Math.round((pb.point / pb.total) * 100) / 100 : 0,
      startedAt: pb.startedAt,
      endedAt: pb.endedAt,
    },
  })
}
