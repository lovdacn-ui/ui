/**
 * Node module-resolution/load hooks for the motion engine tests.
 *
 * Why this exists: `apps/preview` has no test runner and Agent 1 is prohibited from
 * installing dependencies or editing shared test configuration. These hooks make the
 * built-in `node:test` runner able to import the real `motion.tsx` / adapter sources by:
 *
 *  1. transpiling `.ts` / `.tsx` with the Babel copy that is ALREADY installed in the
 *     workspace (`@babel/core` + `@babel/preset-typescript` + `@babel/plugin-transform-react-jsx`),
 *  2. mapping the `@/*` and `@preview/*` path aliases to `apps/preview/src/*`,
 *  3. mapping `react-native`, `react-native-reanimated`, `nativewind` and the two
 *     rn-primitives packages used by the semantic adapters to local test stubs.
 *
 * No dependency is added and no shared config is touched.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createRequire, registerHooks } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PREVIEW_ROOT = path.resolve(HERE, '..', '..', '..'); // apps/preview
const SRC_ROOT = path.join(PREVIEW_ROOT, 'src');
const REPO_ROOT = path.resolve(PREVIEW_ROOT, '..', '..'); // lvcn
const PNPM_STORE = path.join(REPO_ROOT, 'node_modules', '.pnpm');

const require_ = createRequire(import.meta.url);

/** Resolve a package that only exists inside the pnpm content-addressed store. */
function storePackage(dirPrefix, packageName) {
  const entries = readdirSync(PNPM_STORE);
  const match = entries.find((entry) => entry.startsWith(dirPrefix));
  if (!match) {
    throw new Error(
      `[motion-tests] Could not find "${dirPrefix}*" in ${PNPM_STORE}. ` +
        'The harness only uses packages that are already installed.'
    );
  }
  return path.join(PNPM_STORE, match, 'node_modules', packageName);
}

const babel = require_(storePackage('@babel+core@', '@babel/core'));
const PRESET_TYPESCRIPT = storePackage('@babel+preset-typescript@', '@babel/preset-typescript');
const PLUGIN_JSX = storePackage('@babel+plugin-transform-react-jsx@', '@babel/plugin-transform-react-jsx');

const STUBS = path.join(HERE, 'stubs');

/** Bare specifier → stub module. */
const MODULE_ALIASES = new Map([
  ['react-native', path.join(STUBS, 'react-native.mjs')],
  ['react-native-reanimated', path.join(STUBS, 'reanimated.mjs')],
  ['nativewind', path.join(STUBS, 'nativewind.mjs')],
  ['@rn-primitives/slot', path.join(STUBS, 'slot.mjs')],
  ['@rn-primitives/radio-group', path.join(STUBS, 'radio-group.mjs')],
  ['@rn-primitives/collapsible', path.join(STUBS, 'collapsible.mjs')],
  ['lucide-react-native', path.join(STUBS, 'lucide.mjs')],
]);

const SOURCE_EXTENSIONS = ['.tsx', '.ts', '.mjs', '.js'];

/** Turn `@/components/ui/motion` or `@preview/components/ui/motion` into an existing file under `src/`. */
function resolveAliasPath(specifier) {
  const prefix = specifier.startsWith('@preview/') ? '@preview/' : '@/';
  const relative = specifier.slice(prefix.length);
  const base = path.join(SRC_ROOT, relative);
  for (const extension of SOURCE_EXTENSIONS) {
    const candidate = base + extension;
    try {
      readFileSync(candidate);
      return candidate;
    } catch {
      /* try the next extension */
    }
  }
  for (const extension of SOURCE_EXTENSIONS) {
    const candidate = path.join(base, 'index' + extension);
    try {
      readFileSync(candidate);
      return candidate;
    } catch {
      /* try the next extension */
    }
  }
  throw new Error(`[motion-tests] Cannot resolve alias "${specifier}" under ${SRC_ROOT}`);
}

/**
 * Extension-less relative imports. Our TypeScript sources use them, and some published ESM
 * builds (`@rn-primitives/*`) rely on bundler resolution too.
 */
function resolveRelativeSource(specifier, parentURL) {
  const parentPath = fileURLToPath(stripQuery(parentURL));
  const base = path.resolve(path.dirname(parentPath), specifier);
  if (path.extname(base)) return null; // let Node handle explicit extensions
  for (const extension of SOURCE_EXTENSIONS) {
    const candidate = base + extension;
    if (existsSync(candidate)) return candidate;
  }
  for (const extension of SOURCE_EXTENSIONS) {
    const candidate = path.join(base, 'index' + extension);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function stripQuery(url) {
  const index = url.indexOf('?');
  return index === -1 ? url : url.slice(0, index);
}

function resolve(specifier, context, nextResolve) {
  const aliased = MODULE_ALIASES.get(specifier);
  if (aliased) {
    return { url: pathToFileURL(aliased).href, format: 'module', shortCircuit: true };
  }

  if (specifier.startsWith('@/') || specifier.startsWith('@preview/')) {
    return {
      url: pathToFileURL(resolveAliasPath(specifier)).href,
      format: 'module',
      shortCircuit: true,
    };
  }

  // Extension-less relative imports are resolved for every parent, but the format is left to
  // Node so third-party CommonJS (Babel's own dependency graph) is still classified correctly.
  if (
    (specifier.startsWith('./') || specifier.startsWith('../')) &&
    context.parentURL &&
    context.parentURL.startsWith('file:')
  ) {
    const resolved = resolveRelativeSource(specifier, context.parentURL);
    if (resolved) {
      return { url: pathToFileURL(resolved).href, shortCircuit: true };
    }
  }

  return nextResolve(specifier, context);
}

function load(url, context, nextLoad) {
  const clean = stripQuery(url);
  // `@rn-primitives/*` publishes ESM that still contains JSX, so it needs the same transform.
  const isSource = /\.tsx?$/.test(clean);
  const isUntranspiledPackage = clean.includes('/@rn-primitives/') && clean.endsWith('.mjs');
  if (!clean.startsWith('file:') || !(isSource || isUntranspiledPackage)) {
    return nextLoad(url, context);
  }

  const filename = fileURLToPath(clean);
  const input = readFileSync(filename, 'utf8');
  const result = babel.transformSync(input, {
    filename,
    babelrc: false,
    configFile: false,
    sourceType: 'module',
    presets: [[PRESET_TYPESCRIPT, { isTSX: true, allExtensions: true, onlyRemoveTypeImports: false }]],
    plugins: [[PLUGIN_JSX, { runtime: 'automatic' }]],
  });

  return { format: 'module', source: result.code, shortCircuit: true };
}

registerHooks({ resolve, load });
