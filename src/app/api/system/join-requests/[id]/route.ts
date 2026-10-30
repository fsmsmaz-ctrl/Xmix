import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAdminUser } from '@/lib/auth'
import { grantMerchant } from '@/lib/merchant'

/**
 * POST /api/system/join-requests/[id] — { action: 'approve' | 'reject' }
 *
 * approve → creates the merchant shelf from the request data and grants the
 * merchant permission: if the requested email is already registered the same
 * account is promoted; otherwise a merchant account is created with a
 * temporary password (returned once so the admin can hand it over).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminUser()
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = (await req.json()) as { action?: 'approve' | 'reject' }

    const request = await db.joinRequest.findUnique({ where: { id } })
    if (!request)
      return NextResponse.json({ error: 'الطلب غير موجود | Request not found' }, { status: 404 })
    if (request.status !== 'new')
      return NextResponse.json({ error: 'تم معالجة هذا الطلب مسبقاً | Already processed' }, { status: 409 })

    if (body.action === 'reject') {
      await db.joinRequest.update({ where: { id }, data: { status: 'rejected' } })
      return NextResponse.json({ ok: true, status: 'rejected' })
    }

    if (body.action !== 'approve')
      return NextResponse.json({ error: 'إجراء غير معروف | Unknown action' }, { status: 400 })

    const result = await grantMerchant({
      email: request.email,
      name: request.contactName,
      company: {
        nameAr: request.companyName,
        nameEn: request.companyName,
        category: request.category,
        city: request.city,
        description: request.description,
      },
    })

    await db.joinRequest.update({ where: { id }, data: { status: 'approved' } })

    return NextResponse.json({
      ok: true,
      status: 'approved',
      company: result.company,
      user: result.user,
      createdAccount: result.createdAccount,
      tempPassword: result.tempPassword ?? null,
    })
  } catch (e) {
    // التاجر القائم (له رف بالفعل) → 409 بدل 500 (BUG-FIX: رف يتيم)
    if (e instanceof Error && e.message === 'ALREADY_MERCHANT')
      return NextResponse.json(
        { error: 'هذا البريد تاجر بالفعل ولديه رف — لا يمكن إنشاء رف ثانٍ | This email is already a merchant with a shelf' },
        { status: 409 },
      )
    console.error('POST /api/system/join-requests/[id] error:', e)
    return NextResponse.json({ error: 'Failed to process join request' }, { status: 500 })
  }
}
