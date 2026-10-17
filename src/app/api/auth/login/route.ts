import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, setSessionCookie, getSessionUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')

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
