export * from './preset.js'

// Canonical OKLCH theme tokens + browser-safe resolver (resolveThemeTokens,
// THEME_TOKENS, oklchToHsl, THEME_TOKEN_KEYS, …). This is the single source of
// truth the CLI resolves complete light/dark maps from.
export * from './generated-theme-tokens.js'

// Backward-compatible public shims, now derived from the canonical tokens above.
export { COLOR_RAMPS, getThemePrimary, getChartRamp, type ColorRamp } from './colors.js'

// RADIUS_VALUES is exported by both ./preset (generated-catalog) and
// ./generated-theme-tokens with byte-identical values. Re-export it explicitly so
// the name resolves unambiguously instead of being dropped by the two conflicting
// star exports above.
export { RADIUS_VALUES } from './generated-catalog.js'

// THEME_COMPATIBILITY, getCompatibleThemes and isThemeCompatible are likewise
// emitted into both the catalog (for the browser wire layer + randomizeConfig)
// and the canonical token module. Re-export the token-module versions explicitly
// so the barrel resolves unambiguously. (ACCENT_PRESET_THEMES lives only in the
// catalog and flows through the star export above.)
export {
  THEME_COMPATIBILITY,
  getCompatibleThemes,
  isThemeCompatible,
} from './generated-theme-tokens.js'
