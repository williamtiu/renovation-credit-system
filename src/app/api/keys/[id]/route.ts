import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { computeExpiry } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/keys/[id] — 更新（名稱/角色/啟用狀態/email/有效期）
 * Body 可選:
 *   { name?, role?, active?, email?,
 *     expiresInDays?: number | null,        // 重新設定：由現在起算；null = 永久
 *     extendDays?: number }                 // 延期：由現有 expiresAt 起加 N 日（永久 key 視為由現在起算）
 */
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

  // --- 有效期管理 ---
  if (body.expiresInDays !== undefined) {
    if (body.expiresInDays === null || body.expiresInDays === 'never') {
      data.expiresAt = null // 永久
    } else {
      const n = Number(body.expiresInDays)
      if (!Number.isFinite(n) || n <= 0 || n > 3650) {
        return NextResponse.json(
          { ok: false, error: 'expiresInDays 必須為 0–3650 之間嘅正數或 null（永久）' },
          { status: 400 }
        )
      }
      data.expiresAt = computeExpiry(n)
    }
  }
  // 延期：喺現有到期時間基礎上加日數（已過期/永久 key 由現在起算）
  if (body.extendDays !== undefined) {
    const n = Number(body.extendDays)
    if (!Number.isFinite(n) || n <= 0 || n > 3650) {
      return NextResponse.json({ ok: false, error: 'extendDays 必須為 0–3650 之間嘅正數' }, { status: 400 })
    }
    const base = user.expiresAt && user.expiresAt.getTime() > Date.now() ? user.expiresAt.getTime() : Date.now()
    data.expiresAt = new Date(base + n * 24 * 3600 * 1000)
  }

  const updated = await db.apiUser.update({ where: { id }, data })
  return NextResponse.json({
    ok: true,
    data: {
      id: updated.id,
      name: updated.name,
      role: updated.role,
      active: updated.active,
      expiresAt: updated.expiresAt,
    },
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
