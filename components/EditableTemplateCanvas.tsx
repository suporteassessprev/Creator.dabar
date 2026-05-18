'use client'

/**
 * EditableTemplateCanvas — interactive version of TemplateRenderer for
 * end users editing their generated carousels.
 *
 * Renders the template's structure but lets the user:
 *   - Click an element to select it (dashed outline)
 *   - Drag the selected element to move it
 *   - Drag the 4 corner handles to resize
 *
 * On every drag end, calls `onStructureChange` with the updated
 * structure so the parent can persist into `carousel.templateStructure`.
 *
 * Image_slot elements are filled with the current slide's imageUrl
 * (same content semantics as TemplateRenderer).
 */
import { useRef, useState, useCallback, useEffect, type CSSProperties } from 'react'
import {
  TemplateStructure,
  TemplateElement,
  TemplateContent,
  ASPECT_RATIO,
} from '@/lib/template-structure'
import TemplateRenderer from './TemplateRenderer'
import EditableElementToolbar from './EditableElementToolbar'

interface Props {
  structure: TemplateStructure
  content?: TemplateContent
  /** Called whenever the user finishes a move/resize (mouseup). */
  onStructureChange: (s: TemplateStructure) => void
  className?: string
}

type DragMode = 'move' | 'tl' | 'tr' | 'bl' | 'br' | null

