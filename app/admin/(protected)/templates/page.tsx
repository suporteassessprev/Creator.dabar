'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Plus, RefreshCw, Loader2, AlertCircle,
  Edit2, Copy, Trash2, Eye, EyeOff,
  ToggleLeft, ToggleRight, Filter, Sparkles, Wand2,
} from 'lucide-react'

/* ─── Types ─────────────────────────────────────────── */
interface Template {
  id: string
  name: string
  description: string | null
  mode: string
  format: string
  layout: string
  palette: string | null
  active: boolean
  published: boolean
  createdAt: string
  updatedAt: string
}

interface Palette {
  value: string
  label: string
  bg: string
  accent: string
  text: string
}

/* ─── Helpers ─────────────────────────────────────────── */
function parsePalette(json: string | null): Palette {
  const fallback: Palette = { value: 'dark', label: 'Dark', bg: '#0f172a', accent: '#0ea5e9', text: '#ffffff' }
  if (!json) return fallback
  try { return JSON.parse(json) } catch { return fallback }
}

const MODE_LABEL: Record<string, string> = {
  creative: 'Criativo',
  carousel: 'Carrossel',
  both:     'Ambos',
}

const FORMAT_LABEL: Record<string, string> = {
  square:         'Feed 1:1',
  'feed-vertical':'Feed 4:5',
  story:          'Story',
}

