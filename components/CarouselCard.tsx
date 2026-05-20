'use client'

/**
 * Netflix-style carousel card.
 *
 * Shows the FIRST slide rendered at its real aspect ratio (1:1, 4:5, or
 * 9:16) using the same TemplateRenderer pipeline as the editor — so the
 * dashboard preview matches what the user will export.
 *
 * Falls back to a styled placeholder for legacy carousels with no
 * templateStructure.
 *
 * Hover reveals action buttons (Edit / Delete) over a dark gradient.
 */

import Link from 'next/link'
import { Carousel } from '@/lib/store'
import { parseStructure } from '@/lib/template-structure'
import TemplateRenderer from '@/components/TemplateRenderer'
import { Edit3, Trash2, Clock, Layers, ImageOff } from 'lucide-react'

interface CarouselCardProps {
  carousel: Carousel
  onDelete: (id: string) => void
}

const ASPECT_FOR_FORMAT: Record<string, string> = {
  square:          '1/1',
  'feed-vertical': '4/5',
  story:           '9/16',
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export default function CarouselCard({ carousel, onDelete }: CarouselCardProps) {
  const slides = Array.isArray(carousel.slides) ? carousel.slides : []
  const firstSlide = slides[0]
  const structure  = parseStructure(carousel.templateStructure ?? null)
  const aspectRatio = ASPECT_FOR_FORMAT[carousel.format] ?? '1/1'

  return (
    <div className="group">
      {/* Real-size preview */}
      <div
        className="relative rounded-2xl overflow-hidden bg-slate-900 border border-white/5 transition-all hover:border-white/20 hover:-translate-y-1 hover:shadow-2xl"
        style={{ aspectRatio }}
      >
        {structure && firstSlide ? (
          <div className="pointer-events-none">
            <TemplateRenderer
              structure={structure}
              content={{
                headline: firstSlide.title,
                subtitle: firstSlide.subtitle ?? firstSlide.content,
                cta:      firstSlide.cta,
                imageUrl: firstSlide.imageUrl,
              }}
              showImageSlotHint={false}
            />
          </div>
        ) : (
          <LegacyPreview slide={firstSlide} />
        )}

        {/* Status pill */}
        <div className="absolute top-3 left-3">
          <span
            className={`text-[10px] px-2.5 py-1 rounded-full font-semibold tracking-wide uppercase ${
              carousel.status === 'ready'
                ? 'bg-green-500/90 text-white'
                : carousel.status === 'generating'
                ? 'bg-yellow-500/90 text-black'
                : 'bg-gray-500/80 text-white'
            }`}
          >
            {carousel.status === 'ready' ? 'Pronto' : carousel.status === 'generating' ? 'Gerando' : 'Rascunho'}
          </span>
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 gap-2">
          <div className="flex gap-2">
            <Link
              href={`/editor?id=${carousel.id}`}
              className="flex-1 flex items-center justify-center gap-1.5 bg-white hover:bg-gray-100 text-black px-3 py-2 rounded-lg text-xs font-bold transition-colors"
            >
              <Edit3 size={13} /> Editar
            </Link>
            <button
              onClick={() => onDelete(carousel.id)}
              className="flex items-center justify-center bg-red-500/90 hover:bg-red-600 text-white px-3 py-2 rounded-lg transition-colors"
              title="Excluir"
              aria-label="Excluir carrossel"
              type="button"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Info below */}
      <div className="px-1 pt-3">
        <h3 className="font-semibold text-sm mb-1 line-clamp-2 leading-tight">
          {carousel.title || 'Sem título'}
        </h3>
        <div className="flex items-center gap-3 text-[11px] text-gray-500">
          <span className="flex items-center gap-1">
            <Layers size={11} />
            {slides.length}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {formatDate(carousel.updatedAt)}
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * Lightweight fallback for carousels with no templateStructure (legacy
 * format, mostly). Avoids loading the heavy base64 imageUrl as a giant
 * background — that was both slow to paint and visually noisy in the
 * grid. Shows a colorful gradient backdrop derived from the slide's
 * accentColor + the title, large and readable.
 */
function LegacyPreview({ slide }: { slide?: { title?: string; backgroundColor?: string; textColor?: string; accentColor?: string } }) {
  if (!slide) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-gray-600">
        <ImageOff size={36} className="opacity-50 mb-2" />
        <p className="text-xs">Sem prévia</p>
      </div>
    )
  }
  const bg     = slide.backgroundColor ?? '#0f172a'
  const accent = slide.accentColor     ?? '#0ea5e9'
  return (
    <div
      className="w-full h-full flex items-center justify-center p-6 relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${bg} 0%, ${bg} 60%, ${accent}44 100%)`,
      }}
    >
      <div
        className="absolute -bottom-12 -right-12 w-40 h-40 rounded-full blur-3xl opacity-50"
        style={{ background: accent }}
      />
      <p
        className="relative text-xl font-black text-center leading-tight z-10"
        style={{ color: slide.textColor ?? '#ffffff' }}
      >
        {(slide.title ?? 'Carrossel').slice(0, 60)}
      </p>
    </div>
  )
}
