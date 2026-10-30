'use client'

import { useEffect, useState } from 'react'
import { MapPin, Navigation, ShieldCheck } from 'lucide-react'
import { useXmix, GEO_VERSION } from '@/store/xmix'
import { t } from '@/lib/i18n'
import { AREAS, GOVERNORATES, findNearestArea, validCoords } from '@/lib/geo'
import type { Area } from '@/lib/geo'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'

/**
 * نافذة موقع العميل — بوابة استراتيجية «الأقرب إليك»:
 *  • تظهر تلقائياً في أول زيارة (بعد نافذة الاهتمامات بقليل) أو عند رفع GEO_VERSION
 *  • GPS من المتصفح إن وافق الزبون، وإلا اختيار الولاية يدوياً (منسدل بمجموعات المحافظات)
 *  • الإغلاق بالإطار = تخطٍ لا يُعاد إلا بطلب صريح (زر «تغيير الموقع»)
 *  • الموقع يُحفظ في متصفح الزبون فقط (zustand persist) ولا يُرسل لأي جهة
 *    — إحداثيات تُرسل للخادم فقط كمعاملات GET لحظية لجلب النتائج القريبة.
 */

/** مهلة فتح نافذة الموقع بعد استقرار الصفحة (بعد نافذة الاهتمامات) */
const AUTO_OPEN_DELAY = 2800
/** محاولات انتظار انغلاق نافذة الاهتمامات قبل فتح نافذة الموقع */
const WAIT_INTERVAL = 1500
const MAX_WAITS = 4

export function GeoPrompt() {
  const lang = useXmix((s) => s.lang)
  const open = useXmix((s) => s.geoPromptOpen)
  const closeGeoPrompt = useXmix((s) => s.closeGeoPrompt)
  const skipGeoPrompt = useXmix((s) => s.skipGeoPrompt)
  const setGeoLocation = useXmix((s) => s.setGeoLocation)
  const hasGeo = useXmix((s) => !!s.geo)
  const g = t.geo

  const [step, setStep] = useState<'ask' | 'manual'>('ask')
  const [detecting, setDetecting] = useState(false)
  const [cityKey, setCityKey] = useState('')

  // أول زيارة: افتح النافذة تلقائياً مرة واحدة — بانتظار نافذة الاهتمامات إن كانت مفتوحة
  useEffect(() => {
    const timer = setTimeout(() => {
      const s = useXmix.getState()
      if (s.geoVersion !== GEO_VERSION && !s.geo) {
        if (s.interestsModalOpen) {
          let waits = 0
          const iv = setInterval(() => {
            waits++
            const st = useXmix.getState()
            if (!st.interestsModalOpen || waits >= MAX_WAITS) {
              clearInterval(iv)
              if (useXmix.getState().geoVersion !== GEO_VERSION) st.openGeoPrompt()
            }
          }, WAIT_INTERVAL)
        } else {
          s.openGeoPrompt()
        }
      }
    }, AUTO_OPEN_DELAY)
    return () => clearTimeout(timer)
  }, [])

  // عند الفتح: من يملك موقعاً يُعرض له المختار مباشرة، والجديد يبدأ بالسؤال
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setStep(hasGeo ? 'manual' : 'ask')
      setDetecting(false)
    }
  }

  const pick = (area: Area) =>
    setGeoLocation({
      mode: 'city',
      lat: area.lat,
      lng: area.lng,
      cityKey: area.key,
      labelAr: area.ar,
      labelEn: area.en,
    })

  const useGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      toast({ title: g.gpsUnsupported[lang] })
      setStep('manual')
      return
    }
    setDetecting(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDetecting(false)
        const { latitude, longitude } = pos.coords
        if (!validCoords(latitude, longitude)) {
          toast({ title: g.gpsDenied[lang] })
          setStep('manual')
          return
        }
        const near = findNearestArea(latitude, longitude)
        const area = near?.area
        setGeoLocation({
          mode: 'gps',
          lat: latitude,
          lng: longitude,
          cityKey: area?.key ?? '',
          labelAr: area ? area.ar : lang === 'ar' ? 'موقعك الحالي' : 'Your spot',
          labelEn: area ? area.en : 'Your spot',
        })
      },
      () => {
        setDetecting(false)
        toast({ title: g.gpsDenied[lang] })
        setStep('manual')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 600000 },
    )
  }

  const handleOpenChange = (v: boolean) => {
    if (v) return
    // الإغلاق بالإطار (X) يُحتسب تخطياً — لا تُزعج الزبون في كل زيارة
    if (useXmix.getState().geoVersion !== GEO_VERSION) skipGeoPrompt()
    else closeGeoPrompt()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-black">
            {step === 'manual' ? g.chooseArea[lang] : g.promptTitle[lang]}
          </DialogTitle>
        </DialogHeader>

        {step === 'ask' ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">{g.promptDesc[lang]}</p>
            <div className="grid gap-2">
              <Button
                onClick={useGps}
                disabled={detecting}
                className="rounded-xl font-bold gap-2 shadow-lg shadow-violet-900/30"
              >
                <Navigation size={16} />
                {detecting ? g.gpsDetecting[lang] : g.useGps[lang]}
              </Button>
              <Button variant="secondary" onClick={() => setStep('manual')} className="rounded-xl font-bold gap-2">
                <MapPin size={16} /> {g.chooseArea[lang]}
              </Button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
                {g.locationSetHint[lang]}
              </p>
              <Button variant="ghost" size="sm" onClick={skipGeoPrompt} className="rounded-lg shrink-0">
                {g.later[lang]}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <select
              value={cityKey}
              onChange={(e) => setCityKey(e.target.value)}
              aria-label={g.selectArea[lang]}
              className="w-full rounded-xl border border-border bg-secondary/60 px-3 py-2.5 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  const area = AREAS.find((a) => a.key === cityKey)
                  if (area) pick(area)
                }}
                disabled={!cityKey}
                className="rounded-xl font-bold shadow-md shadow-violet-900/30 flex-1"
              >
                <MapPin size={15} className="me-1" /> {g.setNow[lang]}
              </Button>
              {!hasGeo && (
                <Button variant="ghost" onClick={skipGeoPrompt} className="rounded-xl">
                  {g.later[lang]}
                </Button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
              {g.locationSetHint[lang]}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
