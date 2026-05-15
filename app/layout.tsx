import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ViralPost — Carrosséis que Convertem',
  description: 'Crie carrosséis virais para redes sociais em menos de 1 minuto usando Inteligência Artificial',
  keywords: 'carrossel viral, instagram, linkedin, conteúdo, ia, inteligência artificial',
}

/**
 * Google Fonts used by visual templates. Loaded at the root so:
 * - Admin editor (TemplateVisualEditor) shows fonts in the picker
 * - User generator (TemplateCard) renders template previews in the right face
 * - User editor (TemplateRenderer) renders the final carousel correctly
 */
const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2' +
  '?family=Inter:wght@400;600;700;900' +
  '&family=Poppins:wght@400;600;700;900' +
  '&family=Roboto:wght@400;700;900' +
  '&family=Montserrat:wght@400;700;900' +
  '&family=Lato:wght@400;700;900' +
  '&family=Open+Sans:wght@400;700;800' +
  '&family=Raleway:wght@400;700;900' +
  '&family=Work+Sans:wght@400;700;900' +
  '&family=Nunito:wght@400;700;900' +
  '&family=Manrope:wght@400;700;800' +
  '&family=DM+Sans:wght@400;700' +
  '&family=Bebas+Neue' +
  '&family=Anton' +
  '&family=Oswald:wght@400;700' +
  '&family=Archivo+Black' +
  '&family=Bungee' +
  '&family=Rubik+Mono+One' +
  '&family=Russo+One' +
  '&family=Black+Ops+One' +
  '&family=Passion+One:wght@400;700;900' +
  '&family=Alfa+Slab+One' +
  '&family=Playfair+Display:wght@400;700;900' +
  '&family=Merriweather:wght@400;700;900' +
  '&family=DM+Serif+Display' +
  '&family=Lora:wght@400;700' +
  '&family=Cormorant+Garamond:wght@400;700' +
  '&family=Crimson+Pro:wght@400;700' +
  '&family=Caveat:wght@400;700' +
  '&family=Permanent+Marker' +
  '&family=Patrick+Hand' +
  '&family=Pacifico' +
  '&family=Dancing+Script:wght@400;700' +
  '&family=JetBrains+Mono:wght@400;700' +
  '&family=Fira+Code:wght@400;700' +
  '&display=swap'

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
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href={GOOGLE_FONTS_URL} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  )
}
