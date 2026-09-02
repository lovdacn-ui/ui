"use client"

import * as React from "react"

type FontSource =
  | string
  | number
  | { uri?: string; default?: FontSource }
  | null
  | undefined

type FontMap = Record<string, FontSource>

const loadedFonts = new Set<string>()
const loadedFaces = new Map<string, FontFace>()
const pendingFonts = new Map<string, Promise<void>>()

function resolveFontUrl(source: FontSource): string | null {
  if (typeof source === "string") return source
  if (typeof source === "number") return String(source)
  if (source && typeof source === "object") {
    if (typeof source.uri === "string") return source.uri
    if (source.default !== undefined) return resolveFontUrl(source.default)
  }
  return null
}

async function loadFont(fontFamily: string, source: FontSource) {
  if (loadedFonts.has(fontFamily)) return
  const existing = pendingFonts.get(fontFamily)
  if (existing) return existing

  const pending = (async () => {
    const url = resolveFontUrl(source)
    if (!url || typeof document === "undefined" || typeof FontFace === "undefined") {
      loadedFonts.add(fontFamily)
      return
    }

    const face = new FontFace(fontFamily, `url(${JSON.stringify(url)})`)
    await face.load()
    ;(document.fonts as any).add(face)
    loadedFaces.set(fontFamily, face)
    loadedFonts.add(fontFamily)
  })().finally(() => pendingFonts.delete(fontFamily))

  pendingFonts.set(fontFamily, pending)
  return pending
}

export function isLoaded(fontFamily: string) {
  return loadedFonts.has(fontFamily)
}

export function getLoadedFonts() {
  return [...loadedFonts]
}

export async function loadAsync(
  fontFamilyOrMap: string | FontMap,
  source?: FontSource
) {
  const fontMap =
    typeof fontFamilyOrMap === "string"
      ? { [fontFamilyOrMap]: source }
      : fontFamilyOrMap
  await Promise.all(
    Object.entries(fontMap).map(([fontFamily, fontSource]) =>
      loadFont(fontFamily, fontSource)
    )
  )
}

export async function unloadAsync(fontFamily: string) {
  const face = loadedFaces.get(fontFamily)
  if (face && typeof document !== "undefined") (document.fonts as any).delete(face)
  loadedFaces.delete(fontFamily)
  loadedFonts.delete(fontFamily)
}

export async function unloadAllAsync() {
  await Promise.all([...loadedFonts].map((fontFamily) => unloadAsync(fontFamily)))
}

export function useFonts(fontMap: FontMap): [boolean, Error | null] {
  const [state, setState] = React.useState<{
    loaded: boolean
    error: Error | null
  }>({ loaded: false, error: null })

  React.useEffect(() => {
    let active = true
    loadAsync(fontMap).then(
      () => active && setState({ loaded: true, error: null }),
      (error: unknown) =>
        active &&
        setState({
          loaded: false,
          error: error instanceof Error ? error : new Error(String(error)),
        })
    )
    return () => {
      active = false
    }
    // Font maps exported by Expo font packages are module constants.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return [state.loaded, state.error]
}

// Vector icons feature-detect this optional native-only API.
export const renderToImageAsync = undefined

const ExpoFontWeb = {
  getLoadedFonts,
  isLoaded,
  loadAsync,
  unloadAllAsync,
  unloadAsync,
  useFonts,
}

export default ExpoFontWeb
