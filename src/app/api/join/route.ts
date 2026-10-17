import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rateLimit, clientIp } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    // Anti-spam: 5 join requests / hour per IP
    const ip = clientIp(req)
    const limited = rateLimit(`join:${ip}`, 5, 60 * 60 * 1000)
    if (limited)
      return NextResponse.json(
        { error: `طلبات كثيرة، أعد المحاولة بعد ${limited.retryAfter} ثانية | Too many requests, retry in ${limited.retryAfter}s` },
        { status: 429, headers: { 'Retry-After': String(limited.retryAfter) } }
      )

    const body = await req.json()
    const companyName = String(body.companyName || '').trim().slice(0, 120)
    const category = String(body.category || '').trim().slice(0, 40)
    const city = String(body.city || '').trim().slice(0, 80)
    const contactName = String(body.contactName || '').trim().slice(0, 80)
    const email = String(body.email || '').trim().slice(0, 200)
    const phone = String(body.phone || '').trim().slice(0, 30)
    const description = String(body.description || '').trim().slice(0, 2000)

    if (!companyName || !category || !city || !contactName || !email || !phone)
      return NextResponse.json({ error: 'يرجى تعبئة الحقول المطلوبة | Please fill all required fields' }, { status: 400 })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return NextResponse.json({ error: 'البريد الإلكتروني غير صالح | Invalid email' }, { status: 400 })

    const jr = await db.joinRequest.create({
      data: { companyName, category, city, contactName, email, phone, description },
    })
    return NextResponse.json({ ok: true, id: jr.id })
  } catch (e) {
    console.error('POST /api/join error:', e)
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 })
  }
}
