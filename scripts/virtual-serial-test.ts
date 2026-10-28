/**
 * SerialDriver end-to-end test against a VIRTUAL IM6014 bus.
 *
 * Runs the real driver (framer, calibration, zero reference, position-hold
 * poller, motion guard) against a pty pair — /dev/ttyUSB0 is never opened and
 * the arm is never touched.
 *
 * The poller is deliberately frozen before the refused-command measurements,
 * so any byte written by a command that should have been refused is visible as
 * a txPackets increment. A correct guard produces delta 0.
 *
 * Usage: bun scripts/virtual-serial-test.ts <slave-path> <calibPath> <zeroPath>
 */
import { readFileSync } from 'node:fs'
import { SerialDriver } from '../mini-services/robot-control/serial-driver'
import { loadJointCalibrationFile } from '../mini-services/robot-control/joint-calibration'
import { UNLOCK_PHRASE, MONITOR_PHRASE, MASTER_UNLOCK_CODE } from '../mini-services/robot-control/motion-guard'

const [slavePath, calibPath, zeroPath] = process.argv.slice(2)
if (!slavePath || !calibPath || !zeroPath) {
  console.error('usage: bun scripts/virtual-serial-test.ts <slavePath> <calibPath> <zeroPath>')
  process.exit(2)
}

// Motor-frame angles the virtual bus reports, matching virtual_bus.py.
const MOTOR_ANGLE = [-1.0, 0.5, 0.0, 1.25, -0.75, 2.0, -3.0]
const TARGET_URDF = [0.4, 0.2, -0.5, 0.8, 0.1, -0.3, 0.15]

const calib = loadJointCalibrationFile(calibPath)
const zero = JSON.parse(readFileSync(zeroPath, 'utf-8')).q_abs as number[]

const near = (a: number, b: number, eps = 1e-9) =>
  a === b || Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b))

const driver = new SerialDriver()
const events: Array<{ kind: string; message: string; code?: number }> = []
driver.onEvent((ev) => events.push({ kind: ev.kind, message: ev.message, code: ev.code }))

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const out: Record<string, unknown> = { events: [] as unknown[] }

await driver.connect({
  port: slavePath, baudrate: 6000000, calibPath, zeroPath, rateHz: 50, holdKp: 20, holdKd: 0.5,
})
out.connected = driver.isConnected()
out.guardLockedAfterConnect = driver.guard.isLocked()
out.monitorArmedAfterConnect = driver.guard.isMonitorArmed()

// Let the bus answer; the poller is auto-armed on connect, so holds should flow.
await sleep(2500)
const st1 = driver.status()
out.rxBytes = st1.rxBytes
out.rxPackets = st1.rxPackets
out.crcErrors = st1.crcErrors
out.holdCycles = st1.holdCycles
out.probeCycles = st1.probeCycles

// ---------- telemetry must equal calibration( MOTOR_ANGLE ) - zero ----------
const tel = driver.getTelemetry()
const expectedQAbs = MOTOR_ANGLE.map((a, i) => calib[i].gain() * a + calib[i].offset)
const expectedQ = expectedQAbs.map((a, i) => a - zero[i])
const qAbsMeasured = st1.motorIds.map((_, i) => tel.joints[i]?.q ?? NaN)
out.telemetryQ = tel.joints.map((j) => j.q)
out.expectedQ = expectedQ
out.maxAbsQDelta = Math.max(...tel.joints.map((j, i) => Math.abs(j.q - expectedQ[i])))
// Encoder LSB at these gear ratios is ~1e-3 rad; the encode/decode round-trip
// through the int32 field leaves float residuals far below that. 1e-5 is the
// honest tolerance — a real framing/calibration error shows up as ~1e-3+.
out.telemetryMatchesCalibration = tel.joints.every((j, i) => near(j.q, expectedQ[i], 1e-5))
out.telemetryTau = tel.joints.map((j) => j.tau)
out.telemetryTemp = tel.joints.map((j) => j.temp)
out.faults = st1.faults

// ---------- freeze the poller so refused writes are measurable ----------
driver.guard.disarmMonitor('test: freeze poller to measure refusals')
await sleep(300)
const g0 = driver.guard.status()
const tx0 = g0.txPackets
const blocked0 = g0.txBlocked