export default function EditableTemplateCanvas({
  structure, content, onStructureChange, className,
}: Props) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dragMode, setDragMode] = useState<DragMode>(null)
  const dragStateRef = useRef<{
    elementId: string
    mode: Exclude<DragMode, null>
    startMouseX: number
    startMouseY: number
    startEl: TemplateElement
    canvasRect: DOMRect
  } | null>(null)

  const selected = selectedId
    ? structure.elements.find(e => e.id === selectedId)
    : null

  // Track canvas rect for the floating toolbar positioning
  const [canvasRect, setCanvasRect] = useState<DOMRect | null>(null)
  useEffect(() => {
    function updateRect() {
      if (canvasRef.current) setCanvasRect(canvasRef.current.getBoundingClientRect())
    }
    updateRect()
    window.addEventListener('resize', updateRect)
    window.addEventListener('scroll', updateRect, true)
    return () => {
      window.removeEventListener('resize', updateRect)
      window.removeEventListener('scroll', updateRect, true)
    }
  }, [selectedId])

  function applyPatch(patch: Partial<TemplateElement>) {
    if (!selected) return
    const updated: TemplateStructure = {
      ...structure,
      elements: structure.elements.map(x =>
        x.id === selected.id ? ({ ...x, ...patch } as TemplateElement) : x
      ),
    }
    onStructureChange(updated)
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const state = dragStateRef.current
    if (!state) return
    const dx = ((e.clientX - state.startMouseX) / state.canvasRect.width) * 100
    const dy = ((e.clientY - state.startMouseY) / state.canvasRect.height) * 100
    const el = state.startEl
    let next: Partial<TemplateElement> = {}
    switch (state.mode) {
      case 'move':
        next = {
          x: clamp(el.x + dx, -50, 150),
          y: clamp(el.y + dy, -50, 150),
        }
        break
      case 'tl':
        next = {
          x:      clamp(el.x + dx, -50, el.x + el.width - 2),
          y:      clamp(el.y + dy, -50, el.y + el.height - 2),
          width:  clamp(el.width - dx, 2, 150),
          height: clamp(el.height - dy, 2, 150),
        }
        break
      case 'tr':
        next = {
          y:      clamp(el.y + dy, -50, el.y + el.height - 2),
          width:  clamp(el.width + dx, 2, 150),
          height: clamp(el.height - dy, 2, 150),
        }
        break
      case 'bl':
        next = {
          x:      clamp(el.x + dx, -50, el.x + el.width - 2),
          width:  clamp(el.width - dx, 2, 150),
          height: clamp(el.height + dy, 2, 150),
        }
        break
      case 'br':
        next = {
          width:  clamp(el.width + dx, 2, 150),
          height: clamp(el.height + dy, 2, 150),
        }
        break
    }
    const updated: TemplateStructure = {
      ...structure,
      elements: structure.elements.map(x =>
        x.id === state.elementId ? ({ ...x, ...next } as TemplateElement) : x
      ),
    }
    onStructureChange(updated)
  }, [structure, onStructureChange])

  const handleMouseUp = useCallback(() => {
    dragStateRef.current = null
    setDragMode(null)
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }, [handleMouseMove])

  function startDrag(mode: Exclude<DragMode, null>, element: TemplateElement, e: React.MouseEvent) {
    if (element.locked) return
    e.preventDefault()
    e.stopPropagation()
    if (!canvasRef.current) return
    setSelectedId(element.id)
    setDragMode(mode)
    dragStateRef.current = {
      elementId: element.id,
      mode,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startEl: element,
      canvasRect: canvasRef.current.getBoundingClientRect(),
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <div
      ref={canvasRef}
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: ASPECT_RATIO[structure.canvas.format],
        userSelect: 'none',
      }}
      onClick={() => setSelectedId(null)}
    >
      {/* Underlying renderer — keeps layout consistent with the read-only renderer */}
      <TemplateRenderer
        structure={structure}
        content={content}
        showImageSlotHint={false}
      />

      {/* Interaction overlay — transparent boxes per element, on top.
          data-editor-overlay flag lets handleExport hide it during
          html2canvas capture so handles/borders don't pollute the PNG. */}
      <div data-editor-overlay style={{ position: 'absolute', inset: 0 }}>
        {structure.elements
          .filter(el => el.type !== 'background' && el.visible !== false && !el.locked)
          .map(el => {
            const isSel = el.id === selectedId
            return (
              <div
                key={el.id}
                onMouseDown={e => startDrag('move', el, e)}
                onClick={e => { e.stopPropagation(); setSelectedId(el.id) }}
                style={{
                  position: 'absolute',
                  left:   `${el.x}%`,
                  top:    `${el.y}%`,
                  width:  `${el.width}%`,
                  height: `${el.height}%`,
                  cursor: dragMode === 'move' ? 'grabbing' : 'grab',
                  border: isSel
                    ? '2px dashed rgba(14, 165, 233, 0.95)'
                    : '2px dashed transparent',
                  background: isSel ? 'rgba(14, 165, 233, 0.05)' : 'transparent',
                  zIndex: el.zIndex + 100,
                  transition: dragMode ? 'none' : 'border-color 0.15s',
                }}
              >
                {isSel && (
                  <>
                    <ResizeHandle pos="tl" onMouseDown={e => startDrag('tl', el, e)} />
                    <ResizeHandle pos="tr" onMouseDown={e => startDrag('tr', el, e)} />
                    <ResizeHandle pos="bl" onMouseDown={e => startDrag('bl', el, e)} />
                    <ResizeHandle pos="br" onMouseDown={e => startDrag('br', el, e)} />
                  </>
                )}
              </div>
            )
          })}
      </div>

      {/* Helper text — also hidden during export */}
      {!selected && (
        <div
          data-editor-overlay
          style={{
            position: 'absolute',
            bottom: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '11px',
            color: 'rgba(255,255,255,0.6)',
            background: 'rgba(0,0,0,0.5)',
            padding: '4px 10px',
            borderRadius: '8px',
            pointerEvents: 'none',
            backdropFilter: 'blur(4px)',
          }}
        >
          Clique num elemento pra mover ou redimensionar
        </div>
      )}

      {/* Floating toolbar for selected element — rendered in screen space,
          tagged with data-editor-overlay so it's hidden during export. */}
      <EditableElementToolbar
        element={selected ?? null}
        canvasRect={canvasRect}
        onChange={applyPatch}
        onClose={() => setSelectedId(null)}
      />
    </div>
  )
}

function ResizeHandle({
  pos, onMouseDown,
}: {
  pos: 'tl' | 'tr' | 'bl' | 'br'
  onMouseDown: (e: React.MouseEvent) => void
}) {
  const posStyle: Record<string, CSSProperties> = {
    tl: { top: -6, left: -6,   cursor: 'nwse-resize' },
    tr: { top: -6, right: -6,  cursor: 'nesw-resize' },
    bl: { bottom: -6, left: -6, cursor: 'nesw-resize' },
    br: { bottom: -6, right: -6, cursor: 'nwse-resize' },
  }
  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        position: 'absolute',
        width: 12,
        height: 12,
        background: '#0ea5e9',
        border: '2px solid white',
        borderRadius: 3,
        zIndex: 10,
        ...posStyle[pos],
      }}
    />
  )
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}
