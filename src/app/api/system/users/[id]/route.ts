import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAdminUser } from '@/lib/auth'
import { grantMerchant } from '@/lib/merchant'

type Body = {
  action?: 'promote' | 'demote'
  company?: {
    nameAr?: unknown
    nameEn?: unknown
    category?: unknown
    city?: unknown
    description?: unknown
    emoji?: unknown
  }
}

const ERR: Record<string, { ar: string; en: string; code: number }> = {
  USER_NOT_FOUND: { ar: 'الحساب غير موجود', en: 'User not found', code: 404 },
  CANNOT_PROMOTE_ADMIN: { ar: 'لا يمكن منح صلاحية تاجر لحساب مسؤول', en: 'Cannot promote an admin account', code: 400 },
  COMPANY_NAME_REQUIRED: { ar: 'اسم الشركة (عربي) مطلوب', en: 'Company name (Arabic) required', code: 400 },
  EMAIL_REQUIRED: { ar: 'بريد إلكتروني غير صالح', en: 'Invalid email', code: 400 },
}

function errResponse(key: string) {
  const e = ERR[key] ?? { ar: 'خطأ غير متوقع', en: 'Unexpected error', code: 500 }
  return NextResponse.json({ error: `${e.ar} | ${e.en}`, code: key }, { status: e.code })
}

/**
 * POST /api/system/users/[id]
 *  - { action: 'promote', company: { nameAr, nameEn?, category?, city? } } → grant merchant permission
 *  - { action: 'demote' } → revoke merchant permission (company suspended, role back to customer)
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminUser()
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = (await req.json()) as Body

    if (id === admin.id)
      return NextResponse.json({ error: 'لا يمكن تعديل حسابك الخاص | Cannot modify your own account' }, { status: 400 })

    if (body.action === 'promote') {
      const nameAr = String(body.company?.nameAr ?? '').trim()
      if (nameAr.length < 2)
        return NextResponse.json({ error: 'اسم الشركة (عربي) مطلوب | Company name (AR) required' }, { status: 400 })

      const target = await db.user.findUnique({ where: { id } })
      if (!target)
        return NextResponse.json({ error: 'الحساب غير موجود | User not found' }, { status: 404 })
      if (target.role === 'owner' && target.companyId)
        return NextResponse.json({ error: 'الحساب تاجر بالفعل | Already a merchant' }, { status: 409 })
      if (target.role === 'admin')
        return NextResponse.json({ error: 'لا يمكن منح صلاحية تاجر لمسؤول | Cannot promote an admin' }, { status: 400 })

      const result = await grantMerchant({
        userId: id,
        company: {
          nameAr,
          nameEn: String(body.company?.nameEn ?? '') || undefined,
          category: String(body.company?.category ?? '') || undefined,
          city: String(body.company?.city ?? '') || undefined,
          description: String(body.company?.description ?? '') || undefined,
          emoji: String(body.company?.emoji ?? '') || undefined,
        },
      })
      return NextResponse.json({ ok: true, ...result })
    }

    if (body.action === 'demote') {
      const target = await db.user.findUnique({ where: { id } })
      if (!target)
        return NextResponse.json({ error: 'الحساب غير موجود | User not found' }, { status: 404 })
      if (target.role === 'admin')
        return NextResponse.json({ error: 'لا يمكن إلغاء صلاحية مسؤول | Cannot demote an admin' }, { status: 400 })
      if (target.role !== 'owner')
        return NextResponse.json({ error: 'الحساب ليس تاجراً | Not a merchant' }, { status: 400 })

      await db.$transaction([
        // hide the shelf from the storefront
        db.company.update({
          where: { id: target.companyId! },
          data: { status: 'suspended' },
        }),
        db.user.update({
          where: { id },
          data: { role: 'customer', companyId: null },
        }),
      ])
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'إجراء غير معروف | Unknown action' }, { status: 400 })
  } catch (e) {
    const code = e instanceof Error && ERR[e.message] ? e.message : undefined
    if (code) return errResponse(code)
    console.error('POST /api/system/users/[id] error:', e)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}
