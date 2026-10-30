import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAdminUser } from '@/lib/auth'

/** Platform-wide stats for the system administrator */
export async function GET() {
  try {
    const admin = await getAdminUser()
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [
      usersTotal, customersCount, ownersCount,
      companiesActive, companiesPending, companiesSuspended,
      productsCount, ordersCount, ordersPending,
      joinRequestsNew, messagesNew,
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { role: 'customer' } }),
      db.user.count({ where: { role: 'owner' } }),
      db.company.count({ where: { status: 'active' } }),
      db.company.count({ where: { status: 'pending' } }),
      db.company.count({ where: { status: 'suspended' } }),
      db.product.count(),
      db.order.count(),
      db.order.count({ where: { status: 'pending' } }),
      db.joinRequest.count({ where: { status: 'new' } }),
      db.contactMessage.count(),
    ])

    // BUG-FIX (إيرادات نظيفة): الطلبات الملغاة لم تُقبض قيمتها —
    // كانت تُحتسب ضمن إجمالي الإيرادات وتضخّم الرقم.
    const revenueAgg = await db.order.aggregate({
      _sum: { total: true },
      where: { status: { not: 'cancelled' } },
    })

    return NextResponse.json({
      overview: {
        usersTotal,
        customersCount,
        ownersCount,
        companiesActive,
        companiesPending,
        companiesSuspended,
        productsCount,
        ordersCount,
        ordersPending,
        revenue: Math.round((revenueAgg._sum.total ?? 0) * 1000) / 1000,
        joinRequestsNew,
        messagesNew,
      },
    })
  } catch (e) {
    console.error('GET /api/system/overview error:', e)
    return NextResponse.json({ error: 'Failed to load overview' }, { status: 500 })
  }
}
