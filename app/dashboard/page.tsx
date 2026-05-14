'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAppStore } from '@/lib/store'
import AppLayout from '@/components/AppLayout'
import CarouselCard from '@/components/CarouselCard'
import {
  Plus, Zap, TrendingUp, Layers, Star,
  AlertCircle, Sparkles, RefreshCw, Cloud, HardDrive,
} from 'lucide-react'

type FilterKey = 'all' | 'ready' | 'draft'

// Shape returned from /api/carousels
interface DBCarousel {
  id: string
  title: string
  topic: string
  mode: string
  format: string
  style: string
  status: string
  createdAt: string
  updatedAt: string
  slides: Array<{
    id: string; order: number; title: string; subtitle?: string | null
    content: string; cta?: string | null; imageUrl?: string | null
    imagePrompt?: string | null; backgroundColor: string; textColor: string
    accentColor: string; fontFamily: string; layout: string
  }>
}

function dbToStoreCarousel(d: DBCarousel) {
  let style: any
  try { style = typeof d.style === 'string' ? JSON.parse(d.style) : d.style }
  catch { style = { primaryColor: '#0ea5e9', secondaryColor: '#d946ef', backgroundColor: '#0f172a', textColor: '#ffffff', fontFamily: 'Inter', theme: 'dark' } }
  return {
    id: d.id, title: d.title, topic: d.topic,
    mode:   d.mode   as any,
    format: d.format as any,
    status: (d.status === 'published' ? 'ready' : d.status) as any,
    style,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    slides: d.slides.map(s => ({
      id:              s.id,
      title:           s.title,
      content:         s.content,
      subtitle:        s.subtitle  ?? undefined,
      cta:             s.cta       ?? undefined,
      imageUrl:        s.imageUrl  ?? undefined,
      imagePrompt:     s.imagePrompt ?? undefined,
      backgroundColor: s.backgroundColor,
      textColor:       s.textColor,
      accentColor:     s.accentColor,
      fontFamily:      s.fontFamily,
      layout:          s.layout as any,
    })),
  }
}

