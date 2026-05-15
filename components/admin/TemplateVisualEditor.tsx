'use client'

/**
 * Phase 3 — Admin visual template editor.
 *
 * 3-column layout:
 * - Left: layer list (add element, reorder, lock/hide)
 * - Center: canvas preview with selection
 * - Right: properties panel for selected element
 *
 * Positioning is via numeric inputs (X/Y/W/H in % 0-100). No mouse drag.
 */
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import TemplateRenderer from '@/components/TemplateRenderer'
import {
  TemplateStructure,
  TemplateElement,
  ElementType,
  CanvasFormat,
  TextElement,
  ImageSlotElement,
  ImageStaticElement,
  AccountBadgeElement,
  IconElement,
  ShapeElement,
  BackgroundElement,
  defaultStructure,
  newId,
  validateStructure,
} from '@/lib/template-structure'
import { TEMPLATE_ICONS, CATEGORY_LABELS, searchIcons, type IconCategory } from '@/lib/template-icons'
import type { LucideIcon } from 'lucide-react'
import {
  Save, ArrowLeft, Eye, EyeOff, Lock, Unlock, Copy as CopyIcon, Trash2,
  ChevronUp, ChevronDown, Plus, Loader2, AlertCircle, CheckCircle2,
  Type, Image as ImageIcon, Square as SquareIcon,
  PaintBucket, Tag, Sparkles, X, UserCircle, ImagePlus, Upload, Smile, Search,
} from 'lucide-react'

/* ─── Form metadata fields (kept for backward compat with old API) ──── */
export interface TemplateMeta {
  name: string
  description: string
  mode: 'creative' | 'carousel' | 'both'
  active: boolean
  published: boolean
}

interface Props {
  templateId?: string
  initialMeta: TemplateMeta
  initialStructure?: TemplateStructure
}

const ELEMENT_TYPE_LABELS: Record<ElementType, string> = {
  text_headline:  'Headline',
  text_subtitle:  'Subtítulo',
  text_cta:       'CTA',
  image_slot:     'Imagem (slot IA)',
  image_static:   'Imagem estática',
  account_badge:  'Perfil (@handle)',
  icon:           'Ícone',
  shape:          'Forma',
  badge:          'Badge',
  background:     'Fundo',
}

const ELEMENT_ICONS: Record<ElementType, LucideIcon> = {
  text_headline:  Type,
  text_subtitle:  Type,
  text_cta:       Type,
  image_slot:     ImageIcon,
  image_static:   ImagePlus,
  account_badge:  UserCircle,
  icon:           Smile,
  shape:          SquareIcon,
  badge:          Tag,
  background:     PaintBucket,
}

const FORMATS: { value: CanvasFormat; label: string; ratio: string }[] = [
  { value: '1:1',  label: '1:1 Quadrado', ratio: '1080×1080' },
  { value: '4:5',  label: '4:5 Feed',     ratio: '1080×1350' },
  { value: '9:16', label: '9:16 Story',   ratio: '1080×1920' },
]

/**
 * Curated font list — covers the most common viral creative styles.
 * Loaded via Google Fonts <link> in the page wrapper.
 * Each option in the FontField renders in its actual face.
 */
const FONT_OPTIONS: { name: string; group: 'sans' | 'display' | 'serif' | 'handwriting' | 'mono' | 'system' }[] = [
  // Sans modernas
  { name: 'Inter',             group: 'sans'        },
  { name: 'Poppins',           group: 'sans'        },
  { name: 'Roboto',            group: 'sans'        },
  { name: 'Montserrat',        group: 'sans'        },
  { name: 'Lato',              group: 'sans'        },
  { name: 'Open Sans',         group: 'sans'        },
  { name: 'Raleway',           group: 'sans'        },
  { name: 'Work Sans',         group: 'sans'        },
  { name: 'Nunito',            group: 'sans'        },
  { name: 'Manrope',           group: 'sans'        },
  { name: 'DM Sans',           group: 'sans'        },
  // Display de impacto
  { name: 'Bebas Neue',        group: 'display'     },
  { name: 'Anton',             group: 'display'     },
  { name: 'Oswald',            group: 'display'     },
  { name: 'Archivo Black',     group: 'display'     },
  { name: 'Bungee',            group: 'display'     },
  { name: 'Rubik Mono One',    group: 'display'     },
  { name: 'Russo One',         group: 'display'     },
  { name: 'Black Ops One',     group: 'display'     },
  { name: 'Passion One',       group: 'display'     },
  { name: 'Alfa Slab One',     group: 'display'     },
  // Serif premium
  { name: 'Playfair Display',  group: 'serif'       },
  { name: 'Merriweather',      group: 'serif'       },
  { name: 'DM Serif Display',  group: 'serif'       },
  { name: 'Lora',              group: 'serif'       },
  { name: 'Cormorant Garamond',group: 'serif'       },
  { name: 'Crimson Pro',       group: 'serif'       },
  // Handwriting / decorativas
  { name: 'Caveat',            group: 'handwriting' },
  { name: 'Permanent Marker',  group: 'handwriting' },
  { name: 'Patrick Hand',      group: 'handwriting' },
  { name: 'Pacifico',          group: 'handwriting' },
  { name: 'Dancing Script',    group: 'handwriting' },
  // Mono
  { name: 'JetBrains Mono',    group: 'mono'        },
  { name: 'Fira Code',         group: 'mono'        },
  // Sistema
  { name: 'system-ui',         group: 'system'      },
]

