import * as React from "react";
import {
  View,
  ScrollView,
  Pressable,
  useColorScheme,
  Platform,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PortalHost } from "@rn-primitives/portal";
import { useLocalSearchParams, Link, useRouter } from "expo-router";

import { Text } from "@preview/components/ui/text";
import {
  COMPONENT_PREVIEW_NAMES,
  PreviewRenderer,
  chartRampFromHsl,
  hasComponentPreview,
} from "@preview/components/preview-renderer";
import {
  createPreviewChild,
  getReferrerOrigin,
} from "@preview/lib/preview-protocol";

// Preset encoding/decoding utilities copied from lovda preset config
const PRESET_STYLES = [
  "new-york",
  "default",
  "luma",
  "lyra",
  "maia",
  "mira",
  "nova",
  "rhea",
  "sera",
  "vega",
] as const;
const PRESET_BASE_COLORS = [
  "zinc",
  "slate",
  "stone",
  "gray",
  "neutral",
  "taupe",
  "mauve",
  "olive",
  "mist",
] as const;
const PRESET_THEMES = [
  "zinc",
  "slate",
  "stone",
  "gray",
  "neutral",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
] as const;
const PRESET_CHART_COLORS = PRESET_THEMES;
const PRESET_FONTS = [
  "inter",
  "dm-sans",
  "nunito-sans",
  "figtree",
  "outfit",
  "manrope",
  "space-grotesk",
  "montserrat",
  "roboto",
  "raleway",
  "public-sans",
  "source-sans-3",
  "lora",
  "merriweather",
  "playfair-display",
  "jetbrains-mono",
  "space-mono",
  "fira-code",
  "noto-serif",
  "roboto-slab",
  "instrument-sans",
  "instrument-serif",
  "geist",
] as const;
const PRESET_ICON_LIBRARIES = [
  "lucide",
  "phosphor",
  "tabler",
  "expo",
  "heroicons",
] as const;
const PRESET_RADII = [
  "default",
  "none",
  "small",
  "medium",
  "large",
  "full",
] as const;

const PRESET_FIELDS_V1 = [
  { key: "style", values: PRESET_STYLES, bits: 4 },
  { key: "baseColor", values: PRESET_BASE_COLORS, bits: 4 },
  { key: "theme", values: PRESET_THEMES, bits: 5 },
  { key: "chartColor", values: PRESET_CHART_COLORS, bits: 5 },
  { key: "font", values: PRESET_FONTS, bits: 5 },
  { key: "iconLibrary", values: PRESET_ICON_LIBRARIES, bits: 3 },
  { key: "radius", values: PRESET_RADII, bits: 3 },
] as const;

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function fromBase62(str: string): number {
  let result = 0;
  for (let i = 0; i < str.length; i++) {
    const idx = BASE62.indexOf(str.charAt(i));
    if (idx === -1) return -1;
    result = result * 62 + idx;
  }
  return result;
}

function decodePreset(code: string) {
  if (!code || code.length < 2) return null;
  if (code.charAt(0) !== "a") return null;
  const bits = fromBase62(code.slice(1));
  if (bits < 0) return null;

  const result: Record<string, string> = {};
  let offset = 0;
  for (const field of PRESET_FIELDS_V1) {
    const idx = Math.floor(bits / 2 ** offset) % 2 ** field.bits;
    const values = field.values as readonly string[];
    result[field.key] = idx < values.length ? values[idx]! : values[0]!;
    offset += field.bits;
  }
  return result;
}

// HSL mappings for base colors (background, card, border, etc.)
const BASE_COLORS_HSL: Record<
  string,
  {
    light: Record<string, string>;
    dark: Record<string, string>;
  }
