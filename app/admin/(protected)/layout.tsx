import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import AdminSidebar from '@/components/admin/AdminSidebar'

export const metadata = {
  title: 'ViralPost — Admin',
}

/**
 * Curated Google Fonts loaded for the admin area only. Used by the
 * visual template editor so each font option in the picker renders in
 * its actual face. Public users never need these — keeping the load
 * scoped to /admin keeps the public bundle lean.
 */
const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&family=Poppins:wght@400;600;700;900&family=Roboto:wght@400;700;900&family=Montserrat:wght@400;700;900&family=Lato:wght@400;700;900&family=Open+Sans:wght@400;700;800&family=Raleway:wght@400;700;900&family=Work+Sans:wght@400;700;900&family=Bebas+Neue&family=Anton&family=Oswald:wght@400;700&family=Archivo+Black&family=Playfair+Display:wght@400;700;900&family=Merriweather:wght@400;700;900&family=DM+Serif+Display&display=swap'

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
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={GOOGLE_FONTS_URL} />
      <AdminSidebar user={{ email: session.email, name: session.name }} />
      <main className="flex-1 ml-64 min-h-screen">{children}</main>
    </div>
  )
}
