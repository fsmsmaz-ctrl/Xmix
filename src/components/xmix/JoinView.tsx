'use client'

import { useState } from 'react'
import { Store, ChartBar, Megaphone, LifeBuoy, PartyPopper } from 'lucide-react'
import { useXmix } from '@/store/xmix'
import { t } from '@/lib/i18n'
import { CATEGORIES } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'

export function JoinView() {
  const lang = useXmix((s) => s.lang)
  const [form, setForm] = useState({
    companyName: '', category: '', city: '', contactName: '', email: '', phone: '', description: '',
  })
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async () => {
    if (!form.companyName.trim() || !form.category || !form.city.trim() || !form.contactName.trim() || !form.email.trim() || !form.phone.trim()) {
      toast({
        title: lang === 'ar' ? 'يرجى تعبئة الحقول المطلوبة' : 'Please fill the required fields',
        variant: 'destructive',
      })
      return
    }
    setSending(true)
    try {
      const res = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDone(true)
    } catch {
      toast({
        title: lang === 'ar' ? 'تعذر إرسال الطلب، حاول مجدداً' : 'Could not submit, try again',
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  const benefits = [
    { icon: Store, text: t.join.b1[lang] },
    { icon: ChartBar, text: t.join.b2[lang] },
    { icon: Megaphone, text: t.join.b3[lang] },
    { icon: LifeBuoy, text: t.join.b4[lang] },
  ]

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 pb-24 text-center">
        <span className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/40 mb-6 text-5xl">
          <PartyPopper className="text-emerald-400" size={44} />
        </span>
        <h1 className="text-2xl font-black mb-3">{t.join.sent[lang]}</h1>
        <p className="text-sm text-muted-foreground">
          {lang === 'ar' ? 'شكراً لاهتمامك — فريق الشراكات في Xmix يراجع طلبك الآن.' : 'Thank you for your interest — the Xmix partnerships team is reviewing your request.'}
        </p>
        <Button variant="secondary" className="mt-8 rounded-xl font-bold" onClick={() => setDone(false)}>
          {t.nav.home[lang] === 'Home' ? 'Submit another' : 'إرسال طلب آخر'}
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 pb-16">
      <div className="text-center mb-10">
        <h1 className="text-2xl sm:text-3xl font-black">{t.join.title[lang]}</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-xl mx-auto">{t.join.subtitle[lang]}</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6 items-start">
        {/* benefits */}
        <div className="lg:col-span-2 rounded-3xl border border-violet-500/30 p-5 sm:p-6 space-y-4"
          style={{ background: 'linear-gradient(160deg, rgba(124,58,237,0.16), rgba(162,28,175,0.08))' }}
        >
          <h3 className="font-bold">{t.join.benefitsTitle[lang]}</h3>
          {benefits.map((b) => (
            <div key={b.text} className="flex items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20 text-primary shrink-0">
                <b.icon size={17} />
              </span>
              <p className="text-sm leading-relaxed text-muted-foreground">{b.text}</p>
            </div>
          ))}
          <div className="rounded-xl bg-black/25 p-4 text-center">
            <p className="text-xs text-violet-200/90 leading-relaxed">
              {lang === 'ar'
                ? 'انضم اليوم إلى قت عمان ورفوف الشركات الأخرى داخل Xmix'
                : 'Join Qat Oman and other company shelves inside Xmix today'}
            </p>
          </div>
        </div>

        {/* form */}
        <div className="lg:col-span-3 rounded-2xl border bg-card p-5 sm:p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t.join.companyName[lang]} *</Label>
              <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} className="rounded-xl bg-secondary/60" />
            </div>
            <div className="space-y-1.5">
              <Label>{t.join.category[lang]} *</Label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full h-10 rounded-xl border border-input bg-secondary/60 px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">—</option>
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>{lang === 'ar' ? c.ar : c.en}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>{t.join.city[lang]} *</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="rounded-xl bg-secondary/60" />
            </div>
            <div className="space-y-1.5">
              <Label>{t.join.contactName[lang]} *</Label>
              <Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} className="rounded-xl bg-secondary/60" />
            </div>
            <div className="space-y-1.5">
              <Label>{t.join.email[lang]} *</Label>
              <Input
                dir="ltr" type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="rounded-xl bg-secondary/60 text-start"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t.join.phone[lang]} *</Label>
              <Input
                dir="ltr" placeholder="+968 …"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="rounded-xl bg-secondary/60 text-start"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t.join.description[lang]}</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              className="rounded-xl bg-secondary/60 resize-none"
            />
          </div>
          <Button onClick={submit} disabled={sending} size="lg" className="rounded-xl font-bold gap-2 shadow-lg shadow-violet-900/30 w-full">
            {sending ? <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : <Store size={17} />}
            {t.join.submit[lang]}
          </Button>
        </div>
      </div>
    </div>
  )
}
