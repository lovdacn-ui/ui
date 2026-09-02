/**
 * build-extra-components.cjs
 *
 * Emits UI components that are NOT part of the main `build-registry.cjs`
 * per-file style-injection allow-list into the per-style/engine registry
 * (`r/styles/<engine>/<style>/<name>.json`).
 *
 * WHY A DEDICATED SCRIPT:
 * `build-registry.cjs` inlines each style's classes into `cn-*` marker slots that
 * it injects for a hardcoded set of components (button, badge, input, …). The
 * components below use only semantic tokens + layout classes (no per-style
 * overrides) and are not in that allow-list, so their output reduces to
 * `normalizeContent(source)` — identical across every style and engine. This
 * script produces exactly that output additively, without touching (or
 * `emptyDirSync`-ing) the other component JSON files. A full `registry:build`
 * emits identical output because the sources now live in
 * react-native-reusables/.../<engine>/components/ui/<name>.tsx.
 *
 * Output: r/styles/<engine>/<style>/<name>.json
 */

const fs = require("fs-extra");
const path = require("path");
const registryChannel = require("./lib/registry-channel.cjs");

const WORKSPACE_ROOT = path.resolve(__dirname, "../../../../");
// Canonical in-repo registry source (Phase 0) — was a non-existent sibling checkout.
const REUSABLES_SRC = path.join(
  WORKSPACE_ROOT,
  "lvcn/packages/lovdacn/registry-src",
);
const PREVIEW_SRC = path.join(
  WORKSPACE_ROOT,
  "lvcn/apps/preview/src/components/ui",
);
// Canonical in-repo source for style-agnostic files that are NOT part of the preview app
// (e.g. the PLAIN primitives variant, which the preview never uses because the preview
// always has motion installed).
const REGISTRY_SRC = path.join(
  WORKSPACE_ROOT,
  "lvcn/packages/lovdacn/registry-src/shared",
);
const DEST_REGISTRY = path.join(registryChannel.registryRoot(), "styles");
const SCHEMA = "https://lovdacn.vercel.app/schema/registry-item.json";

const DESIGN_ROOT = path.join(__dirname, "../design-system");
const DESIGN_CATALOG = fs.readJsonSync(path.join(DESIGN_ROOT, "catalog.json"));
const DESIGN_ALIASES = fs.readJsonSync(path.join(DESIGN_ROOT, "aliases.json"));
const STYLES = [
  ...DESIGN_CATALOG.styles.map(({ name }) => name),
  ...Object.keys(DESIGN_ALIASES.styles),
];
const ENGINES = DESIGN_CATALOG.engines;

/** Components emitted by this script, with their declared dependencies. */
const COMPONENTS = [
  {
    name: "sidebar",
    dependencies: ["class-variance-authority", "lucide-react-native"],
    registryDependencies: [
      "icon",
      "primitives",
      "separator",
      "skeleton",
      "text",
      "utils",
    ],
  },
  {
    name: "breadcrumb",
    dependencies: ["@rn-primitives/slot", "lucide-react-native"],
    registryDependencies: ["icon", "primitives", "text", "utils"],
  },
  {
    name: "input-otp",
    dependencies: [],
    registryDependencies: ["primitives", "text", "utils"],
  },
  {
    name: "bottom-sheet",
    dependencies: [
      "@rn-primitives/dialog",
      "react-native-reanimated",
      "react-native-screens",
      "lucide-react-native",
    ],
    registryDependencies: [
      "icon",
      "primitives",
      "text",
      "utils",
      "native-only-animated-view",
    ],
  },
  {
    name: "sheet",
    dependencies: [
      "@rn-primitives/dialog",
      "react-native-reanimated",
      "react-native-screens",
      "lucide-react-native",
    ],
    registryDependencies: [
      "icon",
      "primitives",
      "text",
      "utils",
      "native-only-animated-view",
    ],
  },
  {
    name: "sonner",
    dependencies: [
      "@rn-primitives/portal",
      "react-native-reanimated",
      "react-native-safe-area-context",
      "lucide-react-native",
    ],
    registryDependencies: ["icon", "primitives", "utils"],
  },
  {
    name: "spinner",
    dependencies: ["react-native-reanimated", "lucide-react-native"],
    registryDependencies: ["primitives", "utils"],
  },
  {
    name: "calendar",
    dependencies: ["lucide-react-native"],
    registryDependencies: ["icon", "primitives", "select", "utils"],
  },
  {
    name: "carousel",
    dependencies: ["lucide-react-native"],
    registryDependencies: ["icon", "primitives", "utils"],
  },
  {
    // motion — shared animation engine. [BETA]
    // Ships TWO files: the engine, plus the MOTION-AWARE `primitives.tsx` that
    // overwrites the plain seam. Because every component renders its hosts from
    // `primitives`, swapping that one file upgrades the whole library at once.
    // registryDependencies is only `utils` to avoid dependency cycles.
    name: "motion",
    dependencies: ["react-native-reanimated", "react-native-worklets"],
    registryDependencies: ["utils"],
    files: ["components/ui/motion.tsx", "components/ui/primitives.tsx"],
  },
  {
    // primitives — PLAIN host indirection layer (the default seam).
    // Infrastructure item, like `utils`: a registryDependency of components, not a
    // showcase component. No npm dependencies — it renders raw React Native hosts and
    // discards the animation props, so apps that never add motion ship no Reanimated.
    name: "primitives",
    dependencies: [],
    registryDependencies: [],
    files: [
      {
        path: "components/ui/primitives.tsx",
        src: path.join(REGISTRY_SRC, "components/ui/primitives.tsx"),
      },
    ],
  },
];

