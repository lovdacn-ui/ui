import * as React from "react";
import {
  View,
  ScrollView,
  Pressable,
  useColorScheme,
  Platform,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PortalHost } from "@rn-primitives/portal";
import { useLocalSearchParams, Link, useRouter } from "expo-router";

import { Text } from "@preview/components/ui/text";
import {
  COMPONENT_PREVIEW_NAMES,
  PreviewRenderer,
  hasComponentPreview,
} from "@preview/components/preview-renderer";
import {
  createPreviewChild,
  getReferrerOrigin,
} from "@preview/lib/preview-protocol";
import { FONT_MANIFEST, type PresetFont } from "@preview/lib/generated/preset-catalog";
import { applyPreviewTheme } from "@preview/lib/preview-theme";

// Dynamically load the selected font's web faces from Google Fonts. The single
// managed <link> is reused across changes so shuffling never leaks stale tags.
// Family + weights are read from the generated FONT_MANIFEST so every catalog
// font requests exactly the weights it ships.
function loadCustomizerWebFont(fontKey: PresetFont) {
  if (typeof document === "undefined") return;
  const font = FONT_MANIFEST[fontKey];
  if (!font) return;

  let fontLink = document.getElementById(
    "google-font-customizer",
  ) as HTMLLinkElement | null;
  if (!fontLink) {
    fontLink = document.createElement("link");
    fontLink.id = "google-font-customizer";
    fontLink.rel = "stylesheet";
    document.head.appendChild(fontLink);
  }
  const family = font.family.replace(/ /g, "+");
  const weights = font.availableWeights.join(";");
  fontLink.href = `https://fonts.googleapis.com/css2?family=${family}:wght@${weights}&display=swap`;
}

function PresentPageContent() {
  const params = useLocalSearchParams<{
    component: string;
    preset?: string;
    chrome?: string;
    colorScheme?: "light" | "dark";
  }>();
  const systemColorScheme = useColorScheme();
  const router = useRouter();

  // Resolve initial values synchronously from the URL so the first paint already
  // knows the component + preset (prevents the component-list and unstyled flashes).
  const initial = React.useMemo(() => {
    const sp =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : null;
    return {
      component: sp?.get("component") ?? undefined,
      preset: sp?.get("preset") ?? undefined,
      chrome: sp?.get("chrome") ?? undefined,
      colorScheme:
        (sp?.get("colorScheme") as "light" | "dark" | null) ?? undefined,
    };
  }, []);

  const component = params.component ?? initial.component;
  const chrome = (params.chrome ?? initial.chrome) as string | undefined;

  // Live, updatable style inputs — mutated by postMessage from the parent so
  // shuffling never reloads the iframe.
  const [preset, setPreset] = React.useState<string | undefined>(
    initial.preset ?? params.preset,
  );
  const [activeColorScheme, setActiveColorScheme] = React.useState<
    "light" | "dark"
  >(
    initial.colorScheme ??
      (params.colorScheme as "light" | "dark" | undefined) ??
      (systemColorScheme === "dark" ? "dark" : "light"),
  );
  const [showPicker, setShowPicker] = React.useState(false);

  // Speak the session handshake with the embedding host: answer every
  // `lvcn:ready-request`, retry our own `lvcn:ready` until acknowledged, and
  // apply session-scoped `lvcn:preset` updates without reloading. Also reveal the
  // dev picker only on a top-level window.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.self === window.top) setShowPicker(true);

    const child = createPreviewChild({
      subscribe: (listener) => {
        const onMessage = (event: MessageEvent) => listener(event);
        window.addEventListener("message", onMessage);
        return () => window.removeEventListener("message", onMessage);
      },
      getParent: () =>
        window.parent && window.parent !== window ? window.parent : null,
      initialParentOrigin: getReferrerOrigin(
        typeof document === "undefined" ? null : document.referrer,
      ),
      onPreset: (message) => {
        if (typeof message.preset === "string") setPreset(message.preset);
        setActiveColorScheme(message.colorScheme);
      },
    });

    child.start();
    return () => child.destroy();
  }, []);

  // Apply the decoded preset's canonical theme variables (colors, radius, font)
  // via the shared runtime, then load the matching web font faces. Root
  // dark/colorScheme toggling lives in applyPreviewTheme.
  React.useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const normalization = applyPreviewTheme(preset, activeColorScheme);
    if (!normalization) return;
    loadCustomizerWebFont(normalization.config.font);
  }, [preset, activeColorScheme]);

  if (!component || !hasComponentPreview(component)) {
    // Render a neutral stage by default (also what the static export pre-renders
    // and what embedded iframes get) so the component list never flashes. Only
    // reveal the dev picker on a top-level window.
    if (!showPicker) {
      return (
        <View
          className="flex-1 bg-background w-full"
          style={
            Platform.OS === "web" ? ({ minHeight: "100vh" } as any) : undefined
          }
        />
      );
    }
    return (
      <ScrollView className="flex-1 bg-background p-6">
        <Text variant="h2" className="mb-4">
          Component Presenter
        </Text>
        <Text variant="muted" className="mb-6">
          Select a component to preview:
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {COMPONENT_PREVIEW_NAMES.map((name) => (
            <Link key={name} href={`/present?component=${name}`} asChild>
              <Pressable style={({ pressed }) => pressed && { opacity: 0.7 }}>
                <View className="rounded-lg border border-border bg-card px-4 py-2">
                  <Text>{name}</Text>
                </View>
              </Pressable>
            </Link>
          ))}
        </View>
      </ScrollView>
    );
  }

  return (
    <PreviewRenderer
      component={component}
      chrome={chrome}
      onNavigate={(nextComponent) =>
        router.push(
          `/present?component=${encodeURIComponent(nextComponent)}&chrome=web`,
        )
      }
    />
  );
}

export default function PresentPage() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PresentPageContent />
      <PortalHost />
    </GestureHandlerRootView>
  );
}
