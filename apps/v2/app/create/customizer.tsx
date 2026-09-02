"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import {
  DicesIcon,
  RotateCcwIcon,
  SparklesIcon,
  Droplet,
  Sun,
  PieChart,
  Shield,
  Square,
} from "lucide-react"

const StyleIcon = (
  <div className="flex size-8 items-center justify-center rounded-lg border border-pink-500/30 bg-pink-500/10 text-pink-500 shadow-[0_0_12px_rgba(236,72,153,0.12)]">
    <SparklesIcon className="size-[16px]" />
  </div>
)

const ColorIcon = (
  <div className="flex size-8 items-center justify-center rounded-lg border border-lime-500/30 bg-lime-500/10 text-lime-600 dark:text-lime-500 shadow-[0_0_12px_rgba(132,204,22,0.12)]">
    <Droplet className="size-[16px]" />
  </div>
)

const ThemeIcon = (
  <div className="flex size-8 items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.12)]">
    <Sun className="size-[16px]" />
  </div>
)

const ChartIcon = (
  <div className="flex size-8 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.12)]">
    <PieChart className="size-[16px]" />
  </div>
)

const FontIcon = (
  <div className="flex size-8 items-center justify-center rounded-lg border border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.12)] font-semibold text-[11px] leading-none">
    Aa
  </div>
)

const IconLibIcon = (
  <div className="flex size-8 items-center justify-center rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.12)]">
    <Shield className="size-[16px]" />
  </div>
)

const RadiusIcon = (
  <div className="flex size-8 items-center justify-center rounded-lg border border-zinc-500/30 bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 shadow-[0_0_12px_rgba(113,113,122,0.08)]">
    <Square className="size-[16px]" />
  </div>
)

import { useTheme } from "next-themes"
import { packageSpec, useBeta } from "@/lib/beta"
import { cn } from "@/lib/utils"
import { usePreviewHandshake } from "@/lib/use-preview-handshake"
import type { PreviewColorScheme } from "@/lib/preview-protocol"
import { Picker } from "./picker"
import {
  PRESET_STYLES,
  PRESET_BASE_COLORS,
  PRESET_FONTS,
  PRESET_FONT_HEADINGS,
  PRESET_ICON_LIBRARIES,
  PRESET_RADII,
  PRESET_MENU_ACCENTS,
  PRESET_MENU_COLORS,
  SHADCN_DEFAULT_PRESETS,
  encodePreset,
  decodePreset,
  getCompatibleThemes,
  isTranslucentMenuColor,
  resolveEffectiveRadius,
  FONT_FAMILIES,
  ICON_PACKAGES,
  RADIUS_VALUES,
  STYLE_LABELS,
  BASE_COLOR_SWATCHES,
  THEME_SWATCHES,
  THEME_CHART_SWATCHES,
  type PresetConfig,
  type PresetField,
  type PresetBaseColor,
  type PresetTheme,
  type PresetStyle,
} from "./preset-data"

type PackageManager = "npm" | "pnpm" | "yarn" | "bun"
type ExpoVersion = "54" | "57"

const titleCase = (value: string) =>
  value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")

const PRESET_OPTIONS = PRESET_STYLES.map((style) => ({
  value: style,
  label: STYLE_LABELS[style],
  hint: SHADCN_DEFAULT_PRESETS[style].description,
}))
const STYLE_OPTIONS = PRESET_STYLES.map((style) => ({ value: style, label: STYLE_LABELS[style] }))
const FONT_OPTIONS = PRESET_FONTS.map((font) => ({ value: font, label: FONT_FAMILIES[font] }))
const HEADING_FONT_OPTIONS = PRESET_FONT_HEADINGS.map((font) => ({
  value: font,
  label: font === "inherit" ? "Inherit body font" : FONT_FAMILIES[font],
}))
const ICON_OPTIONS = PRESET_ICON_LIBRARIES.map((library) => ({
  value: library,
  label: titleCase(library),
  hint: ICON_PACKAGES[library],
}))
const RADIUS_OPTIONS = PRESET_RADII.map((radius) => ({
  value: radius,
  label: titleCase(radius),
  hint: radius === "full" ? `${RADIUS_VALUES[radius]} · React Native` : RADIUS_VALUES[radius],
}))
const MENU_ACCENT_OPTIONS = PRESET_MENU_ACCENTS.map((accent) => ({ value: accent, label: titleCase(accent) }))
const MENU_COLOR_OPTIONS = PRESET_MENU_COLORS.map((color) => ({ value: color, label: titleCase(color) }))

