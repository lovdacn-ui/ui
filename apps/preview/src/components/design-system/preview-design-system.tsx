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

type LoadedResources = {
  key: string;
  fontFaces: LoadedFontFaces;
  iconAdapter: IconAdapter;
  warnings: string[];
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
  const { config } = normalization;
  const resourceKey = `${config.font}:${config.iconLibrary}`;
  const [resources, setResources] = React.useState<LoadedResources | null>(null);

  React.useLayoutEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      applyPreviewTheme(preset, colorScheme, { cssColorValues });
    }
  }, [colorScheme, cssColorValues, preset]);

  React.useEffect(() => {
    let active = true;
    Promise.all([
      loadPreviewFont(config.font),
      ICON_LOADERS[config.iconLibrary](),
    ])
      .then(([fontFaces, iconAdapter]) => {
        if (!active) return;
        setResources({ key: resourceKey, fontFaces, iconAdapter, warnings: [] });
      })
      .catch((error: unknown) => {
        if (!active) return;
        const message = error instanceof Error ? error.message : String(error);
        setResources({
          key: resourceKey,
          fontFaces: {
            regular: 'System',
            medium: 'System',
            semibold: 'System',
            bold: 'System',
          },
          iconAdapter: lucideIconAdapter,
          warnings: [`Design-system resource failed to load: ${message}`],
        });
      });
    return () => {
      active = false;
    };
  }, [config.font, config.iconLibrary, resourceKey]);

  const readyResources = resources?.key === resourceKey ? resources : null;
  const warnings = React.useMemo(
    () => [...normalization.warnings, ...(readyResources?.warnings ?? [])],
    [normalization.warnings, readyResources?.warnings]
  );

  React.useEffect(() => {
    if (!readyResources) return;
    const frame =
      Platform.OS === 'web' && typeof window !== 'undefined'
        ? window.requestAnimationFrame(() => onApplied({ config, warnings }))
        : null;
    if (frame === null) onApplied({ config, warnings });
    return () => {
      if (frame !== null && typeof window !== 'undefined') {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [colorScheme, config, onApplied, preset, readyResources, revision, warnings]);

  const value = React.useMemo<PreviewDesignSystemValue | null>(
    () =>
      readyResources
        ? {
            config,
            recipe: CUSTOMIZER_RECIPES[config.style],
            fontFaces: readyResources.fontFaces,
            iconAdapter: readyResources.iconAdapter,
            warnings,
          }
        : null,
    [config, readyResources, warnings]
  );

  if (!value) {
    return (
      <View
        className="flex-1 w-full bg-background"
        style={Platform.OS === 'web' ? ({ minHeight: '100vh' } as any) : undefined}
      />
    );
  }

  return (
    <PreviewDesignSystemContext.Provider value={value}>
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
