import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// scripts/ -> packages/lovdacn -> packages -> lvcn (workspace root).
const WORKSPACE_ROOT = path.resolve(
  fileURLToPath(new URL("../../../", import.meta.url)),
);

function readSource(relativePath: string) {
  return fs.readFileSync(path.join(WORKSPACE_ROOT, relativePath), "utf8");
}

const PREVIEW_THEME = "apps/preview/src/lib/preview-theme.ts";
const PREVIEW_DESIGN_SYSTEM = "apps/preview/src/components/design-system/preview-design-system.tsx";
const PREVIEW_RENDERER = "apps/preview/src/components/preview-renderer.tsx";
const PREVIEW_TEXT = "apps/preview/src/components/ui/text.tsx";
const PRESENT = "apps/preview/src/app/present.tsx";

describe("preview canonical theme application", () => {
  it("resolves preview theme variables through the generated resolveThemeTokens", () => {
    const source = readSource(PREVIEW_THEME);
    expect(source).toContain("resolveThemeTokens");
    expect(source).toContain("@preview/lib/generated/theme-tokens");
    // The hand-authored color tables + chart algorithm are gone.
    expect(source).not.toContain("BASE_COLORS_HSL");
    expect(source).not.toContain("THEME_ACCENTS");
    expect(source).not.toContain("chartRampFromHsl");
    expect(readSource(PREVIEW_RENDERER)).not.toContain("chartRampFromHsl");
  });

  it("keeps the decode/apply API and cssColorValues OKLCH vs HSL contract", () => {
    const source = readSource(PREVIEW_THEME);
    expect(source).toContain("export function applyPreviewTheme");
    expect(source).toContain("export function decodePreviewPreset");
    expect(source).toContain("export function decodePreviewPresetWithWarnings");
    // cssColorValues=true -> complete OKLCH; false -> NativeWind HSL triplets.
    expect(source).toContain("options.cssColorValues ? 'oklch' : 'hsl'");
    // Iterates the canonical token keys and emits the destructive-foreground shim.
    expect(source).toContain("for (const key of THEME_TOKEN_KEYS)");
    expect(source).toContain("--destructive-foreground");
    // Preview and generated CSS expose the same canonical menu metadata surface.
    expect(source).toContain("--lvcn-menu-accent");
    expect(source).toContain("--lvcn-menu-color");
  });

  it("applies the normalized default theme when the raw preview preset is invalid", () => {
    const source = readSource(PREVIEW_DESIGN_SYSTEM);
    expect(source).toContain("themePreset: undefined");
    expect(source).toContain("themePreset: preset");
    expect(source).toContain("applyPreviewTheme(activeDesign.themePreset");
    expect(source).toContain("activeDesign.preset !== preset");
  });

  it("drops the copied wire codec + color maps from present.tsx but keeps the handshake and web font", () => {
    const source = readSource(PRESENT);
    // Copied codec / color / radius / font maps removed.
    expect(source).not.toContain("PRESET_FIELDS_V1");
    expect(source).not.toContain("BASE_COLORS_HSL");
    expect(source).not.toContain("THEME_ACCENTS");
    expect(source).not.toContain("function fromBase62");
    // Uses the generated catalog + shared runtime instead.
    expect(source).toContain("applyPreviewTheme");
    expect(source).toContain("FONT_MANIFEST");
    // Preview-child handshake + dynamic web font loading preserved.
    expect(source).toContain("createPreviewChild");
    expect(source).toContain("google-font-customizer");
    expect(source).toContain("function loadCustomizerWebFonts");
    expect(source).toContain("Array.from(new Set(fontKeys))");
    expect(source).toContain("if (!font) return []");
    expect(source).toContain('families.join("&")');
    expect(source).toContain("loadCustomizerWebFonts([normalization.config.font, headingFont])");

    const textSource = readSource(PREVIEW_TEXT);
    expect(textSource).toContain("'font-heading text-center");
    expect(textSource).toContain("'var(--font-heading)'");
    expect(textSource).toContain("'var(--font-sans)'");
  });

  it("emits byte-identical canonical theme-token copies to the preset package and preview app", () => {
    const previewCopy = readSource(
      "apps/preview/src/lib/generated/theme-tokens.ts",
    ).replace(/\r\n/g, "\n");
    const presetCopy = readSource(
      "packages/lovdacn/src/preset/generated-theme-tokens.ts",
    ).replace(/\r\n/g, "\n");
    expect(previewCopy).toBe(presetCopy);
  });

  it("keeps the two preset-catalog copies (preview + create) byte-identical", () => {
    const previewCatalog = readSource(
      "apps/preview/src/lib/generated/preset-catalog.ts",
    ).replace(/\r\n/g, "\n");
    const createCatalog = readSource(
      "apps/v2/app/create/generated/preset-catalog.ts",
    ).replace(/\r\n/g, "\n");
    expect(previewCatalog).toBe(createCatalog);
  });
});
