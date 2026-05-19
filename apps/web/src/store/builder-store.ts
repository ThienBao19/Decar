import { create } from 'zustand'

import type { BuildConfig, PartCategory, PaintConfig, VehicleCategory } from '@decar/shared'
import { builderApi } from '@/lib/builder-api'

interface BuilderState {
  config: BuildConfig
  savedId: string | null
  isDirty: boolean
  isSaving: boolean
  saveError: string | null
  setBaseBody(category: VehicleCategory): void
  setPart(category: PartCategory, partId: string | null): void
  setPaint(paint: Partial<PaintConfig>): void
  setName(name: string): void
  resetDirty(): void
  save(): Promise<string>
  loadSaved(id: string): Promise<void>
}

const DEFAULT_PAINT: PaintConfig = {
  bodyColor: 0x1a3a5c,
  finish: 'metallic',
  windowTint: 20,
}

const DEFAULT_CONFIG: BuildConfig = {
  name: 'My Build',
  baseBodyCategory: 'sedan',
  parts: {
    wheel: 'oem-5spoke',
    front_bumper: 'front-oem',
    rear_bumper: 'rear-oem',
    hood: 'hood-stock',
    headlight: 'hl-halogen',
    taillight: 'tl-standard',
    brake_caliper: 'brake-oem',
    exhaust: 'exhaust-dual-tip',
  },
  paint: DEFAULT_PAINT,
}

export const useBuilderStore = create<BuilderState>((set, get) => ({
  config: DEFAULT_CONFIG,
  savedId: null,
  isDirty: false,
  isSaving: false,
  saveError: null,

  setBaseBody: (category) =>
    set((s) => ({ config: { ...s.config, baseBodyCategory: category }, isDirty: true })),

  setPart: (category, partId) =>
    set((s) => {
      const parts = partId === null
        ? (({ [category]: _, ...rest }) => rest)(s.config.parts)
        : { ...s.config.parts, [category]: partId }
      return { config: { ...s.config, parts }, isDirty: true }
    }),

  setPaint: (paint) =>
    set((s) => ({
      config: { ...s.config, paint: { ...s.config.paint, ...paint } },
      isDirty: true,
    })),

  setName: (name) =>
    set((s) => ({ config: { ...s.config, name }, isDirty: true })),

  resetDirty: () => set({ isDirty: false }),

  save: async () => {
    set({ isSaving: true, saveError: null })
    try {
      const { config, savedId } = get()
      let dto
      if (savedId) {
        dto = await builderApi.update(savedId, { name: config.name, config })
      } else {
        dto = await builderApi.create({ name: config.name, config })
      }
      set({ savedId: dto.id, isDirty: false, isSaving: false })
      return dto.id
    } catch (err) {
      set({ saveError: (err as Error).message, isSaving: false })
      throw err
    }
  },

  loadSaved: async (id) => {
    const dto = await builderApi.get(id)
    set({ config: dto.config, savedId: dto.id, isDirty: false })
  },
}))