/*
 * نظام تفاصيل الأقسام الخاصة — صفر تغييرات قاعدة بيانات:
 * تُخزن تفاصيل «اغراض مستعملة» و«أكلات منزلية» كـ JSON مضغوط في سطر أول من الوصف
 * بمُعرّف [[XMIX-D]] ثم تُفكّ عند العرض وتُترجم من i18n. إن فُقد السطر أو فُسد
 * يظهر الوصف كما هو — تدهور رشيق بلا أي أثر جانبي.
 */
import type { Lang } from './types'
import { t } from './i18n'

export const DETAILS_MARKER = '[[XMIX-D]]'

/** تفاصيل «اغراض مستعملة» */
export interface UsedDetails {
  /** فئة الغرض: furniture | electronics | appliances | vehicles | tools | fashion | study | other */
  sub?: string
  /** حالة الغرض: like-new | excellent | good | fair | parts */
  cond?: string
  /** عمر الاستخدام بالأشهر (0..600) */
  ageM?: number
  /** ضمان متبقٍ بالأشهر (0 = بلا ضمان) */
  warrantyM?: number
  /** قابل للتفاوض على السعر؟ */
  nego?: boolean
}

/** تفاصيل «أكلات منزلية» */
export interface FoodDetails {
  /** نوع الوجبة: main | starters | bakery | sweets | drinks | events */
  meal?: string
  /** عدد الحصص — «يكفي X أشخاص» (1..99) */
  portions?: number
  /** وقت القطع «يُطلب قبل الساعة» بنسق 24 ساعة مثل '14:00'، فارغ = بلا حد */
  cutoff?: string
  /** أيام التوفر بترميز JS (0 = الأحد … 6 = السبت) */
  days?: number[]
  /** مواد الحساسية: nuts | dairy | eggs | gluten | seafood | sesame */
  allergens?: string[]
  /** نمط التجهيز: daily (طازج يومياً) | order (يُحضّر بالطلب) */
  prep?: string
}

export type ListingDetails = UsedDetails & FoodDetails

/* ─── خيارات «اغراض مستعملة» ─── */
export const USED_SUBTYPES = ['furniture', 'electronics', 'appliances', 'vehicles', 'tools', 'fashion', 'study', 'other'] as const
export const USED_CONDITIONS = [
  { key: 'like-new', emoji: '✨' },
  { key: 'excellent', emoji: '👌' },
  { key: 'good', emoji: '🆗' },
  { key: 'fair', emoji: '🔧' },
  { key: 'parts', emoji: '⚠️' },
] as const

/* ─── خيارات «أكلات منزلية» ─── */
export const FOOD_MEALS = ['main', 'starters', 'bakery', 'sweets', 'drinks', 'events'] as const
export const FOOD_ALLERGENS = [
  { key: 'nuts', emoji: '🥜' },
  { key: 'dairy', emoji: '🥛' },
  { key: 'eggs', emoji: '🥚' },
  { key: 'gluten', emoji: '🌾' },
  { key: 'seafood', emoji: '🐟' },
  { key: 'sesame', emoji: '🌱' },
] as const
export const FOOD_PREPS = ['daily', 'order'] as const

/** أوقات القطع المتاحة (24h) — '' = بلا حد للطلبات */
export const FOOD_CUTOFFS = ['10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '21:00'] as const

/* ترميز الأيام: 0 = الأحد … 6 = السبت (متوافق مع Date.getDay) */
export const WEEKDAY_ORDER = [0, 1, 2, 3, 4, 5, 6] as const

/* ─── تسلسل وتفكيك سطر التفاصيل ─── */

/** يفصل سطر [[XMIX-D]] عن الوصف ويعيد التفاصيل + النص النظيف */
export function parseDetailsLine(desc: string): { details: ListingDetails | null; text: string } {
  const raw = String(desc ?? '')
  const idx = raw.indexOf(DETAILS_MARKER)
  if (idx === -1) return { details: null, text: raw }
  const rest = raw.slice(idx + DETAILS_MARKER.length)
  const nl = rest.indexOf('\n')
  const jsonPart = nl === -1 ? rest : rest.slice(0, nl)
  const after = nl === -1 ? '' : rest.slice(nl + 1)
  let details: ListingDetails | null = null
  try {
    const obj = JSON.parse(jsonPart.trim())
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      details = obj as ListingDetails
    }
  } catch {
    // JSON مفسود: نُعيد النص الأصلي كما هو حتى لا يُفقد وصف التاجر
    details = null
    return { details: null, text: raw }
  }
  const before = raw.slice(0, idx)
  const text = `${before}${after}`.replace(/^\s*\n+/, '').trim()
  return { details, text }
}

/** يبني سطر التفاصيل (بدون اسم) ليُسبق الوصف به — السطر لا يحتوي أسطراً جديدة */
export function buildDetailsLine(details: ListingDetails): string {
  return DETAILS_MARKER + JSON.stringify(details)
}

