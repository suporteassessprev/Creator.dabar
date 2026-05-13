'use client'

import { Slide, CreativeFormat } from '@/lib/store'

interface SlidePreviewProps {
  slide: Slide
  index: number
  isActive?: boolean
  onClick?: () => void
  size?: 'sm' | 'md' | 'lg'
  format?: CreativeFormat
  showSlideNumber?: boolean
}

const ASPECT_CLASSES: Record<CreativeFormat, string> = {
  square: 'aspect-square',
  portrait: 'aspect-[4/5]',
  'feed-vertical': 'aspect-[4/5]',
  story: 'aspect-[9/16]',
}

export default function SlidePreview({
  slide,
  index,
  isActive,
  onClick,
  size = 'md',
  format = 'square',
  showSlideNumber = true,
}: SlidePreviewProps) {
  const aspect = ASPECT_CLASSES[format] ?? 'aspect-square'

  const sizeClasses = {
    sm: `w-20 ${aspect}`,
    md: `w-full ${aspect}`,
    lg: `w-full ${aspect} max-w-lg mx-auto`,
  }

  const textScale = size === 'sm' ? 0.18 : size === 'md' ? 1 : 1.15

  return (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-xl transition-all
        ${sizeClasses[size]}
        ${onClick ? 'cursor-pointer' : ''}
        ${isActive ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-transparent' : ''}
        ${onClick ? 'hover:scale-[1.02]' : ''}
      `}
      style={{ backgroundColor: slide.backgroundColor }}
    >
      <LayoutRenderer slide={slide} size={size} textScale={textScale} />

      {showSlideNumber && size !== 'sm' && (
        <div
          className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md"
          style={{ backgroundColor: slide.accentColor + 'cc', color: '#fff' }}
        >
          {index + 1}
        </div>
      )}
    </div>
  )
}

function LayoutRenderer({
  slide,
  size,
  textScale,
}: {
  slide: Slide
  size: 'sm' | 'md' | 'lg'
  textScale: number
}) {
  switch (slide.layout) {
    case 'headline-banner':
      return <HeadlineBannerLayout slide={slide} size={size} textScale={textScale} />
    case 'split-horizontal':
      return <SplitHorizontalLayout slide={slide} size={size} textScale={textScale} />
    case 'dark-overlay':
      return <DarkOverlayLayout slide={slide} size={size} textScale={textScale} />
    case 'centered-brutalist':
      return <CenteredBrutalistLayout slide={slide} size={size} textScale={textScale} />
    case 'centered':
    case 'top':
    case 'bottom':
    case 'split':
    default:
      return <ClassicLayout slide={slide} size={size} textScale={textScale} />
  }
}

function BackgroundImage({ url }: { url?: string }) {
  if (!url) return null
  return (
    <div
      className="absolute inset-0 bg-cover bg-center"
      style={{ backgroundImage: `url(${url})` }}
    />
  )
}

function ScaledText({
  children,
  baseSize,
  scale,
  className = '',
  style = {},
}: {
  children: React.ReactNode
  baseSize: number
  scale: number
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      className={className}
      style={{ fontSize: `${baseSize * scale}px`, lineHeight: 1.05, ...style }}
    >
      {children}
    </div>
  )
}

/* ============ LAYOUT 1: Headline + faixa colorida ============ */
function HeadlineBannerLayout({
  slide,
  textScale,
}: {
  slide: Slide
  size: 'sm' | 'md' | 'lg'
  textScale: number
}) {
  return (
    <>
      <BackgroundImage url={slide.imageUrl} />
      <div
        className="absolute inset-0"
        style={{
          background: slide.imageUrl
            ? 'linear-gradient(to bottom, rgba(0,0,0,0.25), rgba(0,0,0,0.55))'
            : `linear-gradient(135deg, ${slide.backgroundColor}, ${slide.accentColor}33)`,
        }}
      />

      <div className="absolute inset-0 flex flex-col justify-end p-[6%]">
        <div
          className="inline-block px-[5%] py-[4%] mb-[3%] self-start max-w-[90%]"
          style={{
            backgroundColor: slide.accentColor,
            transform: 'rotate(-1deg)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
        >
          <ScaledText
            baseSize={42}
            scale={textScale}
            style={{
              fontFamily: slide.fontFamily,
              color: slide.textColor,
              fontWeight: 900,
              letterSpacing: '-0.02em',
              textTransform: 'uppercase',
            }}
          >
            {slide.title || 'TITULO IMPACTANTE'}
          </ScaledText>
        </div>

        {(slide.subtitle || slide.content) && (
          <ScaledText
            baseSize={16}
            scale={textScale}
            className="mt-[2%] max-w-[85%]"
            style={{
              color: '#fff',
              fontFamily: slide.fontFamily,
              fontWeight: 500,
              textShadow: '0 2px 8px rgba(0,0,0,0.6)',
            }}
          >
            {slide.subtitle || slide.content}
          </ScaledText>
        )}

        {slide.cta && (
          <div
            className="inline-block self-start mt-[4%] px-[4%] py-[2.5%] rounded-full"
            style={{
              backgroundColor: '#fff',
              color: slide.backgroundColor,
              fontFamily: slide.fontFamily,
              fontWeight: 800,
              fontSize: `${14 * textScale}px`,
              letterSpacing: '0.02em',
            }}
          >
            {slide.cta} →
          </div>
        )}
      </div>
    </>
  )
}

/* ============ LAYOUT 2: Split horizontal (texto cima / imagem baixo) ============ */
function SplitHorizontalLayout({
  slide,
  textScale,
}: {
  slide: Slide
  size: 'sm' | 'md' | 'lg'
  textScale: number
}) {
  return (
    <>
      <div className="absolute inset-0 flex flex-col">
        <div
          className="flex-1 flex flex-col justify-center p-[6%]"
          style={{ backgroundColor: slide.accentColor }}
        >
          <ScaledText
            baseSize={36}
            scale={textScale}
            style={{
              fontFamily: slide.fontFamily,
              color: slide.textColor,
              fontWeight: 900,
              letterSpacing: '-0.02em',
              textTransform: 'uppercase',
            }}
          >
            {slide.title || 'TITULO GRANDE'}
          </ScaledText>
          {(slide.subtitle || slide.content) && (
            <ScaledText
              baseSize={15}
              scale={textScale}
              className="mt-[3%] opacity-90"
              style={{
                color: slide.textColor,
                fontFamily: slide.fontFamily,
                fontWeight: 500,
              }}
            >
              {slide.subtitle || slide.content}
            </ScaledText>
          )}
          {slide.cta && (
            <div
              className="inline-block self-start mt-[4%] px-[4%] py-[2%] rounded-full"
              style={{
                backgroundColor: slide.backgroundColor,
                color: slide.textColor,
                fontFamily: slide.fontFamily,
                fontWeight: 800,
                fontSize: `${13 * textScale}px`,
              }}
            >
              {slide.cta} →
            </div>
          )}
        </div>
        <div className="flex-1 relative overflow-hidden">
          <BackgroundImage url={slide.imageUrl} />
          {!slide.imageUrl && (
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, ${slide.backgroundColor}, ${slide.backgroundColor}88)`,
              }}
            />
          )}
        </div>
      </div>
    </>
  )
}

