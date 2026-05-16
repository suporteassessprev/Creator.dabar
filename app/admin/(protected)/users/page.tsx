'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Users, Coins, Plus, Minus, Loader2, X, CheckCircle2, AlertCircle, RefreshCw,
} from 'lucide-react'

interface AdminUser {
  id: string
  name: string | null
  email: string
  emailVerified: boolean
  createdAt: string
  subscription: { plan: { name: string; displayName: string } } | null
  _count: { carousels: number }
  credits: number
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalUser, setModalUser] = useState<AdminUser | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setUsers(data)
    } catch (e: any) {
      setError(e.message ?? 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black mb-1 flex items-center gap-3">
            <Users size={28} className="text-blue-400" /> Usuários
          </h1>
          <p className="text-gray-400 text-sm">{users.length} cadastrados</p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm glass text-gray-400 hover:text-white transition-all"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {error && (
        <div className="mb-4 glass border border-red-500/30 rounded-xl p-3 text-red-400 text-sm flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-white/5 bg-white/3">
                <th className="text-left px-5 py-3 font-medium">Usuário</th>
                <th className="text-left px-5 py-3 font-medium">Plano</th>
                <th className="text-left px-5 py-3 font-medium">Créditos</th>
                <th className="text-left px-5 py-3 font-medium">Carrosséis</th>
                <th className="text-left px-5 py-3 font-medium">Email</th>
                <th className="text-left px-5 py-3 font-medium">Cadastro</th>
                <th className="text-right px-5 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && users.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-500">
                    <Loader2 size={20} className="animate-spin inline-block mr-2" /> Carregando...
                  </td>
                </tr>
              )}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-500">Nenhum usuário</td>
                </tr>
              )}
              {users.map(u => {
                const planName = u.subscription?.plan?.name ?? 'free'
                return (
                  <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {(u.name ?? u.email).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-xs">{u.name ?? '—'}</p>
                          <p className="text-[10px] text-gray-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                        planName === 'business' ? 'bg-orange-500/20 text-orange-300 border-orange-500/20' :
                        planName === 'pro'      ? 'bg-blue-500/20   text-blue-300   border-blue-500/20'   :
                                                   'bg-white/5        text-gray-400   border-white/10'
                      }`}>
                        {u.subscription?.plan?.displayName ?? 'Free'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-1 text-xs font-bold text-amber-300">
                        <Coins size={11} /> {u.credits}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs">{u._count.carousels}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] ${u.emailVerified ? 'text-green-400' : 'text-yellow-500'}`}>
                        {u.emailVerified ? '✓ Sim' : '⚠ Não'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => setModalUser(u)}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-all"
                        type="button"
                      >
                        Créditos
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modalUser && (
        <GrantCreditsModal
          user={modalUser}
          onClose={() => setModalUser(null)}
          onGranted={(newBalance) => {
            setUsers(prev => prev.map(u => u.id === modalUser.id ? { ...u, credits: newBalance } : u))
            setModalUser(null)
          }}
        />
      )}
    </div>
  )
}

/* ─── Modal: grant/revoke credits ───────────────────────────────────── */
function GrantCreditsModal({
  user, onClose, onGranted,
}: {
  user: AdminUser
  onClose: () => void
  onGranted: (newBalance: number) => void
}) {
  const [amount, setAmount] = useState<number>(50)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(sign: 1 | -1) {
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}/credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.abs(amount) * sign,
          reason: reason.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Erro ${res.status}`)
      onGranted(data.balance)
    } catch (e: any) {
      setError(e.message ?? 'Erro')
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="glass rounded-2xl max-w-md w-full p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Coins size={18} className="text-amber-400" />
            <h2 className="text-lg font-bold">Ajustar créditos</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-md" type="button">
            <X size={16} />
          </button>
        </div>

        <div className="glass rounded-xl p-3 mb-4">
          <p className="text-xs font-semibold">{user.name ?? user.email}</p>
          <p className="text-[10px] text-gray-500">{user.email}</p>
          <p className="text-xs mt-2 text-amber-300">
            Saldo atual: <strong>{user.credits}</strong> créditos
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] text-gray-400 mb-1 block">Quantidade</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(Number(e.target.value) || 0)}
              min={1}
              max={10000}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50"
            />
            <div className="flex gap-1.5 mt-1.5">
              {[10, 50, 100, 500].map(v => (
                <button
                  key={v}
                  onClick={() => setAmount(v)}
                  className="text-[10px] px-2 py-0.5 rounded glass hover:bg-white/10 text-gray-400"
                  type="button"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] text-gray-400 mb-1 block">Motivo (opcional)</label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Ex: Teste de produto, compensação por bug..."
              maxLength={280}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-amber-500/50"
            />
          </div>
        </div>

        {error && (
          <div className="mt-3 text-[11px] text-red-400 bg-red-500/10 rounded p-2 border border-red-500/20">
            {error}
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            onClick={() => submit(1)}
            disabled={submitting || amount <= 0}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-green-500/30 to-emerald-500/30 hover:from-green-500/40 hover:to-emerald-500/40 text-green-200 border border-green-500/40 disabled:opacity-60"
            type="button"
          >
            {submitting ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            Adicionar {amount}
          </button>
          <button
            onClick={() => submit(-1)}
            disabled={submitting || amount <= 0}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-red-500/20 to-rose-500/20 hover:from-red-500/30 hover:to-rose-500/30 text-red-200 border border-red-500/30 disabled:opacity-60"
            type="button"
          >
            {submitting ? <Loader2 size={12} className="animate-spin" /> : <Minus size={12} />}
            Remover {amount}
          </button>
        </div>
      </div>
    </div>
  )
}
