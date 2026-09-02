import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { mkdtemp, readFile, rm, writeFile, mkdir } from 'fs/promises'
import os from 'os'
import path from 'path'

import { FONT_MANIFEST, type PresetFont } from '../preset/index.js'
import {
  configureProjectFont,
  configureProjectFonts,
  getExactFontPackage,
  wireProjectFontLoader,
  writeProjectFontLoader,
} from './project-fonts.js'

describe('project font resources', () => {
  let projectPath: string

  beforeEach(async () => {
    projectPath = await mkdtemp(path.join(os.tmpdir(), 'lovda-font-test-'))
  })

  afterEach(async () => {
    await rm(projectPath, { recursive: true, force: true })
  })

  it('renders every supported font with four weight-specific faces and an exact package', async () => {
    for (const font of Object.keys(FONT_MANIFEST) as PresetFont[]) {
      const target = writeProjectFontLoader(projectPath, font)
      const content = await readFile(target, 'utf8')
      const metadata = FONT_MANIFEST[font]

      expect(target).toBe(path.join(projectPath, 'lib/lvcn-fonts.ts'))
      expect(getExactFontPackage(font)).toBe(`${metadata.package}@${metadata.version}`)
      expect(content).toContain(`from '${metadata.package}'`)
      expect(content).toContain(metadata.faces.regular)
      expect(content).toContain(metadata.faces.medium)
      expect(content).toContain(metadata.faces.semibold)
      expect(content).toContain(metadata.faces.bold)
      expect(content).toContain('export const LVCN_FONT_FACES')
      expect(content).toContain('export function getLvcnFontStyle')
      expect(content).toContain('export function useLvcnFonts')
    }
  })

  it('writes under src and idempotently gates the root layout on readiness', async () => {
    await mkdir(path.join(projectPath, 'src/app'), { recursive: true })
    const layoutPath = path.join(projectPath, 'src/app/_layout.tsx')
    await writeFile(
      layoutPath,
      "import { Slot } from 'expo-router'\n\nexport default function RootLayout() {\n  return <Slot />\n}\n",
      'utf8'
    )

    const result = configureProjectFont(projectPath, 'playfair-display')
    wireProjectFontLoader(projectPath)

    expect(result.loaderPath).toBe(path.join(projectPath, 'src/lib/lvcn-fonts.ts'))
    expect(result.layoutPath).toBe(layoutPath)
    expect(result.packageSpecifier).toBe('@expo-google-fonts/playfair-display@0.4.2')

    const layout = await readFile(layoutPath, 'utf8')
    expect(layout.match(/import \{ useLvcnFonts \}/g)).toHaveLength(1)
    expect(layout.match(/const lvcnFontsReady = useLvcnFonts\(\)/g)).toHaveLength(1)
    expect(layout.match(/if \(!lvcnFontsReady\) return null/g)).toHaveLength(1)
    expect(layout.indexOf('if (!lvcnFontsReady) return null')).toBeLessThan(layout.indexOf('return <Slot'))
  })

  it('leaves placeholder layouts unchanged when there is no render return to gate', async () => {
    await mkdir(path.join(projectPath, 'app'), { recursive: true })
    const layoutPath = path.join(projectPath, 'app/_layout.tsx')
    const placeholder = "export default function RootLayout() {\n  // TODO: add router content\n}\n"
    await writeFile(layoutPath, placeholder, 'utf8')

    expect(wireProjectFontLoader(projectPath)).toBeNull()
    expect(await readFile(layoutPath, 'utf8')).toBe(placeholder)
  })

  it('inherits and deduplicates the body font when no distinct heading is selected', async () => {
    const result = configureProjectFonts(projectPath, 'inter', 'inherit')
    const content = await readFile(result.loaderPath, 'utf8')

    expect(result.packageSpecifiers).toEqual(['@expo-google-fonts/inter@0.4.2'])
    expect(content.match(/from '@expo-google-fonts\/inter'/g)).toHaveLength(1)
    expect(content).toContain('export const LVCN_HEADING_FONT_FACES')
    expect(content).toContain("className.includes('font-heading')")
  })

  it('loads a distinct heading family and returns both exact package specifiers', async () => {
    const result = configureProjectFonts(projectPath, 'inter', 'playfair-display')
    const content = await readFile(result.loaderPath, 'utf8')

    expect(result.packageSpecifiers).toEqual([
      '@expo-google-fonts/inter@0.4.2',
      '@expo-google-fonts/playfair-display@0.4.2',
    ])
    expect(content).toContain("from '@expo-google-fonts/inter'")
    expect(content).toContain("from '@expo-google-fonts/playfair-display'")
    expect(content).toContain("regular: 'PlayfairDisplay_400Regular'")
  })

  it('supports every historical v1 font as a first-class selectable value', async () => {
    const { WIRE_PRESET_FONTS, PRESET_FONTS, FONT_ALIASES } = await import('../preset/index.js')

    // Every immutable v1 font remains directly supported; v2 appends verified shadcn parity fonts.
    expect(PRESET_FONTS.slice(0, 26)).toContain('noto-sans')
    for (const font of WIRE_PRESET_FONTS) expect(PRESET_FONTS).toContain(font)
    expect(PRESET_FONTS).toContain('space-mono')
    expect(PRESET_FONTS).toContain('fira-code')
    expect(Object.keys(FONT_ALIASES)).toHaveLength(0)
    expect(Object.keys(FONT_MANIFEST)).toHaveLength(28)
  })

  it('resolves partial-weight fonts to real faces instead of implying missing weights', async () => {
    const spaceMono = writeProjectFontLoader(projectPath, 'space-mono')
    const monoSource = await readFile(spaceMono, 'utf8')

    // Space Mono ships only 400/700, so medium/semibold must point at real files.
    expect(FONT_MANIFEST['space-mono'].availableWeights).toEqual([400, 700])
    expect(monoSource).toContain("medium: 'SpaceMono_400Regular'")
    expect(monoSource).toContain("semibold: 'SpaceMono_700Bold'")
    expect(monoSource).not.toContain('SpaceMono_500Medium')
    expect(monoSource).not.toContain('SpaceMono_600SemiBold')

    const serif = writeProjectFontLoader(projectPath, 'instrument-serif')
    const serifSource = await readFile(serif, 'utf8')

    // Instrument Serif ships a single weight; all four roles collapse onto it.
    expect(FONT_MANIFEST['instrument-serif'].availableWeights).toEqual([400])
    expect(serifSource.match(/InstrumentSerif_400Regular/g)!.length).toBeGreaterThanOrEqual(4)
    expect(serifSource).not.toMatch(/InstrumentSerif_(500|600|700)/)

    // Every font must still expose all four usable style roles.
    for (const font of Object.keys(FONT_MANIFEST) as PresetFont[]) {
      const faces = FONT_MANIFEST[font].faces
      for (const role of ['regular', 'medium', 'semibold', 'bold'] as const) {
        expect(faces[role]).toBeTruthy()
      }
    }
  })
})
