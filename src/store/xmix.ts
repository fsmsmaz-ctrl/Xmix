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
}

export const DEFAULT_FILTERS: ShopFilters = {
  q: '', company: '', category: '', minPrice: '', maxPrice: '', sort: 'featured',
}

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
    }),
    {
      name: 'xmix-store',
      partialize: (s) => ({ lang: s.lang, cart: s.cart }),
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
