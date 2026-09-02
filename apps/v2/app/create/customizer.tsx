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
import { Picker } from "./picker"
import {
  PRESET_STYLES,
  PRESET_BASE_COLORS,
  PRESET_FONTS,
  PRESET_ICON_LIBRARIES,
  PRESET_RADII,
  encodePreset,
  randomizeConfig,
  getCompatibleThemes,
  DEFAULT_CONFIG,
  FONT_FAMILIES,
  ICON_PACKAGES,
  RADIUS_VALUES,
  STYLE_LABELS,
  BASE_COLOR_SWATCHES,
  THEME_SWATCHES,
  type PresetConfig,
  type PresetField,
  type PresetBaseColor,
  type PresetTheme,
} from "./preset-data"

type PackageManager = "npm" | "pnpm" | "yarn" | "bun"
type ExpoVersion = "54" | "57"

const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

// Build picker options that never depend on the active base/scheme.
const STYLE_OPTIONS = PRESET_STYLES.map((s) => ({ value: s, label: STYLE_LABELS[s] }))
const FONT_OPTIONS = PRESET_FONTS.map((f) => ({ value: f, label: FONT_FAMILIES[f] }))
const ICON_OPTIONS = PRESET_ICON_LIBRARIES.map((i) => ({
  value: i,
  label: titleCase(i),
  hint: ICON_PACKAGES[i],
}))
const RADIUS_OPTIONS = PRESET_RADII.map((r) => ({
  value: r,
  label: titleCase(r),
  // "Full" is a bounded React-Native pill radius rather than a shadcn web value —
  // call that out so it reads clearly in the picker.
  hint: r === "full" ? `${RADIUS_VALUES[r]} · React Native` : RADIUS_VALUES[r],
}))

