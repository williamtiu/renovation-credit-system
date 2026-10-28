/**
 * Keep-alive handoff test — pure logic, no hardware, no pty.
 *
 * Lag model: the arm sits a fixed 0.02 rad behind the angle it last was
 * commanded to. That is what makes "hold at target" and "hold at measured"
 * DIFFERENT observable values — the whole point of the handoff.
 *
 * Travel distances are kept short (0.10 rad) so the ramp actually settles
 * inside the tick budget: 0.10 rad at 0.25 rad/s = 0.4 s.
 *
 * Proves:
 *   - a settled joint WITH a target is kept at the TARGET (target + zeroRef);
 *   - a joint WITHOUT a target is asked its own measured angle (net motion 0);
 *   - keep-alive carries velocity 0 and runs at 20 Hz, not every 60 Hz tick;
 *   - no targets → no writes (jog.py: `if not self._targets: return []`);
 *   - a closed gate produces zero writes on the wire.
 *
 * Usage: bun scripts/test-jog-keepalive.ts
 */
import { JogRunner } from '../mini-services/robot-control/jog-runner'
import { MotionGuard, UNLOCK_PHRASE, MASTER_UNLOCK_CODE } from '../mini-services/robot-control/motion-guard'
import { KEEPALIVE_HZ, JOG_TICK_DT } from '../mini-services/robot-control/jog-constants'

const ZERO = [0.1, -0.2, 0.3, 0.000186, -0.4, 0.5, -0.5]
const REL_MEASURED = [0.9, 0.7, -1.3, 0.0, 2.4, -3.5, 4.5]   // URDF, relative to zero
const LAG = 0.02                                               // arm sits 0.02 rad behind command

type Write = { joint: number; qAbs: number; dqAbs: number; kp: number; kd: number }

class FakeArm {
  commanded: number[]
  writes: Write[] = []
  constructor(private lag: number = LAG) {
    this.commanded = [...REL_MEASURED]
  }
  measuredAbs(joint: number) {
    const dir = Math.sign(this.commanded[joint] - REL_MEASURED[joint]) || 1
    return this.commanded[joint] + ZERO[joint] - this.lag * dir
  }
  snapshots() {
    return REL_MEASURED.map((_, joint) => ({
      joint,
      present: true,
      errorCode: 0,
      q: this.measuredAbs(joint) - ZERO[joint],
    }))
  }
  async writeJog(joint: number, qAbs: number, dqAbs: number, kp: number, kd: number) {
    this.writes.push({ joint, qAbs, dqAbs, kp, kd })
    this.commanded[joint] = qAbs - ZERO[joint]   // arm chases the command
  }
  zeroRef() { return ZERO }
}

