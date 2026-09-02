import { Command } from "commander"
import os from "os"
import path from "path"
import { fileURLToPath } from "url"
import fs from "fs-extra"
import prompts from "prompts"
import { execa } from "execa"
import pc from "picocolors"
import { z } from "zod"

import {
  getRegistryUrl as resolveRegistryUrl,
  setRegistryChannel,
  type RegistryChannel,
} from "../utils/registry-url.js"
import {
  decodePresetWithWarnings,
  isPresetCode,
  normalizePreset,
  FONT_FAMILIES,
  ICON_PACKAGE_DEPENDENCIES,
  RADIUS_VALUES,
  RADIUS_NAMES,
  STYLE_LABELS,
  PRESET_STYLES,
  PRESET_MENU_COLORS,
  getFontCategory,
  PRESET_CHART_COLORS,
  DEFAULT_PRESET_CONFIG,
  resolveThemeTokens,
  resolveEffectiveRadius,
  THEME_TOKEN_KEYS,
  THEME_TOKEN_NAMES,
  BASE_COLOR_NAMES,
  type PresetConfig,
  type BaseColorName,
  type ThemeTokenName,
  type RadiusName,
} from "../preset/index.js"
import { DEFAULT_PRESETS } from "../preset/defaults.js"
import { normalizeLvcnConfig } from "../utils/normalize-config.js"
import { configureProjectFonts } from "../utils/project-fonts.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// The GitHub repository that hosts the starter templates. Templates live
// under `packages/templates/<styleEngine>/<expoVersion>` in this repo and are fetched at
// runtime via a sparse checkout (shadcn-style), so they are not bundled with
// the published CLI. Override with LOVDA_GITHUB_URL for forks/testing.
const GITHUB_REPO_URL =
  process.env.LOVDA_GITHUB_URL ?? "https://github.com/lovdacn/ui.git"

const TEMPLATE_EXPO_VERSIONS = ["54", "57"] as const
type TemplateExpoVersion = (typeof TEMPLATE_EXPO_VERSIONS)[number]
const DEFAULT_TEMPLATE_EXPO_VERSION: TemplateExpoVersion = "57"

// Interactive chart-color choices — mirrors the create page's chart color
// picker by offering every PRESET_CHART_COLORS value (all 26).
const CHART_COLOR_CHOICES = PRESET_CHART_COLORS.map((c) => ({
  title: c.charAt(0).toUpperCase() + c.slice(1),
  value: c,
}))

// Default-selected index for the chart color prompt (the preset default color).
const CHART_COLOR_INITIAL = Math.max(
  0,
  (PRESET_CHART_COLORS as readonly string[]).indexOf(DEFAULT_PRESET_CONFIG.chartColor)
)

export const initOptionsSchema = z.object({
  cwd: z.string(),
  name: z.string().optional(),
  yes: z.boolean().default(false),
  force: z.boolean().default(false),
  packageManager: z.enum(["npm", "yarn", "pnpm", "bun"]).optional(),
  preset: z.string().optional(),
  engine: z.enum(["nativewind", "uniwind"]).optional(),
  expoVersion: z.enum(TEMPLATE_EXPO_VERSIONS).optional(),
  channel: z.enum(["stable", "beta"]).optional(),
})

export const init = new Command()
  .name("init")
  .description("initialize your project and install dependencies")
  .option(
    "-c, --cwd <cwd>",
    "the working directory. defaults to the current directory.",
    process.cwd()
  )
  .option("-n, --name <name>", "the name for the new project.")
  .option("-y, --yes", "skip confirmation prompt.", false)
  .option("-f, --force", "force overwrite of existing files.", false)
  .option(
    "-p, --package-manager <package-manager>",
    "the package manager to use. (npm, yarn, pnpm, bun)"
  )
  .option(
    "--preset <preset>",
    "use a preset configuration (code, named preset, or style name)"
  )
  .option(
    "--engine <engine>",
    "the style engine to use (nativewind, uniwind)"
  )
  .option(
    "--expo-version <version>",
    "the Expo SDK template to use (54, 57)"
  )
  .option(
    "--channel <channel>",
    "registry channel to install from (stable, beta). defaults to this CLI's release channel."
  )
  .action(async (opts) => {
    try {
      const options = initOptionsSchema.parse({
        ...opts,
        cwd: path.resolve(opts.cwd),
      })
      await runInit(options)
    } catch (error) {
      console.error(pc.red("\nInitialization failed:"))
      console.error(error)
      process.exit(1)
    }
  })

// Materialize the starter template into a local directory.
//
// - LOVDA_TEMPLATE_DIR (local dev/testing): use a local template directory.
//   The versioned engine-scoped subdir (`<dir>/<styleEngine>/<expoVersion>`) is
//   preferred, falling back to a direct template directory for compatibility.
// - Otherwise: sparse-clone only
//   `packages/templates/<styleEngine>/<expoVersion>` from GITHUB_REPO_URL into
//   a temp dir (shallow, blobless), mirroring shadcn.
//
// Returns the resolved template directory and a cleanup function that removes
// any temporary clone (a no-op for the local-override path).
async function materializeTemplate(
  styleEngine: "nativewind" | "uniwind",
  expoVersion: TemplateExpoVersion
): Promise<{ dir: string; cleanup: () => void }> {
  const localTemplateDir = process.env.LOVDA_TEMPLATE_DIR
  if (localTemplateDir) {
    const candidates = [
      path.resolve(localTemplateDir, styleEngine, expoVersion),
      path.resolve(localTemplateDir, expoVersion),
      path.resolve(localTemplateDir),
    ]
    const dir = candidates.find((candidate) =>
      fs.existsSync(path.join(candidate, "package.json"))
    )
    if (!dir) {
      throw new Error(
        `Template directory for ${styleEngine} Expo SDK ${expoVersion} not found at ${localTemplateDir}`
      )
    }
    return { dir, cleanup: () => {} }
  }

  // Clone only the template directory from GitHub using sparse checkout.
  const templatePath = path.join(os.tmpdir(), `lovda-template-${Date.now()}`)
  await execa("git", [
    "clone",
    "--depth",
    "1",
    "--filter=blob:none",
    "--sparse",
    GITHUB_REPO_URL,
    templatePath,
  ])
  await execa("git", [
    "-C",
    templatePath,
    "sparse-checkout",
    "set",
    `packages/templates/${styleEngine}/${expoVersion}`,
  ])

  const dir = path.resolve(
    templatePath,
    "packages",
    "templates",
    styleEngine,
    expoVersion
  )
  if (!fs.existsSync(dir)) {
    fs.removeSync(templatePath)
    throw new Error(
      `Template "${styleEngine}" for Expo SDK ${expoVersion} not found in ${GITHUB_REPO_URL}`
    )
  }

  return { dir, cleanup: () => fs.removeSync(templatePath) }
}

function getTemplateExpoVersion(packageJson: any): TemplateExpoVersion | undefined {
  const dependencies = {
    ...(packageJson.dependencies || {}),
    ...(packageJson.devDependencies || {}),
  }
  const expoVersion = dependencies.expo
  if (typeof expoVersion !== "string") {
    return undefined
  }

  const match = expoVersion.match(/\d+/)
  const major = match?.[0]
  return TEMPLATE_EXPO_VERSIONS.find((version) => version === major)
}

// Initialize a git repository and create an initial commit.
// Silently ignores failures (e.g. git not installed).
async function initializeGitRepo(projectPath: string) {
  try {
    await execa("git", ["init"], { cwd: projectPath })
    await execa("git", ["add", "-A"], { cwd: projectPath })
    await execa("git", ["commit", "-m", "feat: initial commit"], {
      cwd: projectPath,
    })
  } catch {}
}

