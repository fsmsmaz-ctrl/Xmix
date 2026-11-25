'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Star, Truck, Navigation, ArrowRight, ArrowLeft, Phone, MessageCircle } from 'lucide-react'
import { useXmix } from '@/store/xmix'
import { t } from '@/lib/i18n'
import type { Company, Product } from '@/lib/types'
import { areaByKey, formatKm, haversineKm } from '@/lib/geo'
import { ProductCard } from './ProductCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

/** مسافة الزبون الحالي إلى هذا الرف — تظهر فقط لمن حدّد موقعه */
function CustomerDistance({ company }: { company: Company }) {
  const lang = useXmix((s) => s.lang)
  const geo = useXmix((s) => s.geo)
  const coords =
    company.lat != null && company.lng != null
      ? { lat: company.lat, lng: company.lng }
      : company.cityKey
        ? (() => {
            const a = areaByKey(company.cityKey)
            return a ? { lat: a.lat, lng: a.lng } : null
          })()
        : null
  if (!geo || !coords) return null
  const km = haversineKm(geo.lat, geo.lng, coords.lat, coords.lng)
  if (km === null) return null
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-black/25 px-2 py-0.5 font-bold text-white" dir="ltr">
      <Navigation size={13} /> {formatKm(km, lang)}
    </span>
  )
}

export function CompanyView({
  company,
  products,
}: {
  company: Company
  products: Product[]
}) {
  const lang = useXmix((s) => s.lang)
  const navigate = useXmix((s) => s.navigate)
  const isRTL = lang === 'ar'
  const BackIcon = isRTL ? ArrowRight : ArrowLeft

  const companyProducts = useMemo(
    () => products.filter((p) => p.companyId === company.id),
    [products, company.id]
  )

  return (
    <div className="pb-16">
      {/* banner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden"
        style={{ background: company.gradient }}
      >
        <div className="absolute inset-0 opacity-25" style={{ background: 'radial-gradient(500px 240px at 85% 10%, white, transparent)' }} />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-14">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ name: 'companies' })}
            className="gap-1.5 rounded-xl text-white/85 hover:text-white hover:bg-white/15 mb-4"
          >
            <BackIcon size={15} /> {t.nav.companies[lang]}
          </Button>
          <div className="flex flex-wrap items-center gap-5">
            <span
              className="h-20 w-20 sm:h-24 sm:w-24 rounded-3xl bg-white/15 backdrop-blur flex items-center justify-center text-4xl sm:text-5xl border border-white/25 shadow-2xl"
              aria-hidden
            >
              {company.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-4xl font-black text-white">
                  {lang === 'ar' ? company.nameAr : company.nameEn}
                </h1>
                {company.isFeatured && (
                  <Badge className="bg-black/35 backdrop-blur border border-white/25 text-white font-bold">
                    ⭐ {t.companies.featured[lang]}
                  </Badge>
                )}
              </div>
              <p className="text-sm sm:text-base text-white/80 mt-1.5">
                {lang === 'ar' ? company.taglineAr : company.taglineEn}
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-white/80">
                {/* التقييم يظهر فقط عند وجوده فعلاً — بلا نجوم ملفقة للرفوف الجديدة */}
                {company.rating > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Star size={14} className="fill-amber-300 text-amber-300" />
                    <span className="font-bold text-white">{company.rating.toFixed(1)}</span>
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <MapPin size={13} /> {lang === 'ar' ? company.locationAr : company.locationEn}
                </span>
                {/* استراتيجية «الأقرب إليك»: شارة التوصيل + مسافة الزبون الحالي */}
                {company.hasDelivery ? (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-400/20 border border-emerald-200/30 px-2 py-0.5 font-bold text-emerald-50">
                    <Truck size={13} /> {t.geo.deliveryAvailable[lang]}
                  </span>
                ) : (
                  <span>🏪 {t.geo.noDelivery[lang]}</span>
                )}
                <CustomerDistance company={company} />
                <span>📦 {companyProducts.length} {t.companies.productsOnShelf[lang]}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-8">
        {/* description */}
        <div className="rounded-2xl border bg-card p-5 mb-6">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {lang === 'ar' ? company.descAr : company.descEn}
          </p>
        </div>

        {/* تواصل مباشر مع المحل — يظهر فقط لما يوفره التاجر */}
        {(company.phone || company.whatsapp) && (
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-5 mb-8">
            <h2 className="text-sm font-black mb-3">📞 {t.contact.shopTitle[lang]}</h2>
            <div className="flex flex-wrap gap-3">
              {company.phone && (
                <Button asChild className="rounded-xl gap-2 font-bold">
                  <a href={`tel:${company.phone.replace(/\s/g, '')}`} dir="ltr">
                    <Phone size={15} /> {t.contact.call[lang]} <span className="hidden sm:inline">{company.phone}</span>
                  </a>
                </Button>
              )}
              {company.whatsapp && (
                <Button asChild variant="outline" className="rounded-xl gap-2 font-bold border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10">
                  <a href={`https://wa.me/${company.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" dir="ltr">
                    <MessageCircle size={15} /> {t.contact.whatsapp[lang]}
                  </a>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* products */}
        <h2 className="text-lg font-bold mb-4">
          {t.sections.shelves[lang]} — {lang === 'ar' ? company.nameAr : company.nameEn}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {companyProducts.map((p) => (
            <ProductCard key={p.id} product={p} company={company} />
          ))}
        </div>
      </div>
    </div>
  )
}
