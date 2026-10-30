import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  areaByKey, findNearestArea, formatKm, haversineKm, matchAreaFromText,
  nearbyScore, validCoords, NEARBY_WEIGHTS,
} from '@/lib/geo'

/**
 * GET /api/nearby — استراتيجية «الأقرب إليك»
 * ────────────────────────────────────────────
 * المدخلات: lat+lng (موقع GPS) أو city=<مفتاح ولاية> (اختيار يدوي)،
 *          limit (عدد المحلات ≤24، افتراضي 12)، perStore (منتجات لكل محل ≤8، افتراضي 4)
 * المنطق:
 *   1) تحديد نقطة العميل.
 *   2) كل المحلات المنشورة (active).
 *   3) لكل محل: إحداثياته الخاصة، وإلا الاستنتاج التلقائي من نص الموقع
 *      المحفوظ (مثل «سوق الموز، مسقط») — يُكتب في القاعدة مرة واحدة
 *      (idempotent) فتغطى المحلات القديمة دون أي عمل يدوي.
 *   4) حساب المسافة هافرساين + الدرجة الذكية: القرب ثم التقييم ثم
 *      التوصيل ثم المميز — وترتيب تنازلي.
 *   5) أفضل منتجات متاحة لكل محل.
 */

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams

    /* ── 1) نقطة العميل ── */
    let origin: { lat: number; lng: number; mode: 'gps' | 'city' } | null = null
    let originAreaAr = ''
    let originAreaEn = ''
    const latRaw = sp.get('lat')
    const lngRaw = sp.get('lng')
    const cityRaw = sp.get('city')?.trim() || ''

    if (latRaw !== null && lngRaw !== null) {
      const lat = Number(latRaw)
      const lng = Number(lngRaw)
      if (!validCoords(lat, lng))
        return NextResponse.json({ error: 'إحداثيات غير صالحة | Invalid coordinates' }, { status: 400 })
      origin = { lat, lng, mode: 'gps' }
    } else if (cityRaw) {
      const area = areaByKey(cityRaw)
      if (!area)
        return NextResponse.json({ error: 'ولاية غير معروفة | Unknown area' }, { status: 400 })
      origin = { lat: area.lat, lng: area.lng, mode: 'city' }
      originAreaAr = area.ar
      originAreaEn = area.en
    } else if (latRaw !== null || lngRaw !== null) {
      return NextResponse.json({ error: 'أرسل lat و lng معاً | Send lat & lng together' }, { status: 400 })
    }

    const limitRaw = Number(sp.get('limit'))
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(24, Math.floor(limitRaw)) : 12
    const perStoreRaw = Number(sp.get('perStore'))
    const perStore = Number.isFinite(perStoreRaw) && perStoreRaw > 0 ? Math.min(8, Math.floor(perStoreRaw)) : 4

    /* ── 2) المحلات المنشورة ── */
    const companies = await db.company.findMany({
      where: { status: 'active' },
      orderBy: { joinedAt: 'asc' },
    })

    /* ── 3+4) الإحداثيات والاستنتاج التلقائي والمسافة والدرجة ── */
    type Scored = {
      c: (typeof companies)[number]
      distanceKm: number | null
      areaAr: string
      areaEn: string
      cityKey: string | null
      score: number
    }
    const autoMatchWrites: Promise<unknown>[] = []
    const scored: Scored[] = companies.map((c) => {
      let lat = c.lat
      let lng = c.lng
      let cityKey = c.cityKey
      let areaAr = ''
      let areaEn = ''

      // استنتاج تلقائي مرة واحدة من نص الموقع الحر — يملأ الرفوف القديمة
      if ((lat === null || lng === null) && !cityKey) {
        const matched = matchAreaFromText(c.locationAr) ?? matchAreaFromText(c.locationEn)
        if (matched) {
          lat = matched.lat
          lng = matched.lng
          cityKey = matched.key
          autoMatchWrites.push(
            db.company.update({
              where: { id: c.id },
              data: { lat: matched.lat, lng: matched.lng, cityKey: matched.key },
            }).catch(() => null),
          )
        }
      }
      // محلات لها ولاية بلا إحداثيات: مركز الولاية كافٍ
      if ((lat === null || lng === null) && cityKey) {
        const area = areaByKey(cityKey)
        if (area) {
          lat = area.lat
          lng = area.lng
        }
      }
      if (cityKey) {
        const area = areaByKey(cityKey)
        if (area) {
          areaAr = area.ar
          areaEn = area.en
        }
      }

      const distanceKm =
        origin && lat !== null && lng !== null
          ? haversineKm(origin.lat, origin.lng, lat, lng)
          : null

      return {
        c,
        distanceKm,
        areaAr,
        areaEn,
        cityKey,
        score: nearbyScore({
          distanceKm,
          rating: c.rating,
          hasDelivery: c.hasDelivery,
          isFeatured: c.isFeatured,
        }),
      }
    })

    // الكتابة الرجعية لا تعطل الاستجابة أبداً
    if (autoMatchWrites.length) await Promise.allSettled(autoMatchWrites)

    // الأعلى درجة أولاً؛ عند التساوي الأقرب ثم الأقدم
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      const da = a.distanceKm ?? Number.POSITIVE_INFINITY
      const dbOther = b.distanceKm ?? Number.POSITIVE_INFINITY
      if (da !== dbOther) return da - dbOther
      return a.c.joinedAt.getTime() - b.c.joinedAt.getTime()
    })
    const top = scored.slice(0, limit)

    /* ── 5) أفضل منتجات متاحة لكل محل ── */
    const ids = top.map((s) => s.c.id)
    const products = ids.length
      ? await db.product.findMany({
          where: { companyId: { in: ids }, stock: { gt: 0 } },
          orderBy: [{ isBestSeller: 'desc' }, { rating: 'desc' }, { createdAt: 'desc' }],
          take: Math.min(300, ids.length * perStore * 2),
        })
      : []
    const byCompany = new Map<string, typeof products>()
    for (const p of products) {
      const arr = byCompany.get(p.companyId) ?? []
      if (arr.length < perStore) arr.push(p)
      byCompany.set(p.companyId, arr)
    }

    /* ── 6) الاستجابة ── */
    const stores = top.map((s) => ({
      id: s.c.id,
      slug: s.c.slug,
      nameAr: s.c.nameAr,
      nameEn: s.c.nameEn,
      taglineAr: s.c.taglineAr,
      taglineEn: s.c.taglineEn,
      category: s.c.category,
      emoji: s.c.emoji,
      gradient: s.c.gradient,
      rating: s.c.rating,
      isFeatured: s.c.isFeatured,
      locationAr: s.c.locationAr,
      locationEn: s.c.locationEn,
      cityKey: s.cityKey,
      areaAr: s.areaAr,
      areaEn: s.areaEn,
      hasDelivery: s.c.hasDelivery,
      deliveryFee: s.c.deliveryFee,
      deliveryEta: s.c.deliveryEta,
      distanceKm: s.distanceKm,
      distanceLabel: formatKm(s.distanceKm, 'ar'),
      distanceLabelEn: formatKm(s.distanceKm, 'en'),
      score: s.score,
      hasCoords: s.c.lat !== null || s.cityKey !== null,
      products: byCompany.get(s.c.id) ?? [],
    }))

    // رأس الاستجابة: أقرب ولاية مسجلة لنقطة GPS (للعرض)
    let nearestAr = originAreaAr
    let nearestEn = originAreaEn
    if (origin && !nearestAr) {
      const near = findNearestArea(origin.lat, origin.lng)
      if (near) {
        nearestAr = near.area.ar
        nearestEn = near.area.en
      }
    }

    return NextResponse.json({
      origin: origin
        ? { ...origin, areaAr: nearestAr, areaEn: nearestEn }
        : null,
      weights: NEARBY_WEIGHTS,
      stores,
    })
  } catch (e) {
    console.error('GET /api/nearby error:', e)
    return NextResponse.json({ error: 'Failed to load nearby stores' }, { status: 500 })
  }
}
