/**
 * seed.ts — clean-start seed (matches database/setup-database.sql):
 *   • flagship "Xmix Main Store" shelf (no demo products)
 *   • system admin account
 *   • flagship store merchant (owner) account
 *
 * Wipes other data first (safe to re-run). Run with: npm run db:seed
 *
 * ⚠️ CHANGE THE DEFAULT PASSWORDS after first login (or edit them here
 * before seeding a production database).
 */
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const db = new PrismaClient({ log: ['error'] })

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

async function main() {
  console.log('Seeding clean start …')

  // Order matters (FKs): items → orders → images → products → users → companies → requests/messages
  await db.orderItem.deleteMany()
  await db.order.deleteMany()
  await db.productImage.deleteMany()
  await db.product.deleteMany()
  await db.user.deleteMany()
  await db.company.deleteMany()
  await db.joinRequest.deleteMany()
  await db.contactMessage.deleteMany()

  const company = await db.company.create({
    data: {
      slug: 'xmix-main',
      nameAr: 'محل Xmix الرئيسي',
      nameEn: 'Xmix Main Store',
      taglineAr: 'كل ما تحتاجه — منتجات وخدمات وتوصيل سريع',
      taglineEn: 'Everything you need — products, services and fast delivery',
      descAr: 'محل Xmix الرئيسي هو الرفّ الرئيسي والشركة الرائدة في سوق Xmix التجاري العام — منتجات وخدمات متنوعة مع خدمة توصيل تغطي سلطنة عُمان.',
      descEn: 'Xmix Main Store is the flagship shelf of Xmix — Oman’s general marketplace for diverse products and services with delivery across the Sultanate.',
      category: 'general',
      emoji: '🏬',
      color: '#8B5CF6',
      gradient: 'linear-gradient(135deg,#7C3AED 0%,#4C1D95 100%)',
      locationAr: 'مسقط، سلطنة عُمان',
      locationEn: 'Muscat, Oman',
      rating: 4.9,
      isFeatured: true,
      status: 'active',
    },
  })

  await db.user.create({
    data: {
      email: 'admin@xmix.om',
      name: 'مسؤول النظام',
      role: 'admin',
      passwordHash: hashPassword('Xmix@Admin2026'),
    },
  })

  await db.user.create({
    data: {
      email: 'owner@xmix.om',
      name: 'إدارة Xmix',
      role: 'owner',
      companyId: company.id,
      passwordHash: hashPassword('Xmix@2026'),
    },
  })

  console.log('✔ Clean start ready:')
  console.log('  • Company: محل Xmix الرئيسي (xmix-main) — no products')
  console.log('  • Admin : admin@xmix.om / Xmix@Admin2026  (change after first login!)')
  console.log('  • Owner : owner@xmix.om / Xmix@2026       (change after first login!)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
