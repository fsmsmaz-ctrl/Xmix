'use client'

import { useState } from 'react'
import { Phone, MapPin, Clock, Send } from 'lucide-react'
import { useXmix } from '@/store/xmix'
import { t } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'

export function ContactView() {
  const lang = useXmix((s) => s.lang)
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [sending, setSending] = useState(false)

  const submit = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast({
        title: lang === 'ar' ? 'يرجى تعبئة الحقول المطلوبة' : 'Please fill the required fields',
        variant: 'destructive',
      })
      return
    }
    setSending(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({ title: '✅ ' + t.contact.sent[lang] })
      setForm({ name: '', email: '', subject: '', message: '' })
    } catch {
      toast({
        title: lang === 'ar' ? 'تعذر الإرسال، حاول مجدداً' : 'Could not send, try again',
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  const info = [
    { icon: Phone, title: t.contact.phone[lang], value: '+968 2400 0000', ltr: true },
    { icon: MapPin, title: t.contact.address[lang], value: t.contact.addressVal[lang], ltr: false },
    { icon: Clock, title: t.contact.hours[lang], value: t.contact.hoursVal[lang], ltr: false },
  ]

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 pb-16">
      <div className="text-center mb-10">
        <h1 className="text-2xl sm:text-3xl font-black">{t.contact.title[lang]}</h1>
        <p className="text-sm text-muted-foreground mt-2">{t.contact.subtitle[lang]}</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6 items-start">
        {/* info cards */}
        <div className="lg:col-span-2 space-y-3">
          {info.map((i) => (
            <div key={i.title} className="xmix-card-hover rounded-2xl border bg-card p-4 flex items-start gap-3.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary shrink-0">
                <i.icon size={18} />
              </span>
              <div>
                <p className="text-xs font-bold text-muted-foreground">{i.title}</p>
                <p className="text-sm font-bold mt-0.5" dir={i.ltr ? 'ltr' : undefined}>
                  {i.value}
                </p>
              </div>
            </div>
          ))}
          <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-600/20 to-fuchsia-600/10 p-4">
            <p className="text-sm font-bold mb-1">🤝 {t.nav.join[lang]}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{t.sections.joinCtaDesc[lang]}</p>
          </div>
        </div>

        {/* form */}
        <div className="lg:col-span-3 rounded-2xl border bg-card p-5 sm:p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t.contact.name[lang]} *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl bg-secondary/60" />
            </div>
            <div className="space-y-1.5">
              <Label>{t.contact.email[lang]} *</Label>
              <Input
                dir="ltr"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="rounded-xl bg-secondary/60 text-start"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t.contact.subject[lang]}</Label>
            <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="rounded-xl bg-secondary/60" />
          </div>
          <div className="space-y-1.5">
            <Label>{t.contact.message[lang]} *</Label>
            <Textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={5}
              className="rounded-xl bg-secondary/60 resize-none"
            />
          </div>
          <Button onClick={submit} disabled={sending} size="lg" className="rounded-xl font-bold gap-2 shadow-lg shadow-violet-900/30 w-full sm:w-auto">
            {sending ? <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : <Send size={16} />}
            {t.contact.send[lang]}
          </Button>
        </div>
      </div>
    </div>
  )
}
