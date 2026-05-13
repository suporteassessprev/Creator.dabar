'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import AppLayout from '@/components/AppLayout'
import { ShoppingBag, Loader2, Zap, Search, Plus } from 'lucide-react'

interface Template {
  id:          string
  name:        string
  description: string | null
  mode:        string
  format:      string
  author:      { name: string | null } | null
  promptText:  string | null
}

const MODE_LABELS: Record<string, string> = {
  text:  'Texto',
  image: 'Imagem',
  both:  'Ambos',
}

export default function MarketplacePage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading,   setLoading]   = useState(true)
  const [mode,      setMode]      = useState('all')
  const [search,    setSearch]    = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/marketplace/templates?mode=${mode}`)
      if (res.ok) setTemplates(await res.json())
    } finally { setLoading(false) }
  }, [mode])

  useEffect(() => { load() }, [load])

  const filtered = templates.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.description?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AppLayout>
      <div className="p-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black mb-1 flex items-center gap-3">
              <ShoppingBag size={28} className="text-purple-400" /> Marketplace
            </h1>
            <p className="text-gray-400 text-sm">Templates criados pela comunidade</p>
          </div>
          <Link
            href="/marketplace/submit"
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-all"
          >
            <Plus size={14} /> Enviar Template
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar templates…"
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500/40"
            />
          </div>
          {['all', 'text', 'image', 'both'].map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                mode === m
                  ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border border-blue-500/30'
                  : 'glass text-gray-400 hover:text-white'
              }`}
            >
              {m === 'all' ? 'Todos' : MODE_LABELS[m]}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 size={22} className="animate-spin mr-2" /> Carregando…
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center">
            <ShoppingBag size={40} className="text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-2">Nenhum template encontrado</p>
            <p className="text-gray-600 text-sm">Seja o primeiro a contribuir!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(t => (
              <div key={t.id} className="glass rounded-2xl p-5 flex flex-col gap-3 hover:bg-white/5 transition-all">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-sm leading-tight">{t.name}</h3>
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                    {MODE_LABELS[t.mode] ?? t.mode}
                  </span>
                </div>

                {t.description && (
                  <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{t.description}</p>
                )}

                <div className="flex items-center justify-between mt-auto">
                  <span className="text-[10px] text-gray-500">
                    {t.author?.name ? `por ${t.author.name}` : 'comunidade'}
                    {' · '}{t.format}
                  </span>
                  <Link
                    href={`/generator?templateId=${t.id}`}
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                  >
                    <Zap size={12} /> Usar
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
