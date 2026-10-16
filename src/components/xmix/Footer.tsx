'use client'

import { MapPin, Phone, Mail, Download } from 'lucide-react'
import { useXmix } from '@/store/xmix'
import { t } from '@/lib/i18n'
import { Logo } from '@/components/xmix/Logo'
import type { Company } from '@/lib/types'

export function Footer({ companies }: { companies: Company[] }) {
  const lang = useXmix((s) => s.lang)
  const navigate = useXmix((s) => s.navigate)
  const year = new Date().getFullYear()

  const quick = [
    { label: t.nav.home[lang], go: () => navigate({ name: 'home' }) },
    { label: t.nav.shop[lang], go: () => navigate({ name: 'shop' }) },
    { label: t.nav.companies[lang], go: () => navigate({ name: 'companies' }) },
    { label: t.nav.about[lang], go: () => navigate({ name: 'about' }) },
    { label: t.nav.join[lang], go: () => navigate({ name: 'join' }) },
    { label: t.nav.contact[lang], go: () => navigate({ name: 'contact' }) },
  ]

  return (
    <footer className="mt-auto border-t bg-[#0a0812]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <Logo size={42} className="rounded-xl" />
              <span className="text-lg font-extrabold xmix-gradient-text">Xmix</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{t.footer.about[lang]}</p>
            <p className="text-xs text-violet-300/80 flex items-center gap-1.5">
              🇴🇲 {t.footer.madeIn[lang]}
            </p>
          </div>

          {/* quick links */}
          <div>
            <h4 className="font-bold text-sm mb-3">{t.footer.links[lang]}</h4>
            <ul className="space-y-2">
              {quick.map((q) => (
                <li key={q.label}>
                  <button
                    onClick={q.go}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {q.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* shelves */}
          <div>
            <h4 className="font-bold text-sm mb-3">{t.footer.shelves[lang]}</h4>
            <ul className="space-y-2">
              {companies.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => navigate({ name: 'company', slug: c.slug })}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                  >
                    <span aria-hidden>{c.emoji}</span>
                    {lang === 'ar' ? c.nameAr : c.nameEn}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* contact */}
          <div>
            <h4 className="font-bold text-sm mb-3">{t.footer.contactUs[lang]}</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Phone size={14} className="text-primary shrink-0" />
                <span dir="ltr">+968 2400 0000</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={14} className="text-primary shrink-0" />
                <span dir="ltr">care@xmix.om</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin size={14} className="text-primary shrink-0" />
                {lang === 'ar' ? 'مسقط، سلطنة عُمان' : 'Muscat, Oman'}
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-5 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            © {year} Xmix — {t.footer.rights[lang]}
          </p>
          <a
            href="/download"
            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-bold text-violet-300 transition hover:border-violet-500/60 hover:bg-violet-500/20"
          >
            <Download size={13} />
            {lang === 'ar' ? 'تحميل ملفات الموقع' : 'Download site files'}
          </a>
          <p className="text-xs text-muted-foreground">
            {lang === 'ar' ? 'شركة أم مسجّلة بسلطنة عُمان' : 'A parent company registered in Oman'}
          </p>
        </div>
      </div>
    </footer>
  )
}
