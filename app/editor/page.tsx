'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import SlidePreview from '@/components/SlidePreview'
import TemplateRenderer from '@/components/TemplateRenderer'
import EditableTemplateCanvas from '@/components/EditableTemplateCanvas'
import EditableElementSidebar from '@/components/EditableElementSidebar'
import ExportZipButton from '@/components/ExportZipButton'
import { useAppStore, Slide, SlideLayout, CreativeFormat } from '@/lib/store'
import {
  parseStructure, serializeStructure,
  type TemplateStructure, type TemplateElement,
} from '@/lib/template-structure'
import { ensureFontsLoaded } from '@/lib/ensure-fonts'
import {
  Save, Download, ChevronLeft, ChevronRight,
  Type, Palette, Image, Layout, Loader2,
  Sparkles, Trash2, Check, ArrowLeft,
  Square, RectangleVertical, Smartphone, Replace, X,
} from 'lucide-react'

const FONTS = ['Inter', 'Poppins', 'Georgia', 'Courier New', 'Arial']

const AD_LAYOUTS: { value: SlideLayout; label: string }[] = [
  { value: 'headline-banner', label: 'Headline + Faixa' },
  { value: 'split-horizontal', label: 'Split horizontal' },
  { value: 'dark-overlay', label: 'Overlay escuro' },
  { value: 'centered-brutalist', label: 'Centralizado' },
]

const CLASSIC_LAYOUTS: { value: SlideLayout; label: string }[] = [
  { value: 'centered', label: 'Centro' },
  { value: 'top', label: 'Topo' },
  { value: 'bottom', label: 'Base' },
  { value: 'split', label: 'Dividido' },
]

const FORMATS: { value: CreativeFormat; label: string; icon: any }[] = [
  { value: 'square', label: '1:1', icon: Square },
  { value: 'feed-vertical', label: '4:5', icon: RectangleVertical },
  { value: 'story', label: '9:16', icon: Smartphone },
]

function EditorContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const carouselId = searchParams.get('id')

  const { getCarousel, updateCarousel } = useAppStore()
  const [carousel, setCarousel] = useState<ReturnType<typeof getCarousel>>(undefined)
  const [activeSlideIndex, setActiveSlideIndex] = useState(0)
  const [activeTab, setActiveTab] = useState<'text' | 'style' | 'image' | 'layout'>('text')
  const [saved, setSaved] = useState(false)
  // Selected element in EditableTemplateCanvas — controlled here so the
  // right-hand sidebar can show element-specific controls.
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [canExportZip, setCanExportZip] = useState(false)
  const slideRef = useRef<HTMLDivElement>(null)

  // Template swap modal state
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([])

  // Lazy-load published templates the first time the user opens the picker
  useEffect(() => {
    if (!templatePickerOpen || availableTemplates.length > 0) return
    fetch('/api/templates')
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setAvailableTemplates(d) })
      .catch(() => {})
  }, [templatePickerOpen, availableTemplates.length])

  function applyTemplate(tpl: any) {
    if (!carousel) return
    setCarousel({
      ...carousel,
      templateStructure: tpl.structure ?? null,
      templateId: tpl.id,
    })
    setTemplatePickerOpen(false)
  }

  useEffect(() => {
    if (carouselId) {
      const c = getCarousel(carouselId)
      setCarousel(c)
    }
  }, [carouselId, getCarousel])

  // Fetch subscription info to gate ZIP export
  useEffect(() => {
    fetch('/api/user/subscription')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.canExportZip) setCanExportZip(true) })
      .catch(() => {})
  }, [])

  if (!carousel) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a0f]">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-gray-400">Carregando carrossel...</p>
        </div>
      </div>
    )
  }

  const activeSlide = carousel.slides[activeSlideIndex]

  const updateSlide = (updates: Partial<Slide>) => {
    const newSlides = carousel.slides.map((s, i) =>
      i === activeSlideIndex ? { ...s, ...updates } : s
    )
    setCarousel({ ...carousel, slides: newSlides })
  }

  const handleSave = () => {
    updateCarousel(carousel.id, {
      slides:            carousel.slides,
      format:            carousel.format,
      status:            'ready',
      templateStructure: carousel.templateStructure ?? null,
      templateId:        carousel.templateId ?? null,
    })
    // Best-effort persist to DB (fire-and-forget — UX doesn't block on it)
    fetch(`/api/carousels/${carousel.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title:  carousel.title,
        slides: carousel.slides,
        style:  JSON.stringify(carousel.style),
        status: 'ready',
      }),
    }).catch(() => {})
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleGenerateImage = async () => {
    if (!activeSlide.imagePrompt) return
    setIsGeneratingImage(true)
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: activeSlide.imagePrompt, mode: carousel.mode }),
      })
      if (res.ok) {
        const { imageData } = await res.json()
        // Keep a rolling history (max 4) so the user can A/B between
        // recent generations without burning extra credits.
        const previous = activeSlide.imageHistory ?? (activeSlide.imageUrl ? [activeSlide.imageUrl] : [])
        const nextHistory = [imageData, ...previous.filter(u => u !== imageData)].slice(0, 4)
        updateSlide({ imageUrl: imageData, imageHistory: nextHistory })
      } else {
        const err = await res.json().catch(() => ({ error: 'Erro ao gerar imagem' }))
        alert(err.error || 'Erro ao gerar imagem')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsGeneratingImage(false)
    }
  }

  /** Swap the active image to an earlier generation without re-spending credit. */
  const handlePickFromHistory = (url: string) => {
    if (url === activeSlide.imageUrl) return
    updateSlide({ imageUrl: url })
  }

  const handleExport = async () => {
    if (!slideRef.current) return
    const root = slideRef.current
    // Hide editor handles/overlays/selection rings while we capture — they
    // pollute the exported image. The EditableTemplateCanvas tags its
    // overlay with [data-editor-overlay] which we toggle off temporarily.
    const overlays = root.querySelectorAll<HTMLElement>('[data-editor-overlay]')
    overlays.forEach(o => { o.style.visibility = 'hidden' })

    // html2canvas does NOT resolve CSS container queries (cqw units).
    // We use cqw on auto-fit text so it scales with the canvas — but
    // when html2canvas captures, the text comes out in the wrong size,
    // sometimes overflowing the box.
    // Workaround: read the computed pixel size of every auto-fit text
    // span via getComputedStyle, apply it as an inline px override, then
    // restore the cqw value after capture.
    const autofitNodes = root.querySelectorAll<HTMLElement>('[data-autofit-text]')
    const restore: { el: HTMLElement; original: string }[] = []
    autofitNodes.forEach(el => {
      const computed = window.getComputedStyle(el).fontSize // resolves cqw → px
      restore.push({ el, original: el.style.fontSize })
      el.style.fontSize = computed
    })

    try {
      // Pre-load all (family, weight) combinations used in the slide
      // so the @font-face inliner below can see them in document.fonts.
      await ensureFontsLoaded(root)

      // Switched from html2canvas → html-to-image. html-to-image inlines
      // @font-face rules with the actual woff2 bytes as base64, which is
      // the only way to make web fonts work reliably in DOM screenshots.
      // It also respects object-fit, object-position, and other modern
      // CSS that html2canvas mangles.
      const { toPng } = await import('html-to-image')
      const dataUrl = await toPng(root, {
        pixelRatio: 3,
        cacheBust: true,
        fetchRequestInit: { mode: 'cors' },
        // Skip elements we don't want in the export (editor handles).
        filter: (node) => {
          if (!(node instanceof HTMLElement)) return true
          return !node.hasAttribute('data-editor-overlay')
        },
      })
      const link = document.createElement('a')
      link.download = `slide-${activeSlideIndex + 1}.png`
      link.href = dataUrl
      link.click()
    } catch (e) {
      console.error('Export error:', e)
    } finally {
      overlays.forEach(o => { o.style.visibility = '' })
      restore.forEach(({ el, original }) => { el.style.fontSize = original })
    }
  }

  // Parsed template (used for thumbnails too — if it exists, show
  // each slide rendered via TemplateRenderer instead of the legacy
  // SlidePreview which doesn't know about the new structure).
  const parsedTpl = parseStructure(carousel.templateStructure ?? null)

  return (
    <div className="bg-[#0a0a0f] h-screen">
      <div className="flex h-screen overflow-hidden">
        {/* Slide strip (left) */}
        <div className="w-24 shrink-0 border-r border-white/5 flex flex-col overflow-y-auto py-4 px-2 gap-2 bg-black/20">
          {carousel.slides.map((slide, i) => (
            <div key={slide.id} className="relative">
              <div
                onClick={() => setActiveSlideIndex(i)}
                className={`w-full cursor-pointer rounded-lg overflow-hidden transition-all ${
                  i === activeSlideIndex ? 'ring-2 ring-blue-500' : 'opacity-60 hover:opacity-100'
                }`}
              >
                {parsedTpl ? (
                  <div className="pointer-events-none">
                    <TemplateRenderer
                      structure={parsedTpl}
                      content={{
                        headline: slide.title,
                        subtitle: slide.subtitle ?? slide.content,
                        cta:      slide.cta,
                        imageUrl: slide.imageUrl,
                      }}
                      showImageSlotHint={false}
                    />
                  </div>
                ) : (
                  <SlidePreview slide={slide} index={i} size="sm" format={carousel.format} />
                )}
              </div>
              <div className="text-center text-xs text-gray-600 mt-1">{i + 1}</div>
            </div>
          ))}
        </div>

        {/* Main canvas */}
        <div className="flex-1 min-w-0 flex flex-col bg-[#0a0a0f]">
          {/* Toolbar */}
          <div className="flex items-center gap-3 px-6 py-3 border-b border-white/5 glass-dark">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors text-sm"
            >
              <ArrowLeft size={16} /> Dashboard
            </button>
            <div className="h-4 w-px bg-white/10" />
            <h1 className="text-sm font-semibold truncate flex-1">{carousel.title}</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTemplatePickerOpen(true)}
                className="flex items-center gap-1 glass px-3 py-2 rounded-lg text-xs hover:bg-purple-500/10 hover:border-purple-500/30 border border-transparent transition-colors text-purple-300"
                title="Trocar pelo design de outro template"
              >
                <Replace size={14} /> Trocar template
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-1 glass px-3 py-2 rounded-lg text-xs hover:bg-white/10 transition-colors"
              >
                <Download size={14} /> Exportar Slide
              </button>
              {carousel && (
                <ExportZipButton
                  carouselId={carousel.id}
                  carouselTitle={carousel.title}
                  slides={carousel.slides}
                  canExport={canExportZip}
                />
              )}
              <button
                onClick={handleSave}
                className={`flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  saved
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90'
                }`}
              >
                {saved ? <><Check size={14} /> Salvo!</> : <><Save size={14} /> Salvar</>}
              </button>
            </div>
          </div>

          {/* Slide preview area */}
          <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
            <div className="w-full max-w-md">
              {/* Navigation */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setActiveSlideIndex(Math.max(0, activeSlideIndex - 1))}
                  disabled={activeSlideIndex === 0}
                  className="glass p-2 rounded-lg disabled:opacity-30"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm text-gray-400">
                  {activeSlideIndex + 1} / {carousel.slides.length}
                </span>
                <button
                  onClick={() => setActiveSlideIndex(Math.min(carousel.slides.length - 1, activeSlideIndex + 1))}
                  disabled={activeSlideIndex === carousel.slides.length - 1}
                  className="glass p-2 rounded-lg disabled:opacity-30"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* The actual slide.
                  Phase 3.3: when the carousel carries a templateStructure,
                  render via EditableTemplateCanvas (drag + resize + select).
                  Changes mutate carousel.templateStructure in memory; the
                  user clicks "Salvar" to persist to DB.
                  Legacy carousels (no structure) use SlidePreview. */}
              <div ref={slideRef}>
                {activeSlide && (() => {
                  const tpl = parseStructure(carousel.templateStructure ?? null)
                  if (tpl) {
                    return (
                      <EditableTemplateCanvas
                        structure={tpl}
                        content={{
                          headline: activeSlide.title,
                          subtitle: activeSlide.subtitle ?? activeSlide.content,
                          cta:      activeSlide.cta,
                          imageUrl: activeSlide.imageUrl,
                        }}
                        selectedId={selectedElementId}
                        onSelectionChange={setSelectedElementId}
                        onStructureChange={(next: TemplateStructure) => {
                          setCarousel({
                            ...carousel,
                            templateStructure: serializeStructure(next),
                          })
                        }}
                      />
                    )
                  }
                  return (
                    <SlidePreview
                      slide={activeSlide}
                      index={activeSlideIndex}
                      size="lg"
                      format={carousel.format}
                      showSlideNumber={carousel.mode === 'carousel'}
                    />
                  )
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Right panel: editor */}
        <div className="w-72 shrink-0 border-l border-white/5 flex flex-col glass-dark overflow-hidden">
          {/* Element editor (when template structure exists) */}
          {carousel.templateStructure && (() => {
            const tpl = parseStructure(carousel.templateStructure)
            const selectedEl: TemplateElement | null = tpl && selectedElementId
              ? (tpl.elements.find(e => e.id === selectedElementId) ?? null)
              : null
            return (
              <div className="border-b border-white/5 p-4">
                <EditableElementSidebar
                  element={selectedEl}
                  onChange={(patch) => {
                    if (!tpl || !selectedEl) return
                    const next: TemplateStructure = {
                      ...tpl,
                      elements: tpl.elements.map(x =>
                        x.id === selectedEl.id ? ({ ...x, ...patch } as TemplateElement) : x
                      ),
                    }
                    setCarousel({
                      ...carousel,
                      templateStructure: serializeStructure(next),
                    })
                  }}
                  onDeselect={() => setSelectedElementId(null)}
                />
              </div>
            )
          })()}

          {/* Tabs */}
          <div className="flex border-b border-white/5">
            {[
              { key: 'text', icon: Type, label: 'Texto' },
              { key: 'style', icon: Palette, label: 'Estilo' },
              { key: 'image', icon: Image, label: 'Imagem' },
              { key: 'layout', icon: Layout, label: 'Layout' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
                  activeTab === tab.key
                    ? 'text-blue-400 border-b-2 border-blue-500'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeSlide && (
              <>
                {/* TEXT TAB */}
                {activeTab === 'text' && (
                  <>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block font-semibold">
                        {carousel.mode === 'creative' ? 'Headline' : 'Título'}
                      </label>
                      <textarea
                        value={activeSlide.title}
                        onChange={(e) => updateSlide({ title: e.target.value })}
                        rows={2}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-blue-500/50"
                      />
                    </div>

                    {carousel.mode === 'creative' && (
                      <>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block font-semibold">Subtítulo</label>
                          <textarea
                            value={activeSlide.subtitle || ''}
                            onChange={(e) =>
                              updateSlide({ subtitle: e.target.value, content: e.target.value })
                            }
                            rows={2}
                            placeholder="Texto complementar"
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-blue-500/50"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block font-semibold">CTA (botão)</label>
                          <input
                            value={activeSlide.cta || ''}
                            onChange={(e) => updateSlide({ cta: e.target.value })}
                            placeholder="Ex: Quero saber mais"
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500/50"
                          />
                        </div>
                      </>
                    )}

                    {carousel.mode !== 'creative' && (
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block font-semibold">Conteúdo</label>
                        <textarea
                          value={activeSlide.content}
                          onChange={(e) => updateSlide({ content: e.target.value })}
                          rows={5}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-blue-500/50"
                        />
                      </div>
                    )}

                    <div>
                      <label className="text-xs text-gray-400 mb-1 block font-semibold">Fonte</label>
                      <select
                        value={activeSlide.fontFamily}
                        onChange={(e) => updateSlide({ fontFamily: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500/50"
                      >
                        {FONTS.map((f) => (
                          <option key={f} value={f} style={{ fontFamily: f }}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* STYLE TAB */}
                {activeTab === 'style' && (
                  <>
                    <div>
                      <label className="text-xs text-gray-400 mb-2 block font-semibold">Cor de Fundo</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={activeSlide.backgroundColor}
                          onChange={(e) => updateSlide({ backgroundColor: e.target.value })}
                          className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
                        />
                        <span className="text-xs text-gray-400 font-mono">{activeSlide.backgroundColor}</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-2 block font-semibold">Cor do Texto</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={activeSlide.textColor}
                          onChange={(e) => updateSlide({ textColor: e.target.value })}
                          className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
                        />
                        <span className="text-xs text-gray-400 font-mono">{activeSlide.textColor}</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-2 block font-semibold">Cor de Destaque</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={activeSlide.accentColor}
                          onChange={(e) => updateSlide({ accentColor: e.target.value })}
                          className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
                        />
                        <span className="text-xs text-gray-400 font-mono">{activeSlide.accentColor}</span>
                      </div>
                    </div>

                    {/* Quick color presets */}
                    <div>
                      <label className="text-xs text-gray-400 mb-2 block font-semibold">Paletas Rápidas</label>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { bg: '#0f172a', text: '#ffffff', accent: '#0ea5e9' },
                          { bg: '#1a0533', text: '#ffffff', accent: '#d946ef' },
                          { bg: '#0d1f12', text: '#ffffff', accent: '#22c55e' },
                          { bg: '#1f0d0d', text: '#ffffff', accent: '#ef4444' },
                          { bg: '#f8fafc', text: '#0f172a', accent: '#0ea5e9' },
                          { bg: '#fffbeb', text: '#0f172a', accent: '#f59e0b' },
                          { bg: '#111827', text: '#f9fafb', accent: '#8b5cf6' },
                          { bg: '#0a1628', text: '#ffffff', accent: '#38bdf8' },
                        ].map((preset, i) => (
                          <button
                            key={i}
                            onClick={() =>
                              updateSlide({
                                backgroundColor: preset.bg,
                                textColor: preset.text,
                                accentColor: preset.accent,
                              })
                            }
                            className="aspect-square rounded-lg border border-white/10 hover:scale-110 transition-transform"
                            style={{ backgroundColor: preset.bg }}
                          >
                            <div className="w-full h-1 mt-auto" style={{ backgroundColor: preset.accent }} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* IMAGE TAB */}
                {activeTab === 'image' && (
                  <>
                    <div>
                      <label className="text-xs text-gray-400 mb-2 block font-semibold">Prompt da Imagem de Fundo</label>
                      <textarea
                        value={activeSlide.imagePrompt || ''}
                        onChange={(e) => updateSlide({ imagePrompt: e.target.value })}
                        rows={4}
                        placeholder="Descreva a imagem de fundo em inglês..."
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-blue-500/50 placeholder-gray-500"
                      />
                    </div>

                    <button
                      onClick={handleGenerateImage}
                      disabled={isGeneratingImage || !activeSlide.imagePrompt}
                      className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
                        isGeneratingImage || !activeSlide.imagePrompt
                          ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90'
                      }`}
                    >
                      {isGeneratingImage ? (
                        <><Loader2 size={16} className="animate-spin" /> Gerando imagem...</>
                      ) : activeSlide.imageUrl ? (
                        <><Sparkles size={16} /> Gerar nova variação</>
                      ) : (
                        <><Sparkles size={16} /> Gerar com IA</>
                      )}
                    </button>

                    {activeSlide.imageUrl && (
                      <div>
                        <label className="text-xs text-gray-400 mb-2 block font-semibold">Imagem Atual</label>
                        <div className="relative rounded-xl overflow-hidden aspect-square">
                          {/* eslint-disable-next-line @next/next/no-img-element -- imageUrl is a base64 data URI from Gemini, not a remote URL */}
                          <img
                            src={activeSlide.imageUrl}
                            alt="slide bg"
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => updateSlide({ imageUrl: undefined })}
                            className="absolute top-2 right-2 bg-red-500/80 p-1.5 rounded-lg hover:bg-red-600 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Rolling image history — recently generated alternatives
                        the user can switch between without re-spending credit */}
                    {(activeSlide.imageHistory?.length ?? 0) > 1 && (
                      <div>
                        <label className="text-xs text-gray-400 mb-2 block font-semibold">
                          Variações recentes ({activeSlide.imageHistory?.length})
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {activeSlide.imageHistory?.map((url, i) => {
                            const isActive = url === activeSlide.imageUrl
                            return (
                              <button
                                key={i}
                                onClick={() => handlePickFromHistory(url)}
                                className={`relative rounded-lg overflow-hidden aspect-square border-2 transition-all ${
                                  isActive
                                    ? 'border-blue-500 ring-2 ring-blue-500/30'
                                    : 'border-white/10 hover:border-white/40'
                                }`}
                                title={isActive ? 'Imagem ativa' : 'Trocar pra esta'}
                                type="button"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={url} alt={`opção ${i + 1}`} className="w-full h-full object-cover" />
                              </button>
                            )
                          })}
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1.5">
                          Clica em qualquer thumb pra trocar sem gastar crédito.
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="text-xs text-gray-400 mb-2 block font-semibold">URL de imagem externa</label>
                      <input
                        placeholder="https://..."
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500/50 placeholder-gray-500"
                        onBlur={(e) => e.target.value && updateSlide({ imageUrl: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {/* LAYOUT TAB */}
                {activeTab === 'layout' && (
                  <>
                    <div>
                      <label className="text-xs text-gray-400 mb-2 block font-semibold">Formato do Criativo</label>
                      <div className="grid grid-cols-3 gap-2">
                        {FORMATS.map((f) => (
                          <button
                            key={f.value}
                            onClick={() =>
                              setCarousel({ ...carousel, format: f.value })
                            }
                            className={`p-3 rounded-xl text-center transition-all ${
                              carousel.format === f.value
                                ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/40 text-white'
                                : 'glass hover:bg-white/10 text-gray-400'
                            }`}
                          >
                            <f.icon size={18} className="mx-auto mb-1" />
                            <div className="text-xs font-semibold">{f.label}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-gray-400 mb-2 block font-semibold">
                        {carousel.mode === 'creative' ? 'Estilo de Layout' : 'Posição do Texto'}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {(carousel.mode === 'creative' ? AD_LAYOUTS : CLASSIC_LAYOUTS).map(
                          (l) => (
                            <button
                              key={l.value}
                              onClick={() => updateSlide({ layout: l.value })}
                              className={`py-3 px-2 rounded-xl text-xs font-semibold transition-all ${
                                activeSlide.layout === l.value
                                  ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/40 text-white'
                                  : 'glass hover:bg-white/10 text-gray-400'
                              }`}
                            >
                              {l.label}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Export all button */}
          <div className="p-4 border-t border-white/5">
            <button
              onClick={handleSave}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90 transition-all"
            >
              <Save size={16} />
              Salvar Carrossel
            </button>
          </div>
        </div>
      </div>

      {templatePickerOpen && (
        <SwapTemplateModal
          templates={availableTemplates}
          mode={carousel.mode}
          currentTemplateId={carousel.templateId ?? null}
          onSelect={applyTemplate}
          onClose={() => setTemplatePickerOpen(false)}
        />
      )}
    </div>
  )
}

/* ─── Swap template modal ──────────────────────────────────────────── */
function SwapTemplateModal({
  templates, mode, currentTemplateId, onSelect, onClose,
}: {
  templates: any[]
  mode: string
  currentTemplateId: string | null
  onSelect: (tpl: any) => void
  onClose: () => void
}) {
  // eligible by mode
  const eligible = templates.filter(t =>
    mode === 'creative' ? (t.mode === 'creative' || t.mode === 'both')
                        : (t.mode === 'carousel' || t.mode === 'both')
  )
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="glass border border-white/10 rounded-2xl max-w-5xl w-full max-h-[85vh] overflow-y-auto p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Replace size={18} /> Trocar template
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-md">
            <X size={18} />
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          O texto e a imagem geradas serão mantidos — só o layout visual muda.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {eligible.map(t => {
            const parsed = (() => {
              try { return t.structure ? JSON.parse(t.structure) : null } catch { return null }
            })()
            const isCurrent = t.id === currentTemplateId
            return (
              <button
                key={t.id}
                onClick={() => onSelect(t)}
                className={`rounded-xl overflow-hidden border transition-all text-left ${
                  isCurrent ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-white/10 hover:border-white/30'
                }`}
                type="button"
              >
                {parsed ? (
                  <div className="pointer-events-none">
                    <TemplateRenderer
                      structure={parsed}
                      content={{ headline: 'EXEMPLO', subtitle: 'subtítulo do template', cta: 'CTA' }}
                      showImageSlotHint={false}
                    />
                  </div>
                ) : (
                  <div className="h-32 bg-gradient-to-br from-blue-500/20 to-purple-500/20" />
                )}
                <div className="p-2 bg-black/40">
                  <p className="text-xs font-bold truncate">{t.name}</p>
                  {isCurrent && <p className="text-[10px] text-blue-400">Atual</p>}
                </div>
              </button>
            )
          })}
          {eligible.length === 0 && (
            <p className="col-span-full text-center text-sm text-gray-500 py-10">
              Nenhum template publicado pra este modo. Cria um em /admin/templates.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function EditorPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-[#0a0a0f]">
        <Loader2 size={40} className="animate-spin text-blue-400" />
      </div>
    }>
      <EditorContent />
    </Suspense>
  )
}