export async function runInit(options: z.infer<typeof initOptionsSchema>) {
  setRegistryChannel(options.channel as RegistryChannel | undefined)
  const cwd = options.cwd
  const hasPackageJson = fs.existsSync(path.join(cwd, "package.json"))

  let projectName = options.name
  let packageManager = options.packageManager
  let projectPath: string
  let styleEngine: "nativewind" | "uniwind" = "nativewind"
  let expoVersion: TemplateExpoVersion =
    options.expoVersion || DEFAULT_TEMPLATE_EXPO_VERSION
  let style: string = DEFAULT_PRESET_CONFIG.style
  let baseColor: string = DEFAULT_PRESET_CONFIG.baseColor
  let chartColor: string = DEFAULT_PRESET_CONFIG.chartColor
  let presetConfig: PresetConfig | null = null

  // Resolve --preset if provided.
  if (options.preset) {
    const namedPreset = DEFAULT_PRESETS[options.preset as keyof typeof DEFAULT_PRESETS]
    let warnings: string[] = []
    if (namedPreset) {
      const { title, description, ...config } = namedPreset
      presetConfig = config
    } else if (isPresetCode(options.preset)) {
      const decoded = decodePresetWithWarnings(options.preset)
      if (!decoded) {
        console.error(pc.red(`Invalid preset code: ${options.preset}`))
        process.exit(1)
      }
      presetConfig = decoded.config
      warnings = decoded.warnings
    } else if (
      (PRESET_STYLES as readonly string[]).includes(options.preset) ||
      options.preset === "default" ||
      options.preset === "new-york"
    ) {
      const normalized = normalizePreset({ style: options.preset })
      presetConfig = DEFAULT_PRESETS[normalized.config.style]
      warnings = normalized.warnings
    } else {
      console.error(pc.red(`Unknown preset: ${options.preset}`))
      console.error(pc.dim(`Available: ${Object.keys(DEFAULT_PRESETS).join(", ")}, or a preset code.`))
      process.exit(1)
    }

    style = presetConfig.style
    baseColor = presetConfig.baseColor
    chartColor = presetConfig.chartColor
    console.log(pc.blue(`Using preset: ${pc.cyan(options.preset)}`))
    for (const warning of warnings) console.log(pc.yellow(`⚠ ${warning}`))
    console.log(pc.dim(`  style: ${style}, base: ${baseColor}, theme: ${presetConfig.theme}, chart: ${presetConfig.chartColor}, font: ${FONT_FAMILIES[presetConfig.font]}, heading: ${presetConfig.fontHeading === "inherit" ? "inherit" : FONT_FAMILIES[presetConfig.fontHeading]}, icons: ${presetConfig.iconLibrary}, radius: ${RADIUS_VALUES[resolveEffectiveRadius(presetConfig)]}, menu accent: ${presetConfig.menuAccent}, menu color: ${presetConfig.menuColor}`))
  }

  if (hasPackageJson) {
    // Existing project mode
    projectPath = cwd
    if (!packageManager) {
      packageManager = options.packageManager || getPackageManager(cwd)
    }

    // Detect styleEngine from package.json
    const packageJsonPath = path.join(cwd, "package.json")
    let packageJson: any = {}
    try {
      packageJson = fs.readJsonSync(packageJsonPath)
    } catch { }

    const deps = { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) }
    expoVersion = options.expoVersion || getTemplateExpoVersion(packageJson) || DEFAULT_TEMPLATE_EXPO_VERSION
    if (deps["uniwind"]) {
      styleEngine = "uniwind"
    } else if (deps["nativewind"]) {
      styleEngine = "nativewind"
    } else if (options.engine) {
      styleEngine = options.engine
    } else {
      if (options.yes) {
        styleEngine = "nativewind"
      } else {
        const response = await prompts({
          type: "select",
          name: "styleEngine",
          message: "Which style engine would you like to use?",
          choices: [
            { title: "NativeWind (default/reusables compatible)", value: "nativewind" },
            { title: "Uniwind", value: "uniwind" }
          ],
          initial: 0
        })
        if (!response.styleEngine) {
          process.exit(0)
        }
        styleEngine = response.styleEngine
      }
    }
  } else {
    // New project mode
    if (options.yes) {
      projectName = projectName || "nativewind-app"
      packageManager = packageManager || getPackageManager(cwd)
      styleEngine = options.engine || "nativewind"
      style = presetConfig ? presetConfig.style : DEFAULT_PRESET_CONFIG.style
      baseColor = presetConfig ? presetConfig.baseColor : DEFAULT_PRESET_CONFIG.baseColor
    } else {
      const detectedPM = getPackageManager(cwd)
      const questions: prompts.PromptObject[] = []

      if (!options.engine) {
        questions.push({
          type: "select",
          name: "styleEngine",
          message: "Which style engine would you like to use?",
          choices: [
            { title: "NativeWind (default/reusables compatible)", value: "nativewind" },
            { title: "Uniwind", value: "uniwind" }
          ],
          initial: 0
        })
      }

      if (!options.expoVersion) {
        questions.push({
          type: "select",
          name: "expoVersion",
          message: "Which Expo SDK version would you like to use?",
          choices: TEMPLATE_EXPO_VERSIONS.map((version) => ({
            title: `Expo SDK ${version}`,
            value: version,
          })),
          initial: TEMPLATE_EXPO_VERSIONS.indexOf(DEFAULT_TEMPLATE_EXPO_VERSION),
        })
      }

      if (!presetConfig) {
        questions.push({
          type: "select",
          name: "style",
          message: "Which style would you like to use?",
          choices: PRESET_STYLES.map((value) => ({ title: STYLE_LABELS[value], value })),
          initial: (PRESET_STYLES as readonly string[]).indexOf(DEFAULT_PRESET_CONFIG.style)
        })

        questions.push({
          type: "select",
          name: "baseColor",
          message: "Which color would you like to use as the base color?",
          choices: [
            { title: "Zinc", value: "zinc" },
            { title: "Slate", value: "slate" },
            { title: "Stone", value: "stone" },
            { title: "Gray", value: "gray" },
            { title: "Neutral", value: "neutral" },
            { title: "Mauve", value: "mauve" },
            { title: "Olive", value: "olive" },
            { title: "Mist", value: "mist" },
            { title: "Taupe", value: "taupe" }
          ],
          initial: 0
        })

        questions.push({
          type: "select",
          name: "chartColor",
          message: "Which chart color would you like to use?",
          choices: CHART_COLOR_CHOICES,
          initial: CHART_COLOR_INITIAL,
        })
      }

      if (!projectName) {
        questions.push({
          type: "text",
          name: "projectName",
          message: "What is your project named?",
          initial: (prev: any, values: any) => values.styleEngine === "uniwind" ? "uniwind-app" : "nativewind-app",
          validate: (value: string) =>
            value.trim().length === 0 ? "Project name cannot be empty." : true,
        })
      }

      if (!packageManager) {
        const checkInstalled = async (pm: string) => {
          try {
            await execa(pm, ["--version"])
            return true
          } catch {
            return false
          }
        }

        const [npmInstalled, yarnInstalled, pnpmInstalled, bunInstalled] = await Promise.all([
          checkInstalled("npm"),
          checkInstalled("yarn"),
          checkInstalled("pnpm"),
          checkInstalled("bun"),
        ])

        questions.push({
          type: "select",
          name: "packageManager",
          message: "Which package manager would you like to use?",
          choices: [
            { title: "npm" + (npmInstalled ? "" : " (not installed)"), value: "npm", disabled: !npmInstalled },
            { title: "yarn" + (yarnInstalled ? "" : " (not installed)"), value: "yarn", disabled: !yarnInstalled },
            { title: "pnpm" + (pnpmInstalled ? "" : " (not installed)"), value: "pnpm", disabled: !pnpmInstalled },
            { title: "bun" + (bunInstalled ? "" : " (not installed)"), value: "bun", disabled: !bunInstalled },
          ],
          initial: ["npm", "yarn", "pnpm", "bun"].indexOf(detectedPM) !== -1
            ? ["npm", "yarn", "pnpm", "bun"].indexOf(detectedPM)
            : 0,
        })
      }

      const response = await prompts(questions)
      if (
        (!projectName && !response.projectName) ||
        (!packageManager && !response.packageManager) ||
        (!options.engine && !response.styleEngine) ||
        (!options.expoVersion && !response.expoVersion) ||
        (!presetConfig && (!response.style || !response.baseColor || !response.chartColor))
      ) {
        process.exit(0)
      }
      projectName = projectName || response.projectName.trim()
      packageManager = packageManager || (response.packageManager as "npm" | "yarn" | "pnpm" | "bun")
      styleEngine = options.engine || response.styleEngine
      expoVersion = options.expoVersion || response.expoVersion || DEFAULT_TEMPLATE_EXPO_VERSION
      // style/baseColor/chartColor come from preset if provided, else from prompt
      style = presetConfig ? presetConfig.style : response.style
      baseColor = presetConfig ? presetConfig.baseColor : response.baseColor
      chartColor = presetConfig ? presetConfig.chartColor : response.chartColor
    }

    if (!packageManager) {
      throw new Error("Package manager is required.")
    }

    projectPath = path.join(cwd, projectName!)

    // Check if project path exists and has files
    if (fs.existsSync(projectPath) && fs.readdirSync(projectPath).length > 0 && !options.force) {
      if (options.yes) {
        throw new Error(`Directory ${projectPath} is not empty. Use --force to overwrite.`)
      }

      const confirm = await prompts({
        type: "confirm",
        name: "overwrite",
        message: `The directory ${pc.cyan(projectName)} is not empty. Would you like to overwrite it?`,
        initial: false,
      })

      if (!confirm.overwrite) {
        console.log(pc.yellow("Aborted."))
        return
      }
    }
  }

  // Try to read existing lvcn.json to preserve configurations if it exists
  let existingLvcnConfig: any = null
  const lvcnJsonPath = path.join(projectPath, "lvcn.json")
  if (fs.existsSync(lvcnJsonPath)) {
    if (!options.force && !options.yes) {
      const confirm = await prompts({
        type: "confirm",
        name: "overwrite",
        message: `Configuration file ${pc.cyan("lvcn.json")} already exists. Overwrite?`,
        initial: false,
      })
      if (!confirm.overwrite) {
        console.log(pc.yellow("Aborted."))
        return
      }
    }
    try {
      const normalization = normalizeLvcnConfig(fs.readJsonSync(lvcnJsonPath))
      existingLvcnConfig = normalization.config
      for (const warning of normalization.warnings) {
        console.log(pc.yellow(`⚠ ${warning}`))
      }
    } catch {
      // Ignore read errors
    }
  }

  // Prompt/set style
  if (existingLvcnConfig && existingLvcnConfig.style) {
    style = existingLvcnConfig.style
  } else if (presetConfig) {
    // style already set from preset
    style = presetConfig.style
  } else if (options.yes) {
    style = DEFAULT_PRESET_CONFIG.style
  } else if (!hasPackageJson) {
    // Style was already prompted in new project mode prompts
  } else {
    const styleResponse = await prompts({
      type: "select",
      name: "style",
      message: "Which style would you like to use?",
      choices: PRESET_STYLES.map((value) => ({ title: STYLE_LABELS[value], value })),
      initial: (PRESET_STYLES as readonly string[]).indexOf(DEFAULT_PRESET_CONFIG.style)
    })
    if (!styleResponse.style) {
      process.exit(0)
    }
    style = styleResponse.style
  }

  // Prompt/set baseColor
  if (existingLvcnConfig && existingLvcnConfig.tailwind?.baseColor) {
    baseColor = existingLvcnConfig.tailwind.baseColor
  } else if (presetConfig) {
    // baseColor already set from preset
    baseColor = presetConfig.baseColor
  } else if (options.yes) {
    baseColor = DEFAULT_PRESET_CONFIG.baseColor
  } else if (!hasPackageJson) {
    // baseColor was already prompted in new project mode prompts
  } else {
    const baseColorResponse = await prompts({
      type: "select",
      name: "baseColor",
      message: "Which color would you like to use as the base color?",
      choices: [
        { title: "Zinc", value: "zinc" },
        { title: "Slate", value: "slate" },
        { title: "Stone", value: "stone" },
        { title: "Gray", value: "gray" },
        { title: "Neutral", value: "neutral" },
        { title: "Mauve", value: "mauve" },
        { title: "Olive", value: "olive" },
        { title: "Mist", value: "mist" },
        { title: "Taupe", value: "taupe" }
      ],
      initial: 0
    })
    if (!baseColorResponse.baseColor) {
      process.exit(0)
    }
    baseColor = baseColorResponse.baseColor
  }

  // Prompt/set chartColor
  if (existingLvcnConfig && existingLvcnConfig.chartColor) {
    chartColor = existingLvcnConfig.chartColor
  } else if (presetConfig) {
    // chartColor already set from preset
    chartColor = presetConfig.chartColor
  } else if (options.yes) {
    chartColor = DEFAULT_PRESET_CONFIG.chartColor
  } else if (!hasPackageJson) {
    // chartColor was already prompted in new project mode prompts
  } else {
    const chartColorResponse = await prompts({
      type: "select",
      name: "chartColor",
      message: "Which chart color would you like to use?",
      choices: CHART_COLOR_CHOICES,
      initial: CHART_COLOR_INITIAL,
    })
    if (!chartColorResponse.chartColor) {
      process.exit(0)
    }
    chartColor = chartColorResponse.chartColor
  }

  const selectedStyleDefaults =
    DEFAULT_PRESETS[style as keyof typeof DEFAULT_PRESETS] ?? DEFAULT_PRESETS[DEFAULT_PRESET_CONFIG.style]
  const selected = normalizePreset({
    ...selectedStyleDefaults,
    style,
    baseColor,
    chartColor,
    ...(existingLvcnConfig || {}),
    ...(presetConfig || {}),
  })
  presetConfig = selected.config
  style = presetConfig.style
  baseColor = presetConfig.baseColor
  chartColor = presetConfig.chartColor
  for (const warning of selected.warnings) console.log(pc.yellow(`⚠ ${warning}`))

  // Materialize the template locally: use LOVDA_TEMPLATE_DIR for local
  // development, otherwise sparse-clone it from GitHub (shadcn-style).
  const { dir: templateDir, cleanup: cleanupTemplate } =
    await materializeTemplate(styleEngine, expoVersion)

  // For existing projects, detect src dir from the project we're initializing into.
  // New starter layouts are determined from the selected template. This supports
  // both SDK 54 root-level files and SDK 57 `src/` layouts.
  const hasSrcDir = hasPackageJson
    ? fs.existsSync(path.join(projectPath, "src"))
    : fs.existsSync(path.join(templateDir, "src"))
  const cssRelativePath = hasSrcDir ? "./src/global.css" : "./global.css"

  if (hasPackageJson) {
    console.log(pc.blue(`Initializing configurations in existing project...`))

    // 1. Write/merge lvcn.json to existing project root
    fs.writeJsonSync(
      lvcnJsonPath,
      {
        $schema: "https://lovdacn.vercel.app/schema.json",
        style: style,
        styleEngine: styleEngine,
        tsx: true,
        tailwind: {
          config: "tailwind.config.js",
          css: cssRelativePath,
          baseColor: baseColor,
        },
        aliases: {
          components: "@/components",
          utils: "@/lib/utils",
          ui: "@/components/ui",
        },
        components: [],
      },
      { spaces: 2 }
    )

    // 2. Setup global.css file
    await configureGlobalCss(projectPath, styleEngine, cssRelativePath, style, baseColor, presetConfig?.theme, chartColor, presetConfig?.font, presetConfig?.radius, presetConfig?.fontHeading, presetConfig?.menuAccent, presetConfig?.menuColor)
    configureThemeTs(projectPath, baseColor, presetConfig?.theme, chartColor, presetConfig?.radius, presetConfig?.menuAccent)

    // 3. Configure tailwind.config.js (only for nativewind - uniwind uses @theme in CSS)
    if (styleEngine === "nativewind") {
      const templateTailwindPath = path.join(templateDir, "tailwind.config.js")
      configureTailwindConfig(projectPath, templateTailwindPath)
    }

    // 4. Configure metro.config.js
    configureMetroConfig(projectPath, styleEngine, cssRelativePath, hasSrcDir)

    // 5. Configure babel.config.js (for nativewind only)
    if (styleEngine === "nativewind") {
      configureBabelConfig(projectPath)
    }

    // 6. Configure root file import for global.css and native portal host
    configureRootImport(projectPath, cssRelativePath)
    configurePortalHost(projectPath)
  } else {
    console.log(pc.blue(`Initializing project in ${pc.cyan(projectPath)}...`))

    // Ensure target directory exists
    fs.ensureDirSync(projectPath)

    // Copy template files
    fs.copySync(templateDir, projectPath, {
      filter: (src) => {
        const basename = path.basename(src)
        return (
          !src.includes("node_modules") &&
          basename !== ".git" &&
          basename !== ".expo" &&
          basename !== ".claude"
        )
      },
    })

    // Update package.json name
    const packageJsonPath = path.join(projectPath, "package.json")
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = fs.readJsonSync(packageJsonPath)
      packageJson.name = projectName
      fs.writeJsonSync(packageJsonPath, packageJson, { spaces: 2 })
    }

    // Adapt workspace config and lockfiles for the target package manager
    adaptScaffoldedProject(projectPath, packageManager!)

    // Setup global.css file with style-specific styles
    await configureGlobalCss(projectPath, styleEngine, cssRelativePath, style, baseColor, presetConfig?.theme, chartColor, presetConfig?.font, presetConfig?.radius, presetConfig?.fontHeading, presetConfig?.menuAccent, presetConfig?.menuColor)
    configureThemeTs(projectPath, baseColor, presetConfig?.theme, chartColor, presetConfig?.radius, presetConfig?.menuAccent)
  }

  // Template files are no longer needed once scaffolding/config is done.
  // Remove any temporary sparse clone (no-op for the local-override path).
  cleanupTemplate()

  // Update/merge lvcn.json
  if (fs.existsSync(lvcnJsonPath)) {
    const templateLvcn = fs.readJsonSync(lvcnJsonPath)
    const mergedConfig = {
      ...templateLvcn,
      styleEngine: styleEngine,
      ...(existingLvcnConfig || {}),
      style: style,
      // Preset fields
      baseColor: baseColor,
      chartColor: chartColor,
      ...(presetConfig ? {
        theme: presetConfig.theme,
        chartColor: presetConfig.chartColor,
        font: presetConfig.font,
        iconLibrary: presetConfig.iconLibrary,
        radius: presetConfig.radius,
        fontHeading: presetConfig.fontHeading,
        menuAccent: presetConfig.menuAccent,
        menuColor: presetConfig.menuColor,
      } : {}),
      aliases: {
        ...templateLvcn.aliases,
        ...((existingLvcnConfig && existingLvcnConfig.aliases) || {}),
      },
      tailwind: {
        ...templateLvcn.tailwind,
        ...((existingLvcnConfig && existingLvcnConfig.tailwind) || {}),
        baseColor: baseColor,
      },
      components: Array.from(
        new Set([
          ...(templateLvcn.components || []),
          ...((existingLvcnConfig && existingLvcnConfig.components) || []),
        ])
      ),
    }
    fs.writeJsonSync(lvcnJsonPath, mergedConfig, { spaces: 2 })
  }

  const fontResource = configureProjectFonts(projectPath, presetConfig.font, presetConfig.fontHeading)
  const headingLabel = presetConfig.fontHeading === "inherit"
    ? FONT_FAMILIES[presetConfig.font]
    : FONT_FAMILIES[presetConfig.fontHeading]
  console.log(
    pc.green(`✔ Configured ${pc.cyan(path.relative(projectPath, fontResource.loaderPath))} for ${FONT_FAMILIES[presetConfig.font]} (heading: ${headingLabel})`)
  )

  console.log(pc.blue(`Installing dependencies using ${pc.cyan(packageManager!)}...`))

  // Install dependencies: in existing project we install only style-engine specific packages, otherwise run full install
  if (hasPackageJson) {
    const deps =
      styleEngine === "uniwind"
        ? ["uniwind", "tailwindcss", "class-variance-authority", "@rn-primitives/portal", "react-native-gesture-handler"]
        : ["nativewind", "tailwindcss", "class-variance-authority", "@rn-primitives/portal", "react-native-gesture-handler"]
    await execa(packageManager!, ["install", ...deps], {
      cwd: projectPath,
      stdio: "inherit",
    })
  } else {
    await execa(packageManager!, ["install"], {
      cwd: projectPath,
      stdio: "inherit",
    })
  }

  // Install exact selected font + icon packages for every initialization path.
  const presetDeps = Array.from(new Set([
    ...fontResource.packageSpecifiers,
    ...ICON_PACKAGE_DEPENDENCIES[presetConfig.iconLibrary],
    "react-native-svg",
  ]))
  console.log(pc.blue(`Installing design-system packages: ${pc.cyan(presetDeps.join(", "))}...`))
  try {
    await execa(packageManager!, ["install", ...presetDeps], {
      cwd: projectPath,
      stdio: "inherit",
    })
  } catch {
    console.log(pc.yellow(`⚠ Could not install some design-system packages. Install manually: ${presetDeps.join(" ")}`))
  }

  // Initialize a git repository with an initial commit for newly
  // scaffolded projects (skip when initializing inside an existing project).
  if (!hasPackageJson) {
    await initializeGitRepo(projectPath)
  }

  console.log(pc.green("\nProject initialized successfully! 🎉"))

  // Next steps: show how to add components using the runner for the package
  // manager the user chose (npx / pnpm dlx / yarn dlx / bunx).
  const runner = getDlxRunner(packageManager!)
  console.log(pc.dim("\nNow add components with:"))
  if (!hasPackageJson && projectName) {
    console.log(`  ${pc.cyan(`cd ${projectName}`)}`)
  }
  console.log(`  ${pc.cyan(`${runner} lovdacn add`)} ${pc.dim("[...components]")}`)
}

