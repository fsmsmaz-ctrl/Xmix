import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { sanitizeImageList, splitGallery, syncProductImages } from '@/lib/product-images'
import { isKnownCategory, kindForCategory } from '@/lib/types'

function cleanStr(v: unknown, max = 400): string {
  return String(v ?? '').trim().slice(0, max)
}

async function requireOwner() {
  const user = await getSessionUser()
  if (!user || user.role !== 'owner' || !user.companyId) {
    return { err: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  return { user, companyId: user.companyId as string }
}

async function ownedProduct(companyId: string, id: string) {
  const product = await db.product.findUnique({ where: { id } })
  if (!product || product.companyId !== companyId) return null
  return product
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await requireOwner()
  if ('err' in g) return g.err
  try {
    const { id } = await params
    const product = await ownedProduct(g.companyId, id)
    if (!product)
      return NextResponse.json({ error: 'Product not found in your shelf' }, { status: 404 })

    const body = (await req.json()) as Record<string, unknown>
    const data: Record<string, unknown> = {}

    if (body.nameAr !== undefined) data.nameAr = cleanStr(body.nameAr, 120) || product.nameAr
    if (body.nameEn !== undefined) data.nameEn = cleanStr(body.nameEn, 120) || product.nameEn
    if (body.descAr !== undefined) data.descAr = cleanStr(body.descAr, 900) || product.descAr
    if (body.descEn !== undefined) data.descEn = cleanStr(body.descEn, 900) || product.descEn
    if (body.emoji !== undefined) data.emoji = cleanStr(body.emoji, 8) || product.emoji
    if (body.gradient !== undefined) data.gradient = cleanStr(body.gradient, 160) || product.gradient
    if (body.category !== undefined) {
      const cat = cleanStr(body.category, 40) || product.category
      // Category must be a known section (storefront categories or legacy 'general')
      if (!isKnownCategory(cat))
        return NextResponse.json({ error: 'قسم غير معروف | Unknown category' }, { status: 400 })
      data.category = cat
    }
    if (body.kind !== undefined) {
      // only two kinds exist — service is capacity-based instead of physical stock
      data.kind = body.kind === 'service' ? 'service' : 'product'
    }
    // enforce category <-> kind consistency on the effective (post-update) values
    const effCategory = (data.category as string | undefined) ?? product.category
    const effKind = (data.kind as 'product' | 'service' | undefined) ?? (product.kind === 'service' ? 'service' : 'product')
    const forced = kindForCategory(effCategory)
    if (forced && effKind !== forced)
      return NextResponse.json(
        { error: 'نوع العرض لا يطابق القسم المختار | Listing type does not match the category' },
        { status: 400 },
      )
    if (body.badgeAr !== undefined) data.badgeAr = cleanStr(body.badgeAr, 40) || null
    if (body.badgeEn !== undefined) data.badgeEn = cleanStr(body.badgeEn, 40) || null
    if (body.isBestSeller !== undefined) data.isBestSeller = Boolean(body.isBestSeller)

    if (body.price !== undefined) {
      const price = Number(body.price)
      if (!Number.isFinite(price) || price <= 0 || price > 100000)
        return NextResponse.json({ error: 'سعر غير صالح | Invalid price' }, { status: 400 })
      data.price = Math.round(price * 1000) / 1000
    }
    if (body.oldPrice !== undefined) {
      const op = Number(body.oldPrice)
      const newPrice = (data.price as number) ?? product.price
      data.oldPrice = Number.isFinite(op) && op > newPrice ? Math.round(op * 1000) / 1000 : null
    }
    if (body.stock !== undefined) {
      const stock = Number(body.stock)
      if (!Number.isFinite(stock) || stock < 0)
        return NextResponse.json({ error: 'كمية غير صالحة | Invalid stock' }, { status: 400 })
      // services are capacity-based: clamp 1..999 (bookings/day or workers available)
      data.stock = effKind === 'service'
        ? Math.min(999, Math.max(1, Math.floor(stock)))
        : Math.floor(stock)
    } else if (data.kind === 'service' && product.kind !== 'service') {
      // switching goods -> service without explicit capacity: reset to ample default
      data.stock = 999
    }

    // ordered gallery — first entry is the main display image
    let galleryUrls: string[] | null = null
    if (body.image !== undefined || body.images !== undefined) {
      galleryUrls = [
        ...sanitizeImageList([body.image]),
        ...sanitizeImageList(body.images),
      ].slice(0, 8)
      const { image, images } = splitGallery(galleryUrls)
      data.image = image
      data.images = images.length ? (images as unknown as Prisma.InputJsonValue) : Prisma.JsonNull
    }

    const updated = await db.product.update({ where: { id: product.id }, data })
    if (galleryUrls !== null) await syncProductImages(product.id, galleryUrls)
    return NextResponse.json({ product: updated })
  } catch (e) {
    console.error('PATCH /api/admin/products/[id] error:', e)
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await requireOwner()
  if ('err' in g) return g.err
  try {
    const { id } = await params
    const product = await ownedProduct(g.companyId, id)
    if (!product)
      return NextResponse.json({ error: 'Product not found in your shelf' }, { status: 404 })

    await db.product.delete({ where: { id: product.id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE /api/admin/products/[id] error:', e)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}
