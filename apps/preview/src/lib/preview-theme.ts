import {
  DEFAULT_PRESET_CONFIG,
  FONT_MANIFEST,
  RADIUS_VALUES,
  decodePresetWithWarnings,
  type PresetConfig,
  type PresetNormalization,
} from '@preview/lib/generated/preset-catalog';

export type PreviewColorScheme = 'light' | 'dark';

export function decodePreviewPreset(code: string): PresetConfig | null {
  return decodePresetWithWarnings(code)?.config ?? null;
}

export function decodePreviewPresetWithWarnings(code: string): PresetNormalization | null {
  return decodePresetWithWarnings(code);
}

type ColorSet = {
  light: Record<string, string>;
  dark: Record<string, string>;
};

const BASE_COLORS_HSL: Record<string, ColorSet> = {
  zinc: {
    light: { background: '0 0% 100%', foreground: '240 10% 3.9%', card: '0 0% 100%', 'card-foreground': '240 10% 3.9%', popover: '0 0% 100%', 'popover-foreground': '240 10% 3.9%', secondary: '240 4.8% 95.9%', 'secondary-foreground': '240 5.9% 10%', muted: '240 4.8% 95.9%', 'muted-foreground': '240 3.8% 46.1%', accent: '240 4.8% 95.9%', 'accent-foreground': '240 5.9% 10%', destructive: '0 84.2% 60.2%', 'destructive-foreground': '0 0% 98%', border: '240 5.9% 90%', input: '240 5.9% 90%', ring: '240 10% 3.9%' },
    dark: { background: '240 10% 3.9%', foreground: '0 0% 98%', card: '240 10% 3.9%', 'card-foreground': '0 0% 98%', popover: '240 10% 3.9%', 'popover-foreground': '0 0% 98%', secondary: '240 3.7% 15.9%', 'secondary-foreground': '0 0% 98%', muted: '240 3.7% 15.9%', 'muted-foreground': '240 5% 64.9%', accent: '240 3.7% 15.9%', 'accent-foreground': '0 0% 98%', destructive: '0 62.8% 30.6%', 'destructive-foreground': '0 0% 98%', border: '240 3.7% 15.9%', input: '240 3.7% 15.9%', ring: '240 4.9% 83.9%' },
  },
  slate: {
    light: { background: '0 0% 100%', foreground: '222.2 84% 4.9%', card: '0 0% 100%', 'card-foreground': '222.2 84% 4.9%', popover: '0 0% 100%', 'popover-foreground': '222.2 84% 4.9%', secondary: '210 40% 96.1%', 'secondary-foreground': '222.2 47.4% 11.2%', muted: '210 40% 96.1%', 'muted-foreground': '215.4 16.3% 46.9%', accent: '210 40% 96.1%', 'accent-foreground': '222.2 47.4% 11.2%', destructive: '0 84.2% 60.2%', 'destructive-foreground': '210 40% 98%', border: '214.3 31.8% 91.4%', input: '214.3 31.8% 91.4%', ring: '222.2 84% 4.9%' },
    dark: { background: '222.2 84% 4.9%', foreground: '210 40% 98%', card: '222.2 84% 4.9%', 'card-foreground': '210 40% 98%', popover: '222.2 84% 4.9%', 'popover-foreground': '210 40% 98%', secondary: '217.2 32.6% 17.5%', 'secondary-foreground': '210 40% 98%', muted: '217.2 32.6% 17.5%', 'muted-foreground': '215 20.2% 65.1%', accent: '217.2 32.6% 17.5%', 'accent-foreground': '210 40% 98%', destructive: '0 62.8% 30.6%', 'destructive-foreground': '210 40% 98%', border: '217.2 32.6% 17.5%', input: '217.2 32.6% 17.5%', ring: '212.7 26.8% 83.9%' },
  },
  stone: {
    light: { background: '0 0% 100%', foreground: '24 9.8% 10%', card: '0 0% 100%', 'card-foreground': '24 9.8% 10%', popover: '0 0% 100%', 'popover-foreground': '24 9.8% 10%', secondary: '60 4.8% 95.9%', 'secondary-foreground': '24 9.8% 10%', muted: '60 4.8% 95.9%', 'muted-foreground': '25 5.3% 44.7%', accent: '60 4.8% 95.9%', 'accent-foreground': '24 9.8% 10%', destructive: '0 84.2% 60.2%', 'destructive-foreground': '60 9.1% 97.8%', border: '20 5.9% 90%', input: '20 5.9% 90%', ring: '24 9.8% 10%' },
    dark: { background: '24 9.8% 10%', foreground: '60 9.1% 97.8%', card: '24 9.8% 10%', 'card-foreground': '60 9.1% 97.8%', popover: '24 9.8% 10%', 'popover-foreground': '60 9.1% 97.8%', secondary: '12 6.5% 15.1%', 'secondary-foreground': '60 9.1% 97.8%', muted: '12 6.5% 15.1%', 'muted-foreground': '24 5.4% 63.9%', accent: '12 6.5% 15.1%', 'accent-foreground': '60 9.1% 97.8%', destructive: '0 62.8% 30.6%', 'destructive-foreground': '60 9.1% 97.8%', border: '12 6.5% 15.1%', input: '12 6.5% 15.1%', ring: '24 5.7% 82.9%' },
  },
  gray: {
    light: { background: '0 0% 100%', foreground: '220 8.9% 4%', card: '0 0% 100%', 'card-foreground': '220 8.9% 4%', popover: '0 0% 100%', 'popover-foreground': '220 8.9% 4%', secondary: '220 14.3% 95.9%', 'secondary-foreground': '220 8.9% 4%', muted: '220 14.3% 95.9%', 'muted-foreground': '220 8.9% 46.1%', accent: '220 14.3% 95.9%', 'accent-foreground': '220 8.9% 4%', destructive: '0 84.2% 60.2%', 'destructive-foreground': '210 20% 98%', border: '220 13% 91%', input: '220 13% 91%', ring: '220 8.9% 4%' },
    dark: { background: '220 8.9% 4%', foreground: '210 20% 98%', card: '220 8.9% 4%', 'card-foreground': '210 20% 98%', popover: '220 8.9% 4%', 'popover-foreground': '210 20% 98%', secondary: '215 13.8% 12.4%', 'secondary-foreground': '210 20% 98%', muted: '215 13.8% 12.4%', 'muted-foreground': '217.9 10.6% 64.9%', accent: '215 13.8% 12.4%', 'accent-foreground': '210 20% 98%', destructive: '0 62.8% 30.6%', 'destructive-foreground': '210 20% 98%', border: '215 13.8% 12.4%', input: '215 13.8% 12.4%', ring: '216 12.2% 83.9%' },
  },
  neutral: {
    light: { background: '0 0% 100%', foreground: '0 0% 3.9%', card: '0 0% 100%', 'card-foreground': '0 0% 3.9%', popover: '0 0% 100%', 'popover-foreground': '0 0% 3.9%', secondary: '0 0% 96.1%', 'secondary-foreground': '0 0% 9%', muted: '0 0% 96.1%', 'muted-foreground': '0 0% 45.1%', accent: '0 0% 96.1%', 'accent-foreground': '0 0% 9%', destructive: '0 84.2% 60.2%', 'destructive-foreground': '0 0% 98%', border: '0 0% 89.8%', input: '0 0% 89.8%', ring: '0 0% 3.9%' },
    dark: { background: '0 0% 3.9%', foreground: '0 0% 98%', card: '0 0% 3.9%', 'card-foreground': '0 0% 98%', popover: '0 0% 3.9%', 'popover-foreground': '0 0% 98%', secondary: '0 0% 14.9%', 'secondary-foreground': '0 0% 98%', muted: '0 0% 14.9%', 'muted-foreground': '0 0% 63.9%', accent: '0 0% 14.9%', 'accent-foreground': '0 0% 98%', destructive: '0 62.8% 30.6%', 'destructive-foreground': '0 0% 98%', border: '0 0% 14.9%', input: '0 0% 14.9%', ring: '0 0% 83.1%' },
  },
  taupe: {
    light: { background: '0 0% 100%', foreground: '24 5% 10%', card: '0 0% 100%', 'card-foreground': '24 5% 10%', popover: '0 0% 100%', 'popover-foreground': '24 5% 10%', secondary: '30 6% 96%', 'secondary-foreground': '24 5% 10%', muted: '30 6% 96%', 'muted-foreground': '30 5% 45%', accent: '30 6% 96%', 'accent-foreground': '24 5% 10%', destructive: '0 84.2% 60.2%', 'destructive-foreground': '0 0% 98%', border: '30 5% 90%', input: '30 5% 90%', ring: '24 5% 10%' },
    dark: { background: '24 5% 10%', foreground: '30 6% 98%', card: '24 5% 10%', 'card-foreground': '30 6% 98%', popover: '24 5% 10%', 'popover-foreground': '30 6% 98%', secondary: '24 6% 16%', 'secondary-foreground': '30 6% 98%', muted: '24 6% 16%', 'muted-foreground': '30 5% 65%', accent: '24 6% 16%', 'accent-foreground': '30 6% 98%', destructive: '0 62.8% 30.6%', 'destructive-foreground': '0 0% 98%', border: '24 6% 16%', input: '24 6% 16%', ring: '30 5% 83%' },
  },
  mauve: {
    light: { background: '0 0% 100%', foreground: '290 5% 10%', card: '0 0% 100%', 'card-foreground': '290 5% 10%', popover: '0 0% 100%', 'popover-foreground': '290 5% 10%', secondary: '290 6% 96%', 'secondary-foreground': '290 5% 10%', muted: '290 6% 96%', 'muted-foreground': '290 5% 45%', accent: '290 6% 96%', 'accent-foreground': '290 5% 10%', destructive: '0 84.2% 60.2%', 'destructive-foreground': '0 0% 98%', border: '290 5% 90%', input: '290 5% 90%', ring: '290 5% 10%' },
    dark: { background: '290 5% 10%', foreground: '290 6% 98%', card: '290 5% 10%', 'card-foreground': '290 6% 98%', popover: '290 5% 10%', 'popover-foreground': '290 6% 98%', secondary: '290 6% 16%', 'secondary-foreground': '290 6% 98%', muted: '290 6% 16%', 'muted-foreground': '290 5% 65%', accent: '290 6% 16%', 'accent-foreground': '290 6% 98%', destructive: '0 62.8% 30.6%', 'destructive-foreground': '0 0% 98%', border: '290 6% 16%', input: '290 6% 16%', ring: '290 5% 83%' },
  },
  olive: {
    light: { background: '0 0% 100%', foreground: '110 5% 10%', card: '0 0% 100%', 'card-foreground': '110 5% 10%', popover: '0 0% 100%', 'popover-foreground': '110 5% 10%', secondary: '110 6% 96%', 'secondary-foreground': '110 5% 10%', muted: '110 6% 96%', 'muted-foreground': '110 5% 45%', accent: '110 6% 96%', 'accent-foreground': '110 5% 10%', destructive: '0 84.2% 60.2%', 'destructive-foreground': '0 0% 98%', border: '110 5% 90%', input: '110 5% 90%', ring: '110 5% 10%' },
    dark: { background: '110 5% 10%', foreground: '110 6% 98%', card: '110 5% 10%', 'card-foreground': '110 6% 98%', popover: '110 5% 10%', 'popover-foreground': '110 6% 98%', secondary: '110 6% 16%', 'secondary-foreground': '110 6% 98%', muted: '110 6% 16%', 'muted-foreground': '110 5% 65%', accent: '110 6% 16%', 'accent-foreground': '110 6% 98%', destructive: '0 62.8% 30.6%', 'destructive-foreground': '0 0% 98%', border: '110 6% 16%', input: '110 6% 16%', ring: '110 5% 83%' },
  },
  mist: {
    light: { background: '0 0% 100%', foreground: '228 4% 5%', card: '0 0% 100%', 'card-foreground': '228 4% 5%', popover: '0 0% 100%', 'popover-foreground': '228 4% 5%', secondary: '197 2% 95%', 'secondary-foreground': '223 6% 13%', muted: '197 2% 95%', 'muted-foreground': '213 7% 45%', accent: '197 2% 95%', 'accent-foreground': '223 6% 13%', destructive: '0 84.2% 60.2%', 'destructive-foreground': '197 2% 98%', border: '214 5% 91%', input: '214 5% 91%', ring: '223 6% 13%' },
    dark: { background: '228 4% 5%', foreground: '197 2% 98%', card: '223 6% 13%', 'card-foreground': '197 2% 98%', popover: '223 6% 13%', 'popover-foreground': '197 2% 98%', secondary: '216 4% 17%', 'secondary-foreground': '197 2% 98%', muted: '216 4% 17%', 'muted-foreground': '214 6% 65%', accent: '216 4% 17%', 'accent-foreground': '197 2% 98%', destructive: '0 62.8% 30.6%', 'destructive-foreground': '197 2% 98%', border: '216 4% 17%', input: '216 4% 17%', ring: '213 7% 45%' },
  },
};

