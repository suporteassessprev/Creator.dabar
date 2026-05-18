/**
 * Curated template presets inspired by viral carousel aesthetics
 * (MyPostFlow / typical IG viral layouts).
 *
 * Used by the admin "Seedar exemplos" button to populate the DB
 * with a few starting templates. Each preset is self-contained
 * (TemplateStructure JSON + metadata) and gets cloned into the
 * Template table — admin can edit/publish them afterwards.
 *
 * Seeding is idempotent: it skips presets whose `name` already
 * exists in the DB.
 */
import type { TemplateStructure } from './template-structure'

export interface TemplatePreset {
  name: string
  description: string
  mode: 'creative' | 'carousel' | 'both'
  format: 'square' | 'feed-vertical' | 'story'
  palette: { bg: string; accent: string; text: string; theme: 'dark' | 'light' }
  structure: TemplateStructure
}

/* Helper to mint stable-ish ids for the structure JSON (no need for
 * crypto-strong uniqueness here — the structure is just rendering
 * data and ids only need to be unique within a single template). */
function id(prefix: string, suffix: string): string {
  return `${prefix}_${suffix}`
}

/* ──────────────────────────────────────────────────────────────────
 * 1. Foto viral fullbleed + gradient + headline embaixo
 * ────────────────────────────────────────────────────────────────── */
const fotoViralBottom: TemplatePreset = {
  name: 'Foto Viral — Headline embaixo',
  description: 'Foto IA cobrindo o slide inteiro com gradient escuro embaixo. Headline + subtítulo na metade inferior. Estilo MyPostFlow.',
  mode: 'creative',
  format: 'square',
  palette: { bg: '#0a0a0f', accent: '#f97316', text: '#ffffff', theme: 'dark' },
  structure: {
    version: 1,
    canvas: { format: '1:1', backgroundColor: '#0a0a0f' },
    elements: [
      {
        id: id('bg', 'viral1'),
        type: 'background',
        x: 0, y: 0, width: 100, height: 100,
        zIndex: 0,
        fill: '#0a0a0f',
      },
      {
        id: id('img', 'viral1'),
        type: 'image_slot',
        x: 0, y: 0, width: 100, height: 100,
        zIndex: 1,
        description: 'Foto IA fullbleed — pessoa, ambiente cinematográfico, alta qualidade',
        objectFit: 'cover',
        objectPositionX: 50,
        objectPositionY: 40,
        overlay: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 35%, rgba(0,0,0,0.75) 70%, rgba(0,0,0,0.95) 100%)',
      },
      {
        id: id('badge', 'viral1'),
        type: 'account_badge',
        x: 5, y: 5, width: 50, height: 6,
        zIndex: 20,
        handle: '@seu.usuario',
        fontFamily: 'Inter',
        fontSize: 22,
        fontWeight: 600,
        color: '#ffffff',
        avatarSize: 32,
      },
      {
        id: id('hl', 'viral1'),
        type: 'text_headline',
        x: 6, y: 58, width: 88, height: 22,
        zIndex: 10,
        placeholder: 'O *CARROSSEL* QUE VOCÊ NÃO ACREDITA',
        fontFamily: 'Anton',
        fontSize: 76,
        fontWeight: 900,
        color: '#ffffff',
        accentColor: '#f97316',
        align: 'left',
        lineHeight: 0.95,
      },
      {
        id: id('sub', 'viral1'),
        type: 'text_subtitle',
        x: 6, y: 85, width: 88, height: 10,
        zIndex: 10,
        placeholder: 'Cada slide, cada palavra, cada imagem que você está vendo foi criada por uma única IA.',
        fontFamily: 'Inter',
        fontSize: 22,
        fontWeight: 400,
        color: '#e2e8f0',
        align: 'left',
        lineHeight: 1.35,
      },
    ],
  },
}

/* ──────────────────────────────────────────────────────────────────
 * 2. Headline gigante topo + foto embaixo (editorial)
 * ────────────────────────────────────────────────────────────────── */
