/**
 * Joint calibration + declared zero reference
 *
 * Mirrors r1ui/kinematics.py JointCalibration:
 *   urdf = dir * scale * motor + offset
 *
 * and r1ui/bus.py's zero-reference handling: the angles reported to the UI are
 * relative to the pose the *operator* declared as zero, persisted to
 * joint_zero.json, so a restart cannot silently redefine zero.
 */

import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync, unlinkSync } from 'node:fs'
import { dirname } from 'node:path'

export const JOINT_COUNT = 7

export class JointCalibration {
  constructor(
    public dir = 1.0,
    public scale = 1.0,
    public offset = 0.0
  ) {}

  gain(): number {
    const d = Math.abs(this.dir) > 1e-6 ? this.dir : 1.0
    const s = Math.abs(this.scale) > 1e-6 ? Math.abs(this.scale) : 1.0
    return d * s
  }

  toUrdf(motorQ: number): number {
    return this.gain() * motorQ + this.offset
  }

  toMotor(urdfQ: number): number {
    return (urdfQ - this.offset) / this.gain()
  }

  vecToUrdf(motorV: number): number {
    return this.gain() * motorV
  }

  vecToMotor(urdfV: number): number {
    return urdfV / this.gain()
  }
}

/**
 * Parses "joint dir scale offset" lines; the legacy 3-column form means scale=1.
 * Throws on any malformed or incomplete table — calibration drives every angle
 * we report, so a partial table must not be accepted.
 */
export function loadJointCalibration(text: string): JointCalibration[] {
  const calib: JointCalibration[] = Array.from({ length: JOINT_COUNT }, () => new JointCalibration())
  const seen: boolean[] = Array(JOINT_COUNT).fill(false)

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const parts = line.split(/\s+/)
    if (parts.length < 3) throw new Error(`bad calib line: ${line}`)
    const joint = parseInt(parts[0], 10)
    if (!(joint >= 0 && joint < JOINT_COUNT)) {
      throw new Error(`joint index out of range: ${joint}`)
    }
    const direction = parseFloat(parts[1])
    if (Math.abs(direction) < 1e-6) throw new Error(`invalid dir for joint ${joint}`)
    let scale: number, offset: number
    if (parts.length >= 4) {
      scale = parseFloat(parts[2])
      offset = parseFloat(parts[3])
    } else {
      scale = 1.0
      offset = parseFloat(parts[2])
    }
    calib[joint] = new JointCalibration(direction, scale, offset)
    seen[joint] = true
  }

  const missing = seen.map((ok, i) => (ok ? -1 : i)).filter((i) => i >= 0)
  if (missing.length) throw new Error(`missing joints in calibration: ${missing.join(', ')}`)
  return calib
}

export function loadJointCalibrationFile(path: string): JointCalibration[] {
  return loadJointCalibration(readFileSync(path, 'utf-8'))
}

export interface ZeroReference {
  capturedAt: number | null
  source: string
  qAbs: number[]
}

/**
 * The declared zero belongs to the arm, not to this process: reopening the port
 * must bring back the pose the operator named as 0, never the pose the arm
 * happens to be parked in.
 */
export class ZeroReferenceStore {
  constructor(private path: string) {}

  load(): ZeroReference | null {
    if (!existsSync(this.path)) return null
    let payload: any
    try {
      payload = JSON.parse(readFileSync(this.path, 'utf-8'))
    } catch {
      return null
    }
    const values = payload?.q_abs
    if (!Array.isArray(values) || values.length !== JOINT_COUNT) return null
    if (values.some((v: unknown) => typeof v !== 'number' || !Number.isFinite(v))) return null
    return {
      capturedAt: typeof payload.captured_at === 'number' ? payload.captured_at : null,
      source: typeof payload.source === 'string' ? payload.source : 'restored',
      qAbs: values.map((v: number) => Number(v)),
    }
  }

  save(ref: ZeroReference): void {
    mkdirSync(dirname(this.path), { recursive: true })
    const tmp = `${this.path}.tmp`
    writeFileSync(tmp, JSON.stringify({ captured_at: ref.capturedAt, source: ref.source, q_abs: ref.qAbs }))
    renameSync(tmp, this.path)
  }

  clear(): void {
    if (!existsSync(this.path)) return
    unlinkSync(this.path)
  }
}
