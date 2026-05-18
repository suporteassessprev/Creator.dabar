'use client'

/**
 * Floating toolbar that appears next to the currently selected element
 * in EditableTemplateCanvas. Shows quick edits relevant to the element
 * type:
 *   - text_*: font family, font size (+/-), color, accent color
 *   - image_slot: object-fit, X/Y focal point sliders (to reposition
 *     the inner image without cropping faces)
 *
 * The toolbar is rendered OUTSIDE the canvas to avoid being affected
 * by html2canvas during export (it sits in screen-space, not canvas-space).
 */
import { useRef, useEffect, useState } from 'react'
import {
  TemplateElement,
  TextElement,
  ImageSlotElement,
} from '@/lib/template-structure'
import { Type, Plus, Minus, Palette, MoveHorizontal, MoveVertical, X } from 'lucide-react'

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
  canvasRect: DOMRect | null
  onChange: (patch: Partial<TemplateElement>) => void
  onClose: () => void
}

export default function EditableElementToolbar({
  element, canvasRect, onChange, onClose,
}: Props) {
  if (!element || !canvasRect) return null

  // Position the toolbar above the element (in screen coordinates).
  const elementTopPx  = canvasRect.top + (element.y / 100) * canvasRect.height
  const elementLeftPx = canvasRect.left + (element.x / 100) * canvasRect.width
  const elementWidth  = (element.width / 100) * canvasRect.width

  // Clamp to viewport
  const toolbarTop  = Math.max(8, elementTopPx - 56)
  const toolbarLeft = Math.max(8, Math.min(window.innerWidth - 420, elementLeftPx + elementWidth / 2 - 200))

  return (
    <div
      data-editor-overlay
      style={{
        position: 'fixed',
        top: toolbarTop,
        left: toolbarLeft,
        zIndex: 9999,
      }}
    >
      <div className="glass border border-white/15 rounded-xl px-2 py-1.5 flex items-center gap-1.5 shadow-2xl"
           style={{ background: 'rgba(15, 23, 42, 0.96)', backdropFilter: 'blur(12px)' }}>
        {(element.type === 'text_headline'
          || element.type === 'text_subtitle'
          || element.type === 'text_cta'
          || element.type === 'badge') && (
          <TextControls el={element as TextElement} onChange={onChange} />
        )}
        {element.type === 'image_slot' && (
          <ImageSlotControls el={element as ImageSlotElement} onChange={onChange} />
        )}
        <button
          onClick={onClose}
          className="ml-1 p-1 rounded-md hover:bg-white/10 text-gray-400"
          type="button"
          title="Fechar"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  )
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
      {/* Font family dropdown */}
      <select
        value={el.fontFamily ?? 'Inter'}
        onChange={e => onChange({ fontFamily: e.target.value })}
        className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-[11px] focus:outline-none focus:border-blue-500/50 max-w-[140px]"
        style={{ fontFamily: el.fontFamily ?? 'Inter' }}
        title="Fonte"
      >
        {FONT_OPTIONS.map(f => (
          <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
        ))}
      </select>

      {/* Font size +/- */}
      <div className="flex items-center bg-white/5 border border-white/10 rounded-md">
        <button
          onClick={() => onChange({ fontSize: Math.max(8, fontSize - 4) })}
          className="px-1.5 py-1 hover:bg-white/10 text-gray-300"
          type="button"
          title="Diminuir fonte"
        >
          <Minus size={11} />
        </button>
        <span className="px-2 text-[11px] font-mono text-gray-300 min-w-[28px] text-center">
          {fontSize}
        </span>
        <button
          onClick={() => onChange({ fontSize: Math.min(200, fontSize + 4) })}
          className="px-1.5 py-1 hover:bg-white/10 text-gray-300"
          type="button"
          title="Aumentar fonte"
        >
          <Plus size={11} />
        </button>
      </div>

      {/* Color picker */}
      <label
        className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-md px-1.5 py-1 cursor-pointer hover:bg-white/10"
        title="Cor do texto"
      >
        <Palette size={11} className="text-gray-300" />
        <input
          type="color"
          value={el.color ?? '#ffffff'}
          onChange={e => onChange({ color: e.target.value })}
          className="w-4 h-4 rounded cursor-pointer bg-transparent border-0"
        />
      </label>

      {/* Accent color (for *asterisks*) */}
      <label
        className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-md px-1.5 py-1 cursor-pointer hover:bg-white/10"
        title="Cor de destaque (palavras entre *asteriscos*)"
      >
        <span className="text-[10px] text-amber-300">*</span>
        <input
          type="color"
          value={el.accentColor ?? '#facc15'}
          onChange={e => onChange({ accentColor: e.target.value })}
          className="w-4 h-4 rounded cursor-pointer bg-transparent border-0"
        />
      </label>

      {/* Weight buttons */}
      <div className="flex items-center bg-white/5 border border-white/10 rounded-md">
        {[400, 600, 700, 900].map(w => (
          <button
            key={w}
            onClick={() => onChange({ fontWeight: w })}
            className={`px-1.5 py-1 text-[10px] font-mono transition-all ${
              (el.fontWeight ?? 700) === w
                ? 'bg-blue-500/30 text-blue-200'
                : 'text-gray-400 hover:bg-white/10'
            }`}
            type="button"
            title={`Peso ${w}`}
            style={{ fontWeight: w }}
          >
            {w === 400 ? 'R' : w === 600 ? 'SB' : w === 700 ? 'B' : 'Bk'}
          </button>
        ))}
      </div>
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
      {/* Object-fit toggle */}
      <select
        value={el.objectFit ?? 'cover'}
        onChange={e => onChange({ objectFit: e.target.value as any })}
        className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-[11px] focus:outline-none focus:border-blue-500/50"
        title="Modo de encaixe"
      >
        <option value="cover">Preencher (cover)</option>
        <option value="contain">Caber inteira (contain)</option>
        <option value="fill">Esticar (fill)</option>
      </select>

      {/* X focal point */}
      <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-md px-2 py-1">
        <MoveHorizontal size={11} className="text-gray-300" />
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={posX}
          onChange={e => onChange({ objectPositionX: Number(e.target.value) })}
          className="w-20 accent-blue-500"
          title="Foco horizontal"
        />
        <span className="text-[10px] font-mono text-gray-400 w-7 text-right">{posX}%</span>
      </div>

      {/* Y focal point — útil pra não cortar cabeça de pessoa */}
      <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-md px-2 py-1">
        <MoveVertical size={11} className="text-gray-300" />
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={posY}
          onChange={e => onChange({ objectPositionY: Number(e.target.value) })}
          className="w-20 accent-blue-500"
          title="Foco vertical (rolar imagem dentro do slot)"
        />
        <span className="text-[10px] font-mono text-gray-400 w-7 text-right">{posY}%</span>
      </div>
    </>
  )
}
