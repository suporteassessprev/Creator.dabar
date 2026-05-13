'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import {
  CreditCard, Zap, Star, Rocket, ArrowRight, Loader2,
  CheckCircle2, AlertCircle, Copy, Trash2, Plus, Key, ExternalLink,
} from 'lucide-react'
import { PLANS, formatPrice } from '@/lib/plans'

interface SubInfo {
  planName:          string
  planDisplayName:   string
  creditsRemaining:  number
  creditsPerMonth:   number
  canExportZip:      boolean
  canUseApi:         boolean
  subscriptionStatus:string
  periodEnd:         string | null
  monthlyCarousels:  number
  maxCarousels:      number
}

interface ApiKey {
  id:         string
  name:       string
  keyPrefix:  string
  lastUsedAt: string | null
  createdAt:  string
}

interface NewKey { key: string; name: string; keyPrefix: string }

const PLAN_ICON = { free: Zap, pro: Star, business: Rocket }

function BillingContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const success      = searchParams.get('success') === '1'

  const [info,       setInfo]       = useState<SubInfo | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [upgrading,  setUpgrading]  = useState(false)
  const [apiKeys,    setApiKeys]    = useState<ApiKey[]>([])
  const [newKey,     setNewKey]     = useState<NewKey | null>(null)
  const [newKeyName, setNewKeyName] = useState('')
  const [creatingKey,setCreatingKey]= useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/user/subscription').then(r => r.json()),
      fetch('/api/user/apikeys').then(r => r.json()),
    ]).then(([sub, keys]) => {
      if (sub && !sub.error) setInfo(sub)
      if (Array.isArray(keys)) setApiKeys(keys)
    }).finally(() => setLoading(false))
  }, [])

  async function openPortal() {
    setUpgrading(true)
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      if (!res.ok) throw new Error((await res.json()).error)
      const { url } = await res.json()
      window.location.href = url
    } catch (e: any) {
      alert(e.message)
    } finally {
      setUpgrading(false)
    }
  }

  async function startCheckout(planName: string) {
    setUpgrading(true)
    try {
      const res = await fetch('/api/billing/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ planName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      window.location.href = data.url
    } catch (e: any) {
      alert(e.message)
    } finally {
      setUpgrading(false)
    }
  }

  async function createApiKey() {
    if (!newKeyName.trim()) return
    setCreatingKey(true)
    try {
      const res = await fetch('/api/user/apikeys', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: newKeyName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setNewKey({ key: data.key, name: data.name, keyPrefix: data.keyPrefix })
      setApiKeys(prev => [data, ...prev])
      setNewKeyName('')
    } catch (e: any) {
      alert(e.message)
    } finally {
      setCreatingKey(false)
    }
  }

  async function revokeKey(id: string) {
    if (!confirm('Revogar esta API key? Esta ação não pode ser desfeita.')) return
    await fetch(`/api/user/apikeys/${id}`, { method: 'DELETE' })
    setApiKeys(prev => prev.filter(k => k.id !== id))
  }

  const currentPlan = PLANS[info?.planName as keyof typeof PLANS] ?? PLANS.free
  const Icon = PLAN_ICON[info?.planName as keyof typeof PLAN_ICON] ?? Zap

  return (
    <AppLayout>
      <div className="p-8 max-w-3xl mx-auto">
        <h1 className="text-3xl font-black mb-1">Assinatura & Cobrança</h1>
        <p className="text-gray-400 text-sm mb-8">Gerencie seu plano, créditos e API keys</p>

        {/* Success banner */}
        {success && (
          <div className="flex items-center gap-3 glass border border-green-500/30 rounded-xl p-4 mb-6 text-green-400">
            <CheckCircle2 size={20} />
            <p className="font-semibold text-sm">Assinatura ativada com sucesso! 🎉</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-gray-400 py-16 justify-center">
            <Loader2 size={20} className="animate-spin" /> Carregando…
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current plan */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg">Plano atual</h2>
                {info?.subscriptionStatus === 'past_due' && (
                  <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full">
                    Pagamento pendente
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  info?.planName === 'business' ? 'bg-gradient-to-br from-orange-500 to-yellow-500' :
                  info?.planName === 'pro'      ? 'bg-gradient-to-br from-blue-500 to-purple-600' :
                                                   'bg-gradient-to-br from-gray-500 to-gray-600'
                }`}>
                  <Icon size={28} className="text-white" />
                </div>
                <div>
                  <p className="text-2xl font-black">{currentPlan.displayName}</p>
                  <p className="text-gray-400 text-sm">{formatPrice(currentPlan.priceMonthly)}</p>
                </div>
              </div>

              {/* Credits bar */}
              {info && currentPlan.creditsPerMonth !== -1 && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                    <span>Créditos restantes</span>
                    <span className="font-semibold text-white">
                      {info.creditsRemaining} / {info.creditsPerMonth}
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                      style={{ width: `${Math.min(100, (info.creditsRemaining / info.creditsPerMonth) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
              {info?.creditsPerMonth === -1 && (
                <p className="text-xs text-green-400 mb-4">✨ Créditos ilimitados</p>
              )}

              {info?.periodEnd && (
                <p className="text-xs text-gray-500 mb-4">
                  Período atual termina em {new Date(info.periodEnd).toLocaleDateString('pt-BR')}
                </p>
              )}

              {/* Upgrade / manage buttons */}
              <div className="flex flex-wrap gap-3">
                {info?.planName !== 'business' && (
                  <button
                    onClick={() => startCheckout(info?.planName === 'free' ? 'pro' : 'business')}
                    disabled={upgrading}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-all disabled:opacity-60"
                  >
                    {upgrading ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                    {info?.planName === 'free' ? 'Upgrade para Pro' : 'Upgrade para Business'}
                  </button>
                )}

                {info?.planName !== 'free' && (
                  <button
                    onClick={openPortal}
                    disabled={upgrading}
                    className="flex items-center gap-2 glass border border-white/10 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-white/10 transition-all disabled:opacity-60"
                  >
                    <CreditCard size={14} />
                    Gerenciar assinatura
                    <ExternalLink size={12} className="text-gray-500" />
                  </button>
                )}
              </div>
            </div>

            {/* API Keys (Business only) */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Key size={18} className="text-purple-400" />
                <h2 className="font-bold text-lg">API Keys</h2>
                {!info?.canUseApi && (
                  <Link href="/pricing" className="ml-auto text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full">
                    Business
                  </Link>
                )}
              </div>

              {!info?.canUseApi ? (
                <div className="text-center py-6">
                  <p className="text-gray-400 text-sm mb-3">API keys são exclusivas do plano Business.</p>
                  <Link
                    href="/pricing"
                    className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 font-semibold"
                  >
                    Ver plano Business <ArrowRight size={14} />
                  </Link>
                </div>
              ) : (
                <>
                  {/* New key reveal */}
                  {newKey && (
                    <div className="glass border border-green-500/30 rounded-xl p-4 mb-4">
                      <p className="text-xs font-semibold text-green-400 mb-2">
                        ✅ API key criada — salve agora! Não será exibida novamente.
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs bg-white/5 rounded-lg p-2 font-mono text-green-300 break-all">
                          {newKey.key}
                        </code>
                        <button
                          onClick={() => { navigator.clipboard.writeText(newKey.key) }}
                          className="p-2 glass rounded-lg hover:bg-white/10 transition-all flex-shrink-0"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Create key form */}
                  <div className="flex gap-2 mb-4">
                    <input
                      value={newKeyName}
                      onChange={e => setNewKeyName(e.target.value)}
                      placeholder="Nome da key (ex: Produção)"
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500/50"
                    />
                    <button
                      onClick={createApiKey}
                      disabled={creatingKey || !newKeyName.trim()}
                      className="flex items-center gap-1.5 bg-blue-500/20 border border-blue-500/30 text-blue-400 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-500/30 transition-all disabled:opacity-50"
                    >
                      {creatingKey ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                      Criar
                    </button>
                  </div>

                  {/* Keys list */}
                  {apiKeys.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">Nenhuma API key criada ainda</p>
                  ) : (
                    <div className="space-y-2">
                      {apiKeys.map(k => (
                        <div key={k.id} className="flex items-center gap-3 glass rounded-xl p-3">
                          <Key size={14} className="text-purple-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{k.name}</p>
                            <p className="text-[10px] text-gray-500 font-mono">{k.keyPrefix}</p>
                          </div>
                          {k.lastUsedAt && (
                            <span className="text-[10px] text-gray-500 flex-shrink-0">
                              usado {new Date(k.lastUsedAt).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                          <button
                            onClick={() => revokeKey(k.id)}
                            className="p-1.5 glass rounded-lg hover:bg-red-500/10 hover:text-red-400 text-gray-500 transition-all"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 glass border border-blue-500/10 rounded-xl p-3">
                    <p className="text-xs text-gray-400">
                      <span className="text-blue-400 font-semibold">Uso:</span>{' '}
                      <code className="text-purple-300">Authorization: Bearer vp_live_…</code>
                      {' '}→ <code className="text-purple-300">POST /api/v1/generate</code>
                    </p>
                    <Link href="/docs/api" className="text-[11px] text-blue-400 hover:underline">
                      Ver documentação completa →
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default function BillingPage() {
  return (
    <Suspense fallback={null}>
      <BillingContent />
    </Suspense>
  )
}
