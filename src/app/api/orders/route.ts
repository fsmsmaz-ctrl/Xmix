import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

type IncomingItem = {
  productId?: string
  companyId?: string
  nameAr?: string
  nameEn?: string
  emoji?: string
  price?: number
  qty?: number
}

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
    if (items.length === 0)
      return NextResponse.json({ error: 'السلة فارغة | Cart is empty' }, { status: 400 })

    // Recompute prices server-side from DB for integrity
    let subtotal = 0
    const rows: {
      productId: string | null
      nameAr: string
      nameEn: string
      emoji: string
      price: number
      qty: number
      companyId: string | null
      companyAr: string | null
      companyEn: string | null
    }[] = []

    for (const it of items) {
      const qty = Math.max(1, Math.min(99, Number(it.qty) || 1))
      if (it.productId) {
        const p = await db.product.findUnique({
          where: { id: it.productId },
          include: { company: true },
        })
        if (!p) continue
        // Stock availability check
        if (p.stock < qty) {
          return NextResponse.json(
            { error: `الكمية المطلوبة من "${p.nameAr}" غير متوفرة (المتوفر: ${p.stock}) | Insufficient stock for "${p.nameEn}" (available: ${p.stock})` },
            { status: 409 }
          )
        }
        subtotal += p.price * qty
        rows.push({
          productId: p.id, nameAr: p.nameAr, nameEn: p.nameEn, emoji: p.emoji,
          price: p.price, qty, companyId: p.companyId,
          companyAr: p.company.nameAr, companyEn: p.company.nameEn,
        })
      } else if (it.nameAr && it.nameEn && typeof it.price === 'number') {
        subtotal += it.price * qty
        rows.push({
          productId: null, nameAr: it.nameAr, nameEn: it.nameEn,
          emoji: it.emoji || '📦', price: it.price, qty,
          companyId: it.companyId || null,
          companyAr: null, companyEn: null,
        })
      }
    }

    if (rows.length === 0)
      return NextResponse.json({ error: 'لا توجد عناصر صالحة | No valid items' }, { status: 400 })

    const shipping = subtotal >= 50 ? 0 : 2
    const total = subtotal + shipping
    const orderNumber = `XM-${Date.now().toString(36).toUpperCase()}`

    const user = await getSessionUser()

    // Create order + decrement stock atomically
    const order = await db.$transaction(async (tx) => {
      for (const r of rows) {
        if (r.productId) {
          await tx.product.update({
            where: { id: r.productId },
            data: { stock: { decrement: r.qty } },
          })
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
    })

    return NextResponse.json({ order })
  } catch (e) {
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
