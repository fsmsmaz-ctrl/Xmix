import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { sanitizeImageList, splitGallery, syncProductImages } from '@/lib/product-images'
import { isKnownCategory, kindForCategory } from '@/lib/types'

type ProductInput = {
  nameAr?: unknown; nameEn?: unknown; descAr?: unknown; descEn?: unknown
  price?: unknown; oldPrice?: unknown; emoji?: unknown; gradient?: unknown
  category?: unknown; kind?: unknown; stock?: unknown; badgeAr?: unknown; badgeEn?: unknown
  isBestSeller?: unknown; image?: unknown; images?: unknown
}

function cleanStr(v: unknown, max = 400): string {
  return String(v ?? '').trim().slice(0, max)
}

/** Guard: returns owner user + companyId or an error response */
async function requireOwner() {
  const user = await getSessionUser()
  if (!user || user.role !== 'owner' || !user.companyId) {
    return { err: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  return { user, companyId: user.companyId as string }
}

export async function GET() {
  const g = await requireOwner()
  if ('err' in g) return g.err
  try {
    const products = await db.product.findMany({
      where: { companyId: g.companyId },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ products })
  } catch (e) {
    console.error('GET /api/admin/products error:', e)
    return NextResponse.json({ error: 'Failed to load products' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const g = await requireOwner()
  if ('err' in g) return g.err
  try {
    const body = (await req.json()) as ProductInput

    const nameAr = cleanStr(body.nameAr, 120)
    const nameEn = cleanStr(body.nameEn, 120)
    const price = Number(body.price)
    const category = cleanStr(body.category, 40) || 'general'
    // Category must be a known section (storefront categories or legacy 'general')
    if (!isKnownCategory(category))
      return NextResponse.json({ error: 'قسم غير معروف | Unknown category' }, { status: 400 })
    // kind: 'product' (physical) or 'service'; agri sections force their matching kind
    const kind = body.kind === 'service' ? 'service' : body.kind === 'product' ? 'product' : (kindForCategory(category) || 'product')
    const forced = kindForCategory(category)
    if (forced && kind !== forced)
      return NextResponse.json(
        { error: 'نوع العرض لا يطابق القسم المختار | Listing type does not match the category' },
        { status: 400 },
      )
    // services are capacity-based (bookings/day or workers available): clamp 1..999;
    // goods take physical stock >= 0 (default 20)
    const stockRaw = Number(body.stock)
    const stock = kind === 'service'
      ? Math.min(999, Math.max(1, Number.isFinite(stockRaw) ? Math.floor(stockRaw) || 10 : 10))
      : Number.isFinite(stockRaw) ? Math.max(0, Math.floor(stockRaw)) : 20
    const emoji = cleanStr(body.emoji, 8)
      || (category === 'agri-labor' ? '👷'
        : category === 'agri-services' ? '🚜'
        : category === 'cafe' ? '☕'
        : category === 'fresh-fish' ? '🐟'
        : category === 'animals' ? '🐑'
        : kind === 'service' ? '🛠️' : '🛍️')
    const gradient = cleanStr(body.gradient, 160) || 'linear-gradient(135deg,#8B5CF6,#6D28D9)'

    if (nameAr.length < 2 || nameEn.length < 2)
      return NextResponse.json({ error: 'الاسم مطلوب بالعربية والإنجليزية | Name (AR & EN) required' }, { status: 400 })
    if (!Number.isFinite(price) || price <= 0 || price > 100000)
      return NextResponse.json({ error: 'سعر غير صالح | Invalid price' }, { status: 400 })

    const oldPriceNum = Number(body.oldPrice)
    const oldPrice = Number.isFinite(oldPriceNum) && oldPriceNum > price ? oldPriceNum : null

    // ordered gallery — first entry is the main display image
    const gallery = [
      ...(body.image !== undefined ? sanitizeImageList([body.image]) : []),
      ...sanitizeImageList(body.images),
    ].slice(0, 8)
    const { image, images } = splitGallery(gallery)

    const product = await db.product.create({
      data: {
        companyId: g.companyId,
        nameAr,
        nameEn,
        descAr: cleanStr(body.descAr, 900) || nameAr,
        descEn: cleanStr(body.descEn, 900) || nameEn,
        price: Math.round(price * 1000) / 1000,
        oldPrice: oldPrice ? Math.round(oldPrice * 1000) / 1000 : null,
        emoji,
        gradient,
        category,
        kind,
        stock,
        rating: 4.5,
        reviews: 0,
        badgeAr: cleanStr(body.badgeAr, 40) || null,
        badgeEn: cleanStr(body.badgeEn, 40) || null,
        isBestSeller: Boolean(body.isBestSeller),
        image,
        images: images.length ? (images as unknown as Prisma.InputJsonValue) : undefined,
      },
    })
    await syncProductImages(product.id, gallery)
    return NextResponse.json({ product }, { status: 201 })
  } catch (e) {
    console.error('POST /api/admin/products error:', e)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}