const headlineGiganteFoto: TemplatePreset = {
  name: 'Editorial — Headline gigante + foto',
  description: 'Headline ocupando o topo, foto IA no rodapé com bordas arredondadas. Estilo revista digital.',
  mode: 'both',
  format: 'square',
  palette: { bg: '#0f172a', accent: '#facc15', text: '#ffffff', theme: 'dark' },
  structure: {
    version: 1,
    canvas: { format: '1:1', backgroundColor: '#0f172a' },
    elements: [
      {
        id: id('bg', 'edt'),
        type: 'background',
        x: 0, y: 0, width: 100, height: 100,
        zIndex: 0,
        fill: '#0f172a',
      },
      {
        id: id('badge', 'edt'),
        type: 'account_badge',
        x: 6, y: 4, width: 50, height: 5,
        zIndex: 20,
        handle: '@seu.usuario',
        fontFamily: 'Inter',
        fontSize: 20,
        fontWeight: 600,
        color: '#cbd5e1',
        avatarSize: 28,
      },
      {
        id: id('hl', 'edt'),
        type: 'text_headline',
        x: 6, y: 14, width: 88, height: 35,
        zIndex: 10,
        placeholder: 'A *MÁGICA* POR TRÁS DO *VIRAL*',
        fontFamily: 'Archivo Black',
        fontSize: 92,
        fontWeight: 900,
        color: '#ffffff',
        accentColor: '#facc15',
        align: 'left',
        lineHeight: 0.92,
      },
      {
        id: id('img', 'edt'),
        type: 'image_slot',
        x: 6, y: 52, width: 88, height: 36,
        zIndex: 5,
        description: 'Foto IA — visual da história, com bordas arredondadas',
        objectFit: 'cover',
        objectPositionX: 50,
        objectPositionY: 50,
        borderRadius: 24,
      },
      {
        id: id('sub', 'edt'),
        type: 'text_subtitle',
        x: 6, y: 91, width: 88, height: 6,
        zIndex: 10,
        placeholder: 'Algoritmos que pensam como os melhores designers.',
        fontFamily: 'Inter',
        fontSize: 20,
        fontWeight: 500,
        color: '#94a3b8',
        align: 'left',
        lineHeight: 1.3,
      },
    ],
  },
}

/* ──────────────────────────────────────────────────────────────────
 * 3. Story vertical fullbleed (9:16)
 * ────────────────────────────────────────────────────────────────── */
const storyFullbleed: TemplatePreset = {
  name: 'Story — Fullbleed cinematográfico',
  description: 'Story 9:16 com foto IA cobrindo tudo, gradient escuro, headline no centro. Pra anúncio ou story viral.',
  mode: 'creative',
  format: 'story',
  palette: { bg: '#000000', accent: '#ef4444', text: '#ffffff', theme: 'dark' },
  structure: {
    version: 1,
    canvas: { format: '9:16', backgroundColor: '#000000' },
    elements: [
      {
        id: id('bg', 'sty'),
        type: 'background',
        x: 0, y: 0, width: 100, height: 100,
        zIndex: 0,
        fill: '#000000',
      },
      {
        id: id('img', 'sty'),
        type: 'image_slot',
        x: 0, y: 0, width: 100, height: 100,
        zIndex: 1,
        description: 'Foto IA cinematográfica — close, dramática',
        objectFit: 'cover',
        objectPositionX: 50,
        objectPositionY: 40,
        overlay: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 25%, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0.92) 100%)',
      },
      {
        id: id('badge', 'sty'),
        type: 'account_badge',
        x: 5, y: 4, width: 60, height: 4,
        zIndex: 20,
        handle: '@seu.usuario',
        fontFamily: 'Inter',
        fontSize: 18,
        fontWeight: 700,
        color: '#ffffff',
        avatarSize: 28,
      },
      {
        id: id('hl', 'sty'),
        type: 'text_headline',
        x: 6, y: 38, width: 88, height: 32,
        zIndex: 10,
        placeholder: '*IMPOSSÍVEL?* ERA O QUE EU *PENSAVA*',
        fontFamily: 'Bebas Neue',
        fontSize: 110,
        fontWeight: 700,
        color: '#ffffff',
        accentColor: '#ef4444',
        align: 'center',
        lineHeight: 0.95,
      },
      {
        id: id('sub', 'sty'),
        type: 'text_subtitle',
        x: 8, y: 78, width: 84, height: 8,
        zIndex: 10,
        placeholder: 'A criação de conteúdo viral nunca foi tão simples.',
        fontFamily: 'Inter',
        fontSize: 20,
        fontWeight: 500,
        color: '#e2e8f0',
        align: 'center',
        lineHeight: 1.3,
      },
      {
        id: id('cta', 'sty'),
        type: 'text_cta',
        x: 25, y: 89, width: 50, height: 5,
        zIndex: 10,
        placeholder: 'SAIBA MAIS',
        fontFamily: 'Inter',
        fontSize: 18,
        fontWeight: 800,
        color: '#000000',
        background: '#ffffff',
        align: 'center',
        borderRadius: 999,
        paddingX: 28,
        paddingY: 12,
      },
    ],
  },
}

