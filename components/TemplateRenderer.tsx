'use client'

/**
 * Phase 3 — Renderer for visual templates.
 *
 * Renders a TemplateStructure (collection of absolutely-positioned
 * elements) into a fixed-aspect-ratio canvas. Used by:
 * - the admin visual editor (preview pane)
 * - the user-facing editor (when a carousel was generated from a visual template)
 *
 * Substitutes placeholders with real content (headline, subtitle, cta,
 * imageUrl) when provided. With no content, shows placeholders.
 */
import { CSSProperties } from 'react'
import {
  TemplateStructure,
  TemplateElement,
  TextElement,
  ImageSlotElement,
  ImageStaticElement,
  AccountBadgeElement,
  IconElement,
  ShapeElement,
  BackgroundElement,
  TemplateContent,
  ASPECT_RATIO,
  resolveText,
  parseAccentSegments,
} from '@/lib/template-structure'
import { getIcon } from '@/lib/template-icons'

interface Props {
  structure: TemplateStructure
  content?: TemplateContent
  /**
   * Element id currently selected — drawn with a dashed outline. Used by
   * the admin editor; omit in the user-facing renderer.
   */
  selectedId?: string | null
  /** Click handler; receives the element clicked. Used by admin editor. */
  onElementClick?: (id: string) => void
  /** When false, hides image_slot description placeholder text. */
  showImageSlotHint?: boolean
  /**
   * Map of image_slot element id → data URL of a preview image generated
   * by the admin. Takes priority over content.imageUrl. Used in the admin
   * editor so the admin can visualize what the slot will look like with
   * a real image before saving the template.
   */
  previewImages?: Record<string, string>
  className?: string
}

function elementStyle(el: TemplateElement): CSSProperties {
  return {
    position: 'absolute',
    left: `${el.x}%`,
    top: `${el.y}%`,
    width: `${el.width}%`,
    height: `${el.height}%`,
    zIndex: el.zIndex,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
    pointerEvents: el.locked ? 'none' : 'auto',
  }
}

function selectionRing(selected: boolean): CSSProperties {
  if (!selected) return {}
  return {
    outline: '2px dashed rgba(14, 165, 233, 0.95)',
    outlineOffset: '2px',
  }
}

function TextNode({ el, content }: { el: TextElement; content?: TemplateContent }) {
  const text = resolveText(el, content)
  const segments = parseAccentSegments(text)
  const accentColor = el.accentColor ?? '#facc15' // amber-400 default
  const hasBackground = !!el.background

  /**
   * Auto-fit heuristic. The base fontSize is what the admin set in the
   * editor for the placeholder text. When the actual content (AI-generated
   * or user-typed) is LONGER than the placeholder, the text overflows.
   * We compute a shrink factor based on text length vs the rough character
   * capacity of the element box. Result: long headlines auto-shrink rather
   * than overflowing the canvas.
   */
  const baseFontPx  = el.fontSize ?? 32
  const baseFontCqw = baseFontPx / 10.8
  const lineHeightVal = el.lineHeight ?? 1.2
  // Rough capacity heuristic: chars per line scales with element width;
  // lines available scale with element height / font height.
  const charsPerLine    = Math.max(1, (el.width * 0.85) / baseFontCqw)
  const linesAvailable  = Math.max(1, (el.height * 0.9) / (baseFontCqw * lineHeightVal * 1.1))
  const charCapacity    = charsPerLine * linesAvailable
  // Use plain text length for capacity calc (asterisks excluded).
  const plainLen = segments.reduce((acc, s) => acc + s.text.length, 0)
  const shrinkFactor = Math.min(1, Math.sqrt(charCapacity / Math.max(plainLen, 1)))
  const effectiveFontCqw = baseFontCqw * shrinkFactor

  const style: CSSProperties = {
    fontFamily: el.fontFamily ?? 'Inter, system-ui, sans-serif',
    fontSize: `${effectiveFontCqw}cqw`,
    fontWeight: el.fontWeight ?? 700,
    color: el.color ?? '#ffffff',
    textAlign: el.align ?? 'center',
    letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : undefined,
    lineHeight: el.lineHeight ?? 1.2,
    opacity: el.opacity ?? 1,
    background: el.background,
    borderRadius: hasBackground ? `${el.borderRadius ?? 0}px` : undefined,
    padding: hasBackground
      ? `${el.paddingY ?? 8}px ${el.paddingX ?? 16}px`
      : undefined,
    display: 'flex',
    alignItems: 'center',
    justifyContent:
      el.align === 'left' ? 'flex-start' :
      el.align === 'right' ? 'flex-end' : 'center',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    wordBreak: 'break-word',
  }
  return (
    <div style={style}>
      <span>
        {segments.map((seg, i) => (
          <span key={i} style={seg.accent ? { color: accentColor } : undefined}>
            {seg.text}
          </span>
        ))}
      </span>
    </div>
  )
}

