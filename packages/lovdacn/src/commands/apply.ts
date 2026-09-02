import { Command } from "commander";
import path from "path";
import fs from "fs-extra";
import pc from "picocolors";
import prompts from "prompts";
import { execa } from "execa";

import {
  decodePresetWithWarnings,
  normalizePreset,
  isPresetCode,
  PRESET_STYLES,
  FONT_PACKAGES,
  FONT_FAMILIES,
  ICON_PACKAGES,
  ICON_PACKAGE_DEPENDENCIES,
  resolveEffectiveRadius,
  RADIUS_VALUES,
  type PresetConfig,
} from "../preset/index.js";
import { DEFAULT_PRESETS } from "../preset/defaults.js";
import { runAdd, getInstalledComponents, resolveAliasPath } from "./add.js";
import { regenerateProjectCss, configureThemeTs } from "./init.js";
import { snapshotFiles, restoreFiles } from "../utils/file-backup.js";
import { normalizeLvcnConfig } from "../utils/normalize-config.js";
import {
  configureProjectFonts,
  findProjectRootLayout,
  packageNameFromSpecifier,
} from "../utils/project-fonts.js";

/**
 * Packages that a managed adapter may import but must never uninstall on migration.
 * `@expo/vector-icons` is owned by the project templates (tab/navigation glyphs) and
 * `react-native-svg` is shared by several adapters and other components, so removing
 * either when switching libraries would break unrelated, still-referenced code.
 */
const PROTECTED_RUNTIME_PACKAGES = new Set([
  "@expo/vector-icons",
  "react-native-svg",
]);

// ─── apply command ───────────────────────────────────────────────────────────
// Apply a preset code (from the web /create page), a named preset, or a style
// name to the project: update lvcn.json, regenerate global.css, install the
// font and icon packages, and re-install all managed source in the selected
// style. Semantic icons are replaced from the selected single-library item.

