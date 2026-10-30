import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAdminUser } from '@/lib/auth'

const ALLOWED = ['pending', 'processing', 'delivered', 'cancelled'] as const

type OrderItemRow = { productId: string | null; qty: number }

/**
 * بنود البضائع المادية القابلة لإعادة المخزون فقط:
 * - بلا معرف منتج (صنف محذوف سابقاً) → لا شيء يُعاد
 * - خدمة → مخزونها طاقة استيعابية، تُخصم/تعود فقط عبر مسار الطلب نفسه
 */
async function restockableItems(items: OrderItemRow[]) {
  const withProduct = items.filter((it): it is OrderItemRow & { productId: string } => !!it.productId)
  if (!withProduct.length) return []
  const products = await db.product.findMany({
    where: { id: { in: withProduct.map((it) => it.productId) } },
    select: { id: true, kind: true },
  })
  const goodsIds = new Set(products.filter((p) => p.kind !== 'service').map((p) => p.id))
  return withProduct.filter((it) => goodsIds.has(it.productId))
}

/**
 * PATCH /api/system/orders/[id] — { status } update order status
 *
 * BUG-FIX (المخزون والإلغاء): كان إلغاء الطلب يترك الكميات مخصومة من مخزون
 * التاجر للأبد — بضاعة لم تُسلَّم فعلياً تختفي من دفاتره. الآن:
 *  - الإلغاء (→ cancelled) يعيد كمية البضائع المادية إلى المخزون.
 *  - الرجوع عن الإلغاء (cancelled → أي حالة أخرى) يعيد حجز الكميات بعد
 *    فحص كفاية المخزون أولاً — وإلا يُرفض التعديل بـ409 دون أي كتابة.
 *  - تكرار نفس الحالة لا يفعل شيئاً (حماية من الإعادة المزدوجة).
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminUser()
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = (await req.json()) as { status?: string }
    const status = body.status

    if (!status || !ALLOWED.includes(status as (typeof ALLOWED)[number]))
      return NextResponse.json({ error: 'حالة غير صالحة | Invalid status' }, { status: 400 })

    const order = await db.order.findUnique({ where: { id }, include: { items: true } })
    if (!order)
      return NextResponse.json({ error: 'الطلب غير موجود | Order not found' }, { status: 404 })

    // نفس الحالة → لا تغيير (يمنع إعادة المخزون مرتين بنقرات متتالية)
    if (order.status === status)
      return NextResponse.json({ order })

    // ── الرجوع عن إلغاء: أعد حجز البضائع (فحص الكفاية قبل أي كتابة) ──
    if (order.status === 'cancelled' && status !== 'cancelled') {
      const goods = await restockableItems(order.items)
      for (const it of goods) {
        const p = await db.product.findUnique({
          where: { id: it.productId },
          select: { stock: true, nameAr: true },
        })
        if (!p) continue // المنتج حُذف — لا شيء يُحجز له
        if (p.stock < it.qty) {
          const itemEn = order.items.find((x) => x.productId === it.productId)?.nameEn ?? 'item'
          return NextResponse.json(
            { error: `لا يمكن إعادة تفعيل الطلب: المتوفر من "${p.nameAr}" (${p.stock}) أقل من المطلوب (${it.qty}) | Cannot reactivate: insufficient stock for "${itemEn}" (available: ${p.stock})` },
            { status: 409 },
          )
        }
      }
      if (goods.length) {
        try {
          await db.$transaction(async (tx) => {
            for (const it of goods) {
              // خصم مشروط بالمخزون (سباق-آمن): لو نافس مستخدم آخر المخزون
              // بين الفحص والكتابة تفشل الكتابة وتتراجع المعاملة كلها.
              const r = await tx.product.updateMany({
                where: { id: it.productId, stock: { gte: it.qty } },
                data: { stock: { decrement: it.qty } },
              })
              if (r.count === 0) throw new Error('STOCK_CHANGED')
            }
          })
        } catch (e) {
          if (e instanceof Error && e.message === 'STOCK_CHANGED')
            return NextResponse.json(
              { error: 'تغيّر المخزون أثناء إعادة تفعيل الطلب، حاول مجدداً | Stock changed while reactivating the order, try again' },
              { status: 409 },
            )
          throw e
        }
      }
    }

    // ── الإلغاء: أعد البضائع إلى المخزون ──
    if (status === 'cancelled' && order.status !== 'cancelled') {
      const goods = await restockableItems(order.items)
      if (goods.length) {
        await db.$transaction((tx) =>
          Promise.all(
            goods.map((it) =>
              tx.product.updateMany({
                where: { id: it.productId },
                data: { stock: { increment: it.qty } },
              }),
            ),
          ),
        )
      }
    }

    const updated = await db.order.update({ where: { id }, data: { status } })
    return NextResponse.json({ order: updated })
  } catch (e) {
    console.error('PATCH /api/system/orders/[id] error:', e)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}
