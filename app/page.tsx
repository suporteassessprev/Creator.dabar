'use client'

import Link from 'next/link'
import { Zap, Star, Users, ArrowRight, CheckCircle2, Sparkles, TrendingUp, Clock, ImageIcon, Palette } from 'lucide-react'

const features = [
  {
    icon: Sparkles,
    title: 'IA do Google Gemini',
    desc: 'Use sua própria API key. Zero limites impostos pela plataforma.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Clock,
    title: 'Menos de 1 Minuto',
    desc: 'Do tema ao carrossel completo em segundos. Produtividade máxima.',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: ImageIcon,
    title: 'Imagens com IA',
    desc: 'Fundo gerado automaticamente para cada slide. Sem Canva, sem stress.',
    color: 'from-orange-500 to-yellow-500',
  },
  {
    icon: Palette,
    title: 'Editor Completo',
    desc: 'Edite textos, cores, fontes e imagens com total liberdade.',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: TrendingUp,
    title: 'Conteúdo Viral',
    desc: 'Prompts otimizados para gerar hooks e CTAs que realmente convertem.',
    color: 'from-red-500 to-pink-500',
  },
  {
    icon: Users,
    title: 'Multi-formato',
    desc: 'Quadrado, retrato ou stories. Exporte no formato que precisar.',
    color: 'from-indigo-500 to-purple-500',
  },
]

const testimonials = [
  {
    name: 'Ana Silva',
    role: 'Criadora de Conteúdo',
    text: 'Criei 30 carrosséis em uma tarde. Meu engajamento triplicou em 2 semanas!',
    avatar: 'AS',
    stars: 5,
  },
  {
    name: 'Marcos Costa',
    role: 'Coach Empresarial',
    text: 'Finalmente uma ferramenta que entende o mercado brasileiro. Conteúdo que converte de verdade.',
    avatar: 'MC',
    stars: 5,
  },
  {
    name: 'Julia Mendes',
    role: 'Social Media Manager',
    text: 'Reduzi meu tempo de produção de conteúdo em 80%. Impossível viver sem o ViralPost.',
    avatar: 'JM',
    stars: 5,
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-animated text-white overflow-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-dark">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Zap size={18} className="text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">ViralPost</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-gray-300 hover:text-white transition-colors text-sm"
            >
              Entrar
            </Link>
            <Link
              href="/dashboard"
              className="bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Começar Grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center pt-20">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full text-sm text-blue-300 mb-8">
            <Star size={14} className="fill-yellow-400 text-yellow-400" />
            <span>+800 criadores de conteúdo já usam</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
            Carrosséis Virais{' '}
            <span className="gradient-text">em Menos de</span>
            <br />
            <span className="gradient-text">1 Minuto</span>
          </h1>

          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Use o poder do Google Gemini para criar carrosséis que param o scroll,
            geram engajamento e convertem seguidores em clientes.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-4 rounded-xl text-lg font-bold hover:opacity-90 transition-all hover:scale-105 glow-blue"
            >
              Criar Meu Primeiro Carrossel
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 glass px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white/10 transition-all"
            >
              <Zap size={20} />
              Conectar Gemini API
            </Link>
          </div>

          {/* Mock carousel preview */}
          <div className="relative mx-auto max-w-3xl">
            <div className="flex gap-3 justify-center overflow-x-hidden">
              {[
                { bg: 'from-blue-600 to-purple-700', title: '5 Erros que Destroem', sub: 'seu negócio online' },
                { bg: 'from-purple-600 to-pink-700', title: '#1 — Ignorar', sub: 'o poder das redes sociais', main: true },
                { bg: 'from-pink-600 to-red-700', title: '#2 — Postar sem', sub: 'estratégia definida' },
              ].map((card, i) => (
                <div
                  key={i}
                  className={`flex-shrink-0 ${card.main ? 'w-52 scale-110 z-10' : 'w-44 opacity-70'} transition-all`}
                >
                  <div
                    className={`bg-gradient-to-br ${card.bg} rounded-2xl p-6 aspect-square flex flex-col justify-end shadow-2xl`}
                    style={{ transform: i === 0 ? 'rotate(-5deg)' : i === 2 ? 'rotate(5deg)' : undefined }}
                  >
                    <div className="text-xs text-white/60 mb-1">Slide {i + 1}</div>
                    <p className="text-white font-bold text-sm leading-tight">{card.title}</p>
                    <p className="text-white/80 text-xs mt-1">{card.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">
              Tudo que você precisa para{' '}
              <span className="gradient-text">dominar as redes</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Uma plataforma completa para criar, editar e exportar carrosséis virais
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className="glass rounded-2xl p-6 hover:bg-white/10 transition-all hover:-translate-y-1 group"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon size={24} className="text-white" />
                </div>
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">Como funciona?</h2>
            <p className="text-gray-400 text-lg">3 passos para o seu carrossel viral</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Digite o tema',
                desc: 'Escreva sobre o que você quer falar. Nossa IA entende o contexto e cria conteúdo relevante.',
                color: 'from-blue-500 to-cyan-500',
              },
              {
                step: '02',
                title: 'IA gera tudo',
                desc: 'Texto, estrutura dos slides e imagens de fundo geradas automaticamente pelo Gemini.',
                color: 'from-purple-500 to-pink-500',
              },
              {
                step: '03',
                title: 'Edite e exporte',
                desc: 'Ajuste o que quiser no editor visual e exporte como imagens prontas para publicar.',
                color: 'from-orange-500 to-yellow-500',
              },
            ].map((step, i) => (
              <div key={i} className="text-center">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mx-auto mb-4 text-2xl font-black glow-blue`}>
                  {step.step}
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">
              Criadores que <span className="gradient-text">explodiram</span> no digital
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="glass rounded-2xl p-6">
                <div className="flex mb-3">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} size={16} className="fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-4">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-gray-400 text-xs">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="glass rounded-3xl p-12">
            <h2 className="text-4xl font-black mb-4">
              Pronto para criar conteúdo{' '}
              <span className="gradient-text">que converte?</span>
            </h2>
            <p className="text-gray-400 text-lg mb-8">
              Use sua chave do Google Gemini e comece agora. Gratuito.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {[
                'Sem limite de carrosséis',
                'Sua API, seu controle',
                'Exportação grátis',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle2 size={16} className="text-green-400" />
                  {item}
                </div>
              ))}
            </div>
            <Link
              href="/dashboard"
              className="mt-8 inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 px-10 py-4 rounded-xl text-lg font-bold hover:opacity-90 transition-all hover:scale-105 glow-blue"
            >
              Começar Agora — É Grátis
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Zap size={12} className="text-white" />
            </div>
            <span className="font-bold gradient-text">ViralPost</span>
          </div>
          <p className="text-gray-500 text-sm">
            Powered by Google Gemini • Feito para o mercado brasileiro
          </p>
        </div>
      </footer>
    </div>
  )
}
