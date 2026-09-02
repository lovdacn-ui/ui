import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import {
  DEFAULT_PRESET_CONFIG,
  PRESET_BASE_COLORS,
  PRESET_CHART_COLORS,
  PRESET_FONT_HEADINGS,
  PRESET_FONTS,
  PRESET_ICON_LIBRARIES,
  PRESET_MENU_ACCENTS,
  PRESET_MENU_COLORS,
  PRESET_RADII,
  PRESET_STYLES,
  PRESET_THEMES,
  SHADCN_DEFAULT_PRESETS,
  decodePreset,
  decodeWirePresetV2,
  encodePreset,
  isPresetCode,
  isValidPreset,
  normalizePreset,
  resolveEffectiveRadius,
} from "../src/preset/generated-catalog"

const ROOT = path.resolve(fileURLToPath(new URL("../../../", import.meta.url)))
const V1_GOLDEN = {
  version: "a",
  base62: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  fields: [
    { key: "style", bits: 4, values: ["new-york", "default", "luma", "lyra", "maia", "mira", "nova", "rhea", "sera", "vega"] },
    { key: "baseColor", bits: 4, values: ["zinc", "slate", "stone", "gray", "neutral", "taupe", "mauve", "olive", "mist"] },
    { key: "theme", bits: 5, values: ["zinc", "slate", "stone", "gray", "neutral", "red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal", "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose", "mauve", "olive", "mist", "taupe"] },
    { key: "chartColor", bits: 5, values: ["zinc", "slate", "stone", "gray", "neutral", "red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal", "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose", "mauve", "olive", "mist", "taupe"] },
    { key: "font", bits: 5, values: ["inter", "dm-sans", "nunito-sans", "figtree", "outfit", "manrope", "space-grotesk", "montserrat", "roboto", "raleway", "public-sans", "source-sans-3", "lora", "merriweather", "playfair-display", "jetbrains-mono", "space-mono", "fira-code", "noto-serif", "roboto-slab", "instrument-sans", "instrument-serif", "geist"] },
    { key: "iconLibrary", bits: 3, values: ["lucide", "phosphor", "tabler", "expo", "heroicons"] },
    { key: "radius", bits: 3, values: ["default", "none", "small", "medium", "large", "full"] },
  ],
}

describe("canonical preset codec v2", () => {
  it("keeps the complete v1 JSON contract frozen", () => {
    const actual = JSON.parse(fs.readFileSync(path.join(ROOT, "packages/lovdacn/design-system/wire-v1.json"), "utf8"))
    expect(actual).toEqual(V1_GOLDEN)
  })

  it("encodes the exact global default as b0", () => {
    expect(DEFAULT_PRESET_CONFIG).toEqual({
      style: "nova", baseColor: "neutral", theme: "neutral", chartColor: "neutral",
      font: "inter", fontHeading: "inherit", iconLibrary: "lucide", radius: "default",
      menuAccent: "subtle", menuColor: "default",
    })
    expect(encodePreset({})).toBe("b0")
    expect(decodeWirePresetV2("b0")).toEqual(DEFAULT_PRESET_CONFIG)
  })

  it("round-trips every value in every v2 field", () => {
    const fields = {
      style: PRESET_STYLES,
      baseColor: PRESET_BASE_COLORS,
      theme: PRESET_THEMES,
      chartColor: PRESET_CHART_COLORS,
      font: PRESET_FONTS,
      fontHeading: PRESET_FONT_HEADINGS,
      iconLibrary: PRESET_ICON_LIBRARIES,
      radius: PRESET_RADII,
      menuAccent: PRESET_MENU_ACCENTS,
      menuColor: PRESET_MENU_COLORS,
    } as const
    for (const [field, values] of Object.entries(fields)) {
      for (const value of values) {
        const decoded = decodePreset(encodePreset({ [field]: value }))
        expect(decoded?.[field as keyof typeof decoded], `${field}:${value}`).toBe(value)
      }
    }
  })

  it("decodes a representative upstream shadcn b vector identically", () => {
    expect(decodePreset("b4rvdY0k5R")).toEqual({
      style: "lyra", baseColor: "zinc", theme: "blue", chartColor: "emerald",
      iconLibrary: "tabler", font: "jetbrains-mono", fontHeading: "playfair-display",
      radius: "large", menuAccent: "bold", menuColor: "inverted",
    })
  })

  it("accepts both wire prefixes and rejects invalid prefixes", () => {
    expect(isPresetCode("aPM8AL")).toBe(true)
    expect(isPresetCode("b0")).toBe(true)
    expect(isValidPreset("a6X1Oi")).toBe(true)
    expect(isValidPreset("b0")).toBe(true)
    expect(isPresetCode("c0")).toBe(false)
    expect(isValidPreset("c0")).toBe(false)
  })

  it("normalizes translucent menu colors to the only compatible accent", () => {
    const result = normalizePreset({ ...DEFAULT_PRESET_CONFIG, menuColor: "inverted-translucent", menuAccent: "bold" })
    expect(result.config.menuAccent).toBe("subtle")
    expect(result.warnings.join("\n")).toContain("Translucent menu colors")
  })
})

describe("canonical defaults and effective radius", () => {
  it("ships all eight audited shadcn named defaults", () => {
    expect(Object.keys(SHADCN_DEFAULT_PRESETS)).toEqual(["nova", "vega", "maia", "lyra", "mira", "luma", "sera", "rhea"])
    expect(SHADCN_DEFAULT_PRESETS.maia.iconLibrary).toBe("hugeicons")
    expect(SHADCN_DEFAULT_PRESETS.sera).toMatchObject({ baseColor: "taupe", theme: "taupe", chartColor: "taupe", font: "noto-sans", fontHeading: "playfair-display" })
  })

  it("enforces square effective radius for Lyra and Sera", () => {
    expect(resolveEffectiveRadius({ style: "lyra", radius: "default" })).toBe("none")
    expect(resolveEffectiveRadius({ style: "sera", radius: "default" })).toBe("none")
    expect(resolveEffectiveRadius({ style: "nova", radius: "default" })).toBe("default")
    expect(resolveEffectiveRadius({ style: "lyra", radius: "large" })).toBe("none")
    expect(resolveEffectiveRadius({ style: "sera", radius: "full" })).toBe("none")
  })
})
