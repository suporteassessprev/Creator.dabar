/**
 * Plan definitions and feature flags.
 * These mirror the DB Plan rows — kept in sync.
 */

export type PlanName = 'free' | 'pro' | 'business'

export interface PlanLimits {
  name:                PlanName
  displayName:         string
  description:         string
  priceMonthly:        number  // BRL cents
  creditsPerMonth:     number  // -1 = unlimited
  maxCarousels:        number  // per month, -1 = unlimited
  maxSlidesPerCarousel:number  // -1 = unlimited
  canExportZip:        boolean
  canUseApi:           boolean
  canSubmitTemplates:  boolean
  stripePriceId:       string | null
  features:            string[]
}

export const PLANS: Record<PlanName, PlanLimits> = {
  free: {
    name:                'free',
    displayName:         'Free',
    description:         'Comece a criar carrosséis virais gratuitamente',
    priceMonthly:        0,
    creditsPerMonth:     10,
    maxCarousels:        5,
    maxSlidesPerCarousel:5,
    canExportZip:        false,
    canUseApi:           false,
    canSubmitTemplates:  false,
    stripePriceId:       null,
    features: [
      '10 créditos por mês',
      'Até 5 carrosséis/mês',
      'Até 5 slides por carrossel',
      'Geração de texto com IA',
      'Geração de imagem com IA',
      '1 template padrão',
    ],
  },
  pro: {
    name:                'pro',
    displayName:         'Pro',
    description:         'Para criadores de conteúdo sérios',
    priceMonthly:        4900,  // R$49,00
    creditsPerMonth:     100,
    maxCarousels:        -1,
    maxSlidesPerCarousel:10,
    canExportZip:        true,
    canUseApi:           false,
    canSubmitTemplates:  true,
    stripePriceId:       process.env.STRIPE_PRO_PRICE_ID ?? null,
    features: [
      '100 créditos por mês',
      'Carrosséis ilimitados',
      'Até 10 slides por carrossel',
      'Exportar ZIP de slides',
      'Todos os templates',
      'Submeter templates ao marketplace',
      'Suporte por email',
    ],
  },
  business: {
    name:                'business',
    displayName:         'Business',
    description:         'Para agências e times de marketing',
    priceMonthly:        14900,  // R$149,00
    creditsPerMonth:     -1,
    maxCarousels:        -1,
    maxSlidesPerCarousel:-1,
    canExportZip:        true,
    canUseApi:           true,
    canSubmitTemplates:  true,
    stripePriceId:       process.env.STRIPE_BUSINESS_PRICE_ID ?? null,
    features: [
      'Créditos ilimitados',
      'Tudo do plano Pro',
      'Slides ilimitados',
      'API pública com API keys',
      'Acesso antecipado a novidades',
      'Suporte prioritário',
      'White label (em breve)',
    ],
  },
}

export function getPlan(name: string): PlanLimits {
  return PLANS[(name as PlanName)] ?? PLANS.free
}

export function formatPrice(cents: number): string {
  if (cents === 0) return 'Grátis'
  return `R$${(cents / 100).toFixed(0)}/mês`
}

/** Cost in credits for each action type */
export const CREDIT_COSTS = {
  generate_text:  1,
  generate_image: 1,
  export_zip:     1,
  api_call:       1,
} as const

export type CreditAction = keyof typeof CREDIT_COSTS
