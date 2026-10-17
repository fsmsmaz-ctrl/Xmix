import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAdminUser } from '@/lib/auth'

/** All companies on the platform, any status */
export async function GET() {
  try {
    const admin = await getAdminUser()
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const companies = await db.company.findMany({
      orderBy: { joinedAt: 'desc' },
      include: {
        _count: { select: { products: true } },
        owners: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json({ companies })
  } catch (e) {
    console.error('GET /api/system/companies error:', e)
    return NextResponse.json({ error: 'Failed to load companies' }, { status: 500 })
  }
}