/* ──────────────────────────────────────────────────────────────────
 * 4. Card claro corporate (1:1)
 * ────────────────────────────────────────────────────────────────── */
const cardClaroCorporate: TemplatePreset = {
  name: 'Card Claro — B2B / produto',
  description: 'Fundo branco off, headline preta no topo, foto IA centralizada com bordas suaves. Pra anúncio de produto.',
  mode: 'both',
  format: 'square',
  palette: { bg: '#f8fafc', accent: '#0ea5e9', text: '#0f172a', theme: 'light' },
  structure: {
    version: 1,
    canvas: { format: '1:1', backgroundColor: '#f8fafc' },
    elements: [
      {
        id: id('bg', 'clr'),
        type: 'background',
        x: 0, y: 0, width: 100, height: 100,
        zIndex: 0,
        fill: '#f8fafc',
      },
      {
        id: id('badge', 'clr'),
        type: 'account_badge',
        x: 6, y: 4, width: 50, height: 5,
        zIndex: 20,
        handle: '@seu.usuario',
        fontFamily: 'Inter',
        fontSize: 20,
        fontWeight: 600,
        color: '#475569',
        avatarSize: 28,
      },
      {
        id: id('hl', 'clr'),
        type: 'text_headline',
        x: 6, y: 13, width: 88, height: 22,
        zIndex: 10,
        placeholder: 'COMO ELES CONSEGUIRAM ESSE *ELENCO* DOS SONHOS?',
        fontFamily: 'Archivo Black',
        fontSize: 60,
        fontWeight: 900,
        color: '#0f172a',
        accentColor: '#0ea5e9',
        align: 'left',
        lineHeight: 0.95,
      },
      {
        id: id('img', 'clr'),
        type: 'image_slot',
        x: 6, y: 38, width: 88, height: 50,
        zIndex: 5,
        description: 'Foto IA — produto, pessoa ou cena. Bordas arredondadas.',
        objectFit: 'cover',
        objectPositionX: 50,
        objectPositionY: 50,
        borderRadius: 28,
      },
      {
        id: id('sub', 'clr'),
        type: 'text_subtitle',
        x: 6, y: 91, width: 88, height: 6,
        zIndex: 10,
        placeholder: 'Mais que brinquedos, é *legado* puro.',
        fontFamily: 'Inter',
        fontSize: 22,
        fontWeight: 500,
        color: '#334155',
        accentColor: '#0ea5e9',
        align: 'left',
        lineHeight: 1.3,
      },
    ],
  },
}

/* ──────────────────────────────────────────────────────────────────
 * 5. Feed vertical 4:5 — diagonal gradient
 * ────────────────────────────────────────────────────────────────── */
const feedVerticalDiagonal: TemplatePreset = {
  name: 'Feed 4:5 — Diagonal cinemática',
  description: 'Formato 4:5 com foto IA + gradient diagonal (canto inferior esquerdo escuro). Headline e CTA na parte de baixo.',
  mode: 'creative',
  format: 'feed-vertical',
  palette: { bg: '#0a0a0f', accent: '#d946ef', text: '#ffffff', theme: 'dark' },
  structure: {
    version: 1,
    canvas: { format: '4:5', backgroundColor: '#0a0a0f' },
    elements: [
      {
        id: id('bg', 'fdv'),
        type: 'background',
        x: 0, y: 0, width: 100, height: 100,
        zIndex: 0,
        fill: '#0a0a0f',
      },
      {
        id: id('img', 'fdv'),
        type: 'image_slot',
        x: 0, y: 0, width: 100, height: 100,
        zIndex: 1,
        description: 'Foto IA fullbleed — vibrante, com pessoa ou cena',
        objectFit: 'cover',
        objectPositionX: 60,
        objectPositionY: 40,
        overlay: 'linear-gradient(135deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.1) 45%, rgba(217,70,239,0.4) 75%, rgba(10,10,15,0.95) 100%)',
      },
      {
        id: id('badge', 'fdv'),
        type: 'account_badge',
        x: 5, y: 4, width: 55, height: 4,
        zIndex: 20,
        handle: '@seu.usuario',
        fontFamily: 'Inter',
        fontSize: 18,
        fontWeight: 700,
        color: '#ffffff',
        avatarSize: 28,
      },
      {
        id: id('hl', 'fdv'),
        type: 'text_headline',
        x: 6, y: 62, width: 88, height: 22,
        zIndex: 10,
        placeholder: 'PARE DE *ADIVINHAR* COMECE A *VIRALIZAR*',
        fontFamily: 'Anton',
        fontSize: 78,
        fontWeight: 900,
        color: '#ffffff',
        accentColor: '#d946ef',
        align: 'left',
        lineHeight: 0.95,
      },
      {
        id: id('sub', 'fdv'),
        type: 'text_subtitle',
        x: 6, y: 86, width: 65, height: 8,
        zIndex: 10,
        placeholder: 'Crie seu primeiro carrossel viral em minutos.',
        fontFamily: 'Inter',
        fontSize: 20,
        fontWeight: 500,
        color: '#e2e8f0',
        align: 'left',
        lineHeight: 1.3,
      },
      {
        id: id('cta', 'fdv'),
        type: 'text_cta',
        x: 75, y: 86, width: 20, height: 8,
        zIndex: 10,
        placeholder: '→',
        fontFamily: 'Inter',
        fontSize: 28,
        fontWeight: 900,
        color: '#ffffff',
        background: '#d946ef',
        align: 'center',
        borderRadius: 999,
        paddingX: 16,
        paddingY: 12,
      },
    ],
  },
}

