/**
 * geo.ts — استراتيجية «الأقرب إليك» في Xmix
 * ─────────────────────────────────────────────
 * سجل جغرافي لولايات سلطنة عُمان بإحداثيات مراكز تقريبية (كافية تماماً
 * لترتيب القرب)، مع دوال حساب المسافة (هافرساين)، ومطابقة نص الموقع
 * الحر للإحداثيات، وخوارزمية الدرجة الذكية التي ترتّب المحلات:
 *    القرب أولاً ← ثم الجودة (التقييم) ← ثم خدمة التوصيل ← ثم المميز.
 *
 * كل الدوال نقية (isomorphic) — تعمل على الخادم والواجهة.
 * بلا أي اعتماد خارجي — حسابات رياضية مباشرة.
 */

import type { Lang } from './types'

/* ───────────────────────── السجل الجغرافي ───────────────────────── */

/** المحافظات — مجموعات الالتقاط في منتقي الولاية (رُوجعت 11 محافظة رسمية بدمج شمالي/جنوبي الباطنة والشرقية) */
export const GOVERNORATES = [
  { key: 'muscat', ar: 'محافظة مسقط', en: 'Muscat' },
  { key: 'batinah', ar: 'محافظة الباطنة', en: 'Al Batinah' },
  { key: 'buraimi', ar: 'محافظة البريمي', en: 'Al Buraimi' },
  { key: 'dhahirah', ar: 'محافظة الظاهرة', en: 'Ad Dhahirah' },
  { key: 'dakhiliyah', ar: 'محافظة الداخلية', en: 'Ad Dakhiliyah' },
  { key: 'sharqiyah', ar: 'محافظة الشرقية', en: 'Ash Sharqiyah' },
  { key: 'wusta', ar: 'محافظة الوسطى', en: 'Al Wusta' },
  { key: 'dhofar', ar: 'محافظة ظفار', en: 'Dhofar' },
  { key: 'musandam', ar: 'محافظة مسندم', en: 'Musandam' },
] as const

export type GovKey = (typeof GOVERNORATES)[number]['key']

export interface Area {
  key: string
  ar: string
  en: string
  gov: GovKey
  /** إحداثيات مركز الولاية (تقريبية — للترتيب لا للملاحة) */
  lat: number
  lng: number
}

/**
 * سجل الولايات — 42 ولاية ومنطقة مأهولة تغطي السلطنة كلها.
 * الإحداثيات مراكز تقريبية من مصادر معرفة عامة، مناسبة لحساب القرب
 * وترتيب النتائج (وليست لإحداثيات عنوان دقيق — ذلك ما تلتقطه GPS).
 */
