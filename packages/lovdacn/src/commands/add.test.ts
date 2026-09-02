import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { mkdir, mkdtemp, rm, writeFile, readFile } from "fs/promises"
import os from "os"
import path from "path"
import prompts from "prompts"
import { execa } from "execa"
import { runAdd, addOptionsSchema } from "./add"
import fs from "fs-extra"

vi.mock("prompts", () => ({
  default: vi.fn(),
}))

vi.mock("execa", () => ({
  execa: vi.fn(),
}))

describe("runAdd", () => {
  let tempCwd: string
  let originalEnvRegistryUrl: string | undefined

  beforeEach(async () => {
    // Save original env var
    originalEnvRegistryUrl = process.env.LOVDA_REGISTRY_URL

    // Create temporary workspace directory
    tempCwd = await mkdtemp(path.join(os.tmpdir(), "lovda-test-add-cwd-"))

    // Point LOVDA_REGISTRY_URL at the locally served registry for THIS release channel.
    // The package is on the beta line, so the beta root is the registry under test; the
    // stable root is a frozen baseline artifact and is deliberately not exercised here.
    process.env.LOVDA_REGISTRY_URL = path.resolve(__dirname, "../../../../apps/v2/public/r/beta")

    vi.mocked(execa).mockResolvedValue({} as any)
  })

  afterEach(async () => {
    // Restore env var
    if (originalEnvRegistryUrl === undefined) {
      delete process.env.LOVDA_REGISTRY_URL
    } else {
      process.env.LOVDA_REGISTRY_URL = originalEnvRegistryUrl
    }

    vi.clearAllMocks()

    // Clean up directories
    await rm(tempCwd, { recursive: true, force: true })
  })

  it("should throw an error if lvcn.json is not found", async () => {
    const options = {
      components: ["button"],
      cwd: tempCwd,
      yes: true,
      overwrite: false,
    }

    await expect(runAdd(options)).rejects.toThrow(/lvcn.json/i)
  })

  it("should prompt for components if not provided in options", async () => {
    // Pre-create lvcn.json
    const lvcnConfig = {
      $schema: "https://lovdacn.vercel.app/schema.json",
      style: "new-york",
      tsx: true,
      tailwind: { config: "tailwind.config.js", css: "global.css" },
      aliases: {
        components: "~/components",
        utils: "~/lib/utils",
        ui: "~/components/ui",
      },
      components: [],
    }
    await writeFile(path.join(tempCwd, "lvcn.json"), JSON.stringify(lvcnConfig, null, 2), "utf8")

    // Mock prompts to select "button"
    vi.mocked(prompts).mockResolvedValue({ components: ["button"] })

    const options = {
      components: [],
      cwd: tempCwd,
      yes: true,
      overwrite: false,
    }

    await runAdd(options)

    // Verify button component is written
    const buttonPath = path.join(tempCwd, "components/ui/button.tsx")
    expect(fs.existsSync(buttonPath)).toBe(true)
    expect(prompts).toHaveBeenCalled()
  })

  it("should install component, rewrite aliases, and install dependencies", async () => {
    // Pre-create lvcn.json
    const lvcnConfig = {
      $schema: "https://lovdacn.vercel.app/schema.json",
      style: "new-york",
      tsx: true,
      tailwind: { config: "tailwind.config.js", css: "global.css" },
      aliases: {
        components: "~/components",
        utils: "~/lib/utils",
        ui: "~/components/ui",
      },
      components: [],
    }
    await writeFile(path.join(tempCwd, "lvcn.json"), JSON.stringify(lvcnConfig, null, 2), "utf8")

    const options = {
      components: ["button"],
      cwd: tempCwd,
      yes: true,
      overwrite: false,
    }

    await runAdd(options)

    // Verify button component is written to custom alias ui directory (~/components/ui)
    const buttonPath = path.join(tempCwd, "components/ui/button.tsx")
    expect(fs.existsSync(buttonPath)).toBe(true)

    // Verify rewritten aliases in the button.tsx
    const buttonContent = await readFile(buttonPath, "utf8")
    expect(buttonContent).toContain("import { TextClassContext } from '~/components/ui/text'")
    expect(buttonContent).toContain("import { cn } from '~/lib/utils'")

    // Verify recursively resolved components (text and utils) are written
    const textPath = path.join(tempCwd, "components/ui/text.tsx")
    expect(fs.existsSync(textPath)).toBe(true)
    const textContent = await readFile(textPath, "utf8")
    expect(textContent).toContain("import { cn } from '~/lib/utils'")

    const utilsPath = path.join(tempCwd, "lib/utils.ts")
    expect(fs.existsSync(utilsPath)).toBe(true)

    // Verify npm dependencies installation command was called with all collected packages
    expect(execa).toHaveBeenCalledWith(
      expect.any(String),
      ["install", "class-variance-authority", "@rn-primitives/slot", "clsx", "tailwind-merge", "@expo-google-fonts/inter@0.4.2"],
      {
        cwd: tempCwd,
        stdio: "inherit",
      }
    )

    // Verify all resolved components are registered in lvcn.json
    const updatedConfig = fs.readJsonSync(path.join(tempCwd, "lvcn.json"))
    expect(updatedConfig.components).toContain("button")
    expect(updatedConfig.components).toContain("text")
    expect(updatedConfig.components).toContain("utils")
  })

  it("should install native deps via `expo install` for Expo projects (SDK-pinned versions)", async () => {
    // Pre-create lvcn.json
    const lvcnConfig = {
      $schema: "https://lovdacn.vercel.app/schema.json",
      style: "new-york",
      tsx: true,
      tailwind: { config: "tailwind.config.js", css: "global.css" },
      aliases: {
        components: "@/components",
        utils: "@/lib/utils",
        ui: "@/components/ui",
      },
      components: [],
    }
    await writeFile(path.join(tempCwd, "lvcn.json"), JSON.stringify(lvcnConfig, null, 2), "utf8")

    // Mark the project as an Expo project so installs defer to `expo install`.
    await writeFile(
      path.join(tempCwd, "package.json"),
      JSON.stringify({ name: "app", dependencies: { expo: "~57.0.2" } }, null, 2),
      "utf8"
    )

    const options = {
      components: ["button"],
      cwd: tempCwd,
      yes: true,
      overwrite: false,
      packageManager: "npm" as const,
    }

    await runAdd(options)

    // Native/JS deps must be installed through `npx expo install`, not a raw
    // `npm install`, so native modules resolve to the SDK-compatible versions.
    expect(execa).toHaveBeenCalledWith(
      "npx",
      ["expo", "install", "class-variance-authority", "@rn-primitives/slot", "clsx", "tailwind-merge", "@expo-google-fonts/inter@0.4.2"],
      {
        cwd: tempCwd,
        stdio: "inherit",
      }
    )
  })

  it("should patch PortalHost and install portal dependency for overlay components", async () => {
    const lvcnConfig = {
      $schema: "https://lovdacn.vercel.app/schema.json",
      style: "maia",
      styleEngine: "nativewind",
      tsx: true,
      tailwind: { config: "tailwind.config.js", css: "src/global.css" },
      aliases: {
        components: "@/components",
        utils: "@/lib/utils",
        ui: "@/components/ui",
      },
      components: [],
    }
    await writeFile(path.join(tempCwd, "lvcn.json"), JSON.stringify(lvcnConfig, null, 2), "utf8")
    await fs.ensureDir(path.join(tempCwd, "src/app"))
    await writeFile(
      path.join(tempCwd, "src/app/_layout.tsx"),
      `import { ThemeProvider } from "expo-router";

export default function Layout() {
  return (
    <ThemeProvider value={{} as any}>
      <Slot />
    </ThemeProvider>
  )
}
`,
      "utf8"
    )

    await runAdd({ components: ["popover"], cwd: tempCwd, yes: true, overwrite: false })

    const layoutContent = await readFile(path.join(tempCwd, "src/app/_layout.tsx"), "utf8")
    expect(layoutContent).toContain('import { PortalHost } from "@rn-primitives/portal";')
    expect(layoutContent).toContain("<PortalHost />")

    expect(execa).toHaveBeenCalledWith(
      expect.any(String),
      [
        "install",
        "@rn-primitives/popover@^1.5.2",
        "@rn-primitives/portal@^1.5.2",
        "@rn-primitives/slot",
        "class-variance-authority",
        "clsx",
        "tailwind-merge",
        "@expo-google-fonts/inter@0.4.2",
        "react-native-gesture-handler",
      ],
      {
        cwd: tempCwd,
        stdio: "inherit",
      }
    )
  })
  it("should install component using default @ aliases", async () => {
    const lvcnConfig = {
      $schema: "https://lovdacn.vercel.app/schema.json",
      style: "new-york",
      tsx: true,
      tailwind: { config: "tailwind.config.js", css: "global.css" },
      aliases: {
        components: "@/components",
        utils: "@/lib/utils",
        ui: "@/components/ui",
      },
      components: [],
    }
    await writeFile(path.join(tempCwd, "lvcn.json"), JSON.stringify(lvcnConfig, null, 2), "utf8")

    const options = {
      components: ["button"],
      cwd: tempCwd,
      yes: true,
      overwrite: false,
    }

    await runAdd(options)

    const buttonPath = path.join(tempCwd, "components/ui/button.tsx")
    const buttonContent = await readFile(buttonPath, "utf8")

    expect(buttonContent).toContain("import { TextClassContext } from '@/components/ui/text'")
    expect(buttonContent).toContain("import { cn } from '@/lib/utils'")
    expect(buttonContent).not.toContain("~/components")
    expect(buttonContent).not.toContain("~/lib")
  })
  it("should install component in mira style with per-style overrides", async () => {
    // Pre-create lvcn.json with style: mira
    const lvcnConfig = {
      $schema: "https://lovdacn.vercel.app/schema.json",
      style: "mira",
      tsx: true,
      tailwind: { config: "tailwind.config.js", css: "global.css" },
      aliases: {
        components: "~/components",
        utils: "~/lib/utils",
        ui: "~/components/ui",
      },
      components: [],
    }
    await writeFile(path.join(tempCwd, "lvcn.json"), JSON.stringify(lvcnConfig, null, 2), "utf8")

    const options = {
      components: ["button"],
      cwd: tempCwd,
      yes: true,
      overwrite: false,
    }

    await runAdd(options)

    // Verify button component is written to custom alias ui directory
    const buttonPath = path.join(tempCwd, "components/ui/button.tsx")
    expect(fs.existsSync(buttonPath)).toBe(true)

    // Verify rewritten aliases and distinct mira per-style overrides.
    // Mira applies its per-style CSS (e.g. text-xs/relaxed typography) and its
    // pill shape comes from the bounded --radius variable (1.5rem). On short
    // controls like buttons/inputs this clamps to a full pill, while containers
    // stay rounded rectangles — NOT a hardcoded rounded-full class (that was the
    // old STYLE_TRANSFORMS hack).
    const buttonContent = await readFile(buttonPath, "utf8")
    expect(buttonContent).toContain("text-xs/relaxed")
    expect(buttonContent).not.toContain("rounded-full")
  })

  it("resolves semantic icons from the selected library namespace", async () => {
    const lvcnConfig = {
      $schema: "https://lovdacn.vercel.app/schema.json",
      style: "mira",
      baseColor: "neutral",
      theme: "cyan",
      chartColor: "teal",
      font: "inter",
      iconLibrary: "phosphor",
      radius: "medium",
      styleEngine: "nativewind",
      tsx: true,
      tailwind: { config: "tailwind.config.js", css: "global.css" },
      aliases: {
        components: "@/components",
        utils: "@/lib/utils",
        ui: "@/components/ui",
      },
      components: [],
    }
    await writeFile(path.join(tempCwd, "lvcn.json"), JSON.stringify(lvcnConfig, null, 2), "utf8")

    await runAdd({ components: ["semantic-icon"], cwd: tempCwd, yes: true, overwrite: true })

    const adapter = await readFile(path.join(tempCwd, "components/ui/semantic-icon.tsx"), "utf8")
    expect(adapter).toContain('from "phosphor-react-native"')
    expect(adapter).not.toContain('from "lucide-react-native"')
    expect(execa).toHaveBeenCalledWith(
      expect.any(String),
      ["install", "phosphor-react-native@3.0.6", "react-native-svg"],
      { cwd: tempCwd, stdio: "inherit" }
    )
  })

  it("resolves semantic icons for expo (@expo/vector-icons)", async () => {
    const lvcnConfig = {
      $schema: "https://lovdacn.vercel.app/schema.json",
      style: "nova",
      baseColor: "zinc",
      theme: "blue",
      chartColor: "blue",
      font: "inter",
      iconLibrary: "expo",
      radius: "medium",
      styleEngine: "nativewind",
      tsx: true,
      tailwind: { config: "tailwind.config.js", css: "global.css" },
      aliases: {
        components: "@/components",
        utils: "@/lib/utils",
        ui: "@/components/ui",
      },
      components: [],
    }
    await writeFile(path.join(tempCwd, "lvcn.json"), JSON.stringify(lvcnConfig, null, 2), "utf8")

    await runAdd({ components: ["semantic-icon"], cwd: tempCwd, yes: true, overwrite: true })

    const adapter = await readFile(path.join(tempCwd, "components/ui/semantic-icon.tsx"), "utf8")
    expect(adapter).toContain('from "@expo/vector-icons"')
    expect(adapter).toContain("createExpoSemanticIcon")
    expect(execa).toHaveBeenCalledWith(
      expect.any(String),
      ["install", "@expo/vector-icons@15.0.3", "react-native-svg"],
      { cwd: tempCwd, stdio: "inherit" }
    )
  })

  it("resolves semantic icons for heroicons (react-native-heroicons)", async () => {
    const lvcnConfig = {
      $schema: "https://lovdacn.vercel.app/schema.json",
      style: "rhea",
      baseColor: "stone",
      theme: "amber",
      chartColor: "orange",
      font: "inter",
      iconLibrary: "heroicons",
      radius: "medium",
      styleEngine: "nativewind",
      tsx: true,
      tailwind: { config: "tailwind.config.js", css: "global.css" },
      aliases: {
        components: "@/components",
        utils: "@/lib/utils",
        ui: "@/components/ui",
      },
      components: [],
    }
    await writeFile(path.join(tempCwd, "lvcn.json"), JSON.stringify(lvcnConfig, null, 2), "utf8")

    await runAdd({ components: ["semantic-icon"], cwd: tempCwd, yes: true, overwrite: true })

    const adapter = await readFile(path.join(tempCwd, "components/ui/semantic-icon.tsx"), "utf8")
    expect(adapter).toContain('from "react-native-heroicons/outline"')
    expect(execa).toHaveBeenCalledWith(
      expect.any(String),
      ["install", "react-native-heroicons@4.0.0", "react-native-svg"],
      { cwd: tempCwd, stdio: "inherit" }
    )
  })

  it("should install a block as Expo Router routes via file `target`", async () => {
    const lvcnConfig = {
      $schema: "https://lovdacn.vercel.app/schema.json",
      style: "new-york",
      styleEngine: "nativewind",
      tsx: true,
      tailwind: { config: "tailwind.config.js", css: "global.css" },
      aliases: {
        components: "@/components",
        utils: "@/lib/utils",
        ui: "@/components/ui",
      },
      components: [],
    }
    await writeFile(path.join(tempCwd, "lvcn.json"), JSON.stringify(lvcnConfig, null, 2), "utf8")

    // `login-01` is resolved from the shared blocks/ namespace via the
    // fetchRegistryItem fallback (it has no per-style entry).
    await runAdd({ components: ["login-01"], cwd: tempCwd, yes: true, overwrite: false })

    // Page files land at their route `target`. This project has no `src/` dir,
    // so `app/...` targets resolve directly under the project root.
    const layoutPath = path.join(tempCwd, "app", "(auth)", "_layout.tsx")
    const signInPath = path.join(tempCwd, "app", "(auth)", "sign-in.tsx")
    expect(fs.existsSync(layoutPath)).toBe(true)
    expect(fs.existsSync(signInPath)).toBe(true)

    // The form component lands under the components alias.
    const formPath = path.join(tempCwd, "components/login-form.tsx")
    expect(fs.existsSync(formPath)).toBe(true)

    // registryDependencies (components) are resolved and written too.
    for (const dep of ["card", "input", "label", "button", "text"]) {
      expect(fs.existsSync(path.join(tempCwd, `components/ui/${dep}.tsx`))).toBe(true)
    }
    expect(fs.existsSync(path.join(tempCwd, "lib/utils.ts"))).toBe(true)

    // The route imports the form and wraps in SafeAreaView.
    const signInContent = await readFile(signInPath, "utf8")
    expect(signInContent).toContain("import { LoginForm } from '@/components/login-form'")
    expect(signInContent).toContain("SafeAreaView")
    expect(signInContent).toContain("react-native-safe-area-context")
    const formContent = await readFile(formPath, "utf8")
    expect(formContent).toContain("import { Button } from '@/components/ui/button'")
    expect(formContent).not.toContain("~/components")

    // Block + resolved components are recorded in lvcn.json.
    let updatedConfig = fs.readJsonSync(path.join(tempCwd, "lvcn.json"))
    expect(updatedConfig.components).toContain("login-01")
    expect(updatedConfig.components).toContain("card")
    expect(updatedConfig.components).toContain("utils")

    // Installing a replacement block (`login-02`) overwrites login-01 and cleans up lvcn.json tracking
    await runAdd({ components: ["login-02"], cwd: tempCwd, yes: true, overwrite: true })
    updatedConfig = fs.readJsonSync(path.join(tempCwd, "lvcn.json"))
    expect(updatedConfig.components).toContain("login-02")
    expect(updatedConfig.components).not.toContain("login-01")
  })

  it("should place block routes under src/app for projects using a src/ layout", async () => {
    const lvcnConfig = {
      $schema: "https://lovdacn.vercel.app/schema.json",
      style: "new-york",
      styleEngine: "nativewind",
      tsx: true,
      tailwind: { config: "tailwind.config.js", css: "src/global.css" },
      aliases: {
        components: "@/components",
        utils: "@/lib/utils",
        ui: "@/components/ui",
      },
      components: [],
    }
    await writeFile(path.join(tempCwd, "lvcn.json"), JSON.stringify(lvcnConfig, null, 2), "utf8")
    // Simulate an existing Expo Router project that uses the `src/app` layout.
    await fs.ensureDir(path.join(tempCwd, "src/app"))

    await runAdd({ components: ["signup-01"], cwd: tempCwd, yes: true, overwrite: false })

    // `app/...` targets resolve under `src/app`; components under `src/components`.
    const signUpPath = path.join(tempCwd, "src/app/(auth)/sign-up.tsx")
    expect(fs.existsSync(signUpPath)).toBe(true)
    const signUpContent = await readFile(signUpPath, "utf8")
    expect(signUpContent).toContain("SafeAreaView")
    expect(fs.existsSync(path.join(tempCwd, "src/app/(auth)/_layout.tsx"))).toBe(true)
    expect(fs.existsSync(path.join(tempCwd, "src/components/signup-form.tsx"))).toBe(true)
    expect(fs.existsSync(path.join(tempCwd, "src/components/ui/checkbox.tsx"))).toBe(true)
  })

  describe("primitives host seam", () => {
    const seamConfig = {
      $schema: "https://lovdacn.vercel.app/schema.json",
      style: "default",
      styleEngine: "nativewind",
      tsx: true,
      tailwind: { config: "tailwind.config.js", css: "global.css" },
      aliases: { components: "~/components", utils: "~/lib/utils", ui: "~/components/ui" },
      components: [],
    }

    async function writeSeamConfig() {
      await writeFile(path.join(tempCwd, "lvcn.json"), JSON.stringify(seamConfig, null, 2), "utf8")
    }

    it("installs the PLAIN primitives seam with no animation runtime", async () => {
      await writeSeamConfig()

      await runAdd({ components: ["primitives"], cwd: tempCwd, yes: true, overwrite: true })

      const seam = await readFile(path.join(tempCwd, "components/ui/primitives.tsx"), "utf8")
      expect(seam).toContain("export { Pressable, Text, TextInput, View }")
      // Plain seam must not pull in Reanimated, and must not claim to be motion-aware.
      expect(seam).not.toContain("reanimated")
      expect(seam).not.toContain("MOTION_PRIMITIVES")
      // No npm dependencies for the plain seam.
      expect(execa).not.toHaveBeenCalled()
    })

    it("`add motion` installs the engine AND the motion-aware seam", async () => {
      await writeSeamConfig()

      await runAdd({
        components: ["motion"],
        cwd: tempCwd,
        yes: true,
        overwrite: true,
        packageManager: "npm" as const,
      })

      expect(fs.existsSync(path.join(tempCwd, "components/ui/motion.tsx"))).toBe(true)
      const seam = await readFile(path.join(tempCwd, "components/ui/primitives.tsx"), "utf8")
      expect(seam).toContain("MOTION_PRIMITIVES")
      expect(seam).toContain("MotionPressable as Pressable")

      // Reanimated + Worklets are installed for the engine.
      expect(execa).toHaveBeenCalledWith(
        "npm",
        ["install", "react-native-reanimated", "react-native-worklets", "clsx", "tailwind-merge"],
        { cwd: tempCwd, stdio: "inherit" }
      )
    })

    it("keeps the motion-aware seam when the plain seam is installed afterwards", async () => {
      await writeSeamConfig()

      // Both queued together: motion resolves first and writes the motion-aware seam,
      // then `primitives` would write the plain one. The guard must prevent that.
      await runAdd({
        components: ["motion", "primitives"],
        cwd: tempCwd,
        yes: true,
        overwrite: true,
        packageManager: "npm" as const,
      })

      const seam = await readFile(path.join(tempCwd, "components/ui/primitives.tsx"), "utf8")
      expect(seam).toContain("MOTION_PRIMITIVES")
      expect(seam).not.toContain("withoutMotionProps")
    })

    it("upgrades the plain seam when motion is added later", async () => {
      await writeSeamConfig()

      await runAdd({ components: ["primitives"], cwd: tempCwd, yes: true, overwrite: true })
      const plain = await readFile(path.join(tempCwd, "components/ui/primitives.tsx"), "utf8")
      expect(plain).not.toContain("MOTION_PRIMITIVES")

      await runAdd({
        components: ["motion"],
        cwd: tempCwd,
        yes: true,
        overwrite: true,
        packageManager: "npm" as const,
      })

      const upgraded = await readFile(path.join(tempCwd, "components/ui/primitives.tsx"), "utf8")
      expect(upgraded).toContain("MOTION_PRIMITIVES")
    })
  })

  it("should resolve components requiring semantic-icon when styleEngine is uniwind and iconLibrary is omitted", async () => {
    const lvcnConfig = {
      $schema: "https://lovdacn.vercel.app/schema.json",
      style: "mira",
      styleEngine: "uniwind",
      tsx: true,
      aliases: {
        components: "@/components",
        utils: "@/lib/utils",
        ui: "@/components/ui",
      },
      components: [],
    }
    await writeFile(path.join(tempCwd, "lvcn.json"), JSON.stringify(lvcnConfig, null, 2), "utf8")

    await runAdd({
      components: ["accordion"],
      cwd: tempCwd,
      yes: true,
      overwrite: false,
    })

    expect(fs.existsSync(path.join(tempCwd, "components/ui/accordion.tsx"))).toBe(true)
    expect(fs.existsSync(path.join(tempCwd, "components/ui/semantic-icon.tsx"))).toBe(true)
  })
})
