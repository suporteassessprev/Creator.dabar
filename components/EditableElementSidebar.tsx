'use client'

/**
 * Sidebar (right-panel) version of the element editor that used to be
 * a floating toolbar. Lives in the editor page's right column so it
 * never overlaps the canvas while editing text/images.
 *
 * Shows controls relevant to the element type:
 *   - text_*: font family, font size (+/-), text color, accent color, weight
 *   - image_slot: object-fit, X/Y focal point sliders
 *
 * When nothing is selected, shows a friendly placeholder telling the
 * user to click on an element in the canvas.
 */
import {
  TemplateElement,
  TextElement,
  ImageSlotElement,
} from '@/lib/template-structure'
import {
  Type, Plus, Minus, Palette, MoveHorizontal, MoveVertical,
  Image as ImageIcon, MousePointerClick, X,
} from 'lucide-react'

const FONT_OPTIONS = [
  // Modern
  'Geist', 'Outfit', 'Plus Jakarta Sans', 'Space Grotesk', 'Sora',
  'Onest', 'Lexend', 'Hanken Grotesk', 'Albert Sans', 'Bricolage Grotesque',
  // Classic
  'Inter', 'Poppins', 'Montserrat', 'Roboto', 'Lato', 'Work Sans',
  // Display
  'Bebas Neue', 'Anton', 'Oswald', 'Archivo Black', 'Bungee',
  'Russo One', 'Alfa Slab One',
  // Serif
  'Playfair Display', 'DM Serif Display', 'Merriweather', 'Lora',
  // Handwriting
  'Caveat', 'Permanent Marker', 'Pacifico', 'Patrick Hand',
]

interface Props {
  element: TemplateElement | null
  onChange: (patch: Partial<TemplateElement>) => void
  onDeselect: () => void
}

export default function EditableElementSidebar({
  element, onChange, onDeselect,
}: Props) {
  if (!element) {
    return (
      <div className="flex flex-col items-center justify-center text-center px-6 py-16 text-gray-500">
        <MousePointerClick size={32} className="mb-3 text-gray-600" />
        <p className="text-sm font-semibold text-gray-300 mb-1">
          Selecione um elemento
        </p>
        <p className="text-xs text-gray-500 leading-relaxed">
          Clique num texto ou imagem do slide pra editar fonte, tamanho, cor e posição.
        </p>
      </div>
    )
  }

  const isText =
    element.type === 'text_headline'
    || element.type === 'text_subtitle'
    || element.type === 'text_cta'
    || element.type === 'badge'

  const isImageSlot = element.type === 'image_slot'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isText
            ? <Type size={14} className="text-blue-400" />
            : <ImageIcon size={14} className="text-pink-400" />}
          <span className="text-xs font-semibold text-gray-200">
            {labelForType(element.type)}
          </span>
        </div>
        <button
          onClick={onDeselect}
          className="p-1 rounded-md hover:bg-white/10 text-gray-500"
          title="Desmarcar"
          type="button"
        >
          <X size={12} />
        </button>
      </div>

      {isText && (
        <TextControls
          el={element as TextElement}
          onChange={onChange}
        />
      )}

      {isImageSlot && (
        <ImageSlotControls
          el={element as ImageSlotElement}
          onChange={onChange}
        />
      )}

      {!isText && !isImageSlot && (
        <p className="text-xs text-gray-500">
          Este elemento não tem propriedades editáveis. Arraste no canvas pra mover ou redimensionar.
        </p>
      )}
    </div>
  )
}

function labelForType(type: TemplateElement['type']): string {
  switch (type) {
    case 'text_headline': return 'Título'
    case 'text_subtitle': return 'Subtítulo'
    case 'text_cta':      return 'CTA'
    case 'badge':         return 'Badge'
    case 'image_slot':    return 'Imagem (IA)'
    case 'image_static':  return 'Imagem fixa'
    case 'account_badge': return 'Conta'
    case 'icon':          return 'Ícone'
    case 'shape':         return 'Forma'
    case 'background':    return 'Fundo'
    default:              return 'Elemento'
  }
}

