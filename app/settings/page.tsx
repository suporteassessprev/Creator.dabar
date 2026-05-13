'use client'

import { useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { useAppStore } from '@/lib/store'
import {
  Key, CheckCircle2, XCircle, ExternalLink, Eye, EyeOff,
  Loader2, Shield, Zap, AlertCircle, Sparkles
} from 'lucide-react'

export default function SettingsPage() {
  const { geminiApiKey, setGeminiApiKey } = useAppStore()
  const [inputKey, setInputKey] = useState(geminiApiKey)
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setGeminiApiKey(inputKey.trim())
    setSaved(true)
    setTestResult(null)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleTest = async () => {
    if (!inputKey.trim()) return
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'teste de conexão',
          slideCount: 1,
          tone: 'profissional',
          targetAudience: 'teste',
          apiKey: inputKey.trim(),
          style: {
            primaryColor: '#0ea5e9',
            secondaryColor: '#d946ef',
            backgroundColor: '#0f172a',
            textColor: '#ffffff',
            fontFamily: 'Inter',
            theme: 'dark',
          },
        }),
      })
      setTestResult(res.ok ? 'success' : 'error')
    } catch {
      setTestResult('error')
    } finally {
      setTesting(false)
    }
  }

  return (
    <AppLayout>
      <div className="p-8 max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-2">Configurações</h1>
          <p className="text-gray-400">Configure sua integração com o Google Gemini</p>
        </div>

        {/* API Key section */}
        <div className="glass rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Key size={20} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold">Google Gemini API Key</h2>
              <p className="text-xs text-gray-400">Sua chave fica salva localmente no navegador</p>
            </div>
          </div>

          <div className="relative mb-4">
            <input
              type={showKey ? 'text' : 'password'}
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="AIza..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:border-blue-500/50 placeholder-gray-500 font-mono"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Test result */}
          {testResult && (
            <div
              className={`flex items-center gap-2 text-sm p-3 rounded-xl mb-4 ${
                testResult === 'success'
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}
            >
              {testResult === 'success' ? (
                <><CheckCircle2 size={16} /> Conexão bem-sucedida! API key válida.</>
              ) : (
                <><XCircle size={16} /> Falha na conexão. Verifique sua API key.</>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleTest}
              disabled={testing || !inputKey.trim()}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                testing || !inputKey.trim()
                  ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                  : 'glass hover:bg-white/10 text-white'
              }`}
            >
              {testing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              Testar conexão
            </button>
            <button
              onClick={handleSave}
              disabled={!inputKey.trim()}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                saved
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : !inputKey.trim()
                  ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90'
              }`}
            >
              {saved ? <><CheckCircle2 size={14} /> Salvo!</> : 'Salvar API Key'}
            </button>
          </div>
        </div>

        {/* How to get API key */}
        <div className="glass rounded-2xl p-6 mb-6">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Sparkles size={18} className="text-yellow-400" />
            Como obter sua API Key do Gemini
          </h3>
          <ol className="space-y-3 text-sm text-gray-400">
            {[
              'Acesse o Google AI Studio (link abaixo)',
              'Faça login com sua conta Google',
              'Clique em "Get API key" no menu lateral',
              'Crie uma nova chave ou use uma existente',
              'Cole a chave no campo acima e salve',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5 text-blue-400">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors text-sm font-semibold"
          >
            <ExternalLink size={14} />
            Abrir Google AI Studio
          </a>
        </div>

        {/* Privacy info */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <Shield size={18} className="text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm mb-1">Privacidade & Segurança</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Sua API key é armazenada apenas no seu navegador (localStorage).
                Ela nunca é enviada para nossos servidores — apenas diretamente para a API do Google.
                Você tem controle total sobre seus gastos no Google Cloud Console.
              </p>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="mt-6 flex items-center gap-2">
          {geminiApiKey ? (
            <div className="flex items-center gap-2 text-sm text-green-400">
              <CheckCircle2 size={16} />
              API Key configurada e pronta para uso
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-yellow-400">
              <AlertCircle size={16} />
              Nenhuma API Key configurada
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
