import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAdminUser } from '@/lib/auth'

const ALLOWED = ['pending', 'active', 'suspended'] as const

/**
 * PATCH /api/system/companies/[id] — { status: 'active' | 'suspended' | 'pending' }
 * Approve / suspend / reactivate a merchant shelf.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminUser()
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = (await req.json()) as { status?: string }
    const status = body.status

    if (!status || !ALLOWED.includes(status as (typeof ALLOWED)[number]))
      return NextResponse.json({ error: 'حالة غير صالحة | Invalid status' }, { status: 400 })

    const company = await db.company.findUnique({ where: { id } })
    if (!company)
      return NextResponse.json({ error: 'الشركة غير موجودة | Company not found' }, { status: 404 })

    const updated = await db.company.update({
      where: { id },
      data: { status },
    })
    return NextResponse.json({ company: updated })
  } catch (e) {
    console.error('PATCH /api/system/companies/[id] error:', e)
    return NextResponse.json({ error: 'Failed to update company' }, { status: 500 })
  }
}
