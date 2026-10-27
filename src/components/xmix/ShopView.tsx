'use client'

import { useMemo, useState } from 'react'
import { SlidersHorizontal, Search, RotateCcw, ChevronDown } from 'lucide-react'
import { useXmix } from '@/store/xmix'
import { t } from '@/lib/i18n'
import type { Company, Product } from '@/lib/types'
import { CATEGORIES, AGRI_CATEGORY_KEYS, AGRI_FILTER_PRESET } from '@/lib/types'
import { ProductCard } from './ProductCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

export function ShopView({
  companies,
  products,
}: {
  companies: Company[]
  products: Product[]
}) {
  const lang = useXmix((s) => s.lang)
  const filters = useXmix((s) => s.shopFilters)
  const setShopFilters = useXmix((s) => s.setShopFilters)
  const resetShopFilters = useXmix((s) => s.resetShopFilters)
  const [openMobile, setOpenMobile] = useState(false)

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase()
    let list = products.filter((p) => {
      const company = companies.find((c) => c.id === p.companyId)
      if (filters.company && p.companyId !== filters.company) return false
      if (filters.category === AGRI_FILTER_PRESET) {
        // فلتر جاهز: كل العائلة الزراعية والمحلية معاً (منتجات + محاصيل + بذور + محليات)
        if (!AGRI_CATEGORY_KEYS.includes(p.category)) return false
      } else if (filters.category && p.category !== filters.category) {
        return false
      }
      if (filters.kind && (p.kind ?? 'product') !== filters.kind) return false
      if (filters.minPrice && p.price < Number(filters.minPrice)) return false
      if (filters.maxPrice && p.price > Number(filters.maxPrice)) return false
      if (q) {
        const hay = `${p.nameAr} ${p.nameEn} ${p.descAr} ${p.descEn} ${company?.nameAr ?? ''} ${company?.nameEn ?? ''} ${p.category}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    switch (filters.sort) {
      case 'priceAsc': list = [...list].sort((a, b) => a.price - b.price); break
      case 'priceDesc': list = [...list].sort((a, b) => b.price - a.price); break
      case 'rating': list = [...list].sort((a, b) => b.rating - a.rating); break
      default: list = [...list].sort((a, b) => Number(b.isBestSeller) - Number(a.isBestSeller))
    }
    return list
  }, [products, companies, filters])

  const filterPanel = (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-primary" /> {t.filters.title[lang]}
        </h3>
        <Button variant="ghost" size="sm" onClick={resetShopFilters} className="gap-1 text-xs h-8 rounded-lg">
          <RotateCcw size={13} /> {t.filters.reset[lang]}
        </Button>
      </div>

      {/* search */}
      <div className="relative">
        <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.q}
          onChange={(e) => setShopFilters({ q: e.target.value })}
          placeholder={t.hero.searchPlaceholder[lang]}
          className="ps-9 rounded-xl bg-secondary/60"
        />
      </div>

      {/* company */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-muted-foreground">{t.filters.company[lang]}</label>
        <Select
          value={filters.company || 'ALL'}
          onValueChange={(v) => setShopFilters({ company: v === 'ALL' ? '' : v })}
        >
          <SelectTrigger className="w-full rounded-xl bg-secondary/60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t.filters.all[lang]}</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.emoji} {lang === 'ar' ? c.nameAr : c.nameEn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* kind: product vs service — the two core listing types */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-muted-foreground">{t.filters.kind[lang]}</label>
        <Select
          value={filters.kind || 'ALL'}
          onValueChange={(v) => setShopFilters({ kind: v === 'ALL' ? '' : (v as 'product' | 'service') })}
        >
          <SelectTrigger className="w-full rounded-xl bg-secondary/60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t.filters.kindAll[lang]}</SelectItem>
            <SelectItem value="product">📦 {t.filters.kindProducts[lang]}</SelectItem>
            <SelectItem value="service">🛠️ {t.filters.kindServices[lang]}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* category */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-muted-foreground">{t.filters.category[lang]}</label>
        <Select
          value={filters.category || 'ALL'}
          onValueChange={(v) => setShopFilters({ category: v === 'ALL' ? '' : v })}
        >
          <SelectTrigger className="w-full rounded-xl bg-secondary/60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t.filters.all[lang]}</SelectItem>
            <SelectItem value={AGRI_FILTER_PRESET}>🌾 {t.filters.agriAll[lang]}</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.key} value={cat.key}>
                {cat.emoji} {lang === 'ar' ? cat.ar : cat.en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* price */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-muted-foreground">{t.filters.priceRange[lang]}</label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number" min="0" step="0.5"
            value={filters.minPrice}
            onChange={(e) => setShopFilters({ minPrice: e.target.value })}
            placeholder={t.filters.min[lang]}
            className="rounded-xl bg-secondary/60"
          />
          <Input
            type="number" min="0" step="0.5"
            value={filters.maxPrice}
            onChange={(e) => setShopFilters({ maxPrice: e.target.value })}
            placeholder={t.filters.max[lang]}
            className="rounded-xl bg-secondary/60"
          />
        </div>
      </div>

      {/* sort */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-muted-foreground">{t.filters.sort[lang]}</label>
        <Select
          value={filters.sort}
          onValueChange={(v) => setShopFilters({ sort: v as typeof filters.sort })}
        >
          <SelectTrigger className="w-full rounded-xl bg-secondary/60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="featured">{t.filters.featured[lang]}</SelectItem>
            <SelectItem value="priceAsc">{t.filters.priceAsc[lang]}</SelectItem>
            <SelectItem value="priceDesc">{t.filters.priceDesc[lang]}</SelectItem>
            <SelectItem value="rating">{t.filters.rating[lang]}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black">{t.nav.shop[lang]}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filters.q ? `${t.misc.searchIn[lang]} "${filters.q}" — ` : ''}
            {filtered.length} {t.filters.results[lang]}
          </p>
        </div>
        {/* mobile filter toggle */}
        <Collapsible open={openMobile} onOpenChange={setOpenMobile} className="lg:hidden w-full">
          <CollapsibleTrigger asChild>
            <Button variant="secondary" className="w-full justify-between rounded-xl font-bold">
              {t.filters.title[lang]} <ChevronDown size={16} className={openMobile ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-3 rounded-2xl border bg-card p-4">{filterPanel}</div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <div className="flex gap-6">
        {/* desktop filters */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="rounded-2xl border bg-card p-4 sticky top-24">{filterPanel}</div>
        </aside>

        {/* results */}
        <div className="flex-1">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground text-center">
              <span className="text-5xl">🔍</span>
              <p className="font-bold text-foreground">{t.filters.noResults[lang]}</p>
              <p className="text-sm max-w-xs">{t.filters.noResultsDesc[lang]}</p>
              <Button variant="secondary" onClick={resetShopFilters} className="mt-2 rounded-xl">
                {t.filters.reset[lang]}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  company={companies.find((c) => c.id === p.companyId)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
