import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { sanitizeGeoUpdate } from '@/lib/geo'

/**
 * GET /api/admin/company — إعدادات موقع الرف والتوصيل (لمالكه التاجر)
 * PATCH /api/admin/company — تحديثها: { cityKey?, lat+lng?, hasDelivery?,
 *   deliveryFee?, deliveryEta?, resetGeo? }
 * الحارس: جلسة تاجر (owner) له شركة فقط. التعقيم عبر sanitizeGeoUpdate.
 */

async function ownerCompanyId(): Promise<string | null> {
  const user = await getSessionUser()
  if (!user || user.role !== 'owner' || !user.companyId) return null
  return user.companyId as string
}

export async function GET() {
  try {
    const companyId = await ownerCompanyId()
    if (!companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const company = await db.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        slug: true,
        nameAr: true,
        nameEn: true,
        locationAr: true,
        locationEn: true,
        cityKey: true,
        lat: true,
        lng: true,
        hasDelivery: true,
        deliveryFee: true,
        deliveryEta: true,
      },
    })
    if (!company) return NextResponse.json({ error: 'الرف غير موجود | Shelf not found' }, { status: 404 })
    return NextResponse.json({ company })
  } catch (e) {
    console.error('GET /api/admin/company error:', e)
    return NextResponse.json({ error: 'Failed to load shelf geo' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const companyId = await ownerCompanyId()
    if (!companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json().catch(() => null)) as
      | (Record<string, unknown> & { resetGeo?: boolean })
      | null
    if (!body) return NextResponse.json({ error: 'حمولة غير صالحة | Invalid payload' }, { status: 400 })

    // مسح الموقع كاملاً (عند فشل GPS مثلاً) — لا يلمس إعدادات التوصيل
    if (body.resetGeo === true) {
      const company = await db.company.update({
        where: { id: companyId },
        data: { lat: null, lng: null, cityKey: null },
      })
      return NextResponse.json({ company: { id: company.id, cityKey: company.cityKey, lat: company.lat, lng: company.lng } })
    }

    const geo = sanitizeGeoUpdate(body)
    if (geo.error || geo.data === null)
      return NextResponse.json({ error: geo.error || 'حمولة غير صالحة | Invalid payload' }, { status: 400 })

    const company = await db.company.update({ where: { id: companyId }, data: geo.data })
    return NextResponse.json({
      company: {
        id: company.id,
        cityKey: company.cityKey,
        lat: company.lat,
        lng: company.lng,
        hasDelivery: company.hasDelivery,
        deliveryFee: company.deliveryFee,
        deliveryEta: company.deliveryEta,
      },
    })
  } catch (e) {
    console.error('PATCH /api/admin/company error:', e)
    return NextResponse.json({ error: 'Failed to update shelf geo' }, { status: 500 })
  }
}