/* ─── Factories for new elements ────────────────────────────────────── */
function newElement(type: ElementType, zIndex: number): TemplateElement {
  const base = {
    id: newId(type),
    x: 25, y: 40, width: 50, height: 15,
    zIndex,
    visible: true,
  }
  switch (type) {
    case 'text_headline':
      return { ...base, type, placeholder: 'HEADLINE', fontSize: 64, fontWeight: 900, color: '#ffffff', align: 'center', lineHeight: 1.05 }
    case 'text_subtitle':
      return { ...base, type, placeholder: 'Subtítulo', fontSize: 28, fontWeight: 500, color: '#cbd5e1', align: 'center', lineHeight: 1.3, height: 8 }
    case 'text_cta':
      return { ...base, type, placeholder: 'QUERO SABER MAIS', fontSize: 22, fontWeight: 700, color: '#0f172a', background: '#0ea5e9', align: 'center', borderRadius: 999, paddingX: 24, paddingY: 10, height: 6, width: 40, x: 30 }
    case 'badge':
      return { ...base, type, placeholder: 'Novo', fontSize: 18, fontWeight: 700, color: '#0f172a', background: '#fde68a', align: 'center', borderRadius: 999, paddingX: 12, paddingY: 4, height: 5, width: 20, x: 5, y: 5 }
    case 'image_slot':
      return { ...base, type, description: 'Imagem gerada pela IA', objectFit: 'cover', width: 100, height: 50, x: 0, y: 0 }
    case 'image_static':
      return { ...base, type, src: '', objectFit: 'cover', width: 50, height: 30, x: 25, y: 35, borderRadius: 12, alt: '' }
    case 'account_badge':
      return { ...base, type, handle: '@seu_perfil', avatarSize: 36, fontSize: 22, fontWeight: 600, color: '#111111', width: 40, height: 5, x: 5, y: 5 }
    case 'icon':
      return { ...base, type, iconName: 'CheckCircle2', color: '#ffffff', strokeWidth: 2, width: 8, height: 8, x: 46, y: 46 }
    case 'shape':
      return { ...base, type, shape: 'rectangle', fill: 'rgba(14, 165, 233, 0.3)', borderRadius: 8 }
    case 'background':
      return { ...base, type, x: 0, y: 0, width: 100, height: 100, fill: '#0f172a', zIndex: 0 }
  }
}

