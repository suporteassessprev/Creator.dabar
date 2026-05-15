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
  ShapeElement,
  BackgroundElement,
  TemplateContent,
  ASPECT_RATIO,
  resolveText,
} from '@/lib/template-structure'

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
  const hasBackground = !!el.background
  const style: CSSProperties = {
    fontFamily: el.fontFamily ?? 'Inter, system-ui, sans-serif',
    fontSize: `${(el.fontSize ?? 32) / 10.8}cqw`,
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
  return <div style={style}>{text}</div>
}

function ImageSlotNode({
  el, content, showHint,
}: {
  el: ImageSlotElement; content?: TemplateContent; showHint: boolean
}) {
  const hasImage = !!content?.imageUrl
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
        <img src={content!.imageUrl!} alt="" style={innerStyle} />
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
  el, content, selected, showHint, onClick,
}: {
  el: TemplateElement
  content?: TemplateContent
  selected: boolean
  showHint: boolean
  onClick?: () => void
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
      node = <ImageSlotNode el={el} content={content} showHint={showHint} />
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
        />
      ))}
    </div>
  )
}