export default function DashboardPage() {
  const { carousels: localCarousels, deleteCarousel, addCarousel } = useAppStore()
  const [filter, setFilter] = useState<FilterKey>('all')

  // DB state
  const [dbCarousels, setDbCarousels] = useState<ReturnType<typeof dbToStoreCarousel>[]>([])
  const [dbLoading,   setDbLoading]   = useState(false)
  const [dbError,     setDbError]     = useState(false)
  const [usingDb,     setUsingDb]     = useState(false)

  const loadFromDb = useCallback(async () => {
    setDbLoading(true)
    setDbError(false)
    try {
      const res = await fetch('/api/carousels')
      if (res.status === 401) {
        // Not logged in — use localStorage only
        setUsingDb(false)
        return
      }
      if (!res.ok) throw new Error()
      const data: DBCarousel[] = await res.json()
      const converted = data.map(dbToStoreCarousel)
      setDbCarousels(converted)
      setUsingDb(true)

      // Merge DB items into localStorage store (so editor/etc. can access them)
      const localIds = new Set(localCarousels.map(c => c.id))
      converted.forEach(c => {
        if (!localIds.has(c.id)) addCarousel(c as any)
      })
    } catch {
      setDbError(true)
      setUsingDb(false)
    } finally {
      setDbLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { loadFromDb() }, [loadFromDb])

  // Merge: DB items take precedence (fresher), fill with localStorage for items not in DB
  const allCarousels = usingDb
    ? (() => {
        const dbIds = new Set(dbCarousels.map(c => c.id))
        const localOnly = localCarousels.filter(c => !dbIds.has(c.id))
        return [...dbCarousels, ...localOnly] as typeof localCarousels
      })()
    : localCarousels

  const filtered = allCarousels.filter(c => {
    if (filter === 'all') return true
    return c.status === filter
  })

  const stats = [
    { label: 'Carrosséis Criados',       value: allCarousels.length,                                      icon: Layers,     color: 'from-blue-500 to-cyan-500'   },
    { label: 'Prontos para Publicar',     value: allCarousels.filter(c => c.status === 'ready').length,    icon: Star,       color: 'from-green-500 to-emerald-500' },
    { label: 'Total de Slides',           value: allCarousels.reduce((acc, c) => acc + c.slides.length, 0), icon: TrendingUp, color: 'from-purple-500 to-pink-500'  },
  ]

  return (
    <AppLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black mb-1">Dashboard</h1>
            <p className="text-gray-400 text-sm flex items-center gap-1.5">
              {usingDb
                ? <><Cloud size={12} className="text-green-400" /> Sincronizado com a nuvem</>
                : <><HardDrive size={12} className="text-gray-400" /> Armazenamento local</>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadFromDb}
              disabled={dbLoading}
              title="Atualizar da nuvem"
              className="p-2.5 glass rounded-xl hover:bg-white/10 transition-all disabled:opacity-50"
            >
              <RefreshCw size={16} className={dbLoading ? 'animate-spin text-blue-400' : 'text-gray-400'} />
            </button>
            <Link
              href="/generator"
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-3 rounded-xl font-semibold hover:opacity-90 transition-all hover:scale-105"
            >
              <Plus size={20} />
              Novo Carrossel
            </Link>
          </div>
        </div>

        {/* DB error banner */}
        {dbError && (
          <div className="flex items-center gap-3 glass border border-orange-500/20 rounded-xl p-4 mb-6">
            <AlertCircle size={18} className="text-orange-400 flex-shrink-0" />
            <p className="text-sm text-orange-300 flex-1">
              Não foi possível sincronizar com a nuvem. Exibindo dados locais.
            </p>
            <button onClick={loadFromDb} className="text-xs text-orange-400 hover:text-orange-300 font-semibold">
              Tentar novamente
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {stats.map(stat => (
            <div key={stat.label} className="glass rounded-2xl p-5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center flex-shrink-0`}>
                <stat.icon size={22} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-black">{stat.value}</p>
                <p className="text-gray-400 text-xs">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        {allCarousels.length > 0 && (
          <div className="flex gap-2 mb-6">
            {[
              { key: 'all',   label: 'Todos'      },
              { key: 'ready', label: 'Prontos'     },
              { key: 'draft', label: 'Rascunhos'   },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as FilterKey)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === tab.key
                    ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border border-blue-500/30'
                    : 'text-gray-400 hover:text-white glass'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Carousels Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(carousel => (
              <CarouselCard
                key={carousel.id}
                carousel={carousel}
                onDelete={async (id) => {
                  // Delete from DB first (fire-and-forget)
                  if (usingDb) {
                    fetch(`/api/carousels/${id}`, { method: 'DELETE' }).catch(() => {})
                    setDbCarousels(prev => prev.filter(c => c.id !== id))
                  }
                  deleteCarousel(id)
                }}
              />
            ))}
          </div>
        ) : (
          <div className="glass rounded-3xl p-16 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-6">
              <Sparkles size={36} className="text-blue-400" />
            </div>
            <h3 className="text-xl font-bold mb-3">
              {allCarousels.length === 0 ? 'Crie seu primeiro carrossel!' : 'Nenhum carrossel aqui'}
            </h3>
            <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
              {allCarousels.length === 0
                ? 'Use o poder do Google Gemini para gerar carrosséis virais em segundos. É simples, rápido e poderoso.'
                : 'Nenhum carrossel encontrado com este filtro.'}
            </p>
            {allCarousels.length === 0 && (
              <Link
                href="/generator"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-4 rounded-xl font-bold hover:opacity-90 transition-all hover:scale-105"
              >
                <Zap size={20} />
                Gerar Meu Primeiro Carrossel
              </Link>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
