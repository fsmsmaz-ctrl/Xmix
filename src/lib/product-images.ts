import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { internalImageId, isAllowedImageUrl } from '@/lib/image'

/**
 * Server-side helpers for product image references.
 * Product.image = main display image URL, Product.images = additional gallery URLs (Json string[]).
 * URLs are either internal ("/api/images/<cuid>") or external (https://…).
 */

export function sanitizeImageList(input: unknown, max = 8): string[] {
  if (!Array.isArray(input)) return []
  const out: string[] = []
  for (const item of input) {
    const u = String(item ?? '').trim()
    if (!u || !isAllowedImageUrl(u)) continue
    if (out.includes(u)) continue
    out.push(u.slice(0, 500))
    if (out.length >= max) break
  }
  return out
}

/** Split an ordered gallery (main first) into the Product column pair. */
export function splitGallery(urls: string[]): { image: string | null; images: string[] } {
  return { image: urls[0] ?? null, images: urls.slice(1) }
}

export function imageUrlsToIds(urls: string[]): string[] {
  return urls.map(internalImageId).filter((x): x is string => !!x)
}

/** Attach uploaded (unlinked) images to a product and delete removed ones. */
export async function syncProductImages(productId: string, urls: string[] | null): Promise<void> {
  if (urls === null) return
  const ids = imageUrlsToIds(urls)

  if (ids.length) {
    // claim rows that are unclaimed or already belong to this product
    await db.productImage.updateMany({
      where: { id: { in: ids }, OR: [{ productId: null }, { productId }] },
      data: { productId },
    })
  }

  // remove this product's stored images that are no longer referenced
  await db.productImage.deleteMany({
    where: { productId, id: { notIn: ids.length ? ids : ['__none__'] } },
  })
}

export function parseImagesJson(v: Prisma.JsonValue | null): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === 'string')
}
