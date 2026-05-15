'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import SlidePreview from '@/components/SlidePreview'
import TemplateRenderer from '@/components/TemplateRenderer'
import ExportZipButton from '@/components/ExportZipButton'
import { useAppStore, Slide, SlideLayout, CreativeFormat } from '@/lib/store'
import { parseStructure } from '@/lib/template-structure'
import {
  Save, Download, ChevronLeft, ChevronRight,
  Type, Palette, Image, Layout, Loader2,
  Sparkles, Trash2, Check, ArrowLeft,
  Square, RectangleVertical, Smartphone,
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
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [canExportZip, setCanExportZip] = useState(false)
  const slideRef = useRef<HTMLDivElement>(null)

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
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <Loader2 size={40} className="animate-spin text-blue-400 mx-auto mb-4" />
            <p className="text-gray-400">Carregando carrossel...</p>
          </div>
        </div>
      </AppLayout>
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
      slides: carousel.slides,
      format: carousel.format,
      status: 'ready',
    })
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
        body: JSON.stringify({ prompt: activeSlide.imagePrompt }),
      })
      if (res.ok) {
        const { imageData } = await res.json()
        updateSlide({ imageUrl: imageData })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsGeneratingImage(false)
    }
  }

  const handleExport = async () => {
    if (!slideRef.current) return
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(slideRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
      })
      const link = document.createElement('a')
      link.download = `slide-${activeSlideIndex + 1}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (e) {
      console.error('Export error:', e)
    }
  }

  return (
    <AppLayout>
      <div className="flex h-screen overflow-hidden">
        {/* Slide strip (left) */}
        <div className="w-28 border-r border-white/5 flex flex-col overflow-y-auto py-4 px-2 gap-2 bg-black/20">
          {carousel.slides.map((slide, i) => (
            <div key={slide.id} className="relative">
              <div
                onClick={() => setActiveSlideIndex(i)}
                className={`w-full cursor-pointer rounded-lg overflow-hidden transition-all ${
                  i === activeSlideIndex ? 'ring-2 ring-blue-500' : 'opacity-60 hover:opacity-100'
                }`}
              >
                <SlidePreview slide={slide} index={i} size="sm" format={carousel.format} />
              </div>
              <div className="text-center text-xs text-gray-600 mt-1">{i + 1}</div>
            </div>
          ))}
        </div>

        {/* Main canvas */}
        <div className="flex-1 flex flex-col bg-[#0a0a0f]">
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
                  Phase 3: when the carousel carries a templateStructure
                  from the generator, render via TemplateRenderer using
                  the slide's title/subtitle/cta/imageUrl as content.
                  Legacy carousels (no structure) use SlidePreview. */}
              <div ref={slideRef}>
                {activeSlide && (() => {
                  const tpl = parseStructure(carousel.templateStructure ?? null)
                  if (tpl) {
                    return (
                      <TemplateRenderer
                        structure={tpl}
                        content={{
                          headline: activeSlide.title,
                          subtitle: activeSlide.subtitle ?? activeSlide.content,
                          cta:      activeSlide.cta,
                          imageUrl: activeSlide.imageUrl,
                        }}
                        showImageSlotHint={false}
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
        <div className="w-80 border-l border-white/5 flex flex-col glass-dark overflow-hidden">
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
    </AppLayout>
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