// Map a package manager to its one-off package runner (dlx-style).
function getDlxRunner(packageManager: "npm" | "yarn" | "pnpm" | "bun"): string {
  switch (packageManager) {
    case "pnpm":
      return "pnpm dlx"
    case "bun":
      return "bunx --bun"
    case "yarn":
      return "yarn dlx"
    default:
      return "npx"
  }
}

function getPackageManager(cwd: string): "npm" | "yarn" | "pnpm" | "bun" {
  // 1. Check lockfiles in cwd first
  if (fs.existsSync(path.join(cwd, "bun.lockb")) || fs.existsSync(path.join(cwd, "bun.lock"))) return "bun"
  if (fs.existsSync(path.join(cwd, "pnpm-lock.yaml"))) return "pnpm"
  if (fs.existsSync(path.join(cwd, "yarn.lock"))) return "yarn"
  if (fs.existsSync(path.join(cwd, "package-lock.json"))) return "npm"

  // 2. Fallback to user agent if no lockfile is found
  const userAgent = process.env.npm_config_user_agent || ""
  if (userAgent.startsWith("pnpm")) return "pnpm"
  if (userAgent.startsWith("bun")) return "bun"
  if (userAgent.startsWith("yarn")) return "yarn"

  return "npm"
}

type StyleConfig = {
  radius: string;
  fontSans: string;
  defaultBaseColor: BaseColorName;
};

