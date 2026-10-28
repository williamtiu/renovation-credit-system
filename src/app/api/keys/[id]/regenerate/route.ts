import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateApiKey } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

/** POST /api/keys/[id]/regenerate — 重新生成 key（舊 key 立即失效） */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await db.apiUser.findUnique({ where: { id } })
  if (!user) {
    return NextResponse.json({ ok: false, error: 'API user 不存在' }, { status: 404 })
  }

  const apiKey = generateApiKey()
  await db.apiUser.update({ where: { id }, data: { apiKey } })

  return NextResponse.json({
    ok: true,
    data: { id, name: user.name, apiKey }, // ⚠️ 完整 key 只回傳呢一次
  })
}
