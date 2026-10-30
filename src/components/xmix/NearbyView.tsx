'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Navigation, Store, Star, RefreshCw, Compass } from 'lucide-react'
import { useXmix } from '@/store/xmix'
import { t } from '@/lib/i18n'
import type { NearbyOrigin, NearbyStore } from '@/lib/types'
import { distanceBucket } from '@/lib/geo'
import { fmtPrice } from '@/store/xmix'
import { ProductCard } from './ProductCard'
import { Button } from '@/components/ui/button'

/**
 * «الأقرب إليك» — قلب الاستراتيجية على الواجهة:
 *  • يقرأ موقع الزبون من المخزن (GPS أو ولاية يدوية)
 *  • يجلب المحلات مرتبة من /api/nearby (قرب ← جودة ← توصيل) مع أفضل منتجات كل محل
 *  • بلا موقع: بطاقة دعوة لطيفة لتحديده (تفتح نافذة الموقع)
 *  • تغيير الموقع متاح دائماً من الشريط العلوي للصفحة
 */
export function NearbyView() {
  const lang = useXmix((s) => s.lang)
  const geo = useXmix((s) => s.geo)
  const openGeoPrompt = useXmix((s) => s.openGeoPrompt)
  const navigate = useXmix((s) => s.navigate)
  const g = t.geo

  const [stores, setStores] = useState<NearbyStore[]>([])
  const [origin, setOrigin] = useState<NearbyOrigin | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  const params = useMemo(() => {
    if (!geo) return null
    const sp = new URLSearchParams({ limit: '12', perStore: '4' })
    if (geo.mode === 'gps') {
      sp.set('lat', String(geo.lat))
      sp.set('lng', String(geo.lng))
    } else {
      sp.set('city', geo.cityKey)
    }
    return sp.toString()
  }, [geo])

  const load = useCallback(async () => {
    if (!params) return
    setLoading(true)
    setFailed(false)
    try {
      const res = await fetch(`/api/nearby?${params}`, { cache: 'no-store' })
      if (!res.ok) throw new Error()
      const data = (await res.json()) as { origin: NearbyOrigin | null; stores?: NearbyStore[] }
      setStores(data.stores ?? [])
      setOrigin(data.origin ?? null)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => {
    void load()
  }, [load])

  const locationLabel = geo ? (lang === 'ar' ? geo.labelAr : geo.labelEn) : ''
  const modeLabel = geo?.mode === 'gps' ? 'GPS' : lang === 'ar' ? 'يدوي' : 'Manual'
  const originArea = origin ? (lang === 'ar' ? origin.areaAr : origin.areaEn) : ''

  return (
    <div className="pb-16">
      {/* ===== ترويسة الصفحة + موقعك ===== */}
      <section className="relative overflow-hidden border-b xmix-hero-glow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 space-y-5">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-bold text-violet-300">
              <Compass size={14} /> {t.nav.nearby[lang]}
            </span>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight">📍 {g.nearbyTitle[lang]}</h1>
            <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">{g.nearbyDesc[lang]}</p>
          </motion.div>

          {geo ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                {geo.mode === 'gps' ? <Navigation size={18} /> : <MapPin size={18} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-emerald-400/80">
                  {g.yourLocation[lang]} · {modeLabel}
                </p>
                <p className="text-sm font-black truncate">
                  📍 {locationLabel}
                  {originArea && originArea !== locationLabel && (
                    <span className="text-muted-foreground font-bold"> — {originArea}</span>
                  )}
                </p>
              </div>
              <Button size="sm" variant="secondary" onClick={openGeoPrompt} className="rounded-xl gap-1.5 font-bold">
                <MapPin size={14} /> {g.changeLocation[lang]}
              </Button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="rounded-3xl border border-violet-500/30 bg-violet-500/10 p-8 text-center space-y-4"
            >
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-500/20 text-violet-300">
                <MapPin size={28} />
              </span>
              <h2 className="text-lg font-black">{g.setNow[lang]}</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">{g.locationNotSet[lang]}</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={openGeoPrompt} className="rounded-xl font-bold gap-2 shadow-lg shadow-violet-900/40">
                  <Navigation size={16} /> {g.setNow[lang]}
                </Button>
                <Button variant="secondary" onClick={() => navigate({ name: 'companies' })} className="rounded-xl font-bold">
                  <Store size={16} /> {g.browseAll[lang]}
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* ===== الحالات ===== */}
        {geo && loading && stores.length === 0 && (
          <div className="grid gap-3 pt-8 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl border bg-card/60" />
            ))}
          </div>
        )}

        {failed && (
          <div className="pt-8 text-center space-y-3">
            <p className="text-sm font-bold text-rose-400">{g.errorLoad[lang]}</p>
            <Button size="sm" variant="secondary" onClick={() => void load()} className="rounded-xl gap-1.5 font-bold">
              <RefreshCw size={14} /> {g.retry[lang]}
            </Button>
          </div>
        )}

        {!geo && !loading && null /* بطاقة الدعوة أعلاه تكفي */}
        {geo && !loading && !failed && stores.length === 0 && (
          <div className="pt-12 text-center space-y-4">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-secondary text-2xl">🛍️</span>
            <h2 className="text-lg font-black">{g.emptyTitle[lang]}</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">{g.emptyDesc[lang]}</p>
            <Button variant="secondary" onClick={() => navigate({ name: 'companies' })} className="rounded-xl font-bold">
              <Store size={16} /> {g.browseAll[lang]}
            </Button>
          </div>
        )}

        {/* ===== المحلات المرتبة ===== */}
        {stores.length > 0 && (
          <div className="space-y-8 pt-8">
            {stores.map((s, idx) => {
              const bucket = distanceBucket(s.distanceKm, lang)
              const distLabel = lang === 'ar' ? s.distanceLabel : s.distanceLabelEn
              const areaLabel = lang === 'ar' ? (s.areaAr || s.locationAr) : (s.areaEn || s.locationEn)
              return (
                <motion.section
                  key={s.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: Math.min(0.05 * idx, 0.4) }}
                >
                  {/* رأس الرف — ألوان المحل نفسها */}
                  <div
                    className="rounded-2xl p-4 sm:p-5 mb-4 flex flex-wrap items-center gap-4 justify-between border"
                    style={{ background: s.gradient }}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="relative h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center text-2xl sm:text-3xl border border-white/20 shrink-0" aria-hidden>
                        {s.emoji}
                        {/* رقم الترتيب في نتائج القرب */}
                        <span className="absolute -top-1.5 -start-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-black text-white border border-white/30">
                          {idx + 1}
                        </span>
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-base sm:text-lg font-extrabold text-white truncate">
                          {lang === 'ar' ? s.nameAr : s.nameEn}
                        </h3>
                        <p className="text-xs sm:text-sm text-white/75 truncate">
                          {lang === 'ar' ? s.taglineAr : s.taglineEn}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {/* المسافة + شريط القرب */}
                      {s.distanceKm !== null && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-white/15 border border-white/20 px-2 py-1 text-[11px] font-black text-white" dir="ltr">
                          <MapPin size={12} /> {distLabel}
                        </span>
                      )}
                      {/* التوصيل */}
                      <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold border ${s.hasDelivery ? 'bg-emerald-400/20 border-emerald-200/30 text-emerald-50' : 'bg-white/10 border-white/20 text-white/80'}`}>
                        {s.hasDelivery
                          ? `${g.deliveryAvailable[lang]}${s.deliveryEta ? ` · ${s.deliveryEta} ${g.minutes[lang]}` : ''}`
                          : `🏪 ${g.noDelivery[lang]}`}
                      </span>
                      <div className="hidden sm:flex items-center gap-2 text-white/90 text-xs">
                        <Star size={13} className="fill-amber-300 text-amber-300" />
                        <span className="font-black">{s.rating.toFixed(1)}</span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => navigate({ name: 'company', slug: s.slug })}
                        className="rounded-xl font-bold bg-white/15 hover:bg-white/25 text-white border border-white/20"
                      >
                        {g.openShelf[lang]}
                      </Button>
                    </div>
                  </div>

                  {/* سطر معلومات: الولاية + شريط القرب + رسوم التوصيل */}
                  <div className="flex flex-wrap items-center gap-2 mb-3 -mt-1">
                    {areaLabel && (
                      <span className="inline-flex items-center rounded-md bg-secondary/80 px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                        🗺️ {areaLabel}
                      </span>
                    )}
                    {bucket && (
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${bucket.cls}`}>
                        {bucket.label}
                      </span>
                    )}
                    {s.hasDelivery && s.deliveryFee != null && (
                      <span className="inline-flex items-center rounded-md bg-secondary/80 px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                        {s.deliveryFee === 0
                          ? `🎁 ${g.freeDelivery[lang]}`
                          : `🚚 ${g.deliveryFee[lang]}: ${fmtPrice(s.deliveryFee, lang)}`}
                      </span>
                    )}
                  </div>

                  {/* أفضل منتجات المحل */}
                  {s.products.length > 0 ? (
                    <div className="xmix-shelf flex gap-4 overflow-x-auto pb-3 -mx-1 px-1">
                      {s.products.map((p) => (
                        <div key={p.id} className="w-48 sm:w-56 shrink-0">
                          <ProductCard
                            product={p}
                            company={{
                              id: s.id,
                              slug: s.slug,
                              nameAr: s.nameAr,
                              nameEn: s.nameEn,
                              taglineAr: s.taglineAr,
                              taglineEn: s.taglineEn,
                              descAr: '',
                              descEn: '',
                              category: s.category,
                              emoji: s.emoji,
                              color: '#8B5CF6',
                              gradient: s.gradient,
                              locationAr: s.locationAr,
                              locationEn: s.locationEn,
                              rating: s.rating,
                              isFeatured: s.isFeatured,
                              status: 'active',
                              joinedAt: '',
                            }}
                            compact
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground px-1">
                      {lang === 'ar' ? 'لا منتجات متاحة حالياً في هذا الرف' : 'No available products in this shelf right now'}
                    </p>
                  )}
                </motion.section>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
