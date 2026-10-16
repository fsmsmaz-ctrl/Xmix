'use client'

import { Star } from 'lucide-react'
import type { Lang } from '@/lib/types'

export function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`rating ${rating}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={
            i <= Math.round(rating)
              ? 'fill-amber-400 text-amber-400'
              : 'fill-muted text-muted-foreground/30'
          }
        />
      ))}
    </div>
  )
}

export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-5">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function PriceTag({
  price,
  oldPrice,
  lang,
  size = 'md',
}: {
  price: number
  oldPrice?: number | null
  lang: Lang
  size?: 'md' | 'lg'
}) {
  const off =
    oldPrice && oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0
  return (
    <div className="flex items-baseline gap-2 flex-wrap">
      <span
        className={
          size === 'lg'
            ? 'text-2xl sm:text-3xl font-extrabold text-primary'
            : 'text-base font-bold text-primary'
        }
      >
        {price.toFixed(3)} {lang === 'ar' ? 'ر.ع.' : 'OMR'}
      </span>
      {oldPrice ? (
        <span className="text-xs text-muted-foreground line-through">
          {oldPrice.toFixed(3)}
        </span>
      ) : null}
      {off > 0 && (
        <span className="text-[10px] font-bold bg-rose-500/15 text-rose-400 rounded-full px-2 py-0.5">
          {lang === 'ar' ? `خصم ${off}%` : `${off}% OFF`}
        </span>
      )}
    </div>
  )
}

export function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground">
      <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

/** Storefront skeleton — mirrors the real home layout while data loads (no layout jump). */
export function SkeletonStore() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-8" aria-hidden>
      <div className="h-52 sm:h-64 rounded-3xl bg-secondary/60 animate-pulse" />
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card overflow-hidden">
            <div className="aspect-square bg-secondary/60 animate-pulse" />
            <div className="p-3 space-y-2">
              <div className="h-3.5 w-3/4 rounded bg-secondary/60 animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-secondary/50 animate-pulse" />
              <div className="h-4 w-1/3 rounded bg-secondary/60 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ErrorBlock({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
      <span className="text-4xl">⚠️</span>
      <p className="text-sm">{label}</p>
    </div>
  )
}
