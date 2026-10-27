import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/** PATCH /api/keys/[id] — 更新（名稱/角色/啟用狀態/email） */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await db.apiUser.findUnique({ where: { id } })
  if (!user) {
    return NextResponse.json({ ok: false, error: 'API user 不存在' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const data: Record<string, unknown> = {}
  if (typeof body.name === 'string' && body.name.trim()) {
    const exists = await db.apiUser.findUnique({ where: { name: body.name.trim() } })
    if (exists && exists.id !== id) {
      return NextResponse.json({ ok: false, error: `名稱已存在: ${body.name}` }, { status: 409 })
    }
    data.name = body.name.trim()
  }
  if (['admin', 'operator', 'viewer'].includes(body.role)) data.role = body.role
  if (typeof body.active === 'boolean') data.active = body.active
  if (typeof body.email === 'string') data.email = body.email || null

  const updated = await db.apiUser.update({ where: { id }, data })
  return NextResponse.json({
    ok: true,
    data: { id: updated.id, name: updated.name, role: updated.role, active: updated.active },
  })
}

/** DELETE /api/keys/[id] — 永久刪除 API Key */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await db.apiUser.findUnique({ where: { id } })
  if (!user) {
    return NextResponse.json({ ok: false, error: 'API user 不存在' }, { status: 404 })
  }
  await db.apiUser.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
