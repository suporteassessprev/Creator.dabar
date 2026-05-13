import { prisma } from '@/lib/db'
import { Users } from 'lucide-react'

export const metadata = { title: 'Usuários — ViralPost Admin' }
export const revalidate = 30

async function getUsers() {
  return prisma.user.findMany({
    where:   { role: 'USER' },
    orderBy: { createdAt: 'desc' },
    take:    100,
    include: {
      subscription: { include: { plan: { select: { displayName: true, name: true } } } },
      _count: { select: { carousels: true } },
    },
  })
}

export default async function AdminUsersPage() {
  const users = await getUsers()

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black mb-1 flex items-center gap-3">
          <Users size={28} className="text-blue-400" /> Usuários
        </h1>
        <p className="text-gray-400 text-sm">{users.length} usuários cadastrados</p>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-white/5 bg-white/3">
                <th className="text-left px-5 py-3 font-medium">Usuário</th>
                <th className="text-left px-5 py-3 font-medium">Plano</th>
                <th className="text-left px-5 py-3 font-medium">Carrosséis</th>
                <th className="text-left px-5 py-3 font-medium">Email verificado</th>
                <th className="text-left px-5 py-3 font-medium">Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const planName = (u as any).subscription?.plan?.name ?? 'free'
                return (
                  <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                    <td className="px-5 py-3">
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
                    <td className="px-5 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                        planName === 'business' ? 'bg-orange-500/20 text-orange-300 border-orange-500/20' :
                        planName === 'pro'      ? 'bg-blue-500/20   text-blue-300   border-blue-500/20'   :
                                                   'bg-white/5        text-gray-400   border-white/10'
                      }`}>
                        {(u as any).subscription?.plan?.displayName ?? 'Free'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs">{(u as any)._count.carousels}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] ${u.emailVerified ? 'text-green-400' : 'text-yellow-500'}`}>
                        {u.emailVerified ? '✓ Sim' : '⚠ Não'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
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