> = {
  zinc: {
    light: {
      background: "0 0% 100%",
      foreground: "240 10% 3.9%",
      card: "0 0% 100%",
      "card-foreground": "240 10% 3.9%",
      popover: "0 0% 100%",
      "popover-foreground": "240 10% 3.9%",
      secondary: "240 4.8% 95.9%",
      "secondary-foreground": "240 5.9% 10%",
      muted: "240 4.8% 95.9%",
      "muted-foreground": "240 3.8% 46.1%",
      accent: "240 4.8% 95.9%",
      "accent-foreground": "240 5.9% 10%",
      destructive: "0 84.2% 60.2%",
      "destructive-foreground": "0 0% 98%",
      border: "240 5.9% 90%",
      input: "240 5.9% 90%",
      ring: "240 10% 3.9%",
    },
    dark: {
      background: "240 10% 3.9%",
      foreground: "0 0% 98%",
      card: "240 10% 3.9%",
      "card-foreground": "0 0% 98%",
      popover: "240 10% 3.9%",
      "popover-foreground": "0 0% 98%",
      secondary: "240 3.7% 15.9%",
      "secondary-foreground": "0 0% 98%",
      muted: "240 3.7% 15.9%",
      "muted-foreground": "240 5% 64.9%",
      accent: "240 3.7% 15.9%",
      "accent-foreground": "0 0% 98%",
      destructive: "0 62.8% 30.6%",
      "destructive-foreground": "0 0% 98%",
      border: "240 3.7% 15.9%",
      input: "240 3.7% 15.9%",
      ring: "240 4.9% 83.9%",
    },
  },
  slate: {
    light: {
      background: "0 0% 100%",
      foreground: "222.2 84% 4.9%",
      card: "0 0% 100%",
      "card-foreground": "222.2 84% 4.9%",
      popover: "0 0% 100%",
      "popover-foreground": "222.2 84% 4.9%",
      secondary: "210 40% 96.1%",
      "secondary-foreground": "222.2 47.4% 11.2%",
      muted: "210 40% 96.1%",
      "muted-foreground": "215.4 16.3% 46.9%",
      accent: "210 40% 96.1%",
      "accent-foreground": "222.2 47.4% 11.2%",
      destructive: "0 84.2% 60.2%",
      "destructive-foreground": "210 40% 98%",
      border: "214.3 31.8% 91.4%",
      input: "214.3 31.8% 91.4%",
      ring: "222.2 84% 4.9%",
    },
    dark: {
      background: "222.2 84% 4.9%",
      foreground: "210 40% 98%",
      card: "222.2 84% 4.9%",
      "card-foreground": "210 40% 98%",
      popover: "222.2 84% 4.9%",
      "popover-foreground": "210 40% 98%",
      secondary: "217.2 32.6% 17.5%",
      "secondary-foreground": "210 40% 98%",
      muted: "217.2 32.6% 17.5%",
      "muted-foreground": "215 20.2% 65.1%",
      accent: "217.2 32.6% 17.5%",
      "accent-foreground": "210 40% 98%",
      destructive: "0 62.8% 30.6%",
      "destructive-foreground": "210 40% 98%",
      border: "217.2 32.6% 17.5%",
      input: "217.2 32.6% 17.5%",
      ring: "212.7 26.8% 83.9%",
    },
  },
  stone: {
    light: {
      background: "0 0% 100%",
      foreground: "24 9.8% 10%",
      card: "0 0% 100%",
      "card-foreground": "24 9.8% 10%",
      popover: "0 0% 100%",
      "popover-foreground": "24 9.8% 10%",
      secondary: "60 4.8% 95.9%",
      "secondary-foreground": "24 9.8% 10%",
      muted: "60 4.8% 95.9%",
      "muted-foreground": "25 5.3% 44.7%",
      accent: "60 4.8% 95.9%",
      "accent-foreground": "24 9.8% 10%",
      destructive: "0 84.2% 60.2%",
      "destructive-foreground": "60 9.1% 97.8%",
      border: "20 5.9% 90%",
      input: "20 5.9% 90%",
      ring: "24 9.8% 10%",
    },
    dark: {
      background: "24 9.8% 10%",
      foreground: "60 9.1% 97.8%",
      card: "24 9.8% 10%",
      "card-foreground": "60 9.1% 97.8%",
      popover: "24 9.8% 10%",
      "popover-foreground": "60 9.1% 97.8%",
      secondary: "12 6.5% 15.1%",
      "secondary-foreground": "60 9.1% 97.8%",
      muted: "12 6.5% 15.1%",
      "muted-foreground": "24 5.4% 63.9%",
      accent: "12 6.5% 15.1%",
      "accent-foreground": "60 9.1% 97.8%",
      destructive: "0 62.8% 30.6%",
      "destructive-foreground": "60 9.1% 97.8%",
      border: "12 6.5% 15.1%",
      input: "12 6.5% 15.1%",
      ring: "24 5.7% 82.9%",
    },
  },
  gray: {
    light: {
      background: "0 0% 100%",
      foreground: "220 8.9% 4%",
      card: "0 0% 100%",
      "card-foreground": "220 8.9% 4%",
      popover: "0 0% 100%",
      "popover-foreground": "220 8.9% 4%",
      secondary: "220 14.3% 95.9%",
      "secondary-foreground": "220 8.9% 4%",
      muted: "220 14.3% 95.9%",
      "muted-foreground": "220 8.9% 46.1%",
      accent: "220 14.3% 95.9%",
      "accent-foreground": "220 8.9% 4%",
      destructive: "0 84.2% 60.2%",
      "destructive-foreground": "210 20% 98%",
      border: "220 13% 91%",
      input: "220 13% 91%",
      ring: "220 8.9% 4%",
    },
    dark: {
      background: "220 8.9% 4%",
      foreground: "210 20% 98%",
      card: "220 8.9% 4%",
      "card-foreground": "210 20% 98%",
      popover: "220 8.9% 4%",
      "popover-foreground": "210 20% 98%",
      secondary: "215 13.8% 12.4%",
      "secondary-foreground": "210 20% 98%",
      muted: "215 13.8% 12.4%",
      "muted-foreground": "217.9 10.6% 64.9%",
      accent: "215 13.8% 12.4%",
      "accent-foreground": "210 20% 98%",
      destructive: "0 62.8% 30.6%",
      "destructive-foreground": "210 20% 98%",
      border: "215 13.8% 12.4%",
      input: "215 13.8% 12.4%",
      ring: "216 12.2% 83.9%",
    },
  },
  neutral: {
    light: {
      background: "0 0% 100%",
      foreground: "0 0% 3.9%",
      card: "0 0% 100%",
      "card-foreground": "0 0% 3.9%",
      popover: "0 0% 100%",
      "popover-foreground": "0 0% 3.9%",
      secondary: "0 0% 96.1%",
      "secondary-foreground": "0 0% 9%",
      muted: "0 0% 96.1%",
      "muted-foreground": "0 0% 45.1%",
      accent: "0 0% 96.1%",
      "accent-foreground": "0 0% 9%",
      destructive: "0 84.2% 60.2%",
      "destructive-foreground": "0 0% 98%",
      border: "0 0% 89.8%",
      input: "0 0% 89.8%",
      ring: "0 0% 3.9%",
    },
    dark: {
      background: "0 0% 3.9%",
      foreground: "0 0% 98%",
      card: "0 0% 3.9%",
      "card-foreground": "0 0% 98%",
      popover: "0 0% 3.9%",
      "popover-foreground": "0 0% 98%",
      secondary: "0 0% 14.9%",
      "secondary-foreground": "0 0% 98%",
      muted: "0 0% 14.9%",
      "muted-foreground": "0 0% 63.9%",
      accent: "0 0% 14.9%",
      "accent-foreground": "0 0% 98%",
      destructive: "0 62.8% 30.6%",
      "destructive-foreground": "0 0% 98%",
      border: "0 0% 14.9%",
      input: "0 0% 14.9%",
      ring: "0 0% 83.1%",
    },
  },
  taupe: {
    light: {
      background: "0 0% 100%",
      foreground: "24 5% 10%",
      card: "0 0% 100%",
      "card-foreground": "24 5% 10%",
      popover: "0 0% 100%",
      "popover-foreground": "24 5% 10%",
      secondary: "30 6% 96%",
      "secondary-foreground": "24 5% 10%",
      muted: "30 6% 96%",
      "muted-foreground": "30 5% 45%",
      accent: "30 6% 96%",
      "accent-foreground": "24 5% 10%",
      destructive: "0 84.2% 60.2%",
      "destructive-foreground": "0 0% 98%",
      border: "30 5% 90%",
      input: "30 5% 90%",
      ring: "24 5% 10%",
    },
    dark: {
      background: "24 5% 10%",
      foreground: "30 6% 98%",
      card: "24 5% 10%",
      "card-foreground": "30 6% 98%",
      popover: "24 5% 10%",
      "popover-foreground": "30 6% 98%",
      secondary: "24 6% 16%",
      "secondary-foreground": "30 6% 98%",
      muted: "24 6% 16%",
      "muted-foreground": "30 5% 65%",
      accent: "24 6% 16%",
      "accent-foreground": "30 6% 98%",
      destructive: "0 62.8% 30.6%",
      "destructive-foreground": "0 0% 98%",
      border: "24 6% 16%",
      input: "24 6% 16%",
      ring: "30 5% 83%",
    },
  },
  mauve: {
    light: {
      background: "0 0% 100%",
      foreground: "290 5% 10%",
      card: "0 0% 100%",
      "card-foreground": "290 5% 10%",
      popover: "0 0% 100%",
      "popover-foreground": "290 5% 10%",
      secondary: "290 6% 96%",
      "secondary-foreground": "290 5% 10%",
      muted: "290 6% 96%",
      "muted-foreground": "290 5% 45%",
      accent: "290 6% 96%",
      "accent-foreground": "290 5% 10%",
      destructive: "0 84.2% 60.2%",
      "destructive-foreground": "0 0% 98%",
      border: "290 5% 90%",
      input: "290 5% 90%",
      ring: "290 5% 10%",
    },
    dark: {
      background: "290 5% 10%",
      foreground: "290 6% 98%",
      card: "290 5% 10%",
      "card-foreground": "290 6% 98%",
      popover: "290 5% 10%",
      "popover-foreground": "290 6% 98%",
      secondary: "290 6% 16%",
      "secondary-foreground": "290 6% 98%",
      muted: "290 6% 16%",
      "muted-foreground": "290 5% 65%",
      accent: "290 6% 16%",
      "accent-foreground": "290 6% 98%",
      destructive: "0 62.8% 30.6%",
      "destructive-foreground": "0 0% 98%",
      border: "290 6% 16%",
      input: "290 6% 16%",
      ring: "290 5% 83%",
    },
  },
  olive: {
    light: {
      background: "0 0% 100%",
      foreground: "110 5% 10%",
      card: "0 0% 100%",
      "card-foreground": "110 5% 10%",
      popover: "0 0% 100%",
      "popover-foreground": "110 5% 10%",
      secondary: "110 6% 96%",
      "secondary-foreground": "110 5% 10%",
      muted: "110 6% 96%",
      "muted-foreground": "110 5% 45%",
      accent: "110 6% 96%",
      "accent-foreground": "110 5% 10%",
      destructive: "0 84.2% 60.2%",
      "destructive-foreground": "0 0% 98%",
      border: "110 5% 90%",
      input: "110 5% 90%",
      ring: "110 5% 10%",
    },
    dark: {
      background: "110 5% 10%",
      foreground: "110 6% 98%",
      card: "110 5% 10%",
      "card-foreground": "110 6% 98%",
      popover: "110 5% 10%",
      "popover-foreground": "110 6% 98%",
      secondary: "110 6% 16%",
      "secondary-foreground": "110 6% 98%",
      muted: "110 6% 16%",
      "muted-foreground": "110 5% 65%",
      accent: "110 6% 16%",
      "accent-foreground": "110 6% 98%",
      destructive: "0 62.8% 30.6%",
      "destructive-foreground": "0 0% 98%",
      border: "110 6% 16%",
      input: "110 6% 16%",
      ring: "110 5% 83%",
    },
  },
  mist: {
    light: {
      background: "0 0% 100%",
      foreground: "228 4% 5%",
      card: "0 0% 100%",
      "card-foreground": "228 4% 5%",
      popover: "0 0% 100%",
      "popover-foreground": "228 4% 5%",
      secondary: "197 2% 95%",
      "secondary-foreground": "223 6% 13%",
      muted: "197 2% 95%",
      "muted-foreground": "213 7% 45%",
      accent: "197 2% 95%",
      "accent-foreground": "223 6% 13%",
      destructive: "0 84.2% 60.2%",
      "destructive-foreground": "197 2% 98%",
      border: "214 5% 91%",
      input: "214 5% 91%",
      ring: "223 6% 13%",
    },
    dark: {
      background: "228 4% 5%",
      foreground: "197 2% 98%",
      card: "223 6% 13%",
      "card-foreground": "197 2% 98%",
      popover: "223 6% 13%",
      "popover-foreground": "197 2% 98%",
      secondary: "216 4% 17%",
      "secondary-foreground": "197 2% 98%",
      muted: "216 4% 17%",
      "muted-foreground": "214 6% 65%",
      accent: "216 4% 17%",
      "accent-foreground": "197 2% 98%",
      destructive: "0 62.8% 30.6%",
      "destructive-foreground": "197 2% 98%",
      border: "216 4% 17%",
      input: "216 4% 17%",
      ring: "213 7% 45%",
    },
  },
};

