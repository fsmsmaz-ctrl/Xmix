'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp } from 'lucide-react'
import { useXmix } from '@/store/xmix'
import { t } from '@/lib/i18n'
import type { Company, Product } from '@/lib/types'
import { Header } from '@/components/xmix/Header'
import { Footer } from '@/components/xmix/Footer'
import { HomeView } from '@/components/xmix/HomeView'
import { ShopView } from '@/components/xmix/ShopView'
import { CompaniesView } from '@/components/xmix/CompaniesView'
import { CompanyView } from '@/components/xmix/CompanyView'
import { ProductView } from '@/components/xmix/ProductView'
import { CartView } from '@/components/xmix/CartView'
import { CheckoutView, SuccessView } from '@/components/xmix/CheckoutView'
import { OrdersView } from '@/components/xmix/OrdersView'
import { DashboardView } from '@/components/xmix/DashboardView'
import { AdminView } from '@/components/xmix/AdminView'
import { AboutView } from '@/components/xmix/AboutView'
import { ContactView } from '@/components/xmix/ContactView'
import { JoinView } from '@/components/xmix/JoinView'
import { AuthModal } from '@/components/xmix/AuthModal'
import { OnboardingModal } from '@/components/xmix/OnboardingModal'
import { SkeletonStore, ErrorBlock } from '@/components/xmix/shared'

/** Floating back-to-top button — appears after scrolling down. */
function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          initial={{ opacity: 0, scale: 0.6, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6, y: 10 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Back to top"
          className="fixed bottom-5 end-5 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-violet-900/40 transition hover:bg-primary/90"
        >
          <ArrowUp size={18} />
        </motion.button>
      )}
    </AnimatePresence>
  )
}

export default function XmixPage() {
  const lang = useXmix((s) => s.lang)
  const setLang = useXmix((s) => s.setLang)
  const setUser = useXmix((s) => s.setUser)
  const view = useXmix((s) => s.view)

  const [companies, setCompanies] = useState<Company[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  // Fetch storefront data. `silent` updates the lists without the loading
  // skeleton (used when re-validating on navigation).
  const loadData = useCallback(async (silent: boolean) => {
    if (!silent) {
      setLoading(true)
      setFailed(false)
    }
    try {
      const [cRes, pRes] = await Promise.all([
        fetch('/api/companies', { cache: 'no-store' }),
        fetch('/api/products', { cache: 'no-store' }),
      ])
      const [cData, pData] = await Promise.all([cRes.json(), pRes.json()])
      setCompanies(cData.companies ?? [])
      setProducts(pData.products ?? [])
    } catch {
      // Keep the previous (possibly non-empty) lists on a background refresh failure
      if (!silent) setFailed(true)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  // init: language from persisted store + fetch session + data
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang

    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => d.user && setUser(d.user))
      .catch(() => {})

    void loadData(false)
  }, [loadData])

  // BUG-FIX (stale storefront): data used to be fetched ONLY once on mount,
  // so products/companies created later in the dashboard (same SPA session)
  // never appeared in the shop or the homepage until a full page reload.
  // Re-validate silently whenever the user lands on a data-driven view.
  const viewName = view.name
  const skipInitialRef = useRef(true)
  useEffect(() => {
    if (skipInitialRef.current) {
      skipInitialRef.current = false
      return
    }
    if (viewName === 'home' || viewName === 'shop' || viewName === 'companies' || viewName === 'company' || viewName === 'product') {
      void loadData(true)
    }
  }, [viewName, loadData])

  const company = 'slug' in view ? companies.find((c) => c.slug === (view as { slug: string }).slug) : undefined

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={view.name + ('id' in view ? view.id : '') + ('slug' in view ? view.slug : '')}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {loading ? (
              <SkeletonStore />
            ) : failed ? (
              <ErrorBlock label={t.misc.errorLoad[lang]} />
            ) : view.name === 'home' ? (
              <HomeView companies={companies} products={products} />
            ) : view.name === 'shop' ? (
              <ShopView companies={companies} products={products} />
            ) : view.name === 'companies' ? (
              <CompaniesView companies={companies} />
            ) : view.name === 'company' ? (
              company ? (
                <CompanyView company={company} products={products} />
              ) : (
                <ErrorBlock label={t.filters.noResults[lang]} />
              )
            ) : view.name === 'product' ? (
              <ProductView productId={view.id} companies={companies} products={products} />
            ) : view.name === 'cart' ? (
              <CartView />
            ) : view.name === 'checkout' ? (
              <CheckoutView />
            ) : view.name === 'success' ? (
              <SuccessView orderNumber={view.orderNumber} />
            ) : view.name === 'orders' ? (
              <OrdersView />
            ) : view.name === 'dashboard' ? (
              <DashboardView />
            ) : view.name === 'admin' ? (
              <AdminView />
            ) : view.name === 'about' ? (
              <AboutView />
            ) : view.name === 'contact' ? (
              <ContactView />
            ) : view.name === 'join' ? (
              <JoinView />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer companies={companies} />
      <AuthModal />
      <OnboardingModal />
      <BackToTop />
    </div>
  )
}
