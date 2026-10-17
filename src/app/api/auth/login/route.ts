import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, setSessionCookie, getSessionUser } from '@/lib/auth'
import { rateLimit, clientIp } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    // Brute-force protection: 8 attempts / 5 min per IP
    const ip = clientIp(req)
    const limited = rateLimit(`login:${ip}`, 8, 5 * 60 * 1000)
    if (limited)
      return NextResponse.json(
        { error: `محاولات كثيرة، أعد المحاولة بعد ${limited.retryAfter} ثانية | Too many attempts, retry in ${limited.retryAfter}s` },
        { status: 429, headers: { 'Retry-After': String(limited.retryAfter) } }
      )

    const body = await req.json()
    const email = String(body.email || '').trim().toLowerCase().slice(0, 200)
    const password = String(body.password || '').slice(0, 200)

    const user = await db.user.findUnique({ where: { email } })
    if (!user || !verifyPassword(password, user.passwordHash))
      return NextResponse.json(
        { error: 'البريد أو كلمة المرور غير صحيحة | Wrong email or password' },
        { status: 401 }
      )

    await setSessionCookie(user.id)
    // Return full session (includes company info for owner dashboard)
    const session = await getSessionUser()
    return NextResponse.json({ user: session })
  } catch (e) {
    console.error('POST /api/auth/login error:', e)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
