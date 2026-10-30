'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ShieldCheck, Users, Store, Package, ShoppingCart, Wallet,
  UserPlus, LogIn, Inbox, AlertTriangle, Search, Ban, BadgeCheck,
} from 'lucide-react'
import { useXmix } from '@/store/xmix'
import { t } from '@/lib/i18n'
import type { Lang, SystemJoinRequest, SystemOverview, SystemUser } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/hooks/use-toast'
import {
  GrantDialog, CompaniesTab, RequestsTab, OrdersTab,
} from './admin-parts'

type Tab = 'overview' | 'accounts' | 'companies' | 'requests' | 'orders'

export function AdminView() {
  const lang = useXmix((s) => s.lang)
  const user = useXmix((s) => s.user)
  const openAuth = useXmix((s) => s.openAuth)
  const s = t.sys

  const [tab, setTab] = useState<Tab>('overview')
  const [overview, setOverview] = useState<SystemOverview | null>(null)
  const [users, setUsers] = useState<SystemUser[]>([])
  const [requests, setRequests] = useState<SystemJoinRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')

  // grant-merchant dialog state
  const [grantFor, setGrantFor] = useState<SystemUser | null>(null)

  const isAdmin = user?.role === 'admin'

  // NOTE: hooks must run unconditionally — this useMemo lives above the
  // !isAdmin early-return guard (fixes react-hooks/rules-of-hooks).
  const filteredUsers = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return users
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(needle) ||
        u.email.toLowerCase().includes(needle) ||
        u.company?.nameAr.includes(needle) ||
        u.company?.nameEn.toLowerCase().includes(needle)
    )
  }, [users, q])

  const reload = useCallback(async () => {
    if (!isAdmin) return
    setLoading(true)
    try {
      const [oRes, uRes, rRes] = await Promise.all([
        fetch('/api/system/overview'),
        fetch('/api/system/users'),
        fetch('/api/system/join-requests'),
      ])
      // BUG-FIX (فشل صامت): 401/500 كانت تبدو لوحة فارغة بلا رسالة —
      // (مثال: انتهاء الجلسة). الآن يظهر خطأ الخادم بوضوح.
      if (!oRes.ok || !uRes.ok || !rRes.ok) {
        const j = await oRes.json().catch(() => null)
        throw new Error(j?.error || 'failed')
      }
      const [oData, uData, rData] = await Promise.all([oRes.json(), uRes.json(), rRes.json()])
      if (oData.overview) setOverview(oData.overview)
      if (uData.users) setUsers(uData.users)
      if (rData.requests) setRequests(rData.requests)
    } catch (e) {
      toast({
        title: e instanceof Error && e.message && e.message !== 'failed' ? e.message : t.misc.errorLoad[lang],
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [isAdmin, lang])

  useEffect(() => {
    if (isAdmin) void reload()
  }, [isAdmin, reload])

  /* ---------- guard ---------- */
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center space-y-4">
        <span className="flex h-16 w-16 mx-auto items-center justify-center rounded-3xl bg-primary/15 text-primary">
          <ShieldCheck size={30} />
        </span>
        <h1 className="text-xl font-black">{s.notAdmin[lang]}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">{s.notAdminDesc[lang]}</p>
        <Button
          onClick={() => openAuth('login')}
          className="rounded-xl font-bold gap-2 shadow-lg shadow-violet-900/40"
        >
          <LogIn size={16} /> {t.dash.loginToContinue[lang]}
        </Button>
      </div>
    )
  }

  const demote = async (u: SystemUser) => {
    if (!window.confirm(s.confirmRevoke[lang])) return
    try {
      const res = await fetch(`/api/system/users/${u.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'demote' }),
      })
      if (!res.ok) throw new Error()
      toast({ title: s.revoked[lang] })
      void reload()
    } catch {
      toast({ title: t.misc.errorLoad[lang], variant: 'destructive' })
    }
  }

  const tabs: { key: Tab; label: string; icon: typeof Users; badge?: number }[] = [
    { key: 'overview', label: s.tabOverview[lang], icon: ShieldCheck },
    { key: 'accounts', label: `${s.tabAccounts[lang]} (${users.length})`, icon: Users },
    { key: 'companies', label: s.tabCompanies[lang], icon: Store },
    {
      key: 'requests',
      label: s.tabRequests[lang],
      icon: Inbox,
      badge: requests.filter((r) => r.status === 'new').length,
    },
    { key: 'orders', label: s.tabOrders[lang], icon: ShoppingCart },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
      {/* header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-border bg-gradient-to-br from-violet-600/25 via-card to-card p-6 sm:p-8"
      >
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-violet-900/40">
            <ShieldCheck size={26} />
          </span>
          <div>
            <h1 className="text-xl sm:text-2xl font-black">{s.title[lang]}</h1>
            <p className="text-sm text-muted-foreground font-semibold">{s.subtitle[lang]}</p>
          </div>
        </div>
      </motion.div>

      {/* tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`relative inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
              tab === tb.key
                ? 'bg-primary text-primary-foreground shadow-md shadow-violet-900/30'
                : 'bg-secondary/60 text-muted-foreground hover:text-foreground'
            }`}
          >
            <tb.icon size={15} /> {tb.label}
            {!!tb.badge && (
              <span className="absolute -top-1.5 -end-1.5 h-5 min-w-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                {tb.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* content */}
      {loading && !overview ? (
        <p className="text-center text-sm text-muted-foreground py-16">{t.misc.loading[lang]}</p>
      ) : tab === 'overview' && overview ? (
        <OverviewTab overview={overview} lang={lang} onGoRequests={() => setTab('requests')} />
      ) : tab === 'accounts' ? (
        <AccountsTab
          users={filteredUsers}
          lang={lang}
          q={q}
          setQ={setQ}
          meId={user!.id}
          onGrant={(u) => setGrantFor(u)}
          onDemote={demote}
        />
      ) : tab === 'companies' ? (
        <CompaniesTab lang={lang} onChanged={reload} />
      ) : tab === 'requests' ? (
        <RequestsTab requests={requests} lang={lang} onChanged={reload} />
      ) : tab === 'orders' ? (
        <OrdersTab lang={lang} />
      ) : null}

      <GrantDialog
        lang={lang}
        target={grantFor}
        onClose={() => setGrantFor(null)}
        onSaved={() => { setGrantFor(null); void reload() }}
      />
    </div>
  )
}

/* ================= Overview ================= */
function OverviewTab({
  overview, lang, onGoRequests,
}: {
  overview: SystemOverview
  lang: Lang
  onGoRequests: () => void
}) {
  const s = t.sys
  const cards: {
    label: string; value: string | number; icon: typeof Users
    tone: string; alert?: boolean
  }[] = [
    { label: s.statUsers[lang], value: overview.usersTotal, icon: Users, tone: 'text-violet-400 bg-violet-500/15' },
    { label: s.statCustomers[lang], value: overview.customersCount, icon: UserPlus, tone: 'text-sky-400 bg-sky-500/15' },
    { label: s.statMerchants[lang], value: overview.ownersCount, icon: BadgeCheck, tone: 'text-emerald-400 bg-emerald-500/15' },
    { label: s.statActiveShelves[lang], value: overview.companiesActive, icon: Store, tone: 'text-emerald-400 bg-emerald-500/15' },
    { label: s.statPendingShelves[lang], value: overview.companiesPending, icon: AlertTriangle, tone: 'text-amber-400 bg-amber-500/15' },
    { label: s.statSuspendedShelves[lang], value: overview.companiesSuspended, icon: Ban, tone: 'text-rose-400 bg-rose-500/15' },
    { label: s.statProducts[lang], value: overview.productsCount, icon: Package, tone: 'text-violet-400 bg-violet-500/15' },
    { label: s.statOrders[lang], value: overview.ordersCount, icon: ShoppingCart, tone: 'text-sky-400 bg-sky-500/15' },
    { label: s.statOrdersPending[lang], value: overview.ordersPending, icon: AlertTriangle, tone: 'text-amber-400 bg-amber-500/15' },
    { label: s.statRevenue[lang], value: `${overview.revenue.toFixed(3)} ${lang === 'ar' ? 'ر.ع.' : 'OMR'}`, icon: Wallet, tone: 'text-emerald-400 bg-emerald-500/15' },
  ]

  return (
    <div className="space-y-4">
      {overview.joinRequestsNew > 0 && (
        <button
          onClick={onGoRequests}
          className="w-full flex items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-4 text-start transition hover:bg-amber-500/15"
        >
          <span className="flex items-center gap-3">
            <Inbox size={20} className="text-amber-400" />
            <span className="font-bold text-sm text-amber-300">
              {s.statRequests[lang]}: {overview.joinRequestsNew}
            </span>
          </span>
          <span className="text-xs font-bold text-amber-300 underline underline-offset-4">
            {s.goToRequests[lang]} ←
          </span>
        </button>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-card p-4 space-y-2">
            <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${c.tone}`}>
              <c.icon size={17} />
            </span>
            <p className="text-xl font-black leading-none">{c.value}</p>
            <p className="text-[11px] text-muted-foreground font-semibold leading-snug">{c.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ================= Accounts ================= */
function AccountsTab({
  users, lang, q, setQ, meId, onGrant, onDemote,
}: {
  users: SystemUser[]
  lang: Lang
  q: string
  setQ: (v: string) => void
  meId: string
  onGrant: (u: SystemUser) => void
  onDemote: (u: SystemUser) => void
}) {
  const s = t.sys

  const roleBadge = (role: string) => {
    if (role === 'admin')
      return { label: s.roleAdmin[lang], cls: 'bg-violet-500/20 text-violet-300' }
    if (role === 'owner')
      return { label: s.roleOwner[lang], cls: 'bg-emerald-500/20 text-emerald-300' }
    return { label: s.roleCustomer[lang], cls: 'bg-slate-500/20 text-slate-300' }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={s.searchAccounts[lang]}
          className="ps-9 rounded-xl bg-secondary/60"
        />
      </div>

      {users.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">{t.filters.noResults[lang]}</p>
      ) : (
        <div className="grid gap-3">
          {users.map((u) => {
            const badge = roleBadge(u.role)
            const isMe = u.id === meId
            return (
              <div
                key={u.id}
                className="flex flex-wrap sm:flex-nowrap items-center gap-3 rounded-2xl border border-border bg-card p-3 sm:p-4"
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg font-black ${
                    u.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-secondary'
                  }`}
                >
                  {u.name.trim().charAt(0).toUpperCase() || '?'}
                </span>
                <div className="flex-1 min-w-44">
                  <p className="font-bold text-sm flex items-center gap-2 flex-wrap">
                    {u.name}
                    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground" dir="ltr">{u.email}</p>
                  {u.company && (
                    <p className="text-[11px] text-violet-300 font-semibold mt-0.5">
                      {s.colShelf[lang]}:{' '}
                      {lang === 'ar' ? u.company.nameAr : u.company.nameEn}
                    </p>
                  )}
                </div>
                <div className="text-xs text-muted-foreground font-semibold shrink-0">
                  {s.colJoined[lang]}:{' '}
                  {new Date(u.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-OM' : 'en-GB')}
                  {' · '}
                  {s.colOrders[lang]}: {u.ordersCount}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {u.role === 'customer' && (
                    <Button
                      size="sm"
                      className="rounded-lg gap-1.5 font-bold"
                      onClick={() => onGrant(u)}
                    >
                      <BadgeCheck size={13} /> {s.grantMerchant[lang]}
                    </Button>
                  )}
                  {u.role === 'owner' && !isMe && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg gap-1.5 text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                      onClick={() => onDemote(u)}
                    >
                      <Ban size={13} /> {s.revokeMerchant[lang]}
                    </Button>
                  )}
                  {isMe && (
                    <span className="text-[11px] text-muted-foreground">{s.selfEdit[lang]}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
