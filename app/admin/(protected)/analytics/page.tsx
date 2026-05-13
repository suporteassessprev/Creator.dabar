import { prisma } from '@/lib/db'
import { Users, Zap, TrendingUp, CreditCard, Activity, Star, Rocket } from 'lucide-react'

export const metadata = { title: 'Analytics — ViralPost Admin' }
export const revalidate = 60  // revalidate every minute

async function getAnalytics() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400 * 1000)
  const sevenDaysAgo  = new Date(Date.now() - 7  * 86400 * 1000)

  const [
    totalUsers, newUsersMonth, newUsersWeek,
    totalCarousels, carouselsMonth,
    usageMonth, usageByAction,
    planDist, revenueMRR,
    topTopics, recentUsers,
    pendingSubmissions,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo  } } }),

    prisma.carousel.count(),
    prisma.carousel.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),

    prisma.usageLog.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.usageLog.groupBy({
      by: ['action'],
      where:  { createdAt: { gte: thirtyDaysAgo } },
      _count: { id: true },
    }),

    // groupBy doesn't support `include` — fetch plan details separately and join
    prisma.subscription.groupBy({
      by: ['planId'],
      _count: { userId: true },
    }),

    // MRR: sum of active paid subscriptions
    prisma.subscription.findMany({
      where:   { status: 'active' },
      include: { plan: { select: { name: true, priceMonthly: true } } },
    }),

    prisma.usageLog.groupBy({
      by: ['topic'],
      where:  { createdAt: { gte: thirtyDaysAgo }, topic: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),

    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take:    10,
      include: { subscription: { include: { plan: { select: { displayName: true, name: true } } } } },
    }),

    prisma.templateSubmission.count({ where: { status: 'pending' } }),
  ])

  // Join planDist with plan details (groupBy doesn't support include)
  const planIds = planDist.map(p => p.planId).filter(Boolean)
  const plans   = await prisma.plan.findMany({
    where:  { id: { in: planIds } },
    select: { id: true, name: true, displayName: true, priceMonthly: true },
  })
  const planDistWithNames = planDist.map(p => ({
    ...p,
    plan: plans.find(pl => pl.id === p.planId) ?? null,
  }))

  const mrr = revenueMRR.reduce((sum, s) => sum + ((s as any).plan?.priceMonthly ?? 0), 0)

  return {
    totalUsers, newUsersMonth, newUsersWeek,
    totalCarousels, carouselsMonth,
    usageMonth, usageByAction,
    planDist: planDistWithNames,
    mrr,
    topTopics,
    recentUsers,
    pendingSubmissions,
  }
}

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string
  icon: any; color: string
}) {
  return (
    <div className="glass rounded-2xl p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-black">{value}</p>
        <p className="text-gray-400 text-xs">{label}</p>
        {sub && <p className="text-[10px] text-gray-500">{sub}</p>}
      </div>
    </div>
  )
}