/* ============ LAYOUT 3: Overlay gradient escuro ============ */
function DarkOverlayLayout({
  slide,
  textScale,
}: {
  slide: Slide
  size: 'sm' | 'md' | 'lg'
  textScale: number
}) {
  return (
    <>
      <BackgroundImage url={slide.imageUrl} />
      {!slide.imageUrl && (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: slide.backgroundColor }}
        />
      )}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.7) 35%, rgba(0,0,0,0.1) 65%, rgba(0,0,0,0) 100%)',
        }}
      />

      <div className="absolute inset-0 flex flex-col justify-end p-[7%]">
        <div
          className="h-[3px] w-[15%] mb-[3%]"
          style={{ backgroundColor: slide.accentColor }}
        />
        <ScaledText
          baseSize={44}
          scale={textScale}
          style={{
            fontFamily: slide.fontFamily,
            color: '#fff',
            fontWeight: 900,
            letterSpacing: '-0.03em',
            textShadow: '0 4px 24px rgba(0,0,0,0.5)',
          }}
        >
          {slide.title || 'Headline forte aqui'}
        </ScaledText>
        {(slide.subtitle || slide.content) && (
          <ScaledText
            baseSize={15}
            scale={textScale}
            className="mt-[3%] max-w-[90%]"
            style={{
              color: '#e5e7eb',
              fontFamily: slide.fontFamily,
              fontWeight: 400,
            }}
          >
            {slide.subtitle || slide.content}
          </ScaledText>
        )}
        {slide.cta && (
          <div
            className="inline-block self-start mt-[5%] px-[5%] py-[2.5%] rounded"
            style={{
              backgroundColor: slide.accentColor,
              color: '#fff',
              fontFamily: slide.fontFamily,
              fontWeight: 800,
              fontSize: `${14 * textScale}px`,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            {slide.cta} →
          </div>
        )}
      </div>
    </>
  )
}

