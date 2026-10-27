import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

const SYSTEM_POSES = [
  { name: 'Home 歸零位', category: 'home', joints: '[0, 0.1, 0, 0.55, 0, 0, 0]', duration: 2.5, description: 'SDK Home 指令對應嘅 URDF 零位姿勢', isSystem: true },
  { name: 'Ready 預備位', category: 'working', joints: '[0, 0.35, 0, 1.2, 0, 0, 0]', duration: 2.0, description: '常用工作預備姿勢（手肘彎曲）', isSystem: true },
  { name: 'Safe 安全收納', category: 'safe', joints: '[0, 0.12, 0, 0.5, 0, 0, 0]', duration: 2.0, description: '手臂貼近身體嘅安全姿勢', isSystem: true },
  { name: 'Wave 揮手左', category: 'demo', joints: '[0.4, 0.9, 0, 1.4, 0, 0.3, 0.6]', duration: 1.8, description: '演示用：揮手動作起點', isSystem: true },
  { name: 'Wave 揮手右', category: 'demo', joints: '[0.4, 0.9, 0, 1.0, 0, -0.3, -0.6]', duration: 1.2, description: '演示用：揮手動作終點', isSystem: true },
  { name: 'Reach 前伸', category: 'working', joints: '[0.9, 0.5, 0.3, 1.5, 0.5, 0.2, 0.3]', duration: 2.0, description: '手臂向前伸展抓取姿勢', isSystem: true },
]

async function ensureSeed() {
  const count = await db.posePreset.count()
  if (count === 0) {
    await db.posePreset.createMany({ data: SYSTEM_POSES })
  }
}

/** GET /api/poses — 姿勢庫列表 */
export async function GET() {
  await ensureSeed()
  const poses = await db.posePreset.findMany({ orderBy: [{ isSystem: 'desc' }, { createdAt: 'asc' }] })
  return NextResponse.json({
    ok: true,
    data: poses.map(p => ({ ...p, joints: JSON.parse(p.joints) })),
  })
}

/** POST /api/poses — 新增自訂姿勢 Body: { name, joints: number[7], duration?, description?, category? } */
export async function POST(req: NextRequest) {
  let body: { name?: string; joints?: number[]; duration?: number; description?: string; category?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON body 解析失敗' }, { status: 400 })
  }

  if (!body.name || !Array.isArray(body.joints) || body.joints.length !== 7) {
    return NextResponse.json(
      { ok: false, error: '需要 name 同 joints (7 元素陣列, rad)' },
      { status: 400 }
    )
  }
  if (body.joints.some(j => typeof j !== 'number' || Number.isNaN(j))) {
    return NextResponse.json({ ok: false, error: 'joints 必須全部係數值' }, { status: 400 })
  }

  const exists = await db.posePreset.findUnique({ where: { name: body.name } })
  if (exists) {
    return NextResponse.json({ ok: false, error: `姿勢名稱已存在: ${body.name}` }, { status: 409 })
  }

  const pose = await db.posePreset.create({
    data: {
      name: body.name,
      description: body.description ?? null,
      category: body.category ?? 'custom',
      joints: JSON.stringify(body.joints),
      duration: Math.min(Math.max(body.duration ?? 2.0, 0.5), 30),
    },
  })
  return NextResponse.json({ ok: true, data: { ...pose, joints: JSON.parse(pose.joints) } }, { status: 201 })
}
