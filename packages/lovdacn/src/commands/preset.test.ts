import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { mkdtemp, rm, mkdir, writeFile, readFile } from "fs/promises"
import os from "os"
import path from "path"

import { regenerateProjectCss } from "./init"
import { getInstalledComponents } from "./add"

describe("regenerateProjectCss — font + radius are first-class", () => {
  let cwd: string

  beforeEach(async () => {
    cwd = await mkdtemp(path.join(os.tmpdir(), "lovda-preset-css-"))
  })

  afterEach(async () => {
    await rm(cwd, { recursive: true, force: true })
  })

  it("applies the preset's font and radius (not the style defaults)", async () => {
    await regenerateProjectCss({
      projectPath: cwd,
      styleEngine: "nativewind",
      cssRelativePath: "global.css",
      style: "nova", // nova defaults: Inter / 0.125rem
      baseColor: "zinc",
      theme: "blue",
      chartColor: "blue",
      font: "playfair-display", // -> "Playfair Display"
      radius: "full", // -> 1.5rem
    })

    const css = await readFile(path.join(cwd, "global.css"), "utf8")
    expect(css).toContain("--font-sans: Playfair Display,")
    expect(css).toContain("--radius: 1.5rem;")
    expect(css).not.toContain("--font-sans: Inter,")
  })

  it("falls back to the style's font/radius when not provided", async () => {
    await regenerateProjectCss({
      projectPath: cwd,
      styleEngine: "nativewind",
      cssRelativePath: "global.css",
      style: "nova",
      baseColor: "zinc",
    })

    const css = await readFile(path.join(cwd, "global.css"), "utf8")
    // Style fallbacks are derived from the generated default preset: nova ->
    // font "inter" (Inter) + radius "small" (0.45rem), so the fallback stays in
    // lock step with the catalog instead of a stale hand-authored rem value.
    expect(css).toContain("--font-sans: Inter,")
    expect(css).toContain("--radius: 0.45rem;")
  })
})

describe("getInstalledComponents — filesystem + tracked reconciliation", () => {
  let cwd: string

  beforeEach(async () => {
    cwd = await mkdtemp(path.join(os.tmpdir(), "lovda-preset-detect-"))
  })

  afterEach(async () => {
    await rm(cwd, { recursive: true, force: true })
  })

  it("unions tracked and on-disk components, restricted to known names", async () => {
    const uiDir = path.join(cwd, "components", "ui")
    await mkdir(uiDir, { recursive: true })
    await writeFile(path.join(uiDir, "button.tsx"), "// button", "utf8")
    await writeFile(path.join(uiDir, "text.tsx"), "// text", "utf8")
    // Not a registry component — must be ignored.
    await writeFile(path.join(uiDir, "my-custom-thing.tsx"), "// custom", "utf8")

    // "accordion" is tracked but not on disk — must still be included.
    const result = getInstalledComponents(cwd, undefined, ["button", "accordion"])

    expect(result).toEqual(["accordion", "button", "text"])
    expect(result).not.toContain("my-custom-thing")
  })

  it("returns tracked-only known components when the ui folder is absent", async () => {
    const result = getInstalledComponents(cwd, undefined, ["card", "not-a-real-component"])
    expect(result).toEqual(["card"])
  })
})



describe("immutable v1 preset decoding + active normalization", () => {
  it("decodes frozen historical values without reordering the wire arrays", async () => {
    const { decodeWirePresetV1 } = await import("../preset/index")
    expect(decodeWirePresetV1("aPM8AL")).toEqual({
      style: "default",
      baseColor: "mist",
      theme: "rose",
      chartColor: "lime",
      font: "instrument-serif",
      iconLibrary: "heroicons",
      radius: "full",
    })
    expect(decodeWirePresetV1("a6X1Oi")).toEqual({
      style: "sera",
      baseColor: "taupe",
      theme: "amber",
      chartColor: "amber",
      font: "space-mono",
      iconLibrary: "expo",
      radius: "none",
    })
  })

  it("normalizes legacy decoded values while reporting every migration", async () => {
    const { decodePresetWithWarnings } = await import("../preset/index")
    const result = decodePresetWithWarnings("aPM8AL")
    expect(result?.config).toEqual({
      style: "vega",
      baseColor: "mist",
      theme: "rose",
      chartColor: "lime",
      font: "instrument-serif",
      iconLibrary: "heroicons",
      radius: "full",
    })
    expect(result?.warnings).toHaveLength(1)
    expect(result?.warnings.join("\n")).toContain('style "default"')
    expect(result?.warnings.join("\n")).not.toContain("icon library")
    expect(result?.warnings.join("\n")).not.toContain("font")
  })
})
