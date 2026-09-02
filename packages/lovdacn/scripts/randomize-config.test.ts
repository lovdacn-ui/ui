import { describe, expect, it } from "vitest";

import {
  ACCENT_PRESET_THEMES,
  DEFAULT_PRESET_CONFIG,
  PRESET_BASE_COLORS,
  PRESET_THEMES,
  THEME_COMPATIBILITY,
  getCompatibleThemes,
  isThemeCompatible,
  randomizeConfig,
  type PresetConfig,
  type PresetField,
} from "../src/preset/generated-catalog";
import {
  BASE_COLOR_NAMES,
  THEME_TOKENS,
  THEME_TOKEN_NAMES,
} from "../src/preset/generated-theme-tokens";

const ALL_FIELDS: PresetField[] = [
  "style",
  "baseColor",
  "theme",
  "chartColor",
  "font",
  "fontHeading",
  "iconLibrary",
  "radius",
  "menuAccent",
  "menuColor",
];

describe("generated randomizeConfig compatibility", () => {
  it("draws every unlocked theme and chart from the chosen base's compatible set", () => {
    for (let i = 0; i < 500; i += 1) {
      const config = randomizeConfig();
      const compatible = getCompatibleThemes(config.baseColor);
      expect(compatible).toContain(config.theme);
      expect(compatible).toContain(config.chartColor);
      expect(isThemeCompatible(config.baseColor, config.theme)).toBe(true);
      expect(isThemeCompatible(config.baseColor, config.chartColor)).toBe(true);
    }
  });

  it("keeps a locked theme/chart untouched even when it is an incompatible neutral", () => {
    // Legacy neutral-on-neutral mix (zinc base + slate/stone themes). Locking the
    // theme/chart must preserve them verbatim for backward compatibility, even
    // though they are not in the new base's compatible set.
    const current: PresetConfig = {
      ...DEFAULT_PRESET_CONFIG,
      baseColor: "zinc",
      theme: "slate",
      chartColor: "stone",
    };
    expect(isThemeCompatible("zinc", "slate")).toBe(false);
    for (let i = 0; i < 200; i += 1) {
      const config = randomizeConfig(current, { theme: true, chartColor: true });
      expect(config.theme).toBe("slate");
      expect(config.chartColor).toBe("stone");
    }
  });

  it("honors a locked base and still scopes unlocked theme/chart to it", () => {
    const current: PresetConfig = { ...DEFAULT_PRESET_CONFIG, baseColor: "taupe" };
    for (let i = 0; i < 200; i += 1) {
      const config = randomizeConfig(current, { baseColor: true });
      expect(config.baseColor).toBe("taupe");
      expect(getCompatibleThemes("taupe")).toContain(config.theme);
      expect(getCompatibleThemes("taupe")).toContain(config.chartColor);
    }
  });

  it("returns a fully locked config unchanged", () => {
    const locked = Object.fromEntries(
      ALL_FIELDS.map((field) => [field, true]),
    ) as Partial<Record<PresetField, boolean>>;
    expect(randomizeConfig(DEFAULT_PRESET_CONFIG, locked)).toEqual(DEFAULT_PRESET_CONFIG);
  });
});

describe("Create page catalog coverage", () => {
  it("lists each base's own theme plus the 17 accents (18 total) within PRESET_THEMES", () => {
    for (const base of PRESET_BASE_COLORS) {
      const compatible = THEME_COMPATIBILITY[base];
      expect(compatible, `THEME_COMPATIBILITY[${base}]`).toBeDefined();
      expect(compatible).toContain(base);
      expect(compatible).toHaveLength(18);
      for (const accent of ACCENT_PRESET_THEMES) {
        expect(compatible).toContain(accent);
      }
      for (const theme of compatible) {
        expect(PRESET_THEMES).toContain(theme);
      }
    }
  });

  it("treats ACCENT_PRESET_THEMES as the 17 non-base catalog themes", () => {
    expect(ACCENT_PRESET_THEMES).toHaveLength(17);
    for (const accent of ACCENT_PRESET_THEMES) {
      expect(PRESET_THEMES).toContain(accent);
      expect(PRESET_BASE_COLORS as readonly string[]).not.toContain(accent);
    }
  });

  it("exposes a swatch source for every base color and theme the Create pickers render", () => {
    // BASE_COLOR_SWATCHES uses each base's muted-foreground.
    for (const base of BASE_COLOR_NAMES) {
      for (const scheme of ["light", "dark"] as const) {
        expect(THEME_TOKENS[base][scheme]["muted-foreground"], `${base}.${scheme}`).toBeTruthy();
      }
    }
    // THEME_SWATCHES uses each theme's primary; chart swatches use chart-1..5.
    for (const theme of THEME_TOKEN_NAMES) {
      for (const scheme of ["light", "dark"] as const) {
        expect(THEME_TOKENS[theme][scheme].primary, `${theme}.${scheme}.primary`).toBeTruthy();
        for (const key of ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"] as const) {
          expect(THEME_TOKENS[theme][scheme][key], `${theme}.${scheme}.${key}`).toBeTruthy();
        }
      }
    }
  });
});
