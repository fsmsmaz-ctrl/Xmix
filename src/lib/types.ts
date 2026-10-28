export type Lang = 'ar' | 'en'

export interface Company {
  id: string
  slug: string
  nameAr: string
  nameEn: string
  taglineAr: string
  taglineEn: string
  descAr: string
  descEn: string
  category: string
  emoji: string
  color: string
  gradient: string
  locationAr: string
  locationEn: string
  rating: number
  isFeatured: boolean
  /** pending = بانتظار اعتماد المسؤول | active = معتمدة | suspended = موقوفة */
  status: 'pending' | 'active' | 'suspended'
  joinedAt: string
  _count?: { products: number }
}

export interface Product {
  id: string
  companyId: string
  nameAr: string
  nameEn: string
  descAr: string
  descEn: string
  price: number
  oldPrice: number | null
  emoji: string
  gradient: string
  category: string
  /** 'product' = منتج مادي (مخزون) | 'service' = خدمة (حجز/طلب، مخزون = طاقة استيعابية) */
  kind: 'product' | 'service'
  stock: number
  rating: number
  reviews: number
  badgeAr: string | null
  badgeEn: string | null
  isBestSeller: boolean
  image: string | null
  images: string[] | null
  createdAt: string
}

/** Ordered gallery: main image first, then additional shots. */
export function productGallery(p: Pick<Product, 'image' | 'images'>): string[] {
  const rest = Array.isArray(p.images) ? p.images : []
  return [p.image, ...rest].filter((u): u is string => !!u)
}

export interface CartItem {
  productId: string
  companyId: string
  nameAr: string
  nameEn: string
  emoji: string
  gradient: string
  price: number
  qty: number
  stock: number
  companyAr: string
  companyEn: string
}

export interface OrderItemData {
  nameAr: string
  nameEn: string
  emoji: string
  price: number
  qty: number
  productId?: string
  companyId?: string
  companyAr?: string
  companyEn?: string
}

export interface SessionUser {
  id: string
  email: string
  name: string
  role?: string
  companyId?: string | null
  company?: { nameAr: string; nameEn: string; slug: string; emoji: string; gradient: string } | null
  createdAt: string
}

/* ───────────────────────── نظام مسؤول النظام ───────────────────────── */

export interface SystemUser {
  id: string
  name: string
  email: string
  role: 'customer' | 'owner' | 'admin'
  createdAt: string
  ordersCount: number
  company: { id: string; nameAr: string; nameEn: string; slug: string; status: string } | null
}

export interface SystemCompany {
  id: string
  slug: string
  nameAr: string
  nameEn: string
  category: string
  emoji: string
  gradient: string
  locationAr: string
  locationEn: string
  status: 'pending' | 'active' | 'suspended'
  isFeatured: boolean
  joinedAt: string
  productsCount: number
  owners: { id: string; name: string; email: string }[]
}

export interface SystemJoinRequest {
  id: string
  companyName: string
  category: string
  city: string
  contactName: string
  email: string
  phone: string
  description: string
  status: 'new' | 'approved' | 'rejected'
  createdAt: string
}

export interface SystemOrder {
  id: string
  orderNumber: string
  customerName: string
  phone: string
  city: string
  address: string
  status: string
  paymentMethod: string
  subtotal: number
  shipping: number
  total: number
  createdAt: string
  user: { name: string; email: string } | null
  items: { nameAr: string; nameEn: string; emoji: string; price: number; qty: number; companyAr: string | null; companyEn: string | null }[]
}

export interface SystemOverview {
  usersTotal: number
  customersCount: number
  ownersCount: number
  companiesActive: number
  companiesPending: number
  companiesSuspended: number
  productsCount: number
  ordersCount: number
  ordersPending: number
  revenue: number
  joinRequestsNew: number
  messagesNew: number
}

export interface AdminStats {
  productCount: number
  stockTotal: number
  stockValue: number
  lowStock: number
  revenue: number
  unitsSold: number
  ordersCount: number
  recent: { orderNumber: string; customerName: string; status: string; createdAt: string; myTotal: number }[]
}

export interface AdminOrder {
  id: string
  orderNumber: string
  customerName: string
  phone: string
  city: string
  status: string
  createdAt: string
  items: { nameAr: string; nameEn: string; emoji: string; price: number; qty: number }[]
  myTotal: number
}

