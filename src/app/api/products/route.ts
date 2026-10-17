import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const companyId = sp.get('companyId') || undefined
    const category = sp.get('category') || undefined
    const search = sp.get('q')?.trim().slice(0, 100) || undefined
    const bestSeller = sp.get('bestSeller')
    // Cap `take` so a caller can't request the entire table in one query
    const takeRaw = Number(sp.get('take'))
    const take = Number.isFinite(takeRaw) && takeRaw > 0 ? Math.min(200, Math.floor(takeRaw)) : undefined

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
        companyId,
        category,
        isBestSeller: bestSeller === '1' ? true : undefined,
        // Only expose products from shelves visible on the storefront
        // (pending / suspended companies must not leak via the API)
        company: { status: 'active' },
        ...searchCondition,
      },
      orderBy: [{ createdAt: 'asc' }],
      take,
    })
    return NextResponse.json({ products })
  } catch (e) {
    console.error('GET /api/products error:', e)
    return NextResponse.json({ error: 'Failed to load products' }, { status: 500 })
  }
}