export const AREAS: readonly Area[] = [
  /* مسقط */
  { key: 'muscat', ar: 'مسقط', en: 'Muscat', gov: 'muscat', lat: 23.588, lng: 58.408 },
  { key: 'matrah', ar: 'مطرح', en: 'Muttrah', gov: 'muscat', lat: 23.586, lng: 58.548 },
  { key: 'bawshar', ar: 'بوشر', en: 'Bawshar', gov: 'muscat', lat: 23.576, lng: 58.443 },
  { key: 'seeb', ar: 'السيب', en: 'Seeb', gov: 'muscat', lat: 23.671, lng: 58.183 },
  { key: 'amerat', ar: 'العامرات', en: 'Al Amarat', gov: 'muscat', lat: 23.443, lng: 58.498 },
  { key: 'quriyat', ar: 'قريات', en: 'Quriyat', gov: 'muscat', lat: 23.265, lng: 58.925 },
  /* الباطنة */
  { key: 'barka', ar: 'بركاء', en: 'Barka', gov: 'batinah', lat: 23.677, lng: 57.895 },
  { key: 'wadi-al-maawil', ar: 'وادي المعاول', en: 'Wadi Al Maawil', gov: 'batinah', lat: 23.389, lng: 57.822 },
  { key: 'nakhal', ar: 'نخل', en: 'Nakhal', gov: 'batinah', lat: 23.422, lng: 57.872 },
  { key: 'awabi', ar: 'العوابي', en: 'Al Awabi', gov: 'batinah', lat: 23.39, lng: 57.57 },
  { key: 'rustaq', ar: 'الرستاق', en: 'Rustaq', gov: 'batinah', lat: 23.656, lng: 57.428 },
  { key: 'suwaiq', ar: 'السويق', en: 'Al Suwaiq', gov: 'batinah', lat: 23.852, lng: 57.435 },
  { key: 'khaburah', ar: 'الخابورة', en: 'Al Khaburah', gov: 'batinah', lat: 23.977, lng: 57.094 },
  { key: 'saham', ar: 'صحام', en: 'Saham', gov: 'batinah', lat: 24.17, lng: 56.75 },
  { key: 'sohar', ar: 'صحار', en: 'Sohar', gov: 'batinah', lat: 24.365, lng: 56.744 },
  { key: 'liwa', ar: 'ليوا', en: 'Liwa', gov: 'batinah', lat: 24.49, lng: 56.44 },
  { key: 'shinas', ar: 'شناص', en: 'Shinas', gov: 'batinah', lat: 24.343, lng: 56.462 },
  /* البريمي */
  { key: 'buraimi', ar: 'البريمي', en: 'Al Buraimi', gov: 'buraimi', lat: 24.344, lng: 55.785 },
  { key: 'mahdah', ar: 'محضة', en: 'Mahdah', gov: 'buraimi', lat: 24.27, lng: 55.87 },
  /* الظاهرة */
  { key: 'ibri', ar: 'إبري', en: 'Ibri', gov: 'dhahirah', lat: 23.561, lng: 56.449 },
  { key: 'yanqul', ar: 'ينقل', en: 'Yanqul', gov: 'dhahirah', lat: 23.59, lng: 56.57 },
  { key: 'dank', ar: 'ضنك', en: 'Dank', gov: 'dhahirah', lat: 23.78, lng: 56.12 },
  /* الداخلية */
  { key: 'nizwa', ar: 'نزوى', en: 'Nizwa', gov: 'dakhiliyah', lat: 22.933, lng: 57.533 },
  { key: 'bahla', ar: 'بهلاء', en: 'Bahla', gov: 'dakhiliyah', lat: 22.977, lng: 57.29 },
  { key: 'jebreen', ar: 'جبرين', en: 'Jebreen', gov: 'dakhiliyah', lat: 22.95, lng: 57.2 },
  { key: 'izki', ar: 'إزكي', en: 'Izki', gov: 'dakhiliyah', lat: 22.933, lng: 57.767 },
  { key: 'sumail', ar: 'سمائل', en: 'Sumail', gov: 'dakhiliyah', lat: 23.155, lng: 57.96 },
  { key: 'manah', ar: 'منح', en: 'Manah', gov: 'dakhiliyah', lat: 22.69, lng: 57.21 },
  { key: 'adam', ar: 'آدم', en: 'Adam', gov: 'dakhiliyah', lat: 22.53, lng: 57.23 },
  { key: 'jabal-akhdar', ar: 'الجبل الأخضر', en: 'Jebel Akhdar', gov: 'dakhiliyah', lat: 23.078, lng: 57.656 },
  /* الشرقية */
  { key: 'ibra', ar: 'إبراء', en: 'Ibra', gov: 'sharqiyah', lat: 22.933, lng: 58.133 },
  { key: 'sur', ar: 'صور', en: 'Sur', gov: 'sharqiyah', lat: 22.565, lng: 59.385 },
  { key: 'kamil-wafi', ar: 'الكامل والوافي', en: 'Al Kamil & Al Wafi', gov: 'sharqiyah', lat: 22.22, lng: 59.21 },
  { key: 'jaalan', ar: 'جعلان بني بو حسن', en: 'Jaalan Bani Bu Hassan', gov: 'sharqiyah', lat: 22.27, lng: 59.55 },
  { key: 'kareema', ar: 'كريمة ومضحى', en: 'Kareema & Mudhaybi', gov: 'sharqiyah', lat: 21.73, lng: 59.47 },
  { key: 'masirah', ar: 'مصيرة', en: 'Masirah', gov: 'sharqiyah', lat: 20.65, lng: 58.87 },
  /* الوسطى */
  { key: 'hayma', ar: 'هيما', en: 'Hima', gov: 'wusta', lat: 22.733, lng: 57.4 },
  { key: 'mahout', ar: 'محوت', en: 'Mahout', gov: 'wusta', lat: 20.47, lng: 58.19 },
  { key: 'duqm', ar: 'الدقم', en: 'Duqm', gov: 'wusta', lat: 19.696, lng: 57.704 },
  { key: 'al-jazer', ar: 'الجازر', en: 'Al Jazer', gov: 'wusta', lat: 19.13, lng: 57.55 },
  /* ظفار */
  { key: 'salalah', ar: 'صلالة', en: 'Salalah', gov: 'dhofar', lat: 17.015, lng: 54.092 },
  { key: 'taqah', ar: 'طاقة', en: 'Taqah', gov: 'dhofar', lat: 17.046, lng: 54.3 },
  { key: 'mirbat', ar: 'مرباط', en: 'Mirbat', gov: 'dhofar', lat: 16.98, lng: 54.75 },
  { key: 'sadh', ar: 'سدح', en: 'Sadh', gov: 'dhofar', lat: 17.15, lng: 55.0 },
  { key: 'thumrait', ar: 'ثامرائت', en: 'Thumrait', gov: 'dhofar', lat: 17.683, lng: 54.033 },
  { key: 'muqshin', ar: 'مقشن', en: 'Muqshin', gov: 'dhofar', lat: 17.54, lng: 54.63 },
  { key: 'rakhyut', ar: 'رخيوت', en: 'Rakhyut', gov: 'dhofar', lat: 16.75, lng: 53.52 },
  { key: 'dhalkut', ar: 'ضلكوت', en: 'Dhalkut', gov: 'dhofar', lat: 16.7, lng: 53.25 },
  /* مسندم */
  { key: 'khasab', ar: 'خصب', en: 'Khasab', gov: 'musandam', lat: 26.17, lng: 56.242 },
  { key: 'diba', ar: 'دبا', en: 'Diba', gov: 'musandam', lat: 26.2, lng: 56.33 },
  { key: 'bukha', ar: 'بخا', en: 'Bukha', gov: 'musandam', lat: 26.06, lng: 56.23 },
  { key: 'madha', ar: 'مدحاء', en: 'Madha', gov: 'musandam', lat: 25.28, lng: 56.32 },
]