// Curated by shadcn for combinations that look intentionally designed. Because
// lvcn v2 preserves shadcn's field order and indexes, these decode losslessly.
const SHUFFLE_PRESET_CODES = [
  "b6sUj34d9", "b2tqYzpa88", "b1W4tDrk", "b1aIuQ2XC", "b7jsW1RxJ5",
  "b870VEw0in", "b3Zheoix4U", "b1x9M2c4aI", "b1W7jDEW", "b51GFh7y6",
  "b2fms620zo", "b1Q5GC", "buKEvLs", "b5rR41Mtnc", "b6tOz2I0x",
  "b2hNTREGRN", "bdIJ7Sq", "b6TqMNb5Wb", "bJIirQ", "b4aRK5K0fb",
  "b5HCiD38LI", "bdHjvCi", "b7QDHijUjj", "b4ZVZIPi9h", "b1W4bcno",
] as const

const CONFIG_FIELDS = [
  "style", "baseColor", "theme", "chartColor", "font", "fontHeading",
  "iconLibrary", "radius", "menuAccent", "menuColor",
] as const satisfies readonly PresetField[]

function sameConfig(left: PresetConfig, right: PresetConfig) {
  return CONFIG_FIELDS.every((field) => left[field] === right[field])
}

function transitionConfig<K extends PresetField>(
  current: PresetConfig,
  key: K,
  value: PresetConfig[K]
): PresetConfig {
  if (key === "baseColor") {
    const baseColor = value as PresetBaseColor
    const compatible = getCompatibleThemes(baseColor)
    const repair = (theme: PresetTheme): PresetTheme => compatible.includes(theme) ? theme : baseColor
    return { ...current, baseColor, theme: repair(current.theme), chartColor: repair(current.chartColor) }
  }
  if (key === "font") {
    const font = value as PresetConfig["font"]
    return { ...current, font, fontHeading: current.fontHeading === font ? "inherit" : current.fontHeading }
  }
  if (key === "fontHeading") {
    const fontHeading = value as PresetConfig["fontHeading"]
    return { ...current, fontHeading: fontHeading === current.font ? "inherit" : fontHeading }
  }
  if (key === "menuColor") {
    const menuColor = value as PresetConfig["menuColor"]
    return {
      ...current,
      menuColor,
      menuAccent: isTranslucentMenuColor(menuColor) ? "subtle" : current.menuAccent,
    }
  }
  if (key === "menuAccent") {
    const menuAccent = value as PresetConfig["menuAccent"]
    return {
      ...current,
      menuAccent,
      menuColor: menuAccent === "bold" && isTranslucentMenuColor(current.menuColor)
        ? "default"
        : current.menuColor,
    }
  }
  return { ...current, [key]: value } as PresetConfig
}

function overlayLocks(
  current: PresetConfig,
  candidate: PresetConfig,
  locks: Partial<Record<PresetField, boolean>>
): PresetConfig {
  const next: PresetConfig = {
    style: locks.style ? current.style : candidate.style,
    baseColor: locks.baseColor ? current.baseColor : candidate.baseColor,
    theme: locks.theme ? current.theme : candidate.theme,
    chartColor: locks.chartColor ? current.chartColor : candidate.chartColor,
    font: locks.font ? current.font : candidate.font,
    fontHeading: locks.fontHeading ? current.fontHeading : candidate.fontHeading,
    iconLibrary: locks.iconLibrary ? current.iconLibrary : candidate.iconLibrary,
    radius: locks.radius ? current.radius : candidate.radius,
    menuAccent: locks.menuAccent ? current.menuAccent : candidate.menuAccent,
    menuColor: locks.menuColor ? current.menuColor : candidate.menuColor,
  }
  const compatible = getCompatibleThemes(next.baseColor)
  if (!locks.theme && !compatible.includes(next.theme)) next.theme = next.baseColor
  if (!locks.chartColor && !compatible.includes(next.chartColor)) next.chartColor = next.baseColor
  if (next.menuAccent === "bold" && isTranslucentMenuColor(next.menuColor)) {
    if (!locks.menuAccent) next.menuAccent = "subtle"
    else if (!locks.menuColor) next.menuColor = "default"
  }
  return next
}