// Legacy shadcn styles are not part of the generated catalog, so they keep their
// historical hand-authored fallback.
const LEGACY_STYLE_CONFIGS: Record<string, StyleConfig> = {
  "default": {
    radius: "0.5rem",
    fontSans: "Inter",
    defaultBaseColor: "slate",
  },
  "new-york": {
    radius: "0.5rem",
    fontSans: "Inter",
    defaultBaseColor: "zinc",
  },
};

// Active-style fallbacks are DERIVED from the generated default presets + the
// canonical radius/font maps. This keeps the fallback radius/font/base in lock
// step with the catalog — a changed canonical radius (e.g. mira/rhea "full")
// never leaves a stale static rem value behind. Fallbacks only apply when a
// preset omits or malforms the field; a valid preset always wins via
// RADIUS_VALUES/FONT_FAMILIES directly.
const STYLE_CONFIGS: Record<string, StyleConfig> = {
  ...LEGACY_STYLE_CONFIGS,
  ...Object.fromEntries(
    PRESET_STYLES.map((style) => {
      const preset = DEFAULT_PRESETS[style];
      return [
        style,
        {
          radius: RADIUS_VALUES[preset.radius],
          fontSans: FONT_FAMILIES[preset.font],
          defaultBaseColor: preset.baseColor,
        } satisfies StyleConfig,
      ];
    })
  ),
};

