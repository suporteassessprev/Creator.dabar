'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import SlidePreview from '@/components/SlidePreview'
import { Slide, SlideLayout, CreativeFormat } from '@/lib/store'
import {
  Save, Loader2, AlertCircle,
  Square, RectangleVertical, Smartphone,
  Eye, EyeOff, ToggleLeft, ToggleRight,
} from 'lucide-react'

/* ─── Types ─────────────────────────────────────────── */
export interface TemplateFormValues {
  name: string
  description: string
  mode: 'creative' | 'carousel' | 'both'
  format: CreativeFormat
  layout: SlideLayout
  palette: string   // JSON string
  active: boolean
  published: boolean
}

interface Props {
  initialValues?: Partial<TemplateFormValues>
  templateId?: string   // present when editing
  onSuccess?: () => void
}

/* ─── Constants ─────────────────────────────────────── */
const PALETTES = [
  { value: 'dark',     label: 'Dark',    bg: '#0f172a', accent: '#0ea5e9', text: '#ffffff', theme: 'dark'     },
  { value: 'gradient', label: 'Magenta', bg: '#1a0533', accent: '#d946ef', text: '#ffffff', theme: 'gradient' },
  { value: 'light',    label: 'Light',   bg: '#f8fafc', accent: '#0ea5e9', text: '#0f172a', theme: 'light'    },
  { value: 'minimal',  label: 'Gold',    bg: '#111827', accent: '#f59e0b', text: '#ffffff', theme: 'minimal'  },
  { value: 'red',      label: 'Red',     bg: '#1f0d0d', accent: '#ef4444', text: '#ffffff', theme: 'dark'     },
  { value: 'green',    label: 'Green',   bg: '#0d1f12', accent: '#22c55e', text: '#ffffff', theme: 'dark'     },
] as const

const LAYOUTS: { value: SlideLayout; label: string; desc: string }[] = [
  { value: 'headline-banner',   label: 'Headline + Faixa',   desc: 'Título com box colorido'        },
  { value: 'split-horizontal',  label: 'Split horizontal',    desc: 'Texto cima / imagem baixo'      },
  { value: 'dark-overlay',      label: 'Overlay escuro',      desc: 'Imagem cheia, texto na base'    },
  { value: 'centered-brutalist',label: 'Centralizado',        desc: 'Texto no centro com bordas'     },
]

const FORMATS: { value: CreativeFormat; label: string; icon: any; ratio: string }[] = [
  { value: 'square',       label: 'Feed 1:1', icon: Square,           ratio: '1080×1080' },
  { value: 'feed-vertical',label: 'Feed 4:5', icon: RectangleVertical, ratio: '1080×1350' },
  { value: 'story',        label: 'Story',    icon: Smartphone,        ratio: '1080×1920' },
]

const MODES = [
  { value: 'creative', label: 'Criativo',  desc: 'Anúncio único' },
  { value: 'carousel', label: 'Carrossel', desc: 'Multi-slides'  },
  { value: 'both',     label: 'Ambos',     desc: 'Qualquer modo' },
] as const

/* ─── Helpers ────────────────────────────────────────── */
function defaultPaletteJson(value = 'dark') {
  const p = PALETTES.find(x => x.value === value) ?? PALETTES[0]
  return JSON.stringify(p)
}

function parsePalette(json: string | null | undefined) {
  if (!json) return PALETTES[0]
  try { return JSON.parse(json) } catch { return PALETTES[0] }
}

