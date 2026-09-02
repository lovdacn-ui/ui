import { Command } from "commander"
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
import { normalizeLvcnConfig } from "../utils/normalize-config.js"
import { configureProjectFont } from "../utils/project-fonts.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORTAL_COMPONENTS = new Set([
  "alert-dialog",
  "context-menu",
  "dialog",
  "dropdown-menu",
  "hover-card",
  "popover",
  "select",
  "tooltip",
])

const PORTAL_DEPENDENCY = "@rn-primitives/portal@^1.5.2"
const GESTURE_HANDLER_DEPENDENCY = "react-native-gesture-handler"

// Canonical list of registry UI components (single source of truth for the
// interactive picker and for filesystem-based installed-component detection).
export const AVAILABLE_COMPONENTS = [
  "accordion",
  "alert",
  "alert-dialog",
  "aspect-ratio",
  "avatar",
  "badge",
  "bottom-sheet",
  "breadcrumb",
  "button",
  "calendar",
  "carousel",
  "card",
  "checkbox",
  "collapsible",
  "context-menu",
  "dialog",
  "dropdown-menu",
  "hover-card",
  "icon",
  "input",
  "input-otp",
  "label",
  "menubar",
  "motion",
  "native-only-animated-view",
  "popover",
  "progress",
  "radio-group",
  "select",
  "separator",
  "sheet",
  "sidebar",
  "skeleton",
  "sonner",
  "spinner",
  "switch",
  "tabs",
  "text",
  "textarea",
  "toggle",
  "toggle-group",
  "tooltip",
] as const

// Components shipped as beta. Adding one prints a beta notice, and the interactive
// picker labels it "(beta)". The `motion` engine and its animate/activeAnimate
// contract are beta until the API stabilizes.
export const BETA_COMPONENTS = new Set<string>(["motion"])

// Marker exported by the MOTION-AWARE `components/ui/primitives.tsx`. Used to stop the
// plain seam (a dependency of every component) from overwriting the motion-aware one.
const MOTION_PRIMITIVES_MARKER = "MOTION_PRIMITIVES"

// Detect whether the target project is an Expo project (so we can defer to
// `expo install` for SDK-compatible native module versions).
function isExpoProject(cwd: string): boolean {
  try {
    const pkg = fs.readJsonSync(path.join(cwd, "package.json"))
    return Boolean(pkg?.dependencies?.expo || pkg?.devDependencies?.expo)
  } catch {
    return false
  }
}

// Build the dependency-install command. For Expo projects we invoke the local
// `expo install` via the chosen package manager's runner; `expo install` pins
// native modules to the SDK's bundled versions and installs everything else
// normally. Non-Expo projects fall back to a plain package-manager install.
function getInstallCommand(
  packageManager: "npm" | "yarn" | "pnpm" | "bun",
  deps: string[],
  useExpo: boolean
): { cmd: string; args: string[] } {
  if (!useExpo) {
    return { cmd: packageManager, args: ["install", ...deps] }
  }
  switch (packageManager) {
    case "pnpm":
      return { cmd: "pnpm", args: ["exec", "expo", "install", ...deps] }
    case "yarn":
      return { cmd: "yarn", args: ["expo", "install", ...deps] }
    case "bun":
      return { cmd: "bunx", args: ["--bun", "expo", "install", ...deps] }
    default:
      return { cmd: "npx", args: ["expo", "install", ...deps] }
  }
}

export const addOptionsSchema = z.object({
  components: z.array(z.string()).optional(),
  yes: z.boolean().default(false),
  overwrite: z.boolean().default(false),
  cwd: z.string(),
  packageManager: z.enum(["npm", "yarn", "pnpm", "bun"]).optional(),
  channel: z.enum(["stable", "beta"]).optional(),
})

export const add = new Command()
  .name("add")
  .description("add components to your project")
  .argument("[components...]", "the components to add")
  .option("-y, --yes", "skip confirmation prompt.", false)
  .option("-o, --overwrite", "overwrite existing files.", false)
  .option(
    "-c, --cwd <cwd>",
    "the working directory. defaults to the current directory.",
    process.cwd()
  )
  .option(
    "-p, --package-manager <package-manager>",
    "the package manager to use. (npm, yarn, pnpm, bun)"
  )
  .option(
    "--channel <channel>",
    "registry channel to install from (stable, beta). defaults to this CLI's release channel."
  )
  .action(async (components, opts) => {
    try {
      const options = addOptionsSchema.parse({
        components,
        ...opts,
        cwd: path.resolve(opts.cwd),
      })
      await runAdd(options)
    } catch (error) {
      console.error(pc.red("\nComponent installation failed:"))
      console.error(error)
      process.exit(1)
    }
  })

