'use client'

/**
 * Client-side ZIP export.
 *
 * Renders EACH slide offscreen via TemplateRenderer, captures it with
 * html-to-image, packs into ZIP via JSZip. Earlier version looked for
 * [data-slide-id] in the DOM, but only the active slide is mounted by
 * the editor — so the ZIP came out empty for every other slide. This
 * version mounts them all in a fixed offscreen container during export.
 *
 * Pro / Business feature — shows upgrade prompt otherwise.
 */

import { useState } from 'react'
import { Download, Loader2, Lock, AlertCircle } from 'lucide-react'
import { ensureFontsLoaded } from '@/lib/ensure-fonts'
import { parseStructure, type TemplateStructure } from '@/lib/template-structure'
import TemplateRenderer from './TemplateRenderer'

interface ExportSlide {
  id:          string
  title?:      string
  subtitle?:   string
  content?:    string
  cta?:        string
  imageUrl?:   string
  /** Per-slide template override (when the user picked "only this slide"). */
  templateStructure?: string | null
}

interface Props {
  carouselId:        string
  carouselTitle:     string
  slides:            ExportSlide[]
  /** Carousel-level template — applies to slides without an override. */
  templateStructure: string | null
  canExport:         boolean
}

export default function ExportZipButton({
  carouselId, carouselTitle, slides, templateStructure, canExport,
}: Props) {
  const [loading,  setLoading]  = useState(false)
  const [progress, setProgress] = useState(0)
  const [error,    setError]    = useState<string | null>(null)

  if (!canExport) {
    return (
      <a
        href="/pricing"
        className="flex items-center gap-2 px-4 py-2 rounded-xl glass border border-yellow-500/20 text-yellow-400 hover:border-yellow-500/40 text-sm font-semibold transition-all"
        title="Exportar ZIP — Plano Pro ou Business"
      >
        <Lock size={14} />
        Exportar ZIP
        <span className="text-[10px] bg-yellow-500/20 px-1.5 py-0.5 rounded-full">PRO</span>
      </a>
    )
  }

  async function handleExport() {
    setLoading(true)
    setError(null)
    setProgress(0)

    let cleanup: (() => void) | null = null

    try {
      const [JSZip, htmlToImage, ReactDOM] = await Promise.all([
        import('jszip').then(m => m.default),
        import('html-to-image'),
        import('react-dom/client'),
      ])

      const zip    = new JSZip()
      const folder = zip.folder(carouselTitle.replace(/[^a-zA-Z0-9]/g, '_'))!

      // Offscreen mount point. Fixed at 1080px wide so each slide is
      // captured at the canvas reference width regardless of viewport.
      const offscreen = document.createElement('div')
      offscreen.style.cssText = [
        'position: fixed',
        'left: -99999px',
        'top: 0',
        'width: 1080px',
        'pointer-events: none',
        'z-index: -1',
      ].join('; ')
      document.body.appendChild(offscreen)

      cleanup = () => {
        if (offscreen.parentNode) offscreen.parentNode.removeChild(offscreen)
      }

      // Warm up the fonts using the first slide's would-be rendered text.
      // Renders once early so document.fonts.load resolves with the
      // actual weights/families that will appear in the captures.
      const fallbackStructure = parseStructure(templateStructure ?? null)

      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i]
        setProgress(Math.round(((i + 1) / slides.length) * 90))

        const structure: TemplateStructure | null =
          parseStructure(slide.templateStructure ?? null) ?? fallbackStructure

        // Mount this slide
        const slideHost = document.createElement('div')
        slideHost.dataset.slideId = slide.id
        offscreen.appendChild(slideHost)
        const root = ReactDOM.createRoot(slideHost)

        await new Promise<void>((resolve) => {
          root.render(
            structure ? (
              <TemplateRenderer
                structure={structure}
                content={{
                  headline: slide.title,
                  subtitle: slide.subtitle ?? slide.content,
                  cta:      slide.cta,
                  imageUrl: slide.imageUrl,
                }}
                showImageSlotHint={false}
              />
            ) : (
              <LegacySlide slide={slide} />
            )
          )
          // 1 frame to allow first paint + a small buffer for layout
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        })

        // Wait for fonts the slide actually uses to be ready.
        await ensureFontsLoaded(slideHost)
        // Extra cushion for the auto-fit ResizeObserver passes.
        await new Promise(r => setTimeout(r, 120))

        // Freeze cqw → px on auto-fit text so html-to-image captures
        // the correct size (it doesn't resolve container queries).
        const autofitNodes = slideHost.querySelectorAll<HTMLElement>('[data-autofit-text]')
        const restore: { node: HTMLElement; original: string }[] = []
        autofitNodes.forEach(n => {
          restore.push({ node: n, original: n.style.fontSize })
          n.style.fontSize = window.getComputedStyle(n).fontSize
        })

        let dataUrl: string
        try {
          dataUrl = await htmlToImage.toPng(slideHost, {
            pixelRatio: 2,
            cacheBust:  true,
            filter: (node) => {
              if (!(node instanceof HTMLElement)) return true
              return !node.hasAttribute('data-editor-overlay')
            },
          })
        } finally {
          restore.forEach(({ node, original }) => { node.style.fontSize = original })
          root.unmount()
          slideHost.remove()
        }

        const blob = await (await fetch(dataUrl)).blob()
        const slideTitle = slide.title?.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40) || `slide_${i + 1}`
        folder.file(`${String(i + 1).padStart(2, '0')}_${slideTitle}.png`, blob)
      }

      setProgress(95)

      fetch('/api/user/export-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carouselId }),
      }).catch(() => {})

      const content = await zip.generateAsync({ type: 'blob' })
      const url     = URL.createObjectURL(content)
      const a       = document.createElement('a')
      a.href        = url
      a.download    = `${carouselTitle.replace(/[^a-zA-Z0-9]/g, '_')}_slides.zip`
      a.click()
      URL.revokeObjectURL(url)

      setProgress(100)
      setTimeout(() => setProgress(0), 2000)
    } catch (e: any) {
      setError(e.message || 'Erro ao exportar slides')
    } finally {
      cleanup?.()
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleExport}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 rounded-xl glass border border-white/10 hover:border-blue-500/30 text-sm font-semibold transition-all hover:text-white text-gray-300 disabled:opacity-50"
      >
        {loading
          ? <Loader2 size={14} className="animate-spin text-blue-400" />
          : <Download size={14} className="text-blue-400" />}
        {loading ? `Exportando… ${progress}%` : 'Exportar ZIP'}
      </button>

      {loading && progress > 0 && (
        <div className="w-full bg-white/5 rounded-full h-1">
          <div
            className="h-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  )
}

/** Tiny fallback for legacy carousels with no templateStructure. */
function LegacySlide({ slide }: { slide: ExportSlide }) {
  return (
    <div
      style={{
        width: '100%',
        aspectRatio: '1 / 1',
        background: slide.imageUrl
          ? `linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.7)), url(${slide.imageUrl}) center/cover`
          : '#0f172a',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8%',
        fontFamily: 'Inter, system-ui, sans-serif',
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: '6cqw', fontWeight: 900, lineHeight: 1.1 }}>
        {slide.title ?? '—'}
      </h1>
    </div>
  )
}
