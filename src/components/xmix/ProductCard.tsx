'use client'

import { ShoppingCart, Images } from 'lucide-react'
import type { Company, Lang, Product } from '@/lib/types'
import { productGallery } from '@/lib/types'
import { useXmix } from '@/store/xmix'
import { toast } from '@/hooks/use-toast'
import { StarRating } from './shared'
import { Button } from '@/components/ui/button'

export function ProductCard({
  product,
  company,
  compact = false,
}: {
  product: Product
  company?: Company
  compact?: boolean
}) {
  const lang = useXmix((s) => s.lang)
  const navigate = useXmix((s) => s.navigate)
  const addToCart = useXmix((s) => s.addToCart)

  const name = lang === 'ar' ? product.nameAr : product.nameEn
  const companyName = company ? (lang === 'ar' ? company.nameAr : company.nameEn) : undefined
  const badge = lang === 'ar' ? product.badgeAr : product.badgeEn
  const isService = (product.kind ?? 'product') === 'service'
  const gallery = productGallery(product)
  const photoCount = gallery.length

  const openProduct = () => navigate({ name: 'product', id: product.id })

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (product.stock <= 0) return
    addToCart({
      productId: product.id,
      companyId: product.companyId,
      nameAr: product.nameAr,
      nameEn: product.nameEn,
      emoji: product.emoji,
      gradient: product.gradient,
      price: product.price,
      stock: product.stock,
      companyAr: company?.nameAr ?? '',
      companyEn: company?.nameEn ?? '',
    })
    toast({ title: lang === 'ar' ? 'تمت الإضافة إلى السلة 🛒' : 'Added to cart 🛒', description: name })
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openProduct}
      onKeyDown={(e) => e.key === 'Enter' && openProduct()}
      className="group xmix-card-hover cursor-pointer rounded-xl border bg-card overflow-hidden flex flex-col h-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* visual */}
      <div
        className="relative flex items-center justify-center aspect-square select-none overflow-hidden"
        style={{ background: product.gradient }}
      >
        {product.image ? (
           
          <img
            src={product.image}
            alt={name}
            loading="lazy"
            decoding="async"
            sizes="(max-width: 640px) 50vw, 25vw"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.06]"
          />
        ) : (
          <span
            className={compact ? 'text-5xl drop-shadow-lg' : 'text-6xl sm:text-7xl drop-shadow-lg group-hover:scale-110 transition-transform duration-300'}
            aria-hidden
          >
            {product.emoji}
          </span>
        )}
        {badge && (
          <span className="absolute top-2 start-2 text-[10px] font-extrabold bg-black/45 backdrop-blur text-white rounded-full px-2.5 py-1 border border-white/15">
            {badge}
          </span>
        )}
        {isService && (
          <span
            className={`absolute start-2 ${badge ? 'top-9' : 'top-2'} text-[10px] font-extrabold bg-fuchsia-600/85 backdrop-blur text-white rounded-full px-2.5 py-1 border border-white/15`}
          >
            {product.category === 'agri-labor'
              ? (lang === 'ar' ? '👷 عمالة يومية' : '👷 Daily labor')
              : `🛠️ ${lang === 'ar' ? 'خدمة' : 'Service'}`}
          </span>
        )}
        {product.oldPrice && product.oldPrice > product.price && (
          <span className="absolute top-2 end-2 text-[10px] font-extrabold bg-rose-500 text-white rounded-full px-2 py-1 shadow">
            {Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}%
          </span>
        )}
        {photoCount > 1 && (
          <span className="absolute bottom-2 end-2 inline-flex items-center gap-1 rounded-full bg-black/50 backdrop-blur text-white px-2 py-0.5 text-[10px] font-bold border border-white/15">
            <Images size={11} /> {photoCount}
          </span>
        )}
      </div>

      {/* body */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        {companyName && (
          <span className="text-[11px] font-semibold text-violet-300/90 w-fit">
            {product.isBestSeller ? '⭐ ' : ''}
            {companyName}
          </span>
        )}
        <h3 className="text-sm font-bold leading-snug line-clamp-2 min-h-[2.5rem]">{name}</h3>
        <div className="flex items-center gap-1.5">
          <StarRating rating={product.rating} size={12} />
          <span className="text-[10px] text-muted-foreground">({product.reviews})</span>
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div className="flex flex-col">
            <span className="text-sm font-extrabold text-primary">
              {product.price.toFixed(3)} {lang === 'ar' ? 'ر.ع.' : 'OMR'}
            </span>
            {product.oldPrice ? (
              <span className="text-[10px] text-muted-foreground line-through">
                {product.oldPrice.toFixed(3)}
              </span>
            ) : null}
          </div>
          <Button
            size="icon"
            variant="secondary"
            aria-label={lang === 'ar' ? 'أضف إلى السلة' : 'Add to cart'}
            disabled={product.stock <= 0}
            onClick={handleAdd}
            className="h-9 w-9 rounded-lg bg-primary/15 hover:bg-primary hover:text-primary-foreground text-primary"
          >
            <ShoppingCart size={16} />
          </Button>
        </div>
      </div>
    </div>
  )
}
