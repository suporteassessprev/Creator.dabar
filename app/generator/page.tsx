'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import SlidePreview from '@/components/SlidePreview'
import {
  useAppStore,
  createNewCarousel,
  createSlide,
  Slide,
  SlideLayout,
  CreativeFormat,
  CarouselMode,
} from '@/lib/store'
import { contentToSlides as buildSlides } from '@/lib/gemini'
import {
  Sparkles, Zap, Loader2,
  AlertCircle, Settings2, Image as ImageIcon, Type,
  LayoutGrid, Megaphone, Square, RectangleVertical, Smartphone,
  ChevronDown, ChevronUp, LayoutTemplate, X,
} from 'lucide-react'

/* ─── Constants ─────────────────────────────────────── */
const TONES = [
  { value: 'viral',        label: '🔥 Viral',        desc: 'Para parar o scroll' },
  { value: 'educativo',    label: '📚 Educativo',     desc: 'Ensinar e informar'  },
  { value: 'motivacional', label: '💪 Motivacional',  desc: 'Inspirar e engajar'  },
  { value: 'profissional', label: '💼 Profissional',  desc: 'Autoridade'           },
  { value: 'humoristico',  label: '😄 Humor',         desc: 'Leve e divertido'    },
]

const THEMES = [
  { value: 'dark',     label: 'Dark',    bg: '#0f172a', accent: '#0ea5e9' },
  { value: 'gradient', label: 'Magenta', bg: '#1a0533', accent: '#d946ef' },
  { value: 'light',    label: 'Light',   bg: '#f8fafc', accent: '#0ea5e9' },
  { value: 'minimal',  label: 'Gold',    bg: '#111827', accent: '#f59e0b' },
  { value: 'red',      label: 'Red',     bg: '#1f0d0d', accent: '#ef4444' },
  { value: 'green',    label: 'Green',   bg: '#0d1f12', accent: '#22c55e' },
] as const

const FORMATS: { value: CreativeFormat; label: string; icon: any; ratio: string }[] = [
  { value: 'square',        label: 'Feed 1:1',  icon: Square,            ratio: '1080×1080' },
  { value: 'feed-vertical', label: 'Feed 4:5',  icon: RectangleVertical, ratio: '1080×1350' },
  { value: 'story',         label: 'Story 9:16',icon: Smartphone,        ratio: '1080×1920' },
]

const LAYOUTS: { value: SlideLayout; label: string; desc: string }[] = [
  { value: 'headline-banner',    label: 'Headline + Faixa',  desc: 'Título com box colorido'     },
  { value: 'split-horizontal',   label: 'Split horizontal',   desc: 'Texto cima / imagem baixo'   },
  { value: 'dark-overlay',       label: 'Overlay escuro',     desc: 'Imagem cheia, texto na base' },
  { value: 'centered-brutalist', label: 'Centralizado',       desc: 'Texto no centro com bordas'  },
]

/* ─── Published template type ───────────────────────── */
interface PublishedTemplate {
  id: string
  name: string
  description: string | null
  mode: string
  format: string
  layout: string
  style: string | null
  palette: string | null
  structure?: string | null  // Phase 3: visual template JSON, may be null for legacy
}

interface ParsedPalette {
  value?: string; label?: string
  bg: string; accent: string; text?: string; theme?: string
}

function parsePalette(json: string | null): ParsedPalette | null {
  if (!json) return null
  try { return JSON.parse(json) } catch { return null }
}

/* ─── Template mini-card ─────────────────────────────── */
function TemplateCard({
  template, selected, onSelect,
}: { template: PublishedTemplate; selected: boolean; onSelect: () => void }) {
  const palette = parsePalette(template.palette)
  const bg      = palette?.bg     ?? '#0f172a'
  const accent  = palette?.accent ?? '#0ea5e9'

  return (
    <button
      onClick={onSelect}
      className={`flex-shrink-0 w-36 rounded-xl overflow-hidden border transition-all text-left ${
        selected
          ? 'border-blue-500 ring-2 ring-blue-500/30 scale-105'
          : 'border-white/10 hover:border-white/20'
      }`}
    >
      <div className="h-16 relative" style={{ background: `linear-gradient(135deg, ${bg}, ${accent}55)` }}>
        <div className="absolute inset-0 opacity-40"
          style={{ background: `radial-gradient(circle at 70% 30%, ${accent}88, transparent 60%)` }} />
        {selected && (
          <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
            <span className="text-white text-[9px] font-bold">✓</span>
          </div>
        )}
      </div>
      <div className="p-2" style={{ backgroundColor: bg + 'cc' }}>
        <div className="text-[11px] font-bold truncate" style={{ color: bg === '#f8fafc' ? '#0f172a' : '#fff' }}>
          {template.name}
        </div>
        <div className="text-[9px] mt-0.5 opacity-70 truncate" style={{ color: bg === '#f8fafc' ? '#374151' : '#9ca3af' }}>
          {template.mode === 'creative' ? 'Criativo' : template.mode === 'carousel' ? 'Carrossel' : 'Ambos'}
          {' · '}
          {template.format === 'square' ? '1:1' : template.format === 'feed-vertical' ? '4:5' : '9:16'}
        </div>
      </div>
    </button>
  )
}

