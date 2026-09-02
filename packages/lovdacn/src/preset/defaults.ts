// Compatibility facade for callers importing named presets directly.
import {
  LVCN_LEGACY_PRESETS,
  SHADCN_DEFAULT_PRESETS,
  type NamedPreset,
} from './generated-catalog.js'

export type { NamedPreset } from './generated-catalog.js'

export const DEFAULT_PRESETS = {
  ...SHADCN_DEFAULT_PRESETS,
  'lvcn-v1-nova': LVCN_LEGACY_PRESETS.nova,
  'lvcn-v1-vega': LVCN_LEGACY_PRESETS.vega,
  'lvcn-v1-maia': LVCN_LEGACY_PRESETS.maia,
  'lvcn-v1-lyra': LVCN_LEGACY_PRESETS.lyra,
  'lvcn-v1-mira': LVCN_LEGACY_PRESETS.mira,
  'lvcn-v1-luma': LVCN_LEGACY_PRESETS.luma,
  'lvcn-v1-sera': LVCN_LEGACY_PRESETS.sera,
  'lvcn-v1-rhea': LVCN_LEGACY_PRESETS.rhea,
} as const satisfies Record<string, NamedPreset>
