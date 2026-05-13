'use client'

import Link from 'next/link'
import { Carousel } from '@/lib/store'
import { Edit3, Trash2, Eye, Clock, Layers } from 'lucide-react'

interface CarouselCardProps {
  carousel: Carousel
  onDelete: (id: string) => void
}

export default function CarouselCard({ carousel, onDelete }: CarouselCardProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const previewSlides = carousel.slides.slice(0, 3)

  return (
    <div className="glass rounded-2xl overflow-hidden hover:bg-white/10 transition-all group hover:-translate-y-1">
      {/* Preview */}
      <div className="relative h-40 bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center gap-2 p-4">
          {previewSlides.length > 0 ? (
            previewSlides.map((slide, i) => (
              <div
                key={slide.id}
                className="flex-shrink-0 rounded-lg overflow-hidden shadow-lg"
                style={{
                  width: i === 1 ? '80px' : '60px',
                  height: i === 1 ? '80px' : '60px',
                  zIndex: i === 1 ? 10 : 5,
                  transform: i === 0 ? 'rotate(-8deg)' : i === 2 ? 'rotate(8deg)' : undefined,
                  backgroundColor: slide.backgroundColor,
                  backgroundImage: slide.imageUrl ? `url(${slide.imageUrl})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                {!slide.imageUrl && (
                  <div className="w-full h-full flex items-center justify-center p-2">
                    <p
                      className="text-xs font-bold text-center leading-tight"
                      style={{ color: slide.textColor }}
                    >
                      {slide.title.slice(0, 20)}
                    </p>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-gray-500 text-sm text-center">
              <Layers size={32} className="mx-auto mb-2 opacity-30" />
              <p>Sem slides</p>
            </div>
          )}
        </div>

        {/* Overlay actions */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <Link
            href={`/editor?id=${carousel.id}`}
            className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
          >
            <Edit3 size={14} />
            Editar
          </Link>
          <button
            onClick={() => onDelete(carousel.id)}
            className="flex items-center gap-1 bg-red-500/80 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
          >
            <Trash2 size={14} />
            Excluir
          </button>
        </div>

        {/* Status badge */}
        <div className="absolute top-3 right-3">
          <span
            className={`text-xs px-2 py-1 rounded-full font-medium ${
              carousel.status === 'ready'
                ? 'bg-green-500/20 text-green-400'
                : carousel.status === 'generating'
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-gray-500/20 text-gray-400'
            }`}
          >
            {carousel.status === 'ready' ? 'Pronto' : carousel.status === 'generating' ? 'Gerando...' : 'Rascunho'}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-sm mb-1 truncate">{carousel.title}</h3>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Layers size={12} />
            <span>{carousel.slides.length} slides</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={12} />
            <span>{formatDate(carousel.updatedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
