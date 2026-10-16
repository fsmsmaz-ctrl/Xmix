'use client'

import { useEffect, useState } from 'react'
import { Package } from 'lucide-react'
import { useXmix, fmtPrice } from '@/store/xmix'
import { t } from '@/lib/i18n'
import type { OrderData } from './types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingBlock } from './shared'

export function OrdersView() {
  const lang = useXmix((s) => s.lang)
  const user = useXmix((s) => s.user)
  const openAuth = useXmix((s) => s.openAuth)
  const navigate = useXmix((s) => s.navigate)
  const [orders, setOrders] = useState<OrderData[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    const run = async () => {
      try {
        const r = await fetch('/api/orders')
        if (!r.ok) throw new Error('failed')
        const d = await r.json()
        if (!cancelled) {
          setOrders(d.orders ?? [])
          setError(false)
        }
      } catch {
        if (!cancelled) setError(true)
      }
    }
    run()
    return () => { cancelled = true }
  }, [user])

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 pb-24 text-center">
        <span className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/15 border border-violet-500/30 mb-5">
          <Package size={36} className="text-primary" />
        </span>
        <h1 className="text-xl font-black mb-2">{t.nav.orders[lang]}</h1>
        <p className="text-sm text-muted-foreground mb-6">{t.auth.loginFirst[lang]}</p>
        <Button size="lg" onClick={() => openAuth('login')} className="rounded-xl font-bold shadow-lg shadow-violet-900/30">
          {t.auth.login[lang]}
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 pb-16">
      <h1 className="text-2xl font-black mb-6">{t.orders.title[lang]}</h1>

      {error ? (
        <div className="rounded-2xl border bg-card p-10 text-center text-muted-foreground text-sm">
          ⚠️ {t.misc.errorLoad[lang]}
        </div>
      ) : orders === null ? (
        <LoadingBlock label={t.misc.loading[lang]} />
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center space-y-3">
          <span className="text-5xl block">📭</span>
          <p className="font-bold">{t.orders.empty[lang]}</p>
          <p className="text-sm text-muted-foreground">{t.orders.emptyDesc[lang]}</p>
          <Button variant="secondary" className="rounded-xl mt-2" onClick={() => navigate({ name: 'shop' })}>
            {t.misc.goShop[lang]}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="rounded-2xl border bg-card p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <p className="font-black tracking-wide" dir="ltr">{o.orderNumber}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t.orders.date[lang]}: {new Date(o.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-OM' : 'en-GB', { dateStyle: 'medium' })}
                  </p>
                </div>
                <Badge className="bg-amber-400/15 text-amber-300 border border-amber-400/30 rounded-full font-bold">
                  {t.orders.statusPending[lang]}
                </Badge>
              </div>
              <div className="space-y-2 mb-4">
                {o.items.map((it) => (
                  <div key={it.id} className="flex items-center gap-3 text-sm">
                    <span
                      className="h-10 w-10 rounded-lg flex items-center justify-center text-xl shrink-0"
                      style={{ background: 'rgba(139,92,246,0.15)' }}
                      aria-hidden
                    >
                      {it.emoji}
                    </span>
                    <span className="flex-1 truncate font-semibold">
                      {lang === 'ar' ? it.nameAr : it.nameEn}
                      {it.companyEn ? (
                        <span className="text-[10px] text-violet-300/80 block">
                          {t.misc.byCompany[lang]}: {lang === 'ar' ? it.companyAr : it.companyEn}
                        </span>
                      ) : null}
                    </span>
                    <span className="text-muted-foreground text-xs shrink-0">×{it.qty}</span>
                    <span className="font-bold shrink-0">{fmtPrice(it.price * it.qty, lang)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-3 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t.cart.total[lang]}</span>
                <span className="font-black text-primary">{fmtPrice(o.total, lang)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
