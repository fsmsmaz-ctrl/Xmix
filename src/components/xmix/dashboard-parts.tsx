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
import {
  CATEGORIES, AGRI_GOODS_KEYS, AGRI_SERVICE_KEYS, kindForCategory,
} from '@/lib/types'
import {
  parseDetailsLine, stripDetailsLine, buildDetailsLine,
  sanitizeUsedDetails, sanitizeFoodDetails, conditionLabel, conditionDescLabel,
  usedSubLabel, mealLabel, prepLabel, allergenChip, formatCutoff,
  USED_SUBTYPES, USED_CONDITIONS, FOOD_MEALS, FOOD_CUTOFFS, FOOD_ALLERGENS, FOOD_PREPS, WEEKDAY_ORDER,
  type ListingDetails,
} from '@/lib/details'
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

/* منتقي سريع لنوع الغرض المباع — يضبط القسم والنوع والرمز والطاقة دفعة واحدة */
const PURPOSES = [
  { key: 'crop', emoji: '🌾', labelKey: 'purposeCrop', category: 'agri-crops', kind: 'product', stock: '20' },
  { key: 'product', emoji: '🧺', labelKey: 'purposeProduct', category: 'agri-products', kind: 'product', stock: '20' },
  { key: 'service', emoji: '🚜', labelKey: 'purposeService', category: 'agri-services', kind: 'service', stock: '10' },
  { key: 'labor', emoji: '👷', labelKey: 'purposeLabor', category: 'agri-labor', kind: 'service', stock: '5' },
  { key: 'cafe', emoji: '☕', labelKey: 'purposeCafe', category: 'cafe', kind: 'product', stock: '20' },
  { key: 'fish', emoji: '🐟', labelKey: 'purposeFish', category: 'fresh-fish', kind: 'product', stock: '20' },
  { key: 'animals', emoji: '🐑', labelKey: 'purposeAnimals', category: 'animals', kind: 'product', stock: '20' },
  { key: 'used', emoji: '♻️', labelKey: 'purposeUsed', category: 'used-items', kind: 'product', stock: '5' },
  { key: 'homefood', emoji: '🍲', labelKey: 'purposeHomeFood', category: 'home-food', kind: 'product', stock: '10' },
] as const

/** تبديل يوم في قائمة أيام التوفر */
function toggleDay(days: number[] | undefined, d: number): number[] | undefined {
  const cur = days ?? []
  const next = cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]
  return next.length ? next : undefined
}

/** تبديل عنصر في قائمة مواد الحساسية */
function toggleAllergen(list: string[] | undefined, key: string): string[] | undefined {
  const cur = list ?? []
  const next = cur.includes(key) ? cur.filter((x) => x !== key) : [...cur, key]
  return next.length ? next : undefined
}

type ProductForm = {
  nameAr: string; nameEn: string; descAr: string; descEn: string
  price: string; oldPrice: string; stock: string
  category: string; kind: 'product' | 'service'
  emoji: string; gradient: string
  badgeAr: string; badgeEn: string; isBestSeller: boolean
  /** تفاصيل الأقسام الخاصة (المستعمل/الأكلات المنزلية) — تُدمج في الوصف عند الحفظ */
  xd: ListingDetails
}

const EMPTY_FORM: ProductForm = {
  nameAr: '', nameEn: '', descAr: '', descEn: '',
  price: '', oldPrice: '', stock: '20',
  category: 'general', kind: 'product', emoji: '🛍️', gradient: GRADIENTS[0].v,
  badgeAr: '', badgeEn: '', isBestSeller: false,
  xd: {},
}

