import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { controlGet, controlPost } from '@/lib/control-client'
import { authenticateApiKey } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

// Ceilings must match the driver clamp in jog-constants.ts (MAX_JOG_KP /
// MAX_JOG_KD / MAX_JOG_SPEED / MAX_TAU_FF). A stricter cap here silently
// swallows parameters the operator asked for; a looser one lets unvalidated
// values reach the wire.
const KP_MAX = 120
const KD_MAX = 5
const RATE_MAX = 1.0
const RATE_MIN = 0.01
const TAU_FF_MAX = 8

/**
 * GET  /api/robot/jog — ramp 狀態（rate / kp / kd / tauFf / targets / commanded / keepalive 次數）
 * POST /api/robot/jog — { rate?, kp?, kd?, tauFf?, clear? }
 *
 * rate 決定 lag 幾快逼近 abort 邊界；kp 決定 torque（torque = kp × lead）；
 * tauFf 係常数 torque bias，用於卸掉 load，令 P term 有餘量收埋 steady-state
 * offset。三者都直接影響機械臂，所以要驗證、要審計。
 */
export async function GET() {
  const res = await controlGet('/jog')
  return NextResponse.json(res, { status: res.ok ? 200 : 400 })
}

export async function POST(req: NextRequest) {
  const auth = await authenticateApiKey(req)
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }
  const body = await req.json().catch(() => ({}))

  const rate = typeof body.rate === 'number' ? body.rate : undefined
  const kp = typeof body.kp === 'number' ? body.kp : undefined
  const kd = typeof body.kd === 'number' ? body.kd : undefined
  const tauFf = typeof body.tauFf === 'number' ? body.tauFf : undefined
  const clear = body.clear === true

  if (rate === undefined && kp === undefined && kd === undefined && tauFf === undefined && !clear) {
    return NextResponse.json(
      { ok: false, error: '需要 rate (rad/s)、kp/kd (Nm/rad、Nm/(rad/s))、tauFf (Nm)，或 clear:true' },
      { status: 400 }
    )
  }
  if (rate !== undefined && !(rate >= RATE_MIN && rate <= RATE_MAX)) {
    return NextResponse.json(
      { ok: false, error: `rate 要喺 ${RATE_MIN} 至 ${RATE_MAX} rad/s（MAX_JOG_SPEED）` },
      { status: 400 }
    )
  }
  if (kp !== undefined && !(kp >= 0 && kp <= KP_MAX)) {
    return NextResponse.json(
      { ok: false, error: `kp 要喺 0 至 ${KP_MAX} Nm/rad（MAX_JOG_KP 硬上限；torque = kp × lead）` },
      { status: 400 }
    )
  }
  if (kd !== undefined && !(kd >= 0 && kd <= KD_MAX)) {
    return NextResponse.json(
      { ok: false, error: `kd 要喺 0 至 ${KD_MAX} Nm/(rad/s)（MAX_JOG_KD）` },
      { status: 400 }
    )
  }
  if (tauFf !== undefined && !(tauFf >= -TAU_FF_MAX && tauFf <= TAU_FF_MAX)) {
    return NextResponse.json(
      { ok: false, error: `tauFf 要喺 -${TAU_FF_MAX} 至 +${TAU_FF_MAX} Nm（MAX_TAU_FF；符號由 load 方向決定）` },
      { status: 400 }
    )
  }

  const res = await controlPost('/jog', body)

  // Gains and bias are audited: both change the torque the arm can deliver, so
  // who asked for what has to be on the record, not just the rate.
  await db.commandLog.create({
    data: {
      source: auth.user ? `api:${auth.user.name}` : 'web',
      command: 'jog:configure',
      params: JSON.stringify({ rate, kp, kd, tauFf, clear }),
      status: res.ok ? 'ok' : 'rejected',
      message: res.ok
        ? [
            `rate=${res.rate ?? '-'}`,
            `kp=${res.gains?.kp ?? '-'}`,
            `kd=${res.gains?.kd ?? '-'}`,
            `tauFf=${res.tauFf ?? res.jog?.tauFf ?? '-'}`,
          ].join(' ')
        : (res.error ?? null),
      apiUserId: auth.user?.id ?? null,
    },
  })

  return NextResponse.json(res, { status: res.ok ? 200 : 400 })
}
