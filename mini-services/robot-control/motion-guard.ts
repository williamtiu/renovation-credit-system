/**
 * Motion Guard — 機械人傳輸安全閘
 *
 * Port of r1ui/safety.py MotionGuard. Semantics that must not drift:
 *
 *   * LOCKED is the default, and the only state a freshly started service is in.
 *     In the locked state the driver writes **zero bytes**.
 *   * Telemetry on this bus is not passive: a motor answers only after it
 *     receives a packet, so live telemetry needs monitor-class traffic
 *     (position-hold at each joint's own measured angle → net-zero motion).
 *     The monitor class is armed separately from motion.
 *   * Monitor and motion are mutually exclusive: the poller yields the instant
 *     motion is unlocked, so two controllers never command the same joint.
 *   * E-Stop and serial write failures re-lock.
 */

export const UNLOCK_PHRASE = 'I ACCEPT FULL MOTION CONTROL'
export const MONITOR_PHRASE = 'ARM POSITION-HOLD MONITORING'
export const MASTER_UNLOCK_CODE = 'R1-7A'

export const MAX_HOLD_STEP_RAD = 0.005 // per poll cycle
export const MAX_HOLD_KP = 60.0
export const MAX_HOLD_KD = 5.0
export const DEADMAN_TIMEOUT = 2.0
export const AUTO_RELOCK_AFTER = 15.0

export class MotionLockedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MotionLocked'
  }
}

export type TransmitKind = 'motion' | 'monitor'

export interface GuardStatus {
  locked: boolean
  monitorArmed: boolean
  txPackets: number
  txBlocked: number
  unlockedAt: number | null
  relockIn: number | null
  lockReason: string
  monitorReason: string
  nonceHint: string
  events: Array<{ ts: number; message: string }>
}

export class MotionGuard {
  private locked = true
  private monitorArmed = false
  private nonce: string = MASTER_UNLOCK_CODE
  private unlockedAt: number | null = null
  private lastBeat: number | null = null
  private lockReason = 'startup default'
  private monitorReason = 'not armed'
  private txPackets = 0
  private txBlocked = 0
  private autoRelockAfter: number | null = null
  private events: Array<{ ts: number; message: string }> = []

  constructor() {
    this.log('guard armed: LOCKED')
  }

  private log(message: string): void {
    this.events.push({ ts: Date.now(), message })
    if (this.events.length > 300) this.events.splice(0, this.events.length - 300)
  }

  /** Hot-loop read of the gate — cheaper than status(), which copies arrays. */
  isLocked(): boolean {
    return this.locked
  }

  isMonitorArmed(): boolean {
    return this.monitorArmed
  }

  logEvent(message: string): void {
    this.log(message)
  }

  /**
   * Raise MotionLocked unless this class of transmit is authorised.
   * Called before every write, so a refusal never reaches the wire.
   */
  authorize(action: string, kind: TransmitKind = 'motion'): void {
    if (kind === 'monitor') {
      if (!this.monitorArmed) {
        this.txBlocked++
        this.log(`blocked ${action} (${this.monitorReason})`)
        throw new MotionLockedError(
          `${action} refused: monitor is not armed (${this.monitorReason}). ` +
          `Reading this bus needs position-hold traffic — arm the monitor first.`
        )
      }
      if (this.locked === false) {
        this.txBlocked++
        throw new MotionLockedError(
          `${action} refused: motion is unlocked, the poller yields to the operator.`
        )
      }
      this.txPackets++
      return
    }

    if (this.locked) {
      this.txBlocked++
      this.log(`blocked ${action} (${this.lockReason})`)
      throw new MotionLockedError(
        `${action} refused: motion is LOCKED (${this.lockReason}). ` +
        `Unlock with the phrase and console code first.`
      )
    }
    if (this.lastBeat !== null && (Date.now() / 1000 - this.lastBeat) > DEADMAN_TIMEOUT) {
      this.forceLock('deadman timeout - jog stream stalled')
      this.txBlocked++
      throw new MotionLockedError('stop refused: deadman timeout, guard re-locked')
    }
    this.txPackets++
  }