/** يزيل أي سطر تفاصيل قديم من نص التاجر (دفاعياً) */
export function stripDetailsLine(desc: string): string {
  return parseDetailsLine(desc).text
}

/* ─── تعقيم القيم قبل الحفظ (تُقص إلى القوائم المعروفة + حدود رقمية) ─── */

function clampInt(v: unknown, min: number, max: number, fallback?: number): number | undefined {
  const n = Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.floor(n)))
}

function pick(v: unknown, allowed: readonly string[]): string | undefined {
  return typeof v === 'string' && allowed.includes(v) ? v : undefined
}

/** يُعقّم تفاصيل المستعمل — يُنادى من نموذج التاجر قبل بناء السطر */
export function sanitizeUsedDetails(d: UsedDetails): UsedDetails {
  const out: UsedDetails = {}
  const sub = pick(d.sub, USED_SUBTYPES)
  if (sub) out.sub = sub
  const cond = pick(d.cond, USED_CONDITIONS.map((c) => c.key as string))
  if (cond) out.cond = cond
  const ageM = clampInt(d.ageM, 0, 600)
  if (ageM !== undefined) out.ageM = ageM
  const warrantyM = clampInt(d.warrantyM, 0, 120)
  if (warrantyM) out.warrantyM = warrantyM
  if (d.nego) out.nego = true
  return out
}

/** يُعقّم تفاصيل الأكلات المنزلية — يُنادى من نموذج التاجر قبل بناء السطر */
export function sanitizeFoodDetails(d: FoodDetails): FoodDetails {
  const out: FoodDetails = {}
  const meal = pick(d.meal, FOOD_MEALS)
  if (meal) out.meal = meal
  const portions = clampInt(d.portions, 1, 99)
  if (portions) out.portions = portions
  const cutoff = pick(d.cutoff, FOOD_CUTOFFS)
  if (cutoff) out.cutoff = cutoff
  if (Array.isArray(d.days)) {
    const days = [...new Set(d.days.map((x) => clampInt(x, 0, 6)).filter((x): x is number => x !== undefined))].sort((a, b) => a - b)
    if (days.length && days.length < 7) out.days = days
  }
  if (Array.isArray(d.allergens)) {
    const allowed = FOOD_ALLERGENS.map((a) => a.key as string)
    const allergens = d.allergens.filter((x): x is string => typeof x === 'string' && allowed.includes(x))
    if (allergens.length) out.allergens = allergens
  }
  const prep = pick(d.prep, FOOD_PREPS)
  if (prep) out.prep = prep
  return out
}

/* ─── عروض نصية جاهزة ─── */

/** اسم الحالة مع الرمز: «✨ شبه جديد» */
export function conditionLabel(cond: string | undefined, lang: Lang): string | null {
  const c = USED_CONDITIONS.find((x) => x.key === cond)
  if (!c) return null
  const labels: Record<string, { ar: string; en: string }> = {
    'like-new': t.xd.condLikeNew,
    excellent: t.xd.condExcellent,
    good: t.xd.condGood,
    fair: t.xd.condFair,
    parts: t.xd.condParts,
  }
  return `${c.emoji} ${labels[c.key][lang]}`
}

/** عمر الاستخدام بصيغة مقروءة: «7 أشهر» / «سنتان و6 أشهر» */
export function ageLabel(ageM: number | undefined, lang: Lang): string | null {
  if (!Number.isFinite(ageM) || !ageM) return null
  const m = Math.floor(Number(ageM))
  if (lang === 'ar') {
    if (m < 12) return m === 1 ? 'شهر واحد' : m === 2 ? 'شهران' : m <= 10 ? `${m} أشهر` : `${m} شهراً`
    const y = Math.floor(m / 12)
    const rem = m % 12
    const yPart = y === 1 ? 'سنة' : y === 2 ? 'سنتان' : `${y} سنوات`
    const remPart = rem === 0 ? '' : rem === 1 ? ' وشهر' : ` و${rem} أشهر`
    return `${yPart}${remPart}`
  }
  if (m < 12) return `${m} month${m > 1 ? 's' : ''}`
  const y = Math.floor(m / 12)
  const rem = m % 12
  const yPart = `${y} year${y > 1 ? 's' : ''}`
  const remPart = rem > 0 ? ` ${rem} mo` : ''
  return `${yPart}${remPart}`
}

/** تحويل «14:00» إلى «2:00 م» / «2:00 PM» */
export function formatCutoff(cutoff: string | undefined, lang: Lang): string | null {
  if (!cutoff || !/^\d{2}:\d{2}$/.test(cutoff)) return null
  const [hStr, mStr] = cutoff.split(':')
  let h = Number(hStr)
  if (!Number.isFinite(h) || h < 0 || h > 23) return null
  const ampm = h < 12 ? (lang === 'ar' ? 'ص' : 'AM') : (lang === 'ar' ? 'م' : 'PM')
  h = h % 12 === 0 ? 12 : h % 12
  const mins = mStr === '00' ? '00' : mStr
  return lang === 'ar' ? `${h}:${mins} ${ampm}` : `${h}:${mins} ${ampm}`
}

