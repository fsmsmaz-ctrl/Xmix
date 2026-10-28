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
export const INTERESTS_VERSION = 1
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

export function cartTotals(cart: CartItem[]) {
  const subtotal = cart.reduce((sum, c) => sum + c.price * c.qty, 0)
  const shipping = subtotal === 0 ? 0 : subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE
  return { subtotal, shipping, total: subtotal + shipping }
}

export function fmtPrice(value: number, lang: Lang): string {
  const num = value.toFixed(3)
  return lang === 'ar' ? `${num} ر.ع.` : `OMR ${num}`
}
