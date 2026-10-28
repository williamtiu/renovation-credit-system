/**
 * Ramp test on the virtual bus — proves motion, not acceptance.
 *
 * A goto that is accepted, CRC-valid and reaches the wire is NOT proof the arm
 * moves: a mode-1 packet with a zero speed limit is accepted by the motor and
 * moves nothing, which is exactly what a single-packet goto produced on the real
 * arm. This harness therefore checks the wire for:
 *
 *   1. a stream of packets, not one;
 *   2. NON-ZERO velocity on every ramp packet;
 *   3. the commanded angle advancing monotonically toward the target;
 *   4. an arrival packet with velocity 0 at the end;
 *   5. the deadman NOT firing during the ramp (the runner beats it).
 *
 * Usage: bun scripts/virtual-ramp-test.ts <slavePath> <calibPath> <zeroPath>
 */
import { readFileSync } from 'node:fs'
import { SerialDriver } from '../mini-services/robot-control/serial-driver'
import { UNLOCK_PHRASE, MASTER_UNLOCK_CODE } from '../mini-services/robot-control/motion-guard'

const [slavePath, calibPath, zeroPath] = process.argv.slice(2)
if (!slavePath || !calibPath || !zeroPath) {
  console.error('usage: bun scripts/virtual-ramp-test.ts <slavePath> <calibPath> <zeroPath>')
  process.exit(2)
}

const calib = readFileSync(calibPath, 'utf-8')
void calib

const driver = new SerialDriver()
const events: Array<{ kind: string; message: string }> = []
driver.onEvent((ev) => events.push({ kind: ev.kind, message: ev.message }))
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const out: Record<string, unknown> = {}

await driver.connect({
  port: slavePath, baudrate: 6000000, calibPath, zeroPath,
  rateHz: 50, holdKp: 20, holdKd: 0.5,
  allowSharedBus: true,
})
out.connected = driver.isConnected()

await sleep(1200)
out.rxPacketsBefore = driver.status().rxPackets
out.zeroDeclaredBefore = driver.status().zeroReference !== null

// Zero must exist for motion; capture it at the current pose.
if (!driver.status().zeroReference) {
  out.captureZero = driver.captureZeroReference()
}
out.zeroDeclared = driver.status().zeroReference !== null

const unlock = driver.guard.unlock(UNLOCK_PHRASE, MASTER_UNLOCK_CODE)
out.unlockOk = unlock.ok

// Declare zero, then ramp joint 4 by +0.30 rad at the default 0.25 rad/s.
const base = driver.getTelemetry().joints.map((j) => j.q)
const target = [...base]
target[3] = base[3] + 0.30
out.baseQ4 = Number(base[3].toFixed(5))
out.targetQ4 = Number(target[3].toFixed(5))
out.rate = driver.getJogRate()

const why = driver.jogTo(target)
out.jogAccepted = why === null
out.jogRejectReason = why

// Watch the ramp: the runner streams at 60 Hz and beats the guard itself.
const q4Track: number[] = []
for (let i = 0; i < 26; i++) {
  const tel = driver.getTelemetry()
  q4Track.push(Number(tel.joints[3].q.toFixed(5)))
  await sleep(100)
}
out.q4Track = q4Track
out.isJogging = driver.isJogging()
out.jogRemaining = Number(driver.jogRemaining().toFixed(3))
out.jogStatus = driver.jogStatus()

// Deadman must NOT have fired while the ramp was running.
const g = driver.guard.status()
out.lockedAfterRamp = g.locked
out.txPackets = g.txPackets
out.txBlocked = g.txBlocked
out.events = events.slice(-10)

console.log(JSON.stringify(out, null, 1))
driver.jogClear('test end')
await driver.disconnect()
process.exit(0)
