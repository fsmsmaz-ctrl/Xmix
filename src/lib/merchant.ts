import crypto from 'crypto'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

/** Transliteration-unfriendly safe slug: keeps latin letters/digits, dashes. */
export function slugify(text: string): string {
  const base = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return base || 'shelf'
}

/** Unique company slug — appends -2, -3 … when taken. */
export async function uniqueSlug(nameEn: string): Promise<string> {
  const base = slugify(nameEn)
  let slug = base
  let n = 2
  // A few iterations is plenty; slug space is wide.
  for (; n < 100; n++) {
    const exists = await db.company.findUnique({ where: { slug }, select: { id: true } })
    if (!exists) return slug
    slug = `${base}-${n}`
  }
  return `${base}-${Date.now().toString(36)}`
}

/** Human-friendly temporary password for newly created merchant accounts. */
export function generateTempPassword(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const bytes = crypto.randomBytes(10)
  let out = ''
  for (const b of bytes) out += alphabet[b % alphabet.length]
  return `Xm${out}1!`
}

export interface NewCompanyInput {
  nameAr: string
  nameEn?: string
  category?: string
  city?: string
  description?: string
  emoji?: string
}

export interface GrantResult {
  company: { id: string; slug: string; nameAr: string; nameEn: string }
  user: { id: string; email: string; name: string }
  createdAccount: boolean
  tempPassword?: string
}

/**
 * Grant merchant permission to a user: creates their shelf (company) and
 * promotes the account to `owner`. If `userId` is omitted, a new merchant
 * account is created with a temporary password (returned once).
 */
export async function grantMerchant(
  opts: { userId?: string; email?: string; name?: string; company: NewCompanyInput }
): Promise<GrantResult> {
  const nameAr = opts.company.nameAr.trim()
  const nameEn = (opts.company.nameEn?.trim() || nameAr).trim()
  if (nameAr.length < 2) throw new Error('COMPANY_NAME_REQUIRED')

  let user
  let createdAccount = false
  let tempPassword: string | undefined

  if (opts.userId) {
    user = await db.user.findUnique({ where: { id: opts.userId } })
    if (!user) throw new Error('USER_NOT_FOUND')
    if (user.role === 'admin') throw new Error('CANNOT_PROMOTE_ADMIN')
  } else {
    const email = opts.email?.trim().toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('EMAIL_REQUIRED')
    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      if (existing.role === 'admin') throw new Error('CANNOT_PROMOTE_ADMIN')
      user = existing
    } else {
      tempPassword = generateTempPassword()
      user = await db.user.create({
        data: {
          email,
          name: opts.name?.trim() || nameAr,
          passwordHash: hashPassword(tempPassword),
          role: 'customer',
        },
      })
      createdAccount = true
    }
  }

  const slug = await uniqueSlug(nameEn)
  const category = opts.company.category?.trim() || 'general'
  const city = opts.company.city?.trim() || 'مسقط، سلطنة عُمان'
  const description = opts.company.description?.trim() || ''

  // Atomic: shelf creation + owner promotion succeed or fail together
  // (prevents an orphaned company with no owner if the second write fails)
  const company = await db.$transaction(async (tx) => {
    const created = await tx.company.create({
      data: {
        slug,
        nameAr,
        nameEn,
        taglineAr: description ? description.slice(0, 120) : `محل ${nameAr} داخل سوق Xmix`,
        taglineEn: description ? description.slice(0, 120) : `${nameEn} store on Xmix`,
        descAr: description || `محل ${nameAr} — منتجات وخدمات داخل سوق Xmix التجاري.`,
        descEn: description || `${nameEn} — products and services on the Xmix marketplace.`,
        category,
        emoji: opts.company.emoji?.trim() || '🏬',
        color: '#8B5CF6',
        gradient: 'linear-gradient(135deg,#7C3AED 0%,#4C1D95 100%)',
        locationAr: city,
        locationEn: city,
        rating: 4.5,
        isFeatured: false,
        status: 'active',
      },
    })
    await tx.user.update({
      where: { id: user.id },
      data: { role: 'owner', companyId: created.id },
    })
    return created
  })

  return {
    company: { id: company.id, slug: company.slug, nameAr: company.nameAr, nameEn: company.nameEn },
    user: { id: user.id, email: user.email, name: user.name },
    createdAccount,
    tempPassword,
  }
}