/* ─── Main component ────────────────────────────────────────────────── */
export default function TemplateVisualEditor({ templateId, initialMeta, initialStructure }: Props) {
  const router = useRouter()
  const [meta, setMeta] = useState<TemplateMeta>(initialMeta)
  const [structure, setStructure] = useState<TemplateStructure>(
    initialStructure ?? defaultStructure('1:1')
  )
  const [selectedId, setSelectedId] = useState<string | null>(
    structure.elements[0]?.id ?? null
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState(false)
  /**
   * Map of image_slot element id → data URL of a preview image the admin
   * generated via "Gerar preview com IA". Kept in memory only — never
   * persisted with the template (the slot is supposed to be filled at
   * user-generation time, not by the admin).
   */
  const [slotPreviews, setSlotPreviews] = useState<Record<string, string>>({})

  const selected = useMemo(
    () => structure.elements.find(e => e.id === selectedId) ?? null,
    [structure.elements, selectedId]
  )

  function markDirty() { setSaved(false) }

  function updateElement(id: string, patch: Partial<TemplateElement>) {
    setStructure(s => ({
      ...s,
      elements: s.elements.map(e =>
        e.id === id ? ({ ...e, ...patch } as TemplateElement) : e
      ),
    }))
    markDirty()
  }

  function addElement(type: ElementType) {
    const nextZ = Math.max(0, ...structure.elements.map(e => e.zIndex)) + 1
    const el = newElement(type, nextZ)
    setStructure(s => ({ ...s, elements: [...s.elements, el] }))
    setSelectedId(el.id)
    markDirty()
  }

  function addImageFromDataUrl(dataUrl: string) {
    const nextZ = Math.max(0, ...structure.elements.map(e => e.zIndex)) + 1
    const el = newElement('image_static', nextZ) as ImageStaticElement
    const withImage: ImageStaticElement = { ...el, src: dataUrl }
    setStructure(s => ({ ...s, elements: [...s.elements, withImage] }))
    setSelectedId(withImage.id)
    markDirty()
  }

  /**
   * Global paste handler — Cmd/Ctrl+V anywhere in the editor pastes
   * clipboard images as a new image_static element. Ignored when the
   * focus is inside an <input> or <textarea> (so we don't hijack
   * normal text-pasting in property fields).
   */
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea') return
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (!file) continue
          const reader = new FileReader()
          reader.onload = () => {
            if (typeof reader.result === 'string') addImageFromDataUrl(reader.result)
          }
          reader.readAsDataURL(file)
          e.preventDefault()
          return
        }
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structure.elements])

  function duplicateElement(id: string) {
    const orig = structure.elements.find(e => e.id === id)
    if (!orig) return
    const nextZ = Math.max(0, ...structure.elements.map(e => e.zIndex)) + 1
    const copy: TemplateElement = {
      ...orig,
      id: newId(orig.type),
      x: Math.min(95, orig.x + 3),
      y: Math.min(95, orig.y + 3),
      zIndex: nextZ,
    }
    setStructure(s => ({ ...s, elements: [...s.elements, copy] }))
    setSelectedId(copy.id)
    markDirty()
  }

  function deleteElement(id: string) {
    setStructure(s => ({ ...s, elements: s.elements.filter(e => e.id !== id) }))
    if (selectedId === id) setSelectedId(null)
    markDirty()
  }

  function bringForward(id: string) {
    const el = structure.elements.find(e => e.id === id)
    if (!el) return
    updateElement(id, { zIndex: el.zIndex + 1 } as Partial<TemplateElement>)
  }

  function sendBackward(id: string) {
    const el = structure.elements.find(e => e.id === id)
    if (!el) return
    updateElement(id, { zIndex: Math.max(0, el.zIndex - 1) } as Partial<TemplateElement>)
  }

  function toggleLocked(id: string) {
    const el = structure.elements.find(e => e.id === id)
    if (!el) return
    updateElement(id, { locked: !el.locked } as Partial<TemplateElement>)
  }

  function toggleVisible(id: string) {
    const el = structure.elements.find(e => e.id === id)
    if (!el) return
    updateElement(id, { visible: el.visible === false ? true : false } as Partial<TemplateElement>)
  }

  function setCanvasFormat(format: CanvasFormat) {
    setStructure(s => ({ ...s, canvas: { ...s.canvas, format } }))
    markDirty()
  }

  function setCanvasBg(color: string) {
    setStructure(s => ({ ...s, canvas: { ...s.canvas, backgroundColor: color } }))
    markDirty()
  }

  async function handleSave() {
    setError(null)
    if (!meta.name.trim()) { setError('Nome do template é obrigatório'); return }
    const errors = validateStructure(structure)
    if (errors.length > 0) {
      setError(errors.map(e => e.message).join(' • '))
      return
    }
    setSaving(true)
    try {
      const url    = templateId ? `/api/admin/templates/${templateId}` : '/api/admin/templates'
      const method = templateId ? 'PUT' : 'POST'
      const body = {
        name:        meta.name.trim(),
        description: meta.description.trim(),
        mode:        meta.mode,
        format:      canvasFormatToLegacy(structure.canvas.format),
        layout:      'headline-banner', // kept for legacy compat — unused when structure exists
        palette:     JSON.stringify({
          bg: structure.canvas.backgroundColor,
          accent: '#0ea5e9',
          text: '#ffffff',
        }),
        active:      meta.active,
        published:   meta.published,
        structure:   JSON.stringify(structure),
      }
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || `Erro ${res.status} ao salvar`)
      }
      setSaved(true)
      if (!templateId) {
        // After creating, route to edit so structure persists
        const created = await res.json().catch(() => null)
        if (created?.id) router.push(`/admin/templates/${created.id}/edit`)
        else router.push('/admin/templates')
      }
    } catch (e: any) {
      setError(e.message ?? 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  /* ─── Render ───────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div className="border-b border-white/10 px-6 py-3 flex items-center gap-4 glass">
        <button
          onClick={() => router.push('/admin/templates')}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          title="Voltar"
        >
          <ArrowLeft size={18} />
        </button>
        <input
          value={meta.name}
          onChange={e => { setMeta({ ...meta, name: e.target.value }); markDirty() }}
          placeholder="Nome do template"
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm w-72 focus:outline-none focus:border-blue-500/50"
        />
        <div className="text-xs text-gray-400 flex items-center gap-1.5">
          {saved ? (
            <><CheckCircle2 size={14} className="text-green-400" /> Salvo</>
          ) : (
            <><span className="w-2 h-2 rounded-full bg-yellow-400" /> Alterações não salvas</>
          )}
        </div>

        <div className="flex-1" />

        <select
          value={structure.canvas.format}
          onChange={e => setCanvasFormat(e.target.value as CanvasFormat)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500/50"
        >
          {FORMATS.map(f => (
            <option key={f.value} value={f.value}>{f.label} ({f.ratio})</option>
          ))}
        </select>

        <button
          onClick={() => setPreviewMode(v => !v)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm glass hover:bg-white/10"
          title="Alternar pré-visualização"
        >
          {previewMode ? <EyeOff size={14} /> : <Eye size={14} />}
          {previewMode ? 'Editar' : 'Preview'}
        </button>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 rounded-lg font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-60"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      {error && (
        <div className="mx-6 mt-4 flex items-start gap-2 text-red-400 text-sm glass border border-red-500/30 rounded-xl p-3">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* ── 3-column body ───────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-[260px_1fr_320px] gap-4 p-4 min-h-0">
        {/* ── Left: layer list ──────────────────────────────────── */}
        <aside className="glass rounded-2xl p-3 overflow-y-auto">
          <div className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold px-2 mb-2">
            Camadas
          </div>
          <div className="space-y-1 mb-4">
            {[...structure.elements]
              .sort((a, b) => b.zIndex - a.zIndex)
              .map(el => {
                const Icon = ELEMENT_ICONS[el.type]
                const isSel = el.id === selectedId
                return (
                  <button
                    key={el.id}
                    onClick={() => setSelectedId(el.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all ${
                      isSel ? 'bg-blue-500/20 border border-blue-500/40 text-white' : 'hover:bg-white/5 text-gray-300'
                    }`}
                  >
                    <Icon size={12} />
                    <span className="flex-1 text-left truncate">{ELEMENT_TYPE_LABELS[el.type]}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); toggleVisible(el.id) }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); toggleVisible(el.id) } }}
                      className="opacity-60 hover:opacity-100 cursor-pointer"
                      title={el.visible === false ? 'Mostrar' : 'Ocultar'}
                    >
                      {el.visible === false ? <EyeOff size={11} /> : <Eye size={11} />}
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); toggleLocked(el.id) }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); toggleLocked(el.id) } }}
                      className="opacity-60 hover:opacity-100 cursor-pointer"
                      title={el.locked ? 'Destravar' : 'Travar'}
                    >
                      {el.locked ? <Lock size={11} /> : <Unlock size={11} />}
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation()
                        const critical = el.type === 'text_headline' || el.type === 'image_slot'
                        if (critical && !window.confirm(`Excluir camada "${ELEMENT_TYPE_LABELS[el.type]}"?`)) return
                        deleteElement(el.id)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation()
                          const critical = el.type === 'text_headline' || el.type === 'image_slot'
                          if (critical && !window.confirm(`Excluir camada "${ELEMENT_TYPE_LABELS[el.type]}"?`)) return
                          deleteElement(el.id)
                        }
                      }}
                      className="text-red-400/60 hover:text-red-400 cursor-pointer"
                      title="Excluir camada"
                    >
                      <Trash2 size={11} />
                    </span>
                  </button>
                )
              })}
          </div>

          <div className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold px-2 mb-2">
            Adicionar
          </div>
          <div className="grid grid-cols-2 gap-1">
            {(['text_headline','text_subtitle','text_cta','image_slot','image_static','account_badge','icon','shape','badge','background'] as ElementType[]).map(t => {
              const Icon = ELEMENT_ICONS[t]
              return (
                <button
                  key={t}
                  onClick={() => addElement(t)}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] glass hover:bg-white/10 transition-all"
                >
                  <Plus size={10} />
                  <Icon size={11} />
                  <span className="truncate">{ELEMENT_TYPE_LABELS[t]}</span>
                </button>
              )
            })}
          </div>
        </aside>

        {/* ── Center: canvas ────────────────────────────────────── */}
        <main className="glass rounded-2xl flex items-center justify-center overflow-auto p-6">
          <div className="w-full max-w-md mx-auto">
            <TemplateRenderer
              structure={structure}
              content={previewMode ? {
                headline: 'HEADLINE DE EXEMPLO',
                subtitle: 'Subtítulo gerado pela IA aparece aqui',
                cta:      'QUERO SABER MAIS',
              } : undefined}
              selectedId={previewMode ? null : selectedId}
              onElementClick={previewMode ? undefined : setSelectedId}
              showImageSlotHint={!previewMode}
              previewImages={slotPreviews}
            />
            <div className="mt-3 text-center text-[11px] text-gray-500">
              {previewMode
                ? 'Preview com dados simulados'
                : <>Clique num elemento para editar → · <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px]">⌘V</kbd> cola imagem da área de transferência</>}
            </div>
          </div>
        </main>

        {/* ── Right: properties panel ───────────────────────────── */}
        <aside className="glass rounded-2xl p-4 overflow-y-auto">
          {selected ? (
            <PropertiesPanel
              element={selected}
              onChange={patch => updateElement(selected.id, patch)}
              onDuplicate={() => duplicateElement(selected.id)}
              onDelete={() => deleteElement(selected.id)}
              onBringForward={() => bringForward(selected.id)}
              onSendBackward={() => sendBackward(selected.id)}
              previewSrc={slotPreviews[selected.id]}
              onPreviewChange={(src) => {
                setSlotPreviews(prev => {
                  if (!src) {
                    const { [selected.id]: _, ...rest } = prev
                    return rest
                  }
                  return { ...prev, [selected.id]: src }
                })
              }}
            />
          ) : (
            <TemplateMetaPanel
              meta={meta}
              canvasBg={structure.canvas.backgroundColor}
              onMetaChange={(patch) => { setMeta({ ...meta, ...patch }); markDirty() }}
              onCanvasBgChange={setCanvasBg}
            />
          )}
        </aside>
      </div>
    </div>
  )
}

function canvasFormatToLegacy(f: CanvasFormat): string {
  if (f === '4:5') return 'feed-vertical'
  if (f === '9:16') return 'story'
  return 'square'
}

/* ─── Right-panel: element properties ───────────────────────────────── */

function PropertiesPanel(props: {
  element: TemplateElement
  onChange: (p: Partial<TemplateElement>) => void
  onDuplicate: () => void
  onDelete: () => void
  onBringForward: () => void
  onSendBackward: () => void
  previewSrc?: string
  onPreviewChange?: (src: string | null) => void
}) {
  const { element: el, onChange } = props
  const Icon = ELEMENT_ICONS[el.type]
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-300">
        <Icon size={14} />
        <span>{ELEMENT_TYPE_LABELS[el.type]}</span>
        <span className="ml-auto text-[10px] text-gray-500 font-mono">{el.id.slice(-6)}</span>
      </div>

      {/* Position */}
      <Section title="Posição (% do canvas)">
        <div className="grid grid-cols-2 gap-2">
          <NumField label="X" value={el.x} onChange={v => onChange({ x: v } as Partial<TemplateElement>)} min={-50} max={150} step={0.5} />
          <NumField label="Y" value={el.y} onChange={v => onChange({ y: v } as Partial<TemplateElement>)} min={-50} max={150} step={0.5} />
          <NumField label="W" value={el.width} onChange={v => onChange({ width: v } as Partial<TemplateElement>)} min={1} max={150} step={0.5} />
          <NumField label="H" value={el.height} onChange={v => onChange({ height: v } as Partial<TemplateElement>)} min={1} max={150} step={0.5} />
          <NumField label="Z" value={el.zIndex} onChange={v => onChange({ zIndex: Math.round(v) } as Partial<TemplateElement>)} min={0} max={100} step={1} />
          <NumField label="Rot" value={el.rotation ?? 0} onChange={v => onChange({ rotation: v } as Partial<TemplateElement>)} min={-180} max={180} step={1} />
        </div>
      </Section>

      {/* Type-specific */}
      {(el.type === 'text_headline' || el.type === 'text_subtitle' || el.type === 'text_cta' || el.type === 'badge') && (
        <TextPropsPanel el={el as TextElement} onChange={onChange} />
      )}
      {el.type === 'image_slot' && (
        <ImageSlotPropsPanel
          el={el as ImageSlotElement}
          onChange={onChange}
          previewSrc={props.previewSrc}
          onPreviewChange={props.onPreviewChange}
        />
      )}
      {el.type === 'image_static' && (
        <ImageStaticPropsPanel el={el as ImageStaticElement} onChange={onChange} />
      )}
      {el.type === 'account_badge' && (
        <AccountBadgePropsPanel el={el as AccountBadgeElement} onChange={onChange} />
      )}
      {el.type === 'icon' && (
        <IconPropsPanel el={el as IconElement} onChange={onChange} />
      )}
      {el.type === 'shape' && (
        <ShapePropsPanel el={el as ShapeElement} onChange={onChange} />
      )}
      {el.type === 'background' && (
        <BackgroundPropsPanel el={el as BackgroundElement} onChange={onChange} />
      )}

      {/* Actions */}
      <Section title="Ações">
        <div className="grid grid-cols-2 gap-2">
          <ActionBtn icon={ChevronUp} label="Trazer +1" onClick={props.onBringForward} />
          <ActionBtn icon={ChevronDown} label="Recuar -1" onClick={props.onSendBackward} />
          <ActionBtn icon={CopyIcon} label="Duplicar" onClick={props.onDuplicate} />
          <ActionBtn icon={Trash2} label="Excluir" onClick={props.onDelete} danger />
        </div>
      </Section>
    </div>
  )
}

function TextPropsPanel({ el, onChange }: { el: TextElement; onChange: (p: Partial<TextElement>) => void }) {
  return (
    <>
      <Section title="Conteúdo placeholder">
        <textarea
          value={el.placeholder}
          onChange={e => onChange({ placeholder: e.target.value })}
          rows={2}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:border-blue-500/50"
        />
      </Section>
      <Section title="Tipografia">
        <div className="grid grid-cols-2 gap-2">
          <FontField
            label="Fonte"
            value={el.fontFamily ?? 'Inter'}
            onChange={v => onChange({ fontFamily: v })}
          />
          <NumField label="Tamanho" value={el.fontSize ?? 32} onChange={v => onChange({ fontSize: v })} min={8} max={200} step={1} />
          <NumField label="Peso" value={el.fontWeight ?? 700} onChange={v => onChange({ fontWeight: Math.round(v) })} min={100} max={900} step={100} />
          <NumField label="Line-height" value={el.lineHeight ?? 1.2} onChange={v => onChange({ lineHeight: v })} min={0.8} max={2.5} step={0.05} />
        </div>
        <SelectField
          label="Alinhamento"
          value={el.align ?? 'center'}
          onChange={v => onChange({ align: v as any })}
          options={['left','center','right']}
        />
      </Section>
      <Section title="Cores">
        <ColorField label="Texto" value={el.color ?? '#ffffff'} onChange={v => onChange({ color: v })} />
        <ColorField label="Destaque (entre *asteriscos*)" value={el.accentColor ?? '#facc15'} onChange={v => onChange({ accentColor: v })} />
        <ColorField label="Fundo (opcional)" value={el.background ?? ''} onChange={v => onChange({ background: v || undefined })} allowEmpty />
        <p className="text-[10px] text-gray-500">
          Use <code className="text-purple-300">*palavra*</code> no placeholder pra destacar com a cor de destaque.
        </p>
      </Section>
      {el.background && (
        <Section title="Padding/raio (quando tem fundo)">
          <div className="grid grid-cols-3 gap-2">
            <NumField label="Pad-X" value={el.paddingX ?? 16} onChange={v => onChange({ paddingX: Math.round(v) })} min={0} max={80} step={1} />
            <NumField label="Pad-Y" value={el.paddingY ?? 8} onChange={v => onChange({ paddingY: Math.round(v) })} min={0} max={80} step={1} />
            <NumField label="Raio" value={el.borderRadius ?? 0} onChange={v => onChange({ borderRadius: Math.round(v) })} min={0} max={999} step={1} />
          </div>
        </Section>
      )}
      <Section title="Opacidade">
        <NumField label="Opacidade" value={el.opacity ?? 1} onChange={v => onChange({ opacity: v })} min={0} max={1} step={0.05} />
      </Section>
    </>
  )
}

function ImageSlotPropsPanel({
  el, onChange, previewSrc, onPreviewChange,
}: {
  el: ImageSlotElement
  onChange: (p: Partial<ImageSlotElement>) => void
  previewSrc?: string
  onPreviewChange?: (src: string | null) => void
}) {
  const [showPromptsModal, setShowPromptsModal] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)

  async function generatePreview() {
    if (!el.description.trim()) {
      setGenError('Adicione uma descrição antes de gerar')
      return
    }
    setGenError(null)
    setGenerating(true)
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: el.description, mode: 'creative' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Erro ${res.status}`)
      if (!data.imageData) throw new Error('IA não retornou imagem')
      onPreviewChange?.(data.imageData)
    } catch (e: any) {
      setGenError(e.message ?? 'Erro ao gerar')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <>
      <Section title="Descrição (obrigatória)">
        <textarea
          value={el.description}
          onChange={e => onChange({ description: e.target.value })}
          rows={2}
          placeholder="Ex: Imagem da IA — fundo inteiro com tema do anúncio"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:border-blue-500/50"
        />
        <p className="text-[10px] text-gray-500 mt-1">
          Esta descrição NÃO é mostrada ao usuário final — só serve para você documentar o slot.
        </p>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <button
            onClick={generatePreview}
            disabled={generating}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 text-purple-200 border border-purple-500/30 transition-all disabled:opacity-60"
            type="button"
            title="Chama o Gemini para gerar uma imagem real baseada na descrição — só visual, não fica salva"
          >
            {generating ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
            {generating ? 'Gerando...' : (previewSrc ? 'Gerar de novo' : 'Gerar preview IA')}
          </button>
          <button
            onClick={() => setShowPromptsModal(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] glass hover:bg-white/10 text-purple-300 border border-purple-500/20 transition-all"
            type="button"
          >
            <Eye size={11} />
            Ver prompts
          </button>
        </div>

        {previewSrc && (
          <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400">
            <span className="flex items-center gap-1">
              <CheckCircle2 size={10} className="text-green-400" />
              Preview ativo no canvas
            </span>
            <button
              onClick={() => onPreviewChange?.(null)}
              className="text-red-400 hover:text-red-300"
              type="button"
            >
              Limpar
            </button>
          </div>
        )}

        {genError && (
          <div className="mt-2 text-[10px] text-red-400 bg-red-500/10 rounded p-2 border border-red-500/20">
            {genError}
          </div>
        )}

        <p className="text-[10px] text-gray-500 mt-2">
          ℹ️ O preview é apenas visual — não fica salvo no template. Na geração real, o tema do usuário se mistura ao prompt.
        </p>
      </Section>
      <Section title="Ajuste">
        <SelectField
          label="Object-fit"
          value={el.objectFit ?? 'cover'}
          onChange={v => onChange({ objectFit: v as any })}
          options={['cover','contain','fill']}
        />
        <NumField label="Raio (px)" value={el.borderRadius ?? 0} onChange={v => onChange({ borderRadius: Math.round(v) })} min={0} max={9999} step={1} />
        <NumField label="Opacidade" value={el.opacity ?? 1} onChange={v => onChange({ opacity: v })} min={0} max={1} step={0.05} />
        <ColorField
          label="Overlay (rgba)"
          value={el.overlay ?? ''}
          onChange={v => onChange({ overlay: v || undefined })}
          allowEmpty
          placeholder="rgba(0,0,0,0.4)"
        />
      </Section>
      {showPromptsModal && <AIPromptsModal onClose={() => setShowPromptsModal(false)} />}
    </>
  )
}

/**
 * Read-only modal showing the active prompt templates used by the AI
 * to generate images. Fetches /api/admin/prompts for the two image
 * types in parallel. Lets the admin understand WHAT will be sent to
 * Gemini without leaving the visual editor.
 */
function AIPromptsModal({ onClose }: { onClose: () => void }) {
  const [creative, setCreative] = useState<string | null>(null)
  const [carousel, setCarousel] = useState<string | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error,   setError]     = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch('/api/admin/prompts?type=creative_image').then(r => r.ok ? r.json() : []),
      fetch('/api/admin/prompts?type=carousel_image').then(r => r.ok ? r.json() : []),
    ])
      .then(([cr, ca]) => {
        if (cancelled) return
        const activeCreative = Array.isArray(cr) ? cr.find((p: any) => p.active) : null
        const activeCarousel = Array.isArray(ca) ? ca.find((p: any) => p.active) : null
        setCreative(activeCreative?.content ?? null)
        setCarousel(activeCarousel?.content ?? null)
      })
      .catch(() => { if (!cancelled) setError('Erro ao carregar prompts') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="glass rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-purple-400" />
            <h2 className="text-lg font-bold">Prompts da IA — image_slot</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-md" type="button">
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-gray-400 mb-5">
          Quando o usuário gerar um carrossel usando um template com este image_slot, a IA do Gemini
          receberá o prompt abaixo (preenchido automaticamente com o tema do usuário). Você pode
          editar estes templates em <span className="text-blue-400">/admin/prompts</span>.
        </p>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 size={14} className="animate-spin" /> Carregando prompts...
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-400 glass border border-red-500/20 rounded-xl p-3">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-5">
            <PromptBlock
              title="Criativo (anúncio único)"
              type="creative_image"
              content={creative}
            />
            <PromptBlock
              title="Carrossel (multi-slide)"
              type="carousel_image"
              content={carousel}
            />
          </div>
        )}

        <div className="mt-6 flex items-center justify-between pt-4 border-t border-white/5">
          <a
            href="/admin/prompts"
            className="text-xs text-blue-400 hover:text-blue-300 underline"
          >
            Editar em /admin/prompts →
          </a>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs glass hover:bg-white/10"
            type="button"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

function PromptBlock({
  title, type, content,
}: {
  title: string
  type: string
  content: string | null
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <h3 className="text-xs font-semibold text-gray-300">{title}</h3>
        <span className="text-[10px] font-mono text-gray-500 bg-white/5 px-2 py-0.5 rounded">
          {type}
        </span>
      </div>
      {content ? (
        <pre className="text-[11px] bg-black/30 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap font-mono text-gray-200 border border-white/5">
          {content}
        </pre>
      ) : (
        <div className="text-[11px] text-gray-500 italic glass rounded-lg p-3 border border-white/5">
          Nenhum prompt ativo configurado para este tipo — a IA usará um fallback interno.
        </div>
      )}
    </div>
  )
}

/**
 * Property panel for static images. Supports:
 * - File picker (file input)
 * - Paste from clipboard (Cmd/Ctrl+V anywhere with the element selected)
 * - Remote URL (paste-and-load)
 *
 * The image is stored as a data URL (base64) so the template is fully
 * self-contained and doesn't depend on external hosts.
 */
function ImageStaticPropsPanel({
  el, onChange,
}: {
  el: ImageStaticElement
  onChange: (p: Partial<ImageStaticElement>) => void
}) {
  const [urlInput, setUrlInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
  }

  async function handleFile(file: File) {
    setError(null)
    if (!file.type.startsWith('image/')) {
      setError('Arquivo deve ser uma imagem')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Imagem muito grande (max 5 MB). Use uma compactada.')
      return
    }
    setLoading(true)
    try {
      const dataUrl = await fileToDataUrl(file)
      onChange({ src: dataUrl, alt: file.name })
    } catch {
      setError('Erro ao ler arquivo')
    } finally {
      setLoading(false)
    }
  }

  async function loadFromUrl() {
    if (!urlInput.trim()) return
    setError(null)
    setLoading(true)
    try {
      // Fetch and convert to data URL to keep template self-contained
      const res = await fetch(urlInput.trim())
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      if (!blob.type.startsWith('image/')) throw new Error('URL não é uma imagem')
      const dataUrl = await fileToDataUrl(new File([blob], 'remote-image', { type: blob.type }))
      onChange({ src: dataUrl })
      setUrlInput('')
    } catch (e: any) {
      // Fallback: store the URL directly (works if CORS allows)
      onChange({ src: urlInput.trim() })
      setUrlInput('')
      setError(`Não foi possível baixar — usando link direto. Pode falhar se o host bloquear.`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Section title="Imagem">
        {el.src && (
          <div className="rounded-lg overflow-hidden border border-white/10 mb-2 aspect-video">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={el.src} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        <label className="flex items-center gap-2 px-3 py-2 rounded-lg glass hover:bg-white/10 cursor-pointer text-xs">
          <Upload size={12} />
          <span>{el.src ? 'Trocar imagem' : 'Enviar imagem'}</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
            }}
          />
        </label>

        <div className="flex gap-1.5 mt-2">
          <input
            type="text"
            placeholder="ou cole URL https://..."
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') loadFromUrl() }}
            className="flex-1 bg-white/5 border border-white/10 rounded-md px-2 py-1 text-[11px] focus:outline-none focus:border-blue-500/50"
          />
          <button
            onClick={loadFromUrl}
            disabled={!urlInput.trim() || loading}
            className="px-2 py-1 rounded-md glass hover:bg-white/10 text-[11px] disabled:opacity-40"
            type="button"
          >
            {loading ? <Loader2 size={11} className="animate-spin" /> : 'OK'}
          </button>
        </div>

        {el.src && (
          <button
            onClick={() => onChange({ src: '' })}
            className="mt-2 text-[10px] text-red-400 hover:text-red-300"
            type="button"
          >
            Remover imagem
          </button>
        )}

        <p className="text-[10px] text-gray-500 mt-1">
          Dica: copie qualquer imagem e cole com Cmd+V/Ctrl+V no canvas.
        </p>

        {error && (
          <div className="text-[10px] text-yellow-400 bg-yellow-500/10 rounded p-2 mt-2">{error}</div>
        )}
      </Section>

      <Section title="Ajuste">
        <SelectField
          label="Object-fit"
          value={el.objectFit ?? 'cover'}
          onChange={v => onChange({ objectFit: v as any })}
          options={['cover','contain','fill']}
        />
        <NumField label="Raio (px)" value={el.borderRadius ?? 0} onChange={v => onChange({ borderRadius: Math.round(v) })} min={0} max={9999} step={1} />
        <NumField label="Opacidade" value={el.opacity ?? 1} onChange={v => onChange({ opacity: v })} min={0} max={1} step={0.05} />
      </Section>
    </>
  )
}

/** Property panel for account badge (Instagram-style avatar + @handle). */
function AccountBadgePropsPanel({
  el, onChange,
}: {
  el: AccountBadgeElement
  onChange: (p: Partial<AccountBadgeElement>) => void
}) {
  const [avatarUrlInput, setAvatarUrlInput] = useState('')

  async function handleAvatarFile(file: File) {
    if (!file.type.startsWith('image/')) return
    if (file.size > 2 * 1024 * 1024) return
    const reader = new FileReader()
    reader.onload = () => onChange({ avatarUrl: String(reader.result) })
    reader.readAsDataURL(file)
  }

  return (
    <>
      <Section title="Handle">
        <input
          type="text"
          value={el.handle}
          onChange={e => onChange({ handle: e.target.value })}
          placeholder="@seu_perfil"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500/50"
        />
      </Section>

      <Section title="Avatar">
        {el.avatarUrl ? (
          <div className="flex items-center gap-2 mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={el.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover border border-white/10" />
            <button
              onClick={() => onChange({ avatarUrl: undefined })}
              className="text-[10px] text-red-400 hover:text-red-300"
              type="button"
            >
              Remover
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 border border-white/10" />
            <span className="text-[10px] text-gray-500">Sem avatar (mostra gradient Instagram)</span>
          </div>
        )}

        <label className="flex items-center gap-2 px-3 py-2 rounded-lg glass hover:bg-white/10 cursor-pointer text-xs">
          <Upload size={12} />
          <span>Enviar avatar</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) handleAvatarFile(f)
            }}
          />
        </label>

        <div className="flex gap-1.5 mt-2">
          <input
            type="text"
            placeholder="ou cole URL"
            value={avatarUrlInput}
            onChange={e => setAvatarUrlInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && avatarUrlInput.trim()) {
                onChange({ avatarUrl: avatarUrlInput.trim() })
                setAvatarUrlInput('')
              }
            }}
            className="flex-1 bg-white/5 border border-white/10 rounded-md px-2 py-1 text-[11px] focus:outline-none focus:border-blue-500/50"
          />
        </div>
      </Section>

      <Section title="Estilo">
        <FontField
          label="Fonte"
          value={el.fontFamily ?? 'Inter'}
          onChange={v => onChange({ fontFamily: v })}
        />
        <div className="grid grid-cols-2 gap-2">
          <NumField label="Tamanho fonte" value={el.fontSize ?? 22} onChange={v => onChange({ fontSize: Math.round(v) })} min={8} max={80} step={1} />
          <NumField label="Tamanho avatar" value={el.avatarSize ?? 36} onChange={v => onChange({ avatarSize: Math.round(v) })} min={16} max={120} step={1} />
          <NumField label="Peso" value={el.fontWeight ?? 600} onChange={v => onChange({ fontWeight: Math.round(v) })} min={100} max={900} step={100} />
        </div>
        <ColorField label="Cor do handle" value={el.color ?? '#111111'} onChange={v => onChange({ color: v })} />
      </Section>
    </>
  )
}

/**
 * Properties panel for icon elements. Picker with category filter + search.
 * Below the picker: color, stroke width, optional background pill.
 */
function IconPropsPanel({
  el, onChange,
}: {
  el: IconElement
  onChange: (p: Partial<IconElement>) => void
}) {
  const [query, setQuery] = useState('')
  const [cat,   setCat]   = useState<IconCategory | 'all'>('all')

  const filtered = useMemo(() => {
    let names = searchIcons(query)
    if (cat !== 'all') names = names.filter(n => TEMPLATE_ICONS[n].category === cat)
    return names
  }, [query, cat])

  return (
    <>
      <Section title="Ícone selecionado">
        <div className="flex items-center gap-2 glass rounded-lg p-2">
          {(() => {
            const meta = TEMPLATE_ICONS[el.iconName]
            if (!meta) return <span className="text-[11px] text-yellow-400">Ícone desconhecido: {el.iconName}</span>
            const Icon = meta.Icon
            return (
              <>
                <div
                  className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                  style={{ background: el.background, color: el.color ?? '#ffffff', border: el.background ? undefined : '1px solid rgba(255,255,255,0.1)' }}
                >
                  <Icon size={18} strokeWidth={el.strokeWidth ?? 2} />
                </div>
                <code className="text-[11px] text-purple-300">{el.iconName}</code>
                <span className="ml-auto text-[10px] text-gray-500">{CATEGORY_LABELS[meta.category]}</span>
              </>
            )
          })()}
        </div>
      </Section>

      <Section title="Buscar ícones">
        <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-md px-2">
          <Search size={11} className="text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar (check, seta, $...)"
            className="flex-1 bg-transparent py-1 text-[11px] focus:outline-none"
          />
        </div>
        <select
          value={cat}
          onChange={e => setCat(e.target.value as IconCategory | 'all')}
          className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1 text-[11px] focus:outline-none focus:border-blue-500/50"
        >
          <option value="all">Todas categorias</option>
          {(Object.keys(CATEGORY_LABELS) as IconCategory[]).map(c => (
            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
          ))}
        </select>

        <div className="grid grid-cols-6 gap-1 max-h-48 overflow-y-auto p-1 bg-black/20 rounded-md">
          {filtered.map(name => {
            const Icon = TEMPLATE_ICONS[name].Icon
            const isSel = name === el.iconName
            return (
              <button
                key={name}
                onClick={() => onChange({ iconName: name })}
                title={name}
                className={`aspect-square flex items-center justify-center rounded transition-all ${
                  isSel
                    ? 'bg-blue-500/30 border border-blue-500/60'
                    : 'hover:bg-white/10 border border-transparent'
                }`}
                type="button"
              >
                <Icon size={14} />
              </button>
            )
          })}
          {filtered.length === 0 && (
            <div className="col-span-6 text-center text-[10px] text-gray-500 py-3">
              Nenhum ícone encontrado
            </div>
          )}
        </div>
      </Section>

      <Section title="Estilo">
        <ColorField label="Cor" value={el.color ?? '#ffffff'} onChange={v => onChange({ color: v })} />
        <NumField label="Espessura traço" value={el.strokeWidth ?? 2} onChange={v => onChange({ strokeWidth: v })} min={0.5} max={3} step={0.25} />
        <ColorField label="Fundo (opcional)" value={el.background ?? ''} onChange={v => onChange({ background: v || undefined })} allowEmpty />
      </Section>

      {el.background && (
        <Section title="Padding/raio do fundo">
          <div className="grid grid-cols-3 gap-2">
            <NumField label="Pad-X" value={el.paddingX ?? 8} onChange={v => onChange({ paddingX: Math.round(v) })} min={0} max={80} step={1} />
            <NumField label="Pad-Y" value={el.paddingY ?? 8} onChange={v => onChange({ paddingY: Math.round(v) })} min={0} max={80} step={1} />
            <NumField label="Raio" value={el.borderRadius ?? 0} onChange={v => onChange({ borderRadius: Math.round(v) })} min={0} max={9999} step={1} />
          </div>
          <p className="text-[10px] text-gray-500">Dica: raio 9999 = círculo.</p>
        </Section>
      )}
    </>
  )
}

function ShapePropsPanel({ el, onChange }: { el: ShapeElement; onChange: (p: Partial<ShapeElement>) => void }) {
  return (
    <>
      <Section title="Tipo de forma">
        <SelectField
          label="Forma"
          value={el.shape}
          onChange={v => onChange({ shape: v as any })}
          options={['rectangle','circle']}
        />
      </Section>
      <Section title="Estilo">
        <ColorField label="Preenchimento" value={el.fill ?? '#0ea5e9'} onChange={v => onChange({ fill: v })} />
        <NumField label="Raio (px)" value={el.borderRadius ?? 0} onChange={v => onChange({ borderRadius: Math.round(v) })} min={0} max={9999} step={1} />
        <NumField label="Borda px" value={el.borderWidth ?? 0} onChange={v => onChange({ borderWidth: Math.round(v) })} min={0} max={40} step={1} />
        <ColorField label="Cor da borda" value={el.borderColor ?? '#000000'} onChange={v => onChange({ borderColor: v })} />
        <NumField label="Opacidade" value={el.opacity ?? 1} onChange={v => onChange({ opacity: v })} min={0} max={1} step={0.05} />
      </Section>
    </>
  )
}

function BackgroundPropsPanel({ el, onChange }: { el: BackgroundElement; onChange: (p: Partial<BackgroundElement>) => void }) {
  return (
    <Section title="Fundo">
      <ColorField label="Cor / gradient" value={el.fill} onChange={v => onChange({ fill: v })} />
      <p className="text-[10px] text-gray-500 mt-1">
        Aceita cor hex (`#0f172a`) ou gradient CSS (`linear-gradient(135deg, #1a0533, #d946ef)`).
      </p>
    </Section>
  )
}

/* ─── Right-panel: template metadata (when nothing selected) ────────── */

function TemplateMetaPanel({
  meta, canvasBg, onMetaChange, onCanvasBgChange,
}: {
  meta: TemplateMeta
  canvasBg: string
  onMetaChange: (p: Partial<TemplateMeta>) => void
  onCanvasBgChange: (v: string) => void
}) {
  return (
    <div className="space-y-4">
      <div className="text-xs text-gray-400">
        Selecione um elemento à esquerda para editar suas propriedades.
      </div>

      <Section title="Dados do template">
        <div>
          <label className="text-[10px] text-gray-400">Descrição</label>
          <textarea
            value={meta.description}
            onChange={e => onMetaChange({ description: e.target.value })}
            rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:border-blue-500/50 mt-1"
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-400 mb-1 block">Modo</label>
          <div className="grid grid-cols-3 gap-1">
            {(['creative','carousel','both'] as const).map(m => (
              <button
                key={m}
                onClick={() => onMetaChange({ mode: m })}
                className={`text-[11px] px-2 py-1.5 rounded-lg ${
                  meta.mode === m ? 'bg-blue-500/20 border border-blue-500/40' : 'glass'
                }`}
              >
                {m === 'creative' ? 'Criativo' : m === 'carousel' ? 'Carrossel' : 'Ambos'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <label className="text-xs">Ativo</label>
          <Toggle value={meta.active} onChange={v => onMetaChange({ active: v })} />
        </div>
        <div className="flex items-center justify-between">
          <label className="text-xs">Publicado</label>
          <Toggle value={meta.published} onChange={v => onMetaChange({ published: v })} />
        </div>
      </Section>

      <Section title="Canvas">
        <ColorField label="Fundo do canvas" value={canvasBg} onChange={onCanvasBgChange} />
      </Section>
    </div>
  )
}

/* ─── Tiny atoms ────────────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function NumField({
  label, value, onChange, min, max, step,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number; max: number; step: number
}) {
  return (
    <label className="flex flex-col">
      <span className="text-[10px] text-gray-400">{label}</span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        onChange={e => {
          const v = parseFloat(e.target.value)
          if (Number.isFinite(v)) onChange(v)
        }}
        min={min} max={max} step={step}
        className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs focus:outline-none focus:border-blue-500/50"
      />
    </label>
  )
}

function SelectField({
  label, value, onChange, options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  return (
    <label className="flex flex-col">
      <span className="text-[10px] text-gray-400">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs focus:outline-none focus:border-blue-500/50"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  )
}

/**
 * Font picker — renders each option in its actual face so the admin can
 * see what each font looks like. The Google Fonts <link> is loaded in
 * the page wrapper; if a font isn't loaded yet, browser falls back.
 */
function FontField({
  label, value, onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="flex flex-col">
      <span className="text-[10px] text-gray-400">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs focus:outline-none focus:border-blue-500/50"
        style={{ fontFamily: value }}
      >
        {(['sans','display','serif','handwriting','mono','system'] as const).map(group => (
          <optgroup
            key={group}
            label={
              group === 'sans'        ? 'Sans modernas' :
              group === 'display'     ? 'Display impacto' :
              group === 'serif'       ? 'Serif premium' :
              group === 'handwriting' ? 'Handwriting / Decorativas' :
              group === 'mono'        ? 'Monoespaçada' :
                                        'Sistema'
            }
          >
            {FONT_OPTIONS.filter(f => f.group === group).map(f => (
              <option key={f.name} value={f.name} style={{ fontFamily: f.name }}>
                {f.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  )
}

function ColorField({
  label, value, onChange, allowEmpty = false, placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  allowEmpty?: boolean
  placeholder?: string
}) {
  const isHex = /^#[0-9a-fA-F]{6}$/.test(value)
  return (
    <label className="flex flex-col">
      <span className="text-[10px] text-gray-400">{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={isHex ? value : '#000000'}
          onChange={e => onChange(e.target.value)}
          className="w-7 h-7 rounded border border-white/10 cursor-pointer bg-transparent"
        />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder ?? (allowEmpty ? 'transparente' : '#000000')}
          className="flex-1 bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs font-mono focus:outline-none focus:border-blue-500/50"
        />
      </div>
    </label>
  )
}

function ActionBtn({
  icon: Icon, label, onClick, danger,
}: {
  icon: LucideIcon; label: string; onClick: () => void; danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] transition-all ${
        danger ? 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20' : 'glass hover:bg-white/10'
      }`}
    >
      <Icon size={11} />
      <span>{label}</span>
    </button>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`w-10 h-5 rounded-full transition-all relative ${value ? 'bg-blue-500' : 'bg-gray-600'}`}
      type="button"
    >
      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${value ? 'left-5' : 'left-0.5'}`} />
    </button>
  )
}
