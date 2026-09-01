import * as React from 'react';
import { Platform, View } from 'react-native';

import { loadPreviewFont, type LoadedFontFaces } from './generated-font-loader';
import { lucideIconAdapter } from './icons/lucide';
import type { IconAdapter } from './semantic-icon-types';
import {
  DEFAULT_PRESET_CONFIG,
  decodePresetWithWarnings,
  type PresetConfig,
  type PresetNormalization,
} from '@preview/lib/generated/preset-catalog';
import {
  CUSTOMIZER_RECIPES,
  type CustomizerRecipe,
} from '@preview/lib/generated/customizer-recipes';
import {
  applyPreviewTheme,
  type PreviewColorScheme,
} from '@preview/lib/preview-theme';

const ICON_LOADERS = {
  lucide: async () => lucideIconAdapter,
  phosphor: async () => (await import('./icons/phosphor')).phosphorIconAdapter,
  tabler: async () => (await import('./icons/tabler')).tablerIconAdapter,
  expo: async () => (await import('./icons/expo')).expoIconAdapter,
  heroicons: async () => (await import('./icons/heroicons')).heroiconsIconAdapter,
} as const;

type PreviewDesignSystemValue = {
  config: PresetConfig;
  recipe: CustomizerRecipe;
  fontFaces: LoadedFontFaces;
  iconAdapter: IconAdapter;
  warnings: readonly string[];
};

type AppliedDesignSystem = Pick<PreviewDesignSystemValue, 'config' | 'warnings'>;

type PreviewDesignSystemProviderProps = {
  preset?: string;
  colorScheme: PreviewColorScheme;
  revision: number;
  onApplied: (result: AppliedDesignSystem) => void;
  children: React.ReactNode;
  cssColorValues?: boolean;
};

type ActiveDesignSystem = PreviewDesignSystemValue & {
  resourceKey: string;
  preset?: string;
  colorScheme: PreviewColorScheme;
  revision: number;
};

const PreviewDesignSystemContext = React.createContext<PreviewDesignSystemValue | null>(null);

function normalizeDesign(preset: string | undefined): PresetNormalization {
  if (!preset) return { config: DEFAULT_PRESET_CONFIG, warnings: [] };
  return (
    decodePresetWithWarnings(preset) ?? {
      config: DEFAULT_PRESET_CONFIG,
      warnings: [`Invalid preset "${preset}"; using the Vega default`],
    }
  );
}

export function PreviewDesignSystemProvider({
  preset,
  colorScheme,
  revision,
  onApplied,
  children,
  cssColorValues = false,
}: PreviewDesignSystemProviderProps) {
  const normalization = React.useMemo(() => normalizeDesign(preset), [preset]);
  const { config, warnings: normalizationWarnings } = normalization;
  const resourceKey = `${config.font}:${config.iconLibrary}`;
  const [activeDesign, setActiveDesign] = React.useState<ActiveDesignSystem | null>(null);

  // Build the next design off-screen. Crucially, activeDesign is not cleared here:
  // the last complete dashboard stays mounted while a new font or icon bundle is
  // loading, so rapid picker changes and shuffle never expose an empty frame.
  React.useEffect(() => {
    let active = true;

    Promise.all([
      loadPreviewFont(config.font),
      ICON_LOADERS[config.iconLibrary](),
    ])
      .then(([fontFaces, iconAdapter]) => {
        if (!active) return;
        setActiveDesign({
          resourceKey,
          preset,
          colorScheme,
          revision,
          config,
          recipe: CUSTOMIZER_RECIPES[config.style],
          fontFaces,
          iconAdapter,
          warnings: [...normalizationWarnings],
        });
      })
      .catch((error: unknown) => {
        if (!active) return;
        const message = error instanceof Error ? error.message : String(error);
        setActiveDesign({
          resourceKey,
          preset,
          colorScheme,
          revision,
          config,
          recipe: CUSTOMIZER_RECIPES[config.style],
          fontFaces: {
            regular: 'System',
            medium: 'System',
            semibold: 'System',
            bold: 'System',
          },
          iconAdapter: lucideIconAdapter,
          warnings: [
            ...normalizationWarnings,
            `Design-system resource failed to load: ${message}`,
          ],
        });
      });

    return () => {
      active = false;
    };
  }, [colorScheme, config, normalizationWarnings, preset, resourceKey, revision]);

  // Theme variables and the matching context value are committed in one render.
  // useLayoutEffect runs before paint, preventing a one-frame old/new theme mix.
  React.useLayoutEffect(() => {
    if (!activeDesign) return;
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      applyPreviewTheme(activeDesign.preset, activeDesign.colorScheme, { cssColorValues });
    }
  }, [activeDesign, cssColorValues]);

  React.useEffect(() => {
    if (
      !activeDesign ||
      activeDesign.revision !== revision ||
      activeDesign.preset !== preset ||
      activeDesign.colorScheme !== colorScheme
    ) {
      return;
    }

    const result = {
      config: activeDesign.config,
      warnings: activeDesign.warnings,
    };
    const frame =
      Platform.OS === 'web' && typeof window !== 'undefined'
        ? window.requestAnimationFrame(() => onApplied(result))
        : null;
    if (frame === null) onApplied(result);
    return () => {
      if (frame !== null && typeof window !== 'undefined') {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [activeDesign, colorScheme, onApplied, preset, revision]);

  if (!activeDesign) {
    return (
      <View
        className="flex-1 w-full bg-background"
        style={Platform.OS === 'web' ? ({ minHeight: '100vh' } as any) : undefined}
      />
    );
  }

  return (
    <PreviewDesignSystemContext.Provider value={activeDesign}>
      {children}
    </PreviewDesignSystemContext.Provider>
  );
}

export function usePreviewDesignSystem() {
  const value = React.useContext(PreviewDesignSystemContext);
  if (!value) throw new Error('usePreviewDesignSystem must be used inside PreviewDesignSystemProvider');
  return value;
}

export function getFontFace(className: string | undefined, faces: LoadedFontFaces) {
  if (className?.includes('font-bold')) return faces.bold;
  if (className?.includes('font-semibold')) return faces.semibold;
  if (className?.includes('font-medium')) return faces.medium;
  return faces.regular;
}
