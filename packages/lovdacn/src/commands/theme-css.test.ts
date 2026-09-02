import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { mkdtemp, rm, readFile } from "fs/promises"
import os from "os"
import path from "path"

import { regenerateProjectCss } from "./init"
import {
  THEME_TOKENS,
  THEME_TOKEN_NAMES,
  BASE_COLOR_NAMES,
  RADIUS_VALUES,
  oklchToHsl,
  resolveThemeTokens,
  getThemePrimary,
  getChartRamp,
  COLOR_RAMPS,
} from "../preset/index"

const CHART_KEYS = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"] as const

// ---------------------------------------------------------------------------
// Public shims (colors.ts) are now thin projections over the canonical tokens.
// ---------------------------------------------------------------------------
describe("preset/colors public shims are backed by canonical tokens", () => {
  it("getThemePrimary returns the exact shadcn Blue accent primary/foreground", () => {
    const blue = getThemePrimary("blue")
    expect(blue).not.toBeNull()
    expect(blue!.light.primary).toBe("oklch(0.488 0.243 264.376)")
    expect(blue!.light.primary).toBe(THEME_TOKENS.blue.light.primary)
    expect(blue!.light.foreground).toBe(THEME_TOKENS.blue.light["primary-foreground"])
    expect(blue!.dark.primary).toBe(THEME_TOKENS.blue.dark.primary)
    // HSL projection matches the canonical converter exactly.
    const blueHsl = getThemePrimary("blue", "hsl")
    expect(blueHsl!.light.primary).toBe(oklchToHsl(THEME_TOKENS.blue.light.primary!))
  })

  it("getThemePrimary returns null for every base-kind theme (incl. mauve/olive/mist/taupe)", () => {
    for (const base of BASE_COLOR_NAMES) {
      expect(getThemePrimary(base), base).toBeNull()
    }
    // The four newer base colors must not resolve to an accent primary.
    expect(getThemePrimary("mauve")).toBeNull()
    expect(getThemePrimary("olive")).toBeNull()
    expect(getThemePrimary("mist")).toBeNull()
    expect(getThemePrimary("taupe")).toBeNull()
  })

  it("getChartRamp returns the exact canonical chart-1..5 for all 26 themes (oklch + hsl)", () => {
    expect(THEME_TOKEN_NAMES).toHaveLength(26)
    for (const name of THEME_TOKEN_NAMES) {
      const ramp = getChartRamp(name)
      expect(ramp.light, `${name} light`).toEqual(
        CHART_KEYS.map((key) => THEME_TOKENS[name].light[key]!),
      )
      expect(ramp.dark, `${name} dark`).toEqual(
        CHART_KEYS.map((key) => THEME_TOKENS[name].dark[key]!),
      )
      const hsl = getChartRamp(name, "hsl")
      expect(hsl.light, `${name} light hsl`).toEqual(
        CHART_KEYS.map((key) => oklchToHsl(THEME_TOKENS[name].light[key]!)),
      )
    }
    // Exact Neutral (base) + Blue (accent) chart-1 spot checks.
    expect(getChartRamp("neutral").light[0]).toBe("oklch(0.87 0 0)")
    expect(getChartRamp("blue").light[0]).toBe("oklch(0.809 0.105 251.813)")
  })

  it("COLOR_RAMPS is a derived facade covering all 26 themes with no blue fallback", () => {
    for (const name of THEME_TOKEN_NAMES) {
      expect(COLOR_RAMPS[name], name).toBeDefined()
      expect(COLOR_RAMPS[name]!["300"]).toBe(THEME_TOKENS[name].light["chart-1"])
      expect(COLOR_RAMPS[name]!["700"]).toBe(THEME_TOKENS[name].light["chart-5"])
    }
    // The four extra base colors must project their own data, never blue's.
    for (const base of ["mauve", "olive", "mist", "taupe"] as const) {
      expect(COLOR_RAMPS[base], base).not.toEqual(COLOR_RAMPS.blue)
      expect(COLOR_RAMPS[base]!.grayscale, base).toBe(true)
    }
    expect(COLOR_RAMPS.blue!.grayscale).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Resolver coverage across all 26 themes and both engines.
// ---------------------------------------------------------------------------
describe("resolveThemeTokens covers all 26 themes without a black fallback", () => {
  it("layers theme primary + independent chart replacement and keeps sidebar tokens", () => {
    for (const name of THEME_TOKEN_NAMES) {
      const oklch = resolveThemeTokens({
        baseColor: "neutral",
        theme: name,
        chartColor: name,
        radius: "medium",
      })
      expect(oklch.light.primary, `${name} primary`).toBe(THEME_TOKENS[name].light.primary)
      expect(oklch.light["chart-1"], `${name} chart-1`).toBe(THEME_TOKENS[name].light["chart-1"])
      expect(oklch.light.sidebar, `${name} sidebar`).toBeTruthy()
      expect(oklch.dark["sidebar-ring"], `${name} sidebar-ring`).toBeTruthy()

      const hsl = resolveThemeTokens(
        { baseColor: "neutral", theme: name, chartColor: name, radius: "medium" },
        { format: "hsl" },
      )
      for (const scheme of ["light", "dark"] as const) {
        for (const value of Object.values(hsl[scheme])) {
          expect(value, `${name}.${scheme}`).not.toBe("0 0% 0%")
        }
        for (const value of Object.values(oklch[scheme])) {
          expect(value, `${name}.${scheme}`).not.toBe("oklch(0 0 0)")
        }
      }
    }
  })

  it("preserves the neutral dark alpha border/input in HSL (no black collapse)", () => {
    const hsl = resolveThemeTokens(
      { baseColor: "neutral", theme: "blue", chartColor: "teal", radius: "medium" },
      { format: "hsl" },
    )
    expect(hsl.dark.border).toBe("0 0% 100% / 10%")
    expect(hsl.dark.input).toBe("0 0% 100% / 15%")
    expect(hsl.dark.border).not.toBe("0 0% 0%")
  })
})

// ---------------------------------------------------------------------------
// getStyleVars (via the public regenerateProjectCss API) end-to-end.
// ---------------------------------------------------------------------------
describe("getStyleVars emits complete canonical maps for both engines", () => {
  let cwd: string

  beforeEach(async () => {
    cwd = await mkdtemp(path.join(os.tmpdir(), "lovda-theme-css-"))
  })

  afterEach(async () => {
    await rm(cwd, { recursive: true, force: true })
  })

  const gen = async (opts: Parameters<typeof regenerateProjectCss>[0]): Promise<string> => {
    await regenerateProjectCss(opts)
    return readFile(path.join(cwd, opts.cssRelativePath), "utf8")
  }

  it("uniwind: exact shadcn Neutral base + Blue accent OKLCH tokens, charts, sidebar aliases", async () => {
    const css = await gen({
      projectPath: cwd,
      styleEngine: "uniwind",
      cssRelativePath: "global.css",
      style: "vega",
      baseColor: "neutral",
      theme: "blue",
      chartColor: "teal",
      radius: "medium",
    })
    // Neutral base core tokens (accents don't override these).
    expect(css).toContain("--background: oklch(1 0 0);")
    expect(css).toContain("--foreground: oklch(0.145 0 0);")
    expect(css).toContain("--ring: oklch(0.708 0 0);")
    // Blue accent primary/foreground.
    expect(css).toContain("--primary: oklch(0.488 0.243 264.376);")
    expect(css).toContain("--primary-foreground: oklch(0.97 0.014 254.604);")
    // Chart-1 taken independently from the teal chart color.
    expect(css).toContain(`--chart-1: ${THEME_TOKENS.teal.light["chart-1"]};`)
    // Sidebar tokens + uniwind @theme --color-sidebar-* aliases.
    expect(css).toContain("--sidebar: oklch(0.985 0 0);")
    expect(css).toContain("--sidebar-primary:")
    expect(css).toContain("--color-sidebar: var(--sidebar);")
    expect(css).toContain("--color-sidebar-primary-foreground: var(--sidebar-primary-foreground);")
    expect(css).toContain("--color-sidebar-ring: var(--sidebar-ring);")
    // Destructive-foreground compatibility token — near-white, never black.
    expect(css).toContain("--destructive-foreground: oklch(0.985 0 0);")
    expect(css).not.toContain("oklch(0 0 0)")
    // Bounded RN radius scale + reduced-motion CSS preserved.
    expect(css).toContain("--radius-lg: min(var(--radius), 20px);")
    expect(css).toContain("--radius-4xl: min(calc(var(--radius) * 2.6), 32px);")
    expect(css).toContain("@media (prefers-reduced-motion: reduce)")
  })

  it("uniwind: with no accent theme the base primary is used (Neutral)", async () => {
    const css = await gen({
      projectPath: cwd,
      styleEngine: "uniwind",
      cssRelativePath: "global.css",
      style: "vega",
      baseColor: "neutral",
    })
    expect(css).toContain("--primary: oklch(0.205 0 0);")
  })

  it("nativewind: HSL triplets with the neutral dark alpha border preserved (no black)", async () => {
    const css = await gen({
      projectPath: cwd,
      styleEngine: "nativewind",
      cssRelativePath: "global.css",
      style: "vega",
      baseColor: "neutral",
      theme: "blue",
      chartColor: "teal",
      radius: "medium",
    })
    expect(css).toContain("--background: 0 0% 100%;")
    expect(css).toContain(`--primary: ${oklchToHsl(THEME_TOKENS.blue.light.primary!)};`)
    expect(css).toContain(`--chart-1: ${oklchToHsl(THEME_TOKENS.teal.light["chart-1"]!)};`)
    // Alpha survives the OKLCH → HSL conversion.
    expect(css).toContain("--border: 0 0% 100% / 10%;")
    expect(css).toContain("--input: 0 0% 100% / 15%;")
    expect(css).not.toContain(": 0 0% 0%;")
    // Sidebar tokens are emitted as CSS vars.
    expect(css).toContain("--sidebar-primary:")
    // Compat destructive-foreground — near-white, never black.
    expect(css).toContain("--destructive-foreground: 0 0% 98%;")
  })

  it("threads the selected radius through both engines and honours the style fallback", async () => {
    const none = await gen({
      projectPath: cwd,
      styleEngine: "uniwind",
      cssRelativePath: "global.css",
      style: "vega",
      baseColor: "neutral",
      radius: "none",
    })
    expect(none).toContain("--radius: 0rem;")

    const full = await gen({
      projectPath: cwd,
      styleEngine: "nativewind",
      cssRelativePath: "global.css",
      style: "vega",
      baseColor: "neutral",
      radius: "full",
    })
    expect(full).toContain(`--radius: ${RADIUS_VALUES.full};`)
    expect(full).toContain("--radius: 1.5rem;")

    // Unknown style falls back to the default (vega) style radius, not a crash.
    const fallback = await gen({
      projectPath: cwd,
      styleEngine: "uniwind",
      cssRelativePath: "global.css",
      style: "totally-unknown-style",
      baseColor: "neutral",
    })
    expect(fallback).toContain("--radius: 0.625rem;")
  })

  it("covers all 26 themes in both engines with sidebar + charts and no black fallback", async () => {
    for (const name of THEME_TOKEN_NAMES) {
      const uni = await gen({
        projectPath: cwd,
        styleEngine: "uniwind",
        cssRelativePath: "global.css",
        style: "vega",
        baseColor: "neutral",
        theme: name,
        chartColor: name,
      })
      expect(uni, name).toContain(`--primary: ${THEME_TOKENS[name].light.primary};`)
      expect(uni, name).toContain(`--chart-1: ${THEME_TOKENS[name].light["chart-1"]};`)
      expect(uni, name).toContain("--sidebar-primary:")
      expect(uni, name).not.toContain("oklch(0 0 0)")

      const nw = await gen({
        projectPath: cwd,
        styleEngine: "nativewind",
        cssRelativePath: "global.css",
        style: "vega",
        baseColor: "neutral",
        theme: name,
        chartColor: name,
      })
      expect(nw, name).toContain(`--primary: ${oklchToHsl(THEME_TOKENS[name].light.primary!)};`)
      expect(nw, name).not.toContain(": 0 0% 0%;")
    }
  })
})
