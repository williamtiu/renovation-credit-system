/**
 * Zero-reference motion gate — virtual bus test.
 *
 * Proves two things on the real driver without touching hardware:
 *   1. With no declared zero, goto/home are REFUSED and nothing reaches the wire.
 *      Raw encoder counts are not joint angles, so a "valid-looking" target can
 *      command a wild move; the gate must stop it before it acts.
 *   2. After the operator declares zero at the current pose, goto is allowed and
 *      reaches the wire as 7 packets.
 *
 * Usage: bun scripts/virtual-zero-gate-test.ts <slavePath> <calibPath>
 */
import { unlinkSync } from 'node:fs'
import { SerialDriver } from '../mini-services/robot-control/serial-driver'
import { UNLOCK_PHRASE, MASTER_UNLOCK_CODE } from '../mini-services/robot-control/motion-guard'

const [slavePath, calibPath] = process.argv.slice(2)
// The zero path must be absent at connect AND removed again at the end:
// captureZeroReference() writes this file, so a non-self-cleaning harness
// leaves it behind and every later run starts with a declared zero, making the
// gate look like it accepted motion when it legitimately had a zero.
const MISSING_ZERO = `/home/orangepi/zero-gate-absent-${process.pid}.json`
try { unlinkSync(MISSING_ZERO) } catch { /* absent, as intended */ }
if (!slavePath || !calibPath) {
  console.error('usage: bun scripts/virtual-zero-gate-test.ts <slavePath> <calibPath>')
  process.exit(2)
}

const driver = new SerialDriver()
const events: Array<{ kind: string; message: string; code?: number }> = []
driver.onEvent((ev) => events.push({ kind: ev.kind, message: ev.message, code: ev.code }))
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const out: Record<string, unknown> = {}

await driver.connect({
  port: slavePath, baudrate: 6000000, calibPath, zeroPath: MISSING_ZERO,
  rateHz: 50, holdKp: 20, holdKd: 0.5,
  // The simulated bus is by definition a second holder of this pty.
  allowSharedBus: true,
})
out.connected = driver.isConnected()
out.zeroDeclaredAtConnect = driver.status().zeroReference !== null

// Let the bus answer so snapshots are present.
await sleep(1500)
out.rxPackets = driver.status().rxPackets

// ---- motion must be refused with NO zero, even after unlocking ----
const unlock = driver.guard.unlock(UNLOCK_PHRASE, MASTER_UNLOCK_CODE)
out.unlockOk = unlock.ok
const txBefore = driver.guard.status().txPackets
const refused: Array<{ cmd: string; ok: boolean; code?: number; message: string }> = []
for (const cmd of [
  { type: 'goto', joints: [0.4, 0.2, -0.5, 0.8, 0.1, -0.3, 0.15], duration: 4 },
  { type: 'home' },
] as const) {
  try {
    await driver.sendCommand(cmd as any)
    refused.push({ cmd: (cmd as any).type, ok: true, message: 'ACCEPTED (GATE FAILED)' })
  } catch (err) {
    refused.push({ cmd: (cmd as any).type, ok: false, code: (err as any).code, message: (err as Error).message.slice(0, 90) })
  }
}
const txAfterRefused = driver.guard.status().txPackets
out.refusedWithNoZero = refused
out.txDeltaForRefusedMotion = txAfterRefused - txBefore      // must be 0
out.zeroBytesWrittenWithNoZero = txAfterRefused - txBefore === 0
out.gateCodes = refused.map((r) => r.code)

// ---- declare zero at the current pose, then goto must reach the wire ----
const cap = driver.captureZeroReference()
out.captureZeroOk = cap.ok
out.zeroDeclaredAfterCapture = driver.status().zeroReference !== null

const txBeforeGoto = driver.guard.status().txPackets
let gotoOk = false
let gotoMsg = ''
try {
  await driver.sendCommand({ type: 'goto', joints: [0.1, 0.05, -0.1, 0.2, 0.05, -0.05, 0.05], duration: 4 })
  gotoOk = true
} catch (err) {
  gotoMsg = (err as Error).message
}
out.gotoAfterZero = { ok: gotoOk, message: gotoMsg }
out.gotoTxPackets = driver.guard.status().txPackets - txBeforeGoto   // expect 7
out.events = events

console.log(JSON.stringify(out, null, 1))
driver.jogClear('test end')
await driver.disconnect()
// Self-clean: captureZeroReference() wrote this file. Leaving it behind makes
// every later run start with a declared zero, and the gate then legitimately
// accepts motion — which reads as a gate failure if the harness assumes absence.
try { unlinkSync(MISSING_ZERO) } catch { /* nothing written */ }
process.exit(0)
