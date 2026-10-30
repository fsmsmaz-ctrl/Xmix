import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

/** Overview stats for the owner's company shelf */
export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== 'owner' || !user.companyId)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const companyId = user.companyId

    const [productCount, stockAgg, lowStock, items, productsForValue, recentOrders] = await Promise.all([
      db.product.count({ where: { companyId } }),
      db.product.aggregate({ where: { companyId }, _sum: { stock: true } }),
      db.product.count({ where: { companyId, stock: { lte: 5 } } }),
      // BUG-FIX (إيرادات نظيفة): بنود الطلبات الملغاة لم تُقبض قيمتها —
      // كانت تُحتسب ضمن إيراد التاجر والوحدات المبيعة، والآن تُستبعد.
      db.orderItem.findMany({
        where: { companyId, order: { status: { not: 'cancelled' } } },
        select: { price: true, qty: true, orderId: true },
      }),
      db.product.findMany({ where: { companyId }, select: { price: true, stock: true } }),
      db.order.findMany({
        where: { items: { some: { companyId } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { items: true },
      }),
    ])

    const revenue = items.reduce((s, it) => s + it.price * it.qty, 0)
    const unitsSold = items.reduce((s, it) => s + it.qty, 0)
    const ordersCount = new Set(items.map((it) => it.orderId)).size
    const stockValue = productsForValue.reduce((s, p) => s + p.price * p.stock, 0)

    const recent = recentOrders.map((o) => ({
      orderNumber: o.orderNumber,
      customerName: o.customerName,
      status: o.status,
      createdAt: o.createdAt,
      myTotal: o.items
        .filter((it) => it.companyId === companyId)
        .reduce((s, it) => s + it.price * it.qty, 0),
    }))

    return NextResponse.json({
      stats: {
        productCount,
        stockTotal: stockAgg._sum.stock ?? 0,
        stockValue: Math.round(stockValue * 1000) / 1000,
        lowStock,
        revenue: Math.round(revenue * 1000) / 1000,
        unitsSold,
        ordersCount,
        recent,
      },
    })
  } catch (e) {
    console.error('GET /api/admin/stats error:', e)
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 })
  }
}
