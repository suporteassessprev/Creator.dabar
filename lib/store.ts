import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'

export type SlideLayout =
  | 'centered'
  | 'top'
  | 'bottom'
  | 'split'
  | 'headline-banner'
  | 'split-horizontal'
  | 'dark-overlay'
  | 'centered-brutalist'

export type CreativeFormat = 'square' | 'portrait' | 'story' | 'feed-vertical'

export type CarouselMode = 'carousel' | 'creative'

export interface Slide {
  id: string
  title: string
  content: string
  subtitle?: string
  cta?: string
  imageUrl?: string
  imagePrompt?: string
  backgroundColor: string
  textColor: string
  accentColor: string
  fontFamily: string
  layout: SlideLayout
}

export interface Carousel {
  id: string
  title: string
  topic: string
  slides: Slide[]
  createdAt: string
  updatedAt: string
  style: CarouselStyle
  format: CreativeFormat
  mode: CarouselMode
  status: 'draft' | 'ready' | 'generating'
  // Phase 3: if the carousel was generated from a visual template, the
  // serialized TemplateStructure JSON is stored here. The editor renders
  // via TemplateRenderer when this is set; otherwise falls back to the
  // legacy slide layout.
  templateStructure?: string | null
  templateId?: string | null
}

export interface CarouselStyle {
  primaryColor: string
  secondaryColor: string
  backgroundColor: string
  textColor: string
  fontFamily: string
  theme: 'dark' | 'light' | 'gradient' | 'minimal'
}

interface AppState {
  // Carousels
  carousels: Carousel[]
  addCarousel: (carousel: Carousel) => void
  updateCarousel: (id: string, updates: Partial<Carousel>) => void
  deleteCarousel: (id: string) => void
  getCarousel: (id: string) => Carousel | undefined

  // Current editing
  currentCarousel: Carousel | null
  setCurrentCarousel: (carousel: Carousel | null) => void
  updateCurrentSlide: (slideId: string, updates: Partial<Slide>) => void

  // UI State
  isGenerating: boolean
  setIsGenerating: (v: boolean) => void
  generatingProgress: number
  setGeneratingProgress: (v: number) => void
}

const defaultStyle: CarouselStyle = {
  primaryColor: '#0ea5e9',
  secondaryColor: '#d946ef',
  backgroundColor: '#0f172a',
  textColor: '#ffffff',
  fontFamily: 'Inter',
  theme: 'dark',
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      carousels: [],
      addCarousel: (carousel) =>
        set((state) => ({ carousels: [carousel, ...state.carousels] })),
      updateCarousel: (id, updates) =>
        set((state) => ({
          carousels: state.carousels.map((c) =>
            c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
          ),
        })),
      deleteCarousel: (id) =>
        set((state) => ({
          carousels: state.carousels.filter((c) => c.id !== id),
        })),
      getCarousel: (id) => get().carousels.find((c) => c.id === id),

      currentCarousel: null,
      setCurrentCarousel: (carousel) => set({ currentCarousel: carousel }),
      updateCurrentSlide: (slideId, updates) =>
        set((state) => {
          if (!state.currentCarousel) return state
          return {
            currentCarousel: {
              ...state.currentCarousel,
              slides: state.currentCarousel.slides.map((s) =>
                s.id === slideId ? { ...s, ...updates } : s
              ),
            },
          }
        }),

      isGenerating: false,
      setIsGenerating: (v) => set({ isGenerating: v }),
      generatingProgress: 0,
      setGeneratingProgress: (v) => set({ generatingProgress: v }),
    }),
    {
      name: 'viral-carousel-store',
      partialize: (state) => ({
        carousels: state.carousels,
      }),
    }
  )
)

export function createNewCarousel(
  topic: string,
  opts?: { style?: Partial<CarouselStyle>; format?: CreativeFormat; mode?: CarouselMode }
): Carousel {
  return {
    id: uuidv4(),
    title: topic,
    topic,
    slides: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    style: { ...defaultStyle, ...opts?.style },
    format: opts?.format ?? 'square',
    mode: opts?.mode ?? 'creative',
    status: 'draft',
  }
}

export function createSlide(overrides?: Partial<Slide>): Slide {
  return {
    id: uuidv4(),
    title: '',
    content: '',
    backgroundColor: '#0f172a',
    textColor: '#ffffff',
    accentColor: '#0ea5e9',
    fontFamily: 'Inter',
    layout: 'centered',
    ...overrides,
  }
}
