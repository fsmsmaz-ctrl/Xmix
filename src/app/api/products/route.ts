import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { parseDetailsLine } from '@/lib/details'

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const companyId = sp.get('companyId') || undefined
    const category = sp.get('category') || undefined
    const search = sp.get('q')?.trim().slice(0, 100) || undefined
    const bestSeller = sp.get('bestSeller')
    // BUG-FIX (مزامنة السلة): جلب أصناف محددة بالمعرفات — تستخدمه السلة
    // لتحديث الأسعار/الكميات قبل الدفع. يُقبل 50 معرفاً كحد أقصى بنمط معرف آمن.
    const idsRaw = sp.get('ids')?.trim() || ''
    const ids = idsRaw
      ? idsRaw.split(',').map((s) => s.trim()).filter((s) => /^[a-z0-9]+$/i.test(s)).slice(0, 50)
      : null
    // Cap `take` so a caller can't request the entire table in one query —
    // also applied as the default when the param is absent (was unbounded before).
    const takeRaw = Number(sp.get('take'))
    const take = Number.isFinite(takeRaw) && takeRaw > 0 ? Math.min(200, Math.floor(takeRaw)) : 200

    const searchCondition = search
      ? {
          OR: [
            { nameAr: { contains: search, mode: 'insensitive' as const } },
            { nameEn: { contains: search, mode: 'insensitive' as const } },
            { descAr: { contains: search, mode: 'insensitive' as const } },
            { descEn: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : undefined

    const products = await db.product.findMany({
      where: {
        // وضع ids: تجاهل بقية الفلاتر — جلب مباشر بالمعرفات فقط
        ...(ids ? { id: { in: ids } } : { companyId, category }),
        isBestSeller: bestSeller === '1' ? true : undefined,
        // Only expose products from shelves visible on the storefront
        // (pending / suspended companies must not leak via the API)
        company: { status: 'active' },
        ...searchCondition,
      },
      orderBy: [{ createdAt: 'asc' }],
      take,
    })

    // BUG-FIX (اتساق البحث مع الواجهة): البحث كان يطابق سطر التفاصيل
    // [[XMIX-D]]{JSON} المخفي داخل الوصف — نفس عيب ShopView السابق.
    // نصفي النتائج بعد الجلب على النص النظيف فقط.
    let result = products
    if (search) {
      const q = search.toLowerCase()
      result = products.filter((p) => {
        const hay = `${p.nameAr} ${p.nameEn} ${parseDetailsLine(p.descAr).text} ${parseDetailsLine(p.descEn).text}`.toLowerCase()
        return hay.includes(q)
      })
    }
    return NextResponse.json({ products: result })
  } catch (e) {
    console.error('GET /api/products error:', e)
    return NextResponse.json({ error: 'Failed to load products' }, { status: 500 })
  }
}
