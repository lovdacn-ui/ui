import {
  DEFAULT_PRESET_CONFIG,
  FONT_MANIFEST,
  decodePresetWithWarnings,
  resolveEffectiveRadius,
  type PresetConfig,
  type PresetNormalization,
} from '@preview/lib/generated/preset-catalog';
import {
  BASE_COLOR_NAMES,
  RADIUS_NAMES,
  THEME_TOKEN_KEYS,
  THEME_TOKEN_NAMES,
  resolveThemeTokens,
  type BaseColorName,
  type RadiusName,
  type ThemeTokenName,
} from '@preview/lib/generated/theme-tokens';

export type PreviewColorScheme = 'light' | 'dark';

export function decodePreviewPreset(code: string): PresetConfig | null {
  return decodePresetWithWarnings(code)?.config ?? null;
}

export function decodePreviewPresetWithWarnings(code: string): PresetNormalization | null {
  return decodePresetWithWarnings(code);
}

// Narrow the preset strings to the canonical resolver's unions. Unknown/omitted
// values fall back safely (mirrors the CLI): base -> neutral, theme -> the base
// color, chart -> the theme (else base). This keeps the emitted map complete and
// never defaults to a black or blue fallback.
const isBaseColorName = (value: string): value is BaseColorName =>
  (BASE_COLOR_NAMES as readonly string[]).includes(value);
const isThemeTokenName = (value: string | undefined): value is ThemeTokenName =>
  value !== undefined && (THEME_TOKEN_NAMES as readonly string[]).includes(value);
const isRadiusName = (value: string | undefined): value is RadiusName =>
  value !== undefined && (RADIUS_NAMES as readonly string[]).includes(value);

// shadcn's canonical token set no longer ships --destructive-foreground, but the
// preview tailwind config and existing components still reference it. Emit a
// near-white value in both schemes so destructive surfaces stay legible.
const destructiveForeground = (cssColorValues: boolean): string =>
  cssColorValues ? 'oklch(0.985 0 0)' : '0 0% 98%';

export type PreviewThemeOptions = {
  /** Tailwind v4 / uniwind consumes complete CSS colors instead of HSL components. */
  cssColorValues?: boolean;
};

export function applyPreviewTheme(
  preset: string | undefined,
  colorScheme: PreviewColorScheme,
  options: PreviewThemeOptions = {}
): PresetNormalization | null {
  const root = document.documentElement;
  const isDark = colorScheme === 'dark';
  root.classList.toggle('dark', isDark);
  root.style.colorScheme = colorScheme;

  const normalization = preset
    ? decodePreviewPresetWithWarnings(preset)
    : { config: DEFAULT_PRESET_CONFIG, warnings: [] };
  if (!normalization) return null;
  const { config } = normalization;

  // Resolve the COMPLETE light/dark token maps (core + chart + sidebar) from the
  // canonical resolver. cssColorValues emits raw OKLCH; otherwise NativeWind HSL
  // triplets with alpha preserved.
  const format = options.cssColorValues ? 'oklch' : 'hsl';
  const baseColor: BaseColorName = isBaseColorName(config.baseColor)
    ? config.baseColor
    : 'neutral';
  const theme: ThemeTokenName = isThemeTokenName(config.theme) ? config.theme : baseColor;
  const chartColor: ThemeTokenName = isThemeTokenName(config.chartColor)
    ? config.chartColor
    : isThemeTokenName(config.theme)
      ? config.theme
      : baseColor;
  const effectiveRadius = resolveEffectiveRadius(config);
  const radius: RadiusName = isRadiusName(effectiveRadius) ? effectiveRadius : 'default';

  const resolved = resolveThemeTokens({ baseColor, theme, chartColor, radius }, { format });
  const scheme = { ...(isDark ? resolved.dark : resolved.light) };
  if (config.menuAccent === 'bold') {
    scheme.accent = scheme.primary;
    scheme['accent-foreground'] = scheme['primary-foreground'];
  }
  root.dataset.menuAccent = config.menuAccent;
  root.dataset.menuColor = config.menuColor;
  root.style.setProperty('--lvcn-menu-accent', config.menuAccent);
  root.style.setProperty('--lvcn-menu-color', config.menuColor);

  for (const key of THEME_TOKEN_KEYS) {
    root.style.setProperty(`--${key}`, scheme[key]);
  }
  root.style.setProperty(
    '--destructive-foreground',
    destructiveForeground(Boolean(options.cssColorValues))
  );

  root.style.setProperty('--radius', resolved.radius);
  const font = FONT_MANIFEST[config.font];
  const headingFont = FONT_MANIFEST[
    config.fontHeading === 'inherit' ? config.font : config.fontHeading
  ];
  root.style.setProperty('--font-sans', `'${font.family}', ${font.fallback}`);
  root.style.setProperty('--font-heading', `'${headingFont.family}', ${headingFont.fallback}`);
  return normalization;
}