  armMonitor(phrase: string, nonce: string): { ok: boolean; message: string } {
    if (phrase.trim() !== MONITOR_PHRASE) {
      this.log('monitor arming rejected: phrase mismatch')
      return { ok: false, message: 'Phrase does not match.' }
    }
    if (nonce.trim().toUpperCase() !== this.nonce) {
      this.log('monitor arming rejected: nonce mismatch')
      return { ok: false, message: 'Console unlock code does not match.' }
    }
    this.monitorArmed = true
    this.monitorReason = 'position-hold polling armed by operator'
    this.log('MONITOR ARMED - position-hold polling authorised')
    return { ok: true, message: 'Monitor armed.' }
  }

  disarmMonitor(reason = 'operator disarm'): void {
    this.monitorArmed = false
    this.monitorReason = reason
    this.log(`monitor disarmed (${reason})`)
  }

  /**
   * Arm the read path without the phrase. Reading this bus is not passive, but
   * what the poller sends is a position-hold at each joint's own measured angle
   * (net-zero motion) and it yields the instant motion is unlocked. That
   * asymmetry is why opening the port may start reading on its own while moving
   * the arm still needs the phrase.
   */
  autoArmMonitor(reason = 'auto-armed on connect'): boolean {
    if (this.monitorArmed) return false
    this.monitorArmed = true
    this.monitorReason = reason
    this.log(`MONITOR AUTO-ARMED - ${reason}`)
    return true
  }

  unlock(phrase: string, nonce: string): { ok: boolean; message: string } {
    if (phrase.trim() !== UNLOCK_PHRASE) {
      this.log('unlock rejected: phrase mismatch')
      return { ok: false, message: 'Phrase does not match.' }
    }
    if (nonce.trim().toUpperCase() !== this.nonce) {
      this.log('unlock rejected: nonce mismatch')
      return { ok: false, message: 'Console unlock code does not match.' }
    }
    this.locked = false
    this.unlockedAt = Date.now() / 1000
    this.lastBeat = Date.now() / 1000
    this.lockReason = 'Unlocked by operator'
    this.log('UNLOCKED - motor transmit authorised')
    return { ok: true, message: 'Motion unlocked.' }
  }

  lock(reason = 'operator lock'): void {
    this.forceLock(reason)
  }

  private forceLock(reason: string): void {
    this.locked = true
    this.unlockedAt = null
    this.lastBeat = null
    this.lockReason = reason
    this.log(`LOCKED (${reason})`)
  }

  /** Heartbeat from the jog stream; keeps the deadman from firing. */
  beat(): void {
    if (this.locked) return
    this.lastBeat = Date.now() / 1000
  }

  /** Returns true when the deadman fired and the guard re-locked. */
  checkDeadman(): boolean {
    if (this.locked) return false
    if (this.lastBeat !== null && (Date.now() / 1000 - this.lastBeat) > DEADMAN_TIMEOUT) {
      this.forceLock('deadman timeout - jog stream stalled')
      return true
    }
    return false
  }

  setAutoRelockAfter(seconds: number | null): void {
    this.autoRelockAfter = seconds
  }

  status(): GuardStatus {
    let relockIn: number | null = null
    if (this.unlockedAt !== null && this.autoRelockAfter !== null) {
      relockIn = Math.max(0, this.autoRelockAfter - (Date.now() / 1000 - this.unlockedAt))
    }
    return {
      locked: this.locked,
      monitorArmed: this.monitorArmed,
      txPackets: this.txPackets,
      txBlocked: this.txBlocked,
      unlockedAt: this.unlockedAt,
      relockIn,
      lockReason: this.lockReason,
      monitorReason: this.monitorReason,
      nonceHint: this.nonce.slice(0, 2) + '***' + this.nonce.slice(-2),
      events: this.events.slice(-40).reverse(),
    }
  }
}