/* ─── Main page ──────────────────────────────────────── */
export default function GeneratorPage() {
  const router = useRouter()
  const { addCarousel, setCurrentCarousel, setIsGenerating } = useAppStore()

  const [mode,           setMode]           = useState<CarouselMode>('creative')
  const [topic,          setTopic]          = useState('')
  const [slideCount,     setSlideCount]     = useState(7)
  const [tone,           setTone]           = useState('viral')
  const [audience,       setAudience]       = useState('empreendedores e criadores de conteúdo')
  const [selectedTheme,  setSelectedTheme]  = useState<typeof THEMES[number]>(THEMES[0])
  const [format,         setFormat]         = useState<CreativeFormat>('square')
  const [layout,         setLayout]         = useState<SlideLayout>('headline-banner')
  const [generateImages, setGenerateImages] = useState(true)

  const [isLoading, setIsLoading] = useState(false)
  const [progress,  setProgress]  = useState<{ step: string; value: number } | null>(null)
  const [error,     setError]     = useState('')

  // Template selector
  const [templates,          setTemplates]          = useState<PublishedTemplate[]>([])
  const [templatesLoading,   setTemplatesLoading]   = useState(false)
  const [selectedTemplate,   setSelectedTemplate]   = useState<PublishedTemplate | null>(null)
  const [templatesPanelOpen, setTemplatesPanelOpen] = useState(false)

  useEffect(() => {
    setTemplatesLoading(true)
    fetch(`/api/templates?mode=${mode}`)
      .then(r => r.json())
      .then((data: PublishedTemplate[]) => {
        setTemplates(Array.isArray(data) ? data : [])
        if (selectedTemplate && selectedTemplate.mode !== mode && selectedTemplate.mode !== 'both') {
          setSelectedTemplate(null)
        }
      })
      .catch(() => setTemplates([]))
      .finally(() => setTemplatesLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  function applyTemplate(t: PublishedTemplate) {
    setSelectedTemplate(t)
    setTemplatesPanelOpen(false)
    const fmt = t.format as CreativeFormat
    if (['square','feed-vertical','story'].includes(fmt)) setFormat(fmt)
    const validLayouts: SlideLayout[] = ['headline-banner','split-horizontal','dark-overlay','centered-brutalist','centered','top','bottom','split']
    if (validLayouts.includes(t.layout as SlideLayout)) setLayout(t.layout as SlideLayout)
    const palette = parsePalette(t.palette)
    if (palette) {
      const match = THEMES.find(th => th.bg === palette.bg && th.accent === palette.accent)
        ?? THEMES.find(th => th.accent === palette.accent)
        ?? THEMES[0]
      setSelectedTheme(match)
    }
  }

  const handleGenerate = async () => {
    if (!topic.trim()) { setError('Digite o tema'); return }

    setError('')
    setIsLoading(true)
    setIsGenerating(true)
    setProgress({ step: '✍️ Gerando copy...', value: 20 })

    try {
      const style = {
        primaryColor:    selectedTheme.accent,
        secondaryColor:  '#d946ef',
        backgroundColor: selectedTheme.bg,
        textColor:       selectedTheme.bg === '#f8fafc' ? '#0f172a' : '#ffffff',
        fontFamily:      'Inter',
        theme: (['dark','light','gradient','minimal'].includes(selectedTheme.value)
          ? selectedTheme.value : 'dark') as 'dark' | 'light' | 'gradient' | 'minimal',
      }

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode, topic,
          slideCount: mode === 'carousel' ? slideCount : 1,
          style, tone,
          targetAudience: audience,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao gerar conteúdo')
      }

      const data = await res.json()
      setProgress({ step: '🎨 Montando criativo...', value: 50 })

      const carousel = createNewCarousel(topic, { style, format, mode })
      carousel.style = style

      // Phase 3: if a visual template is selected, carry its structure +
      // id onto the carousel. The editor renders via TemplateRenderer
      // when this is set; otherwise falls back to the legacy slide layout.
      if (selectedTemplate?.structure) {
        carousel.templateStructure = selectedTemplate.structure
        carousel.templateId = selectedTemplate.id
      } else {
        carousel.templateStructure = null
        carousel.templateId = selectedTemplate?.id ?? null
      }

      if (data.mode === 'creative' && data.creative) {
        carousel.title  = data.creative.headline
        carousel.slides = [
          createSlide({
            title: data.creative.headline, subtitle: data.creative.subtitle,
            content: data.creative.subtitle, cta: data.creative.cta,
            imagePrompt: data.creative.imagePrompt,
            backgroundColor: style.backgroundColor, textColor: style.textColor,
            accentColor: style.primaryColor, fontFamily: style.fontFamily, layout,
          }),
        ]
      } else {
        carousel.title  = data.title || topic
        carousel.slides = buildSlides(data.slides, style)
      }

      if (generateImages) {
        setProgress({ step: '🖼️ Gerando imagem com IA...', value: 60 })
        for (let i = 0; i < carousel.slides.length; i++) {
          const slide = carousel.slides[i]
          if (slide.imagePrompt) {
            try {
              const imgRes = await fetch('/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: slide.imagePrompt }),
              })
              if (imgRes.ok) {
                const { imageData } = await imgRes.json()
                carousel.slides[i] = { ...slide, imageUrl: imageData }
              }
            } catch {}
            setProgress({
              step:  `🖼️ Imagem ${i + 1}/${carousel.slides.length}...`,
              value: 60 + Math.round(((i + 1) / carousel.slides.length) * 30),
            })
          }
        }
      }

      carousel.status = 'ready'
      setProgress({ step: '✅ Pronto!', value: 100 })
      addCarousel(carousel)
      setCurrentCarousel(carousel)

      // Fire-and-forget: persist to DB (doesn't block the UI)
      fetch('/api/carousels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id:     carousel.id,
          title:  carousel.title,
          topic:  carousel.topic,
          mode:   carousel.mode,
          format: carousel.format,
          style:  JSON.stringify(carousel.style),
          status: carousel.status,
          slides: carousel.slides,
        }),
      }).catch(() => { /* DB save failed — localStorage is the fallback */ })

      setTimeout(() => { router.push(`/editor?id=${carousel.id}`) }, 600)
    } catch (err: any) {
      setError(err.message || 'Erro inesperado. Tente novamente.')
      setProgress(null)
    } finally {
      setIsLoading(false)
      setIsGenerating(false)
    }
  }

  const previewSlide: Slide = {
    id: 'preview',
    title:    topic || 'TITULO IMPACTANTE',
    subtitle: 'Subtítulo gerado pela IA',
    content:  'Subtítulo gerado pela IA',
    cta:      'QUERO SABER MAIS',
    backgroundColor: selectedTheme.bg,
    textColor:       selectedTheme.bg === '#f8fafc' ? '#0f172a' : '#ffffff',
    accentColor:     selectedTheme.accent,
    fontFamily:      'Inter',
    layout,
  }

  return (
    <AppLayout>
      <div className="p-8 max-w-6xl mx-auto">
        {/* Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-black mb-2">
            <span className="gradient-text">
              {mode === 'creative' ? 'Novo Criativo de Anúncio' : 'Novo Carrossel'}
            </span>
          </h1>
          <p className="text-gray-400 text-sm">
            {mode === 'creative'
              ? 'Gere imagem de fundo + copy posicionada em layouts virais'
              : 'Crie um carrossel viral com múltiplos slides'}
          </p>
        </div>

        {/* Mode toggle */}
        <div className="glass rounded-2xl p-2 mb-6 flex gap-2">
          {([
            { v: 'creative', icon: Megaphone, label: 'Criativo de Anúncio' },
            { v: 'carousel', icon: LayoutGrid,  label: 'Carrossel'            },
          ] as const).map(({ v, icon: Icon, label }) => (
            <button key={v} onClick={() => setMode(v)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
                mode === v
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        {/* ── Template selector ── */}
        <div className="glass rounded-2xl mb-6 overflow-hidden border border-white/5">
          <button
            onClick={() => setTemplatesPanelOpen(v => !v)}
            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/5 transition-colors"
          >
            <LayoutTemplate size={16} className="text-purple-400 flex-shrink-0" />
            <span className="text-sm font-semibold flex-1 text-left">
              {selectedTemplate ? (
                <span className="flex items-center gap-2 flex-wrap">
                  Template selecionado:
                  <span className="text-blue-400">{selectedTemplate.name}</span>
                  <span className="text-[10px] font-normal text-gray-500">(clique para trocar)</span>
                </span>
              ) : (
                <span>
                  Usar Template Visual{' '}
                  {templates.length > 0 && (
                    <span className="text-[10px] font-normal text-gray-500">
                      — {templates.length} disponíveis
                    </span>
                  )}
                </span>
              )}
            </span>
            {selectedTemplate && (
              <span
                role="button"
                onClick={e => { e.stopPropagation(); setSelectedTemplate(null) }}
                className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              >
                <X size={14} />
              </span>
            )}
            {templatesPanelOpen
              ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" />
              : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
          </button>

          {templatesPanelOpen && (
            <div className="border-t border-white/5 px-5 pb-5 pt-4">
              {templatesLoading ? (
                <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
                  <Loader2 size={14} className="animate-spin" /> Carregando templates...
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-500 text-sm mb-1">Nenhum template publicado para este modo</p>
                  <p className="text-gray-600 text-xs">
                    Crie e publique templates no{' '}
                    <a href="/admin/templates" className="text-blue-400 hover:underline">painel admin</a>
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-500 mb-3">
                    Escolha um template para aplicar layout, paleta e formato automaticamente.
                    Você ainda pode ajustar qualquer campo abaixo.
                  </p>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {/* Custom option */}
                    <button
                      onClick={() => { setSelectedTemplate(null); setTemplatesPanelOpen(false) }}
                      className={`flex-shrink-0 w-36 rounded-xl overflow-hidden border transition-all text-left ${
                        !selectedTemplate
                          ? 'border-blue-500 ring-2 ring-blue-500/30 scale-105'
                          : 'border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="h-16 flex items-center justify-center bg-white/5">
                        <Settings2 size={24} className="text-gray-400" />
                      </div>
                      <div className="p-2 bg-white/3">
                        <div className="text-[11px] font-bold text-gray-300">Personalizado</div>
                        <div className="text-[9px] text-gray-500 mt-0.5">Configurar manualmente</div>
                      </div>
                    </button>

                    {templates.map(t => (
                      <TemplateCard
                        key={t.id}
                        template={t}
                        selected={selectedTemplate?.id === t.id}
                        onSelect={() => applyTemplate(t)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Form ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left */}
          <div className="space-y-5">
            {/* Topic */}
            <div className="glass rounded-2xl p-5">
              <label className="flex items-center gap-2 text-sm font-semibold mb-3">
                <Type size={16} className="text-blue-400" />
                {mode === 'creative' ? 'Sobre o que é o anúncio?' : 'Tema do Carrossel'} *
              </label>
              <textarea
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder={
                  mode === 'creative'
                    ? 'Ex: Curso de Excel avançado com 70% de desconto...'
                    : 'Ex: 5 erros que impedem você de crescer no Instagram...'
                }
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-blue-500/50 placeholder-gray-500 transition-colors"
              />
            </div>

            {/* Tone */}
            <div className="glass rounded-2xl p-5">
              <label className="text-sm font-semibold mb-3 block">Tom da Copy</label>
              <div className="grid grid-cols-2 gap-2">
                {TONES.map(t => (
                  <button key={t.value} onClick={() => setTone(t.value)}
                    className={`px-3 py-2 rounded-xl text-left transition-all text-xs ${
                      tone === t.value
                        ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/40 text-white'
                        : 'glass hover:bg-white/10 text-gray-400'
                    }`}
                  >
                    <span className="font-semibold block">{t.label}</span>
                    <span className="opacity-60">{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Format */}
            {mode === 'creative' && (
              <div className="glass rounded-2xl p-5">
                <label className="text-sm font-semibold mb-3 block">
                  Formato
                  {selectedTemplate && <span className="ml-2 text-[10px] text-purple-400 font-normal">· do template</span>}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {FORMATS.map(f => (
                    <button key={f.value} onClick={() => setFormat(f.value)}
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
            )}

            {/* Layout */}
            {mode === 'creative' && (
              <div className="glass rounded-2xl p-5">
                <label className="text-sm font-semibold mb-3 block">
                  Layout do Criativo
                  {selectedTemplate && <span className="ml-2 text-[10px] text-purple-400 font-normal">· do template</span>}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {LAYOUTS.map(l => (
                    <button key={l.value} onClick={() => setLayout(l.value)}
                      className={`px-3 py-2 rounded-xl text-left transition-all text-xs ${
                        layout === l.value
                          ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/40 text-white'
                          : 'glass hover:bg-white/10 text-gray-400'
                      }`}
                    >
                      <span className="font-semibold block">{l.label}</span>
                      <span className="opacity-60">{l.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Settings */}
            <div className="glass rounded-2xl p-5">
              <label className="flex items-center gap-2 text-sm font-semibold mb-4">
                <Settings2 size={16} className="text-purple-400" /> Configurações
              </label>
              <div className="space-y-4">
                {mode === 'carousel' && (
                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Número de slides</span>
                      <span className="font-bold text-white">{slideCount}</span>
                    </div>
                    <input type="range" min={3} max={12} value={slideCount}
                      onChange={e => setSlideCount(Number(e.target.value))}
                      className="w-full accent-blue-500" />
                  </div>
                )}
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Público-alvo</label>
                  <input value={audience} onChange={e => setAudience(e.target.value)}
                    placeholder="Ex: empreendedores, mães, profissionais de marketing..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500/50 placeholder-gray-500" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon size={14} className="text-pink-400" />
                    <span className="text-xs text-gray-300">Gerar imagem de fundo com IA</span>
                  </div>
                  <button onClick={() => setGenerateImages(!generateImages)}
                    className={`w-10 h-5 rounded-full transition-all relative ${generateImages ? 'bg-blue-500' : 'bg-gray-600'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${generateImages ? 'left-5' : 'left-0.5'}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: theme + preview */}
          <div className="space-y-5">
            <div className="glass rounded-2xl p-5">
              <label className="text-sm font-semibold mb-3 block">
                Paleta de Cores
                {selectedTemplate && <span className="ml-2 text-[10px] text-purple-400 font-normal">· do template</span>}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {THEMES.map(theme => (
                  <button key={theme.value} onClick={() => setSelectedTheme(theme)}
                    className={`p-3 rounded-xl transition-all border ${
                      selectedTheme.value === theme.value
                        ? 'border-blue-500 scale-105' : 'border-white/10 hover:border-white/20'
                    }`}
                    style={{ backgroundColor: theme.bg }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.accent }} />
                      <span className="text-xs font-semibold"
                        style={{ color: theme.bg === '#f8fafc' ? '#0f172a' : '#fff' }}>
                        {theme.label}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="glass rounded-2xl p-5">
              <label className="text-sm font-semibold mb-3 block">Pré-visualização</label>
              <div className="max-w-xs mx-auto">
                <SlidePreview
                  slide={previewSlide} index={0} size="md"
                  format={mode === 'creative' ? format : 'square'} showSlideNumber={false} />
              </div>
              <p className="text-center text-[10px] text-gray-500 mt-2">
                A imagem de fundo será gerada pela IA
              </p>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 mt-4 text-red-400 text-sm glass border border-red-500/20 rounded-xl p-4">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Progress */}
        {isLoading && progress && (
          <div className="mt-4 glass rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <Loader2 size={16} className="text-blue-400 animate-spin" />
              <span className="text-sm text-gray-300">{progress.step}</span>
              <span className="ml-auto text-xs text-blue-400 font-bold">{progress.value}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                style={{ width: `${progress.value}%` }} />
            </div>
          </div>
        )}

        {/* Generate button */}
        <button onClick={handleGenerate} disabled={isLoading || !topic.trim()}
          className={`mt-6 w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-lg font-bold transition-all ${
            isLoading || !topic.trim()
              ? 'bg-white/10 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90 hover:scale-[1.02] glow-blue'
          }`}
        >
          {isLoading
            ? <><Loader2 size={22} className="animate-spin" /> Gerando...</>
            : <><Sparkles size={22} />
                {mode === 'creative' ? 'Gerar Criativo Viral' : 'Gerar Carrossel'}
                <Zap size={18} /></>}
        </button>

        <p className="text-center text-xs text-gray-500 mt-3">⚡ Powered by Google Gemini</p>
      </div>
    </AppLayout>
  )
}
