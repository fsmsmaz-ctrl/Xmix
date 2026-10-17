import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

/** Orders that include at least one item from the owner's company shelf */
export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== 'owner' || !user.companyId)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orders = await db.order.findMany({
      where: { items: { some: { companyId: user.companyId } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { items: true },
    })

    // keep only this company's items inside each order
    const shaped = orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customerName,
      phone: o.phone,
      city: o.city,
      status: o.status,
      createdAt: o.createdAt,
      items: o.items
        .filter((it) => it.companyId === user.companyId)
        .map((it) => ({ nameAr: it.nameAr, nameEn: it.nameEn, emoji: it.emoji, price: it.price, qty: it.qty })),
      myTotal: o.items
        .filter((it) => it.companyId === user.companyId)
        .reduce((s, it) => s + it.price * it.qty, 0),
    }))

    return NextResponse.json({ orders: shaped })
  } catch (e) {
    console.error('GET /api/admin/orders error:', e)
    return NextResponse.json({ error: 'Failed to load orders' }, { status: 500 })
  }
}
