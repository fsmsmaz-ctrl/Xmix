'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Minus, Plus, ShoppingCart, Zap, Truck, RotateCcw, ShieldCheck, ArrowRight, ArrowLeft, Eye, Home, Snowflake, AlertTriangle } from 'lucide-react'
import { useXmix } from '@/store/xmix'
import { t } from '@/lib/i18n'
import type { Company, Product } from '@/lib/types'
import {
  parseDetailsLine, cutoffLabel, conditionLabel, conditionDescLabel,
  usedSubLabel, ageLabel, allergensLabel, mealLabel, prepLabel, daysLabel,
} from '@/lib/details'
import { ProductCard } from './ProductCard'
import { ProductGallery } from './ProductGallery'
import { StarRating, PriceTag } from './shared'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'

export function ProductView({
  productId,
  companies,
  products,
}: {
  productId: string
  companies: Company[]
  products: Product[]
}) {
  const lang = useXmix((s) => s.lang)
  const navigate = useXmix((s) => s.navigate)
  const addToCart = useXmix((s) => s.addToCart)
  const sessionChecked = useXmix((s) => s.sessionChecked)
  const [qty, setQty] = useState(1)
  const isRTL = lang === 'ar'
  const BackIcon = isRTL ? ArrowRight : ArrowLeft

  const product = useMemo(() => products.find((p) => p.id === productId), [products, productId])
  const company = companies.find((c) => c.id === product?.companyId)

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center text-muted-foreground">
        <p className="text-4xl mb-3">🫥</p>
        <p className="mb-4">{t.filters.noResults[lang]}</p>
        <Button onClick={() => navigate({ name: 'shop' })} className="rounded-xl">{t.misc.goShop[lang]}</Button>
      </div>
    )
  }

  const name = lang === 'ar' ? product.nameAr : product.nameEn
  // سطر تفاصيل القسم ([[XMIX-D]]) يُستخرج ولا يظهر نصاً خاماً للزبون
  const descParsed = parseDetailsLine(lang === 'ar' ? product.descAr : product.descEn)
  const desc = descParsed.text || name
  const xd = descParsed.details
  const badge = lang === 'ar' ? product.badgeAr : product.badgeEn
  const isService = (product.kind ?? 'product') === 'service'
  const isLabor = product.category === 'agri-labor'
  const isUsed = product.category === 'used-items'
  const isFood = product.category === 'home-food'

  const related = products
    .filter((p) => p.id !== product.id && (p.category === product.category || p.companyId === product.companyId))
    .slice(0, 5)

  const cartItem = {
    productId: product.id,
    companyId: product.companyId,
    nameAr: product.nameAr,
    nameEn: product.nameEn,
    emoji: product.emoji,
    gradient: product.gradient,
    price: product.price,
    stock: product.stock,
    kind: isService ? ('service' as const) : ('product' as const),
    companyAr: company?.nameAr ?? '',
    companyEn: company?.nameEn ?? '',
  }

  const handleAdd = (buyNow = false) => {
    // BUG-FIX (الطلب بلا حساب): نحترم قرار بوابة المخزن — الضيف لا
    // يُضاف له شيء ولا يُنتقل للسلة، بل تُفتح له نافذة التسجيل
    const added = addToCart(cartItem, qty)
    if (!added) {
      if (sessionChecked) toast({ title: t.cart.loginToAdd[lang], description: name })
      return
    }
    toast({ title: lang === 'ar' ? 'تمت الإضافة إلى السلة 🛒' : 'Added to cart 🛒', description: name })
    if (buyNow) navigate({ name: 'cart' })
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 pb-16">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => (company ? navigate({ name: 'company', slug: company.slug }) : navigate({ name: 'shop' }))}
        className="gap-1.5 rounded-xl mb-5"
      >
        <BackIcon size={15} /> {company ? (lang === 'ar' ? company.nameAr : company.nameEn) : t.nav.shop[lang]}
      </Button>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* visual — photos gallery with emoji fallback */}
        <ProductGallery
          product={product}
          badge={badge}
          discountPct={
            product.oldPrice && product.oldPrice > product.price
              ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
              : 0
          }
        />

        {/* info */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="space-y-5"
        >
          <div>
            {company && (
              <button
                onClick={() => navigate({ name: 'company', slug: company.slug })}
                className="inline-flex items-center gap-2 rounded-full border bg-secondary/70 px-3 py-1.5 text-xs font-bold text-violet-300 hover:border-violet-500/50 transition-colors"
              >
                <span aria-hidden>{company.emoji}</span>
                {t.product.by[lang]} {lang === 'ar' ? company.nameAr : company.nameEn}
              </button>
            )}
            <h1 className="text-xl sm:text-3xl font-black mt-3 leading-snug">{name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              <StarRating rating={product.rating} size={16} />
              <span className="text-sm font-bold">{product.rating.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">({product.reviews} {t.product.reviews[lang]})</span>
              <span
                className={`text-[11px] font-extrabold rounded-full px-2.5 py-1 border ${
                  isService
                    ? 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30'
                    : 'bg-violet-500/15 text-violet-300 border-violet-500/30'
                }`}
              >
                {isService
                  ? (isLabor ? t.product.kindLabor[lang] : `🛠️ ${t.product.kindService[lang]}`)
                  : `📦 ${t.product.kindProduct[lang]}`}
              </span>
            </div>
          </div>

          <PriceTag price={product.price} oldPrice={product.oldPrice} lang={lang} size="lg" />
          {isLabor && (
            <p className="text-xs font-semibold text-muted-foreground -mt-1">👷 {t.product.wageNote[lang]}</p>
          )}
          {isService && !isLabor && (
            <p className="text-xs font-semibold text-muted-foreground -mt-1">📅 {t.product.serviceUnit[lang]}</p>
          )}
          {isFood && xd?.cutoff && (
            <p className="text-xs font-bold text-orange-400 -mt-1">
              ⏰ {cutoffLabel(xd.cutoff, lang)} — {lang === 'ar' ? 'الطلب بعده يُجهّز في اليوم التالي' : 'Orders after it are prepared the next day'}
            </p>
          )}

          {/* stock / availability */}
          <div>
            {product.stock <= 0 ? (
              <span className="text-sm font-bold text-rose-400">✕ {isService ? t.product.outOfCapacity[lang] : t.product.outOfStock[lang]}</span>
            ) : isService ? (
              isLabor ? (
                <span className="text-sm font-bold text-sky-400">👷 {t.product.workersAvailable[lang]}: {product.stock}</span>
              ) : (
                <span className="text-sm font-bold text-emerald-400">✓ {t.product.available[lang]} — {t.product.capacityAvailable[lang]}: {product.stock}</span>
              )
            ) : product.stock <= 10 ? (
              <span className="text-sm font-bold text-amber-400">⚡ {t.product.lowStock[lang]} — {product.stock}</span>
            ) : (
              <span className="text-sm font-bold text-emerald-400">✓ {t.product.inStock[lang]}</span>
            )}
          </div>

          {/* qty + actions */}
          {product.stock > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center rounded-xl border bg-secondary/50">
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="minus">
                  <Minus size={15} />
                </Button>
                <span className="w-10 text-center font-bold text-sm" aria-live="polite">{qty}</span>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => setQty((q) => Math.min(product.stock, q + 1))} aria-label="plus">
                  <Plus size={15} />
                </Button>
              </div>
              <Button onClick={() => handleAdd(false)} className="rounded-xl font-bold gap-2 h-11 flex-1 sm:flex-none sm:px-6 shadow-lg shadow-violet-900/30">
                <ShoppingCart size={17} /> {isService ? t.product.orderService[lang] : t.product.addToCart[lang]}
              </Button>
              <Button onClick={() => handleAdd(true)} variant="secondary" className="rounded-xl font-bold gap-2 h-11 flex-1 sm:flex-none sm:px-6">
                <Zap size={17} /> {t.product.buyNow[lang]}
              </Button>
            </div>
          )}

          {/* perks — مصممة لكل قسم: المستعمل بلا إرجاع، والأكلات المنزلية بتجهيز بيتي */}
          <div className="grid sm:grid-cols-3 gap-3">
            {(isUsed
              ? [
                  { icon: Eye, text: t.xd.usedNote1[lang] },
                  { icon: RotateCcw, text: t.xd.usedNote2[lang] },
                  { icon: Truck, text: t.xd.usedNote3[lang] },
                ]
              : isFood
                ? [
                    { icon: Home, text: t.xd.foodNote1[lang] },
                    { icon: Snowflake, text: t.xd.foodNote2[lang] },
                    { icon: AlertTriangle, text: t.xd.foodNote3[lang] },
                  ]
                : [
                    { icon: Truck, text: t.product.freeShip[lang] },
                    { icon: RotateCcw, text: t.product.returns[lang] },
                    { icon: ShieldCheck, text: t.product.warranty[lang] },
                  ]
            ).map((perk) => (
              <div key={perk.text} className="flex items-start gap-2.5 rounded-xl border bg-card p-3">
                <perk.icon size={16} className={`shrink-0 mt-0.5 ${isUsed ? 'text-amber-400' : isFood ? 'text-orange-400' : 'text-primary'}`} />
                <span className="text-[11px] leading-relaxed text-muted-foreground">{perk.text}</span>
              </div>
            ))}
          </div>

          {/* ══ لوحة تفاصيل «اغراض مستعملة» ══ */}
          {isUsed && xd && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5 space-y-3">
              <h3 className="font-bold text-sm">{t.xd.panelUsed[lang]}</h3>
              <div className="flex flex-wrap gap-2">
                {[usedSubLabel(xd.sub, lang), conditionLabel(xd.cond, lang),
                  xd.ageM !== undefined ? `${lang === 'ar' ? '⏳ عمر الاستخدام' : '⏳ Age'}: ${ageLabel(xd.ageM, lang)}` : null,
                  xd.warrantyM ? `${lang === 'ar' ? '🛡️ ضمان متبقٍ' : '🛡️ Warranty left'}: ${ageLabel(xd.warrantyM, lang)}` : null,
                  xd.nego ? t.xd.negoChip[lang] : null,
                ].filter(Boolean).map((chip) => (
                  <span key={chip as string} className="rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 px-3 py-1 text-[11px] font-bold">
                    {chip}
                  </span>
                ))}
              </div>
              {conditionDescLabel(xd.cond, lang) && (
                <p className="text-[11px] text-muted-foreground leading-relaxed">{conditionDescLabel(xd.cond, lang)}</p>
              )}
            </div>
          )}

          {/* ══ لوحة تفاصيل «أكلات منزلية» ══ */}
          {isFood && xd && (
            <div className="rounded-2xl border border-orange-500/30 bg-orange-500/5 p-4 sm:p-5 space-y-3">
              <h3 className="font-bold text-sm">{t.xd.panelFood[lang]}</h3>
              <div className="flex flex-wrap gap-2">
                {[mealLabel(xd.meal, lang),
                  xd.portions ? `${lang === 'ar' ? `🍚 يكفي ${xd.portions} أشخاص` : `🍚 Serves ${xd.portions}`}` : null,
                  cutoffLabel(xd.cutoff, lang) ? `⏰ ${cutoffLabel(xd.cutoff, lang)}` : null,
                  daysLabel(xd.days, lang) ? `${lang === 'ar' ? '📅' : '📅'} ${daysLabel(xd.days, lang)}` : null,
                  prepLabel(xd.prep, lang) ? `🏠 ${prepLabel(xd.prep, lang)}` : null,
                ].filter(Boolean).map((chip) => (
                  <span key={chip as string} className="rounded-full bg-orange-500/10 border border-orange-500/25 text-orange-300 px-3 py-1 text-[11px] font-bold">
                    {chip}
                  </span>
                ))}
              </div>
              {allergensLabel(xd.allergens, lang) ? (
                <p className="text-[11px] font-bold text-rose-400 leading-relaxed">
                  ⚠️ {lang === 'ar' ? 'يحتوي:' : 'Contains:'} {allergensLabel(xd.allergens, lang)}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {lang === 'ar' ? 'لم تُحدّد مواد الحساسية لهذا الطبق — استفسر من الطاهية عند الشك.' : 'No allergen info listed for this dish — ask the cook if unsure.'}
                </p>
              )}
            </div>
          )}

          {/* description */}
          <div className="rounded-2xl border bg-card p-5">
            <h3 className="font-bold text-sm mb-2">{t.product.desc[lang]}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
          </div>
        </motion.div>
      </div>

      {/* related */}
      {related.length > 0 && (
        <section className="pt-14">
          <h2 className="text-lg font-bold mb-4">{t.product.related[lang]}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} company={companies.find((c) => c.id === p.companyId)} compact />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