/* ───────────────────────── أدوات أساسية ───────────────────────── */

/** تطبيع النص العربي: إزالة التشكيل وعلامات الترقيم وتوحيد الهمزات والألف المقصورة والة */
export function normalizeAr(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '') // تشكيل + تطويل
    .replace(/[^\p{L}\p{N}\s]/gu, ' ') // علامات الترقيم (، . : إلخ) → فراغ
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim()
}

/** هل الإحداثيات ضمن المجال الصالح عالمياً (وتحديداً حول سلطنة عُمان برحابة)؟ */
export function validCoords(lat: unknown, lng: unknown): lat is number {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return false
  // صندوق فضفاض حول عُمان (يشمل البحر الإقليمي) — يمنع قيماً عبثية من GPS فاسد
  return lat > 10 && lat < 32 && lng > 45 && lng < 65
}

/**
 * المسافة بين نقطتين بالكيلومترات — صيغة هافرساين على كرة نصف قطرها 6371كم.
 * أعادت للعلم العشري الواحد؛ تُرجع null لأي مدخل فاسد.
 */
export function haversineKm(
  aLat: number, aLng: number, bLat: number, bLng: number,
): number | null {
  if (!validCoords(aLat, aLng) || !validCoords(bLat, bLng)) return null
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  const d = 2 * R * Math.asin(Math.min(1, Math.sqrt(s)))
  return Math.round(d * 10) / 10
}

export function areaByKey(key: string | null | undefined): Area | null {
  if (!key) return null
  return AREAS.find((a) => a.key === key) ?? null
}

/** أقرب ولاية مسجلة لنقطة — تستخدم لربط إحداثيات GPS المجردة بلاية قابلة للعرض */
export function findNearestArea(lat: number, lng: number): { area: Area; distanceKm: number } | null {
  if (!validCoords(lat, lng)) return null
  let best: Area | null = null
  let bestD = Number.POSITIVE_INFINITY
  for (const a of AREAS) {
    const d = haversineKm(lat, lng, a.lat, a.lng)
    if (d !== null && d < bestD) {
      bestD = d
      best = a
    }
  }
  return best ? { area: best, distanceKm: bestD } : null
}

