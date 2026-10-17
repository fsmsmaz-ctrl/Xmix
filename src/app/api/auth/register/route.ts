import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, setSessionCookie, getSessionUser } from '@/lib/auth'
import { rateLimit, clientIp } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    // Anti-spam: 10 registrations / hour per IP
    const ip = clientIp(req)
    const limited = rateLimit(`register:${ip}`, 10, 60 * 60 * 1000)
    if (limited)
      return NextResponse.json(
        { error: `طلبات كثيرة، أعد المحاولة بعد ${limited.retryAfter} ثانية | Too many requests, retry in ${limited.retryAfter}s` },
        { status: 429, headers: { 'Retry-After': String(limited.retryAfter) } }
      )

    const body = await req.json()
    const name = String(body.name || '').trim().slice(0, 80)
    const email = String(body.email || '').trim().toLowerCase().slice(0, 200)
    const password = String(body.password || '').slice(0, 200)

    if (!name || name.length < 2)
      return NextResponse.json({ error: 'الاسم قصير جداً | Name too short' }, { status: 400 })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return NextResponse.json({ error: 'البريد الإلكتروني غير صالح | Invalid email' }, { status: 400 })
    if (password.length < 6)
      return NextResponse.json({ error: 'كلمة المرور 6 أحرف على الأقل | Password must be 6+ chars' }, { status: 400 })

    const existing = await db.user.findUnique({ where: { email } })
    if (existing)
      return NextResponse.json({ error: 'البريد مسجل مسبقاً | Email already registered' }, { status: 409 })

    const user = await db.user.create({
      data: { name, email, passwordHash: hashPassword(password) },
    })
    await setSessionCookie(user.id)
    const session = await getSessionUser()
    return NextResponse.json({ user: session })
  } catch (e) {
    console.error('POST /api/auth/register error:', e)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