function TextControls({
  el, onChange,
}: {
  el: TextElement
  onChange: (p: Partial<TextElement>) => void
}) {
  const fontSize = el.fontSize ?? 32
  return (
    <>
      {/* Font family */}
      <div>
        <label className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 block font-semibold">
          Fonte
        </label>
        <select
          value={el.fontFamily ?? 'Inter'}
          onChange={e => onChange({ fontFamily: e.target.value })}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500/50"
          style={{ fontFamily: el.fontFamily ?? 'Inter' }}
        >
          {FONT_OPTIONS.map(f => (
            <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
          ))}
        </select>
      </div>

      {/* Font size — input numérico + slider */}
      <div>
        <label className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 block font-semibold">
          Tamanho
        </label>
        <div className="flex items-center bg-white/5 border border-white/10 rounded-lg mb-2">
          <button
            onClick={() => onChange({ fontSize: Math.max(8, fontSize - 4) })}
            className="px-3 py-2 hover:bg-white/10 text-gray-300 transition-colors"
            type="button"
            title="Diminuir"
          >
            <Minus size={14} />
          </button>
          <input
            type="number"
            min={8}
            max={200}
            value={fontSize}
            onChange={e => {
              const v = parseInt(e.target.value, 10)
              if (!Number.isNaN(v)) onChange({ fontSize: Math.max(8, Math.min(200, v)) })
            }}
            className="flex-1 bg-transparent text-center text-sm font-mono text-gray-200 outline-none border-x border-white/10 py-2 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <button
            onClick={() => onChange({ fontSize: Math.min(200, fontSize + 4) })}
            className="px-3 py-2 hover:bg-white/10 text-gray-300 transition-colors"
            type="button"
            title="Aumentar"
          >
            <Plus size={14} />
          </button>
        </div>
        <input
          type="range"
          min={8}
          max={200}
          step={1}
          value={fontSize}
          onChange={e => onChange({ fontSize: Number(e.target.value) })}
          className="w-full accent-blue-500"
          title="Arraste pra ajustar"
        />
      </div>

      {/* Weight */}
      <div>
        <label className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 block font-semibold">
          Peso
        </label>
        <div className="grid grid-cols-4 gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
          {[400, 600, 700, 900].map(w => (
            <button
              key={w}
              onClick={() => onChange({ fontWeight: w })}
              className={`py-1.5 text-[11px] rounded-md transition-all ${
                (el.fontWeight ?? 700) === w
                  ? 'bg-blue-500/30 text-blue-200'
                  : 'text-gray-400 hover:bg-white/10'
              }`}
              type="button"
              style={{ fontWeight: w }}
              title={`Peso ${w}`}
            >
              {w === 400 ? 'Regular' : w === 600 ? 'Semi' : w === 700 ? 'Bold' : 'Black'}
            </button>
          ))}
        </div>
      </div>

      {/* Colors */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 block font-semibold flex items-center gap-1">
            <Palette size={10} /> Cor
          </label>
          <label className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-2 py-2 cursor-pointer hover:bg-white/10">
            <input
              type="color"
              value={el.color ?? '#ffffff'}
              onChange={e => onChange({ color: e.target.value })}
              className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
            />
            <span className="text-[10px] font-mono text-gray-400 truncate">
              {(el.color ?? '#ffffff').toUpperCase()}
            </span>
          </label>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 block font-semibold flex items-center gap-1">
            <span className="text-amber-300">*</span> Destaque
          </label>
          <label className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-2 py-2 cursor-pointer hover:bg-white/10">
            <input
              type="color"
              value={el.accentColor ?? '#facc15'}
              onChange={e => onChange({ accentColor: e.target.value })}
              className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
            />
            <span className="text-[10px] font-mono text-gray-400 truncate">
              {(el.accentColor ?? '#facc15').toUpperCase()}
            </span>
          </label>
        </div>
      </div>

      <p className="text-[10px] text-gray-500 leading-relaxed">
        Dica: envolva palavras em <code className="text-amber-300">*asteriscos*</code> pra aplicar a cor de destaque.
      </p>
    </>
  )
}

function ImageSlotControls({
  el, onChange,
}: {
  el: ImageSlotElement
  onChange: (p: Partial<ImageSlotElement>) => void
}) {
  const posX = el.objectPositionX ?? 50
  const posY = el.objectPositionY ?? 50
  return (
    <>
      {/* Object-fit */}
      <div>
        <label className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 block font-semibold">
          Modo de encaixe
        </label>
        <select
          value={el.objectFit ?? 'cover'}
          onChange={e => onChange({ objectFit: e.target.value as any })}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500/50"
        >
          <option value="cover">Preencher (corta sobras)</option>
          <option value="contain">Caber inteira</option>
          <option value="fill">Esticar</option>
        </select>
      </div>

      {/* X focal point */}
      <div>
        <label className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 block font-semibold flex items-center gap-1">
          <MoveHorizontal size={11} /> Foco horizontal
        </label>
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={posX}
            onChange={e => onChange({ objectPositionX: Number(e.target.value) })}
            className="flex-1 accent-blue-500"
          />
          <span className="text-[10px] font-mono text-gray-400 w-9 text-right">{posX}%</span>
        </div>
      </div>

      {/* Y focal point */}
      <div>
        <label className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 block font-semibold flex items-center gap-1">
          <MoveVertical size={11} /> Foco vertical
        </label>
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={posY}
            onChange={e => onChange({ objectPositionY: Number(e.target.value) })}
            className="flex-1 accent-blue-500"
          />
          <span className="text-[10px] font-mono text-gray-400 w-9 text-right">{posY}%</span>
        </div>
        <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
          Diminui pra mostrar o topo (ex: cabeça da pessoa). Aumenta pra ver mais embaixo.
        </p>
      </div>
    </>
  )
}