function PreviewLoadingSkeleton() {
  return (
    <div
      className="pointer-events-none absolute inset-0 grid grid-cols-1 gap-5 overflow-hidden bg-background p-6 md:grid-cols-3"
      role="status"
      aria-label="Loading preview"
    >
      {[0, 1, 2].map((column) => (
        <div key={column} className="space-y-5 animate-pulse" data-preview-skeleton="true">
          {[0, 1, 2].map((card) => (
            <div key={card} className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
              <div className="h-4 w-2/5 rounded bg-muted" />
              <div className="mt-2 h-3 w-3/4 rounded bg-muted/70" />
              <div className="mt-5 space-y-3">
                <div className="h-9 rounded-md bg-muted/60" />
                <div className="h-9 rounded-md bg-muted/60" />
                <div className="h-8 w-1/2 rounded-md bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ))}
      <span className="sr-only">Loading preview</span>
    </div>
  )
}

export function CreateCustomizer({ initialConfig }: { initialConfig: PresetConfig }) {
  const { resolvedTheme } = useTheme()
  const [config, setConfig] = React.useState<PresetConfig>(initialConfig)
  const [selectedEngine, setSelectedEngine] = React.useState<"nativewind" | "uniwind">("nativewind")
  const [expoVersion, setExpoVersion] = React.useState<ExpoVersion>("57")
  const [packageManager, setPackageManager] = React.useState<PackageManager>("npm")
  const [locks, setLocks] = React.useState<Partial<Record<PresetField, boolean>>>({})
  const [copied, setCopied] = React.useState(false)
  const [openDialog, setOpenDialog] = React.useState(false)
  const [target, setTarget] = React.useState<"new" | "existing">("new")
  const [shuffleActive, setShuffleActive] = React.useState(false)

  const presetCode = React.useMemo(() => encodePreset(config), [config])
  const colorScheme = React.useMemo<"light" | "dark">(() => {
    if (resolvedTheme === "dark" || resolvedTheme === "light") return resolvedTheme
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    }
    return "light"
  }, [resolvedTheme])

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
    (current: PresetTheme) => {
      const compatible = getCompatibleThemes(config.baseColor)
      const values = compatible.includes(current)
        ? compatible
        : [current, ...compatible]
      return values.map((c) => ({
        value: c,
        label: titleCase(c),
        swatch: THEME_SWATCHES[c][colorScheme],
      }))
    },
    [config.baseColor, colorScheme]
  )
  const themeOptions = React.useMemo(
    () => buildThemeOptions(config.theme),
    [buildThemeOptions, config.theme]
  )
  const chartOptions = React.useMemo(
    () => buildThemeOptions(config.chartColor),
    [buildThemeOptions, config.chartColor]
  )

  // Keep the first URL fully configured, like shadcn's preview route, but never
  // change it after mount. Live changes travel over postMessage so shuffle does
  // not reload the Expo application.
  const [initialPresetCode] = React.useState(() => encodePreset(initialConfig))
  const webPreviewUrl = React.useMemo(
    () => `/create/preview?${new URLSearchParams({ preset: initialPresetCode }).toString()}`,
    [initialPresetCode]
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
    preset: presetCode,
    // The frame is revealed only after it echoes back the exact preset and color
    // scheme with `lvcn:applied`, so a default-theme frame is never shown. The
    // readiness timeout still reveals a recoverable state if that never happens.
    requireConfirmation: true,
  })

  // Keep the shuffle treatment around just long enough for the completed design
  // to settle. Slow font/icon loads keep it active until their exact revision is
  // confirmed; fast cached changes still get a deliberate, non-jarring finish.
  React.useEffect(() => {
    if (!shuffleActive || previewApplying) return
    const timeout = window.setTimeout(() => setShuffleActive(false), 260)
    return () => window.clearTimeout(timeout)
  }, [previewApplying, shuffleActive])

  const previewTransitioning = previewVisible && (previewApplying || shuffleActive)
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
    setConfig((c) => {
      if (key !== "baseColor") return { ...c, [key]: value }
      // Base changed: keep compatible theme/chart selections (accents pair with
      // every base), but normalize an incompatible neutral — a base-color theme
      // that isn't the new base — to the new base so two neutral families never
      // mix. Old presets that encode such a mix still decode elsewhere.
      const nextBase = value as PresetBaseColor
      const compatible = getCompatibleThemes(nextBase)
      const normalize = (theme: PresetTheme): PresetTheme =>
        compatible.includes(theme) ? theme : nextBase
      return {
        ...c,
        baseColor: nextBase,
        theme: normalize(c.theme),
        chartColor: normalize(c.chartColor),
      }
    })
  }

  const toggleLock = (key: PresetField) => {
    setLocks((l) => ({ ...l, [key]: !l[key] }))
  }

  const shuffle = () => {
    setShuffleActive(true)
    setConfig((c) => randomizeConfig(c, locks))
  }

  const reset = () => {
    setConfig(DEFAULT_CONFIG)
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
    <div className="flex flex-1 flex-col w-full overflow-hidden bg-background md:h-[calc(100dvh-var(--header-height))] md:flex-none md:flex-row">
      {/* Left Sidebar Panel - Flush to the left edge of the page */}
      <aside className="relative z-20 w-full md:w-80 h-full border-r border-border bg-card/60 backdrop-blur-xl flex flex-col shrink-0 min-h-0 overflow-visible">
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 pt-4.5 pb-2 shrink-0 bg-transparent">
          <span className="text-sm font-bold tracking-tight text-foreground">Customize</span>
          <span className="rounded-full border border-zinc-300/80 dark:border-border bg-zinc-200/60 dark:bg-zinc-800/80 px-2 py-0.5 font-mono text-[9px] text-zinc-600 dark:text-zinc-400">
            {presetCode}
          </span>
        </div>

        {/* Pickers list */}
        <div className="flex-1 flex flex-col gap-1.5 px-3 py-2.5 overflow-visible">
          <Picker
            label="Style"
            value={config.style}
            options={STYLE_OPTIONS}
            onChange={(v) => update("style", v)}
            locked={locks.style}
            onToggleLock={() => toggleLock("style")}
            icon={StyleIcon}
          />
          <Picker
            label="Base Color"
            value={config.baseColor}
            options={colorOptions}
            onChange={(v) => update("baseColor", v)}
            locked={locks.baseColor}
            onToggleLock={() => toggleLock("baseColor")}
            renderValue={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
            icon={ColorIcon}
          />
          <Picker
            label="Theme"
            value={config.theme}
            options={themeOptions}
            onChange={(v) => update("theme", v)}
            locked={locks.theme}
            onToggleLock={() => toggleLock("theme")}
            renderValue={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
            icon={ThemeIcon}
          />
          <Picker
            label="Chart Color"
            value={config.chartColor}
            options={chartOptions}
            onChange={(v) => update("chartColor", v)}
            locked={locks.chartColor}
            onToggleLock={() => toggleLock("chartColor")}
            renderValue={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
            icon={ChartIcon}
          />
          <Picker
            label="Font"
            value={config.font}
            options={FONT_OPTIONS}
            onChange={(v) => update("font", v)}
            locked={locks.font}
            onToggleLock={() => toggleLock("font")}
            renderValue={(v) => FONT_FAMILIES[v]}
            icon={FontIcon}
          />
          <Picker
            label="Icon Library"
            value={config.iconLibrary}
            options={ICON_OPTIONS}
            onChange={(v) => update("iconLibrary", v)}
            locked={locks.iconLibrary}
            onToggleLock={() => toggleLock("iconLibrary")}
            renderValue={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
            icon={IconLibIcon}
          />
          <Picker
            label="Radius"
            value={config.radius}
            options={RADIUS_OPTIONS}
            onChange={(v) => update("radius", v)}
            locked={locks.radius}
            onToggleLock={() => toggleLock("radius")}
            renderValue={(v) => `${v.charAt(0).toUpperCase() + v.slice(1)} (${RADIUS_VALUES[v]})`}
            icon={RadiusIcon}
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
              aria-busy={shuffleActive}
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

      {/* Right Preview area */}
      <div className="flex-1 h-full flex flex-col overflow-hidden bg-background relative">
        {/* Desktop web preview - iframe pinned to fill container */}
        <div className="relative isolate z-10 flex-1 min-h-0 overflow-hidden animate-in fade-in duration-300">
          {!previewVisible && <PreviewLoadingSkeleton />}
          <iframe
            key={previewFrameKey}
            ref={previewFrameRef}
            src={webPreviewUrl}
            onLoad={onPreviewLoad}
            data-preview-frame="true"
            className={cn(
              "absolute inset-0 h-full w-full border-0 select-none bg-background transition-opacity duration-300 motion-reduce:transition-none",
              previewVisible ? "opacity-100" : "opacity-0"
            )}
            title="Expo Web Preview"
          />

          <div
            aria-hidden="true"
            data-preview-transition={previewTransitioning ? "active" : "idle"}
            className={cn(
              "pointer-events-none absolute inset-0 z-20 overflow-hidden transition-opacity duration-300 motion-reduce:hidden",
              previewTransitioning ? "opacity-100" : "opacity-0"
            )}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,var(--color-foreground),transparent_42%)] opacity-[0.07] dark:opacity-[0.09]" />
          </div>
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
