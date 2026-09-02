"use client"

import * as React from "react"

import { packageSpec as buildPackageSpec } from "@/lib/package-spec"

/**
 * Beta mode.
 *
 * The `beta` class on <html> is the single source of truth: it is set by an
 * inline script before first paint (see app/layout.tsx), so the orange skin
 * survives navigation and never flashes. With beta off, the site uses the
 * production theme.
 *
 * Switching is driven by the Beta button only. It starts the dot sweep first,
 * then eases every colour into the new theme part-way along the same timeline,
 * so the theme arrives with the wave instead of snapping on click. The colours
 * cross-fade everywhere at once — no wipe edge travelling across the page.
 */
export const BETA_CLASS = "beta"
export const MORPH_CLASS = "theme-morph"
export const BETA_STORAGE_KEY = "lovdacn-beta"

/** Fired the moment a change is requested — canvases start sweeping. */
export const BETA_SWEEP_EVENT = "lovdacn:beta-sweep"
/** Fired when the theme class actually flips. */
export const BETA_EVENT = "lovdacn:beta"

/** How long the sweep takes to cross the field. Shared with the canvas. */
export const SWEEP_DURATION_MS = 1800
/** The wave runs slightly past both ends so every dot fires exactly once. */
export const SWEEP_LEAD = 0.06
/** Colour cross-fade length. Must match the CSS transition duration. */
export const THEME_MORPH_MS = 900
/** Where along the sweep the colour cross-fade starts. */
const THEME_FLIP_RATIO = 0.3

const listeners = new Set<() => void>()

let pendingTarget: boolean | null = null
let flipTimer = 0
let morphTimer = 0

function prefersReducedMotion() {
  if (typeof window === "undefined") return false
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

export function isBeta() {
  if (typeof document === "undefined") return false
  return document.documentElement.classList.contains(BETA_CLASS)
}

/** The state the UI should show: the requested value while a sweep is running. */
export function betaTarget() {
  return pendingTarget ?? isBeta()
}

function notify() {
  for (const listener of listeners) listener()
}

function commit(next: boolean) {
  const root = document.documentElement

  // MORPH_CLASS is already on the root (armed in requestBeta), so this class
  // change cross-fades instead of cutting.
  root.classList.toggle(BETA_CLASS, next)

  try {
    window.localStorage.setItem(BETA_STORAGE_KEY, next ? "1" : "0")
  } catch {
    // Storage disabled — the class still applies for this session.
  }

  window.clearTimeout(morphTimer)
  morphTimer = window.setTimeout(() => {
    root.classList.remove(MORPH_CLASS)
  }, 450)

  window.dispatchEvent(new CustomEvent(BETA_EVENT, { detail: { beta: next } }))
  notify()
}

/** Start the transition toward `next`: the sweep and the theme move together. */
export function requestBeta(next: boolean) {
  if (typeof document === "undefined") return
  if (betaTarget() === next) return

  const root = document.documentElement
  window.clearTimeout(flipTimer)
  window.clearTimeout(morphTimer)
  pendingTarget = next

  // Arm the colour cross-fade now. A transition only starts if the element
  // already had transition-property in its before-change style, so this must
  // land in an earlier style recalculation than the theme class flip.
  root.classList.add(MORPH_CLASS)
  void root.offsetWidth

  // 1. Canvases begin sweeping toward the target palette immediately.
  window.dispatchEvent(
    new CustomEvent(BETA_SWEEP_EVENT, { detail: { beta: next } })
  )
  // Let the toggles show the requested state right away.
  notify()

  // 2. The theme eases in immediately on pages without a canvas, or with minimal lead on canvas pages.
  const hasCanvas = typeof document !== "undefined" && !!document.querySelector("canvas")
  const delay = prefersReducedMotion() ? 0 : hasCanvas ? 80 : 0
  flipTimer = window.setTimeout(() => {
    pendingTarget = null
    commit(next)
  }, delay)
}

export function toggleBeta() {
  requestBeta(!betaTarget())
}

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  window.addEventListener(BETA_EVENT, onChange)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener(BETA_EVENT, onChange)
  }
}

/** Reads beta mode. Renders `false` on the server, then adopts the DOM. */
export function useBeta() {
  return React.useSyncExternalStore(subscribe, betaTarget, () => false)
}

/* -------------------------------------------------------------------------------------------------
 * Release channel
 *
 * Beta mode is not only a skin: it selects the npm dist-tag the docs tell you to install, and it
 * decides whether beta-only material is visible at all. The CLI derives its registry from its own
 * version (`-beta.*` reads `r/beta`), so the tag is all the site has to communicate.
 *
 * The rewriting rules live in lib/package-spec.ts, free of React and the DOM. They are re-exported
 * here so callers have one import for everything beta-related.
 * -----------------------------------------------------------------------------------------------*/

export {
  BETA_PACKAGE_TAG,
  PACKAGE_NAMES,
  STABLE_PACKAGE_TAG,
  packageSpec,
  rewritePackageSpec,
  tagFor as packageTag,
} from "@/lib/package-spec"

/** The package spec the docs should show right now, e.g. `lovdacn@beta`. */
export function useBetaPackageSpec() {
  return buildPackageSpec(useBeta())
}