/* أقسام السوق — أنواع الغرض الزراعي أولاً (محصول/منتج/بذور/محليات + خدمات وعمالة زراعية) ثم الأسواق الطازجة والحياة اليومية ثم بقية الأقسام */
export const CATEGORIES = [
  { key: 'agri-crops', ar: 'محاصيل زراعية', en: 'Agricultural Crops', emoji: '🌾' },
  { key: 'agri-products', ar: 'منتجات زراعية', en: 'Agricultural Products', emoji: '🧺' },
  { key: 'seeds', ar: 'بذور', en: 'Seeds', emoji: '🌱' },
  { key: 'local-products', ar: 'منتجات محلية', en: 'Local Products', emoji: '🫒' },
  { key: 'agri-services', ar: 'خدمات زراعية', en: 'Agricultural Services', emoji: '🚜' },
  { key: 'agri-labor', ar: 'عمالة زراعية باليومية', en: 'Farm Labor (Daily)', emoji: '👷' },
  { key: 'fresh-fish', ar: 'أسماك طازجة', en: 'Fresh Fish', emoji: '🐟' },
  { key: 'animals', ar: 'حيوانات ومواشي', en: 'Animals & Livestock', emoji: '🐑' },
  { key: 'cafe', ar: 'كافيهات وقهوة', en: 'Cafés & Coffee', emoji: '☕' },
  { key: 'grocery', ar: 'بقالة وطعام', en: 'Grocery & Food', emoji: '🛒' },
  { key: 'home', ar: 'منزل ومعيشة', en: 'Home & Living', emoji: '🏠' },
  { key: 'electronics', ar: 'إلكترونيات', en: 'Electronics', emoji: '📱' },
  { key: 'fashion', ar: 'أزياء وملابس', en: 'Fashion', emoji: '👗' },
  { key: 'beauty', ar: 'جمال وعناية', en: 'Beauty & Care', emoji: '💄' },
  { key: 'services', ar: 'خدمات', en: 'Services', emoji: '🛠️' },
] as const

/* العائلة الزراعية والمحلية — تُبرز كسوق متخصص في الرئيسية وتُعرض كفلتر جاهز في المتجر */
export const AGRI_CATEGORY_KEYS: readonly string[] = [
  'agri-crops', 'agri-products', 'seeds', 'local-products', 'agri-services', 'agri-labor',
]

/** الأقسام الزراعية المادية (محصول/منتج/بذور/محليات) — بضاعة تُباع بالمخزون */
export const AGRI_GOODS_KEYS: readonly string[] = ['agri-crops', 'agri-products', 'seeds', 'local-products']

/** الأقسام الزراعية الخدمية (خدمة زراعية / عمالة باليومية) — تُطلب بالحجز ولا تُخصم منها أكمية */
export const AGRI_SERVICE_KEYS: readonly string[] = ['agri-services', 'agri-labor']

/** الأقسام المادية حصراً — تُباع بالمخزون ولا تقبل نوع «خدمة» (تشمل الزراعية المادية + الأسماك والحيوانات والكافيهات) */
export const GOODS_ONLY_KEYS: readonly string[] = [...AGRI_GOODS_KEYS, 'fresh-fish', 'animals', 'cafe']

/** قيمة فلتر جاهزة في المتجر: عرض كل الأقسام الزراعية والمحلية معاً */
export const AGRI_FILTER_PRESET = 'agri'

/** هل المفتاح ضمن العائلة الزراعية والمحلية؟ */
export function isAgriCategory(v: string): boolean {
  return AGRI_CATEGORY_KEYS.includes(v)
}

/** نوع العرض الملزم للقسم — '' إذا كان القسم حرّاً (المنتج/الخدمة كلاهما مسموح) */
export function kindForCategory(category: string): 'product' | 'service' | '' {
  if (AGRI_SERVICE_KEYS.includes(category)) return 'service'
  if (GOODS_ONLY_KEYS.includes(category)) return 'product'
  return ''
}

/** التصنيف الافتراضي القديم — منتجات/محلات أُنشئت دون قسم صريح */
export const GENERAL_CATEGORY = 'general'

/** كل قيم الأقسام المقبولة في الـ API: أقسام الواجهة + 'general' القديم */
export const CATEGORY_KEYS: readonly string[] = [GENERAL_CATEGORY, ...CATEGORIES.map((c) => c.key)]

/** هل القيمة قسماً معروفاً؟ تُستخدم للتحقق في مسارات الـ API */
export function isKnownCategory(v: unknown): boolean {
  return typeof v === 'string' && CATEGORY_KEYS.includes(v)
}

/** تسمية ثنائية اللغة لأي مفتاح قسم (يشمل 'general' والقيم المجهولة) */
export function categoryLabel(key: string, lang: Lang): string {
  if (key === GENERAL_CATEGORY) return lang === 'ar' ? '🏬 عام' : '🏬 General'
  if (key === AGRI_FILTER_PRESET) return lang === 'ar' ? '🌾 السوق الزراعي والمحلي' : '🌾 Agri & Local Market'
  const c = CATEGORIES.find((x) => x.key === key)
  return c ? `${c.emoji} ${lang === 'ar' ? c.ar : c.en}` : key
}

/* نوع العرض — الركيزتان الأساسيتان للمتجر (التوصيل ركيزة ثالثة مدمجة في الطلب) */
export const PRODUCT_KINDS = [
  { key: 'product', ar: 'منتج', en: 'Product', emoji: '📦' },
  { key: 'service', ar: 'خدمة', en: 'Service', emoji: '🛠️' },
] as const

export type ProductKind = (typeof PRODUCT_KINDS)[number]['key']
