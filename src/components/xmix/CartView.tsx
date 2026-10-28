'use client'

import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'
import { cartTotals, fmtPrice, FREE_SHIPPING_THRESHOLD, useXmix } from '@/store/xmix'
import { t } from '@/lib/i18n'
import { Button } from '@/components/ui/button'

export function CartView() {
  const lang = useXmix((s) => s.lang)
  const cart = useXmix((s) => s.cart)
  const setQty = useXmix((s) => s.setQty)
  const removeFromCart = useXmix((s) => s.removeFromCart)
  const clearCart = useXmix((s) => s.clearCart)
  const navigate = useXmix((s) => s.navigate)

  const { subtotal, shipping, total } = cartTotals(cart)
  // «أضف للتوصيل المجاني» يُحسب على قيمة البضائع فقط (الخدمات لا تُشحن)
  const goodsSubtotal = cart.reduce(
    (s, c) => (c.kind === 'service' ? s : s + c.price * c.qty),
    0,
  )
  const remain = goodsSubtotal > 0 ? FREE_SHIPPING_THRESHOLD - goodsSubtotal : 0
  const hasServices = cart.some((c) => c.kind === 'service')

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 pb-24 text-center">
        <span className="text-7xl block mb-4">🛒</span>
        <h1 className="text-xl font-black mb-2">{t.cart.empty[lang]}</h1>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">{t.cart.emptyDesc[lang]}</p>
        <Button size="lg" onClick={() => navigate({ name: 'shop' })} className="rounded-xl font-bold shadow-lg shadow-violet-900/30">
          {t.cart.browse[lang]}
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 pb-16">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black flex items-center gap-2.5">
          <ShoppingBag className="text-primary" /> {t.cart.title[lang]}
          <span className="text-sm font-bold text-muted-foreground">
            ({cart.reduce((n, c) => n + c.qty, 0)} {t.cart.items[lang]})
          </span>
        </h1>
        <Button variant="ghost" size="sm" onClick={clearCart} className="gap-1 text-rose-400 hover:text-rose-300 rounded-lg">
          <Trash2 size={14} /> {t.cart.clear[lang]}
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        {/* items */}
        <div className="lg:col-span-2 space-y-3">
          {cart.map((item) => (
            <div key={item.productId} className="rounded-2xl border bg-card p-3.5 flex gap-3.5 items-center">
              <button
                onClick={() => navigate({ name: 'product', id: item.productId })}
                className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl shrink-0 flex items-center justify-center text-4xl sm:text-5xl"
                style={{ background: item.gradient }}
                aria-hidden
              >
                {item.emoji}
              </button>
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => navigate({ name: 'product', id: item.productId })}
                  className="font-bold text-sm leading-snug line-clamp-1 hover:text-primary transition-colors text-start"
                >
                  {lang === 'ar' ? item.nameAr : item.nameEn}
                </button>
                <p className="text-[11px] text-violet-300/90 mt-0.5">
                  {t.misc.byCompany[lang]}: {lang === 'ar' ? item.companyAr || '—' : item.companyEn || '—'}
                </p>
                <p className="text-sm font-extrabold text-primary mt-1">
                  {fmtPrice(item.price, lang)}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center rounded-lg border bg-secondary/50">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setQty(item.productId, item.qty - 1)} aria-label="minus">
                      <Minus size={13} />
                    </Button>
                    <span className="w-8 text-center text-sm font-bold">{item.qty}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setQty(item.productId, item.qty + 1)} aria-label="plus" disabled={item.qty >= item.stock}>
                      <Plus size={13} />
                    </Button>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.productId)}
                    className="text-xs text-muted-foreground hover:text-rose-400 transition-colors flex items-center gap-1"
                  >
                    <Trash2 size={13} /> {t.cart.remove[lang]}
                  </button>
                </div>
              </div>
              <p className="font-extrabold text-sm sm:text-base shrink-0 hidden sm:block">
                {fmtPrice(item.price * item.qty, lang)}
              </p>
            </div>
          ))}
        </div>

        {/* summary */}
        <div className="rounded-2xl border bg-card p-5 lg:sticky lg:top-24 space-y-4">
          <h3 className="font-bold">{t.checkout.summary[lang]}</h3>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.cart.subtotal[lang]}</span>
              <span className="font-bold">{fmtPrice(subtotal, lang)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.cart.shipping[lang]}</span>
              <span className={`font-bold ${shipping === 0 ? 'text-emerald-400' : ''}`}>
                {shipping === 0 ? t.cart.free[lang] : fmtPrice(shipping, lang)}
              </span>
            </div>
            {remain > 0 && (
              <p className="text-[11px] text-amber-400 bg-amber-400/10 rounded-lg px-3 py-2 leading-relaxed">
                🚚 {t.cart.remainFree[lang].replace('{x}', fmtPrice(remain, lang))}
              </p>
            )}
            {hasServices && (
              <p className="text-[11px] text-fuchsia-300/90 bg-fuchsia-500/10 rounded-lg px-3 py-2 leading-relaxed">
                {t.cart.servicesNoShipping[lang]}
              </p>
            )}
            <div className="border-t pt-3 flex justify-between text-base">
              <span className="font-bold">{t.cart.total[lang]}</span>
              <span className="font-black text-primary">{fmtPrice(total, lang)}</span>
            </div>
          </div>
          <Button
            size="lg"
            className="w-full rounded-xl font-bold shadow-lg shadow-violet-900/30"
            onClick={() => navigate({ name: 'checkout' })}
          >
            {t.cart.checkout[lang]}
          </Button>
        </div>
      </div>
    </div>
  )
}