export const apply = new Command()
  .name("apply")
  .description("apply a preset code or style to your project")
  .argument(
    "<code>",
    "preset code from the web, a named preset (e.g. nova, sera), or a style name",
  )
  .option(
    "-c, --cwd <cwd>",
    "the working directory. defaults to the current directory.",
    process.cwd(),
  )
  .option("-y, --yes", "skip confirmation prompt", false)
  .option("-f, --force", "proceed even if the git working tree is dirty", false)
  .option(
    "--only <parts>",
    "apply only preset dimensions (comma-separated): theme (theme, chart, menu), colors (base), font (body + heading), icons, radius",
  )
  .option(
    "-p, --package-manager <pm>",
    "package manager to use (npm, yarn, pnpm, bun)",
  )
  .action(async (presetArg, opts) => {
    const cwd = path.resolve(opts.cwd);
    const lvcnPath = path.join(cwd, "lvcn.json");

    if (!fs.existsSync(lvcnPath)) {
      console.error(pc.red("No lvcn.json found. Run 'init' first."));
      process.exit(1);
    }

    // Resolve preset: named preset, immutable v1 code, active style, or legacy alias.
    let presetConfig: PresetConfig;
    let presetWarnings: string[] = [];

    const namedPreset =
      DEFAULT_PRESETS[presetArg as keyof typeof DEFAULT_PRESETS];
    if (namedPreset) {
      const { title, description, ...config } = namedPreset;
      presetConfig = config;
    } else if (isPresetCode(presetArg)) {
      const decoded = decodePresetWithWarnings(presetArg);
      if (!decoded) {
        console.error(pc.red(`Invalid preset code: ${presetArg}`));
        process.exit(1);
      }
      presetConfig = decoded.config;
      presetWarnings = decoded.warnings;
    } else if (
      (PRESET_STYLES as readonly string[]).includes(presetArg) ||
      presetArg === "default" ||
      presetArg === "new-york"
    ) {
      const normalized = normalizePreset({ style: presetArg });
      const stylePreset = DEFAULT_PRESETS[normalized.config.style];
      const { title, description, ...config } = stylePreset;
      presetConfig = config;
      presetWarnings = normalized.warnings;
    } else {
      console.error(pc.red(`Unknown preset: ${presetArg}`));
      console.error(
        pc.dim(
          `Use a named preset (${Object.keys(DEFAULT_PRESETS).join(", ")}), a preset code, or a style name.`,
        ),
      );
      process.exit(1);
    }
    for (const warning of presetWarnings)
      console.log(pc.yellow(`⚠ ${warning}`));

    // ── Present the decoded preset details to the user ─────────────────────────
    console.log();
    console.log(`  ${pc.bold("Decoded preset:")} ${pc.cyan(presetArg)}`);
    console.log();
    console.log(`  ${pc.dim("style:")}        ${presetConfig.style}`);
    console.log(`  ${pc.dim("baseColor:")}    ${presetConfig.baseColor}`);
    console.log(`  ${pc.dim("theme:")}        ${presetConfig.theme}`);
    console.log(`  ${pc.dim("chartColor:")}   ${presetConfig.chartColor}`);
    console.log(
      `  ${pc.dim("font:")}         ${presetConfig.font} (${FONT_FAMILIES[presetConfig.font]})`,
    );
    console.log(
      `  ${pc.dim("fontHeading:")}  ${presetConfig.fontHeading}${presetConfig.fontHeading === "inherit" ? "" : ` (${FONT_FAMILIES[presetConfig.fontHeading]})`}`,
    );
    console.log(
      `  ${pc.dim("iconLibrary:")} ${presetConfig.iconLibrary} (${ICON_PACKAGES[presetConfig.iconLibrary]})`,
    );
    console.log(
      `  ${pc.dim("radius:")}       ${presetConfig.radius} (${RADIUS_VALUES[resolveEffectiveRadius(presetConfig)]})`,
    );
    console.log(`  ${pc.dim("menuAccent:")}   ${presetConfig.menuAccent}`);
    console.log(`  ${pc.dim("menuColor:")}    ${presetConfig.menuColor}`);

    const rawLvcnConfig = fs.readJsonSync(lvcnPath);
    const currentNormalization = normalizeLvcnConfig(rawLvcnConfig);
    const lvcnConfig = currentNormalization.config;
    for (const warning of currentNormalization.warnings) {
      console.log(pc.yellow(`⚠ ${warning}`));
    }
    const styleEngine = lvcnConfig.styleEngine || "nativewind";

    // Parse --only into the set of dimensions to apply. Undefined = full apply.
    const ONLY_PARTS = ["theme", "colors", "font", "icons", "radius"] as const;
    let only: Set<string> | undefined;
    if (opts.only) {
      const parts = String(opts.only)
        .split(",")
        .map((p: string) => p.trim().toLowerCase())
        .filter(Boolean);
      const invalid = parts.filter(
        (p: string) => !(ONLY_PARTS as readonly string[]).includes(p),
      );
      if (parts.length === 0 || invalid.length > 0) {
        console.error(pc.red(`Invalid --only value: ${opts.only}`));
        console.error(
          pc.dim(
            `  Use one or more of: ${ONLY_PARTS.join(", ")}. Example: --only theme,font`,
          ),
        );
        process.exit(1);
      }
      only = new Set(parts);
    }

    const wants = (part: string) => !only || only.has(part);
    const reinstall = !only || wants("icons");

    // Effective config: a full apply takes everything from the preset; --only
    // keeps current values except for the requested dimensions. Style is never
    // changed by a partial apply (a style change implies a component re-install).
    const effective: PresetConfig = {
      style: only ? lvcnConfig.style || presetConfig.style : presetConfig.style,
      baseColor: wants("colors")
        ? presetConfig.baseColor
        : (lvcnConfig.baseColor ?? presetConfig.baseColor),
      theme: wants("theme")
        ? presetConfig.theme
        : (lvcnConfig.theme ?? presetConfig.theme),
      chartColor: wants("theme")
        ? presetConfig.chartColor
        : (lvcnConfig.chartColor ?? presetConfig.chartColor),
      font: wants("font")
        ? presetConfig.font
        : (lvcnConfig.font ?? presetConfig.font),
      fontHeading: wants("font")
        ? presetConfig.fontHeading
        : (lvcnConfig.fontHeading ?? presetConfig.fontHeading),
      iconLibrary: wants("icons")
        ? presetConfig.iconLibrary
        : lvcnConfig.iconLibrary,
      radius: wants("radius")
        ? presetConfig.radius
        : (lvcnConfig.radius ?? presetConfig.radius),
      menuAccent: wants("theme")
        ? presetConfig.menuAccent
        : (lvcnConfig.menuAccent ?? presetConfig.menuAccent),
      menuColor: wants("theme")
        ? presetConfig.menuColor
        : (lvcnConfig.menuColor ?? presetConfig.menuColor),
    };

    const row = (
      label: string,
      from: any,
      to: any,
      extra: string,
      applies: boolean,
    ) => {
      const key = pc.dim((label + ":").padEnd(13));
      if (applies && from !== to) {
        console.log(
          `  ${key}${from || "—"} → ${pc.green(to)}${extra ? " " + extra : ""}`,
        );
      } else {
        console.log(`  ${key}${(from ?? to) || "—"} ${pc.dim("(unchanged)")}`);
      }
    };

    // Show what will change
    console.log();
    console.log(
      `  ${pc.bold("Applying to project:")}${only ? pc.dim(`  (only: ${[...only].join(", ")})`) : ""}`,
    );
    console.log();
    row("style", lvcnConfig.style, effective.style, "", !only);
    row(
      "baseColor",
      lvcnConfig.baseColor,
      effective.baseColor,
      "",
      wants("colors"),
    );
    row("theme", lvcnConfig.theme, effective.theme, "", wants("theme"));
    row(
      "chartColor",
      lvcnConfig.chartColor,
      effective.chartColor,
      "",
      wants("theme"),
    );
    row(
      "font",
      lvcnConfig.font,
      effective.font,
      `(${FONT_FAMILIES[effective.font]})`,
      wants("font"),
    );
    row(
      "fontHeading",
      lvcnConfig.fontHeading,
      effective.fontHeading,
      effective.fontHeading === "inherit" ? "" : `(${FONT_FAMILIES[effective.fontHeading]})`,
      wants("font"),
    );
    row(
      "iconLibrary",
      lvcnConfig.iconLibrary,
      effective.iconLibrary,
      `(${ICON_PACKAGES[effective.iconLibrary]})`,
      wants("icons"),
    );
    row(
      "radius",
      lvcnConfig.radius,
      effective.radius,
      `(${RADIUS_VALUES[resolveEffectiveRadius(effective)]})`,
      wants("radius"),
    );
    row("menuAccent", lvcnConfig.menuAccent, effective.menuAccent, "", wants("theme"));
    row("menuColor", lvcnConfig.menuColor, effective.menuColor, "", wants("theme"));
    console.log(
      `  ${pc.dim("engine:".padEnd(13))}${styleEngine} ${pc.dim("(unchanged)")}`,
    );
    console.log();

    // Git-clean guard: apply overwrites CSS and re-installs components.
    if (!opts.force) {
      const dirty = await isGitDirty(cwd);
      if (dirty) {
        console.log(
          pc.yellow("⚠ Your git working tree has uncommitted changes."),
        );
        console.log(
          pc.dim(
            "  apply overwrites global.css and re-installs components. Commit or stash first, or pass --force.",
          ),
        );
        console.log();
        if (!opts.yes) {
          const { proceed } = await prompts({
            type: "confirm",
            name: "proceed",
            message: "Continue anyway?",
            initial: false,
          });
          if (!proceed) process.exit(0);
        }
      }
    }

    if (!opts.yes) {
      const { proceed } = await prompts({
        type: "confirm",
        name: "proceed",
        message: reinstall
          ? "Apply this preset? (will overwrite styles and re-install components)"
          : "Apply the selected preset parts? (will update styles)",
        initial: true,
      });
      if (!proceed) {
        process.exit(0);
      }
    }

    const cssRelativePath = lvcnConfig.tailwind?.css || "src/global.css";
    const cssPath = path.join(cwd, cssRelativePath);
    const packageManager = opts.packageManager || detectPackageManager(cwd);

    // Detect installed components up-front (used by both the snapshot and the
    // re-install step). Reconciles the tracked list with what's on disk.
    const installedComponents = getInstalledComponents(
      cwd,
      lvcnConfig.aliases,
      lvcnConfig.components || [],
    );

    // Snapshot everything present may overwrite so we can roll back on failure.
    const aliases = lvcnConfig.aliases || {};
    const snapshotPaths = [lvcnPath, cssPath];
    const fontLoaderPath = path.join(
      cwd,
      fs.existsSync(path.join(cwd, "src"))
        ? "src/lib/lvcn-fonts.ts"
        : "lib/lvcn-fonts.ts",
    );
    snapshotPaths.push(fontLoaderPath, path.join(cwd, "package.json"));
    // configureThemeTs mutates the first matching React Navigation theme file;
    // include every supported location in the transaction so a later install or
    // component failure restores it alongside lvcn.json and global.css.
    for (const themeRelativePath of [
      "src/constants/theme.ts",
      "constants/theme.ts",
      "src/constants/theme.js",
      "constants/theme.js",
    ]) {
      snapshotPaths.push(path.join(cwd, themeRelativePath));
    }
    const rootLayoutPath = findProjectRootLayout(cwd);
    if (rootLayoutPath) snapshotPaths.push(rootLayoutPath);
    for (const lockfile of [
      "pnpm-lock.yaml",
      "package-lock.json",
      "yarn.lock",
      "bun.lock",
      "bun.lockb",
    ]) {
      const lockPath = path.join(cwd, lockfile);
      if (fs.existsSync(lockPath)) snapshotPaths.push(lockPath);
    }
    const utilsAlias = resolveAliasPath(cwd, aliases.utils || "@/lib/utils");
    snapshotPaths.push(
      utilsAlias.endsWith(".ts") || utilsAlias.endsWith(".js")
        ? utilsAlias
        : utilsAlias + (lvcnConfig.tsx ? ".ts" : ".js"),
    );
    const uiDir = resolveAliasPath(cwd, aliases.ui || "@/components/ui");
    if (fs.existsSync(uiDir)) {
      for (const f of fs.readdirSync(uiDir))
        snapshotPaths.push(path.join(uiDir, f));
    }
    const backup = snapshotFiles(snapshotPaths);
    const previousFont = lvcnConfig.font;
    const previousFontHeading = lvcnConfig.fontHeading;
    const previousIconLibrary = lvcnConfig.iconLibrary;

    try {
      // 1. Update lvcn.json with the normalized selected dimensions.
      lvcnConfig.style = effective.style;
      lvcnConfig.baseColor = effective.baseColor;
      lvcnConfig.theme = effective.theme;
      lvcnConfig.chartColor = effective.chartColor;
      lvcnConfig.font = effective.font;
      lvcnConfig.fontHeading = effective.fontHeading;
      lvcnConfig.iconLibrary = effective.iconLibrary;
      lvcnConfig.radius = effective.radius;
      lvcnConfig.menuAccent = effective.menuAccent;
      lvcnConfig.menuColor = effective.menuColor;
      fs.writeJsonSync(lvcnPath, lvcnConfig, { spaces: 2 });
      console.log(pc.green(`✔ Updated lvcn.json`));

      // 2. Regenerate global.css from the effective config.
      if (fs.existsSync(cssPath)) {
        await regenerateProjectCss({
          projectPath: cwd,
          styleEngine,
          cssRelativePath,
          style: effective.style,
          baseColor: effective.baseColor,
          theme: effective.theme,
          chartColor: effective.chartColor,
          font: effective.font,
          radius: effective.radius,
          fontHeading: effective.fontHeading,
          menuAccent: effective.menuAccent,
          menuColor: effective.menuColor,
        });
        // Keep the React Navigation palette (constants/theme.ts) in sync with the
        // freshly regenerated CSS. Derives its hex palette from the same canonical
        // tokens; no-ops when the project has no theme.ts.
        configureThemeTs(
          cwd,
          effective.baseColor,
          effective.theme,
          effective.chartColor,
          effective.radius,
          effective.menuAccent,
        );
      }

      // 3. Regenerate the body/heading font loader and migrate managed packages.
      if (wants("font")) {
        const fontResource = configureProjectFonts(cwd, effective.font, effective.fontHeading);
        console.log(
          pc.blue(
            `Installing fonts ${pc.cyan(fontResource.packageSpecifiers.join(", "))} and updating ${pc.cyan(path.relative(cwd, fontResource.loaderPath))}...`,
          ),
        );
        await execa(packageManager, ["install", ...fontResource.packageSpecifiers], {
          cwd,
          stdio: "inherit",
        });

        const previousHeading = previousFontHeading === "inherit"
          ? previousFont
          : previousFontHeading;
        const previousSpecifiers = [previousFont, previousHeading]
          .filter((font): font is keyof typeof FONT_PACKAGES => Boolean(font && FONT_PACKAGES[font as keyof typeof FONT_PACKAGES]))
          .map((font) => FONT_PACKAGES[font]);
        const nextPackages = new Set(fontResource.packageSpecifiers.map(packageNameFromSpecifier));
        for (const previousSpecifier of new Set(previousSpecifiers)) {
          const previousPackage = packageNameFromSpecifier(previousSpecifier);
          if (!nextPackages.has(previousPackage)) {
            await execa(packageManager, ["remove", previousPackage], {
              cwd,
              stdio: "inherit",
            });
          }
        }
      }

      // 4. Install all selected semantic-adapter packages and remove prior exclusive dependencies.
      if (wants("icons")) {
        const iconPkgs = ICON_PACKAGE_DEPENDENCIES[effective.iconLibrary];
        const installPackages = Array.from(new Set([...iconPkgs, "react-native-svg"]));
        console.log(pc.blue(`Installing icon library: ${pc.cyan(iconPkgs.join(", "))}...`));
        await execa(packageManager, ["install", ...installPackages], {
          cwd,
          stdio: "inherit",
        });
        if (previousIconLibrary !== effective.iconLibrary) {
          const previousSpecifiers =
            ICON_PACKAGE_DEPENDENCIES[previousIconLibrary as keyof typeof ICON_PACKAGE_DEPENDENCIES];
          if (!previousSpecifiers) {
            console.log(
              pc.yellow(
                `⚠ Previous icon library "${previousIconLibrary}" is not managed — leaving dependencies untouched.`,
              ),
            );
          } else {
            const nextPackages = new Set(installPackages.map(packageNameFromSpecifier));
            for (const previousSpecifier of previousSpecifiers) {
              const previousPackage = packageNameFromSpecifier(previousSpecifier);
              if (nextPackages.has(previousPackage)) continue;
              if (PROTECTED_RUNTIME_PACKAGES.has(previousPackage)) {
                console.log(
                  pc.dim(
                    `• Kept ${previousPackage} (shared runtime dependency, not managed exclusively)`,
                  ),
                );
              } else {
                await execa(packageManager, ["remove", previousPackage], {
                  cwd,
                  stdio: "inherit",
                });
              }
            }
          }
        }
      }

      // 5. Re-install components with the new style (full apply only).
      if (reinstall && installedComponents.length > 0) {
        console.log(
          pc.blue(
            `\nRe-installing ${installedComponents.length} component(s) with ${pc.cyan(effective.style)} style...`,
          ),
        );
        await runAdd({
          components: installedComponents,
          yes: true,
          overwrite: true,
          cwd,
          packageManager: packageManager as any,
        });
      }
    } catch (err) {
      console.error(pc.red("\n✖ Apply failed — rolling back changes..."));
      restoreFiles(backup);
      console.log(
        pc.yellow(
          "✔ Restored project configuration, theme, styles, dependencies, and component files.",
        ),
      );
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }

    console.log();
    console.log(
      pc.green(`✔ Preset ${pc.cyan(presetArg)} applied successfully! 🎉`),
    );
    console.log();
  });

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function isGitDirty(cwd: string): Promise<boolean> {
  try {
    const { stdout } = await execa("git", ["status", "--porcelain"], { cwd });
    return stdout.trim().length > 0;
  } catch {
    // Not a git repo (or git unavailable) — don't block the user.
    return false;
  }
}

function detectPackageManager(cwd: string): "npm" | "yarn" | "pnpm" | "bun" {
  if (
    fs.existsSync(path.join(cwd, "bun.lockb")) ||
    fs.existsSync(path.join(cwd, "bun.lock"))
  )
    return "bun";
  if (fs.existsSync(path.join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(cwd, "yarn.lock"))) return "yarn";
  if (fs.existsSync(path.join(cwd, "package-lock.json"))) return "npm";
  return "npm";
}