// Theme overrides for primary & primary-foreground HSL colors
const THEME_ACCENTS: Record<
  string,
  {
    light: { primary: string; foreground: string };
    dark: { primary: string; foreground: string };
  }
> = {
  zinc: {
    light: { primary: "240 5.9% 10%", foreground: "0 0% 98%" },
    dark: { primary: "0 0% 98%", foreground: "240 5.9% 10%" },
  },
  slate: {
    light: { primary: "222.2 47.4% 11.2%", foreground: "210 40% 98%" },
    dark: { primary: "210 40% 98%", foreground: "222.2 47.4% 11.2%" },
  },
  stone: {
    light: { primary: "24 9.8% 10%", foreground: "60 9.1% 97.8%" },
    dark: { primary: "60 9.1% 97.8%", foreground: "24 9.8% 10%" },
  },
  gray: {
    light: { primary: "220 8.9% 4%", foreground: "210 20% 98%" },
    dark: { primary: "210 20% 98%", foreground: "220 8.9% 4%" },
  },
  neutral: {
    light: { primary: "0 0% 9%", foreground: "0 0% 98%" },
    dark: { primary: "0 0% 98%", foreground: "0 0% 9%" },
  },
  red: {
    light: { primary: "0 84.2% 60.2%", foreground: "0 0% 98%" },
    dark: { primary: "0 72.2% 50.6%", foreground: "0 0% 98%" },
  },
  orange: {
    light: { primary: "24.6 95% 53.1%", foreground: "60 9.1% 97.8%" },
    dark: { primary: "20.5 90.2% 48.2%", foreground: "60 9.1% 97.8%" },
  },
  amber: {
    light: { primary: "37.9 92.1% 50.2%", foreground: "20 14.3% 4.1%" },
    dark: { primary: "37.9 92.1% 50.2%", foreground: "20 14.3% 4.1%" },
  },
  yellow: {
    light: { primary: "47.9 95.8% 51.2%", foreground: "26 83.3% 14.1%" },
    dark: { primary: "47.9 95.8% 51.2%", foreground: "26 83.3% 14.1%" },
  },
  lime: {
    light: { primary: "84.8 81% 44%", foreground: "20 14.3% 4.1%" },
    dark: { primary: "84.8 81% 44%", foreground: "20 14.3% 4.1%" },
  },
  green: {
    light: { primary: "142.1 76.2% 36.3%", foreground: "355.6 100% 99.7%" },
    dark: { primary: "142.1 70.6% 45.3%", foreground: "144.4 61.5% 7.6%" },
  },
  emerald: {
    light: { primary: "161.4 93.5% 30.4%", foreground: "355.6 100% 99.7%" },
    dark: { primary: "161.4 93.5% 30.4%", foreground: "355.6 100% 99.7%" },
  },
  teal: {
    light: { primary: "174.7 83.9% 31.6%", foreground: "355.6 100% 99.7%" },
    dark: { primary: "174.7 83.9% 31.6%", foreground: "355.6 100% 99.7%" },
  },
  cyan: {
    light: { primary: "188.7 94.5% 42.7%", foreground: "210 40% 98%" },
    dark: { primary: "188.7 94.5% 42.7%", foreground: "210 40% 98%" },
  },
  sky: {
    light: { primary: "198.6 88.7% 48.4%", foreground: "210 40% 98%" },
    dark: { primary: "198.6 88.7% 48.4%", foreground: "210 40% 98%" },
  },
  blue: {
    light: { primary: "221.2 83.2% 53.3%", foreground: "210 40% 98%" },
    dark: { primary: "217.2 91.2% 59.8%", foreground: "222.2 47.4% 11.2%" },
  },
  indigo: {
    light: { primary: "238.9 70% 50.4%", foreground: "210 40% 98%" },
    dark: { primary: "238.9 70% 50.4%", foreground: "210 40% 98%" },
  },
  violet: {
    light: { primary: "262.1 83.3% 57.8%", foreground: "210 40% 98%" },
    dark: { primary: "263.4 70% 50.4%", foreground: "210 40% 98%" },
  },
  purple: {
    light: { primary: "270.7 91% 38.4%", foreground: "210 40% 98%" },
    dark: { primary: "270.7 91% 38.4%", foreground: "210 40% 98%" },
  },
  fuchsia: {
    light: { primary: "292.2 84.1% 49%", foreground: "210 40% 98%" },
    dark: { primary: "292.2 84.1% 49%", foreground: "210 40% 98%" },
  },
  pink: {
    light: { primary: "327.3 73.6% 50.4%", foreground: "210 40% 98%" },
    dark: { primary: "327.3 73.6% 50.4%", foreground: "210 40% 98%" },
  },
  rose: {
    light: { primary: "346.8 77.2% 49.8%", foreground: "355.6 100% 99.7%" },
    dark: { primary: "346.8 77.2% 49.8%", foreground: "355.6 100% 99.7%" },
  },
};

