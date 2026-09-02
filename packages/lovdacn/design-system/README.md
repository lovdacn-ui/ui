# lovdaCN design-system source

This directory is the source of truth for the preset wire contract, active capabilities, compatibility aliases, style recipes, canonical theme tokens, semantic icons, fonts, and preview role metadata.

## Recipe provenance

The eight `styles/style-*.css` files are vendored from the recipe snapshot previously committed under `apps/v2/public/r/styles` in this repository. That snapshot was derived from shadcn's named style recipes and adapted by lovdaCN's registry compiler for React Native. The original upstream revision was not recorded in the generated files, so this repository intentionally records the local source commit (`d1ef8e3`) rather than inventing an upstream hash. A future upstream sync must record its repository URL, revision, license review, sync date, and portability diff here before replacing these files.

Vendored snapshot date: 2026-08-02.

## Canonical theme token provenance

`theme-tokens.json` is the canonical, provenance-recorded source for OKLCH design
tokens. Values are vendored verbatim from the local shadcn registry and must never be
hand-approximated. It is consumed by `scripts/generate-design-system.cjs`, which
validates it and emits the typed `generated-theme-tokens.ts` modules and the v2 theme
swatch module.

Sources (Tailwind v4 OKLCH):

- `ui/apps/v4/registry/themes.ts` (`THEMES`) — all current shadcn theme items: seven
  full base themes (`neutral`, `stone`, `zinc`, `mauve`, `olive`, `mist`, `taupe`) plus
  seventeen accent themes that carry partial primary/secondary/chart/sidebar-primary
  overrides.
- `ui/apps/v4/public/r/colors/slate.json` (`cssVarsV4`) — the retained lvcn `slate`
  base, which is absent from `themes.ts`.
- `ui/apps/v4/public/r/colors/gray.json` (`cssVarsV4`) — a compatibility base. The
  catalog lists `gray` as a base color, but `themes.ts` omits it; rather than
  hand-approximate, `gray` is vendored from its exact shadcn `cssVarsV4` so every
  catalog base color resolves.

The snapshot was taken from `https://github.com/shadcn-ui/ui.git` at commit
`35983528c233250b990f6172f1a60df228409a37`; the referenced theme and color
source files were clean at that revision. A future upstream sync must record its
new repository URL, revision, license review, sync date, and portability diff
before replacing these values. The vendored `theme-tokens.json` carries the same
provenance in its `provenance` field.

Vendored snapshot date: 2026-09-01.

## Rules

- `wire-v1.json` is immutable: values may never be reordered or removed.
- `theme-tokens.json` is vendored verbatim from shadcn: values may never be hand-edited or approximated. Refresh it only from the recorded upstream sources and update the provenance above.
- Active values come from `catalog.json`, `icon-manifest.json`, and `font-manifest.json`; legacy values belong only in `aliases.json` and the wire table.
- Recipe CSS in this directory is compiler input. `apps/v2/public/r/styles/style-*.css` is generated/debug output and must never be read as source.
- Run `pnpm --filter lovdacn design-system:generate` after edits.
- Run `pnpm --filter lovdacn design-system:check` to fail on stale output, missing recipes, unsupported manifest entries, or incomplete icon mappings.
- Runtime preview artifacts contain static class literals. Installed projects receive one static style plus one generated icon/font adapter, not all selectable profiles.

## Canonical configuration provenance

The ten visual fields, v2 value orders, global default, and eight named defaults are synced from `shadcn-ui/ui` at audited provenance commit `35983528c233250b990f6172f1a60df228409a37` and corroborated against audited main `8a1b5386010e1a4a50367fff39ee3216bf6f01b2`. The snapshot was reviewed on 2026-09-02. `wire-v2.json` uses shadcn's 51-bit `b` layout; lvcn-only values are append-only extensions after upstream values.

`wire-v1.json` remains byte-immutable and is guarded by SHA-256 in the generator. Never reorder, remove, or append its values. `wire-v2.json` is likewise append-only: existing values and fields may not move, every field default stays at index 0, and the total must remain within JavaScript's 53-bit safe integer limit.

The five added font entries use verified exact Expo Google Fonts pins. Hugeicons uses `@hugeicons/react-native@1.0.16` with `@hugeicons/core-free-icons@4.3.0`. Remix uses the viable RN adapter `react-native-remix-icon@4.7.0`, but its manifest capability is deliberately `provisional`: license provenance and acceptance of its community-maintained upstream lag must be approved before release. Do not represent that blocker as unconditional support.
