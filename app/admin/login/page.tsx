'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { Lock, Mail, Loader2, Zap, AlertCircle } from 'lucide-react'
import { loginAction, type LoginState } from './actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
        pending
          ? 'bg-white/10 text-gray-500 cursor-not-allowed'
          : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90'
      }`}
    >
      {pending ? <><Loader2 size={16} className="animate-spin" /> Entrando...</> : 'Entrar'}
    </button>
  )
}

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams: { from?: string }
}) {
  const [state, formAction] = useFormState<LoginState, FormData>(loginAction, {})

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] text-white px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
            <Zap size={22} className="text-white" />
          </div>
          <span className="text-2xl font-bold gradient-text">ViralPost Admin</span>
        </div>

        <div className="glass rounded-2xl p-8">
          <h1 className="text-xl font-bold mb-1">Acesso administrativo</h1>
          <p className="text-sm text-gray-400 mb-6">Apenas administradores autorizados</p>

          <form action={formAction} className="space-y-4">
            <input type="hidden" name="from" value={searchParams.from ?? '/admin'} />

            <div>
              <label className="text-xs font-semibold text-gray-300 mb-1 block">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="admin@viralpost.local"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 placeholder-gray-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-300 mb-1 block">Senha</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 placeholder-gray-500"
                />
              </div>
            </div>

            {state.error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                <AlertCircle size={16} />
                {state.error}
              </div>
            )}

            <SubmitButton />
          </form>
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          Esta área é restrita. Tentativas de acesso são registradas.
        </p>
      </div>
    </div>
  )
}
