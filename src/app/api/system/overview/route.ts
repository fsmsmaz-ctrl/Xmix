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
      productsCount, ordersCount, ordersPending, ordersAgg,
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
      db.order.aggregate({ _sum: { total: true } }),
      db.joinRequest.count({ where: { status: 'new' } }),
      db.contactMessage.count(),
    ])

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
        revenue: Math.round((ordersAgg._sum.total ?? 0) * 1000) / 1000,
        joinRequestsNew,
        messagesNew,
      },
    })
  } catch (e) {
    console.error('GET /api/system/overview error:', e)
    return NextResponse.json({ error: 'Failed to load overview' }, { status: 500 })
  }
}
