'use client'

import { useState } from 'react'
import { Search, ShoppingCart, Globe, Menu, LogOut, Package, UserRound, LayoutDashboard, ShieldCheck, Target } from 'lucide-react'
import { useXmix } from '@/store/xmix'
import { t } from '@/lib/i18n'
import { Logo } from '@/components/xmix/Logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from '@/hooks/use-toast'

export function Header() {
  const lang = useXmix((s) => s.lang)
  const setLang = useXmix((s) => s.setLang)
  const view = useXmix((s) => s.view)
  const navigate = useXmix((s) => s.navigate)
  const cart = useXmix((s) => s.cart)
  const user = useXmix((s) => s.user)
  const setUser = useXmix((s) => s.setUser)
  const openAuth = useXmix((s) => s.openAuth)
  const openInterests = useXmix((s) => s.openInterests)
  const setShopFilters = useXmix((s) => s.setShopFilters)

  const [q, setQ] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems: { label: string; active: boolean; go: () => void }[] = [
    { label: t.nav.home[lang], active: view.name === 'home', go: () => navigate({ name: 'home' }) },
    { label: t.nav.shop[lang], active: view.name === 'shop', go: () => navigate({ name: 'shop' }) },
    { label: t.nav.companies[lang], active: view.name === 'companies' || view.name === 'company', go: () => navigate({ name: 'companies' }) },
    { label: t.nav.about[lang], active: view.name === 'about', go: () => navigate({ name: 'about' }) },
    { label: t.nav.contact[lang], active: view.name === 'contact', go: () => navigate({ name: 'contact' }) },
  ]

  const doSearch = () => {
    setShopFilters({ q, company: '', category: '' })
    navigate({ name: 'shop' })
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch { /* ignore */ }
    setUser(null)
    toast({ title: t.auth.loggedOut[lang] })
    navigate({ name: 'home' })
  }

  const cartCount = cart.reduce((n, c) => n + c.qty, 0)

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/85 backdrop-blur-lg">
      <div className="mx-auto max-w-7xl px-3 sm:px-6">
        <div className="flex h-16 items-center gap-2 sm:gap-4">
          {/* logo */}
          <button
            onClick={() => navigate({ name: 'home' })}
            className="group flex items-center gap-2.5 shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
            aria-label="Xmix home"
          >
            <span className="relative flex items-center justify-center">
              <span className="absolute inset-0 rounded-2xl bg-violet-500/25 blur-md scale-75 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <Logo size={40} className="relative rounded-xl transition-transform duration-300 group-hover:scale-105" priority />
            </span>
            <span className="text-lg font-extrabold xmix-gradient-text hidden sm:inline">Xmix</span>
          </button>

          {/* desktop nav */}
          <nav className="hidden lg:flex items-center gap-1 ms-2" aria-label="Main">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={item.go}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  item.active
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* search */}
          <div className="flex-1 max-w-md ms-auto hidden md:block">
            <div className="relative">
              <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && doSearch()}
                placeholder={t.hero.searchPlaceholder[lang]}
                className="ps-9 h-10 bg-secondary/60 border-border rounded-xl text-sm"
                aria-label={t.hero.searchPlaceholder[lang]}
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 ms-auto md:ms-0">
            {/* interests — reopen the onboarding/picks preferences anytime */}
            <Button
              variant="ghost"
              size="icon"
              onClick={openInterests}
              className="rounded-xl"
              aria-label={t.onboarding.interestsButton[lang]}
              title={t.onboarding.interestsButton[lang]}
            >
              <Target size={18} />
            </Button>

            {/* language */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="gap-1.5 text-sm font-bold rounded-xl"
              aria-label="Switch language"
            >
              <Globe size={16} />
              {t.misc.langName[lang]}
            </Button>

            {/* cart */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate({ name: 'cart' })}
              className="relative rounded-xl"
              aria-label={t.cart.title[lang]}
            >
              <ShoppingCart size={19} />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -end-0.5 h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Button>

            {/* user */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 rounded-xl max-w-36">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-primary">
                      <UserRound size={15} />
                    </span>
                    <span className="truncate text-sm font-semibold hidden sm:inline">{user.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel className="truncate">{user.name}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {user.role === 'owner' && (
                    <DropdownMenuItem onClick={() => navigate({ name: 'dashboard' })} className="gap-2">
                      <LayoutDashboard size={15} /> {t.dash.title[lang]}
                    </DropdownMenuItem>
                  )}
                  {user.role === 'admin' && (
                    <DropdownMenuItem onClick={() => navigate({ name: 'admin' })} className="gap-2 text-violet-300">
                      <ShieldCheck size={15} /> {t.sys.title[lang]}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => navigate({ name: 'orders' })} className="gap-2">
                    <Package size={15} /> {t.nav.orders[lang]}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout} className="gap-2 text-rose-400">
                    <LogOut size={15} /> {t.auth.logout[lang]}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                size="sm"
                onClick={() => openAuth('login')}
                className="rounded-xl font-bold shadow-md shadow-violet-900/30 hidden sm:inline-flex"
              >
                {t.auth.login[lang]}
              </Button>
            )}

            {/* mobile menu */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden rounded-xl"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Menu"
            >
              <Menu size={20} />
            </Button>
          </div>
        </div>

        {/* mobile panel */}
        {mobileOpen && (
          <div className="lg:hidden pb-4 border-t mt-0 pt-3 space-y-2">
            <div className="relative md:hidden mb-3">
              <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { doSearch(); setMobileOpen(false) }
                }}
                placeholder={t.hero.searchPlaceholder[lang]}
                className="ps-9 bg-secondary/60 rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => { item.go(); setMobileOpen(false) }}
                  className={`px-3 py-2.5 rounded-xl text-sm font-semibold text-start ${
                    item.active ? 'text-primary bg-primary/10' : 'bg-secondary/60'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {!user && (
              <Button
                onClick={() => { openAuth('login'); setMobileOpen(false) }}
                className="w-full rounded-xl font-bold"
              >
                {t.auth.login[lang]}
              </Button>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
