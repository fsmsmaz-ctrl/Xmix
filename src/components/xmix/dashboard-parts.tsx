'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Package, ShoppingCart, Plus, Pencil, Trash2, Search,
  TrendingUp, Boxes, Wallet, AlertTriangle, Store, LogIn, X, Coins,
} from 'lucide-react'
import { useXmix } from '@/store/xmix'
import { t } from '@/lib/i18n'
import type { AdminOrder, AdminStats, Lang, Product } from '@/lib/types'
import { CATEGORIES } from '@/lib/types'
import { fmtPrice } from '@/store/xmix'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/hooks/use-toast'
import {
  ProductImagesField, slotsFromUrls, uploadSlots, type ImageSlot,
} from './ProductImagesField'
import { productGallery } from '@/lib/types'

const GRADIENTS = [
  { v: 'linear-gradient(135deg,#8B5CF6,#6D28D9)', label: 'بنفسجي' },
  { v: 'linear-gradient(135deg,#38BDF8,#1D4ED8)', label: 'أزرق' },
  { v: 'linear-gradient(135deg,#34D399,#065F46)', label: 'أخضر' },
  { v: 'linear-gradient(135deg,#F59E0B,#B45309)', label: 'عسلي' },
  { v: 'linear-gradient(135deg,#F472B6,#9D174D)', label: 'وردي' },
  { v: 'linear-gradient(135deg,#FB923C,#9A3412)', label: 'برتقالي' },
  { v: 'linear-gradient(135deg,#94A3B8,#334155)', label: 'رمادي' },
  { v: 'linear-gradient(135deg,#C084FC,#6B21A8)', label: 'أرجواني' },
]

type ProductForm = {
  nameAr: string; nameEn: string; descAr: string; descEn: string
  price: string; oldPrice: string; stock: string
  category: string; kind: 'product' | 'service'
  emoji: string; gradient: string
  badgeAr: string; badgeEn: string; isBestSeller: boolean
}

const EMPTY_FORM: ProductForm = {
  nameAr: '', nameEn: '', descAr: '', descEn: '',
  price: '', oldPrice: '', stock: '20',
  category: 'general', kind: 'product', emoji: '🛍️', gradient: GRADIENTS[0].v,
  badgeAr: '', badgeEn: '', isBestSeller: false,
}

function formFromProduct(p: Product): ProductForm {
  const kind = p.kind === 'service' ? 'service' : 'product'
  return {
    nameAr: p.nameAr, nameEn: p.nameEn,
    descAr: p.descAr === p.nameAr ? '' : p.descAr,
    descEn: p.descEn === p.nameEn ? '' : p.descEn,
    price: String(p.price), oldPrice: p.oldPrice ? String(p.oldPrice) : '',
    stock: String(p.stock), category: p.category, kind,
    emoji: p.emoji,
    gradient: p.gradient, badgeAr: p.badgeAr ?? '', badgeEn: p.badgeEn ?? '',
    isBestSeller: p.isBestSeller,
  }
}

