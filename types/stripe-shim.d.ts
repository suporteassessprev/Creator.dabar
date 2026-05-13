/**
 * Ambient type shim for stripe v22+.
 * The installed version ships .d.ts only in sub-directories, not the root entry,
 * so TypeScript cannot resolve them automatically. This file provides the minimal
 * surface we use in the project.
 */
declare module 'stripe' {
  namespace Stripe {
    interface ConstructorOptions {
      apiVersion?: string
      [key: string]: unknown
    }

    /* ── Events ───────────────────────────────────────────── */
    interface Event {
      id:   string
      type: string
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { object: any }
    }

    /* ── Checkout ─────────────────────────────────────────── */
    namespace Checkout {
      interface Session {
        id:       string
        mode:     string | null
        customer: string | { id: string } | null
        subscription: string | null
        metadata: Record<string, string> | null
        url:      string | null
      }
      interface SessionCreateParams {
        mode:        string
        customer?:   string
        customer_email?: string
        line_items:  Array<{ price: string; quantity: number }>
        success_url: string
        cancel_url:  string
        metadata?:   Record<string, string>
        subscription_data?: {
          trial_period_days?: number
          metadata?: Record<string, string>
        }
        allow_promotion_codes?: boolean
      }
    }

    /* ── Subscriptions ────────────────────────────────────── */
    interface Subscription {
      id:                   string
      status:               string
      cancel_at_period_end: boolean
      current_period_start: number
      current_period_end:   number
      trial_end:            number | null
      metadata:             Record<string, string>
      items: {
        data: Array<{
          price: { id: string }
        }>
      }
    }

    /* ── Customers ────────────────────────────────────────── */
    interface Customer {
      id:    string
      email: string | null
      name:  string | null
    }

    /* ── Invoices ─────────────────────────────────────────── */
    interface Invoice {
      id:           string
      customer:     string | Customer | null
      subscription: string | Subscription | null
    }

    /* ── BillingPortal ────────────────────────────────────── */
    namespace BillingPortal {
      interface Session { url: string }
      interface SessionCreateParams {
        customer:   string
        return_url: string
      }
    }
  }

  class Stripe {
    constructor(apiKey: string, opts?: Stripe.ConstructorOptions)

    checkout: {
      sessions: {
        create(params: Stripe.Checkout.SessionCreateParams): Promise<Stripe.Checkout.Session>
      }
    }

    billingPortal: {
      sessions: {
        create(params: Stripe.BillingPortal.SessionCreateParams): Promise<Stripe.BillingPortal.Session>
      }
    }

    customers: {
      create(params: {
        email?:    string
        name?:     string
        metadata?: Record<string, string>
      }): Promise<Stripe.Customer>
    }

    subscriptions: {
      retrieve(id: string): Promise<Stripe.Subscription>
    }

    webhooks: {
      constructEvent(
        payload:   string | Buffer,
        header:    string | string[],
        secret:    string
      ): Stripe.Event
    }

    static initialize(platform: unknown): void
  }

  export = Stripe
}