export default async function AnalyticsPage() {
  const d = await getAnalytics()

  const mrrFormatted = d.mrr === 0 ? 'R$0' : `R$${(d.mrr / 100).toLocaleString('pt-BR')}`

  const ACTION_LABELS: Record<string, string> = {
    generate_text:  'Geração de Texto',
    generate_image: 'Geração de Imagem',
    export_zip:     'Exportação ZIP',
    api_call:       'Chamadas API',
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-black mb-1">Analytics</h1>
        <p className="text-gray-400 text-sm">Últimos 30 dias • Atualiza a cada minuto</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Usuários Totais"    value={d.totalUsers}    sub={`+${d.newUsersWeek} esta semana`}        icon={Users}      color="from-blue-500 to-cyan-500"   />
        <StatCard label="Novos (30d)"        value={d.newUsersMonth} sub={`+${d.newUsersWeek} nos últimos 7d`}    icon={TrendingUp}  color="from-green-500 to-emerald-500" />
        <StatCard label="Gerações (30d)"     value={d.usageMonth}                                                  icon={Zap}        color="from-purple-500 to-pink-500"   />
        <StatCard label="MRR"                value={mrrFormatted}    sub="Receita mensal recorrente"               icon={CreditCard} color="from-orange-500 to-yellow-500"  />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Usage by action */}
        <div className="glass rounded-2xl p-5">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <Activity size={16} className="text-purple-400" /> Ações (30d)
          </h2>
          {d.usageByAction.length === 0 ? (
            <p className="text-gray-500 text-sm">Sem dados ainda</p>
          ) : (
            <div className="space-y-3">
              {d.usageByAction.map((a) => {
                const total = d.usageByAction.reduce((s, x) => s + x._count.id, 0)
                const pct = total > 0 ? Math.round((a._count.id / total) * 100) : 0
                return (
                  <div key={a.action}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-300">{ACTION_LABELS[a.action] ?? a.action}</span>
                      <span className="font-semibold">{a._count.id} <span className="text-gray-500">({pct}%)</span></span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Plan distribution */}
        <div className="glass rounded-2xl p-5">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <Star size={16} className="text-yellow-400" /> Distribuição de Planos
          </h2>
          <div className="space-y-3">
            {[
              { name: 'free',     label: 'Free',     color: 'from-gray-500 to-gray-600',     icon: Zap },
              { name: 'pro',      label: 'Pro',      color: 'from-blue-500 to-purple-600',   icon: Star },
              { name: 'business', label: 'Business', color: 'from-orange-500 to-yellow-500', icon: Rocket },
            ].map(p => {
              const count = d.planDist.filter((x: any) => x.plan?.name === p.name)
                                      .reduce((s: number, x: any) => s + x._count.userId, 0)
              const total = d.planDist.reduce((s: number, x: any) => s + x._count.userId, 0)
              const pct   = total > 0 ? Math.round((count / total) * 100) : 0
              const Icon  = p.icon
              return (
                <div key={p.name} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${p.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={14} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-0.5">
                      <span>{p.label}</span>
                      <span className="font-semibold">{count} <span className="text-gray-500">({pct}%)</span></span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full bg-gradient-to-r ${p.color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {d.pendingSubmissions > 0 && (
            <div className="mt-4 p-3 glass border border-yellow-500/20 rounded-xl text-xs">
              <span className="text-yellow-400 font-semibold">{d.pendingSubmissions} submissões</span>
              <span className="text-gray-400"> aguardando revisão no </span>
              <a href="/admin/marketplace" className="text-blue-400 hover:underline">marketplace</a>
            </div>
          )}
        </div>

        {/* Top topics */}
        <div className="glass rounded-2xl p-5">
          <h2 className="font-bold mb-4">🔥 Temas Mais Gerados</h2>
          {d.topTopics.length === 0 ? (
            <p className="text-gray-500 text-sm">Sem dados ainda</p>
          ) : (
            <ol className="space-y-2">
              {d.topTopics.slice(0, 8).map((t, i) => (
                <li key={i} className="flex items-center gap-2 text-xs">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                    i === 0 ? 'bg-yellow-500/30 text-yellow-300' :
                    i === 1 ? 'bg-gray-400/20 text-gray-300' :
                    i === 2 ? 'bg-orange-500/20 text-orange-400' :
                    'bg-white/5 text-gray-500'
                  }`}>{i + 1}</span>
                  <span className="text-gray-300 truncate flex-1">{(t.topic ?? '').substring(0, 40)}</span>
                  <span className="text-gray-500 flex-shrink-0">{t._count.id}×</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* Recent users */}
      <div className="glass rounded-2xl p-5">
        <h2 className="font-bold mb-4">Usuários Recentes</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-white/5">
                <th className="text-left pb-2 font-medium">Usuário</th>
                <th className="text-left pb-2 font-medium">Plano</th>
                <th className="text-left pb-2 font-medium">Criado em</th>
              </tr>
            </thead>
            <tbody>
              {d.recentUsers.map(u => {
                const planName = (u as any).subscription?.plan?.name ?? 'free'
                return (
                  <tr key={u.id} className="border-b border-white/5 last:border-0">
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {(u.name ?? u.email).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-xs">{u.name ?? '—'}</p>
                          <p className="text-[10px] text-gray-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        planName === 'business' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/20' :
                        planName === 'pro'      ? 'bg-blue-500/20   text-blue-300   border border-blue-500/20'   :
                                                   'bg-white/5        text-gray-400   border border-white/10'
                      }`}>
                        {(u as any).subscription?.plan?.displayName ?? 'Free'}
                      </span>
                    </td>
                    <td className="py-2.5 text-xs text-gray-500">
                      {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
