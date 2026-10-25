import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api — health check.
 * Reports app status + a live database round-trip so connection problems
 * (e.g. wrong DATABASE_URL on a hosting platform) are easy to diagnose.
 */
export async function GET() {
  const started = Date.now()
  try {
    await db.$queryRaw`SELECT 1`
    return NextResponse.json({
      ok: true,
      service: 'xmix',
      db: 'up',
      latencyMs: Date.now() - started,
      time: new Date().toISOString(),
    })
  } catch (e) {
    console.error('GET /api (health) error:', e)
    return NextResponse.json(
      { ok: false, service: 'xmix', db: 'down', time: new Date().toISOString() },
      { status: 500 }
    )
  }
}