/**
 * مطابقة نص موقع حرّ (مثل «سوق الموز، مسقط» أو «Sohar») بولاية السجل.
 * تفوز المطابقة بالاسم الأطول (أدق)، وتطبيع النص العربي قبل المقارنة.
 */
export function matchAreaFromText(text: string | null | undefined): Area | null {
  if (!text || typeof text !== 'string') return null
  const hay = normalizeAr(text)
  if (!hay) return null
  let best: Area | null = null
  let bestLen = 0
  for (const a of AREAS) {
    const ar = normalizeAr(a.ar)
    const en = normalizeAr(a.en)
    const candidates = [ar, en]
    for (const c of candidates) {
      if (c && hay.includes(c) && c.length > bestLen) {
        best = a
        bestLen = c.length
      }
    }
  }
  return best
}

/* ───────────────────────── خوارزمية الترتيب ───────────────────────── */

/**
 * أوزان الدرجة — معايرة استراتيجية:
 *   القرب (حتى 30كم) يملك الوزن الأكبر 6 نقاط، الجودة (التقييم/5) 4 نقاط،
 *   +1.2 لمن يوفر التوصيل، +0.3 للمميز. بدون إحداثيات: الدرجة من الجودة فقط
 *   وتُعرض آخراً. المجموع الأقصى ≈ 11.5
 */
export const NEARBY_WEIGHTS = {
  /** المسافة التي تنتهي عندها ميزة القرب تماماً (كم) */
  relevanceKm: 30,
  weightDistance: 6,
  weightRating: 4,
  bonusDelivery: 1.2,
  bonusFeatured: 0.3,
  /** عتبات شرائط القرب المعروضة */
  stepsKm: 5,
  nearKm: 15,
  midKm: 40,
} as const

export interface NearbyScorable {
  distanceKm?: number | null
  rating: number
  hasDelivery?: boolean | null
  isFeatured?: boolean | null
}

/** درجة ترتيب المحل في «الأقرب إليك» — أعلى = أفضل عرضاً */
export function nearbyScore(o: NearbyScorable): number {
  let score = (Math.max(0, Math.min(5, o.rating)) / 5) * NEARBY_WEIGHTS.weightRating
  if (o.hasDelivery) score += NEARBY_WEIGHTS.bonusDelivery
  if (o.isFeatured) score += NEARBY_WEIGHTS.bonusFeatured
  if (typeof o.distanceKm === 'number' && Number.isFinite(o.distanceKm)) {
    const rel = Math.max(0, Math.min(1, 1 - o.distanceKm / NEARBY_WEIGHTS.relevanceKm))
    score += rel * NEARBY_WEIGHTS.weightDistance
  }
  return Math.round(score * 100) / 100
}

/** شريط القرب — نص وصنف لوني للعرض */
export function distanceBucket(km: number | null | undefined, lang: Lang): { label: string; cls: string } | null {
  if (typeof km !== 'number' || !Number.isFinite(km)) return null
  const w = NEARBY_WEIGHTS
  if (km <= w.stepsKm)
    return { label: lang === 'ar' ? '📍 على بُعد خطوات' : '📍 Walking distance', cls: 'bg-emerald-500/15 text-emerald-400' }
  if (km <= w.nearKm)
    return { label: lang === 'ar' ? '🚴 قريب منك' : '🚴 Nearby', cls: 'bg-sky-500/15 text-sky-400' }
  if (km <= w.midKm)
    return { label: lang === 'ar' ? '🚗 داخل الولاية والمحيط' : '🚗 Within the region', cls: 'bg-amber-500/15 text-amber-400' }
  return { label: lang === 'ar' ? '🗺️ بعيد نسبياً' : '🗺️ Far', cls: 'bg-secondary text-muted-foreground' }
}

/** تنسيق المسافة: «2.4 كم» / «2.4 km» — وأقل من مئتي متر «دونك تقريباً» */
export function formatKm(km: number | null | undefined, lang: Lang): string {
  if (typeof km !== 'number' || !Number.isFinite(km)) return ''
  if (km < 0.2) return lang === 'ar' ? 'دونك تقريباً' : '≈ 200 m'
  const n = km >= 100 ? Math.round(km) : Math.round(km * 10) / 10
  return lang === 'ar' ? `${n} كم` : `${n} km`
}

