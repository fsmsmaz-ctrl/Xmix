import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const companyName = String(body.companyName || '').trim()
    const category = String(body.category || '').trim()
    const city = String(body.city || '').trim()
    const contactName = String(body.contactName || '').trim()
    const email = String(body.email || '').trim()
    const phone = String(body.phone || '').trim()
    const description = String(body.description || '').trim()

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
