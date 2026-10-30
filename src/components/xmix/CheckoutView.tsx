'use client'

import { useEffect, useState } from 'react'
import { Banknote, Landmark, Lock, CheckCircle2 } from 'lucide-react'
import { useXmix, cartTotals, fmtPrice, reconcileCart } from '@/store/xmix'
import { t } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { motion } from 'framer-motion'
import { toast } from '@/hooks/use-toast'
const OMAN_CITIES_AR = ['مسقط', 'صلالة', 'نزوى', 'صحار', 'صور', 'الدقم', 'بركاء', 'الرستاق', 'إبراء', 'بهلاء']
const OMAN_CITIES_EN = ['Muscat', 'Salalah', 'Nizwa', 'Sohar', 'Sur', 'Duqm', 'Barka', 'Rustaq', 'Ibra', 'Bahla']

export function CheckoutView() {
  const lang = useXmix((s) => s.lang)
  const cart = useXmix((s) => s.cart)
  const user = useXmix((s) => s.user)
  const navigate = useXmix((s) => s.navigate)
  const clearCart = useXmix((s) => s.clearCart)
  const openAuth = useXmix((s) => s.openAuth)

  const [form, setForm] = useState({
    customerName: user?.name ?? '',
    phone: '',
    city: '',
    address: '',
    notes: '',
    paymentMethod: 'cod',
  })
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, boolean>>({})

  const { subtotal, shipping, total } = cartTotals(cart)
  const hasServices = cart.some((c) => c.kind === 'service')
  const cities = lang === 'ar' ? OMAN_CITIES_AR : OMAN_CITIES_EN

  // BUG-FIX (سلة قديمة): مزامنة الأسعار/الكميات/توفر الأصناف مع الخادم قبل الدفع
  // حتى لا يُحاسَب الزبون مبلغاً مختلفاً عمّا يراه في الملخص
  useEffect(() => {
    let alive = true
    void reconcileCart().then((changed) => {
      if (alive && changed)
        toast({ title: t.cart.synced[lang] })
    })
    return () => {
      alive = false
    }  }, [])

  // BUG-FIX (الطلب بلا حساب): بعد تسجيل الدخول من بوابة الدفع نفسها
  // نعبّئ الاسم تلقائياً من الحساب (ما كان يبقى فارغاً لأن الحالة
  // تهيأت قبل اكتمال الدخول)
  useEffect(() => {
    if (user && !form.customerName.trim()) {
      setForm((f) => ({ ...f, customerName: user.name }))
    }
  }, [user])

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 pb-24 text-center">
        <span className="text-6xl block mb-4">🛒</span>
        <p className="font-bold mb-6">{t.cart.empty[lang]}</p>
        <Button onClick={() => navigate({ name: 'shop' })} className="rounded-xl">{t.cart.browse[lang]}</Button>
      </div>
    )
  }

  // BUG-FIX (الطلب بلا حساب): صفحة الدفع كانت تسمح للضيوف بإتمام الطلب
  // كاملاً بلا حساب (ويُحفظ الطلب userId=null فلا يستطيع تتبعه). الآن:
  // الحساب إلزامي — بوابة واضحة بدل الحماية، وسلته محفوظة ولن يفقدها.
  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 pb-24 text-center">
        <span className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/15 border border-violet-500/30 mb-5">
          <Lock size={36} className="text-primary" />
        </span>
        <h1 className="text-xl font-black mb-2">{t.auth.accountRequired[lang]}</h1>
        <p className="text-sm text-muted-foreground mb-7 leading-relaxed">{t.auth.accountRequiredDesc[lang]}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button
            size="lg"
            onClick={() => openAuth('register', 'cart')}
            className="rounded-xl font-bold shadow-lg shadow-violet-900/30"
          >
            {t.auth.register[lang]}
          </Button>
          <Button size="lg" variant="secondary" onClick={() => openAuth('login', 'cart')} className="rounded-xl font-bold">
            {t.auth.login[lang]}
          </Button>
        </div>
      </div>
    )
  }

  const validate = () => {
    const e: Record<string, boolean> = {
      customerName: form.customerName.trim().length < 2,
      phone: !/^[+0-9\s-]{8,}$/.test(form.phone.trim()),
      city: !form.city,
      address: form.address.trim().length < 5,
    }
    setErrors(e)
    return !Object.values(e).some(Boolean)
  }

  const submit = async () => {
    if (!validate()) {
      toast({ title: lang === 'ar' ? 'يرجى إكمال البيانات المطلوبة' : 'Please complete the required fields', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          items: cart.map((c) => ({
            productId: c.productId,
            companyId: c.companyId,
            nameAr: c.nameAr,
            nameEn: c.nameEn,
            emoji: c.emoji,
            price: c.price,
            qty: c.qty,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        // BUG-FIX (انتهاء الجلسة): إذا انتهت الجلسة أثناء التسوق نفتح
        // نافذة الدخول فوراً بدل رسالة خطأ فقط
        if (res.status === 401) {
          openAuth('login', 'cart')
          toast({ title: t.auth.loginFirst[lang], variant: 'destructive' })
          return
        }
        throw new Error(data.error || 'error')
      }
      clearCart()
      navigate({ name: 'success', orderNumber: data.order.orderNumber })
    } catch (err) {
      // BUG-FIX: نعرض رسالة الخادم الحقيقية (مثال: الكمية المتوفرة، تغيّر المخزون)
      // بدل رسالة عمومية تخفي السبب عن الزبون — رسائل الخادم بلغتين «عربي | إنجليزي»
      // ونعرض لغة الواجهة الحالية فقط
      const raw = err instanceof Error && err.message && err.message !== 'error' ? err.message : null
      const serverMsg = raw ? (lang === 'ar' ? raw.split('|')[0].trim() : (raw.split('|')[1] ?? raw).trim()) : null
      toast({
        title: serverMsg ?? (lang === 'ar' ? 'تعذر إتمام الطلب، حاول مجدداً' : 'Could not place the order, try again'),
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const payments = [
    { key: 'cod', icon: Banknote, title: t.checkout.cod[lang], desc: t.checkout.codDesc[lang] },
    { key: 'bank', icon: Landmark, title: t.checkout.bank[lang], desc: t.checkout.bankDesc[lang] },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 pb-16">
      <h1 className="text-2xl font-black mb-6">{t.checkout.title[lang]}</h1>

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-5">
          {/* delivery info */}
          <div className="rounded-2xl border bg-card p-5 space-y-4">
            <h3 className="font-bold flex items-center gap-2">
              📍 {t.checkout.info[lang]}
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t.checkout.name[lang]} *</Label>
                <Input
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  className={`rounded-xl bg-secondary/60 ${errors.customerName ? 'border-rose-500' : ''}`}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t.checkout.phone[lang]} *</Label>
                <Input
                  dir="ltr"
                  placeholder="+968 9X XX XX XX"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={`rounded-xl bg-secondary/60 text-start ${errors.phone ? 'border-rose-500' : ''}`}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t.checkout.city[lang]} *</Label>
                <select
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className={`w-full h-10 rounded-xl border bg-secondary/60 px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring ${errors.city ? 'border-rose-500' : 'border-input'}`}
                >
                  <option value="">—</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>{t.checkout.address[lang]} *</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className={`rounded-xl bg-secondary/60 ${errors.address ? 'border-rose-500' : ''}`}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t.checkout.notes[lang]}</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="rounded-xl bg-secondary/60 resize-none"
              />
            </div>
          </div>

          {/* payment */}
          <div className="rounded-2xl border bg-card p-5 space-y-3">
            <h3 className="font-bold flex items-center gap-2">
              <Lock size={16} className="text-primary" /> {t.checkout.payment[lang]}
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {payments.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setForm({ ...form, paymentMethod: p.key })}
                  className={`rounded-xl border p-3.5 text-start transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    form.paymentMethod === p.key
                      ? 'border-primary bg-primary/10 ring-1 ring-primary'
                      : 'bg-secondary/40 hover:border-violet-500/40'
                  }`}
                >
                  <p.icon size={20} className={form.paymentMethod === p.key ? 'text-primary' : 'text-muted-foreground'} />
                  <p className="text-xs font-bold mt-2">{p.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* summary */}
        <div className="rounded-2xl border bg-card p-5 lg:sticky lg:top-24 space-y-4">
          <h3 className="font-bold">{t.checkout.summary[lang]}</h3>
          <div className="space-y-2 max-h-52 overflow-y-auto pe-1">
            {cart.map((c) => (
              <div key={c.productId} className="flex items-center gap-2.5 text-xs">
                <span
                  className="h-9 w-9 rounded-lg flex items-center justify-center text-lg shrink-0"
                  style={{ background: c.gradient }}
                  aria-hidden
                >
                  {c.emoji}
                </span>
                <span className="flex-1 truncate font-semibold">{lang === 'ar' ? c.nameAr : c.nameEn}</span>
                <span className="text-muted-foreground shrink-0">×{c.qty}</span>
                <span className="font-bold shrink-0">{fmtPrice(c.price * c.qty, lang)}</span>
              </div>
            ))}
          </div>
          <div className="border-t space-y-2 text-sm pt-3">
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
            {hasServices && (
              <p className="text-[11px] text-fuchsia-300/90 bg-fuchsia-500/10 rounded-lg px-3 py-2 leading-relaxed">
                {t.cart.servicesNoShipping[lang]}
              </p>
            )}
            <div className="border-t pt-2.5 flex justify-between text-base">
              <span className="font-bold">{t.cart.total[lang]}</span>
              <span className="font-black text-primary">{fmtPrice(total, lang)}</span>
            </div>
          </div>
          <Button size="lg" disabled={submitting} onClick={submit} className="w-full rounded-xl font-bold shadow-lg shadow-violet-900/30 gap-2">
            {submitting ? (
              <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            ) : (
              <CheckCircle2 size={18} />
            )}
            {t.checkout.place[lang]}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function SuccessView({ orderNumber }: { orderNumber: string }) {
  const lang = useXmix((s) => s.lang)
  const navigate = useXmix((s) => s.navigate)
  const user = useXmix((s) => s.user)

  return (
    <div className="mx-auto max-w-lg px-4 py-20 pb-24 text-center">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      >
        <span className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/40 mb-6">
          <CheckCircle2 size={52} className="text-emerald-400" />
        </span>
      </motion.div>
      <h1 className="text-2xl font-black mb-3">{t.success.title[lang]}</h1>
      <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{t.success.desc[lang]}</p>
      <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 px-6 py-4 inline-flex items-center gap-3 mb-8">
        <span className="text-xs font-bold text-violet-300">{t.success.orderNo[lang]}</span>
        <span className="font-black text-lg tracking-wider" dir="ltr">{orderNumber}</span>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {/* BUG-FIX: كان يُرسمان زران متطابقان للرئيسية للزوار غير المسجلين */}
        {user && (
          <Button
            size="lg"
            variant="secondary"
            onClick={() => navigate({ name: 'orders' })}
            className="rounded-xl font-bold"
          >
            {t.success.orders[lang]}
          </Button>
        )}
        <Button size="lg" onClick={() => navigate({ name: 'home' })} className="rounded-xl font-bold shadow-lg shadow-violet-900/30">
          {t.success.home[lang]}
        </Button>
      </div>
    </div>
  )
}
