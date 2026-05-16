'use client'

/**
 * Phase 3.1d — Create template from reference image (Gemini Vision).
 *
 * Flow:
 * 1. Admin uploads/pastes/links an image
 * 2. Frontend POSTs to /api/admin/templates/from-image with the data URL
 * 3. API calls Gemini Vision, returns a TemplateStructure
 * 4. Admin sees a live preview via TemplateRenderer
 * 5. "Salvar" → creates the Template via the existing /api/admin/templates
 *    endpoint with the generated structure pre-filled
 * 6. "Tentar de novo" → re-runs extraction (Gemini is non-deterministic)
 * 7. "Refinar no editor" → saves and routes to the visual editor
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import TemplateRenderer from '@/components/TemplateRenderer'
import { TemplateStructure } from '@/lib/template-structure'
import {
  Sparkles, Upload, ArrowLeft, Loader2, AlertCircle, CheckCircle2,
  RefreshCw, Pencil, Save,
} from 'lucide-react'

type Phase = 'idle' | 'extracting' | 'preview' | 'saving' | 'error'

export default function CreateTemplateFromImagePage() {
  const router = useRouter()
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [imageName,    setImageName]    = useState<string>('')
  const [urlInput,     setUrlInput]     = useState('')
  const [name,         setName]         = useState('')
  const [phase,        setPhase]        = useState<Phase>('idle')
  const [structure,    setStructure]    = useState<TemplateStructure | null>(null)
  const [error,        setError]        = useState<string | null>(null)

  async function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
  }

  async function handleFile(file: File) {
    setError(null)
    if (!file.type.startsWith('image/')) { setError('Selecione uma imagem'); return }
    if (file.size > 8 * 1024 * 1024) { setError('Imagem muito grande (max 8 MB)'); return }
    const dataUrl = await fileToDataUrl(file)
    setImageDataUrl(dataUrl)
    setImageName(file.name)
    if (!name) setName(file.name.replace(/\.[^.]+$/, ''))
  }

  async function loadFromUrl() {
    if (!urlInput.trim()) return
    setError(null)
    try {
      const res = await fetch(urlInput.trim())
      if (!res.ok) throw new Error('Não consegui baixar a imagem')
      const blob = await res.blob()
      if (!blob.type.startsWith('image/')) throw new Error('URL não é uma imagem')
      const file = new File([blob], 'reference', { type: blob.type })
      await handleFile(file)
      setUrlInput('')
    } catch (e: any) {
      setError(e.message ?? 'Falha ao carregar URL (CORS?)')
    }
  }

  /** Paste handler — paste an image anywhere on this page to use it. */
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea') return
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            handleFile(file)
            e.preventDefault()
            return
          }
        }
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function extract() {
    if (!imageDataUrl) return
    setError(null)
    setPhase('extracting')
    setStructure(null)
    setSlotPreviews({})
    try {
      const res = await fetch('/api/admin/templates/from-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageDataUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Erro ${res.status}`)
      setStructure(data.structure)
      setPhase('preview')
      // Kick off preview images in parallel for every image_slot — admin
      // sees the template with real images instead of placeholder cinza.
      void generatePreviewsForSlots(data.structure)
    } catch (e: any) {
      setError(e.message ?? 'Erro ao analisar imagem')
      setPhase('error')
    }
  }

  /**
   * For each image_slot in the structure, kick off a /api/generate-image
   * call in parallel. The results populate slotPreviews as they arrive,
   * so the preview pane fills in image-by-image without blocking the
   * UI. Failures per-slot are silent (we just keep the placeholder).
   */
  const [slotPreviews, setSlotPreviews] = useState<Record<string, string>>({})
  const [generatingSlots, setGeneratingSlots] = useState(false)

  async function generatePreviewsForSlots(struct: TemplateStructure) {
    const slots = struct.elements.filter(e => e.type === 'image_slot') as any[]
    if (slots.length === 0) return
    setGeneratingSlots(true)
    await Promise.all(
      slots.map(async (slot) => {
        try {
          const res = await fetch('/api/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: slot.description || 'abstract background', mode: 'creative' }),
          })
          if (!res.ok) return
          const data = await res.json()
          if (data.imageData) {
            setSlotPreviews(prev => ({ ...prev, [slot.id]: data.imageData }))
          }
        } catch {
          // ignore per-slot failures — placeholder stays
        }
      })
    )
    setGeneratingSlots(false)
  }

  /**
   * Quick-fix: when the AI misses a photo background overlay, this lets
   * the admin inject the original reference image as a full-canvas
   * image_static with low opacity behind everything else. Useful for
   * templates like the INSS-style ads where a faint photo of a person
   * tints the gradient.
   */
  function useOriginalAsBackground() {
    if (!structure || !imageDataUrl) return
    // Check if we already added it
    const existingBg = structure.elements.find(e => e.id === 'photo_bg_overlay')
    if (existingBg) {
      setError('Imagem original já está como fundo. Use o editor pra ajustar opacidade.')
      return
    }
    const newEl: any = {
      id: 'photo_bg_overlay',
      type: 'image_static',
      x: 0, y: 0, width: 100, height: 100,
      zIndex: 1, // just above background, below everything else
      src: imageDataUrl,
      objectFit: 'cover',
      opacity: 0.35,
      alt: 'Imagem original como fundo (opacidade reduzida)',
    }
    setStructure({
      ...structure,
      elements: [...structure.elements, newEl],
    })
  }

  async function save(goToEditor: boolean) {
    if (!structure) return
    if (!name.trim()) { setError('Dê um nome ao template'); return }
    setError(null)
    setPhase('saving')
    try {
      const body = {
        name:        name.trim(),
        description: imageName ? `Gerado por IA a partir de "${imageName}"` : 'Gerado por IA',
        mode:        'creative',
        format:      canvasFormatToLegacy(structure.canvas.format),
        layout:      'headline-banner',
        palette:     JSON.stringify({
          bg: structure.canvas.backgroundColor,
          accent: '#0ea5e9',
          text: '#ffffff',
        }),
        active:      true,
        published:   true,  // auto-publish — admin can unpublish from the list if needed
        structure:   JSON.stringify(structure),
      }
      const res = await fetch('/api/admin/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Erro ${res.status}`)
      if (goToEditor) {
        router.push(`/admin/templates/${data.id}/edit`)
      } else {
        router.push('/admin/templates')
      }
    } catch (e: any) {
      setError(e.message ?? 'Erro ao salvar')
      setPhase('preview')
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.push('/admin/templates')}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          type="button"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Sparkles size={22} className="text-purple-400" />
            Criar template com IA
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Envie um print de um criativo viral e a IA reconstrói como template editável.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-red-400 text-sm glass border border-red-500/30 rounded-xl p-3 mb-4">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: image input + name */}
        <div className="space-y-4">
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-semibold mb-3">1. Imagem de referência</h3>

            {imageDataUrl ? (
              <div className="space-y-3">
                <div className="rounded-xl overflow-hidden border border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageDataUrl} alt="referência" className="w-full max-h-80 object-contain bg-black/30" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 truncate">{imageName || 'imagem'}</span>
                  <button
                    onClick={() => { setImageDataUrl(null); setImageName(''); setStructure(null); setPhase('idle') }}
                    className="text-[11px] text-red-400 hover:text-red-300"
                    type="button"
                  >
                    Trocar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <label className="flex flex-col items-center gap-2 px-4 py-8 rounded-xl border-2 border-dashed border-white/15 hover:border-purple-500/40 hover:bg-white/5 cursor-pointer transition-all text-center">
                  <Upload size={22} className="text-gray-400" />
                  <span className="text-sm font-semibold">Enviar imagem</span>
                  <span className="text-[11px] text-gray-500">
                    PNG, JPG, WEBP até 8 MB
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (f) handleFile(f)
                    }}
                  />
                </label>

                <div className="flex items-center gap-2 mt-3">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-[10px] text-gray-500">OU</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                <div className="flex gap-1.5 mt-3">
                  <input
                    type="text"
                    placeholder="Cole URL https://..."
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') loadFromUrl() }}
                    className="flex-1 bg-white/5 border border-white/10 rounded-md px-3 py-2 text-xs focus:outline-none focus:border-blue-500/50"
                  />
                  <button
                    onClick={loadFromUrl}
                    disabled={!urlInput.trim()}
                    className="px-3 py-2 rounded-md glass hover:bg-white/10 text-xs disabled:opacity-40"
                    type="button"
                  >
                    Carregar
                  </button>
                </div>

                <p className="text-[10px] text-gray-500 mt-3 text-center">
                  Dica: copie qualquer imagem e cole com <kbd className="px-1 bg-white/10 rounded">Cmd+V</kbd> aqui.
                </p>
              </>
            )}
          </div>

          {imageDataUrl && (
            <div className="glass rounded-2xl p-5">
              <h3 className="text-sm font-semibold mb-3">2. Nome do template</h3>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Editorial Light, Dark Yellow Accent..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500/50"
              />
            </div>
          )}

          {imageDataUrl && (
            <div className="glass rounded-2xl p-5">
              <h3 className="text-sm font-semibold mb-3">3. Analisar</h3>
              <button
                onClick={extract}
                disabled={phase === 'extracting' || phase === 'saving'}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-purple-500 to-pink-600 hover:opacity-90 transition-all disabled:opacity-60"
                type="button"
              >
                {phase === 'extracting' ? (
                  <><Loader2 size={16} className="animate-spin" /> Analisando imagem...</>
                ) : structure ? (
                  <><RefreshCw size={16} /> Analisar de novo</>
                ) : (
                  <><Sparkles size={16} /> Analisar com IA</>
                )}
              </button>
              <p className="text-[10px] text-gray-500 mt-2 text-center">
                A IA é não-determinística — analise de novo se o resultado não estiver bom.
              </p>
            </div>
          )}
        </div>

        {/* Right: preview + actions */}
        <div className="space-y-4">
          <div className="glass rounded-2xl p-5 sticky top-6">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span>4. Preview</span>
              {structure && <CheckCircle2 size={14} className="text-green-400" />}
            </h3>

            {structure ? (
              <>
                <div className="max-w-sm mx-auto">
                  <TemplateRenderer
                    structure={structure}
                    showImageSlotHint
                    previewImages={slotPreviews}
                  />
                </div>
                {generatingSlots && (
                  <p className="text-[10px] text-purple-300 mt-2 text-center flex items-center justify-center gap-1.5">
                    <Loader2 size={11} className="animate-spin" />
                    Gerando imagens com IA pros image_slots...
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2 text-[10px]">
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/20">
                    {structure.canvas.format}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/20">
                    {structure.elements.length} elemento{structure.elements.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="mt-4 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <p className="text-[10px] text-amber-300/90 mb-2 leading-relaxed">
                    💡 Se a IA perdeu uma foto de fundo ou textura, use a imagem original como camada de fundo (35% opacidade):
                  </p>
                  <button
                    onClick={useOriginalAsBackground}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] glass hover:bg-white/10 text-amber-200 border border-amber-500/30"
                    type="button"
                  >
                    🖼️ Usar imagem original como fundo
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => save(true)}
                    disabled={phase === 'saving' || !name.trim()}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90 disabled:opacity-60"
                    type="button"
                  >
                    {phase === 'saving' ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />}
                    Salvar e refinar
                  </button>
                  <button
                    onClick={() => save(false)}
                    disabled={phase === 'saving' || !name.trim()}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs glass hover:bg-white/10 disabled:opacity-60"
                    type="button"
                  >
                    {phase === 'saving' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Só salvar
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 mt-2 text-center">
                  "Salvar e refinar" abre o editor visual pra você ajustar antes de publicar.
                </p>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500 text-sm gap-3">
                <Sparkles size={28} className="opacity-30" />
                <span className="text-center max-w-xs">
                  Envie uma imagem ao lado e clique em <strong>Analisar com IA</strong>. O preview do template aparece aqui.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 text-center text-xs text-gray-500">
        <Link href="/admin/templates" className="hover:text-gray-300 underline">
          ← Voltar para a lista de templates
        </Link>
      </div>
    </div>
  )
}

function canvasFormatToLegacy(f: string): string {
  if (f === '4:5') return 'feed-vertical'
  if (f === '9:16') return 'story'
  return 'square'
}
