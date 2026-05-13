/**
 * Server-side billing helpers:
 *  - getUserPlan()       → current plan + subscription info
 *  - checkCanGenerate()  → throws if user over limit
 *  - consumeCredit()     → atomic credit deduction + usage log
 *  - grantMonthlyCredits()→ reset credits for new period
 */
import { prisma } from './db'
import { getPlan, CREDIT_COSTS, type CreditAction } from './plans'

export interface UserPlanInfo {
  planName:            string
  planDisplayName:     string
  creditsRemaining:    number  // -1 = unlimited
  creditsPerMonth:     number
  maxCarousels:        number  // -1 = unlimited
  maxSlidesPerCarousel:number
  canExportZip:        boolean
  canUseApi:           boolean
  canSubmitTemplates:  boolean
  subscriptionStatus:  string
  periodEnd:           Date | null
  monthlyCarousels:    number  // used this period
}

// ─── Get plan info ─────────────────────────────────────────

export async function getUserPlanInfo(userId: string): Promise<UserPlanInfo> {
  const [sub, balance] = await Promise.all([
    prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    }),
    prisma.creditBalance.findUnique({ where: { userId } }),
  ])

  const planLimits = getPlan(sub?.plan.name ?? 'free')

  // Count carousels this period
  const periodStart = sub?.currentPeriodStart ?? new Date(Date.now() - 30 * 86400 * 1000)
  const monthlyCarousels = await prisma.carousel.count({
    where: { userId, createdAt: { gte: periodStart } },
  })

  const creditsRemaining = planLimits.creditsPerMonth === -1
    ? -1
    : (balance?.credits ?? 0)

  return {
    planName:             planLimits.name,
    planDisplayName:      planLimits.displayName,
    creditsRemaining,
    creditsPerMonth:      planLimits.creditsPerMonth,
    maxCarousels:         planLimits.maxCarousels,
    maxSlidesPerCarousel: planLimits.maxSlidesPerCarousel,
    canExportZip:         planLimits.canExportZip,
    canUseApi:            planLimits.canUseApi,
    canSubmitTemplates:   planLimits.canSubmitTemplates,
    subscriptionStatus:   sub?.status ?? 'inactive',
    periodEnd:            sub ? new Date(sub.currentPeriodEnd) : null,
    monthlyCarousels,
  }
}

// ─── Check before generating ────────────────────────────────

export interface CheckResult {
  allowed: boolean
  reason?: string
  upgradeRequired?: 'pro' | 'business'
}

export async function checkCanGenerate(
  userId: string,
  action: CreditAction,
  slideCount?: number
): Promise<CheckResult> {
  const info = await getUserPlanInfo(userId)
  const plan = getPlan(info.planName)

  // 1. Check subscription active
  if (info.subscriptionStatus !== 'active' && info.subscriptionStatus !== 'trialing') {
    return { allowed: false, reason: 'Assinatura inativa ou expirada' }
  }

  // 2. Check carousel limit
  if (action === 'generate_text' && plan.maxCarousels !== -1) {
    if (info.monthlyCarousels >= plan.maxCarousels) {
      return {
        allowed: false,
        reason: `Limite de ${plan.maxCarousels} carrosséis por mês atingido. Faça upgrade para continuar.`,
        upgradeRequired: 'pro',
      }
    }
  }

  // 3. Check slide limit per carousel
  if (slideCount !== undefined && plan.maxSlidesPerCarousel !== -1) {
    if (slideCount > plan.maxSlidesPerCarousel) {
      return {
        allowed: false,
        reason: `Seu plano permite até ${plan.maxSlidesPerCarousel} slides por carrossel.`,
        upgradeRequired: 'pro',
      }
    }
  }

  // 4. Check ZIP export feature
  if (action === 'export_zip' && !plan.canExportZip) {
    return {
      allowed: false,
      reason: 'Exportar ZIP é exclusivo dos planos Pro e Business.',
      upgradeRequired: 'pro',
    }
  }

  // 5. Check API feature
  if (action === 'api_call' && !plan.canUseApi) {
    return {
      allowed: false,
      reason: 'API pública é exclusiva do plano Business.',
      upgradeRequired: 'business',
    }
  }

  // 6. Check credits (unlimited plans skip this)
  if (plan.creditsPerMonth !== -1) {
    const cost = CREDIT_COSTS[action]
    if (info.creditsRemaining < cost) {
      return {
        allowed: false,
        reason: `Créditos insuficientes (${info.creditsRemaining} restantes). Faça upgrade ou aguarde o próximo período.`,
        upgradeRequired: 'pro',
      }
    }
  }

  return { allowed: true }
}

