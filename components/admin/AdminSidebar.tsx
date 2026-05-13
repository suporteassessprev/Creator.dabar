'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, FileText, Wand2, Image as ImageIcon,
  LogOut, Shield, ChevronRight, Zap, BarChart3, ShoppingBag,
} from 'lucide-react'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard',   href: '/admin' },
  { icon: BarChart3,       label: 'Analytics',   href: '/admin/analytics' },
  { icon: Users,           label: 'Usuários',    href: '/admin/users' },
  { icon: FileText,        label: 'Templates',   href: '/admin/templates' },
  { icon: Wand2,           label: 'Prompts',     href: '/admin/prompts' },
  { icon: ShoppingBag,     label: 'Marketplace', href: '/admin/marketplace' },
  { icon: ImageIcon,       label: 'Carrosséis',  href: '/admin/carousels' },
]

export default function AdminSidebar({
  user,
}: {
  user: { email: string; name?: string | null }
}) {
  const pathname = usePathname()

  return (
    <aside className="w-64 glass-dark border-r border-white/5 flex flex-col fixed left-0 top-0 bottom-0 z-40">
      <div className="p-6 border-b border-white/5">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
            <Zap size={18} className="text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold gradient-text leading-tight">ViralPost</span>
            <span className="text-[10px] text-gray-400 leading-none flex items-center gap-1">
              <Shield size={9} /> ADMIN
            </span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href
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

      <div className="p-4 border-t border-white/5">
        <div className="glass rounded-xl p-3 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
              {(user.name ?? user.email).charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{user.name ?? 'Admin'}</p>
              <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
        </div>
        <form action="/admin/logout" method="POST">
          <button
            type="submit"
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut size={14} />
            Sair
          </button>
        </form>
      </div>
    </aside>
  )
}