// Narrow the loosely-typed preset strings to the canonical resolver's unions.
const isBaseColorName = (value: string): value is BaseColorName =>
  (BASE_COLOR_NAMES as readonly string[]).includes(value)
const isThemeTokenName = (value: string | undefined): value is ThemeTokenName =>
  value !== undefined && (THEME_TOKEN_NAMES as readonly string[]).includes(value)
const isRadiusName = (value: string | undefined): value is RadiusName =>
  value !== undefined && (RADIUS_NAMES as readonly string[]).includes(value)

// shadcn's canonical token set no longer ships --destructive-foreground, but the
// generated @theme/tailwind mappings and existing components still reference it.
// Emit a near-white value in both schemes so destructive surfaces keep a legible
// foreground — never a black fallback.
function destructiveForeground(format: "oklch" | "hsl"): string {
  return format === "hsl" ? "0 0% 98%" : "oklch(0.985 0 0)"
}

function getStyleVars(style: string, styleEngine: "nativewind" | "uniwind", baseColor: string, theme?: string, chartColor?: string, fontKey?: string, radiusKey?: string, fontHeadingKey?: string, menuAccent?: string, menuColor?: string): string {
  const styleConfig: StyleConfig = STYLE_CONFIGS[style] ?? STYLE_CONFIGS[DEFAULT_PRESET_CONFIG.style]!;

  // Resolve the canonical inputs. Unknown/omitted values fall back safely:
  //   - base color  → the style's default base color
  //   - theme       → the base color itself (a no-op accent merge)
  //   - chart color → the theme, else the base color
  // so every generated map stays complete without ever defaulting to blue.
  const resolvedBase: BaseColorName = isBaseColorName(baseColor)
    ? baseColor
    : styleConfig.defaultBaseColor;
  const resolvedTheme: ThemeTokenName = isThemeTokenName(theme) ? theme : resolvedBase;
  const resolvedChart: ThemeTokenName = isThemeTokenName(chartColor)
    ? chartColor
    : isThemeTokenName(theme)
      ? theme
      : resolvedBase;

  // Radius + font are first-class preset dimensions: resolve from the preset's
  // own field when provided, falling back to the style's default otherwise. The
  // style radius is an arbitrary rem string, so it lives outside the canonical
  // RADIUS_VALUES ladder.
  const radiusName: RadiusName | null = isRadiusName(radiusKey) ? radiusKey : null;
  const canonicalStyle = (PRESET_STYLES as readonly string[]).includes(style)
    ? style as PresetConfig["style"]
    : DEFAULT_PRESET_CONFIG.style;
  const effectiveRadiusName = resolveEffectiveRadius({
    style: canonicalStyle,
    radius: radiusName ?? DEFAULT_PRESET_CONFIG.radius,
  });
  const radius = radiusName || effectiveRadiusName !== DEFAULT_PRESET_CONFIG.radius
    ? RADIUS_VALUES[effectiveRadiusName]
    : styleConfig.radius;
  const fontSans =
    fontKey && fontKey in FONT_FAMILIES
      ? FONT_FAMILIES[fontKey as keyof typeof FONT_FAMILIES]
      : styleConfig.fontSans;
  const fontHeading =
    fontHeadingKey && fontHeadingKey !== "inherit" && fontHeadingKey in FONT_FAMILIES
      ? FONT_FAMILIES[fontHeadingKey as keyof typeof FONT_FAMILIES]
      : fontSans;
  const resolvedMenuColor =
    menuColor && (PRESET_MENU_COLORS as readonly string[]).includes(menuColor)
      ? menuColor
      : DEFAULT_PRESET_CONFIG.menuColor;

  // Resolve the COMPLETE light/dark token maps (core + chart + sidebar) from the
  // canonical resolver. Uniwind emits raw OKLCH; NativeWind emits HSL triplets
  // with alpha preserved. The resolver's own radius field is unused — the style
  // fallback above owns the emitted --radius.
  const cssFormat: "oklch" | "hsl" = styleEngine === "uniwind" ? "oklch" : "hsl";
  const resolved = resolveThemeTokens(
    {
      baseColor: resolvedBase,
      theme: resolvedTheme,
      chartColor: resolvedChart,
      radius: effectiveRadiusName,
    },
    { format: cssFormat }
  );
  const schemes = {
    light: { ...resolved.light },
    dark: { ...resolved.dark },
  };
  if (menuAccent === "bold") {
    schemes.light.accent = schemes.light.primary;
    schemes.light["accent-foreground"] = schemes.light["primary-foreground"];
    schemes.dark.accent = schemes.dark.primary;
    schemes.dark["accent-foreground"] = schemes.dark["primary-foreground"];
  }
  const destructiveFg = destructiveForeground(cssFormat);

  // Emit every canonical token (core + chart-1..5 + sidebar-*) followed by the
  // destructive-foreground compatibility token.
  const emitVars = (scheme: typeof resolved.light, indent: string): string => {
    let out = "";
    for (const key of THEME_TOKEN_KEYS) {
      out += `${indent}--${key}: ${scheme[key]};\n`;
    }
    out += `${indent}--destructive-foreground: ${destructiveFg};\n`;
    return out;
  };

  const fontVariables = `:root {
  --font-sans: ${fontSans}, ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji,
    Segoe UI Symbol, Noto Color Emoji;
  --font-heading: ${fontHeading}, ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji,
    Segoe UI Symbol, Noto Color Emoji;
  --lvcn-menu-accent: ${menuAccent === "bold" ? "bold" : "subtle"};
  --lvcn-menu-color: ${resolvedMenuColor};
  --font-display:
    Spline Sans, Inter, ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji,
    Segoe UI Symbol, Noto Color Emoji;
  --font-mono:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace;
  --font-rounded: 'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif;
  --font-serif: Georgia, 'Times New Roman', serif;
}
`;

  if (styleEngine === "uniwind") {
    const lightVars = emitVars(schemes.light, "  ");
    const darkVars = emitVars(schemes.dark, "  ");

    return `@theme inline {
  /* shadcn-style multiplicative radius scale. Small control tokens (sm/md)
     scale freely so short controls can still clamp to pills; container tokens
     (lg..4xl) are px-capped via min() so cards/dialogs/alerts can never grow
     into ovals regardless of how large --radius is. */
  --radius: ${radius};
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: min(var(--radius), 20px);
  --radius-xl: min(calc(var(--radius) * 1.4), 24px);
  --radius-2xl: min(calc(var(--radius) * 1.8), 28px);
  --radius-3xl: min(calc(var(--radius) * 2.2), 32px);
  --radius-4xl: min(calc(var(--radius) * 2.6), 32px);

  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
}

:root {
${lightVars}}

.dark {
${darkVars}}

${fontVariables}`;
  } else {
    const lightVars = emitVars(schemes.light, "    ");
    const darkVars = emitVars(schemes.dark, "    ");

    return `@layer base {
  :root {
    --radius: ${radius};
${lightVars}  }

  .dark:root {
${darkVars}  }
}

${fontVariables}`;
  }
}

