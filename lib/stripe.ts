/**
 * Stripe client + helpers.
 * All Stripe calls are safely no-ops if STRIPE_SECRET_KEY is not set.
 */
import Stripe from 'stripe'

const key = process.env.STRIPE_SECRET_KEY

export const stripe: Stripe | null = key
  ? new Stripe(key, { apiVersion: '2025-02-24.acacia' })
  : null

export function requireStripe(): Stripe {
  if (!stripe) throw new Error('Stripe não está configurado. Defina STRIPE_SECRET_KEY no .env')
  return stripe
}

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? ''

// ─── Checkout ─────────────────────────────────────────────

export async function createCheckoutSession(opts: {
  priceId:      string
  userId:       string
  email:        string
  customerId?:  string
  successUrl:   string
  cancelUrl:    string
  trialDays?:   number
}): Promise<string> {
  const s = requireStripe()

  const session = await s.checkout.sessions.create({
    mode:       'subscription',
    customer:   opts.customerId,
    customer_email: opts.customerId ? undefined : opts.email,
    line_items: [{ price: opts.priceId, quantity: 1 }],
    success_url: opts.successUrl,
    cancel_url:  opts.cancelUrl,
    metadata:   { userId: opts.userId },
    subscription_data: opts.trialDays
      ? { trial_period_days: opts.trialDays, metadata: { userId: opts.userId } }
      : { metadata: { userId: opts.userId } },
    allow_promotion_codes: true,
  })

  return session.url!
}

// ─── Customer Portal ─────────────────────────────────────────

export async function createPortalSession(opts: {
  customerId:  string
  returnUrl:   string
}): Promise<string> {
  const s = requireStripe()
  const session = await s.billingPortal.sessions.create({
    customer:   opts.customerId,
    return_url: opts.returnUrl,
  })
  return session.url
}

// ─── Create/get customer ──────────────────────────────────────

export async function getOrCreateCustomer(opts: {
  email: string
  name?: string | null
  userId: string
}): Promise<string> {
  const s = requireStripe()
  const customer = await s.customers.create({
    email:    opts.email,
    name:     opts.name ?? undefined,
    metadata: { userId: opts.userId },
  })
  return customer.id
}

// ─── Parse webhook event ──────────────────────────────────────

export function constructWebhookEvent(
  body: string | Buffer,
  signature: string
): Stripe.Event {
  const s = requireStripe()
  return s.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)
}

export type { Stripe }
