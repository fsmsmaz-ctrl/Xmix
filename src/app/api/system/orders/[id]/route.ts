import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAdminUser } from '@/lib/auth'

const ALLOWED = ['pending', 'processing', 'delivered', 'cancelled'] as const

/** PATCH /api/system/orders/[id] — { status } update order status */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminUser()
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = (await req.json()) as { status?: string }
    const status = body.status

    if (!status || !ALLOWED.includes(status as (typeof ALLOWED)[number]))
      return NextResponse.json({ error: 'حالة غير صالحة | Invalid status' }, { status: 400 })

    const order = await db.order.findUnique({ where: { id } })
    if (!order)
      return NextResponse.json({ error: 'الطلب غير موجود | Order not found' }, { status: 404 })

    const updated = await db.order.update({ where: { id }, data: { status } })
    return NextResponse.json({ order: updated })
  } catch (e) {
    console.error('PATCH /api/system/orders/[id] error:', e)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}