/* ───────────────────────── تعقيم تحديث الموقع ───────────────────────── */

/** حقول الموقع القابلة للكتابة في Prisma (الشركات) — بعد التعقيم */
export interface GeoUpdate {
  lat?: number | null
  lng?: number | null
  cityKey?: string | null
  hasDelivery?: boolean
  deliveryFee?: number | null
  deliveryEta?: number | null
}

const AREA_KEYS = new Set(AREAS.map((a) => a.key))

/**
 * تعقيم حمولة الموقع الواردة من اللوحات (تاجر أو مسؤول) قبل كتابتها.
 * يقبل الأرقام كسلاسل (من الحقول)، يفرض ثنائية lat/lng معاً، يتحقق من
 * مفتاح الولاية ضد السجل، ويحدّ الرسوم والزمن، ويستنتج الولاية من GPS
 * إذا لم تُرسل صراحة. يعيد بيانات نظيفة أو رسالة خطأ ثنائية اللغة.
 */
export function sanitizeGeoUpdate(
  body: unknown,
): { data: GeoUpdate; error: null } | { data: null; error: string } {
  if (typeof body !== 'object' || body === null) return { data: null, error: 'حمولة غير صالحة | Invalid payload' }
  const b = body as Record<string, unknown>
  const data: GeoUpdate = {}

  /* الإحداثيات — ثنائية دائماً */
  const hasLat = b.lat !== undefined
  const hasLng = b.lng !== undefined
  if (hasLat !== hasLng)
    return { data: null, error: 'خط العرض والطول معاً فقط | Send lat & lng together' }
  if (hasLat && hasLng) {
    const lat = typeof b.lat === 'number' ? b.lat : Number(b.lat)
    const lng = typeof b.lng === 'number' ? b.lng : Number(b.lng)
    if (!validCoords(lat, lng))
      return { data: null, error: 'إحداثيات غير صالحة | Invalid coordinates' }
    data.lat = lat
    data.lng = lng
  }

  /* الولاية — من السجل فقط، أو استنتاجها من الإحداثيات */
  if (b.cityKey !== undefined) {
    if (b.cityKey === null || b.cityKey === '') data.cityKey = null
    else if (typeof b.cityKey === 'string' && AREA_KEYS.has(b.cityKey)) data.cityKey = b.cityKey
    else return { data: null, error: 'ولاية غير معروفة | Unknown area' }
  } else if (data.lat !== undefined && data.lng !== undefined) {
    const near = findNearestArea(data.lat as number, data.lng as number)
    if (near) data.cityKey = near.area.key
  }

  /* خدمة التوصيل */
  if (b.hasDelivery !== undefined) {
    if (typeof b.hasDelivery !== 'boolean')
      return { data: null, error: 'قيمة التوصيل غير صالحة | Invalid delivery flag' }
    data.hasDelivery = b.hasDelivery
  }

  /* رسوم التوصيل — 0..100 ر.ع أو إلغاء */
  if (b.deliveryFee !== undefined) {
    if (b.deliveryFee === null || b.deliveryFee === '') data.deliveryFee = null
    else {
      const fee = typeof b.deliveryFee === 'number' ? b.deliveryFee : Number(b.deliveryFee)
      if (!Number.isFinite(fee) || fee < 0 || fee > 100)
        return { data: null, error: 'الرسوم بين 0 و 100 ر.ع | Fee must be 0–100 OMR' }
      data.deliveryFee = Math.round(fee * 1000) / 1000
    }
  }

  /* زمن التوصيل — 5..720 دقيقة أو إلغاء */
  if (b.deliveryEta !== undefined) {
    if (b.deliveryEta === null || b.deliveryEta === '') data.deliveryEta = null
    else {
      const eta = typeof b.deliveryEta === 'number' ? b.deliveryEta : Number(b.deliveryEta)
      if (!Number.isFinite(eta) || eta < 5 || eta > 720)
        return { data: null, error: 'الزمن بين 5 و 720 دقيقة | ETA must be 5–720 minutes' }
      data.deliveryEta = Math.floor(eta)
    }
  }

  if (Object.keys(data).length === 0)
    return { data: null, error: 'لا حقول موقع لتحديثها | No geo fields to update' }
  return { data, error: null }
}
