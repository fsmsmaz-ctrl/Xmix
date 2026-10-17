import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAdminUser } from '@/lib/auth'

/** ALL orders on the platform (site-wide view for the administrator) */
export async function GET() {
  try {
    const admin = await getAdminUser()
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orders = await db.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        items: true,
        user: { select: { name: true, email: true } },
      },
    })

    return NextResponse.json({ orders })
  } catch (e) {
    console.error('GET /api/system/orders error:', e)
    return NextResponse.json({ error: 'Failed to load orders' }, { status: 500 })
  }
}
