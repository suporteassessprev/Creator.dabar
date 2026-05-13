import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ViralPost — Carrosséis que Convertem',
  description: 'Crie carrosséis virais para redes sociais em menos de 1 minuto usando Inteligência Artificial',
  keywords: 'carrossel viral, instagram, linkedin, conteúdo, ia, inteligência artificial',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  )
}
