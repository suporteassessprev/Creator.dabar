/**
 * Phase 3 — Visual Template Structure
 *
 * Schema for templates as a collection of absolutely-positioned elements.
 * Positions are stored in % (0-100) of the canvas, so the same template
 * renders consistently across canvas formats (1:1, 4:5, 9:16).
 *
 * Stored as JSON string in Template.structure. NULL = legacy template
 * (falls back to layout-based renderer).
 */

export type CanvasFormat = '1:1' | '4:5' | '9:16'

export type ElementType =
  | 'text_headline'
  | 'text_subtitle'
  | 'text_cta'
  | 'image_slot'
  | 'shape'
  | 'badge'
  | 'background'

export type TextAlign = 'left' | 'center' | 'right'
export type ShapeKind = 'rectangle' | 'circle'

export interface BaseElement {
  id: string
  type: ElementType
  x: number              // % from left (0-100)
  y: number              // % from top (0-100)
  width: number          // % of canvas width
  height: number         // % of canvas height
  zIndex: number
  locked?: boolean
  visible?: boolean      // defaults true; false = hidden in renderer
  rotation?: number      // degrees, default 0
}

export interface TextElement extends BaseElement {
  type: 'text_headline' | 'text_subtitle' | 'text_cta' | 'badge'
  placeholder: string    // "TÍTULO IMPACTANTE", "Subtítulo", "QUERO SABER MAIS"
  fontFamily?: string
  fontSize?: number      // px at canvas reference width (1080)
  fontWeight?: number    // 400, 600, 700, 900
  color?: string
  align?: TextAlign
  letterSpacing?: number
  lineHeight?: number
  background?: string    // optional pill/badge background
  borderRadius?: number  // px
  paddingX?: number      // px
  paddingY?: number      // px
  opacity?: number       // 0-1
}

export interface ImageSlotElement extends BaseElement {
  type: 'image_slot'
  description: string    // "Imagem gerada pela IA — fundo inteiro do anúncio"
  objectFit?: 'cover' | 'contain' | 'fill'
  borderRadius?: number  // px
  overlay?: string       // e.g. "rgba(0,0,0,0.4)" — drawn on top of image
  opacity?: number       // 0-1, on the image itself
}

export interface ShapeElement extends BaseElement {
  type: 'shape'
  shape: ShapeKind
  fill?: string
  borderColor?: string
  borderWidth?: number
  borderRadius?: number  // for rectangles only
  opacity?: number
}

export interface BackgroundElement extends BaseElement {
  type: 'background'
  fill: string           // solid color or CSS gradient
}

export type TemplateElement =
  | TextElement
  | ImageSlotElement
  | ShapeElement
  | BackgroundElement

export interface CanvasConfig {
  format: CanvasFormat
  backgroundColor: string
}

export interface TemplateStructure {
  version: 1
  canvas: CanvasConfig
  elements: TemplateElement[]
}

/* ─── Defaults ──────────────────────────────────────────────────────── */

export function defaultStructure(format: CanvasFormat = '1:1'): TemplateStructure {
  const bgId = newId('bg')
  const imgId = newId('img')
  const headlineId = newId('hl')
  const subtitleId = newId('sub')
  const ctaId = newId('cta')
  return {
    version: 1,
    canvas: { format, backgroundColor: '#0f172a' },
    elements: [
      {
        id: bgId,
        type: 'background',
        x: 0, y: 0, width: 100, height: 100,
        zIndex: 0,
        fill: '#0f172a',
      },
      {
        id: imgId,
        type: 'image_slot',
        x: 0, y: 0, width: 100, height: 60,
        zIndex: 1,
        description: 'Imagem gerada pela IA — topo do anúncio',
        objectFit: 'cover',
        overlay: 'rgba(0,0,0,0.35)',
      },
      {
        id: headlineId,
        type: 'text_headline',
        x: 5, y: 65, width: 90, height: 15,
        zIndex: 10,
        placeholder: 'HEADLINE PODEROSA',
        fontFamily: 'Inter',
        fontSize: 64,
        fontWeight: 900,
        color: '#ffffff',
        align: 'center',
        lineHeight: 1.05,
      },
      {
        id: subtitleId,
        type: 'text_subtitle',
        x: 10, y: 80, width: 80, height: 8,
        zIndex: 10,
        placeholder: 'Complemento que gera desejo',
        fontFamily: 'Inter',
        fontSize: 28,
        fontWeight: 500,
        color: '#cbd5e1',
        align: 'center',
        lineHeight: 1.3,
      },
      {
        id: ctaId,
        type: 'text_cta',
        x: 30, y: 90, width: 40, height: 6,
        zIndex: 10,
        placeholder: 'QUERO SABER MAIS',
        fontFamily: 'Inter',
        fontSize: 22,
        fontWeight: 700,
        color: '#0f172a',
        background: '#0ea5e9',
        align: 'center',
        borderRadius: 999,
        paddingX: 24,
        paddingY: 10,
      },
    ],
  }
}

