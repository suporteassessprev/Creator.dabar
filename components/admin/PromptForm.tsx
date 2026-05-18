'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Save, ChevronLeft, History, RotateCcw, Copy,
  FlaskConical, ChevronDown, ChevronUp, CheckCircle2,
  AlertCircle, Loader2,
} from 'lucide-react'

export type PromptType = 'creative_copy' | 'carousel_copy' | 'creative_image' | 'carousel_image'

const PROMPT_TYPES: { value: PromptType; label: string; description: string }[] = [
  { value: 'creative_copy', label: 'Criativo — Texto',  description: 'Gera headline, subtitle, CTA e imagePrompt para o modo criativo' },
  { value: 'carousel_copy', label: 'Carrossel — Texto', description: 'Gera título e slides para o modo carrossel' },
  { value: 'creative_image', label: 'Criativo — Imagem', description: 'Prompt usado para gerar a imagem de fundo no modo criativo' },
  { value: 'carousel_image', label: 'Carrossel — Imagem', description: 'Prompt usado para gerar imagens de slide no carrossel' },
]

const DEFAULT_TEST_VARS: Record<PromptType, Record<string, string>> = {
  creative_copy:  { topic: 'Como ganhar dinheiro online', tone: 'viral', audience: 'empreendedores' },
  carousel_copy:  { topic: 'Produtividade no trabalho remoto', tone: 'educativo', audience: 'profissionais', slideCount: '5' },
  creative_image: { imagePrompt: 'successful entrepreneur working on laptop in modern office' },
  carousel_image: { imagePrompt: 'team collaboration in bright office' },
}

interface PromptVersion {
  id: string
  version: number
  content: string
  createdAt: string
}

interface Props {
  initial?: {
    id?: string
    name: string
    type: PromptType
    content: string
    active: boolean
    version?: number
    versions?: PromptVersion[]
  }
}