/* ─── Card component ─────────────────────────────────── */
function TemplateCard({
  template,
  onDelete,
  onDuplicate,
  onTogglePublish,
  onToggleActive,
}: {
  template: Template
  onDelete:         (id: string) => void
  onDuplicate:      (id: string) => void
  onTogglePublish:  (id: string, value: boolean) => void
  onToggleActive:   (id: string, value: boolean) => void
}) {
  const palette = parsePalette(template.palette)
  const [delConfirm, setDelConfirm] = useState(false)

  return (
    <div className="glass rounded-2xl overflow-hidden flex flex-col transition-all hover:border-white/10 border border-white/5">
      {/* Color band preview */}
      <div
        className="h-20 relative flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${palette.bg}, ${palette.accent}55)`,
        }}
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(circle at 70% 40%, ${palette.accent}88, transparent 60%)`,
          }}
        />
        <div className="relative z-10 text-center px-4">
          <div
            className="text-lg font-black truncate max-w-[180px]"
            style={{ color: palette.bg === '#f8fafc' ? '#0f172a' : '#fff' }}
          >
            {template.name}
          </div>
          <div
            className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold"
            style={{ backgroundColor: palette.accent + 'cc', color: '#fff' }}
          >
            {template.layout.replace(/-/g, ' ')}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col gap-3">
        {template.description && (
          <p className="text-xs text-gray-400 line-clamp-2">{template.description}</p>
        )}

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/20">
            {MODE_LABEL[template.mode] ?? template.mode}
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/20">
            {FORMAT_LABEL[template.format] ?? template.format}
          </span>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
            style={{ backgroundColor: palette.accent + '22', color: palette.accent, borderColor: palette.accent + '44' }}
          >
            {palette.label}
          </span>
        </div>

        {/* Status row */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onTogglePublish(template.id, !template.published)}
            className={`flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-full border transition-all hover:scale-105 ${
              template.published
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-gray-500/10 text-gray-400 border-gray-500/20 hover:border-gray-400/40'
            }`}
          >
            {template.published ? <Eye size={10} /> : <EyeOff size={10} />}
            {template.published ? 'Publicado' : 'Rascunho'}
          </button>

          <button
            onClick={() => onToggleActive(template.id, !template.active)}
            className={`flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-full border transition-all hover:scale-105 ${
              template.active
                ? 'bg-green-500/20 text-green-300 border-green-500/30'
                : 'bg-gray-500/10 text-gray-400 border-gray-500/20 hover:border-gray-400/40'
            }`}
          >
            {template.active ? <ToggleRight size={10} /> : <ToggleLeft size={10} />}
            {template.active ? 'Ativo' : 'Inativo'}
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex items-center gap-2">
        <Link
          href={`/admin/templates/${template.id}/edit`}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold glass hover:bg-white/10 text-gray-300 transition-all"
        >
          <Edit2 size={12} /> Editar
        </Link>
        <button
          onClick={() => onDuplicate(template.id)}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold glass hover:bg-white/10 text-gray-300 transition-all"
          title="Duplicar"
        >
          <Copy size={12} />
        </button>
        {delConfirm ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => { onDelete(template.id); setDelConfirm(false) }}
              className="px-2 py-2 rounded-xl text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 transition-all"
            >
              Confirmar
            </button>
            <button
              onClick={() => setDelConfirm(false)}
              className="px-2 py-2 rounded-xl text-xs text-gray-400 glass hover:bg-white/10 transition-all"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => setDelConfirm(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold glass hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-all"
            title="Excluir"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── Main page ──────────────────────────────────────── */
export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')

  // Filters
  const [filterMode,      setFilterMode]      = useState('all')
  const [filterPublished, setFilterPublished] = useState('all')

  // Seed preset state — fires the curated /api/admin/templates/seed-presets
  // endpoint and refreshes the list.
  const [seeding, setSeeding] = useState(false)
  const [seedResult, setSeedResult] = useState<string>('')

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (filterMode !== 'all')      params.set('mode',      filterMode)
      if (filterPublished !== 'all') params.set('published', filterPublished)

      const res = await fetch(`/api/admin/templates?${params}`)
      if (!res.ok) throw new Error('Erro ao carregar templates')
      setTemplates(await res.json())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [filterMode, filterPublished])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  async function handleSeedPresets() {
    setSeeding(true)
    setSeedResult('')
    try {
      const res = await fetch('/api/admin/templates/seed-presets', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao criar templates')
      setSeedResult(
        data.created > 0
          ? `${data.created} template(s) criado(s) — publique pra liberar pros usuários.`
          : `Nenhum novo. Os ${data.skipped} já existem.`
      )
      await fetchTemplates()
    } catch (e: any) {
      setSeedResult(`Erro: ${e.message}`)
    } finally {
      setSeeding(false)
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/templates/${id}`, { method: 'DELETE' })
    if (res.ok) setTemplates(prev => prev.filter(t => t.id !== id))
  }

  async function handleDuplicate(id: string) {
    const res = await fetch(`/api/admin/templates/${id}/duplicate`, { method: 'POST' })
    if (res.ok) {
      const copy = await res.json()
      setTemplates(prev => [copy, ...prev])
    }
  }

  async function handleTogglePublish(id: string, value: boolean) {
    const res = await fetch(`/api/admin/templates/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: value }),
    })
    if (res.ok) {
      const updated = await res.json()
      setTemplates(prev => prev.map(t => t.id === id ? updated : t))
    }
  }

  async function handleToggleActive(id: string, value: boolean) {
    const res = await fetch(`/api/admin/templates/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: value }),
    })
    if (res.ok) {
      const updated = await res.json()
      setTemplates(prev => prev.map(t => t.id === id ? updated : t))
    }
  }

  const publishedCount = templates.filter(t => t.published).length
  const draftCount     = templates.filter(t => !t.published).length
  const activeCount    = templates.filter(t => t.active).length

  return (
    <div className="p-8 min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black mb-1">Templates</h1>
          <p className="text-gray-400 text-sm">Gerencie os templates visuais do gerador</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchTemplates}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm glass text-gray-400 hover:text-white transition-all"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
          <button
            onClick={handleSeedPresets}
            disabled={seeding}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold glass border border-amber-500/30 text-amber-300 hover:bg-amber-500/10 transition-all disabled:opacity-50"
            title="Cria 5 templates de exemplo (estilo MyPostFlow) no banco. Idempotente — não duplica."
          >
            {seeding ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
            Seedar exemplos
          </button>
          <Link
            href="/admin/templates/from-image"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold glass border border-purple-500/30 text-purple-300 hover:bg-purple-500/10 transition-all"
            title="Envie um print de um criativo e a IA recria como template editável"
          >
            <Sparkles size={16} /> Criar com IA
          </Link>
          <Link
            href="/admin/templates/new"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90 transition-all"
          >
            <Plus size={16} /> Novo Template
          </Link>
        </div>
      </div>

      {seedResult && (
        <div className="mb-4 px-4 py-2 rounded-lg glass border border-amber-500/30 text-amber-200 text-sm">
          {seedResult}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total',      value: templates.length, color: 'from-blue-500 to-cyan-500'   },
          { label: 'Publicados', value: publishedCount,   color: 'from-emerald-500 to-teal-500' },
          { label: 'Rascunhos',  value: draftCount,       color: 'from-orange-500 to-yellow-500' },
        ].map(s => (
          <div key={s.label} className="glass rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-xl font-black text-white flex-shrink-0`}>
              {s.value}
            </div>
            <span className="text-sm text-gray-400">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl p-4 mb-6 flex flex-wrap items-center gap-3">
        <Filter size={15} className="text-gray-400" />
        <span className="text-xs font-semibold text-gray-400">Modo:</span>
        {['all','creative','carousel','both'].map(v => (
          <button
            key={v}
            onClick={() => setFilterMode(v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterMode === v
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                : 'glass text-gray-400 hover:text-white'
            }`}
          >
            {v === 'all' ? 'Todos' : v === 'creative' ? 'Criativo' : v === 'carousel' ? 'Carrossel' : 'Ambos'}
          </button>
        ))}

        <div className="w-px h-5 bg-white/10 mx-1" />

        <span className="text-xs font-semibold text-gray-400">Status:</span>
        {[
          { v: 'all',   label: 'Todos'     },
          { v: 'true',  label: 'Publicados' },
          { v: 'false', label: 'Rascunhos'  },
        ].map(({ v, label }) => (
          <button
            key={v}
            onClick={() => setFilterPublished(v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterPublished === v
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'glass text-gray-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 mb-6 text-red-400 text-sm glass border border-red-500/20 rounded-xl p-4">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-gray-500">
          <Loader2 size={24} className="animate-spin mr-3" />
          Carregando templates...
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-24">
          <div className="text-6xl mb-4">🎨</div>
          <h3 className="text-xl font-bold mb-2">Nenhum template encontrado</h3>
          <p className="text-gray-400 text-sm mb-6">
            {filterMode !== 'all' || filterPublished !== 'all'
              ? 'Tente mudar os filtros acima'
              : 'Crie o primeiro template para o gerador'}
          </p>
          <Link
            href="/admin/templates/new"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90 transition-all"
          >
            <Plus size={16} /> Criar Primeiro Template
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {templates.map(t => (
            <TemplateCard
              key={t.id}
              template={t}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              onTogglePublish={handleTogglePublish}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      )}
    </div>
  )
}
