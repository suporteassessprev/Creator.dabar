/**
 * Phase 3.1c — Curated icon library for the visual template editor.
 *
 * We don't ship all 1500+ lucide-react icons in the bundle. Instead we
 * curate ~50 icons grouped by use case (checks, arrows, social, money,
 * comms, engagement, alerts). The picker shows these with search.
 *
 * To add a new icon: import it below, add an entry to TEMPLATE_ICONS
 * with a stable string name and a category. The renderer looks up by
 * name and falls back to a square if not found, so removing/renaming
 * an icon never crashes a template.
 */
import {
  Check, CheckCircle, CheckCircle2, X, XCircle,
  ArrowRight, ArrowLeft, ArrowUp, ArrowDown, ChevronRight, ChevronLeft,
  Star, Heart, ThumbsUp, ThumbsDown, Flame, Sparkles, Zap, Award,
  DollarSign, BadgeDollarSign, Wallet, TrendingUp, TrendingDown, Percent,
  Phone, Mail, MessageCircle, Send, AtSign, Globe, Link as LinkIcon,
  Info, AlertCircle, AlertTriangle, Bell, BellRing, ShieldCheck,
  Clock, Calendar, Target, MapPin, Tag, Crown, Gift,
  Instagram, Facebook, Twitter, Youtube, Linkedin,
  Eye, Lock, Unlock, Users, User, UserCheck,
  Play, Pause, ShoppingCart, Package, Truck,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type IconCategory =
  | 'check'
  | 'arrow'
  | 'engagement'
  | 'money'
  | 'comms'
  | 'alert'
  | 'time-place'
  | 'social'
  | 'user'
  | 'commerce'

export interface IconMeta {
  Icon: LucideIcon
  category: IconCategory
  /** Optional Portuguese keywords for search (in addition to the name itself). */
  aliases?: string[]
}

export const TEMPLATE_ICONS: Record<string, IconMeta> = {
  // ── checks / cancels ──
  Check:           { Icon: Check,         category: 'check',     aliases: ['ok','sim','aprovado'] },
  CheckCircle:     { Icon: CheckCircle,   category: 'check',     aliases: ['ok','marcado'] },
  CheckCircle2:    { Icon: CheckCircle2,  category: 'check',     aliases: ['confirmado','aprovado'] },
  X:               { Icon: X,             category: 'check',     aliases: ['fechar','não','erro'] },
  XCircle:         { Icon: XCircle,       category: 'check',     aliases: ['cancelar','negado'] },

  // ── arrows ──
  ArrowRight:      { Icon: ArrowRight,    category: 'arrow',     aliases: ['seta','próximo','saiba mais'] },
  ArrowLeft:       { Icon: ArrowLeft,     category: 'arrow',     aliases: ['voltar','anterior'] },
  ArrowUp:         { Icon: ArrowUp,       category: 'arrow',     aliases: ['cima','subir'] },
  ArrowDown:       { Icon: ArrowDown,     category: 'arrow',     aliases: ['baixo','descer'] },
  ChevronRight:    { Icon: ChevronRight,  category: 'arrow',     aliases: ['próximo'] },
  ChevronLeft:     { Icon: ChevronLeft,   category: 'arrow',     aliases: ['voltar'] },

  // ── engagement ──
  Star:            { Icon: Star,          category: 'engagement', aliases: ['estrela','favorito'] },
  Heart:           { Icon: Heart,         category: 'engagement', aliases: ['coração','curtir','amor'] },
  ThumbsUp:        { Icon: ThumbsUp,      category: 'engagement', aliases: ['joinha','aprovado','positivo'] },
  ThumbsDown:      { Icon: ThumbsDown,    category: 'engagement', aliases: ['negativo','ruim'] },
  Flame:           { Icon: Flame,         category: 'engagement', aliases: ['fogo','viral','quente'] },
  Sparkles:        { Icon: Sparkles,      category: 'engagement', aliases: ['brilho','mágica','ia'] },
  Zap:             { Icon: Zap,           category: 'engagement', aliases: ['raio','rápido','energia'] },
  Award:           { Icon: Award,         category: 'engagement', aliases: ['prêmio','medalha'] },

  // ── money ──
  DollarSign:      { Icon: DollarSign,    category: 'money',     aliases: ['dinheiro','real','cifrão'] },
  BadgeDollarSign: { Icon: BadgeDollarSign, category: 'money',   aliases: ['preço','desconto'] },
  Wallet:          { Icon: Wallet,        category: 'money',     aliases: ['carteira'] },
  TrendingUp:      { Icon: TrendingUp,    category: 'money',     aliases: ['crescimento','alta'] },
  TrendingDown:    { Icon: TrendingDown,  category: 'money',     aliases: ['queda','baixa'] },
  Percent:         { Icon: Percent,       category: 'money',     aliases: ['porcentagem','desconto'] },

  // ── comms ──
  Phone:           { Icon: Phone,         category: 'comms',     aliases: ['telefone','ligar'] },
  Mail:            { Icon: Mail,          category: 'comms',     aliases: ['email','envelope'] },
  MessageCircle:   { Icon: MessageCircle, category: 'comms',     aliases: ['chat','mensagem'] },
  Send:            { Icon: Send,          category: 'comms',     aliases: ['enviar','avião'] },
  AtSign:          { Icon: AtSign,        category: 'comms',     aliases: ['arroba'] },
  Globe:           { Icon: Globe,         category: 'comms',     aliases: ['mundo','globo','web'] },
  Link:            { Icon: LinkIcon,      category: 'comms',     aliases: ['link','url'] },

  // ── alerts ──
  Info:            { Icon: Info,          category: 'alert',     aliases: ['informação'] },
  AlertCircle:     { Icon: AlertCircle,   category: 'alert',     aliases: ['atenção','aviso'] },
  AlertTriangle:   { Icon: AlertTriangle, category: 'alert',     aliases: ['cuidado','perigo'] },
  Bell:            { Icon: Bell,          category: 'alert',     aliases: ['sino','notificação'] },
  BellRing:        { Icon: BellRing,      category: 'alert',     aliases: ['notificação ativa'] },
  ShieldCheck:     { Icon: ShieldCheck,   category: 'alert',     aliases: ['proteção','seguro'] },

  // ── time / place ──
  Clock:           { Icon: Clock,         category: 'time-place', aliases: ['relógio','hora'] },
  Calendar:        { Icon: Calendar,      category: 'time-place', aliases: ['data','calendário'] },
  Target:          { Icon: Target,        category: 'time-place', aliases: ['alvo','objetivo'] },
  MapPin:          { Icon: MapPin,        category: 'time-place', aliases: ['local','endereço'] },
  Tag:             { Icon: Tag,           category: 'time-place', aliases: ['etiqueta','marca'] },
  Crown:           { Icon: Crown,         category: 'time-place', aliases: ['coroa','premium'] },
  Gift:            { Icon: Gift,          category: 'time-place', aliases: ['presente','brinde'] },

  // ── social ──
  Instagram:       { Icon: Instagram,     category: 'social',    aliases: ['ig','insta'] },
  Facebook:        { Icon: Facebook,      category: 'social',    aliases: ['fb','meta'] },
  Twitter:         { Icon: Twitter,       category: 'social',    aliases: ['x','tweet'] },
  Youtube:         { Icon: Youtube,       category: 'social',    aliases: ['yt','vídeo'] },
  Linkedin:        { Icon: Linkedin,      category: 'social',    aliases: ['linkedin'] },

  // ── user ──
  Eye:             { Icon: Eye,           category: 'user',      aliases: ['olho','ver','visualização'] },
  Lock:            { Icon: Lock,          category: 'user',      aliases: ['cadeado','privado'] },
  Unlock:          { Icon: Unlock,        category: 'user',      aliases: ['destravar'] },
  Users:           { Icon: Users,         category: 'user',      aliases: ['pessoas','público'] },
  User:            { Icon: User,          category: 'user',      aliases: ['pessoa','perfil'] },
  UserCheck:       { Icon: UserCheck,     category: 'user',      aliases: ['verificado','aprovado'] },

  // ── commerce ──
  Play:            { Icon: Play,          category: 'commerce',  aliases: ['vídeo','play','assistir'] },
  Pause:           { Icon: Pause,         category: 'commerce',  aliases: ['pausar'] },
  ShoppingCart:    { Icon: ShoppingCart,  category: 'commerce',  aliases: ['carrinho','comprar'] },
  Package:         { Icon: Package,       category: 'commerce',  aliases: ['caixa','entrega'] },
  Truck:           { Icon: Truck,         category: 'commerce',  aliases: ['frete','entrega'] },
}

export const ICON_NAMES = Object.keys(TEMPLATE_ICONS)

export const CATEGORY_LABELS: Record<IconCategory, string> = {
  'check':       'Confirmação',
  'arrow':       'Setas',
  'engagement':  'Engajamento',
  'money':       'Dinheiro',
  'comms':       'Contato',
  'alert':       'Alertas',
  'time-place':  'Tempo & Lugar',
  'social':      'Redes sociais',
  'user':        'Usuário',
  'commerce':    'Comércio',
}

/** Get a LucideIcon by name, or null if not in the curated set. */
export function getIcon(name: string): LucideIcon | null {
  return TEMPLATE_ICONS[name]?.Icon ?? null
}

/** Filter icons by free-text search (matches name + aliases). */
export function searchIcons(query: string): string[] {
  const q = query.trim().toLowerCase()
  if (!q) return ICON_NAMES
  return ICON_NAMES.filter(name => {
    if (name.toLowerCase().includes(q)) return true
    const aliases = TEMPLATE_ICONS[name].aliases ?? []
    return aliases.some(a => a.toLowerCase().includes(q))
  })
}