type AccentSet = {
  light: { primary: string; foreground: string };
  dark: { primary: string; foreground: string };
};

const THEME_ACCENTS: Record<string, AccentSet> = {
  zinc: { light: { primary: '240 5.9% 10%', foreground: '0 0% 98%' }, dark: { primary: '0 0% 98%', foreground: '240 5.9% 10%' } },
  slate: { light: { primary: '222.2 47.4% 11.2%', foreground: '210 40% 98%' }, dark: { primary: '210 40% 98%', foreground: '222.2 47.4% 11.2%' } },
  stone: { light: { primary: '24 9.8% 10%', foreground: '60 9.1% 97.8%' }, dark: { primary: '60 9.1% 97.8%', foreground: '24 9.8% 10%' } },
  gray: { light: { primary: '220 8.9% 4%', foreground: '210 20% 98%' }, dark: { primary: '210 20% 98%', foreground: '220 8.9% 4%' } },
  neutral: { light: { primary: '0 0% 9%', foreground: '0 0% 98%' }, dark: { primary: '0 0% 98%', foreground: '0 0% 9%' } },
  red: { light: { primary: '0 84.2% 60.2%', foreground: '0 0% 98%' }, dark: { primary: '0 72.2% 50.6%', foreground: '0 0% 98%' } },
  orange: { light: { primary: '24.6 95% 53.1%', foreground: '60 9.1% 97.8%' }, dark: { primary: '20.5 90.2% 48.2%', foreground: '60 9.1% 97.8%' } },
  amber: { light: { primary: '37.9 92.1% 50.2%', foreground: '20 14.3% 4.1%' }, dark: { primary: '37.9 92.1% 50.2%', foreground: '20 14.3% 4.1%' } },
  yellow: { light: { primary: '47.9 95.8% 51.2%', foreground: '26 83.3% 14.1%' }, dark: { primary: '47.9 95.8% 51.2%', foreground: '26 83.3% 14.1%' } },
  lime: { light: { primary: '84.8 81% 44%', foreground: '20 14.3% 4.1%' }, dark: { primary: '84.8 81% 44%', foreground: '20 14.3% 4.1%' } },
  green: { light: { primary: '142.1 76.2% 36.3%', foreground: '355.6 100% 99.7%' }, dark: { primary: '142.1 70.6% 45.3%', foreground: '144.4 61.5% 7.6%' } },
  emerald: { light: { primary: '161.4 93.5% 30.4%', foreground: '355.6 100% 99.7%' }, dark: { primary: '161.4 93.5% 30.4%', foreground: '355.6 100% 99.7%' } },
  teal: { light: { primary: '174.7 83.9% 31.6%', foreground: '355.6 100% 99.7%' }, dark: { primary: '174.7 83.9% 31.6%', foreground: '355.6 100% 99.7%' } },
  cyan: { light: { primary: '188.7 94.5% 42.7%', foreground: '210 40% 98%' }, dark: { primary: '188.7 94.5% 42.7%', foreground: '210 40% 98%' } },
  sky: { light: { primary: '198.6 88.7% 48.4%', foreground: '210 40% 98%' }, dark: { primary: '198.6 88.7% 48.4%', foreground: '210 40% 98%' } },
  blue: { light: { primary: '221.2 83.2% 53.3%', foreground: '210 40% 98%' }, dark: { primary: '217.2 91.2% 59.8%', foreground: '222.2 47.4% 11.2%' } },
  indigo: { light: { primary: '238.9 70% 50.4%', foreground: '210 40% 98%' }, dark: { primary: '238.9 70% 50.4%', foreground: '210 40% 98%' } },
  violet: { light: { primary: '262.1 83.3% 57.8%', foreground: '210 40% 98%' }, dark: { primary: '263.4 70% 50.4%', foreground: '210 40% 98%' } },
  purple: { light: { primary: '270.7 91% 38.4%', foreground: '210 40% 98%' }, dark: { primary: '270.7 91% 38.4%', foreground: '210 40% 98%' } },
  fuchsia: { light: { primary: '292.2 84.1% 49%', foreground: '210 40% 98%' }, dark: { primary: '292.2 84.1% 49%', foreground: '210 40% 98%' } },
  pink: { light: { primary: '327.3 73.6% 50.4%', foreground: '210 40% 98%' }, dark: { primary: '327.3 73.6% 50.4%', foreground: '210 40% 98%' } },
  rose: { light: { primary: '346.8 77.2% 49.8%', foreground: '355.6 100% 99.7%' }, dark: { primary: '346.8 77.2% 49.8%', foreground: '355.6 100% 99.7%' } },
};

