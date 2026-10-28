/**
 * Robot Control Service — R1-7A 機械臂控制服務
 * 
 * ROS2 Node 等價物。提供：
 *   GET  /health        健康檢查
 *   GET  /state         完整機械人狀態（/robot_state topic 快照）
 *   GET  /stream        SSE 遙測串流（/joint_states topic 即時流）
 *   POST /command       指令入口（service call: goto/foc/home/stop/...）
 *   POST /estop         緊急停止
 *   POST /configure     生命周期: configure(mode, port, baud)
 *   POST /activate      生命周期: activate
 *   POST /deactivate    生命周期: deactivate
 *   GET  /joints        關節元數據（名稱/限制）
 *   GET  /events        驅動事件日誌
 *   GET  /poses         內建演示姿勢
 */

import { createServer, IncomingMessage, ServerResponse } from 'node:http'
import { RobotController } from './controller'
import type { SerialSettings } from './controller'
import { JOINTS, DEMO_POSES, ARM_HOME } from './robot-model'

const PORT = 3002
const controller = new RobotController()

// 服務啟動時自動以模擬模式激活（沙盒/開發環境）
async function bootstrap() {
  try {
    await controller.configure('simulation', '/dev/ttyUSB0', 6000000)
    await controller.activate()
    console.log('✓ 已以 simulation 模式自動激活（真機請改用 bridge 模式）')
  } catch (err) {
    console.error('自動激活失敗:', err)
  }
}

function readBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (c) => {
      data += c
      if (data.length > 1e6) { reject(new Error('body 過大')); req.destroy() }
    })
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}) } catch (e) { reject(e) }
    })
    req.on('error', reject)
  })
}

