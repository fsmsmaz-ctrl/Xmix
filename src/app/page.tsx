'use client'

import { useEffect, useState } from 'react'
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

  // init: language from persisted store + fetch session + data
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang

    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => d.user && setUser(d.user))
      .catch(() => {})

    let cancelled = false
    Promise.all([
      fetch('/api/companies').then((r) => r.json()),
      fetch('/api/products').then((r) => r.json()),
    ])
      .then(([cData, pData]) => {
        if (cancelled) return
        setCompanies(cData.companies ?? [])
        setProducts(pData.products ?? [])
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setFailed(true)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

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
      <BackToTop />
    </div>
  )
}
