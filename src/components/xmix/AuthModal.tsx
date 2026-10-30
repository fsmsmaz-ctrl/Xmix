'use client'

import { useEffect, useState } from 'react'
import { LogIn, UserPlus, X } from 'lucide-react'
import { useXmix } from '@/store/xmix'
import { t } from '@/lib/i18n'
import { Logo } from '@/components/xmix/Logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'

export function AuthModal() {
  const lang = useXmix((s) => s.lang)
  const authOpen = useXmix((s) => s.authOpen)
  const authMode = useXmix((s) => s.authMode)
  const authReason = useXmix((s) => s.authReason)
  const closeAuth = useXmix((s) => s.closeAuth)
  const openAuth = useXmix((s) => s.openAuth)
  const setUser = useXmix((s) => s.setUser)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (authOpen) { setError('') }
  }, [authOpen, authMode])

  if (!authOpen) return null

  const submit = async () => {
    setError('')
    if (authMode === 'register' && name.trim().length < 2) {
      setError(lang === 'ar' ? 'أدخل اسمك الكامل' : 'Enter your full name')
      return
    }
    if (!email.trim() || password.length < 6) {
      setError(lang === 'ar' ? 'تحقق من البريد وكلمة المرور (6+ أحرف)' : 'Check email and password (6+ chars)')
      return
    }
    setBusy(true)
    try {
      const res = await fetch(authMode === 'login' ? '/api/auth/login' : '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authMode === 'login' ? { email, password } : { name, email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        const msg: string = data.error || 'error'
        const [arPart] = msg.split('|')
        setError(lang === 'ar' ? arPart.trim() : (msg.split('|')[1] ?? msg).trim())
        return
      }
      setUser(data.user)
      toast({ title: '✅ ' + (authMode === 'login' ? t.auth.loggedIn[lang] : t.auth.registered[lang]) })
      closeAuth()
      setName(''); setEmail(''); setPassword('')
    } catch {
      setError(lang === 'ar' ? 'حدث خطأ، حاول مجدداً' : 'Something went wrong, try again')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={closeAuth}
      role="dialog"
      aria-modal="true"
      aria-label={authMode === 'login' ? t.auth.login[lang] : t.auth.register[lang]}
    >
      <div
        className="w-full max-w-md rounded-3xl border bg-card p-6 sm:p-7 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={closeAuth}
          className="absolute end-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X size={19} />
        </button>

        <div className="text-center mb-5">
          <span className="relative inline-flex items-center justify-center mb-3">
            <span className="absolute h-16 w-16 rounded-3xl bg-violet-500/25 blur-lg" />
            <Logo size={56} className="relative rounded-2xl" priority />
          </span>
          <h2 className="text-lg font-black">{t.auth.welcome[lang]}</h2>
        </div>

        {/* BUG-FIX (الطلب بلا حساب): سبب فتح النافذة — بدل نافذة دخول صامتة
            يجهل الزبون لماذا ظهرت، نوضح: الحساب مطلوب لإضافة الغرض للسلة/الإتمام */}
        {authReason === 'cart' && (
          <p className="mb-5 text-xs font-semibold leading-relaxed text-violet-200 bg-violet-500/10 border border-violet-500/30 rounded-xl px-3.5 py-2.5 text-start">
            {t.auth.reasonCart[lang]}
          </p>
        )}

        {/* tabs */}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-secondary/60 p-1 mb-5">
          <button
            onClick={() => openAuth('login')}
            className={`py-2 rounded-lg text-sm font-bold transition-colors ${
              authMode === 'login' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground'
            }`}
          >
            {t.auth.login[lang]}
          </button>
          <button
            onClick={() => openAuth('register')}
            className={`py-2 rounded-lg text-sm font-bold transition-colors ${
              authMode === 'register' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground'
            }`}
          >
            {t.auth.register[lang]}
          </button>
        </div>

        <div className="space-y-4">
          {authMode === 'register' && (
            <div className="space-y-1.5">
              <Label>{t.auth.name[lang]}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl bg-secondary/60" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>{t.auth.email[lang]}</Label>
            <Input
              dir="ltr" type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl bg-secondary/60 text-start"
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t.auth.password[lang]}</Label>
            <Input
              dir="ltr" type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              className="rounded-xl bg-secondary/60 text-start"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/25 rounded-xl px-3 py-2.5">
              ⚠️ {error}
            </p>
          )}

          <Button onClick={submit} disabled={busy} className="w-full rounded-xl font-bold gap-2 h-11 shadow-lg shadow-violet-900/30">
            {busy ? (
              <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            ) : authMode === 'login' ? (
              <LogIn size={16} />
            ) : (
              <UserPlus size={16} />
            )}
            {authMode === 'login' ? t.auth.login[lang] : t.auth.register[lang]}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            {authMode === 'login' ? t.auth.noAccount[lang] : t.auth.haveAccount[lang]}{' '}
            <button
              onClick={() => openAuth(authMode === 'login' ? 'register' : 'login')}
              className="text-primary font-bold hover:underline"
            >
              {authMode === 'login' ? t.auth.register[lang] : t.auth.login[lang]}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
