'use client'

import { useCallback, useEffect, useState } from 'react'
import { Navigation, Save, Eraser, Truck } from 'lucide-react'
import { useXmix } from '@/store/xmix'
import { t } from '@/lib/i18n'
import { AREAS, GOVERNORATES, findNearestArea, validCoords } from '@/lib/geo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'

interface ShelfGeo {
  id: string
  slug: string
  nameAr: string
  nameEn: string
  locationAr: string
  locationEn: string
  cityKey: string | null
  lat: number | null
  lng: number | null
  hasDelivery: boolean
  deliveryFee: number | null
  deliveryEta: number | null
}

/** خيارات زمن التوصيل المعروضة (دقائق) */
const ETA_OPTIONS = [15, 30, 45, 60, 90, 120, 180, 240]

/**
 * تبويب «الموقع والتوصيل» في لوحة التاجر — بوابة رفه إلى استراتيجية «الأقرب إليك»:
 *  • ولاية الرف (من سجل الولايات) أو إحداثيات GPS دقيقة
 *  • خدمة التوصيل + الرسوم + الزمن — تدخل كلها في ترتيب النتائج القريبة
 * الحفظ عبر PATCH /api/admin/company (المسار يتحقق من الجلسة والملكية والتعقيم).
 */
export function ShelfGeoTab() {
  const lang = useXmix((s) => s.lang)
  const g = t.geo

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [shelf, setShelf] = useState<ShelfGeo | null>(null)
  const [cityKey, setCityKey] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [hasDelivery, setHasDelivery] = useState(false)
  const [fee, setFee] = useState('')
  const [eta, setEta] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/company', { cache: 'no-store' })
      if (!res.ok) {
        const j = await res.json().catch(() => null)
        throw new Error(j?.error || 'failed')
      }
      const data = (await res.json()) as { company?: ShelfGeo }
      const c = data.company
      if (!c) throw new Error()
      setShelf(c)
      setCityKey(c.cityKey ?? '')
      setLat(c.lat)
      setLng(c.lng)
      setHasDelivery(!!c.hasDelivery)
      setFee(c.deliveryFee != null ? String(c.deliveryFee) : '')
      setEta(c.deliveryEta != null ? String(c.deliveryEta) : '')
    } catch (e) {
      toast({
        title: e instanceof Error && e.message && e.message !== 'failed' ? e.message : t.misc.errorLoad[lang],
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [lang])

  useEffect(() => {
    void load()
  }, [load])

  const captureGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      toast({ title: g.gpsUnsupported[lang] })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        if (!validCoords(latitude, longitude)) {
          toast({ title: 'إحداثيات غير صالحة | Invalid coordinates' })
          return
        }
        setLat(latitude)
        setLng(longitude)
        const near = findNearestArea(latitude, longitude)
        if (near && !cityKey) setCityKey(near.area.key)
        toast({ title: g.gpsCaptured[lang] })
      },
      () => toast({ title: g.gpsDenied[lang] }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  }

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/company', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cityKey: cityKey || null,
          lat: lat != null && lng != null ? lat : null,
          lng: lat != null && lng != null ? lng : null,
          hasDelivery,
          deliveryFee: fee.trim() === '' ? null : fee,
          deliveryEta: eta.trim() === '' ? null : eta,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => null)
        throw new Error(j?.error || 'failed')
      }
      toast({ title: g.geoSaved[lang] })
      void load()
    } catch (e) {
      toast({
        title: e instanceof Error && e.message && e.message !== 'failed' ? e.message : t.misc.errorLoad[lang],
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const resetGeo = async () => {
    if (!window.confirm(g.resetConfirm[lang])) return
    try {
      const res = await fetch('/api/admin/company', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetGeo: true }),
      })
      if (!res.ok) throw new Error()
      toast({ title: g.geoReset[lang] })
      void load()
    } catch {
      toast({ title: t.misc.errorLoad[lang], variant: 'destructive' })
    }
  }

  if (loading) {
    return <p className="text-center text-sm text-muted-foreground py-16">{t.misc.loading[lang]}</p>
  }

  return (
    <div className="space-y-5">
      {/* الترويسة */}
      <div className="rounded-3xl border border-violet-500/25 bg-gradient-to-br from-violet-600/15 via-card to-card p-6">
        <h2 className="text-lg font-black">{g.shelfGeoTitle[lang]}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mt-1.5">{g.shelfGeoDesc[lang]}</p>
        {shelf && (
          <p className="text-xs font-bold text-violet-300 mt-2">
            {lang === 'ar' ? shelf.nameAr : shelf.nameEn}
            {' — '}
            {lang === 'ar' ? shelf.locationAr : shelf.locationEn}
          </p>
        )}
      </div>

      {/* الإحداثيات */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div>
          <Label className="text-sm font-bold">{g.area[lang]}</Label>
          <p className="text-[11px] text-muted-foreground mt-1 mb-2">{g.areaHint[lang]}</p>
          <select
            value={cityKey}
            onChange={(e) => setCityKey(e.target.value)}
            aria-label={g.selectArea[lang]}
            className="w-full max-w-sm rounded-xl border border-border bg-secondary/60 px-3 py-2.5 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">— {g.selectArea[lang]} —</option>
            {GOVERNORATES.map((gov) => (
              <optgroup key={gov.key} label={lang === 'ar' ? gov.ar : gov.en}>
                {AREAS.filter((a) => a.gov === gov.key).map((a) => (
                  <option key={a.key} value={a.key}>
                    {lang === 'ar' ? a.ar : a.en}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={captureGps} className="rounded-xl gap-1.5 font-bold">
            <Navigation size={15} /> {g.gpsCapture[lang]}
          </Button>
          {lat != null && lng != null && (
            <span className="text-xs font-bold text-emerald-400" dir="ltr">
              📍 {g.coordsShown[lang]}: {lat.toFixed(4)}, {lng.toFixed(4)}
            </span>
          )}
        </div>
      </div>

      {/* التوصيل */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hasDelivery}
            onChange={(e) => setHasDelivery(e.target.checked)}
            className="h-[18px] w-[18px] accent-violet-600"
          />
          <span className="text-sm font-bold flex items-center gap-1.5">
            <Truck size={15} className={hasDelivery ? 'text-emerald-400' : 'text-muted-foreground'} />
            {g.enableDelivery[lang]}
          </span>
        </label>
        <p className="text-[11px] text-muted-foreground">{g.deliveryHint[lang]}</p>

        <div className="grid sm:grid-cols-2 gap-4 max-w-xl">
          <div>
            <Label className="text-xs font-bold">{g.feeLabel[lang]}</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              placeholder="1.5"
              className="mt-1.5 rounded-xl bg-secondary/60"
              dir="ltr"
            />
          </div>
          <div>
            <Label className="text-xs font-bold">{g.etaLabel[lang]}</Label>
            <select
              value={eta}
              onChange={(e) => setEta(e.target.value)}
              className="w-full mt-1.5 rounded-xl border border-border bg-secondary/60 px-3 py-2.5 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">{g.etaUnset[lang]}</option>
              {ETA_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m} {g.minutes[lang]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* الحفظ */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={save} disabled={saving} className="rounded-xl gap-2 font-bold shadow-lg shadow-violet-900/30">
          <Save size={16} /> {saving ? t.misc.loading[lang] : g.saveGeo[lang]}
        </Button>
        <Button variant="ghost" onClick={resetGeo} className="rounded-xl gap-2 text-rose-400">
          <Eraser size={15} /> {g.resetGeo[lang]}
        </Button>
      </div>
    </div>
  )
}
