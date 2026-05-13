'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Plus, Wand2, ToggleLeft, ToggleRight, Trash2,
  Copy, Pencil, Loader2, AlertCircle, CheckCircle2,
  FlaskConical, History,
} from 'lucide-react'

type PromptType = 'creative_copy' | 'carousel_copy' | 'creative_image' | 'carousel_image'

interface Prompt {
  id: string
  name: string
  type: PromptType
  content: string
  active: boolean
  version: number
  _count: { versions: number }
  createdAt: string
  updatedAt: string
}

const TYPE_LABELS: Record<PromptType, { label: string; color: string }> = {
  creative_copy:  { label: 'Criativo — Texto',   color: 'from-orange-500 to-yellow-500' },
  carousel_copy:  { label: 'Carrossel — Texto',  color: 'from-blue-500 to-cyan-500' },
  creative_image: { label: 'Criativo — Imagem',  color: 'from-pink-500 to-rose-500' },
  carousel_image: { label: 'Carrossel — Imagem', color: 'from-purple-500 to-violet-500' },
}

const TYPE_FILTERS = [
  { key: 'all',            label: 'Todos' },
  { key: 'carousel_copy',  label: 'Carrossel Texto' },
  { key: 'creative_copy',  label: 'Criativo Texto' },
  { key: 'carousel_image', label: 'Carrossel Imagem' },
  { key: 'creative_image', label: 'Criativo Imagem' },
]

export default function AdminPromptsPage() {
  const [prompts,    setPrompts]    = useState<Prompt[]>([])
  const [loading,    setLoading]    = useState(true)
  const [typeFilter, setTypeFilter] = useState('all')
  const [toast,      setToast]      = useState<{ msg: string; ok: boolean } | null>(null)
  const [deleting,   setDeleting]   = useState<string | null>(null)
  const [toggling,   setToggling]   = useState<string | null>(null)
  const [duping,     setDuping]     = useState<string | null>(null)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (typeFilter !== 'all') params.set('type', typeFilter)
      const res = await fetch(`/api/admin/prompts?${params}`)
      if (res.ok) setPrompts(await res.json())
    } finally {
      setLoading(false)
    }
  }, [typeFilter])

  useEffect(() => { load() }, [load])

  async function handleToggle(p: Prompt) {
    setToggling(p.id)
    try {
      const res = await fetch(`/api/admin/prompts/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !p.active }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      showToast(p.active ? 'Prompt desativado' : 'Prompt ativado — outros do mesmo tipo foram desativados')
      load()
    } catch (e: any) {
      showToast(e.message, false)
    } finally {
      setToggling(null)
    }
  }

  async function handleDuplicate(id: string) {
    setDuping(id)
    try {
      const res = await fetch(`/api/admin/prompts/${id}/duplicate`, { method: 'POST' })
      if (!res.ok) throw new Error((await res.json()).error)
      showToast('Prompt duplicado!')
      load()
    } catch (e: any) {
      showToast(e.message, false)
    } finally {
      setDuping(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este prompt? Esta ação não pode ser desfeita.')) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/admin/prompts/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error)
      showToast('Prompt excluído')
      setPrompts(prev => prev.filter(p => p.id !== id))
    } catch (e: any) {
      showToast(e.message, false)
    } finally {
      setDeleting(null)
    }
  }

  // Group prompts by type for display
  const grouped: Record<string, Prompt[]> = {}
  prompts.forEach(p => {
    if (!grouped[p.type]) grouped[p.type] = []
    grouped[p.type].push(p)
  })

  return (
    <div className="p-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold transition-all ${
          toast.ok ? 'bg-green-500/20 border border-green-500/30 text-green-400' : 'bg-red-500/20 border border-red-500/30 text-red-400'
        }`}>
          {toast.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black mb-1">Prompts de IA</h1>
          <p className="text-gray-400 text-sm">Gerencie os templates de prompt usados pelo Gemini</p>
        </div>
        <Link
          href="/admin/prompts/new"
          className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-all hover:scale-105"
        >
          <Plus size={18} />
          Novo Prompt
        </Link>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 glass border border-blue-500/20 rounded-xl p-4 mb-6">
        <Wand2 size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-gray-300">
          <span className="font-semibold text-blue-400">Como funciona:</span>{' '}
          Apenas um prompt por tipo pode estar <span className="text-green-400 font-semibold">ativo</span>. O prompt ativo é usado automaticamente na geração de conteúdo. Ao ativar um prompt, os outros do mesmo tipo são desativados.
        </div>
      </div>

      {/* Type filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TYPE_FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setTypeFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              typeFilter === f.key
                ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border border-blue-500/30'
                : 'glass text-gray-400 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 size={24} className="animate-spin mr-2" /> Carregando…
        </div>
      ) : prompts.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Wand2 size={40} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Nenhum prompt encontrado</p>
          <Link href="/admin/prompts/new" className="mt-4 inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm font-semibold">
            <Plus size={14} /> Criar primeiro prompt
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([type, items]) => {
            const info = TYPE_LABELS[type as PromptType]
            return (
              <div key={type}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${info.color}`} />
                  <h2 className="text-sm font-bold text-gray-300">{info.label}</h2>
                  <span className="text-xs text-gray-500">({items.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {items.map(p => (
                    <div
                      key={p.id}
                      className={`glass rounded-2xl p-5 flex flex-col gap-3 border transition-all ${
                        p.active ? 'border-green-500/25 bg-green-500/5' : 'border-white/5'
                      }`}
                    >
                      {/* Top row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="font-semibold text-sm truncate">{p.name}</h3>
                            {p.active && (
                              <span className="flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/20">
                                ativo
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-gray-500">
                            <span>v{p.version}</span>
                            <span>·</span>
                            <span className="flex items-center gap-0.5"><History size={9} /> {p._count.versions} vers.</span>
                            <span>·</span>
                            <span>{new Date(p.updatedAt).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Content preview */}
                      <p className="text-[11px] text-gray-400 line-clamp-3 font-mono leading-relaxed bg-white/5 rounded-lg p-2">
                        {p.content}
                      </p>

                      {/* Actions */}
                      <div className="flex items-center gap-1 pt-1 border-t border-white/5">
                        <Link
                          href={`/admin/prompts/${p.id}/edit`}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass hover:bg-white/10 text-xs font-medium text-gray-300 hover:text-white transition-all"
                        >
                          <Pencil size={12} />
                          Editar
                        </Link>

                        <button
                          onClick={() => handleToggle(p)}
                          disabled={toggling === p.id}
                          title={p.active ? 'Desativar' : 'Ativar'}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 ${
                            p.active
                              ? 'text-green-400 hover:bg-green-500/10'
                              : 'text-gray-400 hover:text-green-400 hover:bg-green-500/10 glass'
                          }`}
                        >
                          {toggling === p.id
                            ? <Loader2 size={12} className="animate-spin" />
                            : p.active ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                          {p.active ? 'Ativo' : 'Ativar'}
                        </button>

                        <div className="ml-auto flex items-center gap-1">
                          <button
                            onClick={() => handleDuplicate(p.id)}
                            disabled={duping === p.id}
                            title="Duplicar"
                            className="p-1.5 rounded-lg glass hover:bg-white/10 text-gray-400 hover:text-white transition-all disabled:opacity-50"
                          >
                            {duping === p.id ? <Loader2 size={13} className="animate-spin" /> : <Copy size={13} />}
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            disabled={deleting === p.id}
                            title="Excluir"
                            className="p-1.5 rounded-lg glass hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-all disabled:opacity-50"
                          >
                            {deleting === p.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
