import crypto from 'crypto'
import { cookies, headers } from 'next/headers'
import { db } from '@/lib/db'

// SECURITY: the fallback secret is for local development only. In production
// an ephemeral random secret is generated per boot (with a loud warning) so a
// publicly-known default can never be used to forge session cookies.
const SECRET = process.env.AUTH_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    console.warn(
      '[auth] AUTH_SECRET is not set in production — using an ephemeral random secret. ' +
      'Sessions will be invalidated on every deploy. Set AUTH_SECRET to a 64-char hex value.'
    )
    return crypto.randomBytes(32).toString('hex')
  }
  return 'xmix-local-secret-2026'
})()
const COOKIE_NAME = 'xmix_session'
const MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(':')
    if (!salt || !hash) return false
    const test = crypto.scryptSync(password, salt, 64).toString('hex')
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(test, 'hex'))
  } catch {
    return false
  }
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('base64url')
}

export function createToken(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, exp: Date.now() + MAX_AGE * 1000 })
  ).toString('base64url')
  return `${payload}.${sign(payload)}`
}

export function verifyToken(token: string): string | null {
  try {
    const [payload, sig] = token.split('.')
    if (!payload || !sig) return null
    // Timing-safe signature comparison (prevents signature oracle attacks)
    const expected = Buffer.from(sign(payload))
    const received = Buffer.from(sig)
    if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received))
      return null
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {
      uid: string; exp: number
    }
    if (!data.uid || data.exp < Date.now()) return null
    return data.uid
  } catch {
    return null
  }
}

export async function setSessionCookie(userId: string) {
  const store = await cookies()
  // Secure only when the request actually arrived over HTTPS (Vercel sets
  // x-forwarded-proto) — keeps sessions working on local HTTP too.
  let secure = false
  try {
    const h = await headers()
    secure = (h.get('x-forwarded-proto') ?? 'http').split(',')[0].trim() === 'https'
  } catch { /* headers unavailable (rare contexts) — default to insecure for local */ }
  store.set(COOKIE_NAME, createToken(userId), {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: MAX_AGE,
    path: '/',
  })
}

export async function clearSessionCookie() {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

export async function getSessionUser() {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return null
  const uid = verifyToken(token)
  if (!uid) return null
  const user = await db.user.findUnique({
    where: { id: uid },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      companyId: true,
      company: { select: { nameAr: true, nameEn: true, slug: true, emoji: true, gradient: true } },
      createdAt: true,
    },
  })
  if (!user) return null
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    companyId: user.companyId,
    company: user.company,
    createdAt: user.createdAt,
  }
}

/** Guard for /api/system/* — returns the admin user or null. */
export async function getAdminUser() {
  const user = await getSessionUser()
  if (!user || user.role !== 'admin') return null
  return user
}