const attempts: Array<{ cmd: string; ok: boolean; message: string }> = []
const cmds = [
  { type: 'goto', joints: TARGET_URDF, duration: 2 } as const,
  { type: 'home' } as const,
  { type: 'stop' } as const,
  { type: 'zero_torque' } as const,
  { type: 'clear' } as const,
  { type: 'reset' } as const,
]
for (const c of cmds) {
  try {
    await driver.sendCommand(c as any)
    attempts.push({ cmd: (c as any).type, ok: true, message: 'ACCEPTED' })
  } catch (err) {
    attempts.push({ cmd: (c as any).type, ok: false, message: (err as Error).message.slice(0, 140) })
  }
}
const g1 = driver.guard.status()
out.lockedAttempts = attempts
out.txAfterLockedAttempts = g1.txPackets
out.txDeltaWhileLocked = g1.txPackets - tx0          // must be 0
out.blockedWhileLocked = g1.txBlocked - blocked0     // must equal number of motion attempts
out.zeroBytesWrittenWhileLocked = (g1.txPackets - tx0) === 0

// ---------- wrong phrase must not unlock ----------
const bad = driver.guard.unlock('I accept', MASTER_UNLOCK_CODE)
const badCode = driver.guard.unlock(UNLOCK_PHRASE, 'NOPE')
const g2 = driver.guard.status()
out.wrongPhraseOk = bad.ok
out.wrongCodeOk = badCode.ok
out.stillLockedAfterBadAttempts = g2.locked
out.txDeltaFromBadUnlocks = g2.txPackets - g1.txPackets

// ---------- correct phrase + code unlocks, goto then reaches the wire ----------
const good = driver.guard.unlock(UNLOCK_PHRASE, MASTER_UNLOCK_CODE)
out.unlockOk = good.ok
const txBeforeGoto = driver.guard.status().txPackets
// Wall-clock window so the bus log can be filtered to exactly this command:
// holds from the poller must not be counted as goto packets.
const gotoWindowStart = Date.now() / 1000
let gotoOk = false
let gotoMsg = ''
try {
  await driver.sendCommand({ type: 'goto', joints: TARGET_URDF, duration: 2 })
  gotoOk = true
} catch (err) {
  gotoMsg = (err as Error).message
}
const gotoWindowEnd = Date.now() / 1000
const txAfterGoto = driver.guard.status().txPackets
out.gotoAfterUnlock = { ok: gotoOk, message: gotoMsg }
out.gotoTxPackets = txAfterGoto - txBeforeGoto      // guard authorizations for this command
out.gotoWindow = [gotoWindowStart, gotoWindowEnd]

// Expected motor-frame positions the goto must have produced.
out.expectedMotorPositions = TARGET_URDF.map((q, i) => calib[i].toMotor(q + zero[i]))

// ---------- monitor yields while motion is unlocked ----------
const armedWhileUnlocked = driver.guard.isMonitorArmed()
const lockedFlag = driver.guard.isLocked()
await sleep(600)
out.monitorArmed = armedWhileUnlocked
out.locked = lockedFlag
out.holdCyclesAfterUnlock = driver.status().holdCycles
out.holdFrozenWhileUnlocked = driver.status().holdCycles === st1.holdCycles

// ---------- re-lock: motion refused again, zero bytes ----------
driver.guard.lock('test: re-lock')
const txBeforeLockedGoto = driver.guard.status().txPackets
let secondGotoAccepted = true
try {
  await driver.sendCommand({ type: 'goto', joints: TARGET_URDF, duration: 2 })
} catch {
  secondGotoAccepted = false
}
out.secondGotoAfterRelockAccepted = secondGotoAccepted   // expect false
out.txDeltaAfterRelockGoto = driver.guard.status().txPackets - txBeforeLockedGoto

// ---------- monitor re-arm restores net-zero hold ----------
const armOut = driver.guard.armMonitor(MONITOR_PHRASE, MASTER_UNLOCK_CODE)
out.armMonitorOk = armOut.ok
const hc0 = driver.status().holdCycles
await sleep(700)
out.holdCyclesAfterReArm = driver.status().holdCycles
out.holdResumedAfterReArm = driver.status().holdCycles > hc0

out.events = events
console.log(JSON.stringify(out, null, 1))
await driver.disconnect()
process.exit(0)
