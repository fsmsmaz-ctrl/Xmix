'use client'

import { useEffect, useState } from 'react'
import { Check, Sparkles } from 'lucide-react'
import { useXmix, INTERESTS_VERSION } from '@/store/xmix'
import { t } from '@/lib/i18n'
import { CATEGORIES } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

/** مهلة قصيرة بعد فتح الموقع حتى تظهر نافذة الترحيب بهدوء بعد استقرار الصفحة */
const AUTO_OPEN_DELAY = 900

/**
 * نافذة اهتمامات الزبون:
 * - تظهر تلقائياً في أول زيارة (ولم تجب بعد أو تغيّر إصدار الخيارات)
 * - تعاد بعد أسبوعين بلطف عبر شريط «حدّث اهتماماتك» في الرئيسية
 * - يمكن فتحها في أي وقت من زر 🎯 في الشريط العلوي
 * الاختيارات تُحفظ في المتصفح وتُستخدم لعرض «مختارات لك» في الرئيسية.
 */
export function OnboardingModal() {
  const lang = useXmix((s) => s.lang)
  const open = useXmix((s) => s.interestsModalOpen)
  const saveInterests = useXmix((s) => s.saveInterests)
  const skipInterests = useXmix((s) => s.skipInterests)
  const closeInterests = useXmix((s) => s.closeInterests)
  const refreshStale = useXmix((s) => s.refreshStale)
  const o = t.onboarding

  const [picked, setPicked] = useState<string[]>([])

  // أول زيارة: افتح النافذة تلقائياً مرة واحدة (أو إذا تغيّر إصدار الخيارات)
  useEffect(() => {
    const timer = setTimeout(() => {
      const s = useXmix.getState()
      s.refreshStale()
      if (!s.interestsTouched || s.interestsVersion !== INTERESTS_VERSION) {
        s.openInterests()
      }
    }, AUTO_OPEN_DELAY)
    return () => clearTimeout(timer)
  }, [])

  // مزامنة الاختيارات مع المحفوظ كل مرة تُفتح فيها النافذة
  // (نمط ضبط الحالة أثناء الرندر المعتمد بدل useEffect)
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) setPicked(useXmix.getState().interests)
  }

  const toggle = (key: string) =>
    setPicked((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]))

  // إغلاق النافذة بالإطار (X) يُحتسب «تخطياً» حتى لا تُزعج الزبون في كل زيارة
  const handleOpenChange = (v: boolean) => {
    if (v) return
    if (!useXmix.getState().interestsTouched) skipInterests()
    else closeInterests()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent aria-describedby={undefined} className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card">
        <DialogHeader>
          <DialogTitle className="text-xl font-black flex items-center gap-2">
            <Sparkles size={20} className="text-primary" />
            {o.welcome[lang]}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground leading-relaxed -mt-1">{o.subtitle[lang]}</p>

        <div className="space-y-2.5">
          <p className="text-sm font-black">{o.pickField[lang]}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CATEGORIES.map((c) => {
              const active = picked.includes(c.key)
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => toggle(c.key)}
                  aria-pressed={active}
                  className={`relative rounded-xl border p-2.5 text-center transition-all ${
                    active
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/40'
                      : 'border-border hover:border-primary/50 hover:bg-secondary/40'
                  }`}
                >
                  {active && (
                    <span className="absolute top-1.5 end-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check size={11} strokeWidth={3} />
                    </span>
                  )}
                  <span className="block text-2xl" aria-hidden>{c.emoji}</span>
                  <span className="block text-[11px] font-bold leading-tight mt-1">
                    {lang === 'ar' ? c.ar : c.en}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={skipInterests} className="rounded-xl">
            {o.skip[lang]}
          </Button>
          <Button
            onClick={() => picked.length > 0 && saveInterests(picked)}
            disabled={picked.length === 0}
            className="rounded-xl font-bold min-w-36 shadow-lg shadow-violet-900/30"
          >
            {o.start[lang]}
          </Button>
        </div>
        {picked.length === 0 && (
          <p className="text-[11px] text-muted-foreground text-end">{o.minHint[lang]}</p>
        )}
      </DialogContent>
    </Dialog>
  )
}
