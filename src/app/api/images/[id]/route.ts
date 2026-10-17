import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/images/[id] — serves stored product images as binary with
 * long-lived immutable caching so browsers fetch each image only once.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!/^[a-z0-9]+$/i.test(id)) {
      return new NextResponse('Not found', { status: 404 })
    }

    const img = await db.productImage.findUnique({
      where: { id },
      select: { mime: true, data: true },
    })
    if (!img) return new NextResponse('Not found', { status: 404 })

    const bytes = Buffer.from(img.data, 'base64')
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        'Content-Type': img.mime,
        'Content-Length': String(bytes.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (e) {
    console.error('GET /api/images/[id] error:', e)
    return new NextResponse('Server error', { status: 500 })
  }
}
