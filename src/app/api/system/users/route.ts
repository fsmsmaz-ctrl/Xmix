import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAdminUser } from '@/lib/auth'

/** All accounts on the platform (customers, merchants, admins) */
export async function GET() {
  try {
    const admin = await getAdminUser()
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        companyId: true,
        company: { select: { id: true, nameAr: true, nameEn: true, slug: true, status: true } },
        _count: { select: { orders: true } },
      },
    })

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
        ordersCount: u._count.orders,
        company: u.company,
      })),
    })
  } catch (e) {
    console.error('GET /api/system/users error:', e)
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 })
  }
}