let _counter = 0
export function newId(prefix: string): string {
  _counter++
  return `${prefix}_${Date.now().toString(36)}_${_counter.toString(36)}`
}

/* ─── Aspect-ratio mapping for CSS aspect-ratio ─────────────────────── */
export const ASPECT_RATIO: Record<CanvasFormat, string> = {
  '1:1':  '1 / 1',
  '4:5':  '4 / 5',
  '9:16': '9 / 16',
}

/* Map legacy Template.format to CanvasFormat */
export function formatToCanvas(fmt: string | null | undefined): CanvasFormat {
  if (fmt === 'feed-vertical') return '4:5'
  if (fmt === 'story') return '9:16'
  return '1:1'
}

/* ─── Parse / serialize ─────────────────────────────────────────────── */

export function parseStructure(raw: string | null | undefined): TemplateStructure | null {
  if (!raw) return null
  try {
    const obj = JSON.parse(raw)
    if (!obj || typeof obj !== 'object') return null
    if (obj.version !== 1) return null
    if (!Array.isArray(obj.elements)) return null
    if (!obj.canvas || !ASPECT_RATIO[obj.canvas.format as CanvasFormat]) return null
    return obj as TemplateStructure
  } catch {
    return null
  }
}

export function serializeStructure(s: TemplateStructure): string {
  return JSON.stringify(s)
}

/* ─── Validation ────────────────────────────────────────────────────── */

export interface ValidationError {
  field: string
  message: string
}

export function validateStructure(s: TemplateStructure): ValidationError[] {
  const errors: ValidationError[] = []

  if (s.version !== 1) errors.push({ field: 'version', message: 'Versão de structure inválida.' })
  if (!ASPECT_RATIO[s.canvas?.format]) {
    errors.push({ field: 'canvas.format', message: 'Formato de canvas inválido.' })
  }
  if (!Array.isArray(s.elements)) {
    errors.push({ field: 'elements', message: 'Elementos inválidos.' })
    return errors
  }

  const ids = new Set<string>()
  let hasHeadlineOrImageSlot = false

  for (const el of s.elements) {
    if (!el.id || ids.has(el.id)) {
      errors.push({ field: `elements.${el.id}`, message: 'ID de elemento duplicado ou ausente.' })
    } else {
      ids.add(el.id)
    }
    if (!Number.isFinite(el.x) || !Number.isFinite(el.y) ||
        !Number.isFinite(el.width) || !Number.isFinite(el.height)) {
      errors.push({ field: el.id, message: 'Posição/tamanho devem ser números.' })
    }
    if (el.type === 'text_headline' || el.type === 'image_slot') {
      hasHeadlineOrImageSlot = true
    }
    if (el.type === 'image_slot' && (!('description' in el) || !el.description?.trim())) {
      errors.push({ field: el.id, message: 'image_slot precisa de descrição.' })
    }
  }

  if (!hasHeadlineOrImageSlot) {
    errors.push({
      field: 'elements',
      message: 'O template precisa ter pelo menos um headline OU um image_slot.',
    })
  }

  return errors
}

/* ─── Content substitution for renderer ──────────────────────────────── */

export interface TemplateContent {
  headline?: string
  subtitle?: string
  cta?: string
  imageUrl?: string   // base64 data URL or remote URL
}

/**
 * Resolve the user-facing text for a text element. If real content is
 * supplied, use it; otherwise fall back to placeholder.
 */
export function resolveText(el: TextElement, content: TemplateContent | undefined): string {
  if (!content) return el.placeholder
  if (el.type === 'text_headline' && content.headline) return content.headline
  if (el.type === 'text_subtitle' && content.subtitle) return content.subtitle
  if (el.type === 'text_cta' && content.cta) return content.cta
  return el.placeholder
}
