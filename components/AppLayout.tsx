'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Zap, LayoutDashboard, Plus, Settings,
  CreditCard, ShoppingBag, ChevronRight, LogOut,
} from 'lucide-react'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard',     href: '/dashboard'  },
  { icon: Plus,            label: 'Novo Criativo',  href: '/generator'  },
  { icon: ShoppingBag,     label: 'Marketplace',   href: '/marketplace'},
  { icon: CreditCard,      label: 'Plano',          href: '/billing'   },
  { icon: Settings,        label: 'Configurações',  href: '/settings'  },
]

interface SubInfo {
  planDisplayName:  string
  creditsRemaining: number
  creditsPerMonth:  number
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sub, setSub] = useState<SubInfo | null>(null)

  useEffect(() => {
    fetch('/api/user/subscription')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data && !data.error) setSub(data) })
      .catch(() => {})
  }, [])

  const pct = sub && sub.creditsPerMonth > 0
    ? Math.min(100, Math.round((sub.creditsRemaining / sub.creditsPerMonth) * 100))
    : null

  return (
    <div className="min-h-screen flex bg-[#0a0a0f]">
      {/* Sidebar */}
      <aside className="w-64 glass-dark border-r border-white/5 flex flex-col fixed left-0 top-0 bottom-0 z-40">
        {/* Logo */}
        <div className="p-6 border-b border-white/5">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Zap size={18} className="text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">ViralPost</span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                  active
                    ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border border-blue-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon
                  size={20}
                  className={active ? 'text-blue-400' : 'group-hover:text-white'}
                />
                <span className="text-sm font-medium">{item.label}</span>
                {active && <ChevronRight size={16} className="ml-auto text-blue-400" />}
              </Link>
            )
          })}
        </nav>

        {/* Plan / credits widget */}
        <div className="p-4 border-t border-white/5 space-y-2">
          {sub ? (
            <div className="glass rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-300">{sub.planDisplayName}</span>
                <Link href="/billing" className="text-[10px] text-blue-400 hover:underline">
                  Gerenciar
                </Link>
              </div>
              {sub.creditsPerMonth === -1 ? (
                <p className="text-[10px] text-green-400">✨ Créditos ilimitados</p>
              ) : (
                <>
                  <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                    <span>Créditos</span>
                    <span>{sub.creditsRemaining}/{sub.creditsPerMonth}</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                      style={{ width: `${pct ?? 0}%` }}
                    />
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              href="/billing"
              className="block glass rounded-xl p-3 text-center hover:bg-white/5 transition-colors"
            >
              <p className="text-xs text-gray-400">Ver planos →</p>
            </Link>
          )}

          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="w-full flex items-center gap-2 px-4 py-2 rounded-xl text-xs text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <LogOut size={13} /> Sair
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64 min-h-screen">
        {children}
      </main>
    </div>
  )
}
