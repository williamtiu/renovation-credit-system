/**
 * Torque feed-forward unit test — stub bus, no hardware.
 *
 * Why this exists: the first build shipped a missing MAX_TAU_FF import, so
 * setTorqueFeedforward() threw a ReferenceError and POST /jog answered HTTP 500
 * with the feed-forward silently never applied. A grep-based "wiring check"
 * counted occurrences of the identifier and passed. Only executing the code
 * catches that class of defect.
 *
 * Usage: bun scripts/test-tau-feedforward.ts
 */
import { JogRunner } from '../mini-services/robot-control/jog-runner'
import { MotionGuard } from '../mini-services/robot-control/motion-guard'
import { UNLOCK_PHRASE, MASTER_UNLOCK_CODE } from '../mini-services/robot-control/motion-guard'
import { MAX_TAU_FF } from '../mini-services/robot-control/jog-constants'

const ZERO = [0, 0, 0, 0, 0, 0, 0]

interface Captured { joint: number; qAbs: number; dqAbs: number; kp: number; kd: number; tau: number }

function makeStub(absentJoint = -1) {
  const captured: Captured[] = []
  const measured = [0, 0, 0, 0, 0, 0, 0]
  return {
    captured,
    measured,
    bus: {
      snapshots: () => measured.map((q, joint) => ({
        joint, present: joint !== absentJoint, errorCode: 0, q,
      })),
      writeJog: async (joint: number, qAbs: number, dqAbs: number, kp: number, kd: number, tau: number) => {
        captured.push({ joint, qAbs, dqAbs, kp, kd, tau })
        measured[joint] = qAbs
        return true
      },
      zeroRef: () => ZERO,
    },
  }
}

let pass = 0, fail = 0
const check = (name: string, ok: boolean, detail = '') => {
  if (ok) { pass++; console.log(`  PASS  ${name}`) }
  else { fail++; console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`) }
}

console.log('=== A. setter works and is capped ===')
const guard = new MotionGuard()
guard.unlock(UNLOCK_PHRASE, MASTER_UNLOCK_CODE)
const s = makeStub()
const runner = new JogRunner(s.bus as any, guard, 0.25, 30, 1.5)

let threw = ''
try { runner.setTorqueFeedforward(2.8) } catch (e) { threw = (e as Error).message }
check('setTorqueFeedforward executes (no ReferenceError)', threw === '', threw)
check('value stored', runner.getTorqueFeedforward() === 2.8, `got ${runner.getTorqueFeedforward()}`)
check('clamped to +MAX_TAU_FF', runner.setTorqueFeedforward(999) === MAX_TAU_FF, `got ${runner.setTorqueFeedforward(999)}`)
check('clamped to -MAX_TAU_FF', runner.setTorqueFeedforward(-999) === -MAX_TAU_FF, `got ${runner.setTorqueFeedforward(-999)}`)
runner.setTorqueFeedforward(2.8)
check('status exposes tauFf', runner.status().tauFf === 2.8, `got ${runner.status().tauFf}`)

console.log('=== B. ramp packets carry the feed-forward ===')
runner.setRate(0.01)
runner.targetsAll([0, 0, 0, 0.06, 0, 0, 0])
s.captured.length = 0
runner.tick()
const j3 = s.captured.filter((w) => w.joint === 3)
check('joint 3 packet emitted', j3.length === 1, `got ${j3.length}`)
check('joint 3 packet carries tau=2.8', j3.length === 1 && j3[0].tau === 2.8, `got ${j3[0]?.tau}`)
check('kp/kd carried', j3.length === 1 && j3[0].kp === 30 && j3[0].kd === 1.5, `got kp=${j3[0]?.kp} kd=${j3[0]?.kd}`)
const others = s.captured.filter((w) => w.joint !== 3)
// targetsAll sets all seven, so every joint in this phase IS targeted — the
// bias belongs on all of them by design. The net-zero rule applies to joints
// with no target, which only exists in the keep-alive path (phase C).
check('all targeted joints carry tau=2.8',
  others.length > 0 && others.every((w) => w.tau === 2.8),
  `got ${others.map((w) => w.tau).join(',')}`)
check('ramp packets carry the ramp position, not the target',
  others.every((w) => Math.abs(w.qAbs) < 1e-12))

console.log('=== C. keep-alive keeps biasing the targeted joint only ===')
const s2 = makeStub(6)
const g2 = new MotionGuard()
g2.unlock(UNLOCK_PHRASE, MASTER_UNLOCK_CODE)
// Rate must be high enough that the ramp settles inside the tick budget:
// 0.06 rad at 0.01 rad/s needs 360 ticks, and an unsettled ramp resets the
// keep-alive clock every tick, so keep-alive would never fire.
const r2 = new JogRunner(s2.bus as any, g2, 0.25, 60, 1.5)
r2.setTorqueFeedforward(2.8)
r2.targetsAll([0, 0, 0, 0.06, 0, 0, 0])
// Run the ramp to arrival, then force a keep-alive burst.
for (let i = 0; i < 60; i++) r2.tick()
s2.captured.length = 0
for (let i = 0; i < 4; i++) r2.tick()
const ka3 = s2.captured.filter((w) => w.joint === 3)
const kaOther = s2.captured.filter((w) => w.joint !== 3)
check('keep-alive fired (ramp settled)', r2.status().keepaliveBursts > 0 && ka3.length >= 1,
  `bursts=${r2.status().keepaliveBursts} ka3=${ka3.length}`)
check('keep-alive targeted joint keeps tau=2.8', ka3.length > 0 && ka3.every((w) => w.tau === 2.8),
  `got ${ka3.map((w) => w.tau).join(',')}`)
check('every other written joint is targeted and biased',
  kaOther.length > 0 && kaOther.every((w) => w.tau === 2.8),
  `n=${kaOther.length} got ${kaOther.map((w) => w.tau).join(',')}`)
// A joint that is not answering must never be written, biased or not.
check('silent joint (present=false) is never written',
  s2.captured.filter((w) => w.joint === 6).length === 0,
  `got ${s2.captured.filter((w) => w.joint === 6).length} writes`)
check('keep-alive targeted joint is held at TARGET, not measured',
  ka3.length > 0 && ka3.every((w) => Math.abs(w.qAbs - 0.06) < 1e-9),
  `got ${ka3.map((w) => w.qAbs.toFixed(5)).join(',')}`)

console.log('=== D. locked guard blocks the feed-forward path ===')
const s3 = makeStub()
const g3 = new MotionGuard()
const r3 = new JogRunner(s3.bus as any, g3, 0.01, 60, 1.5)
r3.setTorqueFeedforward(2.8)
r3.targetsAll([0, 0, 0, 0.06, 0, 0, 0])
s3.captured.length = 0
r3.tick()
check('locked guard emits nothing (zero bytes on wire)', s3.captured.length === 0, `got ${s3.captured.length}`)
check('locked guard halts targets', Object.keys(r3.status().targets).length === 0)

console.log(`\n${fail === 0 ? '✓' : '✗'} torque feed-forward: ${pass} passed / ${fail} failed`)
process.exit(fail === 0 ? 0 : 1)
