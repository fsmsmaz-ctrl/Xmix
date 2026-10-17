import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rateLimit, clientIp } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    // Anti-spam: 5 messages / hour per IP
    const ip = clientIp(req)
    const limited = rateLimit(`contact:${ip}`, 5, 60 * 60 * 1000)
    if (limited)
      return NextResponse.json(
        { error: `رسائل كثيرة، أعد المحاولة بعد ${limited.retryAfter} ثانية | Too many messages, retry in ${limited.retryAfter}s` },
        { status: 429, headers: { 'Retry-After': String(limited.retryAfter) } }
      )

    const body = await req.json()
    const name = String(body.name || '').trim().slice(0, 80)
    const email = String(body.email || '').trim().slice(0, 200)
    const subject = String(body.subject || '').trim().slice(0, 150)
    const message = String(body.message || '').trim().slice(0, 3000)

    if (!name || !email || !message)
      return NextResponse.json({ error: 'يرجى تعبئة الحقول المطلوبة | Please fill all required fields' }, { status: 400 })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return NextResponse.json({ error: 'البريد الإلكتروني غير صالح | Invalid email' }, { status: 400 })

    const cm = await db.contactMessage.create({
      data: { name, email, subject: subject || 'استفسار عام', message },
    })
    return NextResponse.json({ ok: true, id: cm.id })
  } catch (e) {
    console.error('POST /api/contact error:', e)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
