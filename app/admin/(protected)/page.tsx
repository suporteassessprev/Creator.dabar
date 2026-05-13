import { prisma } from '@/lib/db'
import { Users, FileText, Wand2, Image as ImageIcon } from 'lucide-react'

export default async function AdminDashboard() {
  const [userCount, carouselCount, templateCount, promptCount] = await Promise.all([
    prisma.user.count(),
    prisma.carousel.count(),
    prisma.template.count(),
    prisma.promptConfig.count(),
  ])

  const stats = [
    {
      label: 'Usuários',
      value: userCount,
      icon: Users,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      label: 'Carrosséis',
      value: carouselCount,
      icon: ImageIcon,
      color: 'from-purple-500 to-pink-500',
    },
    {
      label: 'Templates',
      value: templateCount,
      icon: FileText,
      color: 'from-orange-500 to-yellow-500',
    },
    {
      label: 'Prompts',
      value: promptCount,
      icon: Wand2,
      color: 'from-green-500 to-emerald-500',
    },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black mb-1">Painel administrativo</h1>
        <p className="text-gray-400 text-sm">Visão geral do sistema ViralPost</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="glass rounded-2xl p-5 flex items-center gap-4"
          >
            <div
              className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center flex-shrink-0`}
            >
              <stat.icon size={22} className="text-white" />
            </div>
            <div>
              <p className="text-2xl font-black">{stat.value}</p>
              <p className="text-gray-400 text-xs">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl p-8 text-center">
        <h2 className="text-xl font-bold mb-2">Bem-vindo, Admin 👋</h2>
        <p className="text-gray-400 text-sm max-w-md mx-auto">
          Esta é a base do painel administrativo. As próximas fases incluirão
          gestão de usuários, templates compartilhados, configuração de prompts
          de IA e moderação de carrosséis.
        </p>
      </div>
    </div>
  )
}
