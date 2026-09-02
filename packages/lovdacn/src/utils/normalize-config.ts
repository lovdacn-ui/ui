import {
  normalizePreset,
  type PresetConfig,
  type PresetField,
} from '../preset/index.js'

export type LvcnConfigNormalization = {
  config: Record<string, any> & PresetConfig
  warnings: string[]
  changed: boolean
}

export function normalizeLvcnConfig(input: Record<string, any>): LvcnConfigNormalization {
  const candidate: Partial<Record<PresetField, unknown>> = {
    style: input.style,
    baseColor: input.baseColor ?? input.tailwind?.baseColor,
    theme: input.theme,
    chartColor: input.chartColor,
    font: input.font,
    fontHeading: input.fontHeading,
    iconLibrary: input.iconLibrary,
    radius: input.radius,
    menuAccent: input.menuAccent,
    menuColor: input.menuColor,
  }
  const normalization = normalizePreset(candidate)
  const config = {
    ...input,
    ...normalization.config,
    tailwind: {
      ...(input.tailwind || {}),
      baseColor: normalization.config.baseColor,
    },
  } as Record<string, any> & PresetConfig
  return {
    config,
    warnings: normalization.warnings,
    changed: JSON.stringify(config) !== JSON.stringify(input),
  }
}
