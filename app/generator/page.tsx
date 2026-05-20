'use client'

/**
 * Phase 3.2 — Chat-style generator.
 *
 * New UX: user talks to an AI to describe what they want, AI asks
 * follow-ups, then transitions to cosmic-style animated generation.
 *
 * State machine:
 *   mode-select → chat → generating → done (redirect to editor)
 *
 * The classic form-based generator is still available at /generator/classic
 * as a fallback.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import AppLayout from '@/components/AppLayout'
import TemplateRenderer from '@/components/TemplateRenderer'
import {
  useAppStore,
  createNewCarousel,
  createSlide,
  CarouselMode,
} from '@/lib/store'
import { contentToSlides as buildSlides } from '@/lib/gemini'
import { parseStructure } from '@/lib/template-structure'
import {
  Sparkles, Megaphone, LayoutGrid, Send, Loader2, ArrowLeft,
  Shuffle, Image as ImageIcon, X, Wand2, Mic, MicOff,
} from 'lucide-react'

type Phase = 'mode-select' | 'chat' | 'generating' | 'done'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface Intent {
  tema: string
  audience: string
  tone: string
  slideCount: number
  extraContext: string | null
}

interface PublishedTemplate {
  id: string
  name: string
  description: string | null
  mode: string
  format: string
  layout: string
  style: string | null
  palette: string | null
  structure?: string | null
}

interface GenerationStep {
  id: string
  label: string
  status: 'pending' | 'running' | 'done' | 'error'
}

export default function ChatGeneratorPage() {
  const router = useRouter()
  const { addCarousel, setCurrentCarousel, setIsGenerating } = useAppStore()

  const [phase, setPhase] = useState<Phase>('mode-select')
  const [mode,  setMode]  = useState<CarouselMode>('creative')

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const chatScrollRef = useRef<HTMLDivElement>(null)

  // Template choice
  const [templateMode, setTemplateMode] = useState<'auto' | 'random' | 'manual'>('auto')
  const [selectedTemplate, setSelectedTemplate] = useState<PublishedTemplate | null>(null)
  const [templates, setTemplates] = useState<PublishedTemplate[]>([])
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)

  // Generation state
  const [steps, setSteps] = useState<GenerationStep[]>([])
  const [intent, setIntent] = useState<Intent | null>(null)
  const [genError, setGenError] = useState<string | null>(null)

  // Load templates on mount
  useEffect(() => {
    fetch('/api/templates').then(r => r.ok ? r.json() : []).then(d => {
      if (Array.isArray(d)) setTemplates(d)
    }).catch(() => {})
  }, [])

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [messages])

  function startMode(m: CarouselMode) {
    setMode(m)
    const greeting = m === 'carousel'
      ? 'Beleza! Vamos criar um carrossel viral. O que você quer postar?'
      : 'Beleza! Vamos criar um criativo de anúncio. O que você quer divulgar?'
    setMessages([{ role: 'assistant', content: greeting }])
    setPhase('chat')
  }

  async function sendMessage() {
    if (!input.trim() || sending) return
    const userMsg: ChatMessage = { role: 'user', content: input.trim() }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')
    setSending(true)

    try {
      const res = await fetch('/api/chat/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, messages: nextMessages }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Erro ${res.status}`)

      if (data.type === 'question') {
        setMessages([...nextMessages, { role: 'assistant', content: data.message }])
      } else if (data.type === 'intent') {
        // Add a confirmation message then transition to generating
        setMessages([...nextMessages, {
          role: 'assistant',
          content: `Entendi. Vou criar agora: ${data.intent.tema} pra ${data.intent.audience}. ✨`,
        }])
        setIntent(data.intent)
        setTimeout(() => runGeneration(data.intent), 700)
      }
    } catch (e: any) {
      setMessages([...nextMessages, {
        role: 'assistant',
        content: `Erro: ${e.message}. Tenta de novo.`,
      }])
    } finally {
      setSending(false)
    }
  }

  function templatePool(): PublishedTemplate[] {
    if (templates.length === 0) return []
    const withStructure = templates.filter(t => !!t.structure)
    return withStructure.length > 0 ? withStructure : templates
  }

  function pickTemplate(): PublishedTemplate | null {
    if (templateMode === 'manual') return selectedTemplate
    const pool = templatePool()
    if (pool.length === 0) return null
    return pool[Math.floor(Math.random() * pool.length)]
  }

  /**
   * Picks N distinct (when possible) templates — one per slide in
   * "Criativos em Massa". Each creative ends up with its own visual
   * design, matching the user's expectation of variety in mass drop.
   * Manual mode returns N copies of the chosen template (user explicitly
   * picked it).
   */
  function pickTemplatesForBatch(n: number): (PublishedTemplate | null)[] {
    if (templateMode === 'manual') {
      return Array.from({ length: n }, () => selectedTemplate)
    }
    const pool = templatePool()
    if (pool.length === 0) return Array.from({ length: n }, () => null)
    // Shuffle a copy of the pool, take N. If N > pool size, cycle.
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    const out: PublishedTemplate[] = []
    for (let i = 0; i < n; i++) out.push(shuffled[i % shuffled.length])
    return out
  }

  const updateStep = useCallback((id: string, status: GenerationStep['status'], newLabel?: string) => {
    setSteps(prev => prev.map(s =>
      s.id === id ? { ...s, status, label: newLabel ?? s.label } : s
    ))
  }, [])

  async function runGeneration(it: Intent) {
    setIntent(it)
    setIsGenerating(true)
    setGenError(null)
    setPhase('generating')

    const template = pickTemplate()

    // Build initial steps list
    const baseSteps: GenerationStep[] = [
      { id: 'understand', label: 'Entendendo seu tema...',         status: 'running' },
      { id: 'template',   label: 'Escolhendo template visual...',  status: 'pending' },
      { id: 'copy',       label: 'Escrevendo headlines virais...', status: 'pending' },
    ]
    if (mode === 'carousel') {
      for (let i = 1; i <= it.slideCount; i++) {
        baseSteps.push({ id: `img-${i}`, label: `Gerando imagem do slide ${i}/${it.slideCount}...`, status: 'pending' })
      }
    } else {
      baseSteps.push({ id: 'img-1', label: 'Gerando imagem do anúncio...', status: 'pending' })
    }
    baseSteps.push({ id: 'final', label: 'Montando criativo final...', status: 'pending' })
    setSteps(baseSteps)

    try {
      // Step 1: understand (a small artificial delay so user sees the animation)
      await new Promise(r => setTimeout(r, 600))
      updateStep('understand', 'done')

      // Step 2: template
      updateStep('template', 'running', template ? `Usando template "${template.name}"...` : 'Sem template, gerando do zero...')
      await new Promise(r => setTimeout(r, 400))
      updateStep('template', 'done')

      // Style from template or fallback
      let style: any
      if (template) {
        try {
          const palette = template.palette ? JSON.parse(template.palette) : null
          style = {
            primaryColor:    palette?.accent ?? '#0ea5e9',
            secondaryColor:  '#d946ef',
            backgroundColor: palette?.bg ?? '#0f172a',
            textColor:       palette?.bg === '#f8fafc' ? '#0f172a' : '#ffffff',
            fontFamily:      'Inter',
            theme:           palette?.theme ?? 'dark',
          }
        } catch { /* fallback below */ }
      }
      if (!style) {
        style = {
          primaryColor:    '#0ea5e9',
          secondaryColor:  '#d946ef',
          backgroundColor: '#0f172a',
          textColor:       '#ffffff',
          fontFamily:      'Inter',
          theme:           'dark',
        }
      }
      const format = template?.format ?? 'square'

      // Step 3: copy
      updateStep('copy', 'running')
      const copyRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          topic: it.tema,
          slideCount: it.slideCount,
          style,
          tone: it.tone,
          targetAudience: it.audience,
        }),
      })
      if (!copyRes.ok) {
        const err = await copyRes.json()
        throw new Error(err.error || 'Erro ao gerar copy')
      }
      const copyData = await copyRes.json()
      updateStep('copy', 'done')

      // Build carousel object
      const carousel = createNewCarousel(it.tema, { style, format: format as any, mode })
      carousel.style = style
      if (template?.structure) {
        carousel.templateStructure = template.structure
        carousel.templateId = template.id
      } else {
        carousel.templateStructure = null
        carousel.templateId = template?.id ?? null
      }

      if (copyData.mode === 'creative' && copyData.creative) {
        carousel.title = copyData.creative.headline
        carousel.slides = [createSlide({
          title:    copyData.creative.headline,
          subtitle: copyData.creative.subtitle,
          content:  copyData.creative.subtitle,
          cta:      copyData.creative.cta,
          imagePrompt: copyData.creative.imagePrompt,
          backgroundColor: style.backgroundColor,
          textColor:       style.textColor,
          accentColor:     style.primaryColor,
          fontFamily:      style.fontFamily,
          layout: 'headline-banner',
        })]
      } else {
        carousel.title = copyData.title || it.tema
        carousel.slides = buildSlides(copyData.slides, style)

        // Criativos em Massa: cada slide ganha um template diferente
        // do pool, pra dar variedade visual de fato. O carousel-level
        // template fica como fallback (será sobrescrito por cada
        // slide.templateStructure).
        const perSlideTemplates = pickTemplatesForBatch(carousel.slides.length)
        carousel.slides = carousel.slides.map((s, i) => {
          const tpl = perSlideTemplates[i]
          return {
            ...s,
            templateStructure: tpl?.structure ?? null,
          }
        })
      }

      // Step 4+: generate images for ALL slides IN PARALLEL.
      // Antes era sequencial — N=7 slides = ~35s na pior das hipóteses,
      // o que estourava timeouts e fazia user retry manual. Em paralelo
      // resolve em ~5-8s. Promise.allSettled garante que uma falha não
      // mata o lote.
      carousel.slides.forEach((_, i) => updateStep(`img-${i + 1}`, 'running'))

      const imageResults = await Promise.allSettled(
        carousel.slides.map(async (slide, i) => {
          if (!slide.imagePrompt) return { i, imageData: null as string | null }
          const imgRes = await fetch('/api/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: slide.imagePrompt, mode }),
          })
          if (!imgRes.ok) {
            const err = await imgRes.json().catch(() => ({}))
            throw new Error(err.error || `HTTP ${imgRes.status}`)
          }
          const { imageData } = await imgRes.json()
          return { i, imageData: imageData as string | null }
        })
      )

      imageResults.forEach((r, i) => {
        if (r.status === 'fulfilled' && r.value.imageData) {
          carousel.slides[i] = {
            ...carousel.slides[i],
            imageUrl:     r.value.imageData,
            imageHistory: [r.value.imageData],
          }
        } else if (r.status === 'rejected') {
          console.warn(`[generator] image ${i + 1} failed:`, r.reason?.message ?? r.reason)
        }
        updateStep(`img-${i + 1}`, 'done')
      })

      // Final
      updateStep('final', 'running')
      carousel.status = 'ready'
      addCarousel(carousel)
      setCurrentCarousel(carousel)

      // Persist to DB (fire-and-forget). Strip base64 images from the
      // payload — N × 1-2MB blows past Vercel's 4.5MB body limit
      // (HTTP 413, daí o GET 404 depois). Imagens ficam só na sessão
      // atual até existir storage externa.
      const slidesForPost = carousel.slides.map(s => ({
        ...s,
        imageUrl:     undefined,
        imageHistory: undefined,
      }))
      fetch('/api/carousels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id:                carousel.id,
          title:             carousel.title,
          topic:             carousel.topic,
          mode:              carousel.mode,
          format:            carousel.format,
          style:             JSON.stringify(carousel.style),
          status:            carousel.status,
          slides:            slidesForPost,
          templateId:        carousel.templateId        ?? null,
          templateStructure: carousel.templateStructure ?? null,
        }),
      }).catch(() => {})

      updateStep('final', 'done')
      setPhase('done')

      // Brief celebration before redirecting
      setTimeout(() => {
        setIsGenerating(false)
        router.push(`/editor?id=${carousel.id}`)
      }, 1200)
    } catch (e: any) {
      setGenError(e.message ?? 'Erro inesperado')
      setIsGenerating(false)
    }
  }

  return (
    <AppLayout>
      <div className="min-h-screen relative overflow-hidden">
        {/* Cosmic background — particles + gradient */}
        <CosmicBackground active={phase === 'generating' || phase === 'done'} />

        <AnimatePresence mode="wait">
          {phase === 'mode-select' && (
            <ModeSelectView key="mode" onSelect={startMode} />
          )}
          {phase === 'chat' && (
            <ChatView
              key="chat"
              mode={mode}
              messages={messages}
              input={input}
              setInput={setInput}
              onSend={sendMessage}
              sending={sending}
              chatScrollRef={chatScrollRef}
              templateMode={templateMode}
              setTemplateMode={setTemplateMode}
              selectedTemplate={selectedTemplate}
              onOpenTemplatePicker={() => setTemplatePickerOpen(true)}
              onBack={() => { setPhase('mode-select'); setMessages([]); setInput('') }}
            />
          )}
          {(phase === 'generating' || phase === 'done') && (
            <GeneratingView
              key="gen"
              steps={steps}
              error={genError}
              done={phase === 'done'}
              intent={intent}
            />
          )}
        </AnimatePresence>

        {templatePickerOpen && (
          <TemplatePickerModal
            templates={templates}
            mode={mode}
            selectedId={selectedTemplate?.id ?? null}
            onSelect={(t) => {
              setSelectedTemplate(t)
              setTemplateMode('manual')
              setTemplatePickerOpen(false)
            }}
            onClose={() => setTemplatePickerOpen(false)}
          />
        )}
      </div>
    </AppLayout>
  )
}

