'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, Lang, SessionUser } from '@/lib/types'

export type View =
  | { name: 'home' }
  | { name: 'shop' }
  | { name: 'companies' }
  | { name: 'company'; slug: string }
  | { name: 'product'; id: string }
  | { name: 'cart' }
  | { name: 'checkout' }
  | { name: 'success'; orderNumber: string }
  | { name: 'orders' }
  | { name: 'dashboard' }
  | { name: 'admin' }
  | { name: 'about' }
  | { name: 'contact' }
  | { name: 'join' }

export interface ShopFilters {
  q: string
  company: string
  category: string
  kind: '' | 'product' | 'service'
  minPrice: string
  maxPrice: string
  sort: 'featured' | 'priceAsc' | 'priceDesc' | 'rating'
}

interface XmixState {
  lang: Lang
  setLang: (lang: Lang) => void

  view: View
  navigate: (view: View) => void

  cart: CartItem[]
  addToCart: (item: Omit<CartItem, 'qty'>, qty?: number) => void
  removeFromCart: (productId: string) => void
  setQty: (productId: string, qty: number) => void
  clearCart: () => void

  user: SessionUser | null
  setUser: (u: SessionUser | null) => void

  authOpen: boolean
  authMode: 'login' | 'register'
  openAuth: (mode?: 'login' | 'register') => void
  closeAuth: () => void

  shopFilters: ShopFilters
  setShopFilters: (f: Partial<ShopFilters>) => void
  resetShopFilters: () => void

  /* اهتمامات الزبون — تُجمع من نافذة الترحيب وتُستخدم لعرض «مختارات لك» */
  interests: string[]
  /** هل أجاب الزبون على نافذة الاهتمامات مرة واحدة على الأقل (أو تخطاها)؟ */
  interestsTouched: boolean
  /** إصدار خيارات الاهتمامات — رفعه يجعل النافذة تظهر مجدداً للجميع */
  interestsVersion: number
  /** آخر مرة ظهرت فيها النافذة/التنبيه (للتذكير الدوري كل 14 يوماً) */
  interestsPromptedAt: number
  interestsStale: boolean
  interestsModalOpen: boolean
  openInterests: () => void
  closeInterests: () => void
  saveInterests: (cats: string[]) => void
  skipInterests: () => void
  dismissStaleBanner: () => void
  refreshStale: () => void
}

export const DEFAULT_FILTERS: ShopFilters = {
  q: '', company: '', category: '', kind: '', minPrice: '', maxPrice: '', sort: 'featured',
}

/** ارفع الرقم عند تعديل خيارات الاهتمامات لتظهر نافذة الترحيب مجدداً للزبائن القدامى */
/* v2: أُضيف قسما اغراض مستعملة ♻️ والأكلات المنزلية 🍲 لخيارات الاهتمامات */
export const INTERESTS_VERSION = 2
/** بعد هذه المدة يظهر تنبيه لطيف لتحديث الاهتمامات (14 يوماً) */
export const INTERESTS_STALE_MS = 14 * 24 * 60 * 60 * 1000

