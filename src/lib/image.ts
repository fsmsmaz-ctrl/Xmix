/**
 * Client-side image helpers — compress before upload for fast pages.
 * Photos become JPEG (max 1400px, q 0.82 ≈ 60–180KB), small PNGs stay PNG (keeps transparency).
 */

export const MAX_PRODUCT_IMAGES = 8
export const MAX_UPLOAD_BYTES = 1.5 * 1024 * 1024 // post-compression guard
export const MAX_ORIGINAL_BYTES = 12 * 1024 * 1024

export type CompressResult = {
  dataUrl: string
  mime: string
  bytes: number
  width: number
  height: number
}

export function isImageFile(file: File): boolean {
  return /^image\/(jpeg|jpg|png|webp|gif|bmp|avif)$/i.test(file.type)
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new Error('read-failed'))
    r.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('decode-failed'))
    img.src = src
  })
}

/** Compress an image file into a small data URL ready for upload. */
export async function compressImage(file: File, maxDim = 1400, quality = 0.82): Promise<CompressResult> {
  if (!isImageFile(file)) throw new Error('bad-type')
  if (file.size > MAX_ORIGINAL_BYTES) throw new Error('too-large')

  const original = await readAsDataUrl(file)

  // Small PNG/WebP with transparency: keep as-is to preserve alpha
  const keepTypes = ['image/png', 'image/webp']
  if (keepTypes.includes(file.type) && file.size <= 400 * 1024) {
    const img = await loadImage(original)
    return {
      dataUrl: original,
      mime: file.type,
      bytes: Math.round((original.length - original.indexOf(',') - 1) * 0.75),
      width: img.naturalWidth,
      height: img.naturalHeight,
    }
  }

  const img = await loadImage(original)
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.max(1, Math.round(img.naturalWidth * scale))
  const h = Math.max(1, Math.round(img.naturalHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas-failed')
  ctx.fillStyle = '#ffffff' // flatten transparency for JPEG
  ctx.fillRect(0, 0, w, h)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, w, h)

  let mime = 'image/jpeg'
  let dataUrl = canvas.toDataURL(mime, quality)
  // Rare cases where JPEG output is bigger than source — try lower quality once
  if (dataUrl.length > original.length) dataUrl = canvas.toDataURL(mime, 0.7)

  return {
    dataUrl,
    mime,
    bytes: Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75),
    width: w,
    height: h,
  }
}

/** Internal image reference → numeric id, or null for external URLs. */
export function internalImageId(url: string): string | null {
  const m = /^\/api\/images\/([a-z0-9]+)$/i.exec(url.trim())
  return m ? m[1] : null
}

export function isAllowedImageUrl(url: string): boolean {
  const u = url.trim()
  return internalImageId(u) !== null || /^https?:\/\/\S+$/i.test(u)
}
