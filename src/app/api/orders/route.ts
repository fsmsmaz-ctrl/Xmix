import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

type IncomingItem = {
  productId?: string
  qty?: number
}

class OrderConflictError extends Error {}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const customerName = String(body.customerName || '').trim()
    const phone = String(body.phone || '').trim()
    const city = String(body.city || '').trim()
    const address = String(body.address || '').trim()
    const notes = String(body.notes || '').trim() || null
    const paymentMethod = ['cod', 'bank'].includes(body.paymentMethod)
      ? body.paymentMethod
      : 'cod'
    const items: IncomingItem[] = Array.isArray(body.items) ? body.items : []

    if (!customerName || !phone || !city || !address)
      return NextResponse.json({ error: 'بيانات التوصيل ناقصة | Missing delivery info' }, { status: 400 })
    if (customerName.length > 80 || phone.length > 30 || city.length > 60 || address.length > 300 || (notes && notes.length > 500))
      return NextResponse.json({ error: 'إحدى البيانات طويلة جداً | A field is too long' }, { status: 400 })
    if (items.length === 0)
      return NextResponse.json({ error: 'السلة فارغة | Cart is empty' }, { status: 400 })
    if (items.length > 50)
      return NextResponse.json({ error: 'عدد العناصر كبير جداً | Too many items' }, { status: 400 })

    // SECURITY: prices are ALWAYS recomputed server-side from the DB.
    // Client-supplied prices/names are ignored entirely — every item must
    // reference a real, purchasable product.
    //
    // BUG-FIX (money integrity): merge quantities PER PRODUCT FIRST, then
    // price/stock-check the MERGED quantity. The previous flow priced the
    // first line and only appended quantities for duplicates, so a caller
    // sending [{X,2},{X,3}] got 5 units charged as 2.
    const merged = new Map<string, number>()
    for (const it of items) {
      const productId = typeof it.productId === 'string' ? it.productId : ''
      if (!productId) continue
      const qty = Math.max(1, Math.min(99, Number(it.qty) || 1))
      merged.set(productId, Math.min(99, (merged.get(productId) ?? 0) + qty))
    }

    let subtotal = 0
    // BUG-FIX (money integrity): التوصيل على البضائع المادية فقط —
    // الخدمات (حجوزات/عمالة) لا تُشحن، ويجب أن يطابق الخادم حساب العميل.
    let goodsSubtotal = 0
    const rows: {
      productId: string
      nameAr: string
      nameEn: string
      emoji: string
      price: number
      qty: number
      companyId: string | null
      companyAr: string | null
      companyEn: string | null
    }[] = []

    for (const [productId, qty] of merged) {
      const p = await db.product.findUnique({
        where: { id: productId },
        include: { company: { select: { nameAr: true, nameEn: true, status: true } } },
      })
      if (!p) continue
      // Only purchasable products from shelves visible on the storefront
      if (p.company.status !== 'active') continue

      if (p.stock < qty) {
        return NextResponse.json(
          { error: `الكمية المطلوبة من "${p.nameAr}" غير متوفرة (المتوفر: ${p.stock}) | Insufficient stock for "${p.nameEn}" (available: ${p.stock})` },
          { status: 409 }
        )
      }
      subtotal += p.price * qty
      if (p.kind !== 'service') goodsSubtotal += p.price * qty
      rows.push({
        productId: p.id, nameAr: p.nameAr, nameEn: p.nameEn, emoji: p.emoji,
        price: p.price, qty, companyId: p.companyId,
        companyAr: p.company.nameAr, companyEn: p.company.nameEn,
      })
    }

    if (rows.length === 0)
      return NextResponse.json({ error: 'لا توجد عناصر صالحة | No valid items' }, { status: 400 })

    // نفس منطق cartTotals في العميل: الشحن يُحتسب على قيمة البضائع فقط
    const shipping = goodsSubtotal === 0 ? 0 : goodsSubtotal >= 50 ? 0 : 2
    const total = subtotal + shipping
    // Random suffix avoids unique-constraint collisions under concurrency
    const orderNumber = `XM-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`

    const user = await getSessionUser()

    // Create order + decrement stock atomically.
    // The conditional updateMany (stock >= qty) makes the decrement race-safe:
    // if two concurrent orders drain the same stock, the second one fails here
    // instead of driving stock negative.
    const order = await db.$transaction(async (tx) => {
      for (const r of rows) {
        const updated = await tx.product.updateMany({
          where: { id: r.productId, stock: { gte: r.qty } },
          data: { stock: { decrement: r.qty } },
        })
        if (updated.count === 0) {
          throw new Error(`STOCK_CHANGED:${r.productId}`)
        }
      }
      return tx.order.create({
        data: {
          orderNumber,
          userId: user?.id ?? null,
          customerName, phone, city, address, notes,
          paymentMethod,
          subtotal: Math.round(subtotal * 1000) / 1000,
          shipping,
          total: Math.round(total * 1000) / 1000,
          items: { create: rows },
        },
        include: { items: true },
      })
    }).catch((e) => {
      if (e instanceof Error && e.message.startsWith('STOCK_CHANGED:')) {
        throw new OrderConflictError()
      }
      throw e
    })

    return NextResponse.json({ order })
  } catch (e) {
    if (e instanceof OrderConflictError) {
      return NextResponse.json(
        { error: 'تغيّرت الكمية المتوفرة أثناء إتمام الطلب، حدّث السلة وحاول مجدداً | Stock changed while placing the order, please refresh your cart' },
        { status: 409 }
      )
    }
    console.error('POST /api/orders error:', e)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user)
      return NextResponse.json({ error: 'يجب تسجيل الدخول | Login required' }, { status: 401 })

    const orders = await db.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    })
    return NextResponse.json({ orders })
  } catch (e) {
    console.error('GET /api/orders error:', e)
    return NextResponse.json({ error: 'Failed to load orders' }, { status: 500 })
  }
}
