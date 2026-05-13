import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import AdminSidebar from '@/components/admin/AdminSidebar'

export const metadata = {
  title: 'ViralPost — Admin',
}

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    redirect('/admin/login')
  }

  return (
    <div className="min-h-screen flex bg-[#0a0a0f] text-white">
      <AdminSidebar user={{ email: session.email, name: session.name }} />
      <main className="flex-1 ml-64 min-h-screen">{children}</main>
    </div>
  )
}
