/**
 * IM6014 協議 — TypeScript 對 Python 參考嘅逐位元組相等測試
 *
 * 對照基準係 r1ui/protocol.py（SDK MotorProtocol.cpp 嘅逐位元組移植）產生嘅
 * reference vectors。任何唔一致都等於改變咗線上传輸嘅 byte，所以呢個測試
 * 係 serial 模式嘅准入门閘。
 *
 * 用法定向 vectors 檔案路徑（唔讀 .env）：
 *   bun scripts/test-im6014.ts <vectors.json>
 */

import { readFileSync } from 'node:fs'
import {
  buildControlPacket, buildClearPacket, buildResetPacket, parseFeedbackPacket,
  crc32, gearRatio, getErrorDescription, getWarningDescription,
  CONTROL_PACKET_SIZE, FEEDBACK_PACKET_SIZE, CONTROL_HEADER, FEEDBACK_HEADER,
  DEFAULT_BAUDRATE, JOINT_COUNT,
} from '../mini-services/robot-control/im6014-protocol'
import { loadJointCalibration } from '../mini-services/robot-control/joint-calibration'

const vectorsPath = process.argv[2]
if (!vectorsPath) {
  console.error('用法: bun scripts/test-im6014.ts <vectors.json>')
  process.exit(2)
}

const V = JSON.parse(readFileSync(vectorsPath, 'utf-8'))

let pass = 0
let fail = 0
const failures: string[] = []

