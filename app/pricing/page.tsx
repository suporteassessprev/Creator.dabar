'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Check, Zap, Star, Rocket, Loader2, ArrowRight,
} from 'lucide-react'
import { PLANS, formatPrice, type PlanName } from '@/lib/plans'

const PLAN_ICONS = {
  free:     Zap,
  pro:      Star,
  business: Rocket,
}

const PLAN_GRADIENTS = {
  free:     'from-gray-500/20 to-gray-600/20 border-white/10',
  pro:      'from-blue-500/20 to-purple-600/20 border-blue-500/30',
  business: 'from-orange-500/20 to-yellow-500/20 border-orange-500/30',
}

export default function PricingPage() {
  const router  = useRouter()
  const [loading, setLoading] = useState<PlanName | null>(null)

  async function handleUpgrade(planName: PlanName) {
    if (planName === 'free') return

    setLoading(planName)
    try {
      const res = await fetch('/api/billing/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ planName }),
      })

      if (res.status === 401) {
        router.push(`/login?from=/pricing`)
        return
      }

      if (!res.ok) {
        const d = await res.json()
        alert(d.error || 'Erro ao iniciar checkout')
        return
      }

      const { url } = await res.json()
      if (url) window.location.href = url
    } finally {
      setLoading(null)
    }
  }

  const plans = [PLANS.free, PLANS.pro, PLANS.business]

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Nav */}
      <nav className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-black gradient-text">ViralPost</Link>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">Entrar</Link>
          <Link href="/register" className="flex items-center gap-1 bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-all">
            Começar grátis <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-14">
          <h1 className="text-4xl md:text-5xl font-black mb-4">
            Preços <span className="gradient-text">simples e transparentes</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Comece grátis. Faça upgrade quando precisar de mais. Sem surpresas.
          </p>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const Icon     = PLAN_ICONS[plan.name]
            const gradient = PLAN_GRADIENTS[plan.name]
            const isPro    = plan.name === 'pro'

            return (
              <div
                key={plan.name}
                className={`relative rounded-3xl p-7 bg-gradient-to-br border ${gradient} flex flex-col ${
                  isPro ? 'scale-[1.02]' : ''
                }`}
              >
                {isPro && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                      MAIS POPULAR
                    </span>
                  </div>
                )}

                {/* Icon + name */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${
                    plan.name === 'free'     ? 'from-gray-500 to-gray-600' :
                    plan.name === 'pro'      ? 'from-blue-500 to-purple-600' :
                                               'from-orange-500 to-yellow-500'
                  }`}>
                    <Icon size={20} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black">{plan.displayName}</h2>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-1">
                  <span className="text-4xl font-black">
                    {plan.priceMonthly === 0 ? 'R$0' : `R$${plan.priceMonthly / 100}`}
                  </span>
                  {plan.priceMonthly > 0 && (
                    <span className="text-gray-400 text-sm ml-1">/mês</span>
                  )}
                </div>
                <p className="text-gray-400 text-sm mb-6">{plan.description}</p>

                {/* CTA */}
                {plan.name === 'free' ? (
                  <Link
                    href="/register"
                    className="w-full text-center py-3 rounded-xl glass border border-white/10 hover:bg-white/10 text-sm font-semibold transition-all mb-6"
                  >
                    Começar grátis
                  </Link>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.name)}
                    disabled={loading === plan.name}
                    className={`w-full py-3 rounded-xl text-sm font-bold transition-all mb-6 flex items-center justify-center gap-2 disabled:opacity-60 ${
                      isPro
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90'
                        : 'bg-gradient-to-r from-orange-500 to-yellow-500 hover:opacity-90 text-black'
                    }`}
                  >
                    {loading === plan.name
                      ? <><Loader2 size={16} className="animate-spin" /> Aguarde…</>
                      : <>Assinar {plan.displayName} <ArrowRight size={14} /></>}
                  </button>
                )}

                {/* Features */}
                <ul className="space-y-2.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-300">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        {/* FAQ */}
        <div className="mt-16 text-center">
          <p className="text-gray-400 text-sm">
            Dúvidas? Fale conosco em <a href="mailto:suporte@viralpost.app" className="text-blue-400 hover:underline">suporte@viralpost.app</a>
          </p>
          <p className="text-gray-600 text-xs mt-2">
            Pagamentos processados via Stripe. Cancele quando quiser.
          </p>
        </div>
      </div>
    </div>
  )
}
