import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const companyId = sp.get('companyId') || undefined
    const category = sp.get('category') || undefined
    const search = sp.get('q')?.trim() || undefined
    const bestSeller = sp.get('bestSeller')
    const take = Number(sp.get('take')) || undefined

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
