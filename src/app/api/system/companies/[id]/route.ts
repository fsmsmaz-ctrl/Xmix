import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAdminUser } from '@/lib/auth'
import { sanitizeGeoUpdate } from '@/lib/geo'

const ALLOWED = ['pending', 'active', 'suspended'] as const

/**
 * PATCH /api/system/companies/[id]
 * { status?: 'active'|'suspended'|'pending' } — اعتماد / إيقاف / إعادة تنشيط
 * + حقول الموقع والتوصيل (استراتيجية «الأقرب إليك»):
 * { cityKey?, lat?+lng?, hasDelivery?, deliveryFee?, deliveryEta?, resetGeo? }
 * الحارس: مسؤول النظام فقط. التعقيم عبر sanitizeGeoUpdate (سجل الولايات).
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminUser()
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = (await req.json().catch(() => null)) as
      | (Record<string, unknown> & { status?: string; resetGeo?: boolean })
      | null
    if (!body) return NextResponse.json({ error: 'حمولة غير صالحة | Invalid payload' }, { status: 400 })

    const company = await db.company.findUnique({ where: { id } })
    if (!company)
      return NextResponse.json({ error: 'الشركة غير موجودة | Company not found' }, { status: 404 })

    /* مسح الموقع فقط */
    if (body.resetGeo === true) {
      const updated = await db.company.update({
        where: { id },
        data: { lat: null, lng: null, cityKey: null },
      })
      return NextResponse.json({ company: updated })
    }

    const data: Record<string, unknown> = {}

    /* الحالة */
    const status = body.status
    if (status !== undefined) {
      if (!status || !ALLOWED.includes(status as (typeof ALLOWED)[number]))
        return NextResponse.json({ error: 'حالة غير صالحة | Invalid status' }, { status: 400 })
      data.status = status
    }

    /* حقول الموقع والتوصيل */
    const geo = sanitizeGeoUpdate(body)
    if (geo.error) return NextResponse.json({ error: geo.error }, { status: 400 })
    Object.assign(data, geo.data)

    if (Object.keys(data).length === 0)
      return NextResponse.json({ error: 'لا حقول لتحديثها | Nothing to update' }, { status: 400 })

    const updated = await db.company.update({ where: { id }, data })
    return NextResponse.json({ company: updated })
  } catch (e) {
    console.error('PATCH /api/system/companies/[id] error:', e)
    return NextResponse.json({ error: 'Failed to update company' }, { status: 500 })
  }
}