/* ============ LAYOUT 4: Centralizado + bordas decoradas (brutalist) ============ */
function CenteredBrutalistLayout({
  slide,
  textScale,
}: {
  slide: Slide
  size: 'sm' | 'md' | 'lg'
  textScale: number
}) {
  return (
    <>
      <BackgroundImage url={slide.imageUrl} />
      <div
        className="absolute inset-0"
        style={{
          background: slide.imageUrl
            ? 'rgba(0,0,0,0.45)'
            : `linear-gradient(135deg, ${slide.backgroundColor}, ${slide.accentColor}22)`,
        }}
      />

      {/* Decorative borders */}
      <div
        className="absolute top-[4%] left-[4%] w-[12%] h-[2px]"
        style={{ backgroundColor: slide.accentColor }}
      />
      <div
        className="absolute top-[4%] left-[4%] w-[2px] h-[12%]"
        style={{ backgroundColor: slide.accentColor }}
      />
      <div
        className="absolute top-[4%] right-[4%] w-[12%] h-[2px]"
        style={{ backgroundColor: slide.accentColor }}
      />
      <div
        className="absolute top-[4%] right-[4%] w-[2px] h-[12%]"
        style={{ backgroundColor: slide.accentColor }}
      />
      <div
        className="absolute bottom-[4%] left-[4%] w-[12%] h-[2px]"
        style={{ backgroundColor: slide.accentColor }}
      />
      <div
        className="absolute bottom-[4%] left-[4%] w-[2px] h-[12%]"
        style={{ backgroundColor: slide.accentColor }}
      />
      <div
        className="absolute bottom-[4%] right-[4%] w-[12%] h-[2px]"
        style={{ backgroundColor: slide.accentColor }}
      />
      <div
        className="absolute bottom-[4%] right-[4%] w-[2px] h-[12%]"
        style={{ backgroundColor: slide.accentColor }}
      />

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-[10%]">
        <div
          className="text-[10px] mb-[4%] tracking-[0.3em]"
          style={{
            color: slide.accentColor,
            fontFamily: slide.fontFamily,
            fontWeight: 700,
            fontSize: `${11 * textScale}px`,
          }}
        >
          ★ EXCLUSIVO ★
        </div>
        <ScaledText
          baseSize={40}
          scale={textScale}
          style={{
            fontFamily: slide.fontFamily,
            color: '#fff',
            fontWeight: 900,
            letterSpacing: '-0.02em',
            textShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}
        >
          {slide.title || 'TITULO CENTRADO'}
        </ScaledText>
        {(slide.subtitle || slide.content) && (
          <ScaledText
            baseSize={15}
            scale={textScale}
            className="mt-[4%] max-w-[80%]"
            style={{
              color: '#e5e7eb',
              fontFamily: slide.fontFamily,
              fontWeight: 500,
            }}
          >
            {slide.subtitle || slide.content}
          </ScaledText>
        )}
        {slide.cta && (
          <div
            className="mt-[6%] px-[6%] py-[2.5%]"
            style={{
              border: `2px solid ${slide.accentColor}`,
              color: '#fff',
              fontFamily: slide.fontFamily,
              fontWeight: 800,
              fontSize: `${13 * textScale}px`,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            {slide.cta} →
          </div>
        )}
      </div>
    </>
  )
}

/* ============ Classic carousel layouts (kept for back-compat) ============ */
function ClassicLayout({
  slide,
  size,
  textScale,
}: {
  slide: Slide
  size: 'sm' | 'md' | 'lg'
  textScale: number
}) {
  return (
    <>
      <BackgroundImage url={slide.imageUrl} />
      <div
        className="absolute inset-0"
        style={{
          background: slide.imageUrl
            ? 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%)'
            : `linear-gradient(135deg, ${slide.backgroundColor}ee, ${slide.accentColor}22)`,
        }}
      />
      <div
        className={`
          absolute inset-0 flex flex-col
          ${slide.layout === 'centered' ? 'items-center justify-center text-center' : ''}
          ${slide.layout === 'bottom' ? 'items-start justify-end' : ''}
          ${slide.layout === 'top' ? 'items-start justify-start' : ''}
          ${size === 'sm' ? 'p-2' : 'p-6'}
        `}
      >
        {slide.title && (
          <ScaledText
            baseSize={28}
            scale={textScale}
            className="font-black mb-2"
            style={{ color: slide.textColor, fontFamily: slide.fontFamily, fontWeight: 900 }}
          >
            {slide.title}
          </ScaledText>
        )}
        {slide.content && size !== 'sm' && (
          <ScaledText
            baseSize={14}
            scale={textScale}
            className="opacity-90"
            style={{ color: slide.textColor, fontFamily: slide.fontFamily }}
          >
            {slide.content}
          </ScaledText>
        )}
      </div>
      <div
        className="absolute bottom-0 left-0 right-0 h-1"
        style={{ backgroundColor: slide.accentColor }}
      />
    </>
  )
}