function formFromProduct(p: Product): ProductForm {
  const kind = p.kind === 'service' ? 'service' : 'product'
  // استخراج سطر التفاصيل من الوصف حتى لا يراه التاجر نصاً خاماً
  const parsedAr = parseDetailsLine(p.descAr)
  return {
    nameAr: p.nameAr, nameEn: p.nameEn,
    descAr: parsedAr.details ? parsedAr.text : (p.descAr === p.nameAr ? '' : p.descAr),
    descEn: p.descEn === p.nameEn ? '' : stripDetailsLine(p.descEn),
    price: String(p.price), oldPrice: p.oldPrice ? String(p.oldPrice) : '',
    stock: String(p.stock), category: p.category, kind,
    emoji: p.emoji,
    gradient: p.gradient, badgeAr: p.badgeAr ?? '', badgeEn: p.badgeEn ?? '',
    isBestSeller: p.isBestSeller,
    xd: parsedAr.details ?? {},
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

  /** تحديث تفاصيل الأقسام الخاصة (المستعمل/الأكلات) */
  const setXd = (patch: Partial<ListingDetails>) =>
    setForm((f) => ({ ...f, xd: { ...f.xd, ...patch } }))

  /** الأقسام ذات التفاصيل: يُبنى سطر [[XMIX-D]] ويُسبق الوصف — غيرها يُنظّف من أي سطر قديم */
  const composeDesc = (): { descAr: string; descEn: string } => {
    const userAr = stripDetailsLine(form.descAr).trim() || form.nameAr
    const userEn = stripDetailsLine(form.descEn).trim() || form.nameEn
    let line: string | null = null
    if (form.category === 'used-items') line = buildDetailsLine(sanitizeUsedDetails(form.xd))
    else if (form.category === 'home-food') line = buildDetailsLine(sanitizeFoodDetails(form.xd))
    if (!line) return { descAr: userAr, descEn: userEn }
    return { descAr: `${line}\n${userAr}`, descEn: `${line}\n${userEn}` }
  }

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

      const { xd: _xd, ...formRest } = form
      const desc = composeDesc()
      const payload = {
        ...formRest,
        ...desc,
        price: Number(form.price),
        // send 0 when cleared so the server nulls it (allows removing an old price)
        oldPrice: form.oldPrice ? Number(form.oldPrice) : 0,
        // services are capacity-based (bookings/day or workers available) — server clamps 1..999
        stock: Number(form.stock) || (form.kind === 'service' ? 10 : 20),
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

        {/* نوع الغرض المباع — اختيار سريع يضبط القسم والنوع تلقائياً */}
        <div className="space-y-2">
          <Label className="text-sm font-black">{d.purposeField[lang]}</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {PURPOSES.map((p) => {
              const active = form.category === p.category && form.kind === p.kind
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, category: p.category, kind: p.kind, emoji: p.emoji, stock: p.stock }))}
                  aria-pressed={active}
                  className={`rounded-xl border p-2.5 text-center transition-all ${
                    active
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/40'
                      : 'border-border hover:border-primary/50 hover:bg-secondary/40'
                  }`}
                >
                  <span className="block text-xl" aria-hidden>{p.emoji}</span>
                  <span className="block text-[11px] font-bold leading-tight mt-1">{d[p.labelKey][lang]}</span>
                </button>
              )
            })}
          </div>
          <p className="text-[11px] text-muted-foreground">{d.purposeHint[lang]}</p>
        </div>

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
              {form.category === 'agri-labor' ? (
                <p className="text-[10px] text-muted-foreground leading-relaxed">{d.laborPriceHint[lang]}</p>
              ) : form.kind === 'service' ? (
                <p className="text-[10px] text-muted-foreground leading-relaxed">{d.servicePriceHint[lang]}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label>{d.oldPrice[lang]}</Label>
              <Input type="number" min="0" step="0.001" value={form.oldPrice}
                onChange={(e) => set('oldPrice', e.target.value)} className="rounded-xl" />
            </div>
            {form.kind === 'service' ? (
              <div className="space-y-1.5">
                <Label>{form.category === 'agri-labor' ? d.laborCapacity[lang] : d.serviceCapacity[lang]}</Label>
                <Input
                  type="number" min="1" max="999" value={form.stock}
                  onChange={(e) => set('stock', e.target.value)}
                  className="rounded-xl"
                  dir="ltr"
                />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  {form.category === 'agri-labor' ? d.laborCapacityNote[lang] : d.serviceCapacityNote[lang]}
                </p>
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
                setForm((f) => {
                  // الاتساق مع القسم: التحويل للخدمة ينقل الأقسام المادية إلى قسم خدمات
                  // (الزراعية المادية → خدمات زراعية، والأسماك/الحيوانات/الكافيهات → خدمات عامة)
                  let category = f.category
                  if (kind === 'service' && kindForCategory(f.category) === 'product') {
                    category = AGRI_GOODS_KEYS.includes(f.category) ? 'agri-services' : 'services'
                  }
                  if (kind === 'product' && AGRI_SERVICE_KEYS.includes(f.category)) category = 'agri-products'
                  const emoji = kind === 'service' && f.emoji === '🛍️'
                    ? (category === 'agri-labor' ? '👷' : category === 'agri-services' ? '🚜' : '🛠️')
                    : f.emoji
                  return { ...f, kind, category, emoji }
                })
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
              onChange={(e) => {
                const cat = e.target.value
                setForm((f) => {
                  // الأقسام الزراعية تفرض نوع العرض المناسب: محصول/منتج/بذور = مادي، خدمات/عمالة = خدمة
                  // والمستعمل والأكلات المنزلية مادية حصراً
                  const forced = kindForCategory(cat)
                  if (forced && forced !== f.kind) {
                    const emoji = f.emoji === '🛍️'
                      ? (cat === 'agri-labor' ? '👷'
                        : cat === 'agri-services' ? '🚜'
                        : cat === 'used-items' ? '♻️'
                        : cat === 'home-food' ? '🍲'
                        : forced === 'service' ? '🛠️' : f.emoji)
                      : f.emoji
                    return { ...f, category: cat, kind: forced, emoji }
                  }
                  const emoji = f.emoji === '🛍️' && cat === 'used-items' ? '♻️'
                    : f.emoji === '🛍️' && cat === 'home-food' ? '🍲'
                    : f.emoji
                  return { ...f, category: cat, emoji }
                })
              }}
              className="w-full h-10 rounded-xl border border-border bg-secondary/50 px-3 text-sm"
            >
              <option value="general">{lang === 'ar' ? '🏬 عام' : '🏬 General'}</option>
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>{c.emoji} {lang === 'ar' ? c.ar : c.en}</option>
              ))}
            </select>
            {form.category === 'agri-labor' ? (
              <p className="text-[11px] text-muted-foreground leading-relaxed">{d.agriLaborHint[lang]}</p>
            ) : form.category === 'agri-services' ? (
              <p className="text-[11px] text-muted-foreground leading-relaxed">{d.agriServiceHint[lang]}</p>
            ) : AGRI_GOODS_KEYS.includes(form.category) ? (
              <p className="text-[11px] text-muted-foreground leading-relaxed">{d.agriGoodsHint[lang]}</p>
            ) : form.category === 'used-items' ? (
              <p className="text-[11px] text-muted-foreground leading-relaxed">{d.usedDetailsHint[lang]}</p>
            ) : form.category === 'home-food' ? (
              <p className="text-[11px] text-muted-foreground leading-relaxed">{d.foodDetailsHint[lang]}</p>
            ) : null}
          </div>

          {/* ══ تفاصيل «اغراض مستعملة» ♻️ — تظهر فقط عند اختيار القسم ══ */}
          {form.category === 'used-items' && (
            <div className="sm:col-span-2 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
              <p className="text-sm font-black">♻️ {t.xd.usedSection[lang]}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{t.xd.subType[lang]}</Label>
                  <select
                    value={form.xd.sub ?? ''}
                    onChange={(e) => setXd({ sub: e.target.value || undefined })}
                    className="w-full h-10 rounded-xl border border-border bg-secondary/50 px-3 text-sm"
                  >
                    <option value="">{lang === 'ar' ? 'بدون تحديد' : 'Unspecified'}</option>
                    {USED_SUBTYPES.map((s) => (
                      <option key={s} value={s}>{usedSubLabel(s, lang)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t.xd.cond[lang]}</Label>
                  <select
                    value={form.xd.cond ?? ''}
                    onChange={(e) => setXd({ cond: e.target.value || undefined })}
                    className="w-full h-10 rounded-xl border border-border bg-secondary/50 px-3 text-sm"
                  >
                    <option value="">{lang === 'ar' ? 'بدون تحديد' : 'Unspecified'}</option>
                    {USED_CONDITIONS.map((c) => (
                      <option key={c.key} value={c.key}>{conditionLabel(c.key, lang)}</option>
                    ))}
                  </select>
                  {form.xd.cond && (
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{conditionDescLabel(form.xd.cond, lang)}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>{t.xd.age[lang]}</Label>
                  <Input
                    type="number" min="0" max="600" dir="ltr"
                    value={form.xd.ageM ?? ''}
                    onChange={(e) => setXd({ ageM: e.target.value === '' ? undefined : Number(e.target.value) })}
                    className="rounded-xl"
                  />
                  <p className="text-[10px] text-muted-foreground">{t.xd.ageHint[lang]}</p>
                </div>
                <div className="space-y-1.5">
                  <Label>{t.xd.warranty[lang]}</Label>
                  <Input
                    type="number" min="0" max="120" dir="ltr"
                    value={form.xd.warrantyM ?? ''}
                    onChange={(e) => setXd({ warrantyM: e.target.value === '' ? undefined : Number(e.target.value) })}
                    className="rounded-xl"
                  />
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-border p-3 sm:col-span-2">
                  <Switch checked={Boolean(form.xd.nego)} onCheckedChange={(v) => setXd({ nego: v })} />
                  <span className="text-sm font-semibold">💬 {t.xd.nego[lang]}</span>
                </div>
              </div>
            </div>
          )}

          {/* ══ تفاصيل «أكلات منزلية» 🍲 — تظهر فقط عند اختيار القسم ══ */}
          {form.category === 'home-food' && (
            <div className="sm:col-span-2 rounded-2xl border border-orange-500/30 bg-orange-500/5 p-4 space-y-3">
              <p className="text-sm font-black">🍲 {t.xd.foodSection[lang]}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{t.xd.meal[lang]}</Label>
                  <select
                    value={form.xd.meal ?? ''}
                    onChange={(e) => setXd({ meal: e.target.value || undefined })}
                    className="w-full h-10 rounded-xl border border-border bg-secondary/50 px-3 text-sm"
                  >
                    <option value="">{lang === 'ar' ? 'بدون تحديد' : 'Unspecified'}</option>
                    {FOOD_MEALS.map((m) => (
                      <option key={m} value={m}>{mealLabel(m, lang)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t.xd.portions[lang]}</Label>
                  <Input
                    type="number" min="1" max="99" dir="ltr"
                    value={form.xd.portions ?? ''}
                    onChange={(e) => setXd({ portions: e.target.value === '' ? undefined : Number(e.target.value) })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.xd.cutoff[lang]}</Label>
                  <select
                    value={form.xd.cutoff ?? ''}
                    onChange={(e) => setXd({ cutoff: e.target.value || undefined })}
                    className="w-full h-10 rounded-xl border border-border bg-secondary/50 px-3 text-sm"
                  >
                    <option value="">{t.xd.cutoffNone[lang]}</option>
                    {FOOD_CUTOFFS.map((c) => (
                      <option key={c} value={c}>{formatCutoff(c, lang)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t.xd.prep[lang]}</Label>
                  <select
                    value={form.xd.prep ?? ''}
                    onChange={(e) => setXd({ prep: e.target.value || undefined })}
                    className="w-full h-10 rounded-xl border border-border bg-secondary/50 px-3 text-sm"
                  >
                    <option value="">{lang === 'ar' ? 'بدون تحديد' : 'Unspecified'}</option>
                    {FOOD_PREPS.map((p) => (
                      <option key={p} value={p}>{prepLabel(p, lang)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>{t.xd.days[lang]}</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {WEEKDAY_ORDER.map((day) => {
                      const active = (form.xd.days ?? []).includes(day)
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => setXd({ days: toggleDay(form.xd.days, day) })}
                          aria-pressed={active}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-all ${
                            active
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border text-muted-foreground hover:border-primary/40'
                          }`}
                        >
                          {t.xd[`day${day}`][lang]}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{t.xd.daysHint[lang]}</p>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>{t.xd.allergens[lang]}</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {FOOD_ALLERGENS.map((a) => {
                      const active = (form.xd.allergens ?? []).includes(a.key)
                      return (
                        <button
                          key={a.key}
                          type="button"
                          onClick={() => setXd({ allergens: toggleAllergen(form.xd.allergens, a.key) })}
                          aria-pressed={active}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-all ${
                            active
                              ? 'border-rose-500/60 bg-rose-500/10 text-rose-500'
                              : 'border-border text-muted-foreground hover:border-rose-500/40'
                          }`}
                        >
                          {allergenChip(a.key, lang)}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{t.xd.allergensHint[lang]}</p>
                </div>
              </div>
            </div>
          )}

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