function PreviewLoadingSkeleton() {
  return (
    <div
      className="lvcn-create-preview-stage pointer-events-none absolute inset-0 overflow-y-auto p-5"
      role="status"
      aria-label="Loading preview"
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3" data-preview-skeleton="true">
        {/* Column 1: System Status & Account Access */}
        <div className="space-y-4 animate-pulse">
          {/* System Status card */}
          <div className="rounded-xl border border-border/70 bg-card/90 p-4 shadow-xs backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-950/80">
            <div className="h-4 w-32 rounded bg-muted dark:bg-zinc-800" />
            <div className="mt-1.5 h-3 w-48 rounded bg-muted/60 dark:bg-zinc-800/60" />
            <div className="mt-4 space-y-2.5">
              <div className="h-14 rounded-lg border border-border/40 bg-muted/30 p-3 dark:border-zinc-800/50 dark:bg-zinc-900/40">
                <div className="h-3 w-28 rounded bg-muted/70 dark:bg-zinc-800/70" />
                <div className="mt-1.5 h-2.5 w-40 rounded bg-muted/50 dark:bg-zinc-800/50" />
              </div>
              <div className="h-14 rounded-lg border border-border/40 bg-muted/30 p-3 dark:border-zinc-800/50 dark:bg-zinc-900/40">
                <div className="h-3 w-24 rounded bg-muted/70 dark:bg-zinc-800/70" />
                <div className="mt-1.5 h-2.5 w-36 rounded bg-muted/50 dark:bg-zinc-800/50" />
              </div>
            </div>
          </div>

          {/* Account Access card */}
          <div className="rounded-xl border border-border/70 bg-card/90 p-4 shadow-xs backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-950/80">
            <div className="h-4 w-36 rounded bg-muted dark:bg-zinc-800" />
            <div className="mt-1.5 h-3 w-52 rounded bg-muted/60 dark:bg-zinc-800/60" />
            <div className="mt-4 space-y-3">
              <div>
                <div className="h-2.5 w-20 rounded bg-muted/60 dark:bg-zinc-800/60" />
                <div className="mt-1.5 h-8 w-full rounded-lg bg-muted/40 dark:bg-zinc-900/60" />
              </div>
              <div>
                <div className="h-2.5 w-24 rounded bg-muted/60 dark:bg-zinc-800/60" />
                <div className="mt-1.5 h-8 w-full rounded-lg bg-muted/40 dark:bg-zinc-900/60" />
              </div>
              <div className="h-9 w-full rounded-lg bg-muted/70 dark:bg-zinc-800/80" />
            </div>
          </div>
        </div>

        {/* Column 2: Navigation Tabs, Receiving Method, Power Usage */}
        <div className="space-y-4 animate-pulse">
          {/* Navigation Tabs card */}
          <div className="rounded-xl border border-border/70 bg-card/90 p-4 shadow-xs backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-950/80">
            <div className="h-4 w-36 rounded bg-muted dark:bg-zinc-800" />
            <div className="mt-1.5 h-3 w-44 rounded bg-muted/60 dark:bg-zinc-800/60" />
            <div className="mt-4 space-y-2.5">
              <div className="flex h-8 w-full items-center rounded-lg border border-border/40 bg-muted/30 p-1 gap-1 dark:border-zinc-800/50 dark:bg-zinc-900/40">
                <div className="h-full flex-1 rounded bg-muted/60 dark:bg-zinc-800/60" />
                <div className="h-full flex-1 rounded bg-muted/60 dark:bg-zinc-800/60" />
                <div className="h-full flex-1 rounded bg-muted dark:bg-zinc-700" />
              </div>
              <div className="h-7 w-full rounded-lg border border-border/30 bg-muted/20 dark:border-zinc-800/40 dark:bg-zinc-900/30" />
            </div>
          </div>

          {/* Receiving Method card */}
          <div className="rounded-xl border border-border/70 bg-card/90 p-4 shadow-xs backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-950/80">
            <div className="h-4 w-36 rounded bg-muted dark:bg-zinc-800" />
            <div className="mt-1.5 h-3 w-48 rounded bg-muted/60 dark:bg-zinc-800/60" />
            <div className="mt-4 space-y-3">
              <div>
                <div className="h-2.5 w-28 rounded bg-muted/60 dark:bg-zinc-800/60" />
                <div className="mt-1.5 h-8 w-full rounded-lg bg-muted/40 dark:bg-zinc-900/60" />
              </div>
              <div>
                <div className="h-2.5 w-32 rounded bg-muted/60 dark:bg-zinc-800/60" />
                <div className="mt-1.5 h-8 w-full rounded-lg bg-muted/40 dark:bg-zinc-900/60" />
              </div>
              <div className="h-9 w-full rounded-lg bg-muted/70 dark:bg-zinc-800/80" />
            </div>
          </div>

          {/* Power Usage card */}
          <div className="rounded-xl border border-border/70 bg-card/90 p-4 shadow-xs backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-950/80">
            <div className="h-4 w-28 rounded bg-muted dark:bg-zinc-800" />
            <div className="mt-1.5 h-3 w-40 rounded bg-muted/60 dark:bg-zinc-800/60" />
            <div className="mt-4 space-y-2">
              <div className="h-2 w-full rounded-full bg-muted/50 dark:bg-zinc-800/60" />
            </div>
          </div>
        </div>

        {/* Column 3: Team Members, Stock Performance, Traffic Sources */}
        <div className="space-y-4 animate-pulse">
          {/* Team Members card */}
          <div className="rounded-xl border border-border/70 bg-card/90 p-4 shadow-xs backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-950/80">
            <div className="h-4 w-32 rounded bg-muted dark:bg-zinc-800" />
            <div className="mt-1.5 h-3 w-40 rounded bg-muted/60 dark:bg-zinc-800/60" />
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="size-8 shrink-0 rounded-full bg-muted/70 dark:bg-zinc-800/70" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-24 rounded bg-muted/70 dark:bg-zinc-800/70" />
                  <div className="h-2.5 w-16 rounded bg-muted/40 dark:bg-zinc-800/40" />
                </div>
                <div className="h-5 w-12 rounded-full bg-muted/50 dark:bg-zinc-800/50" />
              </div>
              <div className="flex items-center gap-3">
                <div className="size-8 shrink-0 rounded-full bg-muted/70 dark:bg-zinc-800/70" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-20 rounded bg-muted/70 dark:bg-zinc-800/70" />
                  <div className="h-2.5 w-14 rounded bg-muted/40 dark:bg-zinc-800/40" />
                </div>
                <div className="h-5 w-14 rounded-full bg-muted/50 dark:bg-zinc-800/50" />
              </div>
            </div>
          </div>

          {/* Stock Performance card */}
          <div className="rounded-xl border border-border/70 bg-card/90 p-4 shadow-xs backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-950/80">
            <div className="h-4 w-36 rounded bg-muted dark:bg-zinc-800" />
            <div className="mt-1.5 h-3 w-36 rounded bg-muted/60 dark:bg-zinc-800/60" />
            <div className="mt-4 space-y-3">
              <div className="h-20 w-full rounded-lg border border-border/30 bg-muted/20 dark:border-zinc-800/40 dark:bg-zinc-900/30" />
              <div className="flex items-baseline justify-between">
                <div className="h-6 w-24 rounded bg-muted dark:bg-zinc-800" />
                <div className="h-3.5 w-16 rounded bg-muted/50 dark:bg-zinc-800/50" />
              </div>
            </div>
          </div>

          {/* Traffic Sources card */}
          <div className="rounded-xl border border-border/70 bg-card/90 p-4 shadow-xs backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-950/80">
            <div className="h-4 w-32 rounded bg-muted dark:bg-zinc-800" />
            <div className="mt-1.5 h-3 w-36 rounded bg-muted/60 dark:bg-zinc-800/60" />
            <div className="mt-3 h-4 w-full rounded bg-muted/40 dark:bg-zinc-900/60" />
          </div>
        </div>
      </div>
      <span className="sr-only">Loading preview</span>
    </div>
  )
}

