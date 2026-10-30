'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Package, Plus, Pencil, Trash2, Search, Store, LogIn, ImageOff,
} from 'lucide-react'
import { useXmix } from '@/store/xmix'
import { t } from '@/lib/i18n'
import type { AdminOrder, AdminStats, Product } from '@/lib/types'
import { categoryLabel } from '@/lib/types'
import { fmtPrice } from '@/store/xmix'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/hooks/use-toast'
import { ProductDialog, OverviewTab, OrdersTab } from './dashboard-parts'

type Tab = 'overview' | 'products' | 'orders'

export function DashboardView() {
  const lang = useXmix((s) => s.lang)
  const user = useXmix((s) => s.user)
  const navigate = useXmix((s) => s.navigate)
  const openAuth = useXmix((s) => s.openAuth)
  const d = t.dash

  const [tab, setTab] = useState<Tab>('overview')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)

  const isOwner = user?.role === 'owner' && !!user.companyId

  const reload = useCallback(async () => {
    if (!isOwner) return
    setLoading(true)
    try {
      const [sRes, pRes, oRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/products'),
        fetch('/api/admin/orders'),
      ])
      // BUG-FIX (فشل صامت): استجابة 401/500 كانت تُقرأ JSON بلا بيانات فتبدو
      // اللوحة فارغة بلا أي رسالة (مثال: انتهاء الجلسة). الآن يظهر خطأ الخادم.
      if (!sRes.ok || !pRes.ok || !oRes.ok) {
        const j = await sRes.json().catch(() => null)
        throw new Error(j?.error || 'failed')
      }
      const [sData, pData, oData] = await Promise.all([sRes.json(), pRes.json(), oRes.json()])
      if (sData.stats) setStats(sData.stats)
      if (pData.products) setProducts(pData.products)
      if (oData.orders) setOrders(oData.orders)
    } catch (e) {
      toast({
        title: e instanceof Error && e.message && e.message !== 'failed' ? e.message : t.misc.errorLoad[lang],
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [isOwner, lang])

  useEffect(() => {
    if (isOwner) void reload()
  }, [isOwner, reload])

  const deleteProduct = async (p: Product) => {
    if (!window.confirm(d.confirmDelete[lang])) return
    try {
      const res = await fetch(`/api/admin/products/${p.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast({ title: d.deleted[lang] })
      void reload()
    } catch {
      toast({ title: 'Error', variant: 'destructive' })
    }
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return products
    return products.filter(
      (p) => p.nameAr.toLowerCase().includes(s) || p.nameEn.toLowerCase().includes(s)
    )
  }, [products, q])

  /* ---------- guard: not logged in / not owner ---------- */
  if (!isOwner) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center space-y-4">
        <span className="flex h-16 w-16 mx-auto items-center justify-center rounded-3xl bg-primary/15 text-primary">
          <LayoutDashboard size={30} />
        </span>
        <h1 className="text-xl font-black">{d.notOwner[lang]}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">{d.notOwnerDesc[lang]}</p>
        <Button
          onClick={() => openAuth('login')}
          className="rounded-xl font-bold gap-2 shadow-lg shadow-violet-900/40"
        >
          <LogIn size={16} /> {d.loginToContinue[lang]}
        </Button>
      </div>
    )
  }

  const tabs: { key: Tab; label: string; icon: typeof Package }[] = [
    { key: 'overview', label: d.tabOverview[lang], icon: LayoutDashboard },
    { key: 'products', label: `${d.tabProducts[lang]} (${products.length})`, icon: Package },
    { key: 'orders', label: d.tabOrders[lang], icon: Store },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
      {/* header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-border bg-gradient-to-br from-violet-600/20 via-card to-card p-6 sm:p-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {user.company?.gradient && (
              <span
                className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl shadow-lg"
                style={{ background: user.company.gradient }}
              >
                {user.company.emoji}
              </span>
            )}
            <div>
              <p className="text-xs font-bold text-violet-300">{d.welcome[lang]} {user.name} 👋</p>
              <h1 className="text-xl sm:text-2xl font-black">{d.title[lang]}</h1>
              <p className="text-sm text-muted-foreground font-semibold">
                {d.shelfOf[lang]}: {lang === 'ar' ? user.company?.nameAr : user.company?.nameEn}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate({ name: 'company', slug: user.company!.slug })}
            className="rounded-xl gap-2 font-bold"
          >
            <Store size={16} /> {d.viewStore[lang]}
          </Button>
        </div>
      </motion.div>

      {/* tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
              tab === tb.key
                ? 'bg-primary text-primary-foreground shadow-md shadow-violet-900/30'
                : 'bg-secondary/60 text-muted-foreground hover:text-foreground'
            }`}
          >
            <tb.icon size={15} /> {tb.label}
          </button>
        ))}
      </div>

      {/* content */}
      {loading && !stats ? (
        <p className="text-center text-sm text-muted-foreground py-16">{t.misc.loading[lang]}</p>
      ) : tab === 'overview' && stats ? (
        <OverviewTab stats={stats} lang={lang} />
      ) : tab === 'orders' ? (
        <OrdersTab orders={orders} lang={lang} />
      ) : (
        /* ---------- products tab ---------- */
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-52">
              <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={d.searchProducts[lang]}
                className="ps-9 rounded-xl bg-secondary/60"
              />
            </div>
            <Button
              onClick={() => { setEditing(null); setDialogOpen(true) }}
              className="rounded-xl gap-2 font-bold shadow-lg shadow-violet-900/30"
            >
              <Plus size={16} /> {d.addProduct[lang]}
            </Button>
          </div>

          {filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">{d.noProducts[lang]}</p>
          ) : (
            <div className="grid gap-3">
              {filtered.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap sm:flex-nowrap items-center gap-3 rounded-2xl border border-border bg-card p-3 sm:p-4"
                >
                  {p.image ? (
                     
                    <img
                      src={p.image}
                      alt={lang === 'ar' ? p.nameAr : p.nameEn}
                      loading="lazy"
                      decoding="async"
                      className="h-14 w-14 shrink-0 rounded-xl object-cover border border-border"
                    />
                  ) : (
                    <span
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-2xl"
                      style={{ background: p.gradient }}
                    >
                      {p.emoji}
                    </span>
                  )}
                  <div className="flex-1 min-w-40">
                    <p className="font-bold text-sm truncate flex items-center gap-1.5">
                      {lang === 'ar' ? p.nameAr : p.nameEn}
                      {p.kind === 'service' && (
                        <span className="inline-flex items-center rounded-md bg-fuchsia-500/15 px-1.5 py-0.5 text-[9px] font-bold text-fuchsia-300">
                          🛠️ {t.product.kindService[lang]}
                        </span>
                      )}
                      {!p.image && (
                        <span
                          title={t.dash.noImageYet[lang]}
                          className="inline-flex items-center gap-0.5 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-400"
                        >
                          <ImageOff size={9} /> {t.dash.noImageYet[lang]}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center rounded-md bg-secondary/80 px-1.5 py-0.5 text-[10px] font-bold">
                        {categoryLabel(p.category, lang)}
                      </span>
                      <span>{fmtPrice(p.price, lang)}</span>
                      <span>· {p.kind === 'service'
                        ? (p.category === 'agri-labor'
                          ? `${d.workersCount[lang]}: ${p.stock}`
                          : `${d.capacityShort[lang]}: ${p.stock}`)
                        : `${d.stock[lang]}: ${p.stock}`}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.kind === 'service' ? (
                      <span className="rounded-lg px-2 py-1 text-[11px] font-bold bg-sky-500/15 text-sky-400">
                        ✓ {lang === 'ar' ? 'حجز' : 'Book'}
                      </span>
                    ) : (
                      <span className={`rounded-lg px-2 py-1 text-[11px] font-bold ${p.stock <= 5 ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                        {p.stock <= 5 ? '⚠' : '✓'} {p.stock}
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg gap-1.5"
                      onClick={() => { setEditing(p); setDialogOpen(true) }}
                    >
                      <Pencil size={13} /> {d.edit[lang]}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-lg text-rose-400 gap-1.5"
                      onClick={() => deleteProduct(p)}
                    >
                      <Trash2 size={13} /> {d.delete[lang]}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <ProductDialog
        lang={lang}
        open={dialogOpen}
        editing={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={reload}
      />
    </div>
  )
}