function ImageSlotNode({
  el, content, showHint, previewSrc,
}: {
  el: ImageSlotElement
  content?: TemplateContent
  showHint: boolean
  previewSrc?: string
}) {
  // Priority: admin preview > user-supplied content > placeholder
  const imageSrc = previewSrc ?? content?.imageUrl
  const hasImage = !!imageSrc
  const innerStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: el.objectFit ?? 'cover',
    opacity: el.opacity ?? 1,
    borderRadius: `${el.borderRadius ?? 0}px`,
    display: 'block',
  }
  const containerStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderRadius: `${el.borderRadius ?? 0}px`,
    position: 'relative',
    background: hasImage ? 'transparent' : 'rgba(148, 163, 184, 0.15)',
    border: hasImage ? undefined : '2px dashed rgba(148, 163, 184, 0.4)',
  }
  return (
    <div style={containerStyle}>
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageSrc!} alt="" style={innerStyle} />
      ) : showHint ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(148, 163, 184, 0.8)',
            fontSize: '1cqw',
            fontWeight: 600,
            textAlign: 'center',
            padding: '8px',
          }}
        >
          <span>🖼️ {el.description}</span>
        </div>
      ) : null}
      {el.overlay && hasImage && (
        <div style={{ position: 'absolute', inset: 0, background: el.overlay }} />
      )}
    </div>
  )
}

