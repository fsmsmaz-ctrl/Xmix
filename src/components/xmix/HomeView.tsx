'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ShieldCheck, Truck, LayoutGrid, Headset, ArrowLeft, ArrowRight, Building2,
} from 'lucide-react'
import { useXmix } from '@/store/xmix'
import { t } from '@/lib/i18n'
import type { Company, Product } from '@/lib/types'
import { CATEGORIES } from '@/lib/types'
import { ProductCard } from './ProductCard'
import { SectionTitle, StarRating } from './shared'
import { Logo } from './Logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function HomeView({
  companies,
  products,
}: {
  companies: Company[]
  products: Product[]
}) {
  const lang = useXmix((s) => s.lang)
  const navigate = useXmix((s) => s.navigate)
  const setShopFilters = useXmix((s) => s.setShopFilters)
  const isRTL = lang === 'ar'
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight

  const productsByCompany = useMemo(() => {
    const map = new Map<string, Product[]>()
    for (const p of products) {
      const arr = map.get(p.companyId) ?? []
      arr.push(p)
      map.set(p.companyId, arr)
    }
    return map
  }, [products])

  const featured = companies.find((c) => c.isFeatured) ?? companies[0]
  const bestSellers = products.filter((p) => p.isBestSeller).slice(0, 5)

  const search = (q: string) => {
    setShopFilters({ q, company: '', category: '' })
    navigate({ name: 'shop' })
  }

  return (
    <div className="pb-16">
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden xmix-hero-glow border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-14 sm:py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="relative inline-block"
            >
              <span className="absolute inset-0 m-auto h-28 w-28 sm:h-32 sm:w-32 rounded-[2rem] bg-violet-500/30 blur-2xl" />
              <Logo size={120} className="relative mx-auto sm:w-[136px]! sm:h-[136px]! drop-shadow-[0_10px_30px_rgba(139,92,246,0.35)]" priority />
            </motion.div>
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-bold text-violet-300">
              <Building2 size={14} />
              {t.hero.badge[lang]}
            </span>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black leading-tight tracking-tight">
              {t.hero.title1[lang]}{' '}
              <span className="xmix-gradient-text">{t.hero.title2[lang]}</span>
            </h1>
            <p className="max-w-2xl mx-auto text-sm sm:text-base text-muted-foreground leading-relaxed">
              {t.hero.subtitle[lang]}
            </p>

            <div className="max-w-xl mx-auto relative">
              <Input
                onKeyDown={(e) => e.key === 'Enter' && search((e.target as HTMLInputElement).value)}
                placeholder={t.hero.searchPlaceholder[lang]}
                className="h-13 ps-11 pe-28 h-[52px] rounded-2xl bg-secondary/70 border-violet-500/25 text-sm"
                aria-label={t.hero.searchPlaceholder[lang]}
              />
              <span className="absolute start-4 top-1/2 -translate-y-1/2 text-muted-foreground">🔍</span>
              <Button
                onClick={() => {
                  const el = document.querySelector<HTMLInputElement>('[aria-label="' + t.hero.searchPlaceholder[lang] + '"]')
                  search(el?.value ?? '')
                }}
                className="absolute end-1.5 top-1/2 -translate-y-1/2 h-10 rounded-xl font-bold shadow-md shadow-violet-900/40"
              >
                {t.hero.ctaShop[lang]}
              </Button>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              <Button
                size="lg"
                onClick={() => navigate({ name: 'shop' })}
                className="rounded-xl font-bold shadow-lg shadow-violet-900/40"
              >
                {t.hero.ctaShop[lang]} <ArrowIcon size={17} className="ms-1" />
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => navigate({ name: 'companies' })}
                className="rounded-xl font-bold"
              >
                {t.hero.ctaCompanies[lang]}
              </Button>
            </div>
          </motion.div>

          {/* stats */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto"
          >
            {[
              { num: String(companies.length), label: t.hero.statCompanies[lang], emoji: '🏢' },
              { num: `+${products.length}`, label: t.hero.statProducts[lang], emoji: '📦' },
              { num: '11', label: t.hero.statDelivery[lang], emoji: '🚚' },
              { num: '24/7', label: t.hero.statSupport[lang], emoji: '💬' },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border bg-card/70 backdrop-blur px-3 py-4">
                <p className="text-2xl font-black xmix-gradient-text">{s.num}</p>
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">{s.emoji} {s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* ============ FEATURED SHELF (Qat Oman) ============ */}
        {featured && (
          <section className="pt-12">
            <SectionTitle
              title={`${featured.emoji} ${lang === 'ar' ? featured.nameAr : featured.nameEn} — ${t.sections.featuredShelf[lang]}`}
              subtitle={lang === 'ar' ? featured.taglineAr : featured.taglineEn}
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate({ name: 'company', slug: featured.slug })}
                  className="gap-1.5 rounded-xl font-bold"
                >
                  {t.sections.visitShelf[lang]} <ArrowIcon size={15} />
                </Button>
              }
            />
            <div className="xmix-shelf flex gap-4 overflow-x-auto pb-3 -mx-1 px-1">
              {(productsByCompany.get(featured.id) ?? []).slice(0, 8).map((p) => (
                <div key={p.id} className="w-48 sm:w-56 shrink-0">
                  <ProductCard product={p} company={featured} compact />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ============ CATEGORIES ============ */}
        <section className="pt-12">
          <SectionTitle title={t.sections.categories[lang]} />
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => { setShopFilters({ category: cat.key, company: '', q: '' }); navigate({ name: 'shop' }) }}
                className="xmix-card-hover rounded-2xl border bg-card p-4 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="text-3xl block mb-2" aria-hidden>{cat.emoji}</span>
                <span className="text-xs font-bold block">{lang === 'ar' ? cat.ar : cat.en}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ============ ALL COMPANY SHELVES ============ */}
        <section className="pt-12">
          <SectionTitle
            title={t.sections.shelves[lang]}
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate({ name: 'companies' })}
                className="gap-1.5 rounded-xl font-bold"
              >
                {t.sections.viewAll[lang]} <ArrowIcon size={15} />
              </Button>
            }
          />
          <div className="space-y-10">
            {companies
              .filter((c) => !c.isFeatured)
              .slice(0, 3)
              .map((company) => (
                <div key={company.id}>
                  {/* shelf header */}
                  <div
                    className="rounded-2xl p-4 sm:p-5 mb-4 flex flex-wrap items-center gap-4 justify-between border"
                    style={{ background: company.gradient }}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span
                        className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center text-2xl sm:text-3xl border border-white/20 shrink-0"
                        aria-hidden
                      >
                        {company.emoji}
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-base sm:text-lg font-extrabold text-white truncate">
                          {lang === 'ar' ? company.nameAr : company.nameEn}
                        </h3>
                        <p className="text-xs sm:text-sm text-white/75 truncate">
                          {lang === 'ar' ? company.taglineAr : company.taglineEn}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="hidden sm:flex items-center gap-2 text-white/85 text-xs">
                        <StarRating rating={company.rating} size={13} />
                        <span className="font-bold">{company.rating.toFixed(1)}</span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => navigate({ name: 'company', slug: company.slug })}
                        className="rounded-xl font-bold bg-white/15 hover:bg-white/25 text-white border border-white/20"
                      >
                        {t.sections.visitShelf[lang]}
                      </Button>
                    </div>
                  </div>
                  {/* shelf products */}
                  <div className="xmix-shelf flex gap-4 overflow-x-auto pb-3 -mx-1 px-1">
                    {(productsByCompany.get(company.id) ?? []).slice(0, 8).map((p) => (
                      <div key={p.id} className="w-48 sm:w-56 shrink-0">
                        <ProductCard product={p} company={company} compact />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </section>

        {/* ============ BEST SELLERS ============ */}
        <section className="pt-12">
          <SectionTitle title={`🔥 ${t.sections.bestSellers[lang]}`} />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {bestSellers.map((p) => (
              <ProductCard key={p.id} product={p} company={companies.find((c) => c.id === p.companyId)} />
            ))}
          </div>
        </section>

        {/* ============ WHY XMIX ============ */}
        <section className="pt-14">
          <SectionTitle title={t.sections.whyXmix[lang]} />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: ShieldCheck, title: t.why.quality[lang], desc: t.why.qualityDesc[lang] },
              { icon: Truck, title: t.why.fast[lang], desc: t.why.fastDesc[lang] },
              { icon: LayoutGrid, title: t.why.unified[lang], desc: t.why.unifiedDesc[lang] },
              { icon: Headset, title: t.why.secure[lang], desc: t.why.secureDesc[lang] },
            ].map((f) => (
              <div key={f.title} className="xmix-card-hover rounded-2xl border bg-card p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary mb-3">
                  <f.icon size={21} />
                </span>
                <h3 className="font-bold text-sm mb-1.5">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ============ JOIN CTA ============ */}
        <section className="pt-14">
          <div
            className="rounded-3xl p-8 sm:p-10 text-center relative overflow-hidden border border-violet-500/30"
            style={{ background: 'linear-gradient(135deg,#4C1D95 0%,#7C3AED 55%,#A21CAF 100%)' }}
          >
            <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(400px 200px at 80% 20%, white, transparent)' }} />
            <div className="relative space-y-4">
              <h2 className="text-2xl sm:text-3xl font-black text-white">{t.sections.joinCta[lang]}</h2>
              <p className="text-sm sm:text-base text-white/80 max-w-xl mx-auto">{t.sections.joinCtaDesc[lang]}</p>
              <Button
                size="lg"
                onClick={() => navigate({ name: 'join' })}
                className="rounded-xl font-bold bg-white text-violet-800 hover:bg-violet-50 shadow-xl"
              >
                {t.nav.join[lang]} <ArrowIcon size={17} className="ms-1" />
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
