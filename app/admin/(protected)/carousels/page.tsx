import { prisma } from '@/lib/db'
import { Image as ImageIcon } from 'lucide-react'

export const metadata = { title: 'Carrosséis — ViralPost Admin' }
export const revalidate = 30

async function getCarousels() {
  return prisma.carousel.findMany({
    orderBy: { createdAt: 'desc' },
    take:    100,
    include: {
      user:   { select: { name: true, email: true } },
      _count: { select: { slides: true } },
    },
  })
}

const STATUS_COLOR: Record<string, string> = {
  draft:     'bg-gray-500/20 text-gray-400 border-gray-500/20',
  ready:     'bg-blue-500/20 text-blue-400 border-blue-500/20',
  published: 'bg-green-500/20 text-green-400 border-green-500/20',
}

export default async function AdminCarouselsPage() {
  const carousels = await getCarousels()

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black mb-1 flex items-center gap-3">
          <ImageIcon size={28} className="text-purple-400" /> Carrosséis
        </h1>
        <p className="text-gray-400 text-sm">{carousels.length} carrosséis (últimos 100)</p>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-white/5 bg-white/3">
                <th className="text-left px-5 py-3 font-medium">Título</th>
                <th className="text-left px-5 py-3 font-medium">Usuário</th>
                <th className="text-left px-5 py-3 font-medium">Slides</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-left px-5 py-3 font-medium">Modo</th>
                <th className="text-left px-5 py-3 font-medium">Criado em</th>
              </tr>
            </thead>
            <tbody>
              {carousels.map(c => (
                <tr key={c.id} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-xs truncate max-w-48">{c.title}</p>
                    <p className="text-[10px] text-gray-500 truncate max-w-48">{c.topic}</p>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-400">
                    {(c as any).user?.name ?? (c as any).user?.email ?? '—'}
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-400">
                    {(c as any)._count.slides}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_COLOR[c.status] ?? STATUS_COLOR.draft}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-500">{c.mode}</td>
                  <td className="px-5 py-3 text-xs text-gray-500">
                    {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
