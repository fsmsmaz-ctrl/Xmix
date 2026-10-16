'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Store, Inbox, BadgeCheck, Ban, CheckCircle2, XCircle, ShoppingCart,
  Copy, RefreshCw, Eye,
} from 'lucide-react'
import { useXmix, fmtPrice } from '@/store/xmix'
import { t } from '@/lib/i18n'
import type {
  Lang, SystemCompany, SystemJoinRequest, SystemOrder, SystemUser,
} from '@/lib/types'
import { CATEGORIES } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'

/* ================= Grant merchant dialog ================= */
export function GrantDialog({
  lang, target, onClose, onSaved,
}: {
  lang: Lang
  target: SystemUser | null
  onClose: () => void
  onSaved: () => void
}) {
  const s = t.sys
  const [form, setForm] = useState({ nameAr: '', nameEn: '', category: 'general', city: '', description: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (target) setForm({ nameAr: '', nameEn: '', category: 'general', city: '', description: '' })
  }, [target])

  if (!target) return null

  const submit = async () => {
    if (form.nameAr.trim().length < 2) {
      toast({ title: s.companyNameAr[lang], variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/system/users/${target.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'promote', company: form }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({ title: s.granted[lang] })
      onSaved()
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Error', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!target} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="rounded-3xl max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BadgeCheck size={18} className="text-emerald-400" /> {s.grantTitle[lang]}
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {s.grantDesc[lang]} — <span dir="ltr" className="font-semibold">{target.email}</span>
        </p>
        <div className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <Label>{s.companyNameAr[lang]}</Label>
            <Input
              value={form.nameAr}
              onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
              className="rounded-xl bg-secondary/60"
              dir="rtl"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{s.companyNameEn[lang]}</Label>
            <Input
              value={form.nameEn}
              onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
              className="rounded-xl bg-secondary/60"
              dir="ltr"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{s.companyCategory[lang]}</Label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full h-10 rounded-xl border border-input bg-secondary/60 px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="general">{lang === 'ar' ? 'عام' : 'General'}</option>
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>{c.emoji} {lang === 'ar' ? c.ar : c.en}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>{s.companyCity[lang]}</Label>
              <Input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="rounded-xl bg-secondary/60"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{s.companyDesc[lang]}</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="rounded-xl bg-secondary/60 resize-none"
            />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl font-bold">
            {t.dash.cancel[lang]}
          </Button>
          <Button onClick={submit} disabled={saving} className="flex-1 rounded-xl font-bold gap-2">
            {saving ? t.dash.saving[lang] : s.grantSubmit[lang]}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ================= Companies tab ================= */
export function CompaniesTab({ lang, onChanged }: { lang: Lang; onChanged: () => void }) {
  const s = t.sys
  const [companies, setCompanies] = useState<SystemCompany[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/system/companies').then((r) => r.json())
      setCompanies(res.companies ?? [])
    } catch {
      toast({ title: t.misc.errorLoad[lang], variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [lang])

  useEffect(() => { void load() }, [load])

  const setStatus = async (c: SystemCompany, status: string, msg: string) => {
    try {
      const res = await fetch(`/api/system/companies/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error()
      toast({ title: msg })
      void load()
      onChanged()
    } catch {
      toast({ title: t.misc.errorLoad[lang], variant: 'destructive' })
    }
  }

  const statusBadge = (status: string) => {
    if (status === 'active') return { label: s.statusActive[lang], cls: 'bg-emerald-500/15 text-emerald-400' }
    if (status === 'pending') return { label: s.statusPending[lang], cls: 'bg-amber-500/15 text-amber-400' }
    return { label: s.statusSuspended[lang], cls: 'bg-rose-500/15 text-rose-400' }
  }

  return (
    <div className="space-y-3">
      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-12">{t.misc.loading[lang]}</p>
      ) : companies.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">{s.noCompanies[lang]}</p>
      ) : (
        companies.map((c) => {
          const badge = statusBadge(c.status)
          return (
            <div
              key={c.id}
              className="flex flex-wrap sm:flex-nowrap items-center gap-3 rounded-2xl border border-border bg-card p-3 sm:p-4"
            >
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl"
                style={{ background: c.gradient }}
              >
                {c.emoji}
              </span>
              <div className="flex-1 min-w-40">
                <p className="font-bold text-sm">{lang === 'ar' ? c.nameAr : c.nameEn}</p>
                <p className="text-xs text-muted-foreground" dir="ltr">
                  {c.owners.length
                    ? c.owners.map((o) => o.email).join(', ')
                    : '—'}
                </p>
              </div>
              <div className="text-xs text-muted-foreground font-semibold shrink-0">
                {s.colProducts[lang]}: {c.productsCount}
              </div>
              <span className={`rounded-lg px-2 py-1 text-[11px] font-bold shrink-0 ${badge.cls}`}>
                {badge.label}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                {c.status !== 'active' && (
                  <Button
                    size="sm"
                    className="rounded-lg gap-1.5 font-bold"
                    onClick={() => setStatus(c, 'active', s.approved[lang])}
                  >
                    <CheckCircle2 size={13} />
                    {c.status === 'pending' ? s.approve[lang] : s.reactivate[lang]}
                  </Button>
                )}
                {c.status === 'active' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg gap-1.5 text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                    onClick={() => setStatus(c, 'suspended', s.suspendedMsg[lang])}
                  >
                    <Ban size={13} /> {s.suspend[lang]}
                  </Button>
                )}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

/* ================= Join requests tab ================= */
export function RequestsTab({
  requests, lang, onChanged,
}: {
  requests: SystemJoinRequest[]
  lang: Lang
  onChanged: () => void
}) {
  const s = t.sys
  const [busyId, setBusyId] = useState<string | null>(null)
  const [passwordFor, setPasswordFor] = useState<{ email: string; password: string } | null>(null)

  const act = async (r: SystemJoinRequest, action: 'approve' | 'reject') => {
    if (action === 'approve' && !window.confirm(s.confirmApprove[lang])) return
    setBusyId(r.id)
    try {
      const res = await fetch(`/api/system/join-requests/${r.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (action === 'approve') {
        toast({ title: s.requestApproved[lang] })
        if (data.createdAccount && data.tempPassword) {
          setPasswordFor({ email: data.user.email, password: data.tempPassword })
        } else {
          toast({
            title: `${s.existingAccount[lang]} ${data.user?.email ?? ''}`,
            description: s.granted[lang],
          })
        }
      } else {
        toast({ title: s.requestRejected[lang] })
      }
      onChanged()
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Error', variant: 'destructive' })
    } finally {
      setBusyId(null)
    }
  }

  const statusBadge = (status: string) => {
    if (status === 'new') return { label: s.statusNew[lang], cls: 'bg-sky-500/15 text-sky-400' }
    if (status === 'approved') return { label: s.statusApproved[lang], cls: 'bg-emerald-500/15 text-emerald-400' }
    return { label: s.statusRejected[lang], cls: 'bg-rose-500/15 text-rose-400' }
  }

  const catLabel = (key: string) => {
    const c = CATEGORIES.find((x) => x.key === key)
    if (!c) return key
    return `${c.emoji} ${lang === 'ar' ? c.ar : c.en}`
  }

  return (
    <div className="space-y-3">
      {/* temp password dialog */}
      <Dialog open={!!passwordFor} onOpenChange={(v) => !v && setPasswordFor(null)}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-400" /> {s.requestApproved[lang]}
            </DialogTitle>
          </DialogHeader>
          {passwordFor && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {s.accountCreated[lang]}
              </p>
              <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4 space-y-2">
                <p className="text-xs text-muted-foreground" dir="ltr">{passwordFor.email}</p>
                <div className="flex items-center justify-between gap-2">
                  <code className="font-mono text-lg font-black text-violet-300" dir="ltr">
                    {passwordFor.password}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg gap-1.5"
                    onClick={() => {
                      navigator.clipboard?.writeText(passwordFor.password)
                      toast({ title: lang === 'ar' ? 'تم النسخ' : 'Copied' })
                    }}
                  >
                    <Copy size={13} /> {lang === 'ar' ? 'نسخ' : 'Copy'}
                  </Button>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                ⚠ {s.copyPassword[lang]}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {requests.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">{s.noRequests[lang]}</p>
      ) : (
        requests.map((r) => {
          const badge = statusBadge(r.status)
          return (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-lg">
                  🏬
                </span>
                <div className="flex-1 min-w-40">
                  <p className="font-bold text-sm">{r.companyName}</p>
                  <p className="text-xs text-muted-foreground">
                    {catLabel(r.category)} · {r.city}
                  </p>
                </div>
                <span className={`rounded-lg px-2 py-1 text-[11px] font-bold ${badge.cls}`}>
                  {badge.label}
                </span>
              </div>
              <div className="grid sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
                <p><span className="font-bold">{s.colRequester[lang]}:</span> {r.contactName}</p>
                <p dir="ltr" className="text-start"><span className="font-bold">{s.colContact[lang]}:</span> {r.email} · {r.phone}</p>
                <p>
                  <span className="font-bold">{s.colDate[lang]}:</span>{' '}
                  {new Date(r.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-OM' : 'en-GB')}
                </p>
              </div>
              {r.description && (
                <p className="text-xs text-muted-foreground leading-relaxed rounded-xl bg-secondary/50 p-3">
                  {r.description}
                </p>
              )}
              {r.status === 'new' && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={busyId === r.id}
                    className="rounded-lg gap-1.5 font-bold"
                    onClick={() => act(r, 'approve')}
                  >
                    <BadgeCheck size={13} /> {s.approveRequest[lang]}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === r.id}
                    className="rounded-lg gap-1.5 text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                    onClick={() => act(r, 'reject')}
                  >
                    <XCircle size={13} /> {s.rejectRequest[lang]}
                  </Button>
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

/* ================= Orders tab ================= */
const ORDER_STATUSES = ['pending', 'processing', 'delivered', 'cancelled'] as const

export function OrdersTab({ lang }: { lang: Lang }) {
  const s = t.sys
  const [orders, setOrders] = useState<SystemOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/system/orders').then((r) => r.json())
      setOrders(res.orders ?? [])
    } catch {
      toast({ title: t.misc.errorLoad[lang], variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [lang])

  useEffect(() => { void load() }, [load])

  const setStatus = async (o: SystemOrder, status: string) => {
    try {
      const res = await fetch(`/api/system/orders/${o.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error()
      toast({ title: s.statusUpdated[lang] })
      void load()
    } catch {
      toast({ title: t.misc.errorLoad[lang], variant: 'destructive' })
    }
  }

  const statusLabel = (st: string) => {
    const map: Record<string, string> = {
      pending: s.orderStatusPending[lang],
      processing: s.orderStatusProcessing[lang],
      delivered: s.orderStatusDelivered[lang],
      cancelled: s.orderStatusCancelled[lang],
    }
    return map[st] ?? st
  }

  const statusCls = (st: string) => {
    if (st === 'delivered') return 'bg-emerald-500/15 text-emerald-400'
    if (st === 'cancelled') return 'bg-rose-500/15 text-rose-400'
    if (st === 'processing') return 'bg-sky-500/15 text-sky-400'
    return 'bg-amber-500/15 text-amber-400'
  }

  return (
    <div className="space-y-3">
      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-12">{t.misc.loading[lang]}</p>
      ) : orders.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">{s.noOrders[lang]}</p>
      ) : (
        orders.map((o) => (
          <div key={o.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                <ShoppingCart size={17} className="text-muted-foreground" />
              </span>
              <div className="flex-1 min-w-40">
                <p className="font-black text-sm tracking-wide" dir="ltr">{o.orderNumber}</p>
                <p className="text-xs text-muted-foreground">
                  {o.customerName} ({o.user ? o.user.email : s.guest[lang]}) · {o.city}
                </p>
              </div>
              <span className={`rounded-lg px-2 py-1 text-[11px] font-bold ${statusCls(o.status)}`}>
                {statusLabel(o.status)}
              </span>
              <p className="font-black text-sm text-primary">{fmtPrice(o.total, lang)}</p>
              <select
                value={ORDER_STATUSES.includes(o.status as (typeof ORDER_STATUSES)[number]) ? o.status : 'pending'}
                onChange={(e) => setStatus(o, e.target.value)}
                className="h-9 rounded-lg border border-input bg-secondary/60 px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {ORDER_STATUSES.map((st) => (
                  <option key={st} value={st}>{statusLabel(st)}</option>
                ))}
              </select>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-lg gap-1.5"
                onClick={() => setExpanded(expanded === o.id ? null : o.id)}
              >
                <Eye size={13} /> {o.items.length} {s.itemsCount[lang]}
              </Button>
            </div>
            {expanded === o.id && (
              <div className="rounded-xl bg-secondary/40 p-3 space-y-2">
                {o.items.map((it, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="text-base">{it.emoji}</span>
                    <span className="flex-1 truncate font-semibold">
                      {lang === 'ar' ? it.nameAr : it.nameEn}
                      {it.companyAr && (
                        <span className="text-muted-foreground">
                          {' '}— {lang === 'ar' ? it.companyAr : it.companyEn}
                        </span>
                      )}
                    </span>
                    <span className="text-muted-foreground">×{it.qty}</span>
                    <span className="font-bold">{fmtPrice(it.price * it.qty, lang)}</span>
                  </div>
                ))}
                <div className="border-t pt-2 grid sm:grid-cols-2 gap-1 text-[11px] text-muted-foreground" dir="ltr">
                  <p>☎ {o.phone}</p>
                  <p>📍 {o.address}</p>
                  <p>
                    {s.colPayment[lang]}: {o.paymentMethod === 'cod'
                      ? (lang === 'ar' ? 'عند الاستلام' : 'Cash on delivery')
                      : (lang === 'ar' ? 'تحويل بنكي' : 'Bank transfer')}
                  </p>
                  <p>
                    {new Date(o.createdAt).toLocaleString(lang === 'ar' ? 'ar-OM' : 'en-GB')}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