function ImageStaticNode({ el }: { el: ImageStaticElement }) {
  if (!el.src) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'rgba(148, 163, 184, 0.15)',
          border: '2px dashed rgba(148, 163, 184, 0.4)',
          borderRadius: `${el.borderRadius ?? 0}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(148, 163, 184, 0.7)',
          fontSize: '1cqw',
        }}
      >
        Imagem não definida
      </div>
    )
  }
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        borderRadius: `${el.borderRadius ?? 0}px`,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={el.src}
        alt={el.alt ?? ''}
        style={{
          width: '100%',
          height: '100%',
          objectFit: el.objectFit ?? 'cover',
          opacity: el.opacity ?? 1,
          display: 'block',
        }}
      />
    </div>
  )
}

function AccountBadgeNode({ el }: { el: AccountBadgeElement }) {
  const fontSize = `${(el.fontSize ?? 22) / 10.8}cqw`
  const avatarSize = `${(el.avatarSize ?? 36) / 10.8}cqw`
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5cqw',
      }}
    >
      <div
        style={{
          width: avatarSize,
          height: avatarSize,
          borderRadius: '50%',
          overflow: 'hidden',
          background: el.avatarUrl
            ? 'transparent'
            : 'linear-gradient(135deg, #f97316 0%, #ec4899 50%, #8b5cf6 100%)',
          flexShrink: 0,
        }}
      >
        {el.avatarUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={el.avatarUrl}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )}
      </div>
      <span
        style={{
          fontFamily: el.fontFamily ?? 'Inter, system-ui, sans-serif',
          fontSize,
          fontWeight: el.fontWeight ?? 600,
          color: el.color ?? '#111111',
          whiteSpace: 'nowrap',
        }}
      >
        {el.handle}
      </span>
    </div>
  )
}

function IconNode({ el }: { el: IconElement }) {
  const Icon = getIcon(el.iconName)
  const hasBackground = !!el.background
  const containerStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    background: el.background,
    borderRadius: hasBackground ? `${el.borderRadius ?? 0}px` : undefined,
    padding: hasBackground
      ? `${el.paddingY ?? 8}px ${el.paddingX ?? 8}px`
      : undefined,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: el.color ?? '#ffffff',
  }
  if (!Icon) {
    return (
      <div style={{ ...containerStyle, color: 'rgba(148, 163, 184, 0.6)', fontSize: '1cqw' }}>
        ?
      </div>
    )
  }
  return (
    <div style={containerStyle}>
      <Icon
        size="100%"
        strokeWidth={el.strokeWidth ?? 2}
        style={{ width: '100%', height: '100%', maxWidth: '100%', maxHeight: '100%' }}
      />
    </div>
  )
}

function ShapeNode({ el }: { el: ShapeElement }) {
  const isCircle = el.shape === 'circle'
  const style: CSSProperties = {
    width: '100%',
    height: '100%',
    background: el.fill ?? 'rgba(14, 165, 233, 0.2)',
    border: el.borderWidth
      ? `${el.borderWidth}px solid ${el.borderColor ?? '#0ea5e9'}`
      : undefined,
    borderRadius: isCircle ? '50%' : `${el.borderRadius ?? 0}px`,
    opacity: el.opacity ?? 1,
  }
  return <div style={style} />
}

function BackgroundNode({ el }: { el: BackgroundElement }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: el.fill,
      }}
    />
  )
}

function ElementNode({
  el, content, selected, showHint, onClick, previewSrc,
}: {
  el: TemplateElement
  content?: TemplateContent
  selected: boolean
  showHint: boolean
  onClick?: () => void
  previewSrc?: string
}) {
  if (el.visible === false) return null
  const wrapperStyle: CSSProperties = {
    ...elementStyle(el),
    ...selectionRing(selected),
    cursor: onClick ? 'pointer' : undefined,
  }
  let node: React.ReactNode = null
  switch (el.type) {
    case 'text_headline':
    case 'text_subtitle':
    case 'text_cta':
    case 'badge':
      node = <TextNode el={el} content={content} />
      break
    case 'image_slot':
      node = <ImageSlotNode el={el} content={content} showHint={showHint} previewSrc={previewSrc} />
      break
    case 'image_static':
      node = <ImageStaticNode el={el} />
      break
    case 'account_badge':
      node = <AccountBadgeNode el={el} />
      break
    case 'icon':
      node = <IconNode el={el} />
      break
    case 'shape':
      node = <ShapeNode el={el} />
      break
    case 'background':
      node = <BackgroundNode el={el} />
      break
  }
  return (
    <div style={wrapperStyle} onClick={onClick}>
      {node}
    </div>
  )
}

export default function TemplateRenderer({
  structure,
  content,
  selectedId = null,
  onElementClick,
  showImageSlotHint = true,
  previewImages,
  className,
}: Props) {
  const aspectRatio = ASPECT_RATIO[structure.canvas.format]
  const sorted = [...structure.elements].sort((a, b) => a.zIndex - b.zIndex)
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio,
        background: structure.canvas.backgroundColor,
        overflow: 'hidden',
        containerType: 'inline-size',
      }}
    >
      {sorted.map(el => (
        <ElementNode
          key={el.id}
          el={el}
          content={content}
          selected={selectedId === el.id}
          showHint={showImageSlotHint}
          onClick={onElementClick ? () => onElementClick(el.id) : undefined}
          previewSrc={el.type === 'image_slot' ? previewImages?.[el.id] : undefined}
        />
      ))}
    </div>
  )
}
