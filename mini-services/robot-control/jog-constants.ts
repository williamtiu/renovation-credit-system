/**
 * Jog ramp constants — values measured on this arm, not chosen on paper
 *
 * These come from r1ui/jog.py and r1ui/safety.py. They are safety bounds, and
 * the reasons are recorded there; the short version:
 *
 *  MAX_JOG_LAG_RAD  a commanded pose 0.05 rad (3°) behind the real one means the
 *                   arm is not tracking the ramp. A motor that is not following
 *                   keeps accelerating, so chasing that command is the runaway.
 *  ANCHOR_LEAD_RAD  the ramp may lead the measured angle by 0.03 rad (1.7°):
 *                   above the lag a healthy arm carries at the allowed speeds
 *                   (measured ~0.015 rad on joint 7 at 0.25 rad/s), below the
 *                   0.05 rad bound. A one-step lead aborted a good 90° loop.
 *  STALL_RELEASE_S  a bound joint pinned at the lead holds kp*lead torque with
 *                   dq = 0; measured on joint 7 the winding went 47 → 61 °C in
 *                   twenty seconds of one such leg. Three seconds is the release.
 *  MAX_JOG_SPEED    measured ceiling.
 */

// ramp clock
export const JOG_TICK_DT = 1.0 / 60.0
export const JOG_DT_MAX = 0.05
export const JOG_SETTLE_EPS = 0.0002
export const KEEPALIVE_HZ = 20.0

// speed and gain ceilings
export const MAX_JOG_SPEED = 1.0   // rad/s, measured
// Gains are split so the operating default stays conservative while an
// operator-authorized run can go higher: torque is kp × lead, and measured on
// this arm kp=60 delivered only 1.82 Nm — just under the ~2.6 Nm a bound joint
// needs. The hard cap is the safety boundary, not the default.
export const MAX_JOG_KP = 120.0    // Nm/rad hard ceiling
export const DEFAULT_JOG_KP_LIMIT = 60.0  // ceiling before an authorized raise
export const MAX_JOG_KD = 5.0      // Nm/(rad/s)

// defaults the operator starts with
export const DEFAULT_JOG_RATE = 0.25
export const DEFAULT_JOG_KP = 30.0
export const DEFAULT_JOG_KD = 1.5

// runaway bounds
export const MAX_JOG_LAG_RAD = 0.05
export const ANCHOR_LEAD_RAD = 0.03
export const ANCHOR_SLACK_RAD = 1e-9
export const STALL_RELEASE_S = 3.0