function check(name: string, ok: boolean, detail = ''): void {
  if (ok) pass++
  else {
    fail++
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`)
  }
}

const near = (a: number, b: number, eps = 1e-12): boolean =>
  a === b || Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b))

// ---------- CRC32 表 ----------
check('crc32 table length', V.crcTable.length === 256, `got ${V.crcTable.length}`)

// ---------- crc32 逐 case ----------
for (const c of V.crc) {
  const data = Buffer.from(c.data, 'hex')
  const got = crc32(new Uint8Array(data))
  check(`crc32 len=${data.length}`, got === c.crc, `expected ${c.crc} got ${got}`)
}

// ---------- gear ratio ----------
for (const g of V.gear) {
  check(`gearRatio(${g.motor_id})`, near(gearRatio(g.motor_id), g.ratio), `expected ${g.ratio} got ${gearRatio(g.motor_id)}`)
}

// ---------- control packets: byte-exact ----------
for (const c of V.control) {
  const p = c.case
  const got = buildControlPacket({
    motorId: p.motor_id, mode: p.mode, timeout: p.timeout,
    torque: p.torque, speed: p.speed, position: p.position, kp: p.kp, kd: p.kd,
  })
  check(
    `control m=${p.motor_id} mode=${p.mode} pos=${p.position} kp=${p.kp}`,
    got.toString('hex') === c.packet,
    `expected ${c.packet}\n          got     ${got.toString('hex')}`
  )
}

// ---------- clear / reset packets ----------
for (const c of V.clear) {
  const got = buildClearPacket(c.motor_id)
  check(`clear m=${c.motor_id}`, got.toString('hex') === c.packet, `expected ${c.packet} got ${got.toString('hex')}`)
}
for (const c of V.reset) {
  const got = buildResetPacket(c.motor_id)
  check(`reset m=${c.motor_id}`, got.toString('hex') === c.packet, `expected ${c.packet} got ${got.toString('hex')}`)
}

// ---------- feedback parsing ----------
for (const f of V.feedback) {
  const raw = Buffer.from(f.raw, 'hex')
  const got = parseFeedbackPacket(new Uint8Array(raw))
  if (f.parsed === null) {
    check(`feedback reject ${f.raw.slice(0, 8)}…`, got === null, `expected null got ${JSON.stringify(got)}`)
    continue
  }
  if (got === null) {
    check(`feedback parse ${f.raw.slice(0, 8)}…`, false, 'expected a packet, got null')
    continue
  }
  const want = f.parsed
  const numericOk =
    near(got.torque, want.torque) && near(got.speed, want.speed) && near(got.position, want.position) &&
    near(got.voltage, want.voltage)
  const intOk =
    got.motorId === want.motorId && got.mode === want.mode && got.timeout === want.timeout &&
    got.tempDriver === want.tempDriver && got.tempWinding === want.tempWinding &&
    got.errorCode === want.errorCode && got.warningCode === want.warningCode
  check(
    `feedback m=${want.motorId} ints`, intOk,
    `want ${JSON.stringify([want.motorId, want.mode, want.timeout, want.tempDriver, want.tempWinding, want.errorCode, want.warningCode])} ` +
    `got ${JSON.stringify([got.motorId, got.mode, got.timeout, got.tempDriver, got.tempWinding, got.errorCode, got.warningCode])}`
  )
  check(
    `feedback m=${want.motorId} floats`, numericOk,
    `want tau=${want.torque} spd=${want.speed} pos=${want.position} V=${want.voltage} ` +
    `got tau=${got.torque} spd=${got.speed} pos=${got.position} V=${got.voltage}`
  )
}

// ---------- constants ----------
check('CONTROL_PACKET_SIZE', CONTROL_PACKET_SIZE === V.constants.CONTROL_PACKET_SIZE)
check('FEEDBACK_PACKET_SIZE', FEEDBACK_PACKET_SIZE === V.constants.FEEDBACK_PACKET_SIZE)
check('CONTROL_HEADER', CONTROL_HEADER[0] === V.constants.CONTROL_HEADER[0] && CONTROL_HEADER[1] === V.constants.CONTROL_HEADER[1])
check('FEEDBACK_HEADER', FEEDBACK_HEADER[0] === V.constants.FEEDBACK_HEADER[0] && FEEDBACK_HEADER[1] === V.constants.FEEDBACK_HEADER[1])
check('DEFAULT_BAUDRATE', DEFAULT_BAUDRATE === V.constants.DEFAULT_BAUDRATE)
check('JOINT_COUNT', JOINT_COUNT === V.constants.JOINT_COUNT)

// ---------- error / warning descriptions ----------
for (const e of V.errors) {
  check(`error ${e.code}`, getErrorDescription(e.code) === e.desc, `want "${e.desc}" got "${getErrorDescription(e.code)}"`)
}
for (const w of V.warnings) {
  check(`warning ${w.code}`, getWarningDescription(w.code) === w.desc, `want "${w.desc}" got "${getWarningDescription(w.code)}"`)
}

// ---------- calibration ----------
const calibText = V.calibration.map((c: any) => `${c.joint} ${c.dir} ${c.scale} ${c.offset}`).join('\n')
const calib = loadJointCalibration(calibText)
for (const want of V.calibration) {
  const got = calib[want.joint]
  check(`calib J${want.joint} params`, near(got.dir, want.dir) && near(got.scale, want.scale) && near(got.offset, want.offset) && near(got.gain(), want.gain),
    `want dir=${want.dir} scale=${want.scale} offset=${want.offset} gain=${want.gain} got dir=${got.dir} scale=${got.scale} offset=${got.offset} gain=${got.gain()}`)
  for (const [k, v] of Object.entries(want.toUrdf)) check(`toUrdf J${want.joint}(${k})`, near(got.toUrdf(Number(k)), v as number), `want ${v} got ${got.toUrdf(Number(k))}`)
  for (const [k, v] of Object.entries(want.toMotor)) check(`toMotor J${want.joint}(${k})`, near(got.toMotor(Number(k)), v as number), `want ${v} got ${got.toMotor(Number(k))}`)
  for (const [k, v] of Object.entries(want.vecToUrdf)) check(`vecToUrdf J${want.joint}(${k})`, near(got.vecToUrdf(Number(k)), v as number), `want ${v} got ${got.vecToUrdf(Number(k))}`)
  for (const [k, v] of Object.entries(want.vecToMotor)) check(`vecToMotor J${want.joint}(${k})`, near(got.vecToMotor(Number(k)), v as number), `want ${v} got ${got.vecToMotor(Number(k))}`)
}

// A truncated calibration table must be refused, not silently defaulted.
let truncatedRejected = false
try {
  loadJointCalibration('0 1.0 1.0 0.0\n1 1.0 1.0 0.0\n2 -1.0 1.0 0.0')
} catch {
  truncatedRejected = true
}
check('incomplete calibration rejected', truncatedRejected)

let badDirRejected = false
try {
  loadJointCalibration(Array.from({ length: 7 }, (_, i) => `${i} 0 1 0`).join('\n'))
} catch {
  badDirRejected = true
}
check('zero dir rejected', badDirRejected)

// ---------- report ----------
console.log(`IM6014 協議對照：${pass} 通過 / ${fail} 失敗（基準 = r1ui/protocol.py）`)
if (fail) {
  console.log('\n失敗項目：')
  for (const f of failures.slice(0, 40)) console.log(`  ✗ ${f}`)
  process.exit(1)
}
console.log('✓ TypeScript 產生嘅 packet 同 Python/SDK 參考逐位元組一致')
