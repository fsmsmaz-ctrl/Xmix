/**
 * seed.ts — clean-start seed (matches database/setup-database.sql):
 *   • flagship "Qat Oman" shelf (no demo products)
 *   • system admin account
 *   • Qat Oman merchant (owner) account
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
      slug: 'qat-oman',
      nameAr: 'قت عمان',
      nameEn: 'Qat Oman',
      taglineAr: 'رفّك الزراعي الأول — من البذرة إلى الحصاد',
      taglineEn: 'Your First Agri Shelf — From Seed to Harvest',
      descAr: 'قت عمان هي الرف الرئيسي والشركة الرائدة في سوق Xmix المتخصص بالمنتجات والخدمات الزراعية في سلطنة عُمان.',
      descEn: 'Qat Oman is the flagship shelf of Xmix — Oman’s specialised marketplace for agricultural products and services.',
      category: 'agri',
      emoji: '🌾',
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
      email: 'owner@qatoman.om',
      name: 'إدارة قت عمان',
      role: 'owner',
      companyId: company.id,
      passwordHash: hashPassword('Xmix@2026'),
    },
  })

  console.log('✔ Clean start ready:')
  console.log('  • Company: قت عمان (qat-oman) — no products')
  console.log('  • Admin : admin@xmix.om / Xmix@Admin2026  (change after first login!)')
  console.log('  • Owner : owner@qatoman.om / Xmix@2026    (change after first login!)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