/* ─── Sub-components ────────────────────────────────────────────────── */

function CosmicBackground({ active }: { active: boolean }) {
  return (
    <div
      className="fixed inset-0 pointer-events-none transition-opacity duration-1000"
      style={{ opacity: active ? 1 : 0.3, zIndex: 0 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/10 to-pink-900/20" />
      {Array.from({ length: 30 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white/30"
          style={{
            width: Math.random() * 4 + 1 + 'px',
            height: Math.random() * 4 + 1 + 'px',
            left: Math.random() * 100 + '%',
            top: Math.random() * 100 + '%',
          }}
          animate={{
            opacity: [0.2, 1, 0.2],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: Math.random() * 3 + 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}
    </div>
  )
}

function ModeSelectView({ onSelect }: { onSelect: (m: CarouselMode) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="relative z-10 min-h-[80vh] flex flex-col items-center justify-center p-8"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-center mb-12"
      >
        <Sparkles size={48} className="text-purple-400 mx-auto mb-4 animate-pulse" />
        <h1 className="text-4xl md:text-5xl font-black mb-3 gradient-text">
          Olá, o que vamos criar hoje?
        </h1>
        <p className="text-gray-400 text-lg">
          A IA cria por você. Você só descreve o que quer.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        {[
          { mode: 'creative' as const, icon: Megaphone,  label: 'Criativo Único',      desc: 'Um post impactante de uma vez só' },
          { mode: 'carousel' as const, icon: LayoutGrid, label: 'Criativos em Massa', desc: 'Vários criativos gerados de uma vez (até 10)' },
        ].map((opt, i) => (
          <motion.button
            key={opt.mode}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.1 }}
            whileHover={{ scale: 1.03, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(opt.mode)}
            className="glass border border-white/10 rounded-3xl p-8 text-left transition-all hover:border-purple-500/40 hover:bg-purple-500/5"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4">
              <opt.icon size={28} className="text-white" />
            </div>
            <h3 className="text-xl font-bold mb-1">{opt.label}</h3>
            <p className="text-sm text-gray-400">{opt.desc}</p>
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}

function ChatView({
  mode, messages, input, setInput, onSend, sending, chatScrollRef,
  templateMode, setTemplateMode, selectedTemplate, onOpenTemplatePicker, onBack,
}: {
  mode: CarouselMode
  messages: ChatMessage[]
  input: string
  setInput: (s: string) => void
  onSend: () => void
  sending: boolean
  chatScrollRef: React.RefObject<HTMLDivElement>
  templateMode: 'auto' | 'random' | 'manual'
  setTemplateMode: (m: 'auto' | 'random' | 'manual') => void
  selectedTemplate: PublishedTemplate | null
  onOpenTemplatePicker: () => void
  onBack: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="relative z-10 min-h-[90vh] flex flex-col max-w-3xl mx-auto p-4 md:p-8"
    >
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-white/10"
          type="button"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          {mode === 'carousel' ? <LayoutGrid size={14} /> : <Megaphone size={14} />}
          <span>{mode === 'carousel' ? 'Criativos em Massa' : 'Criativo Único'}</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={chatScrollRef} className="flex-1 overflow-y-auto space-y-3 mb-4">
        <AnimatePresence>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                    : 'glass border border-white/10 text-gray-100'
                }`}
              >
                {m.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {sending && (
          <div className="flex justify-start">
            <div className="glass border border-white/10 rounded-2xl px-4 py-3 text-sm flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-purple-400" />
              <span className="text-gray-400">Pensando...</span>
            </div>
          </div>
        )}
      </div>

      {/* Template options */}
      <div className="glass rounded-2xl p-3 mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-gray-400 mr-1">Template:</span>
        <button
          onClick={() => setTemplateMode('auto')}
          className={`px-3 py-1.5 rounded-lg transition-all ${
            templateMode === 'auto' ? 'bg-purple-500/30 border border-purple-500/50 text-purple-200' : 'hover:bg-white/5 text-gray-400'
          }`}
          type="button"
        >
          🤖 IA escolhe
        </button>
        <button
          onClick={() => setTemplateMode('random')}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
            templateMode === 'random' ? 'bg-pink-500/30 border border-pink-500/50 text-pink-200' : 'hover:bg-white/5 text-gray-400'
          }`}
          type="button"
        >
          <Shuffle size={11} /> Aleatório
        </button>
        <button
          onClick={onOpenTemplatePicker}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
            templateMode === 'manual' ? 'bg-blue-500/30 border border-blue-500/50 text-blue-200' : 'hover:bg-white/5 text-gray-400'
          }`}
          type="button"
        >
          <ImageIcon size={11} />
          {selectedTemplate ? selectedTemplate.name.slice(0, 20) : 'Escolher manual'}
        </button>
      </div>

      {/* Input */}
      <ChatInput
        input={input}
        setInput={setInput}
        onSend={onSend}
        sending={sending}
      />
    </motion.div>
  )
}

/**
 * Chat input with text + voice mode (Web Speech API).
 * Recognition is browser-side (free, no API call). Falls back gracefully
 * if the browser doesn't support SpeechRecognition (Firefox).
 */
function ChatInput({
  input, setInput, onSend, sending,
}: {
  input: string
  setInput: (s: string) => void
  onSend: () => void
  sending: boolean
}) {
  const [recording, setRecording] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(true)
  const recognitionRef = useRef<any>(null)

  // Initialize SpeechRecognition once
  useEffect(() => {
    const SR = (typeof window !== 'undefined') && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    if (!SR) {
      setVoiceSupported(false)
      return
    }
    const rec = new SR()
    rec.lang = 'pt-BR'
    // Continuous = true mantém a gravação rodando mesmo com pausas
    // longas. Sem isso, o navegador encerra rápido após qualquer silêncio.
    // A pessoa para manualmente clicando no mic novamente.
    rec.continuous = true
    rec.interimResults = true
    rec.maxAlternatives = 1
    recognitionRef.current = rec
  }, [])

  function toggleRecording() {
    const rec = recognitionRef.current
    if (!rec) return

    if (recording) {
      try { rec.stop() } catch {}
      setRecording(false)
      return
    }

    // Reset handlers fresh each session
    let finalTranscript = ''
    rec.onresult = (event: any) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i]
        if (result.isFinal) finalTranscript += result[0].transcript
        else interim += result[0].transcript
      }
      // Show interim + final in the input as we go
      setInput((finalTranscript + interim).trim())
    }
    rec.onerror = (e: any) => {
      console.warn('SpeechRecognition error:', e?.error)
      setRecording(false)
    }
    rec.onend = () => {
      setRecording(false)
    }

    try {
      rec.start()
      setRecording(true)
    } catch (e) {
      console.warn('Failed to start recognition:', e)
      setRecording(false)
    }
  }

  return (
    <div className="glass border border-white/10 rounded-2xl p-2 flex items-end gap-2">
      <textarea
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            onSend()
          }
        }}
        rows={2}
        placeholder={recording ? '🎤 Ouvindo...' : 'Conta o que você quer criar... (ou aperte o mic)'}
        className="flex-1 bg-transparent px-3 py-2 text-sm resize-none focus:outline-none placeholder-gray-500"
      />

      {/* Voice button — only show if browser supports it */}
      {voiceSupported && (
        <button
          onClick={toggleRecording}
          disabled={sending}
          className={`p-3 rounded-xl transition-all relative ${
            recording
              ? 'bg-red-500/30 border border-red-500/50 text-red-200'
              : 'glass hover:bg-white/10 text-gray-300'
          } disabled:opacity-40`}
          type="button"
          title={recording ? 'Parar gravação' : 'Falar (Web Speech API, PT-BR)'}
        >
          {recording ? <MicOff size={16} /> : <Mic size={16} />}
          {recording && (
            <motion.span
              className="absolute inset-0 rounded-xl border-2 border-red-400"
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
          )}
        </button>
      )}

      <button
        onClick={onSend}
        disabled={!input.trim() || sending || recording}
        className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90 disabled:opacity-40 transition-all"
        type="button"
      >
        {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
      </button>
    </div>
  )
}

function GeneratingView({
  steps, error, done, intent,
}: {
  steps: GenerationStep[]
  error: string | null
  done: boolean
  intent: Intent | null
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="relative z-10 min-h-[90vh] flex flex-col items-center justify-center p-8"
    >
      <motion.div
        animate={done
          ? { scale: [1, 1.3, 1], rotate: [0, 360] }
          : { rotate: 360 }
        }
        transition={done
          ? { duration: 0.8, ease: 'easeOut' }
          : { repeat: Infinity, duration: 8, ease: 'linear' }
        }
        className="relative mb-8"
      >
        <Wand2 size={64} className="text-purple-400" />
        {/* Glowing aura */}
        <motion.div
          className="absolute inset-0 rounded-full bg-purple-500/30 blur-2xl"
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.div>

      <h2 className="text-2xl md:text-3xl font-black mb-2 gradient-text text-center">
        {done ? '✨ Pronto!' : 'Criando sua arte...'}
      </h2>
      {intent && (
        <p className="text-sm text-gray-400 mb-8 text-center max-w-xl">
          &ldquo;{intent.tema}&rdquo; para {intent.audience}
        </p>
      )}

      <div className="w-full max-w-md space-y-2">
        <AnimatePresence>
          {steps.map((step) => (
            <motion.div
              key={step.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`glass border rounded-xl px-4 py-3 flex items-center gap-3 text-sm transition-all ${
                step.status === 'done' ? 'border-green-500/30 bg-green-500/5' :
                step.status === 'running' ? 'border-purple-500/40 bg-purple-500/10' :
                step.status === 'error' ? 'border-red-500/30 bg-red-500/5' :
                'border-white/5 opacity-50'
              }`}
            >
              <div className="w-5 h-5 flex-shrink-0">
                {step.status === 'done' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-green-400"
                  >✓</motion.div>
                )}
                {step.status === 'running' && <Loader2 size={16} className="animate-spin text-purple-400" />}
                {step.status === 'pending' && <span className="w-2 h-2 rounded-full bg-gray-600 inline-block mt-1.5" />}
                {step.status === 'error' && <span className="text-red-400">✕</span>}
              </div>
              <span className={step.status === 'done' ? 'text-gray-400' : ''}>
                {step.label}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {error && (
        <div className="mt-6 glass border border-red-500/30 rounded-xl p-3 text-red-400 text-sm max-w-md">
          {error}
        </div>
      )}
    </motion.div>
  )
}

function TemplatePickerModal({
  templates, mode, selectedId, onSelect, onClose,
}: {
  templates: PublishedTemplate[]
  mode: CarouselMode
  selectedId: string | null
  onSelect: (t: PublishedTemplate) => void
  onClose: () => void
}) {
  // Same pool for both modes (creative + "criativos em massa")
  const eligible = templates
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass border border-white/10 rounded-2xl max-w-5xl w-full max-h-[85vh] overflow-y-auto p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold">Escolher template</h2>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-md" type="button">
            <X size={18} />
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {eligible.map(t => {
            const parsed = parseStructure(t.structure ?? null)
            const isSel = t.id === selectedId
            return (
              <button
                key={t.id}
                onClick={() => onSelect(t)}
                className={`rounded-xl overflow-hidden border transition-all text-left ${
                  isSel ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-white/10 hover:border-white/30'
                }`}
                type="button"
              >
                {parsed ? (
                  <div className="pointer-events-none">
                    <TemplateRenderer
                      structure={parsed}
                      content={{ headline: 'EXEMPLO', subtitle: 'subtítulo', cta: 'CTA' }}
                      showImageSlotHint={false}
                    />
                  </div>
                ) : (
                  <div className="h-32 bg-gradient-to-br from-blue-500/20 to-purple-500/20" />
                )}
                <div className="p-2 bg-black/40">
                  <p className="text-xs font-bold truncate">{t.name}</p>
                </div>
              </button>
            )
          })}
          {eligible.length === 0 && (
            <p className="col-span-full text-center text-sm text-gray-500 py-10">
              Nenhum template disponível pra este modo.
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