/* ─── Component ──────────────────────────────────────── */
export default function TemplateForm({ initialValues, templateId, onSuccess }: Props) {
  const router = useRouter()

  const defaultPalette = initialValues?.palette
    ? parsePalette(initialValues.palette)
    : PALETTES[0]

  const [name,        setName]        = useState(initialValues?.name        ?? '')
  const [description, setDescription] = useState(initialValues?.description ?? '')
  const [mode,        setMode]        = useState<TemplateFormValues['mode']>(initialValues?.mode ?? 'creative')
  const [format,      setFormat]      = useState<CreativeFormat>(initialValues?.format ?? 'square')
  const [layout,      setLayout]      = useState<SlideLayout>(initialValues?.layout ?? 'headline-banner')
  const [palette,     setPalette]     = useState(defaultPalette)
  const [active,      setActive]      = useState(initialValues?.active      ?? true)
  const [published,   setPublished]   = useState(initialValues?.published   ?? false)

  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const previewSlide: Slide = {
    id: 'preview',
    title: name || 'TITULO DO TEMPLATE',
    subtitle: description || 'Descrição ou subtítulo gerado pela IA',
    content:  description || 'Descrição ou subtítulo gerado pela IA',
    cta: 'SAIBA MAIS',
    backgroundColor: palette.bg,
    textColor: palette.bg === '#f8fafc' ? '#0f172a' : '#ffffff',
    accentColor: palette.accent,
    fontFamily: 'Inter',
    layout,
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Nome é obrigatório'); return }
    setError('')
    setLoading(true)

    const body: TemplateFormValues = {
      name:        name.trim(),
      description: description.trim(),
      mode,
      format,
      layout,
      palette: JSON.stringify(palette),
      active,
      published,
    }

    try {
      const url    = templateId ? `/api/admin/templates/${templateId}` : '/api/admin/templates'
      const method = templateId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao salvar')
      }

      onSuccess?.()
      router.push('/admin/templates')
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black mb-1">
            {templateId ? 'Editar Template' : 'Novo Template'}
          </h1>
          <p className="text-gray-400 text-sm">Configure o visual e comportamento do template</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/admin/templates')}
            className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white glass transition-all"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              loading
                ? 'bg-white/10 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90'
            }`}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {loading ? 'Salvando...' : 'Salvar Template'}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 mb-6 text-red-400 text-sm glass border border-red-500/20 rounded-xl p-4">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left: Form fields ── */}
        <div className="space-y-5">

          {/* Name + Description */}
          <div className="glass rounded-2xl p-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-300 mb-1 block">
                Nome do template *
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Dark Viral, Gold Premium..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 placeholder-gray-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-300 mb-1 block">
                Descrição (opcional)
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Ex: Ideal para produtos digitais com visual escuro e impactante..."
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-blue-500/50 placeholder-gray-500"
              />
            </div>
          </div>

          {/* Mode */}
          <div className="glass rounded-2xl p-5">
            <label className="text-sm font-semibold mb-3 block">Modo de uso</label>
            <div className="grid grid-cols-3 gap-2">
              {MODES.map(m => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMode(m.value)}
                  className={`px-3 py-3 rounded-xl text-center transition-all ${
                    mode === m.value
                      ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/40 text-white'
                      : 'glass hover:bg-white/10 text-gray-400'
                  }`}
                >
                  <div className="text-xs font-bold">{m.label}</div>
                  <div className="text-[10px] opacity-60 mt-0.5">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Format */}
          <div className="glass rounded-2xl p-5">
            <label className="text-sm font-semibold mb-3 block">Formato</label>
            <div className="grid grid-cols-3 gap-2">
              {FORMATS.map(f => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFormat(f.value)}
                  className={`p-3 rounded-xl text-center transition-all ${
                    format === f.value
                      ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/40 text-white'
                      : 'glass hover:bg-white/10 text-gray-400'
                  }`}
                >
                  <f.icon size={20} className="mx-auto mb-1" />
                  <div className="text-xs font-semibold">{f.label}</div>
                  <div className="text-[10px] opacity-60">{f.ratio}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Layout */}
          <div className="glass rounded-2xl p-5">
            <label className="text-sm font-semibold mb-3 block">Layout visual</label>
            <div className="grid grid-cols-2 gap-2">
              {LAYOUTS.map(l => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setLayout(l.value)}
                  className={`px-3 py-2.5 rounded-xl text-left transition-all ${
                    layout === l.value
                      ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/40 text-white'
                      : 'glass hover:bg-white/10 text-gray-400'
                  }`}
                >
                  <div className="text-xs font-bold">{l.label}</div>
                  <div className="text-[10px] opacity-60 mt-0.5">{l.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Palette */}
          <div className="glass rounded-2xl p-5">
            <label className="text-sm font-semibold mb-3 block">Paleta de cores</label>
            <div className="grid grid-cols-3 gap-2">
              {PALETTES.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPalette(p)}
                  className={`p-3 rounded-xl transition-all border ${
                    palette.value === p.value
                      ? 'border-blue-500 scale-105'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                  style={{ backgroundColor: p.bg }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: p.accent }} />
                    <span
                      className="text-xs font-semibold"
                      style={{ color: p.bg === '#f8fafc' ? '#0f172a' : '#fff' }}
                    >
                      {p.label}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Status toggles */}
          <div className="glass rounded-2xl p-5 space-y-4">
            <label className="text-sm font-semibold block">Status</label>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium flex items-center gap-2">
                  {active ? <ToggleRight size={18} className="text-green-400" /> : <ToggleLeft size={18} className="text-gray-500" />}
                  Ativo
                </div>
                <div className="text-xs text-gray-500 mt-0.5">Template disponível para uso</div>
              </div>
              <button
                type="button"
                onClick={() => setActive(!active)}
                className={`w-12 h-6 rounded-full transition-all relative ${active ? 'bg-green-500' : 'bg-gray-600'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${active ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium flex items-center gap-2">
                  {published ? <Eye size={18} className="text-blue-400" /> : <EyeOff size={18} className="text-gray-500" />}
                  Publicado
                </div>
                <div className="text-xs text-gray-500 mt-0.5">Visível para usuários no gerador</div>
              </div>
              <button
                type="button"
                onClick={() => setPublished(!published)}
                className={`w-12 h-6 rounded-full transition-all relative ${published ? 'bg-blue-500' : 'bg-gray-600'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${published ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Right: Live preview ── */}
        <div className="space-y-5">
          <div className="glass rounded-2xl p-5 sticky top-6">
            <label className="text-sm font-semibold mb-3 block">Pré-visualização ao vivo</label>
            <div className="max-w-xs mx-auto">
              <SlidePreview
                slide={previewSlide}
                index={0}
                size="md"
                format={format}
                showSlideNumber={false}
              />
            </div>
            <p className="text-center text-[10px] text-gray-500 mt-3">
              Atualiza em tempo real conforme você edita
            </p>

            {/* Summary */}
            <div className="mt-4 space-y-2">
              <div className="flex flex-wrap gap-2">
                <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/20">
                  {mode === 'creative' ? 'Criativo' : mode === 'carousel' ? 'Carrossel' : 'Ambos'}
                </span>
                <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/20">
                  {FORMATS.find(f => f.value === format)?.label}
                </span>
                <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-white/10 text-gray-300">
                  {LAYOUTS.find(l => l.value === layout)?.label}
                </span>
              </div>
              <div className="flex gap-2">
                <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border ${
                  active
                    ? 'bg-green-500/20 text-green-300 border-green-500/20'
                    : 'bg-gray-500/20 text-gray-400 border-gray-500/20'
                }`}>
                  {active ? '✓ Ativo' : '✗ Inativo'}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border ${
                  published
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/20'
                    : 'bg-gray-500/20 text-gray-400 border-gray-500/20'
                }`}>
                  {published ? '● Publicado' : '○ Rascunho'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}