function chartRampFromHsl(hsl: string, isDark: boolean) {
  const match = hsl.trim().match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);
  if (!match) return [hsl, hsl, hsl, hsl, hsl];
  const stops = isDark ? [58, 68, 48, 76, 40] : [52, 62, 42, 72, 34];
  return stops.map((lightness) => `${match[1]} ${match[2]}% ${lightness}%`);
}

export type PreviewThemeOptions = {
  /** Tailwind v4 consumes complete CSS colors instead of HSL components. */
  cssColorValues?: boolean;
};

export function applyPreviewTheme(
  preset: string | undefined,
  colorScheme: PreviewColorScheme,
  options: PreviewThemeOptions = {}
): PresetNormalization | null {
  const root = document.documentElement;
  const isDark = colorScheme === 'dark';
  const colorValue = (value: string) =>
    options.cssColorValues ? `hsl(${value})` : value;
  root.classList.toggle('dark', isDark);
  root.style.colorScheme = colorScheme;

  const normalization = preset
    ? decodePreviewPresetWithWarnings(preset)
    : { config: DEFAULT_PRESET_CONFIG, warnings: [] };
  if (!normalization) return null;
  const { config } = normalization;

  const baseColors = BASE_COLORS_HSL[config.baseColor] ?? BASE_COLORS_HSL.neutral;
  const activeColors = isDark ? baseColors.dark : baseColors.light;
  for (const [key, value] of Object.entries(activeColors)) {
    root.style.setProperty(`--${key}`, colorValue(value));
  }

  const theme = THEME_ACCENTS[config.theme] ?? THEME_ACCENTS.cyan;
  const activeTheme = isDark ? theme.dark : theme.light;
  root.style.setProperty('--primary', colorValue(activeTheme.primary));
  root.style.setProperty('--primary-foreground', colorValue(activeTheme.foreground));
  root.style.setProperty('--ring', colorValue(activeTheme.primary));

  const chartTheme = THEME_ACCENTS[config.chartColor] ?? THEME_ACCENTS.teal;
  const activeChart = isDark ? chartTheme.dark : chartTheme.light;
  chartRampFromHsl(activeChart.primary, isDark).forEach((color, index) => {
    root.style.setProperty(`--chart-${index + 1}`, colorValue(color));
  });

  root.style.setProperty('--radius', RADIUS_VALUES[config.radius]);
  const font = FONT_MANIFEST[config.font];
  root.style.setProperty('--font-sans', `'${font.family}', ${font.fallback}`);
  return normalization;
}
