'use client'

import { useState, FormEvent, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Zap, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const token        = searchParams.get('token') ?? ''

  const [password,  setPassword]  = useState('')
  const [password2, setPassword2] = useState('')
  const [showPw,    setShowPw]    = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [done,      setDone]      = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== password2) { setError('As senhas não coincidem'); return }
    if (password.trim().length < 8) { setError('Senha deve ter pelo menos 8 caracteres'); return }
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/reset-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDone(true)
      setTimeout(() => router.push('/login'), 2500)
    } catch (e: any) {
      setError(e.message ?? 'Erro ao redefinir senha')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <AlertCircle size={32} className="text-red-400 mx-auto mb-3" />
        <p className="text-red-400 font-semibold mb-2">Link inválido</p>
        <p className="text-gray-400 text-sm mb-4">Este link de redefinição é inválido ou expirou.</p>
        <Link href="/login" className="text-blue-400 hover:underline text-sm">Voltar ao login</Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <CheckCircle2 size={40} className="text-green-400 mx-auto mb-3" />
        <p className="font-bold text-lg mb-2">Senha redefinida!</p>
        <p className="text-gray-400 text-sm">Redirecionando para o login…</p>
      </div>
    )
  }

  return (
    <div className="glass rounded-2xl p-8">
      <h1 className="text-2xl font-black mb-1">Nova senha</h1>
      <p className="text-gray-400 text-sm mb-6">Escolha uma senha segura para sua conta.</p>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4 text-red-400 text-sm">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-1.5">Nova senha *</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required minLength={8}
              placeholder="Mínimo 8 caracteres"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:border-blue-500/50 placeholder-gray-600"
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-1.5">Confirmar senha *</label>
          <input
            type={showPw ? 'text' : 'password'}
            value={password2}
            onChange={e => setPassword2(e.target.value)}
            required
            placeholder="Repita a senha"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 placeholder-gray-600"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? <><Loader2 size={16} className="animate-spin" /> Salvando…</> : 'Salvar nova senha'}
        </button>
      </form>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="text-xl font-black gradient-text">ViralPost</span>
        </Link>
        <Suspense fallback={<div className="glass rounded-2xl p-8 text-center text-gray-400">Carregando…</div>}>
          <ResetPasswordForm />
        </Suspense>
        <p className="text-center text-sm text-gray-500 mt-4">
          <Link href="/login" className="text-blue-400 hover:underline">← Voltar ao login</Link>
        </p>
      </div>
    </div>
  )
}
