import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const companies = await db.company.findMany({
      where: { status: 'active' },
      orderBy: [{ isFeatured: 'desc' }, { joinedAt: 'asc' }],
      include: { _count: { select: { products: true } } },
    })
    return NextResponse.json({ companies })
  } catch (e) {
    console.error('GET /api/companies error:', e)
    return NextResponse.json({ error: 'Failed to load companies' }, { status: 500 })
  }
}
