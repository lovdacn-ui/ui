import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  BASE_COLOR_NAMES,
  RADIUS_VALUES,
  THEME_COMPATIBILITY,
  THEME_TOKEN_KEYS,
  THEME_TOKEN_NAMES,
  THEME_TOKENS,
  oklchToHsl,
  resolveThemeTokens,
} from "../src/preset/generated-theme-tokens";

const here = dirname(fileURLToPath(import.meta.url));
const canonical = JSON.parse(
  readFileSync(join(here, "../design-system/theme-tokens.json"), "utf8"),
) as {
  provenance: { sources: Array<{ id: string; path: string }> };
  themes: Record<
    string,
    { kind: "base" | "accent"; cssVars: { light: Record<string, string>; dark: Record<string, string> } }
  >;
};

describe("canonical theme-tokens.json source", () => {
  it("records provenance for themes.ts plus the slate and gray color sources", () => {
    const ids = canonical.provenance.sources.map((source) => source.id);
    expect(ids).toEqual(["shadcn-themes", "shadcn-slate", "shadcn-gray"]);
    expect(canonical.provenance.sources[0]!.path).toBe(
      "ui/apps/v4/registry/themes.ts",
    );
  });

  it("keeps the exact vendored slate and gray primaries (no hand-approximation)", () => {
    // Sourced verbatim from public/r/colors/{slate,gray}.json cssVarsV4.
    expect(canonical.themes.slate!.cssVars.light.primary).toBe(
      "oklch(0.208 0.042 265.755)",
    );
    expect(canonical.themes.gray!.cssVars.light.primary).toBe(
      "oklch(0.21 0.034 264.665)",
    );
  });

  it("carries all 26 themes: 9 full base themes and 17 accent themes", () => {
    const names = Object.keys(canonical.themes);
    expect(names).toHaveLength(26);
    const bases = names.filter((name) => canonical.themes[name]!.kind === "base");
    const accents = names.filter((name) => canonical.themes[name]!.kind === "accent");
    expect(bases).toHaveLength(9);
    expect(accents).toHaveLength(17);
  });
});

describe("generated theme token module", () => {
  it("exposes the full catalog superset and base colors", () => {
    expect(THEME_TOKEN_NAMES).toHaveLength(26);
    expect(BASE_COLOR_NAMES).toHaveLength(9);
    for (const added of ["mauve", "olive", "mist", "taupe"] as const) {
      expect(THEME_TOKEN_NAMES).toContain(added);
    }
  });

  it("keeps every token key including the sidebar tokens", () => {
    for (const key of [
      "background",
      "primary",
      "ring",
      "chart-1",
      "chart-5",
      "sidebar",
      "sidebar-primary",
      "sidebar-primary-foreground",
      "sidebar-border",
      "sidebar-ring",
    ]) {
      expect(THEME_TOKEN_KEYS).toContain(key);
    }
    expect(THEME_TOKEN_KEYS).not.toContain("radius");
  });

  it("uses the shadcn radius values while retaining none and full", () => {
    expect(RADIUS_VALUES).toMatchObject({
      default: "0.625rem",
      small: "0.45rem",
      medium: "0.625rem",
      large: "0.875rem",
      none: "0rem",
      full: "1.5rem",
    });
  });

  it("treats every base color as a complete base-kind theme", () => {
    for (const base of BASE_COLOR_NAMES) {
      const entry = THEME_TOKENS[base];
      expect(entry.kind).toBe("base");
      for (const scheme of ["light", "dark"] as const) {
        for (const key of THEME_TOKEN_KEYS) {
          expect(entry[scheme][key], `${base}.${scheme}.${key}`).toBeDefined();
        }
      }
    }
  });

  it("lists each base color's own theme plus every accent as compatible", () => {
    for (const base of BASE_COLOR_NAMES) {
      const compatible = THEME_COMPATIBILITY[base];
      expect(compatible).toContain(base);
      expect(compatible).toContain("blue");
      expect(compatible).toHaveLength(18); // own monochrome + 17 accents
    }
  });
});

describe("oklchToHsl converter", () => {
  it("is deterministic", () => {
    const value = "oklch(0.646 0.222 41.116)";
    expect(oklchToHsl(value)).toBe(oklchToHsl(value));
  });

  it("converts pure white and black without spurious chroma", () => {
    expect(oklchToHsl("oklch(1 0 0)")).toBe("0 0% 100%");
    expect(oklchToHsl("oklch(0 0 0)")).toBe("0 0% 0%");
  });

  it("preserves OKLCH alpha instead of returning black", () => {
    expect(oklchToHsl("oklch(1 0 0 / 10%)")).toBe("0 0% 100% / 10%");
    expect(oklchToHsl("oklch(1 0 0 / 15%)")).toBe("0 0% 100% / 15%");
    expect(oklchToHsl("oklch(1 0 0 / 10%)")).not.toBe("0 0% 0%");
  });

  it("returns unparseable input unchanged", () => {
    expect(oklchToHsl("var(--primary)")).toBe("var(--primary)");
    expect(oklchToHsl("rgb(1 2 3)")).toBe("rgb(1 2 3)");
  });
});

describe("resolveThemeTokens merge order", () => {
  const input = {
    baseColor: "neutral",
    theme: "blue",
    chartColor: "teal",
    radius: "medium",
  } as const;

  it("layers base map, then theme overrides, then independent chart replacement", () => {
    const resolved = resolveThemeTokens(input);

    // 1. base map supplies the neutral scaffold.
    expect(resolved.light.background).toBe(THEME_TOKENS.neutral.light.background);
    expect(resolved.light["sidebar-border"]).toBe(
      THEME_TOKENS.neutral.light["sidebar-border"],
    );

    // 2. theme partial overrides win over the base (primary + secondary).
    expect(resolved.light.primary).toBe(THEME_TOKENS.blue.light.primary);
    expect(resolved.light.secondary).toBe(THEME_TOKENS.blue.light.secondary);

    // 3. chart-1..5 come independently from the chart color, overriding the theme.
    expect(resolved.light["chart-1"]).toBe(THEME_TOKENS.teal.light["chart-1"]);
    expect(resolved.light["chart-1"]).not.toBe(THEME_TOKENS.blue.light["chart-1"]);

    // requested radius is applied last as a top-level field.
    expect(resolved.radius).toBe("0.625rem");
  });

  it("emits deterministic HSL equivalents with alpha preserved", () => {
    const resolved = resolveThemeTokens(input, { format: "hsl" });
    // neutral dark border is oklch(1 0 0 / 10%): alpha must survive, not go black.
    expect(resolved.dark.border).toBe("0 0% 100% / 10%");
    expect(resolved.dark.border).not.toBe("0 0% 0%");
  });
});
