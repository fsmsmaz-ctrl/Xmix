import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

/**
 * POST /api/admin/upload — { dataUrl: "data:image/...;base64,..." }
 *
 * Stores a client-compressed product image and returns its internal URL
 * ("/api/images/<id>"). The row is created unclaimed (productId = null);
 * it gets claimed to the product when the product form is saved
 * (syncProductImages). Unclaimed rows older than 24h are garbage-collected
 * opportunistically.
 *
 * Guards:
 *  - requires an authenticated owner or admin session
 *  - only real raster image mimes are accepted (never text/html etc.)
 *  - decoded payload capped at 1.5 MB (matches client MAX_UPLOAD_BYTES)
 */

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_BYTES = 1.5 * 1024 * 1024

const DATA_URL_RE = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || (user.role !== 'owner' && user.role !== 'admin'))
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json().catch(() => null)) as { dataUrl?: unknown } | null
    const dataUrl = typeof body?.dataUrl === 'string' ? body.dataUrl.trim() : ''
    if (!dataUrl)
      return NextResponse.json({ error: 'صورة مفقودة | Missing image data' }, { status: 400 })
    if (dataUrl.length > 2 * 1024 * 1024)
      return NextResponse.json({ error: 'الصورة كبيرة جداً | Image too large' }, { status: 413 })

    const m = DATA_URL_RE.exec(dataUrl)
    if (!m)
      return NextResponse.json(
        { error: 'صيغة الصورة غير مدعومة (JPG/PNG/WebP/GIF فقط) | Unsupported image format (JPG/PNG/WebP/GIF only)' },
        { status: 415 }
      )
    const mime = m[1]
    if (!ALLOWED_MIME.has(mime))
      return NextResponse.json({ error: 'نوع صورة غير مسموح | Disallowed image type' }, { status: 415 })

    // Decode strictly from the captured base64 group (never the raw input)
    const base64 = m[2].replace(/\s/g, '')
    const bytes = Buffer.from(base64, 'base64')
    if (!bytes.length || bytes.length > MAX_BYTES)
      return NextResponse.json({ error: 'الصورة كبيرة جداً | Image too large' }, { status: 413 })
    // Re-encode to a canonical form so what we store is exactly what we decoded
    const canonicalBase64 = bytes.toString('base64')

    // Opportunistic GC: drop unclaimed uploads older than 24h
    try {
      await db.productImage.deleteMany({
        where: { productId: null, createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      })
    } catch { /* non-fatal */ }

    const img = await db.productImage.create({
      data: { productId: null, mime, data: canonicalBase64 },
      select: { id: true },
    })

    return NextResponse.json({ url: `/api/images/${img.id}` }, { status: 201 })
  } catch (e) {
    console.error('POST /api/admin/upload error:', e)
    return NextResponse.json({ error: 'فشل رفع الصورة | Upload failed' }, { status: 500 })
  }
}
