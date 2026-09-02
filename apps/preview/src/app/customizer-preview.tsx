import * as React from 'react';
import { Platform, View } from 'react-native';

import {
  PreviewDesignSystemProvider,
} from '@preview/components/design-system/preview-design-system';
import { CustomizerDashboard } from '@preview/components/previews/customizer-dashboard';
import {
  createPreviewChild,
  getReferrerOrigin,
  type PreviewChild,
} from '@preview/lib/preview-protocol';
import type { PreviewColorScheme } from '@preview/lib/preview-theme';

type PreviewDesign = {
  preset?: string;
  colorScheme: PreviewColorScheme;
  revision: number;
};

const PREVIEW_STAGE_LIGHT = '#f6f6f7';
const PREVIEW_STAGE_DARK = '#09090b';

function getPreviewStageColor(colorScheme: PreviewColorScheme) {
  return colorScheme === 'dark' ? PREVIEW_STAGE_DARK : PREVIEW_STAGE_LIGHT;
}

function readInitialDesign(): PreviewDesign {
  if (typeof window === 'undefined') {
    return { colorScheme: 'light', revision: 0 };
  }

  const params = new URLSearchParams(window.location.search);
  const requestedScheme = params.get('colorScheme');
  return {
    preset: params.get('preset') ?? undefined,
    colorScheme:
      requestedScheme === 'dark' || requestedScheme === 'light'
        ? requestedScheme
        : 'light',
    revision: 0,
  };
}

function usePreviewColorSchemeLock(colorScheme: PreviewColorScheme) {
  React.useLayoutEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    const root = document.documentElement;
    const shouldBeDark = colorScheme === 'dark';
    const applyScheme = () => {
      if (root.classList.contains('dark') !== shouldBeDark) {
        root.classList.toggle('dark', shouldBeDark);
      }
      if (root.style.getPropertyValue('color-scheme') !== colorScheme) {
        root.style.setProperty('color-scheme', colorScheme);
      }
    };

    // The preview route inherits the site's root next-themes provider. Keep a
    // later storage/system update from changing dark: variants inside this
    // document after the selected preview scheme has been applied.
    applyScheme();
    if (typeof window.MutationObserver !== 'function') return;

    const observer = new window.MutationObserver(applyScheme);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ['class', 'style'],
    });
    return () => observer.disconnect();
  }, [colorScheme]);
}

export default function CustomizerPreviewPage({
  cssColorValues = false,
}: {
  cssColorValues?: boolean;
} = {}) {
  const [design, setDesign] = React.useState<PreviewDesign>(readInitialDesign);
  const childRef = React.useRef<PreviewChild | null>(null);
  usePreviewColorSchemeLock(design.colorScheme);

  // Session handshake with the customizer host. Readiness is answered as often as
  // it is requested, so a dropped message costs one retry interval instead of a
  // permanently transparent frame.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const child = createPreviewChild({
      subscribe: (listener) => {
        const onMessage = (event: MessageEvent) => listener(event);
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
      },
      getParent: () => (window.parent && window.parent !== window ? window.parent : null),
      initialParentOrigin: getReferrerOrigin(
        typeof document === 'undefined' ? null : document.referrer
      ),
      onPreset: (message) => {
        setDesign({
          preset: message.preset,
          colorScheme: message.colorScheme,
          // The host's revision is authoritative: it is what the host matches the
          // `lvcn:applied` echo against before revealing the frame.
          revision: message.revision,
        });
      },
    });

    childRef.current = child;
    child.start();
    return () => {
      child.destroy();
      if (childRef.current === child) childRef.current = null;
    };
  }, []);

  const handleApplied = React.useCallback(() => {
    if (typeof window === 'undefined') return;
    // Keep these three values exact: the host reveals the frame only on a raw
    // match of revision, preset, and color scheme for the current session.
    childRef.current?.postApplied({
      revision: design.revision,
      colorScheme: design.colorScheme,
      preset: design.preset,
    });
  }, [design]);

  return (
    <PreviewDesignSystemProvider
      preset={design.preset}
      colorScheme={design.colorScheme}
      revision={design.revision}
      onApplied={handleApplied}
      cssColorValues={cssColorValues}
    >
      <View
        className="lvcn-create-preview-stage flex-1 w-full"
        style={
          Platform.OS === 'web'
            ? ({ height: '100vh', backgroundColor: getPreviewStageColor(design.colorScheme) } as any)
            : { backgroundColor: getPreviewStageColor(design.colorScheme) }
        }
      >
        <CustomizerDashboard topPad={24} />
      </View>
    </PreviewDesignSystemProvider>
  );
}