function json(res: ServerResponse, code: number, body: unknown): void {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  })
  res.end(JSON.stringify(body))
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)
  const path = url.pathname

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    return res.end()
  }

  try {
    // ---------- GET ----------
    if (req.method === 'GET') {
      if (path === '/health') {
        return json(res, 200, { ok: true, service: 'robot-control', port: PORT, ts: Date.now() })
      }
      if (path === '/state') {
        return json(res, 200, { ok: true, data: controller.getState() })
      }
      if (path === '/joints') {
        return json(res, 200, { ok: true, data: JOINTS })
      }
      if (path === '/guard') {
        const g = controller.getGuard()
        if (!g) return json(res, 200, { ok: true, data: null, note: 'guard 只喺 serial 模式存在' })
        return json(res, 200, { ok: true, data: g.status() })
      }
      if (path === '/jog') {
        const d = controller.getSerialDriver()
        if (!d) return json(res, 200, { ok: true, data: null, note: 'jog 只喺 serial 模式存在' })
        return json(res, 200, { ok: true, data: { rate: d.getJogRate(), ...d.jogStatus() } })
      }
      if (path === '/events') {
        return json(res, 200, { ok: true, data: controller.getEventLog() })
      }
      if (path === '/poses') {
        return json(res, 200, { ok: true, data: DEMO_POSES, home: ARM_HOME })
      }
      if (path === '/stream') {
        // SSE 遙測串流 — WebSocket Gateway 會訂閱呢個端點再轉發俾瀏覽器
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        })
        res.write(`event: hello\ndata: ${JSON.stringify({ ok: true, hz: 20 })}\n\n`)
        let closed = false
        const unsub = controller.onState((s) => {
          if (closed) return
          res.write(`event: state\ndata: ${JSON.stringify(s)}\n\n`)
        })
        const keepAlive = setInterval(() => {
          if (!closed) res.write(`: keepalive\n\n`)
        }, 15000)
        req.on('close', () => {
          closed = true
          clearInterval(keepAlive)
          unsub()
        })
        return
      }
      return json(res, 404, { ok: false, error: 'not found' })
    }

    // ---------- POST ----------
    if (req.method === 'POST') {
      if (path === '/command') {
        const body = await readBody(req)
        const result = await controller.command(
          { type: body.type, joints: body.joints, duration: body.duration },
          body.source ?? 'service'
        )
        return json(res, result.ok ? 200 : 400, { ok: result.ok, ...result, state: controller.getState() })
      }
      if (path === '/estop') {
        await controller.emergencyStop()
        return json(res, 200, { ok: true, message: '緊急停止已執行', state: controller.getState() })
      }
      if (path === '/configure') {
        const body = await readBody(req)
        const mode = body.mode ?? 'simulation'
        if (!['simulation', 'serial', 'bridge'].includes(mode)) {
          return json(res, 400, { ok: false, error: 'mode 必須係 simulation | serial | bridge' })
        }
        // serial 模式嘅校準/零位/監控參數要一路传到 driver —— 之前呢度漏咗，
        // driver 收唔到 calibPath 就會拒絕配置。
        const extra: Partial<SerialSettings> = {}
        if (typeof body.calibPath === 'string') extra.calibPath = body.calibPath
        if (typeof body.zeroPath === 'string') extra.zeroPath = body.zeroPath
        if (typeof body.rateHz === 'number') extra.rateHz = body.rateHz
        if (typeof body.holdKp === 'number') extra.holdKp = body.holdKp
        if (typeof body.holdKd === 'number') extra.holdKd = body.holdKd
        await controller.configure(mode, body.port, body.baudrate, extra)
        return json(res, 200, { ok: true, message: `已配置 (${mode})`, state: controller.getState() })
      }
      if (path === '/activate') {
        await controller.activate()
        return json(res, 200, { ok: true, state: controller.getState() })
      }
      if (path === '/deactivate') {
        await controller.deactivate()
        return json(res, 200, { ok: true, state: controller.getState() })
      }
      if (path === '/cleanup') {
        await controller.cleanup()
        return json(res, 200, { ok: true, state: controller.getState() })
      }
      // ---------- 傳輸安全閘（serial 模式） ----------
      if (path === '/guard/arm-monitor' || path === '/guard/unlock') {
        const body = await readBody(req)
        const g = controller.getGuard()
        if (!g) return json(res, 400, { ok: false, error: 'guard 只喺 serial 模式存在，請先 configure(serial)' })
        const out = path.endsWith('/unlock')
          ? g.unlock(body.phrase ?? '', body.code ?? '')
          : g.armMonitor(body.phrase ?? '', body.code ?? '')
        controller.logLifecycle(`${path}: ${out.ok ? '✓' : '✗ ' + out.message}`)
        return json(res, out.ok ? 200 : 403, { ok: out.ok, message: out.message, state: controller.getState() })
      }
      if (path === '/guard/lock') {
        const body = await readBody(req)
        const g = controller.getGuard()
        if (!g) return json(res, 400, { ok: false, error: 'guard 只喺 serial 模式存在' })
        g.lock(body.reason ?? 'operator lock')
        controller.logLifecycle('guard: LOCKED by operator')
        return json(res, 200, { ok: true, message: '已重新鎖定', state: controller.getState() })
      }
      if (path === '/guard/beat') {
        controller.getGuard()?.beat()
        return json(res, 200, { ok: true })
      }
      // ---------- 零位參考（serial 模式） ----------
      if (path === '/zero/capture' || path === '/zero/clear') {
        const d = controller.getSerialDriver()
        if (!d) return json(res, 400, { ok: false, error: '零位參考只喺 serial 模式可用' })
        if (path.endsWith('/capture')) {
          const out = d.captureZeroReference()
          controller.logLifecycle(`zero: capture ${out.ok ? '✓ ' + out.message : '✗ ' + out.message}`)
          return json(res, out.ok ? 200 : 409, { ok: out.ok, message: out.message, state: controller.getState() })
        }
        d.clearZeroReference()
        controller.logLifecycle('zero: cleared')
        return json(res, 200, { ok: true, message: '零位參考已清除', state: controller.getState() })
      }
      if (path === '/poller') {
        const body = await readBody(req)
        const d = controller.getSerialDriver()
        if (!d) return json(res, 400, { ok: false, error: 'poller 只喺 serial 模式可用' })
        return json(res, 200, { ok: true, data: d.configurePoller(body), state: controller.getState() })
      }
      // ---------- 運動 ramp（jog）設定 ----------
      if (path === '/jog') {
        const body = await readBody(req)
        const d = controller.getSerialDriver()
        if (!d) return json(res, 400, { ok: false, error: 'jog 只喺 serial 模式可用' })
        if (body.clear === true) {
          const dropped = d.jogClear('operator clear')
          controller.logLifecycle(`jog: cleared ${dropped} target(s)`)
          return json(res, 200, { ok: true, dropped, state: controller.getState() })
        }
        // rate AND gains are applied independently: a request that carries both
        // must not silently drop the rate (an early return here ate the rate).
        let appliedRate: number | null = null
        let appliedGains: { kp: number; kd: number } | null = null
        if (typeof body.rate === 'number') appliedRate = d.setJogRate(body.rate)
        if (typeof body.kp === 'number' || typeof body.kd === 'number') {
          const cur = d.getJogGains()
          appliedGains = d.setJogGains(
            typeof body.kp === 'number' ? body.kp : cur.kp,
            typeof body.kd === 'number' ? body.kd : cur.kd
          )
        }
        if (appliedRate === null && appliedGains === null) {
          return json(res, 400, { ok: false, error: '需要 rate (rad/s)、kp/kd，或 clear:true' })
        }
        controller.logLifecycle(
          `jog: ${appliedRate !== null ? `rate=${appliedRate.toFixed(3)} rad/s ` : ''}` +
          `${appliedGains ? `kp=${appliedGains.kp} kd=${appliedGains.kd}` : ''}`
        )
        return json(res, 200, {
          ok: true,
          rate: appliedRate ?? d.getJogRate(),
          gains: appliedGains ?? d.getJogGains(),
          jog: d.jogStatus(),
          state: controller.getState(),
        })
      }
      return json(res, 404, { ok: false, error: 'not found' })
    }

    return json(res, 405, { ok: false, error: 'method not allowed' })
  } catch (err) {
    const e = err as Error
    console.error('HTTP 處理錯誤:', e.message)
    return json(res, 500, { ok: false, error: e.message })
  }
})

server.listen(PORT, () => {
  console.log(`🤖 Robot Control Service 已啟動: http://localhost:${PORT}`)
  console.log('   架構層級: HAL(simulation|serial|bridge) → Safety → Controller → HTTP/SSE')
  bootstrap()
})

process.on('SIGTERM', () => { server.close(() => process.exit(0)) })
process.on('SIGINT', () => { server.close(() => process.exit(0)) })