const REDUCED_MOTION_CSS = `
/* -------------------------------------------------------------------------------------------------
 * Reduced motion (web)
 *
 * The motion engine respects the OS setting for JS-driven animation, but class-driven animation
 * (tailwindcss-animate \`animate-in\`/\`animate-out\`, \`animate-pulse\`, \`animate-spin\`, and CSS
 * transitions) is owned by CSS — so it is neutralised here.
 *
 * Motion is removed, never information: final states, colours and focus affordances are kept.
 * ----------------------------------------------------------------------------------------------- */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  /* Continuous loaders settle instead of running forever. */
  .animate-pulse,
  .animate-spin,
  .animate-bounce,
  .animate-ping {
    animation: none !important;
  }
}
`

async function configureGlobalCss(projectPath: string, styleEngine: "nativewind" | "uniwind", cssRelativePath: string, style: string, baseColor: string, theme?: string, chartColor?: string, font?: string, radius?: string, fontHeading?: string, menuAccent?: string, menuColor?: string) {
  const cssPath = path.join(projectPath, cssRelativePath)
  fs.ensureDirSync(path.dirname(cssPath))

  let content = ""
  if (styleEngine === "uniwind") {
    content += '@import "tailwindcss";\n'
    content += '@import "uniwind";\n'
  } else {
    content += '@tailwind base;\n'
    content += '@tailwind components;\n'
    content += '@tailwind utilities;\n'
  }

  content += "\n" + getStyleVars(style, styleEngine, baseColor, theme, chartColor, font, radius, fontHeading, menuAccent, menuColor) + "\n"
  content += REDUCED_MOTION_CSS

  fs.writeFileSync(cssPath, content, "utf8")
  console.log(pc.green(`✔ Configured global CSS for style ${pc.cyan(style)}`))
}

// Exported for the `preset apply` command to regenerate global.css with full
// color + theme + chart generation (reuses the same pipeline as init).
export async function regenerateProjectCss(opts: {
  projectPath: string
  styleEngine: "nativewind" | "uniwind"
  cssRelativePath: string
  style: string
  baseColor: string
  theme?: string
  chartColor?: string
  font?: string
  radius?: string
  fontHeading?: string
  menuAccent?: string
  menuColor?: string
}) {
  await configureGlobalCss(
    opts.projectPath,
    opts.styleEngine,
    opts.cssRelativePath,
    opts.style,
    opts.baseColor,
    opts.theme,
    opts.chartColor,
    opts.font,
    opts.radius,
    opts.fontHeading,
    opts.menuAccent,
    opts.menuColor
  )
}

function getRegistryUrl(): string {
  return resolveRegistryUrl()
}

function configureMetroConfig(projectPath: string, styleEngine: "nativewind" | "uniwind", cssRelativePath: string, hasSrcDir: boolean) {
  const filenames = ["metro.config.js", "metro.config.ts", "metro.config.cjs", "metro.config.mjs"]
  let foundFile: string | null = null
  for (const name of filenames) {
    if (fs.existsSync(path.join(projectPath, name))) {
      foundFile = name
      break
    }
  }

  if (!foundFile) {
    // Create default
    const targetPath = path.join(projectPath, "metro.config.js")
    let content = ""
    if (styleEngine === "uniwind") {
      content = `const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withUniwindConfig(config, {
  cssEntryFile: '${cssRelativePath}',
  dtsFile: '${hasSrcDir ? "./src/uniwind-types.d.ts" : "./uniwind-types.d.ts"}'
});
`
    } else {
      content = `const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: '${cssRelativePath}' });
`
    }
    fs.writeFileSync(targetPath, content, "utf8")
    console.log(pc.green(`✔ Created ${pc.cyan("metro.config.js")}`))
  } else {
    // Modify existing
    const targetPath = path.join(projectPath, foundFile)
    let content = fs.readFileSync(targetPath, "utf8")

    if (styleEngine === "uniwind" && !content.includes("withUniwindConfig")) {
      // Prepend import
      content = `const { withUniwindConfig } = require('uniwind/metro');\n` + content
      // Wrap export
      if (content.includes("module.exports = ")) {
        content = content.replace(
          /module\.exports\s*=\s*(.+?)(;?\s*$)/s,
          `module.exports = withUniwindConfig($1, {
  cssEntryFile: '${cssRelativePath}',
  dtsFile: '${hasSrcDir ? "./src/uniwind-types.d.ts" : "./uniwind-types.d.ts"}'
})$2`
        )
      }
      fs.writeFileSync(targetPath, content, "utf8")
      console.log(pc.green(`✔ Updated ${pc.cyan(foundFile)}`))
    } else if (styleEngine === "nativewind" && !content.includes("withNativeWind")) {
      // Prepend import
      content = `const { withNativeWind } = require('nativewind/metro');\n` + content
      // Wrap export
      if (content.includes("module.exports = ")) {
        content = content.replace(
          /module\.exports\s*=\s*(.+?)(;?\s*$)/s,
          `module.exports = withNativeWind($1, { input: '${cssRelativePath}' })$2`
        )
      }
      fs.writeFileSync(targetPath, content, "utf8")
      console.log(pc.green(`✔ Updated ${pc.cyan(foundFile)}`))
    }
  }
}

