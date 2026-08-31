"use strict";

/**
 * Sync generated registry components into a consumer app.
 *
 * Reads the app's `lvcn.json` for style/engine, then overwrites the app's
 * installed component files with the freshly generated payloads from the active
 * channel. This is what makes a real typecheck meaningful: an app pinned to an
 * older install tells you nothing about whether current output is sound.
 *
 *   node scripts/sync-app-components.cjs <path-to-app>
 */

const fs = require("fs-extra");
const path = require("path");
const registryChannel = require("./lib/registry-channel.cjs");

const appRoot = process.argv[2];
if (!appRoot) {
  console.error("usage: node scripts/sync-app-components.cjs <path-to-app>");
  process.exit(1);
}

const config = fs.readJsonSync(path.join(appRoot, "lvcn.json"));
const style = config.style;
const engine = config.styleEngine || "nativewind";
const stylesRoot = path.join(
  registryChannel.registryRoot(),
  "styles",
  engine,
  style,
);

if (!fs.existsSync(stylesRoot)) {
  console.error(`No generated output at ${stylesRoot}`);
  process.exit(1);
}

// Derive both the on-disk path and import namespace from the configured aliases.
// `@/components` maps to root `@`; `@preview/components` maps to `@preview`.
const componentsAlias =
  (config.aliases && config.aliases.components) || "@/components";
const componentsSuffix = "/components";
const importAliasRoot = componentsAlias.endsWith(componentsSuffix)
  ? componentsAlias.slice(0, -componentsSuffix.length)
  : "@";
const importAliasPrefix = `${importAliasRoot}/`;

function aliasToRelativePath(alias) {
  if (alias.startsWith(importAliasPrefix))
    return alias.slice(importAliasPrefix.length);
  return alias.replace(/^@\//, "");
}

function rewriteImportsForApp(content) {
  if (importAliasRoot === "@") return content;
  return content.replaceAll("@/", importAliasPrefix);
}

// Where the app keeps its UI files, derived from the alias so a src/ layout works.
const uiAlias = (config.aliases && config.aliases.ui) || "@/components/ui";
const uiRelative = aliasToRelativePath(uiAlias);
const hasSrc = fs.existsSync(path.join(appRoot, "src", uiRelative));
const uiDir = hasSrc
  ? path.join(appRoot, "src", uiRelative)
  : path.join(appRoot, uiRelative);

let written = 0;
let skipped = 0;

// `lvcn.json` does not always carry a `components` list (older inits omit it), so
// fall back to whatever the app already has on disk. Refreshing what is installed
// is the whole point; this never invents new files.
let componentNames = config.components || [];
if (componentNames.length === 0 && fs.existsSync(uiDir)) {
  componentNames = fs
    .readdirSync(uiDir)
    .filter((name) => name.endsWith(".tsx") || name.endsWith(".ts"))
    .map((name) => name.replace(/\.tsx?$/, ""));
  console.log(
    `  lvcn.json has no components list; derived ${componentNames.length} from ${uiDir}`,
  );
}

for (const name of componentNames) {
  const itemPath = path.join(stylesRoot, `${name}.json`);
  if (!fs.existsSync(itemPath)) {
    console.log(`  skip ${name} (not in channel)`);
    skipped += 1;
    continue;
  }
  const item = fs.readJsonSync(itemPath);
  for (const file of item.files || []) {
    if (!file.content || !file.path) continue;
    // Registry paths look like `components/ui/button.tsx` or `lib/utils.ts`.
    const basename = path.basename(file.path);
    const target = /^components\/ui\//.test(file.path)
      ? path.join(uiDir, basename)
      : path.join(hasSrc ? path.join(appRoot, "src") : appRoot, file.path);
    // Only refresh files the app already has, so this never invents new layout.
    if (!fs.existsSync(target)) {
      skipped += 1;
      continue;
    }
    fs.writeFileSync(target, rewriteImportsForApp(file.content), "utf8");
    written += 1;
  }
}

console.log(
  `\nsynced ${written} file(s) into ${path.relative(process.cwd(), uiDir)}  (${skipped} skipped)`,
);
console.log(
  `channel: ${registryChannel.describe()}  style: ${style}  engine: ${engine}`,
);
