'use client'

import { useState } from 'react'
import AppLayout from '@/components/AppLayout'
import {
  Key, CheckCircle2, XCircle, Loader2, Shield, Zap, Sparkles,
} from 'lucide-react'

export default function SettingsPage() {
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | 'unconfigured' | null>(null)

  const handleTest = async () => {
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
        }),
      })
      if (res.status === 503) {
        setTestResult('unconfigured')
      } else {
        setTestResult(res.ok ? 'success' : 'error')
      }
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
          <p className="text-gray-400">Status da integração com o Google Gemini</p>
        </div>

        {/* Server-managed key status */}
        <div className="glass rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Key size={20} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold">Google Gemini API Key</h2>
              <p className="text-xs text-gray-400">A chave de IA é gerenciada pelo administrador do sistema</p>
            </div>
          </div>

          {testResult && (
            <div
              className={`flex items-center gap-2 text-sm p-3 rounded-xl mb-4 ${
                testResult === 'success'
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                  : testResult === 'unconfigured'
                  ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}
            >
              {testResult === 'success' ? (
                <><CheckCircle2 size={16} /> Conexão bem-sucedida! A chave do servidor está válida.</>
              ) : testResult === 'unconfigured' ? (
                <><XCircle size={16} /> A chave de IA do sistema precisa ser atualizada pelo administrador.</>
              ) : (
                <><XCircle size={16} /> Falha na conexão. Tente novamente em alguns instantes.</>
              )}
            </div>
          )}

          <button
            onClick={handleTest}
            disabled={testing}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              testing
                ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                : 'glass hover:bg-white/10 text-white'
            }`}
          >
            {testing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            Testar conexão com a IA
          </button>
        </div>

        {/* Privacy info */}
        <div className="glass rounded-2xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <Shield size={18} className="text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm mb-1">Privacidade &amp; Segurança</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                A chave de API do Gemini é mantida no servidor e nunca é exposta
                no navegador. As requisições passam pelo servidor antes de chegar
                à API do Google.
              </p>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="glass rounded-2xl p-6">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Sparkles size={18} className="text-yellow-400" />
            Sobre os créditos de IA
          </h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            Cada geração consome créditos do seu plano. Acompanhe o consumo na
            página de Cobrança. Se aparecer a mensagem
            &quot;A chave de IA do sistema precisa ser atualizada pelo administrador&quot;,
            entre em contato com o suporte.
          </p>
        </div>
      </div>
    </AppLayout>
  )
}
