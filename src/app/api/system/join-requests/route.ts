import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAdminUser } from '@/lib/auth'

/** All merchant join requests */
export async function GET() {
  try {
    const admin = await getAdminUser()
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const requests = await db.joinRequest.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ requests })
  } catch (e) {
    console.error('GET /api/system/join-requests error:', e)
    return NextResponse.json({ error: 'Failed to load join requests' }, { status: 500 })
  }
}