export async function runAdd(options: z.infer<typeof addOptionsSchema>) {
  setRegistryChannel(options.channel as RegistryChannel | undefined)
  const cwd = options.cwd
  const lvcnPath = path.join(cwd, "lvcn.json")

  if (!fs.existsSync(lvcnPath)) {
    throw new Error(
      "Configuration file 'lvcn.json' not found. Please run 'init' first to configure your project."
    )
  }

  const rawLvcnConfig = fs.readJsonSync(lvcnPath)
  const normalized = normalizeLvcnConfig(rawLvcnConfig)
  const lvcnConfig = normalized.config
  if (normalized.changed) {
    fs.writeJsonSync(lvcnPath, lvcnConfig, { spaces: 2 })
  }
  for (const warning of normalized.warnings) {
    console.log(pc.yellow(`⚠ ${warning}`))
  }
  let componentsToAdd = options.components || []

  if (componentsToAdd.length === 0) {
    const response = await prompts({
      type: "multiselect",
      name: "components",
      message: "Which components would you like to add?",
      choices: AVAILABLE_COMPONENTS.map((c) => ({
        title: BETA_COMPONENTS.has(c) ? `${c} (beta)` : c,
        value: c,
      })),
      instructions: "Space to select. A to toggle all. Enter to submit."
    })
    if (!response.components || response.components.length === 0) {
      process.exit(0)
    }
    componentsToAdd = response.components
  }

  const style = lvcnConfig.style
  const iconLibrary = lvcnConfig.iconLibrary || "lucide"
  const styleEngine = lvcnConfig.styleEngine || "nativewind"
  const packageManager = options.packageManager || getPackageManager(cwd)

  const queue = [...componentsToAdd]
  const resolvedComponents = new Set<string>()
  const npmDependencies = new Set<string>()
  const filesToWrite: any[] = []

  while (queue.length > 0) {
    const componentName = queue.shift()!
    if (resolvedComponents.has(componentName)) {
      continue
    }

    console.log(pc.blue(`Resolving ${pc.cyan(componentName)}...`))

    // Fetch registry item
    let registryItem: any
    try {
      registryItem = await fetchRegistryItem(componentName, style, styleEngine, iconLibrary)
    } catch (error: any) {
      throw new Error(
        `Component '${componentName}' not found in registry under style '${style}' and engine '${styleEngine}': ${error.message}`
      )
    }

    resolvedComponents.add(componentName)

    // Collect npm dependencies
    if (registryItem.dependencies) {
      registryItem.dependencies.forEach((dep: string) => npmDependencies.add(dep))
    }

    // Collect registry dependencies
    if (registryItem.registryDependencies) {
      registryItem.registryDependencies.forEach((dep: string) => {
        if (!resolvedComponents.has(dep)) {
          queue.push(dep)
        }
      })
    }

    // Collect files
    if (registryItem.files) {
      filesToWrite.push(...registryItem.files)
    }
  }

  const needsFontResource = filesToWrite.some((file) =>
    typeof file.content === "string" && file.content.includes("/lib/lvcn-fonts")
  )
  if (needsFontResource) {
    const fontResource = configureProjectFont(cwd, lvcnConfig.font)
    npmDependencies.add(fontResource.packageSpecifier)
  }

  if (Array.from(resolvedComponents).some((componentName) => PORTAL_COMPONENTS.has(componentName))) {
    npmDependencies.add(PORTAL_DEPENDENCY)
    npmDependencies.add(GESTURE_HANDLER_DEPENDENCY)
    configurePortalHost(cwd)
  }

  // Beta gate: notify when a beta component was added (directly or transitively).
  const betaAdded = Array.from(resolvedComponents).filter((c) => BETA_COMPONENTS.has(c))
  if (betaAdded.length > 0) {
    const isAre = betaAdded.length > 1 ? "are" : "is"
    console.log()
    console.log(pc.yellow(`⚠  Beta: ${pc.bold(betaAdded.join(", "))} ${isAre} in beta.`))
    console.log(
      pc.yellow(
        "   The animation API (animate / activeAnimate) may change before the stable release."
      )
    )
    console.log(pc.yellow("   Feedback welcome: https://github.com/lovdacn/ui/issues"))
    console.log()
  }

  // Install npm dependencies in one run
  if (npmDependencies.size > 0) {
    const deps = Array.from(npmDependencies)
    console.log(
      pc.blue(`Installing npm dependencies: ${pc.cyan(deps.join(", "))}...`)
    )
    // For Expo projects, install through `expo install` so native modules
    // (react-native-gesture-handler, react-native-svg, etc.) are pinned to the
    // versions bundled with the project's Expo SDK. Installing them unpinned
    // pulls the latest major (e.g. gesture-handler 3.x) which crashes in Expo Go
    // with "installUIRuntimeBindings"/NativeProxy resolution errors.
    const { cmd, args } = getInstallCommand(packageManager, deps, isExpoProject(cwd))
    await execa(cmd, args, {
      cwd,
      stdio: "inherit",
    })
  }

  // Write files
  for (const file of filesToWrite) {
    const userAliases = lvcnConfig.aliases || {}
    const relativePath = file.path
    let targetPath: string

    if (file.target) {
      // Blocks ship real routes/pages (Expo Router). A `target` is a path
      // relative to the app, resolved against the project's app dir (src/app
      // vs app). Everything else falls back to the alias routing below.
      targetPath = resolveTargetPath(cwd, file.target)
    } else if (relativePath.startsWith("components/ui/")) {
      // Preserve any subdirectories under components/ui/ (e.g. multi-file
      // components) rather than flattening to the basename.
      const subPath = relativePath.slice("components/ui/".length)
      const uiFolder = resolveAliasPath(cwd, userAliases.ui || "@/components/ui")
      targetPath = path.join(uiFolder, subPath)
    } else if (relativePath.startsWith("components/")) {
      // Preserve subdirectories under components/ (e.g. `components/blocks/...`)
      // so composed blocks keep their folder structure in the target project.
      const subPath = relativePath.slice("components/".length)
      const compFolder = resolveAliasPath(cwd, userAliases.components || "@/components")
      targetPath = path.join(compFolder, subPath)
    } else if (relativePath.includes("utils")) {
      const utilsFile = resolveAliasPath(cwd, userAliases.utils || "@/lib/utils")
      targetPath =
        utilsFile.endsWith(".ts") || utilsFile.endsWith(".js")
          ? utilsFile
          : utilsFile + (lvcnConfig.tsx ? ".ts" : ".js")
    } else {
      targetPath = path.join(cwd, relativePath)
    }

    // Ensure target directory exists
    fs.ensureDirSync(path.dirname(targetPath))

    // Install-order guard for the `primitives` host seam.
    // `motion` ships the MOTION-AWARE primitives.tsx; every component depends on the
    // PLAIN one. When both are queued (e.g. `add button motion`), the plain variant must
    // never overwrite the motion-aware variant, regardless of resolution order.
    if (
      relativePath.endsWith("components/ui/primitives.tsx") &&
      !file.content.includes(MOTION_PRIMITIVES_MARKER) &&
      fs.existsSync(targetPath) &&
      fs.readFileSync(targetPath, "utf8").includes(MOTION_PRIMITIVES_MARKER)
    ) {
      console.log(
        pc.dim(`• Kept motion-aware ${path.relative(cwd, targetPath)} (skipped plain variant)`)
      )
      continue
    }

    // Check if file exists and we are not overwriting
    if (fs.existsSync(targetPath) && !options.overwrite && !options.yes) {
      const confirm = await prompts({
        type: "confirm",
        name: "overwrite",
        message: `File ${pc.cyan(path.relative(cwd, targetPath))} already exists. Overwrite?`,
        initial: false,
      })
      if (!confirm.overwrite) {
        console.log(pc.yellow(`Skipped ${path.relative(cwd, targetPath)}`))
        continue
      }
    }

    // Rewrite aliases
    const rewrittenContent = rewriteImports(file.content, userAliases)

    // Write content
    fs.writeFileSync(targetPath, rewrittenContent, "utf8")
    console.log(pc.green(`✔ Created ${pc.cyan(path.relative(cwd, targetPath))}`))
  }

  // Detect and resolve overlapping block installations
  const existingInstalled = new Set<string>(lvcnConfig.components || [])
  const replacedBlocks = new Set<string>()

  for (const newComp of resolvedComponents) {
    for (const oldComp of Array.from(existingInstalled)) {
      if (oldComp === newComp) continue

      try {
        const oldItem = await fetchRegistryItem(oldComp, style, styleEngine, iconLibrary)
        const newItem = await fetchRegistryItem(newComp, style, styleEngine, iconLibrary)

        if (oldItem?.type === "registry:block" && newItem?.type === "registry:block") {
          const oldTargets = new Set(
            (oldItem.files || []).map((f: any) =>
              f.target ? resolveTargetPath(cwd, f.target) : f.path
            )
          )
          const newTargets = (newItem.files || []).map((f: any) =>
            f.target ? resolveTargetPath(cwd, f.target) : f.path
          )

          const hasOverlap = newTargets.some((targetPath: string) => oldTargets.has(targetPath))
          if (hasOverlap) {
            replacedBlocks.add(oldComp)
          }
        }
      } catch {
        // Ignore resolution errors for legacy entries
      }
    }
  }

  // Register components in lvcn.json and clean up replaced block entries
  if (!lvcnConfig.components) {
    lvcnConfig.components = []
  }
  for (const replaced of replacedBlocks) {
    lvcnConfig.components = lvcnConfig.components.filter((c: string) => c !== replaced)
  }
  for (const componentName of resolvedComponents) {
    if (!lvcnConfig.components.includes(componentName)) {
      lvcnConfig.components.push(componentName)
    }
  }
  fs.writeJsonSync(lvcnPath, lvcnConfig, { spaces: 2 })

  console.log(pc.green("\nComponent(s) added successfully! 🎉"))
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

  // 1. Mount the PortalHost so native portal content has a host to render into.
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
  //    triggers rely on react-native-gesture-handler; without this wrapper
  //    their presses silently fail on native, so popover/dialog/dropdown/etc.
  //    never open.
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
export function resolveAliasPath(cwd: string, alias: string): string {
  const cleanAlias = alias.replace(/^([@~]\/)/, "")

  // Check if a src directory exists and cleanAlias doesn't already start with 'src/'
  const hasSrc = fs.existsSync(path.join(cwd, "src"))
  if (hasSrc && !cleanAlias.startsWith("src/")) {
    return path.resolve(cwd, "src", cleanAlias)
  }

  return path.resolve(cwd, cleanAlias)
}

/**
 * Resolve a block file `target` (e.g. "app/(auth)/sign-in.tsx") to an absolute
 * path in the project. Expo Router supports both `app/` and `src/app/`; when a
 * target begins with the `app` segment we place it under `src/app` for projects
 * that use a `src/` layout (the lovdacn templates and most Expo apps do).
 */
export function resolveTargetPath(cwd: string, target: string): string {
  const segments = target.replace(/^[\\/]+/, "").split(/[\\/]+/)

  if (segments[0] === "app") {
    const hasSrcApp = fs.existsSync(path.join(cwd, "src", "app"))
    const hasRootApp = fs.existsSync(path.join(cwd, "app"))
    const hasSrc = fs.existsSync(path.join(cwd, "src"))
    if (hasSrcApp || (!hasRootApp && hasSrc)) {
      return path.join(cwd, "src", ...segments)
    }
  }

  return path.join(cwd, ...segments)
}

/**
 * Detect which registry UI components are installed by scanning the configured
 * `ui`/`components` alias folders, then reconcile with the tracked list in
 * lvcn.json. Returns the de-duped union, restricted to known registry names so
 * `apply` never tries to re-install arbitrary local files.
 */
export function getInstalledComponents(
  cwd: string,
  aliases: Record<string, string> | undefined,
  tracked: string[] = []
): string[] {
  const known = new Set<string>(AVAILABLE_COMPONENTS)
  const found = new Set<string>()

  for (const name of tracked) {
    if (known.has(name)) found.add(name)
  }

  const folders = [
    aliases?.ui || "@/components/ui",
    aliases?.components || "@/components",
  ]

  for (const alias of folders) {
    let dir: string
    try {
      dir = resolveAliasPath(cwd, alias)
    } catch {
      continue
    }
    if (!fs.existsSync(dir)) continue

    let entries: string[] = []
    try {
      entries = fs.readdirSync(dir)
    } catch {
      continue
    }

    for (const entry of entries) {
      const base = entry.replace(/\.(tsx|ts|jsx|js)$/i, "")
      if (known.has(base)) found.add(base)
    }
  }

  return Array.from(found).sort()
}

function rewriteImports(content: string, userAliases: Record<string, string>): string {
  const normalizeAlias = (alias: string) => alias.replace(/\/+$/, "")

  const uiAlias = normalizeAlias(userAliases.ui || "@/components/ui")
  const componentsAlias = normalizeAlias(userAliases.components || "@/components")
  const utilsAlias = normalizeAlias(userAliases.utils || "@/lib/utils")

  const uiToken = "__LOVDA_UI_ALIAS__"
  const utilsToken = "__LOVDA_UTILS_ALIAS__"

  let result = content
    // Normalize monorepo registry imports and older generated registry imports.
    .replace(/@\/registry\/(?:nativewind|uniwind)\//g, "@/")
    .replace(/~\/components\/ui\//g, "@/components/ui/")
    .replace(/~\/components\//g, "@/components/")
    .replace(/~\/lib\/utils/g, "@/lib/utils")

  result = result
    .replace(/@\/components\/ui\//g, `${uiToken}/`)
    .replace(/@\/lib\/utils/g, utilsToken)
    .replace(/@\/components\//g, `${componentsAlias}/`)
    .replace(new RegExp(`${uiToken}/`, "g"), `${uiAlias}/`)
    .replace(new RegExp(utilsToken, "g"), utilsAlias)

  return result
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

function getRegistryUrl(): string {
  return resolveRegistryUrl()
}

async function fetchRegistryItem(
  name: string,
  style: string,
  styleEngine: string,
  iconLibrary?: string
): Promise<any> {
  const registryUrl = getRegistryUrl()
  const effectiveIconLib = iconLibrary || "lucide"
  const candidates =
    name === "semantic-icon"
      ? [
          `icons/${styleEngine}/${effectiveIconLib}/semantic-icon.json`,
          `styles/${styleEngine}/${style}/semantic-icon.json`,
          `icons/${styleEngine}/lucide/semantic-icon.json`,
          `icons/nativewind/${effectiveIconLib}/semantic-icon.json`,
          `icons/nativewind/lucide/semantic-icon.json`,
          `styles/nativewind/${style}/semantic-icon.json`,
          `styles/nativewind/vega/semantic-icon.json`,
        ]
      : [
          `styles/${styleEngine}/${style}/${name}.json`,
          `blocks/${style}/${name}.json`,
          `blocks/${name}.json`,
        ]

  if (registryUrl.startsWith("file://") || !registryUrl.startsWith("http")) {
    const cleanPath = registryUrl.replace("file://", "")
    const searchRoots = [cleanPath]
    if (BETA_COMPONENTS.has(name) && !cleanPath.endsWith("beta")) {
      searchRoots.unshift(path.join(cleanPath, "beta"))
    }
    for (const root of searchRoots) {
      for (const candidate of candidates) {
        const itemPath = path.resolve(root, candidate)
        if (fs.existsSync(itemPath)) return await fs.readJson(itemPath)
      }
    }
    return await fs.readJson(path.resolve(cleanPath, candidates[0]!))
  }

  let lastStatus = "not found"
  const urlsToTry: string[] = []
  if (BETA_COMPONENTS.has(name) && !registryUrl.endsWith("/beta")) {
    for (const candidate of candidates) {
      urlsToTry.push(`${registryUrl}/beta/${candidate}`)
    }
  }
  for (const candidate of candidates) {
    urlsToTry.push(`${registryUrl}/${candidate}`)
  }

  for (const url of urlsToTry) {
    const response = await fetch(url)
    if (response.ok) return await response.json()
    lastStatus = response.statusText || String(response.status)
  }
  throw new Error(`Failed to fetch component from registry: ${lastStatus}`)
}
