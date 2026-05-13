'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Zap, Eye, EyeOff, Loader2, AlertCircle, Check } from 'lucide-react'

const PERKS = [
  '10 créditos grátis para começar',
  'Geração de texto e imagem com IA',
  'Sem cartão de crédito necessário',
]

export default function RegisterPage() {
  const router = useRouter()

  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name, email, password }),
      })
      const data = await res.json()

      if (!res.ok) { setError(data.error || 'Erro ao criar conta'); return }

      router.push('/dashboard?welcome=1')
      router.refresh()
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const pwStrength = password.length === 0 ? null
    : password.length < 8  ? 'weak'
    : password.length < 12 ? 'medium'
    : 'strong'

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-center">

        {/* Left: value prop */}
        <div className="hidden md:block">
          <Link href="/" className="flex items-center gap-2 mb-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Zap size={22} className="text-white" />
            </div>
            <span className="text-2xl font-black gradient-text">ViralPost</span>
          </Link>
          <h2 className="text-4xl font-black mb-4 leading-tight">
            Crie carrosséis<br />
            <span className="gradient-text">virais com IA</span>
          </h2>
          <p className="text-gray-400 mb-8">
            Gere conteúdo profissional para Instagram em segundos com o poder do Google Gemini.
          </p>
          <ul className="space-y-3">
            {PERKS.map(p => (
              <li key={p} className="flex items-center gap-3 text-sm text-gray-300">
                <div className="w-5 h-5 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
                  <Check size={11} className="text-green-400" />
                </div>
                {p}
              </li>
            ))}
          </ul>
        </div>

        {/* Right: form */}
        <div>
          <Link href="/" className="flex items-center gap-2 mb-8 md:hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <span className="text-xl font-black gradient-text">ViralPost</span>
          </Link>

          <div className="glass rounded-2xl p-8">
            <h1 className="text-2xl font-black mb-1">Criar conta grátis</h1>
            <p className="text-gray-400 text-sm mb-6">Sem cartão de crédito. Comece em segundos.</p>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4 text-red-400 text-sm">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Nome (opcional)</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 placeholder-gray-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="voce@email.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 placeholder-gray-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Senha *</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={8}
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
                {/* Strength indicator */}
                {pwStrength && (
                  <div className="flex gap-1 mt-1.5">
                    {['weak','medium','strong'].map((s, i) => (
                      <div
                        key={s}
                        className={`h-1 flex-1 rounded-full transition-all ${
                          (pwStrength === 'weak'   && i === 0) ? 'bg-red-500' :
                          (pwStrength === 'medium' && i <= 1) ? 'bg-yellow-500' :
                          (pwStrength === 'strong') ? 'bg-green-500' :
                          'bg-white/10'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading
                  ? <><Loader2 size={16} className="animate-spin" /> Criando conta…</>
                  : 'Criar conta grátis'}
              </button>
            </form>

            <p className="text-center text-xs text-gray-500 mt-5">
              Ao criar conta você concorda com os{' '}
              <a href="/terms" className="text-gray-400 hover:text-white">Termos de Uso</a>.
            </p>

            <p className="text-center text-sm text-gray-500 mt-4">
              Já tem conta?{' '}
              <Link href="/login" className="text-blue-400 hover:underline font-semibold">
                Entrar
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
