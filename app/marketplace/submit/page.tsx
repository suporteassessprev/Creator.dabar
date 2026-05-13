'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import { Upload, Loader2, AlertCircle, CheckCircle2, Lock, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface PlanInfo { canSubmitTemplates: boolean; planName: string }

export default function SubmitTemplatePage() {
  const router = useRouter()
  const [info,     setInfo]     = useState<PlanInfo | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [success,  setSuccess]  = useState(false)
  const [error,    setError]    = useState('')

  const [name,        setName]        = useState('')
  const [description, setDescription] = useState('')
  const [mode,        setMode]        = useState('text')
  const [format,      setFormat]      = useState('square')
  const [promptText,  setPromptText]  = useState('')
  const [styleConfig, setStyleConfig] = useState('')

  useEffect(() => {
    fetch('/api/user/subscription')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && !data.error) {
          setInfo({ canSubmitTemplates: data.canExportZip || data.planName === 'pro' || data.planName === 'business', planName: data.planName })
        } else {
          setInfo({ canSubmitTemplates: false, planName: 'free' })
        }
      })
      .catch(() => setInfo({ canSubmitTemplates: false, planName: 'free' }))
      .finally(() => setLoading(false))
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const res = await fetch('/api/marketplace/submit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name, mode, format,
          // style maps to TemplateSubmission.style (JSON string)
          style: styleConfig || undefined,
          // promptText has no DB field — append to description for review context
          description: [description.trim(), promptText.trim() ? `Prompt: ${promptText.trim()}` : ''].filter(Boolean).join('\n') || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSuccess(true)
      setTimeout(() => router.push('/marketplace'), 2500)
    } catch (e: any) {
      setError(e.message ?? 'Erro ao enviar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout>
      <div className="p-8 max-w-2xl">
        <Link
          href="/marketplace"
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={14} /> Voltar ao marketplace
        </Link>

        <h1 className="text-3xl font-black mb-1">Enviar Template</h1>
        <p className="text-gray-400 text-sm mb-8">
          Contribua com a comunidade. Templates aprovados ficam disponíveis para todos.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 size={22} className="animate-spin mr-2" /> Carregando…
          </div>
        ) : !info?.canSubmitTemplates ? (
          <div className="glass rounded-2xl p-10 text-center">
            <Lock size={36} className="text-yellow-400 mx-auto mb-4" />
            <h2 className="font-bold text-lg mb-2">Plano Pro ou Business necessário</h2>
            <p className="text-gray-400 text-sm mb-6">
              Submissão de templates é exclusiva para assinantes Pro e Business.
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-all"
            >
              Ver planos →
            </Link>
          </div>
        ) : success ? (
          <div className="glass rounded-2xl p-10 text-center">
            <CheckCircle2 size={40} className="text-green-400 mx-auto mb-4" />
            <h2 className="font-bold text-lg mb-2">Template enviado!</h2>
            <p className="text-gray-400 text-sm">Nossa equipe irá revisar em breve. Redirecionando…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-5">
            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Nome do template *</label>
              <input
                value={name} onChange={e => setName(e.target.value)} required
                placeholder="Ex: Carrossel de dicas de produtividade"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500/40"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Descrição</label>
              <textarea
                value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Descreva para que serve este template e como usá-lo melhor…"
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-blue-500/40"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Modo</label>
                <select
                  value={mode} onChange={e => setMode(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500/40"
                >
                  <option value="text">Texto</option>
                  <option value="image">Imagem</option>
                  <option value="both">Ambos</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Formato</label>
                <select
                  value={format} onChange={e => setFormat(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500/40"
                >
                  <option value="square">Quadrado (1:1)</option>
                  <option value="feed-vertical">Feed vertical (4:5)</option>
                  <option value="story">Story (9:16)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Prompt base (opcional)</label>
              <textarea
                value={promptText} onChange={e => setPromptText(e.target.value)}
                placeholder="Instruções de geração para este template…"
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono resize-none focus:outline-none focus:border-blue-500/40"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                Estilo (JSON, opcional)
              </label>
              <textarea
                value={styleConfig} onChange={e => setStyleConfig(e.target.value)}
                placeholder={'{\n  "backgroundColor": "#1a1a2e",\n  "textColor": "#ffffff"\n}'}
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono resize-none focus:outline-none focus:border-blue-500/40"
              />
            </div>

            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-all disabled:opacity-60"
            >
              {saving ? <><Loader2 size={14} className="animate-spin" /> Enviando…</> : <><Upload size={14} /> Enviar para revisão</>}
            </button>
          </form>
        )}
      </div>
    </AppLayout>
  )
}