export function CreateCustomizer({ initialConfig }: { initialConfig: PresetConfig }) {
  const [config, setConfig] = React.useState<PresetConfig>(initialConfig)
  const [selectedEngine, setSelectedEngine] = React.useState<"nativewind" | "uniwind">("nativewind")
  const [expoVersion, setExpoVersion] = React.useState<ExpoVersion>("57")
  const [packageManager, setPackageManager] = React.useState<PackageManager>("npm")
  const [locks, setLocks] = React.useState<Partial<Record<PresetField, boolean>>>({})
  const [copied, setCopied] = React.useState(false)
  const [openDialog, setOpenDialog] = React.useState(false)
  const [target, setTarget] = React.useState<"new" | "existing">("new")
  const [previewConfig, setPreviewConfig] = React.useState<PresetConfig | null>(null)

  const presetCode = React.useMemo(() => encodePreset(config), [config])
  const previewPresetCode = React.useMemo(
    () => encodePreset(previewConfig ?? config),
    [config, previewConfig]
  )
  const currentPreset = React.useMemo(
    () => PRESET_STYLES.find((style) => sameConfig(config, SHADCN_DEFAULT_PRESETS[style])) ?? null,
    [config]
  )
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    setMounted(true)
  }, [])

  const { resolvedTheme } = useTheme()
  const colorScheme: PreviewColorScheme = React.useMemo(() => {
    if (!mounted) return "light"
    return resolvedTheme === "dark" ? "dark" : "light"
  }, [mounted, resolvedTheme])

  // Base color options — every catalog base color, swatch resolved for the active
  // scheme from the canonical tokens.
  const colorOptions = React.useMemo(
    () =>
      PRESET_BASE_COLORS.map((c) => ({
        value: c,
        label: titleCase(c),
        swatch: BASE_COLOR_SWATCHES[c][colorScheme],
      })),
    [colorScheme]
  )

  // Theme + chart options are scoped to the base's compatible set (its own theme
  // + 17 accents). The current value is always kept selectable so a preset that
  // encodes a legacy neutral-on-neutral mix still displays and stays editable.
  const buildThemeOptions = React.useCallback(
    (current: PresetTheme, charts = false) => {
      const compatible = getCompatibleThemes(config.baseColor)
      const values = compatible.includes(current) ? compatible : [current, ...compatible]
      return values.map((theme) => ({
        value: theme,
        label: titleCase(theme),
        swatch: charts
          ? THEME_CHART_SWATCHES[theme][colorScheme]
          : THEME_SWATCHES[theme][colorScheme],
      }))
    },
    [config.baseColor, colorScheme]
  )
  const themeOptions = React.useMemo(
    () => buildThemeOptions(config.theme),
    [buildThemeOptions, config.theme]
  )
  const chartOptions = React.useMemo(
    () => buildThemeOptions(config.chartColor, true),
    [buildThemeOptions, config.chartColor]
  )

  // Keep the first URL fully configured, like shadcn's preview route, but never
  // change it after mount. Live changes travel over postMessage so shuffle does
  // not reload the Expo application.
  const [initialPresetCode] = React.useState(() => encodePreset(initialConfig))
  const [webPreviewUrl] = React.useState(
    () => `/create/preview?${new URLSearchParams({
      preset: initialPresetCode,
      colorScheme: "light",
    }).toString()}`
  )
  const previewOrigin =
    typeof window === "undefined" ? "" : window.location.origin

  const {
    iframeRef: previewFrameRef,
    frameKey: previewFrameKey,
    revealed: previewVisible,
    applying: previewApplying,
    handleLoad: onPreviewLoad,
  } = usePreviewHandshake({
    src: webPreviewUrl,
    childOrigin: previewOrigin,
    colorScheme,
    preset: previewPresetCode,
    // The frame is revealed only after it echoes back the exact preset and color
    // scheme with `lvcn:applied`, so a default-theme frame is never shown. The
    // readiness timeout still reveals a recoverable state if that never happens.
    requireConfirmation: true,
  })

  const beta = useBeta()

  const command = React.useMemo(() => {
    // Beta mode changes the dist-tag: a beta CLI resolves the beta registry from its own
    // version, so the tag is the only thing the copied command has to carry.
    const spec = packageSpec(beta)
    const runner = {
      npm: `npx ${spec}`,
      pnpm: `pnpm dlx ${spec}`,
      yarn: `yarn dlx ${spec}`,
      bun: `bunx --bun ${spec}`,
    }[packageManager]
    return target === "new"
      ? `${runner} init --preset ${presetCode} --engine ${selectedEngine} --expo-version ${expoVersion}`
      : `${runner} apply ${presetCode}`
  }, [beta, packageManager, selectedEngine, expoVersion, presetCode, target])

  // Sync preset to URL
  React.useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set("preset", presetCode)
    url.searchParams.delete("engine")
    window.history.replaceState({}, "", url.toString())
  }, [presetCode])

  const update = <K extends PresetField>(key: K, value: PresetConfig[K]) => {
    setPreviewConfig(null)
    setConfig((current) => transitionConfig(current, key, value))
  }

  const preview = <K extends PresetField>(key: K, value: PresetConfig[K] | null) => {
    setPreviewConfig(value === null ? null : transitionConfig(config, key, value))
  }

  const selectPreset = (style: PresetStyle) => {
    setPreviewConfig(null)
    setConfig({ ...SHADCN_DEFAULT_PRESETS[style] })
  }

  const toggleLock = (key: PresetField) => {
    setLocks((current) => ({ ...current, [key]: !current[key] }))
  }

  const shuffle = () => {
    setPreviewConfig(null)
    setConfig((current) => {
      const candidates = SHUFFLE_PRESET_CODES
        .map((code) => decodePreset(code))
        .filter((candidate): candidate is PresetConfig => candidate !== null)
        .filter((candidate) => encodePreset(candidate) !== encodePreset(current))
        .map((candidate) => overlayLocks(current, candidate, locks))
        .filter((candidate) => !sameConfig(candidate, current))
      const candidate = candidates[Math.floor(Math.random() * candidates.length)]
      return candidate ?? current
    })
  }

  const reset = () => {
    setPreviewConfig(null)
    setConfig((current) => ({ ...SHADCN_DEFAULT_PRESETS[current.style] }))
    setLocks({})
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command)
    } catch {
      // ignore
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Keyboard shortcut: "r" to shuffle, "Shift+R" to reset
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (
        target?.isContentEditable ||
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      ) {
        return
      }
      if ((e.key === "r" || e.key === "R") && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        if (e.shiftKey) reset()
        else shuffle()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locks])

  return (
    <div className="flex flex-1 flex-col w-full overflow-hidden bg-zinc-100 dark:bg-black p-2.5 md:p-3.5 gap-2.5 md:gap-3.5 md:h-[calc(100dvh-var(--header-height))] md:flex-none md:flex-row">
      {/* Left Sidebar Panel - Standalone rounded box */}
      <aside className="relative z-20 w-full md:w-80 h-full rounded-2xl border border-border/80 dark:border-zinc-800 bg-card/95 dark:bg-zinc-950/90 backdrop-blur-xl shadow-xs flex flex-col shrink-0 min-h-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 pt-4.5 pb-2 shrink-0 bg-transparent">
          <span className="text-sm font-bold tracking-tight text-foreground">Customize</span>
          <span className="rounded-full border border-zinc-300/80 dark:border-border bg-zinc-200/60 dark:bg-zinc-800/80 px-2 py-0.5 font-mono text-[9px] text-zinc-600 dark:text-zinc-400">
            {presetCode}
          </span>
        </div>

        {/* Pickers list */}
        <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-3 py-2.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <Picker
            label="Preset"
            value={currentPreset ?? config.style}
            selectedValue={currentPreset}
            options={PRESET_OPTIONS}
            onChange={selectPreset}
            onPreview={(style) => setPreviewConfig(style ? { ...SHADCN_DEFAULT_PRESETS[style] } : null)}
            renderValue={() => currentPreset ? SHADCN_DEFAULT_PRESETS[currentPreset].description : "Custom"}
            icon={StyleIcon}
          />
          <Picker
            label="Style"
            value={config.style}
            options={STYLE_OPTIONS}
            onChange={(value) => update("style", value)}
            onPreview={(value) => preview("style", value)}
            locked={locks.style}
            onToggleLock={() => toggleLock("style")}
            icon={StyleIcon}
          />
          <Picker
            label="Base Color"
            value={config.baseColor}
            options={colorOptions}
            onChange={(value) => update("baseColor", value)}
            onPreview={(value) => preview("baseColor", value)}
            locked={locks.baseColor}
            onToggleLock={() => toggleLock("baseColor")}
            renderValue={titleCase}
            icon={ColorIcon}
          />
          <Picker
            label="Theme"
            value={config.theme}
            options={themeOptions}
            onChange={(value) => update("theme", value)}
            onPreview={(value) => preview("theme", value)}
            locked={locks.theme}
            onToggleLock={() => toggleLock("theme")}
            renderValue={titleCase}
            icon={ThemeIcon}
          />
          <Picker
            label="Chart Color"
            value={config.chartColor}
            options={chartOptions}
            onChange={(value) => update("chartColor", value)}
            onPreview={(value) => preview("chartColor", value)}
            locked={locks.chartColor}
            onToggleLock={() => toggleLock("chartColor")}
            renderValue={titleCase}
            icon={ChartIcon}
          />
          <Picker
            label="Body Font"
            value={config.font}
            options={FONT_OPTIONS}
            onChange={(value) => update("font", value)}
            onPreview={(value) => preview("font", value)}
            locked={locks.font}
            onToggleLock={() => toggleLock("font")}
            renderValue={(value) => FONT_FAMILIES[value]}
            icon={FontIcon}
          />
          <Picker
            label="Heading Font"
            value={config.fontHeading}
            options={HEADING_FONT_OPTIONS}
            onChange={(value) => update("fontHeading", value)}
            onPreview={(value) => preview("fontHeading", value)}
            locked={locks.fontHeading}
            onToggleLock={() => toggleLock("fontHeading")}
            renderValue={(value) => value === "inherit" ? `Inherit (${FONT_FAMILIES[config.font]})` : FONT_FAMILIES[value]}
            icon={FontIcon}
          />
          <Picker
            label="Icon Library"
            value={config.iconLibrary}
            options={ICON_OPTIONS}
            onChange={(value) => update("iconLibrary", value)}
            onPreview={(value) => preview("iconLibrary", value)}
            locked={locks.iconLibrary}
            onToggleLock={() => toggleLock("iconLibrary")}
            renderValue={titleCase}
            icon={IconLibIcon}
          />
          <Picker
            label="Radius"
            value={resolveEffectiveRadius(config)}
            options={RADIUS_OPTIONS}
            onChange={(value) => update("radius", value)}
            onPreview={(value) => preview("radius", value)}
            locked={locks.radius}
            onToggleLock={() => toggleLock("radius")}
            disabled={config.style === "lyra" || config.style === "sera"}
            disabledHint={`${STYLE_LABELS[config.style]} uses square controls`}
            renderValue={(value) => `${titleCase(value)} (${RADIUS_VALUES[value]})`}
            icon={RadiusIcon}
          />
          <Picker
            label="Menu Accent"
            value={config.menuAccent}
            options={MENU_ACCENT_OPTIONS}
            onChange={(value) => update("menuAccent", value)}
            onPreview={(value) => preview("menuAccent", value)}
            locked={locks.menuAccent}
            onToggleLock={() => toggleLock("menuAccent")}
            renderValue={titleCase}
            icon={ThemeIcon}
          />
          <Picker
            label="Menu Color"
            value={config.menuColor}
            options={MENU_COLOR_OPTIONS}
            onChange={(value) => update("menuColor", value)}
            onPreview={(value) => preview("menuColor", value)}
            locked={locks.menuColor}
            onToggleLock={() => toggleLock("menuColor")}
            renderValue={titleCase}
            icon={ColorIcon}
          />
        </div>

        {/* Footer actions */}
        <div className="p-3 bg-transparent shrink-0 flex flex-col gap-2">
          <button
            onClick={() => setOpenDialog(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ec4899] to-[#f97316] hover:opacity-90 text-white px-3 py-2.5 text-sm font-bold shadow-md transition-all active:scale-[0.99]"
          >
            {"</> Get Code"}
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedEngine((e) => (e === "nativewind" ? "uniwind" : "nativewind"))}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-zinc-100/70 hover:bg-zinc-200/70 dark:bg-zinc-900/50 dark:hover:bg-zinc-900/80 px-2.5 py-1.5 text-sm font-medium transition-all active:scale-[0.99] shrink-0"
              title={`Engine: ${selectedEngine === "nativewind" ? "NativeWind" : "Uniwind"} (Click to toggle)`}
            >
              <span className="flex size-5.5 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-800 text-[10px] font-bold text-foreground border border-zinc-300 dark:border-border/80">
                {selectedEngine === "nativewind" ? "N" : "U"}
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted-foreground"
              >
                <path d="m21 16-4 4-4-4" />
                <path d="M17 20V4" />
                <path d="m3 8 4-4 4 4" />
                <path d="M7 4v16" />
              </svg>
            </button>
            <button
              onClick={shuffle}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-zinc-100/70 hover:bg-zinc-200/70 dark:bg-zinc-900/50 dark:hover:bg-zinc-900/80 px-3 py-1.5 text-sm font-medium transition-all active:scale-[0.99]"
              title="Shuffle (press R)"
              aria-busy={previewApplying}
            >
              <DicesIcon className="size-4" />
              Shuffle
            </button>
            <button
              onClick={reset}
              className="flex items-center justify-center rounded-xl border border-border bg-zinc-100/70 hover:bg-zinc-200/70 dark:bg-zinc-900/50 dark:hover:bg-zinc-900/80 px-3 py-1.5 text-sm font-medium transition-all active:scale-[0.99] shrink-0"
              title="Reset (Shift+R)"
              aria-label="Reset"
            >
              <RotateCcwIcon className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Right Preview area - Standalone rounded box */}
      <div className="lvcn-create-preview-stage relative flex h-full flex-1 flex-col rounded-2xl border border-border/80 dark:border-zinc-800 shadow-xs overflow-hidden">
        {/* Desktop web preview - iframe pinned to fill container */}
        <div className="relative isolate z-10 flex-1 min-h-0 overflow-hidden animate-in fade-in duration-300">
          {!previewVisible && <PreviewLoadingSkeleton />}
          <iframe
            key={previewFrameKey}
            ref={previewFrameRef}
            src={webPreviewUrl}
            onLoad={onPreviewLoad}
            data-preview-frame="create"
            className={cn(
              "absolute inset-0 h-full w-full origin-center select-none border-0 bg-transparent transition-opacity duration-300 motion-reduce:transition-none",
              previewVisible ? "opacity-100" : "opacity-0"
            )}
            title="Expo Web Preview"
          />
        </div>
      </div>

      {/* Get Code Dialog/Modal */}
      {openDialog && typeof document !== "undefined"
        ? createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            {/* Background dismiss */}
            <div className="absolute inset-0" onClick={() => setOpenDialog(false)} />

            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="get-code-title"
              className="relative w-full max-w-[540px] rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-card-foreground"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 pb-4">
                <div>
                  <h2 id="get-code-title" className="text-base font-semibold text-foreground">
                    Get your code
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Preset <span className="font-semibold text-foreground">{presetCode}</span> · run this in your terminal.
                  </p>
                </div>
                <button
                  onClick={() => setOpenDialog(false)}
                  className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  aria-label="Close dialog"
                >
                  Close
                </button>
              </div>

              {/* Target: new vs existing project */}
              <div className="grid grid-cols-2 gap-3 py-4">
                {([
                  { key: "new", title: "New project", desc: "Scaffold from scratch" },
                  { key: "existing", title: "Existing project", desc: "Apply to your app" },
                ] as const).map(({ key, title, desc }) => {
                  const isSelected = target === key
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTarget(key)}
                      className={cn(
                        "flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-all",
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border bg-transparent hover:bg-muted/30"
                      )}
                    >
                      <span className="block text-sm font-medium text-foreground">{title}</span>
                      <span className="text-xs text-muted-foreground">{desc}</span>
                    </button>
                  )
                })}
              </div>

              {/* Engine — only relevant when scaffolding a new project */}
              {target === "new" && (
                <div className="space-y-3 py-3">
                  <div>
                    <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Engine
                    </span>
                    <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-background p-1">
                      {(["nativewind", "uniwind"] as const).map((eng) => {
                        const isSelected = selectedEngine === eng
                        return (
                          <button
                            key={eng}
                            type="button"
                            onClick={() => setSelectedEngine(eng)}
                            className={cn(
                              "rounded-lg py-1.5 text-xs font-medium transition-colors",
                              isSelected
                                ? "border border-border bg-muted text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {eng === "nativewind" ? "NativeWind" : "Uniwind"}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div>
                    <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Expo SDK
                    </span>
                    <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-background p-1">
                      {(["54", "57"] as const).map((version) => {
                        const isSelected = expoVersion === version
                        return (
                          <button
                            key={version}
                            type="button"
                            onClick={() => setExpoVersion(version)}
                            className={cn(
                              "rounded-lg py-1.5 text-xs font-medium transition-colors",
                              isSelected
                                ? "border border-border bg-muted text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            Expo {version}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Package Manager */}
              <div className="py-3">
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Package Manager
                </span>
                <div className="grid grid-cols-4 gap-1 rounded-xl border border-border bg-background p-1">
                  {(["npm", "pnpm", "yarn", "bun"] as const).map((pkg) => {
                    const isSelected = packageManager === pkg
                    return (
                      <button
                        key={pkg}
                        type="button"
                        onClick={() => setPackageManager(pkg)}
                        className={cn(
                          "rounded-lg py-1.5 text-xs font-medium capitalize transition-colors",
                          isSelected
                            ? "border border-border bg-muted text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {pkg}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Command block */}
              <div className="my-4 flex items-start justify-between gap-3 rounded-xl border border-border bg-muted/30 p-4 font-mono text-xs">
                <div className="select-all whitespace-pre-wrap break-all text-foreground">
                  <span className="mr-1 text-muted-foreground">$</span>
                  {command}
                </div>
                <button
                  onClick={copy}
                  className="shrink-0 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                  title="Copy command"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>

              {target === "existing" && (
                <p className="-mt-1 mb-3 text-[11px] leading-4 text-muted-foreground">
                  Run inside a project already set up with{" "}
                  <span className="font-mono text-foreground">lovdacn init</span>. It restyles all your installed components. Icons are switched manually.
                </p>
              )}

              {/* Main Copy Button */}
              <button
                onClick={copy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-105 active:scale-[0.99]"
              >
                {copied ? "Copied!" : "Copy command"}
              </button>
            </div>
          </div>,
          document.body
        )
        : null}
    </div>
  )
}
