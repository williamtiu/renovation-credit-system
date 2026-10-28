import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { controlPost } from '@/lib/control-client'

export const dynamic = 'force-dynamic'

/**
 * POST /api/system/configure — 配置驅動模式（生命周期管理）
 * Body: { action: 'configure'|'activate'|'deactivate'|'cleanup', mode?, port?, baudrate? }
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const action = body.action ?? 'configure'

  try {
    let res
    switch (action) {
      case 'configure': {
        const mode = body.mode ?? 'simulation'
        if (!['simulation', 'serial', 'bridge'].includes(mode)) {
          return NextResponse.json(
            { ok: false, error: 'mode 必須係 simulation | serial | bridge' },
            { status: 400 }
          )
        }
        res = await controlPost('/configure', {
          mode,
          port: body.port ?? '/dev/ttyUSB0',
          baudrate: body.baudrate ?? 6000000,
        })
        // configure 成功後自動 activate
        if (res.ok) {
          res = await controlPost('/activate')
        }
        break
      }
      case 'activate':
        res = await controlPost('/activate')
        break
      case 'deactivate':
        res = await controlPost('/deactivate')
        break
      case 'cleanup':
        res = await controlPost('/cleanup')
        break
      default:
        return NextResponse.json(
          { ok: false, error: 'action 必須係 configure | activate | deactivate | cleanup' },
          { status: 400 }
        )
    }

    await db.commandLog.create({
      data: {
        source: 'web',
        command: `lifecycle:${action}`,
        params: JSON.stringify({ mode: body.mode, port: body.port, baudrate: body.baudrate }),
        status: res.ok ? 'ok' : 'rejected',
        message: res.ok ? null : (res.error ?? null),
      },
    })

    return NextResponse.json(res, { status: res.ok ? 200 : 400 })
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 })
  }
}