/** Mirror build-registry's normalizeContent: strip monorepo registry prefixes. */
function normalizeContent(content) {
  return content
    .replace(/@preview\//g, "@/")
    .replace(/@\/registry\/(?:nativewind|uniwind)\//g, "@/")
    .replace(
      /from ['"]lucide-react-native['"]/g,
      "from '@/components/ui/semantic-icon'",
    )
    .replace(/\r\n/g, "\n");
}

/**
 * Resolve the file descriptors for a component entry.
 * - no `files`           → single `components/ui/<name>.tsx`
 * - `files: [string]`    → registry paths resolved from the engine/preview sources
 * - `files: [{path,src}]`→ explicit source path (canonical in-repo source)
 */
function resolveFiles(comp, engine) {
  const descriptors = comp.files ?? [`components/ui/${comp.name}.tsx`];

  return descriptors.map((descriptor) => {
    if (typeof descriptor !== "string") {
      return { path: descriptor.path, srcPath: descriptor.src };
    }

    const basename = path.basename(descriptor);
    // Prefer the (optional) sibling reusables source, then the local preview app.
    const candidates = [
      path.join(REUSABLES_SRC, engine, "components/ui", basename),
      path.join(PREVIEW_SRC, basename),
    ];
    const srcPath =
      candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
    return { path: descriptor, srcPath };
  });
}

function createRegistryItem(comp, engine, style) {
  const fileDescriptors = resolveFiles(comp, engine);
  const missing = fileDescriptors.filter(
    (file) => !fs.existsSync(file.srcPath),
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing ${comp.name} source: ${missing.map((file) => file.srcPath).join(", ")}`,
    );
  }

  const files = fileDescriptors.map((file) => ({
    path: file.path,
    content: normalizeContent(fs.readFileSync(file.srcPath, "utf8")),
    type: "registry:ui",
  }));

  const usesSemanticIcons = files.some((file) =>
    file.content.includes("@/components/ui/semantic-icon"),
  );
  const dependencies = comp.dependencies.filter(
    (dependency) => dependency !== "lucide-react-native",
  );
  const registryDependencies = usesSemanticIcons
    ? [...new Set(["semantic-icon", ...comp.registryDependencies])]
    : comp.registryDependencies;

  return {
    $schema: SCHEMA,
    name: comp.name,
    dependencies,
    registryDependencies,
    files,
    meta: {
      engine,
      style,
      legacy: Object.prototype.hasOwnProperty.call(
        DESIGN_ALIASES.styles,
        style,
      ),
    },
    type: "registry:ui",
  };
}

function buildExtraComponents() {
  let written = 0;
  const isBeta = registryChannel.resolveChannel() === 'beta';
  const componentsToBuild = isBeta
    ? COMPONENTS
    : COMPONENTS.filter((c) => c.name !== 'motion');

  for (const engine of ENGINES) {
    for (const comp of componentsToBuild) {
      for (const style of STYLES) {
        let item;
        try {
          item = createRegistryItem(comp, engine, style);
        } catch (error) {
          console.warn(`⚠  ${error.message}`);
          break;
        }

        const destDir = path.join(DEST_REGISTRY, engine, style);
        fs.ensureDirSync(destDir);
        fs.writeJsonSync(path.join(destDir, `${comp.name}.json`), item, {
          spaces: 2,
        });
        written++;
      }
    }
    for (const style of STYLES) {
      const iconSrc = path.join(
        DEST_REGISTRY,
        "../icons",
        engine,
        "lucide/semantic-icon.json",
      );
      if (fs.existsSync(iconSrc)) {
        fs.copySync(
          iconSrc,
          path.join(DEST_REGISTRY, engine, style, "semantic-icon.json"),
        );
      }
    }
  }

  console.log(
    `✔  extra components (${COMPONENTS.map((c) => c.name).join(", ")}): ${written} registry items → ` +
      `${path.relative(WORKSPACE_ROOT, DEST_REGISTRY)}/<engine>/<style>/`,
  );
}

module.exports = {
  buildExtraComponents,
  createRegistryItem,
  normalizeContent,
  resolveFiles,
  COMPONENTS,
  ENGINES,
  STYLES,
};

if (require.main === module) {
  console.log("Building lovda extra component registry...\n");
  buildExtraComponents();
  console.log("\n✔  Extra components built successfully!");
}