// ─── Consume credit + log usage ────────────────────────────

export async function consumeCredit(
  userId: string,
  action: CreditAction,
  opts: {
    description?: string
    carouselId?: string
    mode?: string
    topic?: string
    metadata?: Record<string, unknown>
  } = {}
): Promise<void> {
  const plan = await prisma.subscription.findUnique({
    where: { userId },
    include: { plan: true },
  })
  const planLimits = getPlan(plan?.plan.name ?? 'free')

  // Unlimited plans skip credit deduction
  if (planLimits.creditsPerMonth !== -1) {
    const cost = CREDIT_COSTS[action]

    await prisma.$transaction(async (tx) => {
      const balance = await tx.creditBalance.findUnique({ where: { userId } })
      const currentCredits = balance?.credits ?? 0
      const newBalance = Math.max(0, currentCredits - cost)

      await tx.creditBalance.upsert({
        where: { userId },
        create: {
          userId,
          credits:     newBalance,
          periodStart: new Date(),
          periodEnd:   new Date(Date.now() + 30 * 86400 * 1000),
        },
        update: { credits: newBalance },
      })

      await tx.creditTransaction.create({
        data: {
          userId,
          amount:      -cost,
          balance:     newBalance,
          type:        `spend_${action.replace('generate_', '')}`,
          description: opts.description,
          carouselId:  opts.carouselId,
        },
      })
    })
  }

  // Always log usage
  await prisma.usageLog.create({
    data: {
      userId,
      action,
      mode:        opts.mode ?? null,
      topic:       opts.topic ?? null,
      creditsUsed: CREDIT_COSTS[action],
      metadata:    opts.metadata ? JSON.stringify(opts.metadata) : null,
    },
  })
}

// ─── Grant monthly credits (called by webhook / on registration) ──

export async function grantMonthlyCredits(
  userId: string,
  planName: string,
  periodStart: Date,
  periodEnd: Date
): Promise<void> {
  const plan = getPlan(planName)
  if (plan.creditsPerMonth === -1) return  // unlimited, nothing to grant

  await prisma.$transaction(async (tx) => {
    const current = await tx.creditBalance.findUnique({ where: { userId } })
    const newCredits = plan.creditsPerMonth

    await tx.creditBalance.upsert({
      where:  { userId },
      create: { userId, credits: newCredits, periodStart, periodEnd },
      update: { credits: newCredits, periodStart, periodEnd },
    })

    await tx.creditTransaction.create({
      data: {
        userId,
        amount:      newCredits,
        balance:     newCredits,
        type:        'monthly_grant',
        description: `Créditos mensais — plano ${plan.displayName}`,
      },
    })
  })
}

// ─── Provision free plan on registration ────────────────────

export async function provisionFreePlan(userId: string): Promise<void> {
  const freePlan = await prisma.plan.findUnique({ where: { name: 'free' } })
  if (!freePlan) return

  const now = new Date()
  const periodEnd = new Date(now.getTime() + 30 * 86400 * 1000)

  await prisma.$transaction(async (tx) => {
    await tx.subscription.upsert({
      where:  { userId },
      create: {
        userId,
        planId:              freePlan.id,
        status:              'active',
        currentPeriodStart:  now,
        currentPeriodEnd:    periodEnd,
      },
      update: {},
    })
    await tx.creditBalance.upsert({
      where:  { userId },
      create: { userId, credits: freePlan.creditsPerMonth, periodStart: now, periodEnd },
      update: {},
    })
    await tx.creditTransaction.create({
      data: {
        userId,
        amount:      freePlan.creditsPerMonth,
        balance:     freePlan.creditsPerMonth,
        type:        'monthly_grant',
        description: 'Boas-vindas! Créditos iniciais do plano Free',
      },
    })
  })
}

// ─── Admin: grant credits ────────────────────────────────────

export async function adminGrantCredits(
  userId: string,
  amount: number,
  description = 'Créditos concedidos pelo admin'
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const balance = await tx.creditBalance.findUnique({ where: { userId } })
    const current = balance?.credits ?? 0
    const newBal  = current + amount

    await tx.creditBalance.upsert({
      where:  { userId },
      create: {
        userId, credits: newBal,
        periodStart: new Date(),
        periodEnd:   new Date(Date.now() + 30 * 86400 * 1000),
      },
      update: { credits: newBal },
    })

    await tx.creditTransaction.create({
      data: { userId, amount, balance: newBal, type: 'admin_grant', description },
    })
  })
}