export const useXmix = create<XmixState>()(
  persist(
    (set, get) => ({
      lang: 'ar',
      setLang: (lang) => {
        set({ lang })
        if (typeof document !== 'undefined') {
          document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
          document.documentElement.lang = lang
        }
      },

      view: { name: 'home' },
      navigate: (view) => {
        set({ view })
        if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
      },

      cart: [],
      addToCart: (item, qty = 1) => {
        // حماية إضافية: صنف مخزونه 0 (أو سالب) لا يُضاف إطلاقاً
        if (item.stock <= 0) return
        const cart = get().cart
        const existing = cart.find((c) => c.productId === item.productId)
        if (existing) {
          set({
            cart: cart.map((c) =>
              c.productId === item.productId
                ? { ...c, qty: Math.min(c.qty + qty, c.stock) }
                : c
            ),
          })
        } else {
          set({ cart: [...cart, { ...item, qty: Math.min(qty, item.stock) }] })
        }
      },
      removeFromCart: (productId) =>
        set({ cart: get().cart.filter((c) => c.productId !== productId) }),
      setQty: (productId, qty) =>
        set({
          cart: get()
            .cart.map((c) =>
              c.productId === productId
                ? { ...c, qty: Math.max(1, Math.min(qty, c.stock)) }
                : c
            ),
        }),
      clearCart: () => set({ cart: [] }),

      user: null,
      setUser: (user) => set({ user }),

      authOpen: false,
      authMode: 'login',
      openAuth: (mode = 'login') => set({ authOpen: true, authMode: mode }),
      closeAuth: () => set({ authOpen: false }),

      shopFilters: DEFAULT_FILTERS,
      setShopFilters: (f) => set({ shopFilters: { ...get().shopFilters, ...f } }),
      resetShopFilters: () => set({ shopFilters: DEFAULT_FILTERS }),

      interests: [],
      interestsTouched: false,
      interestsVersion: 0,
      interestsPromptedAt: 0,
      interestsStale: false,
      interestsModalOpen: false,
      openInterests: () => set({ interestsModalOpen: true }),
      closeInterests: () => set({ interestsModalOpen: false }),
      saveInterests: (cats) =>
        set({
          interests: cats,
          interestsTouched: true,
          interestsVersion: INTERESTS_VERSION,
          interestsPromptedAt: Date.now(),
          interestsStale: false,
          interestsModalOpen: false,
        }),
      skipInterests: () =>
        set({
          interestsTouched: true,
          interestsVersion: INTERESTS_VERSION,
          interestsPromptedAt: Date.now(),
          interestsModalOpen: false,
        }),
      dismissStaleBanner: () =>
        set({ interestsStale: false, interestsPromptedAt: Date.now() }),
      refreshStale: () => {
        const s = get()
        set({
          interestsStale:
            s.interestsTouched && Date.now() - s.interestsPromptedAt > INTERESTS_STALE_MS,
        })
      },
    }),
    {
      name: 'xmix-store',
      partialize: (s) => ({
        lang: s.lang,
        cart: s.cart,
        interests: s.interests,
        interestsTouched: s.interestsTouched,
        interestsVersion: s.interestsVersion,
        interestsPromptedAt: s.interestsPromptedAt,
      }),
    }
  )
)

export const FREE_SHIPPING_THRESHOLD = 50
export const SHIPPING_FEE = 2

/**
 * مزامنة السلة المحفوظة في المتصفح مع الواقع على الخادم (BUG-FIX: سلة قديمة):
 * سعر تغيّر، أو مخزون نقص، أو صنف حُذف/صار محله غير منشور — تُصحّح السلة
 * قبل الدفع حتى لا يُحاسَب الزبون مبلغاً مختلفاً عمّا يراه.
 * تعيد true إذا عُدّل شيء (لتُظهر الواجهة تنبيهاً لطيفاً).
 */
export async function reconcileCart(): Promise<boolean> {
  const cart = useXmix.getState().cart
  if (cart.length === 0) return false
  try {
    const ids = cart.map((c) => c.productId).join(',')
    const res = await fetch(`/api/products?ids=${encodeURIComponent(ids)}`, { cache: 'no-store' })
    if (!res.ok) return false
    const data = (await res.json()) as {
      products?: Array<{ id: string; price: number; stock: number }>
    }
    const fresh = data.products ?? []
    const map = new Map(fresh.map((p) => [p.id, p]))
    let changed = false
    const next: CartItem[] = []
    for (const c of cart) {
      const p = map.get(c.productId)
      // الصنف حُذف أو محله لم يعد منشوراً أو نفد مخزونه → يُسقط من السلة
      if (!p || p.stock <= 0) {
        changed = true
        continue
      }
      const price = p.price !== c.price ? p.price : c.price
      const qty = Math.min(c.qty, p.stock)
      if (price !== c.price || qty !== c.qty) changed = true
      next.push({ ...c, price, qty })
    }
    if (changed) useXmix.setState({ cart: next })
    return changed
  } catch {
    // فشل الشبكة: نترك السلة كما هي — الخادم يبقى مصدر الحقيقة عند الطلب
    return false
  }
}

export function cartTotals(cart: CartItem[]) {
  const subtotal = cart.reduce((sum, c) => sum + c.price * c.qty, 0)
  // BUG-FIX (money integrity): التوصيل يُحسب على البضائع المادية فقط —
  // الخدمات (حجوزات/عمالة باليومية) لا تُشحن أصلاً، وكانت تُحاسَب رسوم توصيل.
  // السلات المحفوظة قبل إضافة kind تُعامل كمنتجات (سلوك قديم متوافق).
  const goodsSubtotal = cart.reduce(
    (sum, c) => (c.kind === 'service' ? sum : sum + c.price * c.qty),
    0,
  )
  const shipping =
    goodsSubtotal === 0 ? 0 : goodsSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE
  return { subtotal, shipping, total: subtotal + shipping }
}

export function fmtPrice(value: number, lang: Lang): string {
  const num = value.toFixed(3)
  return lang === 'ar' ? `${num} ر.ع.` : `OMR ${num}`
}
