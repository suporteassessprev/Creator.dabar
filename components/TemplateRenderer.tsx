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
import { CSSProperties, useLayoutEffect, useRef, useState } from 'react'
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
  /**
   * When true, the sticky text layout (stickToPrevious) is disabled.
   * The admin EditableTemplateCanvas sets this so drag/resize keep
   * absolute positioning and don't fight with the runtime transform.
   */
  disableSticky?: boolean
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
  const accentColor = el.accentColor ?? '#facc15'
  const hasBackground = !!el.background

  /**
   * Auto-fit by REAL DOM measurement.
   *
   * Old approach was a charsPerLine heuristic — it overestimated capacity
   * for display fonts like Anton (wider glyphs) and headlines could
   * overflow the box, especially the last line. New approach:
   *
   *   1. Render at the admin-configured fontSize (in cqw so it scales
   *      with the canvas).
   *   2. After paint, measure if the inner text overflows the box.
   *   3. Binary search the fontSize down until it fits (or hits floor).
   *
   * Runs once per render via useLayoutEffect so the user never sees the
   * unfit state — the shrink happens before the browser paints.
   */
  const baseFontCqw = (el.fontSize ?? 32) / 10.8
  const lineHeightVal = el.lineHeight ?? 1.2
  const boxRef    = useRef<HTMLDivElement>(null)
  const innerRef  = useRef<HTMLSpanElement>(null)
  const [fontCqw, setFontCqw] = useState(baseFontCqw)

  /**
   * Re-measure & shrink whenever:
   *  - text changes (user typed, or AI populated content)
   *  - container is resized (image loaded, viewport changed, layout settled)
   *  - relevant style deps changed (font family, weight, element box)
   *
   * The first render after AI generation used to miss this because
   * clientHeight could be 0 (container still computing). ResizeObserver
   * catches the moment the container has real dimensions and re-runs.
   */
  useLayoutEffect(() => {
    const box = boxRef.current
    const inner = innerRef.current
    if (!box || !inner) return

    const runAutoFit = () => {
      // If the container has no measurable height yet, bail — the
      // ResizeObserver will trigger us again once it does.
      if (box.clientHeight < 4 || box.clientWidth < 4) return

      let lo = 0.25 * baseFontCqw   // floor: 25% of admin's base
      let hi = baseFontCqw
      let best = baseFontCqw

      const fits = (size: number): boolean => {
        inner.style.fontSize = `${size}cqw`
        return inner.scrollHeight <= box.clientHeight + 1
            && inner.scrollWidth  <= box.clientWidth  + 1
      }

      if (fits(hi)) {
        best = hi
      } else {
        for (let i = 0; i < 10; i++) {
          const mid = (lo + hi) / 2
          if (fits(mid)) { best = mid; lo = mid } else { hi = mid }
        }
      }
      inner.style.fontSize = `${best}cqw`
      setFontCqw(best)
    }

    // Run once immediately (covers manual edits / fast paths).
    runAutoFit()

    // Re-run whenever the box resizes. Critical for the initial render
    // after AI generation: container dimensions may not be settled yet
    // when the component mounts.
    const ro = new ResizeObserver(runAutoFit)
    ro.observe(box)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, baseFontCqw, el.width, el.height, el.fontFamily, el.fontWeight])

  const style: CSSProperties = {
    fontFamily: el.fontFamily ?? 'Inter, system-ui, sans-serif',
    fontSize: `${fontCqw}cqw`,
    fontWeight: el.fontWeight ?? 700,
    color: el.color ?? '#ffffff',
    textAlign: el.align ?? 'center',
    letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : undefined,
    lineHeight: lineHeightVal,
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
    <div ref={boxRef} style={style} data-autofit-box>
      <span
        ref={innerRef}
        data-autofit-text
        style={{ display: 'inline-block', maxWidth: '100%' }}
      >
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
  const posX = el.objectPositionX ?? 50
  const posY = el.objectPositionY ?? 50
  // Map object-fit values to the equivalent background-size keyword.
  // html2canvas respects background-* correctly but NOT object-fit on
  // <img>, so we render the image as a background — same visual on
  // screen, faithful on export.
  const bgSize = el.objectFit === 'contain'
    ? 'contain'
    : el.objectFit === 'fill'
    ? '100% 100%'
    : 'cover'
  const containerStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderRadius: `${el.borderRadius ?? 0}px`,
    position: 'relative',
    border: hasImage ? undefined : '2px dashed rgba(148, 163, 184, 0.4)',
    backgroundColor: hasImage ? 'transparent' : 'rgba(148, 163, 184, 0.15)',
    backgroundImage: hasImage ? `url(${imageSrc})` : undefined,
    backgroundSize: bgSize,
    backgroundPosition: `${posX}% ${posY}%`,
    backgroundRepeat: 'no-repeat',
    opacity: hasImage ? (el.opacity ?? 1) : 1,
  }
  return (
    <div style={containerStyle}>
      {!hasImage && showHint ? (
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
    <div
      style={wrapperStyle}
      onClick={onClick}
      data-element-id={el.id}
      data-element-type={el.type}
    >
      {node}
    </div>
  )
}

/**
 * For each TextElement with stickToPrevious=true, measure the bottom of
 * the previous text element (sorted by initial y) and translateY this
 * element so it sits exactly `stickGap` pixels below. Re-runs on
 * container resize / font-fit changes via ResizeObserver.
 *
 * Only runs when `enabled` is true — the admin's EditableTemplateCanvas
 * disables it so drag/resize don't fight with the dynamic transform.
 */
function useStickyTextLayout(
  containerRef: React.RefObject<HTMLDivElement>,
  structure: TemplateStructure,
  enabled: boolean,
) {
  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container || !enabled) return

    let disposed = false

    const textTypes = new Set(['text_headline', 'text_subtitle', 'text_cta', 'badge'])
    const textEls = structure.elements
      .filter(e => textTypes.has(e.type) && e.visible !== false)
      .sort((a, b) => a.y - b.y) as TextElement[]

    // If no element actually opts into sticking, skip the reflow loop
    // entirely. Avoids unnecessary DOM walks + ResizeObserver churn
    // for templates that don't use this feature.
    const anyStick = textEls.some(el => el.stickToPrevious)
    if (!anyStick) return

    function reflow() {
      // Bail if the component unmounted between RAF callbacks.
      if (disposed || !container || !container.isConnected) return

      // First pass: clear transforms so measurements reflect natural
      // positions. Each node is checked for isConnected — React may
      // have removed it during a re-render before this RAF fires.
      textEls.forEach(el => {
        const node = container.querySelector<HTMLElement>(`[data-element-id="${el.id}"]`)
        if (node?.isConnected) node.style.transform = ''
      })
      // Second pass: snap each "sticky" element below its predecessor.
      for (let i = 1; i < textEls.length; i++) {
        const el = textEls[i]
        if (!el.stickToPrevious) continue
        const prev = textEls[i - 1]
        const myNode   = container.querySelector<HTMLElement>(`[data-element-id="${el.id}"]`)
        const prevNode = container.querySelector<HTMLElement>(`[data-element-id="${prev.id}"]`)
        if (!myNode?.isConnected || !prevNode?.isConnected) continue
        const prevRect = prevNode.getBoundingClientRect()
        const myRect   = myNode.getBoundingClientRect()
        const gapPx    = el.stickGap ?? 12
        const targetTop = prevRect.bottom + gapPx
        const delta = targetTop - myRect.top
        if (Math.abs(delta) > 0.5) {
          myNode.style.transform = `translateY(${delta}px)`
        }
      }
    }

    // Run after a frame so React finished mounting the children we're
    // about to query. Avoids "Node not a child" errors when the effect
    // races React's commit phase.
    const rafId = requestAnimationFrame(reflow)

    const ro = new ResizeObserver(() => {
      // Same: schedule for next frame so React reconciliation has
      // settled before we measure & mutate.
      if (!disposed) requestAnimationFrame(reflow)
    })
    ro.observe(container)
    structure.elements.forEach(el => {
      const node = container.querySelector<HTMLElement>(`[data-element-id="${el.id}"]`)
      if (node?.isConnected) ro.observe(node)
    })

    return () => {
      disposed = true
      cancelAnimationFrame(rafId)
      ro.disconnect()
    }
  }, [containerRef, structure, enabled])
}

export default function TemplateRenderer({
  structure,
  content,
  selectedId = null,
  onElementClick,
  showImageSlotHint = true,
  previewImages,
  disableSticky = false,
  className,
}: Props) {
  const aspectRatio = ASPECT_RATIO[structure.canvas.format]
  const sorted = [...structure.elements].sort((a, b) => a.zIndex - b.zIndex)
  const containerRef = useRef<HTMLDivElement>(null)
  useStickyTextLayout(containerRef, structure, !disableSticky)
  return (
    <div
      ref={containerRef}
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
