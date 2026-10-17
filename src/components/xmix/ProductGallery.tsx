'use client'

/**
 * ProductGallery — customer-facing product image gallery.
 * Main image + thumbnail strip + fullscreen lightbox with RTL-aware arrows.
 * Falls back to the emoji/gradient placeholder when no photos were added.
 */

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, X, Images } from 'lucide-react'
import { useXmix } from '@/store/xmix'
import { t } from '@/lib/i18n'
import { productGallery, type Product } from '@/lib/types'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

export function ProductGallery({ product, badge, discountPct }: {
  product: Product
  badge?: string | null
  discountPct?: number
}) {
  const lang = useXmix((s) => s.lang)
  const p = t.product
  const gallery = productGallery(product)
  const hasPhotos = gallery.length > 0

  const [active, setActive] = useState(0)
  const [zoomOpen, setZoomOpen] = useState(false)

  // reset when switching between products — adjust state during render
  // (React-recommended pattern; avoids setState inside an effect)
  const [prevProductId, setPrevProductId] = useState(product.id)
  if (prevProductId !== product.id) {
    setPrevProductId(product.id)
    setActive(0)
  }

  const step = useCallback(
    (dir: 1 | -1) => {
      if (gallery.length < 2) return
      setActive((i) => (i + dir + gallery.length) % gallery.length)
    },
    [gallery.length]
  )

  // lightbox keyboard navigation
  useEffect(() => {
    if (!zoomOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') step(lang === 'ar' ? -1 : 1)
      if (e.key === 'ArrowLeft') step(lang === 'ar' ? 1 : -1)
      if (e.key === 'Escape') setZoomOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoomOpen, step, lang])

  const current = gallery[active] ?? gallery[0]

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
        className="space-y-3"
      >
        {/* main visual */}
        <div
          className={`relative rounded-3xl border flex items-center justify-center aspect-square overflow-hidden bg-secondary/30 ${hasPhotos ? 'cursor-zoom-in' : ''}`}
          style={!hasPhotos ? { background: product.gradient } : undefined}
          onClick={() => hasPhotos && setZoomOpen(true)}
          role={hasPhotos ? 'button' : undefined}
          aria-label={hasPhotos ? p.viewGallery[lang] : undefined}
          onKeyDown={(e) => { if (hasPhotos && e.key === 'Enter') setZoomOpen(true) }}
          tabIndex={hasPhotos ? 0 : undefined}
        >
          {hasPhotos ? (
             
            <img
              key={current}
              src={current}
              alt={lang === 'ar' ? product.nameAr : product.nameEn}
              loading="eager"
              decoding="async"
              className="h-full w-full object-cover"
              onError={(e) => { (e.currentTarget.style.display = 'none') }}
            />
          ) : (
            <span className="text-[8rem] sm:text-[11rem] drop-shadow-2xl" aria-hidden>{product.emoji}</span>
          )}

          {badge && (
            <span className="absolute top-4 start-4 text-xs font-extrabold bg-black/45 backdrop-blur text-white rounded-full px-3.5 py-1.5 border border-white/20">
              {badge}
            </span>
          )}
          {!!discountPct && discountPct > 0 && (
            <span className="absolute top-4 end-4 text-xs font-extrabold bg-rose-500 text-white rounded-full px-3 py-1.5 shadow-lg">
              {lang === 'ar' ? `وفّر ${discountPct}%` : `Save ${discountPct}%`}
            </span>
          )}
          {gallery.length > 1 && (
            <span className="absolute bottom-4 end-4 inline-flex items-center gap-1.5 rounded-full bg-black/55 backdrop-blur text-white px-3 py-1 text-[11px] font-bold border border-white/15">
              <Images size={12} /> {active + 1}/{gallery.length}
            </span>
          )}
          {gallery.length > 1 && (
            <>
              <button
                type="button"
                aria-label={p.prevImg[lang]}
                onClick={(e) => { e.stopPropagation(); step(-1) }}
                className="absolute start-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/70 opacity-0 hover:opacity-100 focus-visible:opacity-100 max-sm:opacity-100"
              >
                {lang === 'ar' ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
              </button>
              <button
                type="button"
                aria-label={p.nextImg[lang]}
                onClick={(e) => { e.stopPropagation(); step(1) }}
                className="absolute end-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/70 opacity-0 hover:opacity-100 focus-visible:opacity-100 max-sm:opacity-100"
              >
                {lang === 'ar' ? <ChevronLeft size={17} /> : <ChevronRight size={17} />}
              </button>
            </>
          )}
        </div>

        {/* thumbnails */}
        {gallery.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
            {gallery.map((url, i) => (
              <button
                key={url + i}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`${p.photos[lang]} ${i + 1}`}
                aria-current={i === active}
                className={`relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-xl border-2 snap-start transition-all ${
                  i === active
                    ? 'border-primary ring-2 ring-primary/30 scale-[1.03]'
                    : 'border-border opacity-70 hover:opacity-100 hover:border-primary/50'
                }`}
              >
                { }
                <img src={url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </motion.div>

      {/* fullscreen lightbox */}
      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent
          aria-describedby={undefined}
          className="max-w-4xl w-[92vw] bg-black/95 border-white/10 p-2 sm:p-3 [&>button]:hidden"
        >
          <DialogTitle className="sr-only">
            {lang === 'ar' ? product.nameAr : product.nameEn}
          </DialogTitle>
          <div className="relative flex items-center justify-center overflow-hidden rounded-2xl select-none">
            { }
            <img
              src={current}
              alt={lang === 'ar' ? product.nameAr : product.nameEn}
              className="max-h-[78vh] w-auto max-w-full object-contain rounded-xl"
              decoding="async"
            />
            {gallery.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label={p.prevImg[lang]}
                  onClick={() => step(-1)}
                  className="absolute start-3 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/25"
                >
                  {lang === 'ar' ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                </button>
                <button
                  type="button"
                  aria-label={p.nextImg[lang]}
                  onClick={() => step(1)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/25"
                >
                  {lang === 'ar' ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                </button>
                <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white">
                  {active + 1} / {gallery.length}
                </span>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
