import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { constructWebhookEvent, type Stripe } from '@/lib/stripe'
import { grantMonthlyCredits } from '@/lib/billing'
import { sendSubscriptionConfirmEmail } from '@/lib/mailer'
import { randomUUID } from 'crypto'

// Note: App Router does not use Pages Router `config.api.bodyParser`.
// req.text() already reads the raw body correctly without any config needed.

// Idempotency: record processed Stripe event IDs to prevent duplicate handling.
// Uses raw SQL so no Prisma-client regeneration is needed after adding the model.
async function markEventProcessed(eventId: string, eventType: string): Promise<boolean> {
  try {
    await prisma.$executeRaw`
      INSERT INTO "ProcessedWebhookEvent" ("id", "eventId", "type", "processedAt")
      VALUES (${randomUUID()}, ${eventId}, ${eventType}, datetime('now'))
    `
    return true  // inserted — process the event
  } catch {
    // UNIQUE constraint failed → already processed, skip
    return false
  }
}

export async function POST(req: NextRequest) {
  const body      = await req.text()
  const signature = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = constructWebhookEvent(body, signature)
  } catch (e: any) {
    console.error('Webhook signature failed:', e.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Idempotency check — Stripe can redeliver events; skip if already handled
  const shouldProcess = await markEventProcessed(event.id, event.type)
  if (!shouldProcess) {
    return NextResponse.json({ received: true, skipped: true })
  }

  try {
    switch (event.type) {

      // ── Checkout completed ──────────────────────────────────
      case 'checkout.session.completed': {
        const sess = event.data.object as Stripe.Checkout.Session
        if (sess.mode !== 'subscription') break
        const userId = sess.metadata?.userId
        if (!userId) break

        await prisma.user.update({
          where: { id: userId },
          data:  { stripeCustomerId: sess.customer as string },
        })
        break
      }

      // ── Subscription created / updated ──────────────────────
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.userId

        if (!userId) break

        const priceId = sub.items.data[0]?.price.id
        const plan = await prisma.plan.findFirst({ where: { stripePriceId: priceId } })
          ?? await prisma.plan.findUnique({ where: { name: 'free' } })

        if (!plan) break

        const periodStart = new Date((sub.current_period_start as number) * 1000)
        const periodEnd   = new Date((sub.current_period_end   as number) * 1000)

        await prisma.subscription.upsert({
          where:  { userId },
          create: {
            userId,
            planId:              plan.id,
            status:              sub.status,
            stripeSubscriptionId: sub.id,
            currentPeriodStart:  periodStart,
            currentPeriodEnd:    periodEnd,
            cancelAtPeriodEnd:   sub.cancel_at_period_end,
            trialEnd: sub.trial_end ? new Date((sub.trial_end as number) * 1000) : null,
          },
          update: {
            planId:              plan.id,
            status:              sub.status,
            stripeSubscriptionId: sub.id,
            currentPeriodStart:  periodStart,
            currentPeriodEnd:    periodEnd,
            cancelAtPeriodEnd:   sub.cancel_at_period_end,
            trialEnd: sub.trial_end ? new Date((sub.trial_end as number) * 1000) : null,
          },
        })

        // Grant new period credits
        if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created') {
          await grantMonthlyCredits(userId, plan.name, periodStart, periodEnd)
        }

        // Send confirmation email on create
        if (event.type === 'customer.subscription.created') {
          const user = await prisma.user.findUnique({ where: { id: userId } })
          if (user) {
            sendSubscriptionConfirmEmail(user.email, plan.displayName).catch(console.error)
          }
        }
        break
      }

      // ── Subscription deleted ────────────────────────────────
      case 'customer.subscription.deleted': {
        const sub    = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.userId
        if (!userId) break

        const freePlan = await prisma.plan.findUnique({ where: { name: 'free' } })
        if (!freePlan) break

        const now      = new Date()
        const periodEnd = new Date(now.getTime() + 30 * 86400 * 1000)

        await prisma.subscription.update({
          where: { userId },
          data:  {
            planId:             freePlan.id,
            status:             'canceled',
            cancelAtPeriodEnd:  false,
            currentPeriodEnd:   now,
          },
        })
        break
      }

      // ── Invoice paid (new period) ───────────────────────────
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const sub = invoice.subscription as string
        if (!sub) break

        // Handled by subscription.updated above
        break
      }

      // ── Payment failed ──────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        if (!customerId) break

        const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } })
        if (!user) break

        await prisma.subscription.updateMany({
          where: { userId: user.id },
          data:  { status: 'past_due' },
        })
        break
      }
    }
  } catch (e: any) {
    console.error('Webhook handler error:', e)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