/** صيغة لطيفة لوقت القطع: «قبل 2:00 م» */
export function cutoffLabel(cutoff: string | undefined, lang: Lang): string | null {
  const time = formatCutoff(cutoff, lang)
  if (!time) return null
  return lang === 'ar' ? `قبل ${time}` : `Before ${time}`
}

/** «يومياً» أو قائمة أسماء الأيام المختصرة */
export function daysLabel(days: number[] | undefined, lang: Lang): string | null {
  if (!Array.isArray(days) || days.length === 0) return null
  if (days.length >= 7) return lang === 'ar' ? 'يومياً' : 'Daily'
  const names = lang === 'ar'
    ? ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const sorted = [...days].sort((a, b) => a - b)
  return sorted.map((d) => names[d] ?? '').filter(Boolean).join(lang === 'ar' ? '، ' : ', ')
}

/** اسم فئة الغرض المستعمل */
export function usedSubLabel(sub: string | undefined, lang: Lang): string | null {
  const subs: Record<string, { ar: string; en: string }> = {
    furniture: t.xd.subFurniture,
    electronics: t.xd.subElectronics,
    appliances: t.xd.subAppliances,
    vehicles: t.xd.subVehicles,
    tools: t.xd.subTools,
    fashion: t.xd.subFashion,
    study: t.xd.subStudy,
    other: t.xd.subOther,
  }
  if (!sub || !subs[sub]) return null
  return subs[sub][lang]
}

/** اسم نوع الوجبة */
export function mealLabel(meal: string | undefined, lang: Lang): string | null {
  const meals: Record<string, { ar: string; en: string }> = {
    main: t.xd.mealMain,
    starters: t.xd.mealStarters,
    bakery: t.xd.mealBakery,
    sweets: t.xd.mealSweets,
    drinks: t.xd.mealDrinks,
    events: t.xd.mealEvents,
  }
  if (!meal || !meals[meal]) return null
  return meals[meal][lang]
}

/** وصف الحالة التوضيحي (يظهر في النموذج وصفحة المنتج) */
export function conditionDescLabel(cond: string | undefined, lang: Lang): string | null {
  const labels: Record<string, { ar: string; en: string }> = {
    'like-new': t.xd.condDescLikeNew,
    excellent: t.xd.condDescExcellent,
    good: t.xd.condDescGood,
    fair: t.xd.condDescFair,
    parts: t.xd.condDescParts,
  }
  if (!cond || !labels[cond]) return null
  return labels[cond][lang]
}

/** شريحة حساسية واحدة: «🥜 مكسرات» — الترجمة تتضمن الرمز أصلاً */
export function allergenChip(key: string, lang: Lang): string | null {
  const labels: Record<string, { ar: string; en: string }> = {
    nuts: t.xd.alNuts,
    dairy: t.xd.alDairy,
    eggs: t.xd.alEggs,
    gluten: t.xd.alGluten,
    seafood: t.xd.alSeafood,
    sesame: t.xd.alSesame,
  }
  return labels[key] ? labels[key][lang] : null
}

/** اسم نمط التجهيز */
export function prepLabel(prep: string | undefined, lang: Lang): string | null {
  if (prep === 'daily') return t.xd.prepDaily[lang]
  if (prep === 'order') return t.xd.prepOrder[lang]
  return null
}

/** أسماء مواد الحساسية المختارة (مفصولة) */
export function allergensLabel(list: string[] | undefined, lang: Lang): string | null {
  if (!Array.isArray(list) || list.length === 0) return null
  const labels: Record<string, { ar: string; en: string }> = {
    nuts: t.xd.alNuts,
    dairy: t.xd.alDairy,
    eggs: t.xd.alEggs,
    gluten: t.xd.alGluten,
    seafood: t.xd.alSeafood,
    sesame: t.xd.alSesame,
  }
  return list.map((k) => labels[k]?.[lang]).filter(Boolean).join(lang === 'ar' ? '، ' : ', ')
}

/**
 * الشريحة المختصرة للبطاقة: أهم معلومة واحدة لكل قسم.
 * المستعمل → الحالة (✨ شبه جديد) + 💬 عند التفاوض.
 * الأكلات → وقت القطع (⏰ قبل 2:00 م) وإلا «🏠 طبخ منزلي».
 */
export function detailChip(category: string, d: ListingDetails | null, lang: Lang): string | null {
  if (!d) return null
  if (category === 'used-items') {
    const cond = conditionLabel(d.cond, lang)
    const nego = d.nego ? (lang === 'ar' ? '💬 قابل للتفاوض' : '💬 Negotiable') : null
    const parts = [cond, nego].filter(Boolean)
    if (!parts.length) return null
    return parts.join(' · ')
  }
  if (category === 'home-food') {
    const cut = cutoffLabel(d.cutoff, lang)
    if (cut) return `⏰ ${cut}`
    const prep = prepLabel(d.prep, lang)
    if (prep) return `🏠 ${prep}`
    return null
  }
  return null
}