let pass = 0, fail = 0
const check = (name: string, ok: boolean, detail = '') => {
  if (ok) { pass++; console.log(`  PASS  ${name}`) }
  else { fail++; console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`) }
}

const TARGETS = REL_MEASURED.map((q, i) => q + (i % 2 === 0 ? 0.10 : -0.10))
const ticks = (sec: number) => Math.ceil(sec / JOG_TICK_DT)

console.log('=== ramp with short travel (0.10 rad ⇒ 0.4 s) ===')
const guard = new MotionGuard()
guard.unlock(UNLOCK_PHRASE, MASTER_UNLOCK_CODE)
const arm = new FakeArm()
const runner = new JogRunner(arm as any, guard, 0.25, 30, 1.5)

check('targets accepted while unlocked', runner.targetsAll(TARGETS) === null)
for (let i = 0; i < ticks(1.2); i++) runner.tick(JOG_TICK_DT)

const st = runner.status()
check('ramp settled', !runner.isMoving(), `remaining=${runner.remaining().toFixed(3)}`)
check('targets retained after settle', Object.keys(st.targets).length === 7)
check('keep-alive bursts counted', st.keepaliveBursts > 0, String(st.keepaliveBursts))
check('arm is 0.02 rad short of target (lag present ⇒ target != measured)',
  Math.abs((TARGETS[3] + ZERO[3]) - arm.measuredAbs(3)) > 1e-3,
  `targetAbs=${(TARGETS[3] + ZERO[3]).toFixed(5)} measuredAbs=${arm.measuredAbs(3).toFixed(5)}`)

console.log('=== A. settled joint is held AT THE TARGET, not at measured ===')
arm.writes = []
for (let i = 0; i < ticks(KEEPALIVE_HZ * 1.5); i++) runner.tick(JOG_TICK_DT)

const ka = arm.writes.filter((w) => w.dqAbs === 0)
const atTarget = ka.filter((w) => Math.abs(w.qAbs - (TARGETS[w.joint] + ZERO[w.joint])) < 1e-9).length
const atMeasured = ka.filter((w) => Math.abs(w.qAbs - arm.measuredAbs(w.joint)) < 1e-9).length
console.log(`  keepalive writes=${ka.length}  at-target=${atTarget}  at-measured=${atMeasured}  ` +
  `bursts=${runner.status().keepaliveBursts}  planCalls=${runner.status().planCalls}`)
check('keep-alive produced writes for all 7 joints', ka.length >= 7, String(ka.length))
check('EVERY keep-alive write holds the TARGET', atTarget === ka.length && ka.length > 0)
check('NOT one keep-alive write drags to measured', atMeasured === 0)
check('keep-alive carries velocity 0', ka.every((w) => w.dqAbs === 0))
check('keep-alive carries kp > 0 (FOC engaged, kp=kd=0 does not engage FOC)', ka.every((w) => w.kp > 0))
const st1 = runner.status()
const simSeconds = (st1.planCalls) * JOG_TICK_DT
const rateHz = st1.keepaliveBursts / simSeconds
console.log(`  measured cadence: bursts=${st1.keepaliveBursts} over ${simSeconds.toFixed(1)} s simulated = ${rateHz.toFixed(1)} Hz`)
check('keep-alive cadence ≈ 20 Hz (not every 60 Hz tick)',
  rateHz > KEEPALIVE_HZ - 3 && rateHz < KEEPALIVE_HZ + 3, `${rateHz.toFixed(1)} Hz`)

console.log('=== B. untargeted joints are asked their own measured angle ===')
const arm2 = new FakeArm()
const r2 = new JogRunner(arm2 as any, guard, 0.25, 30, 1.5)
const partial = [...TARGETS]
r2.targetsAll([partial[0], partial[1], partial[2], partial[3], partial[4], partial[5], partial[6]])
for (let i = 0; i < ticks(1.2); i++) r2.tick(JOG_TICK_DT)
r2.clear('operator clear')
arm2.writes = []
for (let i = 0; i < ticks(1.0); i++) r2.tick(JOG_TICK_DT)
check('after clear, no targets ⇒ no writes (matches jog.py early return)',
  arm2.writes.length === 0, String(arm2.writes.length))

console.log('=== B. net-zero: lag-free arm, targets equal measured ⇒ no-op move ===')
const arm3 = new FakeArm(0)
const r3 = new JogRunner(arm3 as any, guard, 0.25, 30, 1.5)
// Target exactly where the arm already is, in the relative frame.
r3.targetsAll(REL_MEASURED)
for (let i = 0; i < ticks(1.2); i++) r3.tick(JOG_TICK_DT)
arm3.writes = []
for (let i = 0; i < ticks(3.0); i++) r3.tick(JOG_TICK_DT)
const ka3 = arm3.writes.filter((w) => w.dqAbs === 0)
const netZero = ka3.filter((w) => Math.abs(w.qAbs - arm3.measuredAbs(w.joint)) < 1e-9).length
console.log(`  keepalive=${ka3.length} net-zero=${netZero}`)
check('targets == measured produces commanded == measured (net motion zero)',
  ka3.length > 0 && netZero === ka3.length, `keepalive=${ka3.length} netZero=${netZero}`)
check('keep-alive suppressed while any joint is still ramping (clock reset)',
  r3.isMoving() === false)

console.log('=== B2. all-7 targeted and settled ⇒ EVERY write holds its target ===')
const arm5 = new FakeArm()
const r5 = new JogRunner(arm5 as any, guard, 0.25, 30, 1.5)
r5.targetsAll(TARGETS)
for (let i = 0; i < ticks(2.0); i++) r5.tick(JOG_TICK_DT)
arm5.writes = []
for (let i = 0; i < ticks(3.0); i++) r5.tick(JOG_TICK_DT)
const ka5 = arm5.writes.filter((w) => w.dqAbs === 0)
const atT5 = ka5.filter((w) => Math.abs(w.qAbs - (TARGETS[w.joint] + ZERO[w.joint])) < 1e-9).length
const jointsSeen = new Set(ka5.map((w) => w.joint))
console.log(`  keepalive=${ka5.length} at-target=${atT5} joints=${jointsSeen.size}`)
check('all 7 joints kept at their target, none dragged to measured',
  jointsSeen.size === 7 && atT5 === ka5.length && ka5.length > 0)

console.log('=== C. closed gate produces zero writes on the wire ===')
const guard2 = new MotionGuard()
const arm4 = new FakeArm()
const r4 = new JogRunner(arm4 as any, guard2, 0.25, 30, 1.5)
check('locked guard refuses targets outright', typeof r4.targetsAll(TARGETS) === 'string')
for (let i = 0; i < ticks(1.0); i++) r4.tick(JOG_TICK_DT)
check('locked guard emits zero writes', arm4.writes.length === 0, String(arm4.writes.length))

console.log('=== D. deadman reflects a live stream ===')
check('deadman survived the ramp (guard beaten by ticks)', !guard.status().locked)

console.log(`\n${fail === 0 ? '✓' : '✗'} keep-alive handoff: ${pass} passed / ${fail} failed`)
process.exit(fail === 0 ? 0 : 1)