export default function PromptForm({ initial }: Props) {
  const router = useRouter()
  const isEdit = !!initial?.id

  const [name,    setName]    = useState(initial?.name    ?? '')
  const [type,    setType]    = useState<PromptType>(initial?.type ?? 'carousel_copy')
  const [content, setContent] = useState(initial?.content ?? '')
  const [active,  setActive]  = useState(initial?.active  ?? true)

  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [success,  setSuccess]  = useState(false)

  // Version history
  const [versions,    setVersions]    = useState<PromptVersion[]>(initial?.versions ?? [])
  const [showHistory, setShowHistory] = useState(false)
  const [restoring,   setRestoring]   = useState<string | null>(null)

  // Inline test
  const [showTest,   setShowTest]   = useState(false)
  const [testVars,   setTestVars]   = useState<Record<string, string>>(DEFAULT_TEST_VARS[type])
  const [testing,    setTesting]    = useState(false)
  const [testResult, setTestResult] = useState<{ filled: string; output: string } | null>(null)
  const [testError,  setTestError]  = useState<string | null>(null)

  const handleTypeChange = (t: PromptType) => {
    setType(t)
    setTestVars(DEFAULT_TEST_VARS[t])
  }

  async function handleSave() {
    setError(null)
    setSaving(true)
    try {
      const url    = isEdit ? `/api/admin/prompts/${initial!.id}` : '/api/admin/prompts'
      const method = isEdit ? 'PUT' : 'POST'
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, content, active }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Erro ao salvar')
      }
      setSuccess(true)
      setTimeout(() => {
        router.push('/admin/prompts')
        router.refresh()
      }, 800)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function loadVersions() {
    if (!initial?.id) return
    try {
      const res = await fetch(`/api/admin/prompts/${initial.id}/versions`)
      if (res.ok) setVersions(await res.json())
    } catch {}
  }

  async function handleRestore(versionId: string) {
    if (!initial?.id) return
    setRestoring(versionId)
    try {
      const res = await fetch(`/api/admin/prompts/${initial.id}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error)
      }
      const restored = await res.json()
      setContent(restored.content)
      await loadVersions()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setRestoring(null)
    }
  }

  async function handleTest() {
    setTesting(true)
    setTestError(null)
    setTestResult(null)
    try {
      const url = isEdit
        ? `/api/admin/prompts/${initial!.id}/test`
        : '/api/admin/prompts/test-anonymous'

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vars:   testVars,
          content, // always use the current editor content
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error)
      }
      setTestResult(await res.json())
    } catch (e: any) {
      setTestError(e.message)
    } finally {
      setTesting(false)
    }
  }

  const typeInfo = PROMPT_TYPES.find(t => t.value === type)!
  const varMatches = Array.from(content.matchAll(/\{\{(\w+)\}\}/g)).map(m => m[1])
  const uniqueVars = Array.from(new Set(varMatches))

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg glass hover:bg-white/10 transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-black">
              {isEdit ? 'Editar Prompt' : 'Novo Prompt'}
            </h1>
            {isEdit && initial?.version !== undefined && (
              <p className="text-xs text-gray-400 mt-0.5">v{initial.version} · {versions.length} versão(ões) salva(s)</p>
            )}
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || success}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-60"
        >
          {saving   ? <Loader2 size={16} className="animate-spin" /> :
           success  ? <CheckCircle2 size={16} /> :
           <Save size={16} />}
          {saving ? 'Salvando…' : success ? 'Salvo!' : 'Salvar'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 glass border border-red-500/30 rounded-xl p-3 mb-6 text-red-400 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-5">
          {/* Name */}
          <div className="glass rounded-2xl p-5">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Nome do Prompt
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Carrossel Viral v2"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500/50 placeholder-gray-600"
            />
          </div>

          {/* Type (only on create) */}
          {!isEdit && (
            <div className="glass rounded-2xl p-5">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Tipo
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PROMPT_TYPES.map(pt => (
                  <button
                    key={pt.value}
                    onClick={() => handleTypeChange(pt.value)}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      type === pt.value
                        ? 'border-blue-500/50 bg-blue-500/10 text-white'
                        : 'border-white/10 glass text-gray-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    <p className="text-sm font-semibold">{pt.label}</p>
                    <p className="text-[10px] mt-0.5 text-gray-400 line-clamp-2">{pt.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Content editor */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Template do Prompt
              </label>
              {uniqueVars.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {uniqueVars.map(v => (
                    <span key={v} className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/20">
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={14}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-blue-500/50 placeholder-gray-600 resize-y"
              placeholder={'Use {{topic}}, {{tone}}, {{audience}}, {{slideCount}}, {{imagePrompt}} como variáveis...'}
            />
            <p className="text-[10px] text-gray-500 mt-1.5">
              Use <code className="text-purple-400">{`{{variavel}}`}</code> para placeholders substituídos automaticamente na geração
            </p>
            <PromptContract type={type} />
          </div>

          {/* Inline test panel */}
          <div className="glass rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowTest(v => !v)}
              className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-all"
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                <FlaskConical size={16} className="text-green-400" />
                Testar Prompt
              </div>
              {showTest ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showTest && (
              <div className="px-5 pb-5 space-y-4 border-t border-white/5">
                <p className="text-[11px] text-gray-500 pt-3">
                  O teste usa a chave Gemini configurada no servidor.
                </p>

                {/* Vars */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Variáveis de teste</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(testVars).map(([k, v]) => (
                      <div key={k}>
                        <label className="block text-[10px] text-gray-500 mb-1">{`{{${k}}}`}</label>
                        <input
                          value={v}
                          onChange={e => setTestVars(prev => ({ ...prev, [k]: e.target.value }))}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-green-500/40"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleTest}
                  disabled={testing}
                  className="flex items-center gap-2 bg-green-500/20 border border-green-500/30 text-green-400 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-500/30 transition-all disabled:opacity-50"
                >
                  {testing ? <Loader2 size={14} className="animate-spin" /> : <FlaskConical size={14} />}
                  {testing ? 'Testando…' : 'Executar Teste'}
                </button>

                {testError && (
                  <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl p-3">{testError}</div>
                )}

                {testResult && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Prompt preenchido</p>
                      <pre className="text-xs bg-white/5 rounded-xl p-3 overflow-auto max-h-40 text-gray-300 whitespace-pre-wrap">{testResult.filled}</pre>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Resposta da IA</p>
                      <pre className="text-xs bg-white/5 rounded-xl p-3 overflow-auto max-h-48 text-green-300 whitespace-pre-wrap">{testResult.output}</pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Type info (edit mode) */}
          {isEdit && (
            <div className="glass rounded-2xl p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Tipo</p>
              <p className="text-sm font-semibold">{typeInfo.label}</p>
              <p className="text-xs text-gray-400 mt-1">{typeInfo.description}</p>
            </div>
          )}

          {/* Active toggle */}
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Ativo</p>
                <p className="text-xs text-gray-400 mt-0.5">Apenas um prompt por tipo pode estar ativo</p>
              </div>
              <button
                onClick={() => setActive(v => !v)}
                className={`w-12 h-6 rounded-full transition-all relative ${active ? 'bg-green-500' : 'bg-white/10'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${active ? 'left-6' : 'left-0.5'}`} />
              </button>
            </div>
          </div>

          {/* Version history */}
          {isEdit && (
            <div className="glass rounded-2xl overflow-hidden">
              <button
                onClick={async () => {
                  if (!showHistory) await loadVersions()
                  setShowHistory(v => !v)
                }}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-all"
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <History size={15} className="text-blue-400" />
                  Histórico
                </div>
                {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showHistory && (
                <div className="border-t border-white/5 max-h-64 overflow-y-auto">
                  {versions.length === 0 ? (
                    <p className="text-xs text-gray-500 p-4 text-center">Nenhuma versão anterior</p>
                  ) : (
                    versions.map(v => (
                      <div key={v.id} className="px-4 py-3 border-b border-white/5 last:border-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-purple-300">v{v.version}</span>
                          <span className="text-[10px] text-gray-500">
                            {new Date(v.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 line-clamp-2 mb-1.5 font-mono">{v.content}</p>
                        <button
                          onClick={() => handleRestore(v.id)}
                          disabled={restoring === v.id}
                          className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 font-semibold disabled:opacity-50"
                        >
                          {restoring === v.id
                            ? <Loader2 size={10} className="animate-spin" />
                            : <RotateCcw size={10} />}
                          Restaurar
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Shows the contract the saved prompt must respect: required input
 * placeholders + expected JSON output shape. This used to be tribal
 * knowledge — admin would save a prompt missing {{topic}} or asking
 * for "titulo" instead of "headline" and the generator would silently
 * produce a blank carousel.
 */
function PromptContract({ type }: { type: PromptType }) {
  const contracts: Record<PromptType, { placeholders: string[]; output: string }> = {
    creative_copy: {
      placeholders: ['{{topic}}', '{{tone}}', '{{audience}}'],
      output: '{"headline":"...","subtitle":"...","cta":"...","imagePrompt":"..."}',
    },
    carousel_copy: {
      placeholders: ['{{topic}}', '{{tone}}', '{{audience}}', '{{slideCount}}'],
      output: '{"title":"...","slides":[{"title":"...","content":"...","imagePrompt":"..."}]}',
    },
    creative_image: {
      placeholders: ['{{imagePrompt}}'],
      output: '(retorno é uma imagem — o prompt é só passado pro Nano Banana)',
    },
    carousel_image: {
      placeholders: ['{{imagePrompt}}'],
      output: '(retorno é uma imagem — o prompt é só passado pro Nano Banana)',
    },
  }
  const c = contracts[type]
  if (!c) return null
  return (
    <div className="mt-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs space-y-2">
      <p className="font-semibold text-amber-300">⚠ Contrato obrigatório para "{type}"</p>
      <div>
        <span className="text-gray-400">Placeholders esperados: </span>
        {c.placeholders.map(p => (
          <code key={p} className="text-purple-300 mx-1">{p}</code>
        ))}
      </div>
      <div>
        <span className="text-gray-400">JSON de saída: </span>
        <code className="text-emerald-300 break-all">{c.output}</code>
      </div>
      <p className="text-[10px] text-gray-500">
        Se faltar campo ou usar nome diferente (ex.: "titulo" no lugar de "headline"), a geração falha com erro descritivo.
      </p>
    </div>
  )
}
