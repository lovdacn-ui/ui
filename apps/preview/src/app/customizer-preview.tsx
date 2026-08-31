import * as React from 'react';
import { Platform, View, useColorScheme } from 'react-native';

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

function readInitialDesign(systemColorScheme: string | null | undefined): PreviewDesign {
  const fallbackScheme: PreviewColorScheme = systemColorScheme === 'dark' ? 'dark' : 'light';
  if (typeof window === 'undefined') {
    return { colorScheme: fallbackScheme, revision: 0 };
  }

  const params = new URLSearchParams(window.location.search);
  const requestedScheme = params.get('colorScheme');
  return {
    preset: params.get('preset') ?? undefined,
    colorScheme:
      requestedScheme === 'dark' || requestedScheme === 'light'
        ? requestedScheme
        : fallbackScheme,
    revision: 0,
  };
}

export default function CustomizerPreviewPage({
  cssColorValues = false,
}: {
  cssColorValues?: boolean;
} = {}) {
  const systemColorScheme = useColorScheme();
  const [design, setDesign] = React.useState<PreviewDesign>(() =>
    readInitialDesign(systemColorScheme)
  );
  const childRef = React.useRef<PreviewChild | null>(null);

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
        className="flex-1 w-full bg-background"
        style={Platform.OS === 'web' ? ({ height: '100vh' } as any) : undefined}
      >
        <CustomizerDashboard topPad={24} />
      </View>
    </PreviewDesignSystemProvider>
  );
}