/* ──────────────────────────────────────────────────────────────────
 * 6. Notícia urgente — faixa vermelha + serif + foto embaixo
 * ────────────────────────────────────────────────────────────────── */
const noticiaUrgente: TemplatePreset = {
  name: 'Notícia Urgente — Manchete + Foto',
  description: 'Faixa vermelha "URGENTE" no topo, manchete em serif preta, subtítulo cinza e foto IA embaixo. Estilo notícia / clickbait premium.',
  mode: 'creative',
  format: 'square',
  palette: { bg: '#ffffff', accent: '#dc2626', text: '#0f172a', theme: 'light' },
  structure: {
    version: 1,
    canvas: { format: '1:1', backgroundColor: '#ffffff' },
    elements: [
      {
        id: id('bg', 'news'),
        type: 'background',
        x: 0, y: 0, width: 100, height: 100,
        zIndex: 0,
        fill: '#ffffff',
      },
      {
        id: id('urgent', 'news'),
        type: 'text_headline',
        x: 0, y: 0, width: 100, height: 11,
        zIndex: 10,
        placeholder: 'URGENTE',
        fontFamily: 'Archivo Black',
        fontSize: 64,
        fontWeight: 900,
        color: '#ffffff',
        background: '#dc2626',
        align: 'center',
        letterSpacing: 4,
        paddingX: 0,
        paddingY: 0,
        borderRadius: 0,
      },
      {
        id: id('hl', 'news'),
        type: 'text_headline',
        x: 6, y: 14, width: 88, height: 26,
        zIndex: 10,
        placeholder: 'Mães com filhos que nasceram entre 2021 e 2026 recebem auxílio de mais de *R$ 6 mil*',
        fontFamily: 'Merriweather',
        fontSize: 46,
        fontWeight: 900,
        color: '#0f172a',
        accentColor: '#dc2626',
        align: 'center',
        lineHeight: 1.15,
      },
      {
        id: id('sub', 'news'),
        type: 'text_subtitle',
        x: 10, y: 42, width: 80, height: 8,
        zIndex: 10,
        placeholder: 'O valor é destinado a mães de crianças com menos de 5 anos e pode passar de R$ 6.000',
        fontFamily: 'Inter',
        fontSize: 22,
        fontWeight: 400,
        color: '#64748b',
        align: 'center',
        lineHeight: 1.35,
      },
      {
        id: id('img', 'news'),
        type: 'image_slot',
        x: 4, y: 53, width: 92, height: 38,
        zIndex: 5,
        description: 'Foto IA — contexto da notícia (objeto, pessoa, cena ilustrativa)',
        objectFit: 'cover',
        objectPositionX: 50,
        objectPositionY: 50,
        borderRadius: 8,
      },
      {
        id: id('cta', 'news'),
        type: 'text_cta',
        x: 5, y: 93, width: 40, height: 5,
        zIndex: 10,
        placeholder: 'Saiba Mais!',
        fontFamily: 'Inter',
        fontSize: 22,
        fontWeight: 800,
        color: '#0f172a',
        align: 'left',
      },
    ],
  },
}

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  fotoViralBottom,
  headlineGiganteFoto,
  storyFullbleed,
  cardClaroCorporate,
  feedVerticalDiagonal,
  noticiaUrgente,
]
