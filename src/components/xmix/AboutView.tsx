'use client'

import { Target, HeartHandshake, Sparkles, Flag } from 'lucide-react'
import { useXmix } from '@/store/xmix'
import { t } from '@/lib/i18n'
import { Button } from '@/components/ui/button'

export function AboutView() {
  const lang = useXmix((s) => s.lang)
  const navigate = useXmix((s) => s.navigate)

  const values = [
    { icon: Target, text: t.about.v1[lang] },
    { icon: HeartHandshake, text: t.about.v2[lang] },
    { icon: Sparkles, text: t.about.v3[lang] },
    { icon: Flag, text: t.about.v4[lang] },
  ]

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10 pb-16">
      <div className="text-center mb-10">
        <h1 className="text-2xl sm:text-3xl font-black mb-3">{t.about.title[lang]}</h1>
        <p className="text-sm sm:text-base text-violet-300 font-semibold">{t.about.lead[lang]}</p>
      </div>

      <div className="rounded-3xl border bg-card p-6 sm:p-8 space-y-5">
        <p className="text-sm sm:text-[15px] leading-8 text-muted-foreground">{t.about.p1[lang]}</p>
        <p className="text-sm sm:text-[15px] leading-8 text-muted-foreground">{t.about.p2[lang]}</p>
        <p className="text-sm sm:text-[15px] leading-8 text-muted-foreground">{t.about.p3[lang]}</p>
      </div>

      <h2 className="text-lg font-bold mt-10 mb-4">{t.about.values[lang]}</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        {values.map((v) => (
          <div key={v.text} className="xmix-card-hover rounded-2xl border bg-card p-5 flex items-start gap-3.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary shrink-0">
              <v.icon size={19} />
            </span>
            <p className="text-sm leading-relaxed text-muted-foreground">{v.text}</p>
          </div>
        ))}
      </div>

      <div
        className="mt-10 rounded-3xl p-8 text-center border border-violet-500/30"
        style={{ background: 'linear-gradient(135deg,#3B0764 0%,#6D28D9 100%)' }}
      >
        <h3 className="text-xl font-black text-white mb-2">{t.sections.joinCta[lang]}</h3>
        <p className="text-sm text-white/75 mb-5">{t.sections.joinCtaDesc[lang]}</p>
        <Button
          onClick={() => navigate({ name: 'join' })}
          className="rounded-xl font-bold bg-white text-violet-800 hover:bg-violet-50"
        >
          {t.nav.join[lang]}
        </Button>
      </div>
    </div>
  )
}