export function configureTailwindConfig(projectPath: string, templateTailwindPath: string) {
  const filenames = [
    "tailwind.config.js",
    "tailwind.config.ts",
    "tailwind.config.cjs",
    "tailwind.config.mjs",
  ]
  let foundFile: string | null = null
  for (const name of filenames) {
    if (fs.existsSync(path.join(projectPath, name))) {
      foundFile = name
      break
    }
  }

  if (!foundFile) {
    if (fs.existsSync(templateTailwindPath)) {
      const targetPath = path.join(projectPath, "tailwind.config.js")
      fs.copySync(templateTailwindPath, targetPath)
      console.log(pc.green(`✔ Created ${pc.cyan("tailwind.config.js")}`))
    }
    return
  }

  const targetPath = path.join(projectPath, foundFile)
  let content = fs.readFileSync(targetPath, "utf8")
  const original = content
  const patches: string[] = []

  const hasNativewindThemeImport = /require\(\s*["']nativewind\/theme["']\s*\)/.test(content)
  const hasHairlineWidthDecl = /\bhairlineWidth\b/.test(content)

  if (!hasNativewindThemeImport) {
    content = `const { hairlineWidth } = require("nativewind/theme");\n` + content
    patches.push("nativewind/theme import")
  } else if (!hasHairlineWidthDecl) {
    // The require exists but doesn't destructure hairlineWidth; leave alone to avoid breakage.
  }

  if (!/darkMode\s*:/.test(content)) {
    content = content.replace(
      /module\.exports\s*=\s*\{/,
      `module.exports = {\n  darkMode: "class",`
    )
    patches.push("darkMode")
  }

  // Ensure theme.extend exists with the semantic color mapping.
  const needsColors = !/colors\s*:\s*\{[^}]*hsl\(var\(--background\)\)/s.test(content)
  const needsBorderRadius =
    !/borderRadius\s*:\s*\{[^}]*var\(--radius\)/s.test(content)
  const needsAccordionKeyframes = !/["']accordion-down["']\s*:/.test(content)

  if (needsColors || needsBorderRadius || needsAccordionKeyframes) {
    const extendBlock = buildTailwindExtendBlock({
      includeColors: needsColors,
      includeBorderRadius: needsBorderRadius,
      includeBorderWidth: !hasHairlineWidthDecl ? false : !/borderWidth\s*:/.test(content),
      includeKeyframes: needsAccordionKeyframes,
    })

    if (/theme\s*:\s*\{\s*extend\s*:\s*\{\s*\}/.test(content)) {
      // Empty extend: replace with our block
      content = content.replace(
        /theme\s*:\s*\{\s*extend\s*:\s*\{\s*\}\s*,?\s*\}/,
        `theme: {\n    extend: ${extendBlock}\n  }`
      )
    } else if (/theme\s*:\s*\{\s*extend\s*:\s*\{/.test(content)) {
      // Non-empty extend: inject entries after the opening brace
      content = content.replace(
        /theme\s*:\s*\{\s*extend\s*:\s*\{/,
        (match) => `${match}\n      ...${extendBlock},`
      )
    } else if (/theme\s*:\s*\{/.test(content)) {
      // Has theme but no extend
      content = content.replace(
        /theme\s*:\s*\{/,
        `theme: {\n    extend: ${extendBlock},`
      )
    } else {
      // No theme at all
      content = content.replace(
        /module\.exports\s*=\s*\{/,
        `module.exports = {\n  theme: {\n    extend: ${extendBlock},\n  },`
      )
    }
    patches.push("theme.extend (colors/borderRadius/keyframes)")
  }

  // Ensure chart colors exist in the colors block (for configs that already
  // had a colors block but predate chart-color support).
  if (!/["']?chart-1["']?\s*:/.test(content)) {
    // Inject the 5 chart entries right after the card color mapping.
    const chartLines = `        "chart-1": "hsl(var(--chart-1))",
        "chart-2": "hsl(var(--chart-2))",
        "chart-3": "hsl(var(--chart-3))",
        "chart-4": "hsl(var(--chart-4))",
        "chart-5": "hsl(var(--chart-5))",`
    if (/card:\s*\{[^}]*hsl\(var\(--card-foreground\)\)[^}]*\},/s.test(content)) {
      content = content.replace(
        /(card:\s*\{[^}]*hsl\(var\(--card-foreground\)\)[^}]*\},)/s,
        `$1\n${chartLines}`
      )
      patches.push("chart colors")
    }
  }

  // Ensure sidebar colors exist in the colors block (for configs that already
  // had a colors block with the core tokens but predate sidebar-token support).
  if (
    /colors\s*:\s*\{[^}]*hsl\(var\(--background\)\)/s.test(content) &&
    !/["']?sidebar["']?\s*:/.test(content)
  ) {
    const sidebarLines = `        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },`
    if (/["']chart-5["']\s*:\s*["']hsl\(var\(--chart-5\)\)["'],?/.test(content)) {
      // Keep the block ordered: sidebar follows the chart entries.
      content = content.replace(
        /(["']chart-5["']\s*:\s*["']hsl\(var\(--chart-5\)\)["'],?)/,
        `$1\n${sidebarLines}`
      )
      patches.push("sidebar colors")
    } else if (/card:\s*\{[^}]*hsl\(var\(--card-foreground\)\)[^}]*\},/s.test(content)) {
      content = content.replace(
        /(card:\s*\{[^}]*hsl\(var\(--card-foreground\)\)[^}]*\},)/s,
        `$1\n${sidebarLines}`
      )
      patches.push("sidebar colors")
    }
  }

  // Ensure tailwindcss-animate is in plugins
  if (!/tailwindcss-animate/.test(content)) {
    if (/plugins\s*:\s*\[\s*\]/.test(content)) {
      content = content.replace(
        /plugins\s*:\s*\[\s*\]/,
        `plugins: [require("tailwindcss-animate")]`
      )
    } else if (/plugins\s*:\s*\[/.test(content)) {
      content = content.replace(
        /plugins\s*:\s*\[/,
        `plugins: [require("tailwindcss-animate"), `
      )
    } else {
      content = content.replace(
        /module\.exports\s*=\s*\{/,
        `module.exports = {\n  plugins: [require("tailwindcss-animate")],`
      )
    }
    patches.push("tailwindcss-animate plugin")
  }

  if (content !== original) {
    fs.writeFileSync(targetPath, content, "utf8")
    console.log(
      pc.green(`✔ Updated ${pc.cyan(foundFile)} (${patches.join(", ")})`)
    )
  }
}

function buildTailwindExtendBlock(opts: {
  includeColors: boolean
  includeBorderRadius: boolean
  includeBorderWidth: boolean
  includeKeyframes: boolean
}): string {
  const parts: string[] = []
  if (opts.includeColors) {
    parts.push(`      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        "chart-1": "hsl(var(--chart-1))",
        "chart-2": "hsl(var(--chart-2))",
        "chart-3": "hsl(var(--chart-3))",
        "chart-4": "hsl(var(--chart-4))",
        "chart-5": "hsl(var(--chart-5))",
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      }`)
  }
  if (opts.includeBorderRadius) {
    parts.push(`      borderRadius: {
        "4xl": "min(calc(var(--radius) * 2.6), 32px)",
        "3xl": "min(calc(var(--radius) * 2.2), 32px)",
        "2xl": "min(calc(var(--radius) * 1.8), 28px)",
        xl: "min(calc(var(--radius) * 1.4), 24px)",
        lg: "min(var(--radius), 20px)",
        md: "calc(var(--radius) * 0.8)",
        sm: "calc(var(--radius) * 0.6)",
      }`)
  }
  if (opts.includeBorderWidth) {
    parts.push(`      borderWidth: {
        hairline: hairlineWidth(),
      }`)
  }
  if (opts.includeKeyframes) {
    parts.push(`      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      }`)
    parts.push(`      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      }`)
  }
  return `{\n${parts.join(",\n")},\n    }`
}

function configureBabelConfig(projectPath: string) {
  const filenames = ["babel.config.js", "babel.config.cjs"]
  let foundFile: string | null = null
  for (const name of filenames) {
    if (fs.existsSync(path.join(projectPath, name))) {
      foundFile = name
      break
    }
  }

  if (foundFile) {
    const targetPath = path.join(projectPath, foundFile)
    let content = fs.readFileSync(targetPath, "utf8")
    if (!content.includes("nativewind/babel")) {
      content = content.replace(
        /presets:\s*\[\s*(['"])babel-preset-expo\1\s*\]/,
        `presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }], "nativewind/babel"]`
      )
      fs.writeFileSync(targetPath, content, "utf8")
      console.log(pc.green(`✔ Updated ${pc.cyan(foundFile)}`))
    }
  }
}

function configureRootImport(projectPath: string, cssRelativePath: string) {
  const possibleRootFiles = [
    "src/app/_layout.tsx",
    "app/_layout.tsx",
    "src/app/_layout.jsx",
    "app/_layout.jsx",
    "src/app/_layout.js",
    "app/_layout.js",
    "App.tsx",
    "App.jsx",
    "App.js",
    "src/App.tsx",
    "src/App.js",
  ]

  let foundFile: string | null = null
  for (const file of possibleRootFiles) {
    if (fs.existsSync(path.join(projectPath, file))) {
      foundFile = file
      break
    }
  }

  if (foundFile) {
    const targetPath = path.join(projectPath, foundFile)
    let content = fs.readFileSync(targetPath, "utf8")

    const fileDir = path.dirname(path.join(projectPath, foundFile))
    const absoluteCssPath = path.resolve(projectPath, cssRelativePath)
    let relativeImportPath = path.relative(fileDir, absoluteCssPath).replace(/\\/g, "/")

    if (!relativeImportPath.startsWith(".")) {
      relativeImportPath = "./" + relativeImportPath
    }

    const hasCssImport = content.includes("global.css") || content.includes("globals.css")

    if (!hasCssImport) {
      content = `import "${relativeImportPath}";\n` + content
      fs.writeFileSync(targetPath, content, "utf8")
      console.log(pc.green(`✔ Updated ${pc.cyan(foundFile)}`))
    }
  }
}

function configurePortalHost(projectPath: string) {
  const possibleRootFiles = [
    "src/app/_layout.tsx",
    "app/_layout.tsx",
    "src/app/_layout.jsx",
    "app/_layout.jsx",
    "src/app/_layout.js",
    "app/_layout.js",
    "App.tsx",
    "App.jsx",
    "App.js",
    "src/App.tsx",
    "src/App.js",
  ]

  let foundFile: string | null = null
  for (const file of possibleRootFiles) {
    if (fs.existsSync(path.join(projectPath, file))) {
      foundFile = file
      break
    }
  }

  if (!foundFile) return

  const targetPath = path.join(projectPath, foundFile)
  const content = fs.readFileSync(targetPath, "utf8")

  let next = content
  const changes: string[] = []

  // 1. Mount the PortalHost as the last child of the providers so native
  //    portal content (dialog, popover, dropdown, tooltip, ...) has a host.
  if (!next.includes("PortalHost")) {
    if (next.includes("</ThemeProvider>")) {
      next = next.replace(/(\s*)<\/ThemeProvider>/, "$1  <PortalHost />\n$1</ThemeProvider>")
      changes.push("PortalHost")
    } else if (next.includes("</>")) {
      next = next.replace(/(\s*)<\/>/, "$1  <PortalHost />\n$1</>")
      changes.push("PortalHost")
    }

    if (changes.includes("PortalHost")) {
      next = `import { PortalHost } from "@rn-primitives/portal";\n${next}`
    }
  }

  // 2. Wrap the app root in GestureHandlerRootView. rn-primitives overlay
  //    triggers rely on react-native-gesture-handler, and without this
  //    wrapper their presses silently fail on native, so overlays like
  //    popover/dialog/dropdown never open.
  if (!next.includes("GestureHandlerRootView")) {
    const openIdx = next.indexOf("<ThemeProvider")
    const closeToken = "</ThemeProvider>"
    const closeIdx = next.lastIndexOf(closeToken)

    if (openIdx !== -1 && closeIdx !== -1 && closeIdx > openIdx) {
      const before = next.slice(0, openIdx)
      const middle = next.slice(openIdx, closeIdx + closeToken.length)
      const after = next.slice(closeIdx + closeToken.length)
      next =
        before +
        "<GestureHandlerRootView style={{ flex: 1 }}>\n      " +
        middle +
        "\n    </GestureHandlerRootView>" +
        after
      next = `import { GestureHandlerRootView } from "react-native-gesture-handler";\n${next}`
      changes.push("GestureHandlerRootView")
    }
  }

  if (changes.length === 0) return

  fs.writeFileSync(targetPath, next, "utf8")
  console.log(pc.green(`Updated ${pc.cyan(foundFile)} with ${changes.join(" + ")}`))
}
function adaptScaffoldedProject(projectPath: string, packageManager: string) {
  // 1. Delete lockfiles that do NOT match the selected package manager
  const lockfiles: Record<string, string[]> = {
    npm: ["package-lock.json"],
    yarn: ["yarn.lock"],
    pnpm: ["pnpm-lock.yaml"],
    bun: ["bun.lock", "bun.lockb"]
  }

  for (const [pm, files] of Object.entries(lockfiles)) {
    if (pm !== packageManager) {
      for (const file of files) {
        const filePath = path.join(projectPath, file)
        if (fs.existsSync(filePath)) {
          fs.removeSync(filePath)
        }
      }
    }
  }

  // 2. Remove packageManager property from package.json if it exists
  const packageJsonPath = path.join(projectPath, "package.json")
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = fs.readJsonSync(packageJsonPath)
      delete packageJson.packageManager
      fs.writeJsonSync(packageJsonPath, packageJson, { spaces: 2 })
    } catch {}
  }
}

function hslToHex(hslStr: string): string {
  const parts = hslStr.split(/\s+/);
  if (parts.length < 3) return "#ffffff";
  const [hStr = "0", sStr = "0%", lStr = "0%"] = parts;
  const h = parseFloat(hStr);
  const s = parseFloat(sStr.replace("%", "")) / 100;
  const l = parseFloat(lStr.replace("%", "")) / 100;

  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const color = l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function configureThemeTs(projectPath: string, baseColor: string, theme?: string, chartColor?: string, radius?: string, menuAccent?: string) {
  // Find theme.ts file
  const possiblePaths = [
    "src/constants/theme.ts",
    "constants/theme.ts",
    "src/constants/theme.js",
    "constants/theme.js",
  ]
  let foundPath: string | null = null
  for (const p of possiblePaths) {
    if (fs.existsSync(path.join(projectPath, p))) {
      foundPath = p
      break
    }
  }

  if (!foundPath) return

  const targetPath = path.join(projectPath, foundPath)
  let content = fs.readFileSync(targetPath, "utf8")

  // Resolve the COMPLETE preset (base + theme + chart + radius) in HSL, then
  // derive the React Navigation hex palette from the canonical tokens instead of
  // a legacy base-only table. Accents don't override background/muted/accent, so
  // these still track the base color while staying on the canonical source.
  const resolvedBase: BaseColorName = isBaseColorName(baseColor) ? baseColor : "neutral";
  const resolvedTheme: ThemeTokenName = isThemeTokenName(theme) ? theme : resolvedBase;
  const resolvedChart: ThemeTokenName = isThemeTokenName(chartColor)
    ? chartColor
    : isThemeTokenName(theme)
      ? theme
      : resolvedBase;
  const resolvedRadiusName: RadiusName = isRadiusName(radius) ? radius : "medium";
  const { light, dark } = resolveThemeTokens(
    {
      baseColor: resolvedBase,
      theme: resolvedTheme,
      chartColor: resolvedChart,
      radius: resolvedRadiusName,
    },
    { format: "hsl" }
  );

  // Convert HSL to Hex
  const hexBackground = hslToHex(light.background)
  const hexForeground = hslToHex(light.foreground)
  const hexMuted = hslToHex(light.muted)
  const hexAccent = hslToHex(menuAccent === "bold" ? light.primary : light.accent)
  const hexMutedForeground = hslToHex(light["muted-foreground"])

  const hexBackgroundDark = hslToHex(dark.background)
  const hexForegroundDark = hslToHex(dark.foreground)
  const hexMutedDark = hslToHex(dark.muted)
  const hexAccentDark = hslToHex(menuAccent === "bold" ? dark.primary : dark.accent)
  const hexMutedForegroundDark = hslToHex(dark["muted-foreground"])

  const newColorsBlock = `export const Colors = {
  light: {
    text: '${hexForeground}',
    background: '${hexBackground}',
    backgroundElement: '${hexMuted}',
    backgroundSelected: '${hexAccent}',
    textSecondary: '${hexMutedForeground}',
  },
  dark: {
    text: '${hexForegroundDark}',
    background: '${hexBackgroundDark}',
    backgroundElement: '${hexMutedDark}',
    backgroundSelected: '${hexAccentDark}',
    textSecondary: '${hexMutedForegroundDark}',
  },
} as const;`

  // Replace Colors definition in the file
  content = content.replace(
    /export\s+const\s+Colors\s*=\s*\{[\s\S]*?\}\s*as\s+const;/g,
    newColorsBlock
  )

  fs.writeFileSync(targetPath, content, "utf8")
  console.log(pc.green(`✔ Configured theme colors in ${pc.cyan(foundPath)}`))
}
