import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import {
  FONT_MANIFEST,
  ICON_LIBRARY_CAPABILITIES,
  ICON_LIBRARY_MANIFEST,
  ICON_PACKAGE_DEPENDENCIES,
  PRESET_ICON_LIBRARIES,
  SEMANTIC_ICON_NAMES,
} from "../src/preset/generated-catalog"

const ROOT = path.resolve(fileURLToPath(new URL("../../../", import.meta.url)))
const read = (relative: string) => fs.readFileSync(path.join(ROOT, relative), "utf8")

describe("canonical parity resources", () => {
  it("includes the five verified font pins and exact four-role APIs", () => {
    expect(Object.keys(FONT_MANIFEST)).toHaveLength(28)
    expect(FONT_MANIFEST["noto-sans"]).toMatchObject({ package: "@expo-google-fonts/noto-sans", version: "0.4.2", category: "sans", faces: { regular: "NotoSans_400Regular", medium: "NotoSans_500Medium", semibold: "NotoSans_600SemiBold", bold: "NotoSans_700Bold" } })
    expect(FONT_MANIFEST["geist-mono"]).toMatchObject({ package: "@expo-google-fonts/geist-mono", version: "0.4.3", category: "mono" })
    expect(FONT_MANIFEST.oxanium).toMatchObject({ package: "@expo-google-fonts/oxanium", version: "0.4.2", category: "sans" })
    expect(FONT_MANIFEST["ibm-plex-sans"]).toMatchObject({ package: "@expo-google-fonts/ibm-plex-sans", version: "0.4.1" })
    expect(FONT_MANIFEST["eb-garamond"]).toMatchObject({ package: "@expo-google-fonts/eb-garamond", version: "0.4.3", category: "serif" })
  })

  it("covers every semantic key for all seven icon libraries", () => {
    const manifest = JSON.parse(read("packages/lovdacn/design-system/icon-manifest.json"))
    expect(PRESET_ICON_LIBRARIES).toEqual(["lucide", "hugeicons", "tabler", "phosphor", "remixicon", "expo", "heroicons"])
    expect(Object.keys(manifest.icons)).toHaveLength(SEMANTIC_ICON_NAMES.length)
    for (const [name, icon] of Object.entries(manifest.icons) as [string, Record<string, string>][]) {
      for (const library of PRESET_ICON_LIBRARIES) expect(icon[library], `${name}.${library}`).toBeTruthy()
    }
  })

  it("models exact plural dependencies and verified icon capabilities", () => {
    expect(ICON_PACKAGE_DEPENDENCIES.hugeicons).toEqual(["@hugeicons/react-native@1.0.16", "@hugeicons/core-free-icons@4.3.0"])
    expect(ICON_PACKAGE_DEPENDENCIES.remixicon).toEqual(["react-native-remix-icon@4.7.0"])
    expect(ICON_LIBRARY_CAPABILITIES.hugeicons).toEqual({ status: "supported" })
    expect(ICON_LIBRARY_CAPABILITIES.remixicon).toEqual({ status: "supported" })
    expect(ICON_LIBRARY_MANIFEST.hugeicons.adapter).toBe("hugeicons-data")
    expect(ICON_LIBRARY_MANIFEST.remixicon.adapter).toBe("remix-string")
  })

  it("emits current preview and registry adapters for both engines", () => {
    const hugePreview = read("apps/preview/src/components/design-system/icons/hugeicons.tsx")
    const remixPreview = read("apps/preview/src/components/design-system/icons/remixicon.tsx")
    expect(hugePreview).toContain("HugeiconsIcon")
    expect(hugePreview).toContain("@hugeicons/core-free-icons/Activity01Icon")
    expect(remixPreview).toContain('/// <reference path="../../../types/react-native-remix-icon.d.ts" />')
    expect(remixPreview).toContain('from "react-native-remix-icon/src/icons/PulseLine"')
    expect(remixPreview).toContain("const GLYPHS = {")
    expect(remixPreview).toContain("width={size}")
    expect(remixPreview).not.toContain('from "react-native-remix-icon"')
    for (const engine of ["nativewind", "uniwind"]) {
      const huge = JSON.parse(read(`apps/v2/public/r/beta/icons/${engine}/hugeicons/semantic-icon.json`))
      const remix = JSON.parse(read(`apps/v2/public/r/beta/icons/${engine}/remixicon/semantic-icon.json`))
      expect(huge.dependencies).toEqual(["@hugeicons/react-native@1.0.16", "@hugeicons/core-free-icons@4.3.0", "react-native-svg"])
      expect(remix.dependencies).toEqual(["react-native-remix-icon@4.7.0", "react-native-svg"])
    }
  })
})
