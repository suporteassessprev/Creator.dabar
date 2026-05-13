'use client'

import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, XCircle, Clock, Loader2, Eye } from 'lucide-react'

interface Submission {
  id:          string
  name:        string
  description: string | null
  mode:        string
  format:      string
  status:      string
  reviewNote:  string | null
  createdAt:   string
  user:        { name: string | null; email: string }
  approvedTemplate: { id: string } | null
}

const STATUS_MAP = {
  pending:  { label: 'Pendente',  color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  approved: { label: 'Aprovado',  color: 'text-green-400 bg-green-500/10 border-green-500/20'   },
  rejected: { label: 'Rejeitado', color: 'text-red-400 bg-red-500/10 border-red-500/20'         },
}

export default function AdminMarketplacePage() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading,     setLoading]     = useState(true)
  const [filter,      setFilter]      = useState('pending')
  const [reviewing,   setReviewing]   = useState<string | null>(null)
  const [reviewNote,  setReviewNote]  = useState('')
  const [toast,       setToast]       = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/marketplace?status=${filter}`)
      if (res.ok) setSubmissions(await res.json())
    } finally { setLoading(false) }
  }, [filter])

  useEffect(() => { load() }, [load])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleReview(id: string, action: 'approve' | 'reject', note = '') {
    try {
      const res = await fetch(`/api/admin/marketplace/${id}/review`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action, reviewNote: note }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      showToast(action === 'approve' ? '✅ Template aprovado e publicado!' : '❌ Submissão rejeitada')
      setReviewing(null)
      setReviewNote('')
      load()
    } catch (e: any) {
      showToast(`Erro: ${e.message}`)
    }
  }

  return (
    <div className="p-8">
      {toast && (
        <div className="fixed top-4 right-4 z-50 glass border border-white/20 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg">
          {toast}
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-black mb-1">Marketplace</h1>
        <p className="text-gray-400 text-sm">Revise e aprove submissões de templates dos usuários</p>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {['pending','approved','rejected'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize ${
              filter === s
                ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border border-blue-500/30'
                : 'glass text-gray-400 hover:text-white'
            }`}
          >
            {STATUS_MAP[s as keyof typeof STATUS_MAP].label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 size={22} className="animate-spin mr-2" /> Carregando…
        </div>
      ) : submissions.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Clock size={36} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Nenhuma submissão {STATUS_MAP[filter as keyof typeof STATUS_MAP]?.label.toLowerCase()}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map(s => (
            <div key={s.id} className="glass rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-base">{s.name}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_MAP[s.status as keyof typeof STATUS_MAP].color}`}>
                      {STATUS_MAP[s.status as keyof typeof STATUS_MAP].label}
                    </span>
                    <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
                      {s.mode} · {s.format}
                    </span>
                  </div>
                  {s.description && <p className="text-sm text-gray-400 mt-0.5">{s.description}</p>}
                  <p className="text-xs text-gray-500 mt-1">
                    Por <span className="text-gray-300">{s.user.name ?? s.user.email}</span>
                    {' · '}{new Date(s.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              {s.reviewNote && (
                <div className="text-xs text-gray-400 glass rounded-lg p-2 mb-3">
                  <span className="font-semibold">Nota da revisão:</span> {s.reviewNote}
                </div>
              )}

              {s.status === 'pending' && (
                reviewing === s.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={reviewNote}
                      onChange={e => setReviewNote(e.target.value)}
                      placeholder="Nota opcional para o usuário…"
                      rows={2}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-blue-500/40"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReview(s.id, 'approve', reviewNote)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-semibold hover:bg-green-500/30 transition-all"
                      >
                        <CheckCircle2 size={14} /> Aprovar
                      </button>
                      <button
                        onClick={() => handleReview(s.id, 'reject', reviewNote)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/30 transition-all"
                      >
                        <XCircle size={14} /> Rejeitar
                      </button>
                      <button
                        onClick={() => { setReviewing(null); setReviewNote('') }}
                        className="px-4 py-2 rounded-xl glass text-gray-400 text-sm hover:text-white transition-all"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setReviewing(s.id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl glass border border-white/10 text-sm font-semibold hover:bg-white/10 transition-all text-gray-300"
                  >
                    <Eye size={14} /> Revisar
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
