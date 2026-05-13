import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })
loadEnv({ path: '.env' })

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ─── Plan definitions (mirrors lib/plans.ts — keep in sync) ───────────────
const PLAN_SEEDS = [
  {
    name:                'free',
    displayName:         'Free',
    description:         'Comece a criar carrosséis virais gratuitamente',
    priceMonthly:        0,
    stripePriceId:       null,
    creditsPerMonth:     10,
    maxCarousels:        5,
    maxSlidesPerCarousel:5,
    canExportZip:        false,
    canUseApi:           false,
    canSubmitTemplates:  false,
    active:              true,
    sortOrder:           0,
  },
  {
    name:                'pro',
    displayName:         'Pro',
    description:         'Para criadores de conteúdo sérios',
    priceMonthly:        4900,
    stripePriceId:       process.env.STRIPE_PRO_PRICE_ID ?? null,
    creditsPerMonth:     100,
    maxCarousels:        -1,
    maxSlidesPerCarousel:10,
    canExportZip:        true,
    canUseApi:           false,
    canSubmitTemplates:  true,
    active:              true,
    sortOrder:           1,
  },
  {
    name:                'business',
    displayName:         'Business',
    description:         'Para agências e times de marketing',
    priceMonthly:        14900,
    stripePriceId:       process.env.STRIPE_BUSINESS_PRICE_ID ?? null,
    creditsPerMonth:     -1,
    maxCarousels:        -1,
    maxSlidesPerCarousel:-1,
    canExportZip:        true,
    canUseApi:           true,
    canSubmitTemplates:  true,
    active:              true,
    sortOrder:           2,
  },
] as const

async function seedPlans() {
  console.log('Seeding plans…')
  for (const plan of PLAN_SEEDS) {
    const { name, ...data } = plan
    await prisma.plan.upsert({
      where:  { name },
      create: { name, ...data },
      // Update mutable fields but preserve id and createdAt
      update: {
        displayName:         data.displayName,
        description:         data.description,
        priceMonthly:        data.priceMonthly,
        stripePriceId:       data.stripePriceId,
        creditsPerMonth:     data.creditsPerMonth,
        maxCarousels:        data.maxCarousels,
        maxSlidesPerCarousel:data.maxSlidesPerCarousel,
        canExportZip:        data.canExportZip,
        canUseApi:           data.canUseApi,
        canSubmitTemplates:  data.canSubmitTemplates,
        active:              data.active,
        sortOrder:           data.sortOrder,
      },
    })
    console.log(`  ✓ plan "${name}" upserted`)
  }
}

async function seedAdmin() {
  console.log('Seeding admin user…')
  const email    = process.env.ADMIN_EMAIL    ?? 'admin@viralpost.local'
  const password = process.env.ADMIN_PASSWORD ?? 'admin123'
  const name     = process.env.ADMIN_NAME     ?? 'Admin'

  const hashed = await bcrypt.hash(password, 12)

  const admin = await prisma.user.upsert({
    where:  { email },
    create: { email, name, password: hashed, role: 'ADMIN', emailVerified: true },
    update: { name, role: 'ADMIN' },   // don't overwrite existing password
  })

  console.log(`  ✓ admin: ${admin.email} (role=${admin.role})`)
  if (password === 'admin123') {
    console.log('  ⚠️  Using default password "admin123" — change via ADMIN_PASSWORD env var!')
  }
}

async function main() {
  await seedPlans()
  await seedAdmin()
  console.log('Seed complete.')
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