function PresentPageContent() {
  const params = useLocalSearchParams<{
    component: string;
    preset?: string;
    chrome?: string;
    colorScheme?: "light" | "dark";
  }>();
  const systemColorScheme = useColorScheme();
  const router = useRouter();

  // Resolve initial values synchronously from the URL so the first paint already
  // knows the component + preset (prevents the component-list and unstyled flashes).
  const initial = React.useMemo(() => {
    const sp =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : null;
    return {
      component: sp?.get("component") ?? undefined,
      preset: sp?.get("preset") ?? undefined,
      chrome: sp?.get("chrome") ?? undefined,
      colorScheme:
        (sp?.get("colorScheme") as "light" | "dark" | null) ?? undefined,
    };
  }, []);

  const component = params.component ?? initial.component;
  const chrome = (params.chrome ?? initial.chrome) as string | undefined;

  // Live, updatable style inputs — mutated by postMessage from the parent so
  // shuffling never reloads the iframe.
  const [preset, setPreset] = React.useState<string | undefined>(
    initial.preset ?? params.preset,
  );
  const [activeColorScheme, setActiveColorScheme] = React.useState<
    "light" | "dark"
  >(
    initial.colorScheme ??
      (params.colorScheme as "light" | "dark" | undefined) ??
      (systemColorScheme === "dark" ? "dark" : "light"),
  );
  const [showPicker, setShowPicker] = React.useState(false);

  // Speak the session handshake with the embedding host: answer every
  // `lvcn:ready-request`, retry our own `lvcn:ready` until acknowledged, and
  // apply session-scoped `lvcn:preset` updates without reloading. Also reveal the
  // dev picker only on a top-level window.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.self === window.top) setShowPicker(true);

    const child = createPreviewChild({
      subscribe: (listener) => {
        const onMessage = (event: MessageEvent) => listener(event);
        window.addEventListener("message", onMessage);
        return () => window.removeEventListener("message", onMessage);
      },
      getParent: () =>
        window.parent && window.parent !== window ? window.parent : null,
      initialParentOrigin: getReferrerOrigin(
        typeof document === "undefined" ? null : document.referrer,
      ),
      onPreset: (message) => {
        if (typeof message.preset === "string") setPreset(message.preset);
        setActiveColorScheme(message.colorScheme);
      },
    });

    child.start();
    return () => child.destroy();
  }, []);

  React.useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    const isDark = activeColorScheme === "dark";

    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    if (!preset) return;

    const config = decodePreset(preset);
    if (!config) return;

    const baseColor = config.baseColor || "zinc";
    const themeName = config.theme || "zinc";
    const chartColor = config.chartColor || "blue";
    const radius = config.radius || "default";
    const font = config.font || "inter";

    // 1. Get base color variables
    const baseColorSet = BASE_COLORS_HSL[baseColor] || BASE_COLORS_HSL.zinc;
    const activeColors = isDark ? baseColorSet.dark : baseColorSet.light;

    // Apply base colors
    for (const [key, val] of Object.entries(activeColors)) {
      root.style.setProperty(`--${key}`, val);
    }

    // Apply theme override for primary
    const themeSet = THEME_ACCENTS[themeName] || THEME_ACCENTS.zinc;
    const activeTheme = isDark ? themeSet.dark : themeSet.light;
    root.style.setProperty("--primary", activeTheme.primary);
    root.style.setProperty("--primary-foreground", activeTheme.foreground);
    root.style.setProperty("--ring", activeTheme.primary); // usually matches primary

    // Apply the selected chart color as a 5-stop ramp so multi-series charts
    // render as distinct shades instead of one flat color.
    const chartTheme = THEME_ACCENTS[chartColor] || THEME_ACCENTS.blue;
    const activeChart = isDark ? chartTheme.dark : chartTheme.light;
    chartRampFromHsl(activeChart.primary, isDark).forEach((c, i) => {
      root.style.setProperty(`--chart-${i + 1}`, c);
    });

    // 2. Set radius
    const RADIUS_MAP: Record<string, string> = {
      default: "0.5rem",
      none: "0rem",
      small: "0.125rem",
      medium: "0.625rem",
      large: "0.75rem",
      full: "1.5rem",
    };
    const radiusValue = RADIUS_MAP[radius] || "0.5rem";
    root.style.setProperty("--radius", radiusValue);

    // 3. Inject Google Font dynamically
    const FONT_MAP: Record<string, string> = {
      inter: "Inter",
      "dm-sans": "DM Sans",
      "nunito-sans": "Nunito Sans",
      figtree: "Figtree",
      outfit: "Outfit",
      manrope: "Manrope",
      "space-grotesk": "Space Grotesk",
      montserrat: "Montserrat",
      roboto: "Roboto",
      raleway: "Raleway",
      "public-sans": "Public Sans",
      "source-sans-3": "Source Sans 3",
      lora: "Lora",
      merriweather: "Merriweather",
      "playfair-display": "Playfair Display",
      "jetbrains-mono": "JetBrains Mono",
      "space-mono": "Space Mono",
      "fira-code": "Fira Code",
      "noto-serif": "Noto Serif",
      "roboto-slab": "Roboto Slab",
      "instrument-sans": "Instrument Sans",
      "instrument-serif": "Instrument Serif",
      geist: "Geist",
    };
    const fontName = FONT_MAP[font] || "Inter";

    let fontLink = document.getElementById(
      "google-font-customizer",
    ) as HTMLLinkElement;
    if (!fontLink) {
      fontLink = document.createElement("link");
      fontLink.id = "google-font-customizer";
      fontLink.rel = "stylesheet";
      document.head.appendChild(fontLink);
    }
    fontLink.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, "+")}:wght@400;500;700&display=swap`;

    root.style.setProperty("--font-sans", `'${fontName}', sans-serif`);
  }, [preset, activeColorScheme]);

  if (!component || !hasComponentPreview(component)) {
    // Render a neutral stage by default (also what the static export pre-renders
    // and what embedded iframes get) so the component list never flashes. Only
    // reveal the dev picker on a top-level window.
    if (!showPicker) {
      return (
        <View
          className="flex-1 bg-background w-full"
          style={
            Platform.OS === "web" ? ({ minHeight: "100vh" } as any) : undefined
          }
        />
      );
    }
    return (
      <ScrollView className="flex-1 bg-background p-6">
        <Text variant="h2" className="mb-4">
          Component Presenter
        </Text>
        <Text variant="muted" className="mb-6">
          Select a component to preview:
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {COMPONENT_PREVIEW_NAMES.map((name) => (
            <Link key={name} href={`/present?component=${name}`} asChild>
              <Pressable style={({ pressed }) => pressed && { opacity: 0.7 }}>
                <View className="rounded-lg border border-border bg-card px-4 py-2">
                  <Text>{name}</Text>
                </View>
              </Pressable>
            </Link>
          ))}
        </View>
      </ScrollView>
    );
  }

  return (
    <PreviewRenderer
      component={component}
      chrome={chrome}
      onNavigate={(nextComponent) =>
        router.push(
          `/present?component=${encodeURIComponent(nextComponent)}&chrome=web`,
        )
      }
    />
  );
}

export default function PresentPage() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PresentPageContent />
      <PortalHost />
    </GestureHandlerRootView>
  );
}