/* ================= Product add/edit dialog ================= */
function ProductDialog({
  lang, open, editing, onClose, onSaved,
}: {
  lang: Lang
  open: boolean
  editing: Product | null
  onClose: () => void
  onSaved: () => void
}) {
  const d = t.dash
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM)
  const [slots, setSlots] = useState<ImageSlot[]>([])
  const [saving, setSaving] = useState(false)
  const [uploadingCount, setUploadingCount] = useState(0)

  useEffect(() => {
    if (open) {
      setForm(editing ? formFromProduct(editing) : EMPTY_FORM)
      setSlots(editing ? slotsFromUrls(productGallery(editing)) : [])
    }
  }, [open, editing])

  const set = (k: keyof ProductForm, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.nameAr.trim() || !form.nameEn.trim()) {
      toast({ title: lang === 'ar' ? 'الاسمان مطلوبان' : 'Both names are required', variant: 'destructive' })
      return
    }
    if (!Number(form.price)) {
      toast({ title: lang === 'ar' ? 'أدخل سعراً صالحاً' : 'Enter a valid price', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      // 1) upload newly added images first (client already compressed them)
      let imageUrls: string[] = []
      if (slots.length) {
        try {
          imageUrls = await uploadSlots(slots, (done, total) => setUploadingCount(total - done))
        } catch {
          toast({ title: d.imgUploadFail[lang], variant: 'destructive' })
          setSaving(false)
          setUploadingCount(0)
          return
        }
      }
      setUploadingCount(0)

      const payload = {
        ...form,
        price: Number(form.price),
        // send 0 when cleared so the server nulls it (allows removing an old price)
        oldPrice: form.oldPrice ? Number(form.oldPrice) : 0,
        // services are capacity-based — the server assigns 999; hide stock for them
        stock: form.kind === 'service' ? 999 : (Number(form.stock) || 0),
        // ordered gallery — first entry is the main display image
        image: imageUrls[0] ?? '',
        images: imageUrls.slice(1),
      }
      const res = await fetch(editing ? `/api/admin/products/${editing.id}` : '/api/admin/products', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'failed')
      toast({ title: editing ? d.updated[lang] : d.created[lang] })
      onSaved()
      onClose()
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : 'Error',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
      setUploadingCount(0)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent aria-describedby={undefined} className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card">
        <DialogHeader>
          <DialogTitle className="text-lg font-black">
            {editing ? d.editProduct[lang] : d.addProduct[lang]}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <ProductImagesField
            lang={lang}
            slots={slots}
            onChange={setSlots}
            disabled={saving}
          />

          <div className="space-y-1.5">
            <Label>{d.nameAr[lang]}</Label>
            <Input value={form.nameAr} onChange={(e) => set('nameAr', e.target.value)} className="rounded-xl" dir="rtl" />
          </div>
          <div className="space-y-1.5">
            <Label>{d.nameEn[lang]}</Label>
            <Input value={form.nameEn} onChange={(e) => set('nameEn', e.target.value)} className="rounded-xl" dir="ltr" />
          </div>
          <div className="space-y-1.5">
            <Label>{d.descAr[lang]}</Label>
            <textarea
              value={form.descAr}
              onChange={(e) => set('descAr', e.target.value)}
              rows={3}
              dir="rtl"
              className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{d.descEn[lang]}</Label>
            <textarea
              value={form.descEn}
              onChange={(e) => set('descEn', e.target.value)}
              rows={3}
              dir="ltr"
              className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-3 gap-3 sm:col-span-2">
            <div className="space-y-1.5">
              <Label>{d.price[lang]} (OMR)</Label>
              <Input type="number" min="0.001" step="0.001" value={form.price}
                onChange={(e) => set('price', e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label>{d.oldPrice[lang]}</Label>
              <Input type="number" min="0" step="0.001" value={form.oldPrice}
                onChange={(e) => set('oldPrice', e.target.value)} className="rounded-xl" />
            </div>
            {form.kind === 'service' ? (
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">{d.stockService[lang]}</Label>
                <div className="h-10 rounded-xl border border-dashed border-border bg-secondary/30 flex items-center justify-center text-xs text-muted-foreground px-2 text-center">
                  {lang === 'ar' ? 'الحجز مفتوح' : 'Open for booking'}
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>{d.stock[lang]}</Label>
                <Input type="number" min="0" value={form.stock}
                  onChange={(e) => set('stock', e.target.value)} className="rounded-xl" />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>{d.kindField[lang]}</Label>
            <select
              value={form.kind}
              onChange={(e) => {
                const kind = e.target.value as 'product' | 'service'
                setForm((f) => ({ ...f, kind, emoji: kind === 'service' && f.emoji === '🛍️' ? '🛠️' : f.emoji }))
              }}
              className="w-full h-10 rounded-xl border border-border bg-secondary/50 px-3 text-sm"
            >
              <option value="product">{d.kindProduct[lang]}</option>
              <option value="service">{d.kindService[lang]}</option>
            </select>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{d.kindHint[lang]}</p>
          </div>

          <div className="space-y-1.5">
            <Label>{d.category[lang]}</Label>
            <select
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              className="w-full h-10 rounded-xl border border-border bg-secondary/50 px-3 text-sm"
            >
              <option value="general">{lang === 'ar' ? '🏬 عام' : '🏬 General'}</option>
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>{c.emoji} {lang === 'ar' ? c.ar : c.en}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>{d.emojiField[lang]}</Label>
            <Input value={form.emoji} onChange={(e) => set('emoji', e.target.value)} className="rounded-xl text-center text-lg" />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>{d.colorField[lang]}</Label>
            <div className="flex flex-wrap gap-2">
              {GRADIENTS.map((g) => (
                <button
                  key={g.v}
                  type="button"
                  onClick={() => set('gradient', g.v)}
                  aria-label={g.label}
                  className={`h-9 w-9 rounded-xl transition-transform ${form.gradient === g.v ? 'ring-2 ring-primary ring-offset-2 ring-offset-card scale-110' : 'hover:scale-105'}`}
                  style={{ background: g.v }}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:col-span-2">
            <div className="space-y-1.5">
              <Label>{d.badgeAr[lang]}</Label>
              <Input value={form.badgeAr} onChange={(e) => set('badgeAr', e.target.value)} className="rounded-xl" dir="rtl" />
            </div>
            <div className="space-y-1.5">
              <Label>{d.badgeEn[lang]}</Label>
              <Input value={form.badgeEn} onChange={(e) => set('badgeEn', e.target.value)} className="rounded-xl" dir="ltr" />
            </div>
          </div>

          <div className="flex items-center gap-3 sm:col-span-2 rounded-xl border border-border p-3">
            <Switch checked={form.isBestSeller} onCheckedChange={(v) => set('isBestSeller', v)} />
            <span className="text-sm font-semibold">{d.markBestSeller[lang]}</span>
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={onClose} className="rounded-xl">{d.cancel[lang]}</Button>
          <Button onClick={submit} disabled={saving} className="rounded-xl font-bold min-w-32">
            {saving
              ? uploadingCount > 0
                ? `${d.uploadingImages[lang]} (${uploadingCount})`
                : d.saving[lang]
              : d.save[lang]}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ================= Overview tab ================= */
function StatCard({ icon: Icon, label, value, accent }: {
  icon: typeof Package; label: string; value: string; accent: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ background: accent }}>
        <Icon size={17} />
      </span>
      <p className="text-xl sm:text-2xl font-black">{value}</p>
      <p className="text-xs sm:text-sm text-muted-foreground font-semibold">{label}</p>
    </div>
  )
}

function OverviewTab({ stats, lang }: { stats: AdminStats; lang: Lang }) {
  const d = t.dash
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={Package} label={d.statProducts[lang]} value={String(stats.productCount)} accent="linear-gradient(135deg,#8B5CF6,#6D28D9)" />
        <StatCard icon={Wallet} label={d.statRevenue[lang]} value={fmtPrice(stats.revenue, lang)} accent="linear-gradient(135deg,#34D399,#065F46)" />
        <StatCard icon={ShoppingCart} label={d.statOrders[lang]} value={String(stats.ordersCount)} accent="linear-gradient(135deg,#38BDF8,#1D4ED8)" />
        <StatCard icon={TrendingUp} label={d.statUnits[lang]} value={String(stats.unitsSold)} accent="linear-gradient(135deg,#F59E0B,#B45309)" />
        <StatCard icon={Boxes} label={d.statStock[lang]} value={String(stats.stockTotal)} accent="linear-gradient(135deg,#C084FC,#6B21A8)" />
        <StatCard icon={Coins} label={d.statStockValue[lang]} value={fmtPrice(stats.stockValue, lang)} accent="linear-gradient(135deg,#FB923C,#9A3412)" />
        <StatCard icon={AlertTriangle} label={d.statLowStock[lang]} value={String(stats.lowStock)} accent="linear-gradient(135deg,#F87171,#B91C1C)" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h3 className="font-black mb-4 flex items-center gap-2">
          <ShoppingCart size={17} className="text-primary" /> {d.recentOrders[lang]}
        </h3>
        {stats.recent.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{d.noRecent[lang]}</p>
        ) : (
          <ul className="divide-y divide-border">
            {stats.recent.map((o) => (
              <li key={o.orderNumber} className="py-3 flex flex-wrap items-center gap-2 justify-between">
                <div>
                  <p className="font-bold text-sm">{o.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">{o.customerName} · {new Date(o.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-OM' : 'en-GB')}</p>
                </div>
                <span className="text-sm font-black text-primary">{fmtPrice(o.myTotal, lang)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/* ================= Orders tab ================= */
function OrdersTab({ orders, lang }: { orders: AdminOrder[]; lang: Lang }) {
  const d = t.dash
  if (orders.length === 0) {
    return (
      <div className="text-center py-16 space-y-2">
        <ShoppingCart size={40} className="mx-auto text-muted-foreground/40" />
        <p className="font-bold">{d.noOrders[lang]}</p>
        <p className="text-sm text-muted-foreground">{d.noOrdersDesc[lang]}</p>
      </div>
    )
  }
  return (
    <div className="space-y-3">
      {orders.map((o) => (
        <div key={o.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-black">{o.orderNumber}</p>
              <p className="text-xs text-muted-foreground">
                {d.customer[lang]}: {o.customerName} · {o.city} · {new Date(o.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-OM' : 'en-GB')}
              </p>
            </div>
            <div className="text-end">
              <p className="font-black text-primary">{fmtPrice(o.myTotal, lang)}</p>
              <p className="text-[11px] text-muted-foreground">{d.myTotal[lang]}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {o.items.map((it, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 rounded-lg bg-secondary/70 px-2.5 py-1.5 text-xs font-semibold">
                <span>{it.emoji}</span>
                {lang === 'ar' ? it.nameAr : it.nameEn}
                <span className="text-muted-foreground">×{it.qty}</span>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export { ProductDialog, OverviewTab, OrdersTab, GRADIENTS, EMPTY_FORM }
export type { ProductForm }
