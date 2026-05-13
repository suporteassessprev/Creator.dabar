'use client'

/**
 * Client-side ZIP export.
 * Captures each slide as PNG via html2canvas, packs into ZIP via JSZip.
 * Pro / Business feature — shows upgrade prompt otherwise.
 */

import { useState } from 'react'
import { Download, Loader2, Lock, AlertCircle } from 'lucide-react'

interface Slide {
  id: string
  title?: string
}

interface Props {
  carouselId:  string
  carouselTitle: string
  slides:      Slide[]
  canExport:   boolean  // from plan info
}

export default function ExportZipButton({ carouselId, carouselTitle, slides, canExport }: Props) {
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

    try {
      // Dynamic imports to avoid SSR issues
      const [JSZip, html2canvas] = await Promise.all([
        import('jszip').then(m => m.default),
        import('html2canvas').then(m => m.default),
      ])

      const zip  = new JSZip()
      const folder = zip.folder(carouselTitle.replace(/[^a-zA-Z0-9]/g, '_'))!

      const slideEls = document.querySelectorAll('[data-slide-id]')

      for (let i = 0; i < slideEls.length; i++) {
        const el = slideEls[i] as HTMLElement
        setProgress(Math.round(((i + 1) / slideEls.length) * 90))

        const canvas = await html2canvas(el, {
          useCORS:         true,
          allowTaint:      true,
          backgroundColor: null,
          scale:           2,  // 2x for sharper export
        })

        const blob = await new Promise<Blob>((res) =>
          canvas.toBlob(b => res(b!), 'image/png', 0.95)
        )

        const slideTitle = slides[i]?.title?.replace(/[^a-zA-Z0-9]/g, '_') || `slide_${i + 1}`
        folder.file(`${String(i + 1).padStart(2, '0')}_${slideTitle}.png`, blob)
      }

      setProgress(95)

      // Log usage (fire-and-forget)
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
