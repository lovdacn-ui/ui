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
const PREVIEW_RENDERER = "apps/preview/src/components/preview-renderer.tsx";
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
