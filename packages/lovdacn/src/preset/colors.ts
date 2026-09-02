// Backward-compatible public shims for accent primaries and chart ramps.
//
// These helpers used to own a hand-maintained OKLCH ramp table. They are now
// thin projections over the generated canonical theme tokens
// (generated-theme-tokens.ts), which is the single source of truth. Nothing here
// is an independent color source anymore:
//   - getThemePrimary  → exact shadcn theme primary / primary-foreground,
//                        null for base-kind themes.
//   - getChartRamp     → exact chart-1..5 for every theme.
//   - COLOR_RAMPS      → derived compatibility facade so legacy importers keep
//                        working; every theme (including the mauve/olive/mist/
//                        taupe base colors) is projected from its own canonical
//                        data, never falling back to blue.

import {
  THEME_TOKENS,
  THEME_TOKEN_NAMES,
  oklchToHsl,
  type ThemeTokenEntry,
} from "./generated-theme-tokens.js"

export type ColorRamp = {
  // OKLCH shades 300, 400, 500, 600, 700
  "300": string
  "400": string
  "500": string
  "600": string
  "700": string
  // Whether this family is a neutral/base color (no accent primary override)
  grayscale?: boolean
  // Foreground color to pair with the primary (light colors need dark text)
  darkForeground?: boolean
}

type CssFormat = "oklch" | "hsl"

// Canonical values are stored in OKLCH; NativeWind consumers ask for HSL triplets.
// Alpha is preserved by oklchToHsl (e.g. `oklch(1 0 0 / 10%)` → `0 0% 100% / 10%`),
// never collapsed to black.
const convert = (value: string, format: CssFormat): string =>
  format === "hsl" ? oklchToHsl(value) : value

const CHART_KEYS = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"] as const

// Derived compatibility facade. Each ramp is projected from the theme's own
// canonical light chart ladder (chart-1 lightest … chart-5 darkest), so every one
// of the 26 themes resolves to its own values. This is NOT a source of truth:
// callers needing exact tokens use getThemePrimary / getChartRamp / resolveThemeTokens.
export const COLOR_RAMPS: Record<string, ColorRamp> = Object.fromEntries(
  THEME_TOKEN_NAMES.map((name): [string, ColorRamp] => {
    const entry = THEME_TOKENS[name]
    const light = entry.light
    const ramp: ColorRamp = {
      "300": light["chart-1"]!,
      "400": light["chart-2"]!,
      "500": light["chart-3"]!,
      "600": light["chart-4"]!,
      "700": light["chart-5"]!,
    }
    if (entry.kind === "base") ramp.grayscale = true
    return [name, ramp]
  })
)

// Build the --primary override for a theme (accent) color.
// Returns null for base-kind families (they keep the base color's own primary).
// `format` selects oklch (uniwind) or hsl triplet (nativewind).
export function getThemePrimary(
  theme: string,
  format: CssFormat = "oklch"
): {
  light: { primary: string; foreground: string }
  dark: { primary: string; foreground: string }
} | null {
  const entry = (THEME_TOKENS as Record<string, ThemeTokenEntry>)[theme]
  if (!entry || entry.kind === "base") return null
  return {
    light: {
      primary: convert(entry.light.primary!, format),
      foreground: convert(entry.light["primary-foreground"]!, format),
    },
    dark: {
      primary: convert(entry.dark.primary!, format),
      foreground: convert(entry.dark["primary-foreground"]!, format),
    },
  }
}

// Build the --chart-1 .. --chart-5 ramp for a chart color, taken verbatim from the
// canonical tokens for that theme. `format` selects oklch (uniwind) or hsl triplet
// (nativewind). Unknown names fall back to blue to preserve the historical shape;
// every real theme (including mauve/olive/mist/taupe) returns its own values.
export function getChartRamp(
  chartColor: string,
  format: CssFormat = "oklch"
): {
  light: string[]
  dark: string[]
} {
  const entry = (THEME_TOKENS as Record<string, ThemeTokenEntry>)[chartColor] ?? THEME_TOKENS.blue
  const pick = (scheme: "light" | "dark"): string[] =>
    CHART_KEYS.map((key) => convert(entry[scheme][key]!, format))
  return { light: pick("light"), dark: pick("dark") }
}
