import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateApiKey, maskApiKey } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

/** GET /api/keys — API Key 列表（key 以掩碼顯示） */
export async function GET() {
  const users = await db.apiUser.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json({
    ok: true,
    data: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      active: u.active,
      keyMasked: maskApiKey(u.apiKey),
      lastUsedAt: u.lastUsedAt,
      createdAt: u.createdAt,
    })),
  })
}

/**
 * POST /api/keys — 建立新 API Key
 * Body: { name, role?: 'admin'|'operator'|'viewer', email? }
 * 回傳完整 key（僅此一次，之後只顯示掩碼）
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const role = ['admin', 'operator', 'viewer'].includes(body.role) ? body.role : 'operator'

  if (!name) {
    return NextResponse.json({ ok: false, error: '需要 name（key 名稱）' }, { status: 400 })
  }

  const exists = await db.apiUser.findUnique({ where: { name } })
  if (exists) {
    return NextResponse.json({ ok: false, error: `名稱已存在: ${name}` }, { status: 409 })
  }

  const apiKey = generateApiKey()
  const user = await db.apiUser.create({
    data: {
      name,
      email: typeof body.email === 'string' && body.email ? body.email : null,
      role,
      apiKey,
    },
  })

  return NextResponse.json(
    {
      ok: true,
      data: {
        id: user.id,
        name: user.name,
        role: user.role,
        active: user.active,
        apiKey, // ⚠️ 完整 key 只回傳呢一次
        createdAt: user.createdAt,
      },
    },
    { status: 201 }
  )
}
