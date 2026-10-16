'use client'

import { motion } from 'framer-motion'
import { MapPin, Star, ArrowLeft, ArrowRight } from 'lucide-react'
import { useXmix } from '@/store/xmix'
import { t } from '@/lib/i18n'
import type { Company } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function CompaniesView({ companies }: { companies: Company[] }) {
  const lang = useXmix((s) => s.lang)
  const navigate = useXmix((s) => s.navigate)
  const isRTL = lang === 'ar'
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 pb-16">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h1 className="text-2xl sm:text-3xl font-black">{t.companies.title[lang]}</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-2">{t.companies.subtitle[lang]}</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {companies.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.06 }}
          >
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate({ name: 'company', slug: c.slug })}
              onKeyDown={(e) => e.key === 'Enter' && navigate({ name: 'company', slug: c.slug })}
              className="group cursor-pointer rounded-2xl border bg-card overflow-hidden xmix-card-hover outline-none focus-visible:ring-2 focus-visible:ring-ring h-full flex flex-col"
            >
              {/* banner */}
              <div className="relative h-32 flex items-center justify-center" style={{ background: c.gradient }}>
                <span className="text-5xl drop-shadow-lg group-hover:scale-110 transition-transform duration-300" aria-hidden>
                  {c.emoji}
                </span>
                {c.isFeatured && (
                  <Badge className="absolute top-3 start-3 bg-black/40 backdrop-blur border border-white/25 text-white font-bold">
                    ⭐ {t.companies.featured[lang]}
                  </Badge>
                )}
              </div>

              <div className="p-4 flex flex-col gap-2.5 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-base truncate">{lang === 'ar' ? c.nameAr : c.nameEn}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {lang === 'ar' ? c.taglineAr : c.taglineEn}
                    </p>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-bold text-amber-400 shrink-0">
                    <Star size={13} className="fill-amber-400" /> {c.rating.toFixed(1)}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {lang === 'ar' ? c.descAr : c.descEn}
                </p>

                <div className="mt-auto pt-2 flex items-center justify-between gap-2 flex-wrap">
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <MapPin size={12} /> {lang === 'ar' ? c.locationAr : c.locationEn}
                  </span>
                  <span className="text-[11px] font-bold text-violet-300">
                    {c._count?.products ?? 0} {t.companies.productsOnShelf[lang]}
                  </span>
                </div>

                <Button
                  className="mt-1 w-full rounded-xl font-bold gap-1.5"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate({ name: 'company', slug: c.slug })
                  }}
                >
                  {t.sections.visitShelf[lang]} <ArrowIcon size={15} />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
