import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const [
  source,
  previewRouteSource,
  previewAppSource,
  providerSource,
  dashboardSource,
  globalsSource,
  handshakeSource,
] = await Promise.all([
  readFile(new URL('../customizer.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../preview/page.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../../../../preview/src/app/customizer-preview.tsx', import.meta.url), 'utf8'),
  readFile(
    new URL(
      '../../../../preview/src/components/design-system/preview-design-system.tsx',
      import.meta.url
    ),
    'utf8'
  ),
  readFile(
    new URL(
      '../../../../preview/src/components/previews/customizer-dashboard.tsx',
      import.meta.url
    ),
    'utf8'
  ),
  readFile(new URL('../../globals.css', import.meta.url), 'utf8'),
  readFile(new URL('../../../lib/use-preview-handshake.ts', import.meta.url), 'utf8'),
])

test('Preset applies the complete canonical style profile while Style stays field-only', () => {
  assert.match(source, /label="Preset"[\s\S]*?selectedValue=\{currentPreset\}/)
  assert.match(source, /setConfig\(\{ \.\.\.SHADCN_DEFAULT_PRESETS\[style\] \}\)/)
  assert.match(source, /label="Style"[\s\S]*?onChange=\{\(value\) => update\("style", value\)\}/)
})

test('Reset restores the current style canonical profile and clears locks', () => {
  assert.match(source, /setConfig\(\(current\) => \(\{ \.\.\.SHADCN_DEFAULT_PRESETS\[current\.style\] \}\)\)/)
  assert.match(source, /setLocks\(\{\}\)/)
})

test('Shuffle uses shadcn curated codes, avoids repeats, and overlays locks', () => {
  const block = source.match(/const SHUFFLE_PRESET_CODES = \[([\s\S]*?)\] as const/)?.[1]
  assert.ok(block)
  assert.equal(block.match(/"b[^"]+"/g)?.length, 25)
  assert.match(source, /filter\(\(candidate\) => encodePreset\(candidate\) !== encodePreset\(current\)\)/)
  assert.match(source, /map\(\(candidate\) => overlayLocks\(current, candidate, locks\)\)/)
  assert.match(source, /filter\(\(candidate\) => !sameConfig\(candidate, current\)\)/)
})

test('Hover preview uses only the handshake code, not URL or copied command state', () => {
  assert.match(source, /const presetCode = React\.useMemo\(\(\) => encodePreset\(config\), \[config\]\)/)
  assert.match(source, /const previewPresetCode = React\.useMemo\([\s\S]*?encodePreset\(previewConfig \?\? config\)/)
  assert.match(source, /preset: previewPresetCode/)
  assert.match(source, /url\.searchParams\.set\("preset", presetCode\)/)
  assert.doesNotMatch(source, /url\.searchParams\.set\("preset", previewPresetCode\)/)
  assert.match(source, /init --preset \$\{presetCode\}/)
  assert.doesNotMatch(source, /init --preset \$\{previewPresetCode\}/)
})

test('Create preview supports dark and light mode following the site theme', () => {
  assert.match(source, /import \{ useTheme \} from "next-themes"/)
  assert.match(source, /resolvedTheme === "dark" \? "dark" : "light"/)
  assert.match(source, /colorScheme/)
  assert.match(source, /lvcn-create-preview-stage/)

  assert.match(previewRouteSource, /lvcn-create-preview-stage/)
  assert.doesNotMatch(previewRouteSource, /bg-background/)
  assert.match(previewAppSource, /usePreviewColorSchemeLock/)
  assert.match(previewAppSource, /getPreviewStageColor/)
  assert.match(previewAppSource, /new window\.MutationObserver\(applyScheme\)/)
  assert.match(previewAppSource, /attributeFilter: \['class', 'style'\]/)
  assert.match(previewAppSource, /usePreviewColorSchemeLock\(design\.colorScheme\)/)
  assert.match(providerSource, /getPreviewStageColor/)
  assert.match(dashboardSource, /className="flex-1 w-full bg-transparent"/)
  assert.match(globalsSource, /\.dark \.lvcn-create-preview-stage/)
})

test('Shuffle updates theme without jarring flash or sweep animations', () => {
  assert.match(source, /data-preview-frame="create"/)
  assert.doesNotMatch(source, /lvcn-create-preview-shuffle-sweep/)
  assert.doesNotMatch(source, /lvcn-create-preview-shuffle-breathe/)
  assert.doesNotMatch(source, /scale-\[0\.997\]/)
  assert.doesNotMatch(globalsSource, /@keyframes lvcn-create-preview-sweep/)

  assert.match(dashboardSource, /transition-\[background-color,border-color,box-shadow\]/)
  assert.match(globalsSource, /\.lvcn-create-preview-stage/)
  assert.match(globalsSource, /\[data-preview-frame="create"\]/)
  assert.match(globalsSource, /prefers-reduced-motion: reduce/)
})

test('Live preview application fails open if a resource swap never confirms', () => {
  assert.match(
    handshakeSource,
    /const timeout = window\.setTimeout\(\(\) => \{[\s\S]*?current === revision \? null : current[\s\S]*?\}, 5_000\)/
  )
  assert.match(handshakeSource, /return \(\) => window\.clearTimeout\(timeout\)/)
})
