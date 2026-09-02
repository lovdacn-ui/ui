import type { NextConfig } from "next";
import { createMDX } from "fumadocs-mdx/next";

const resolveExtensions = [
  ".web.tsx",
  ".web.ts",
  ".web.jsx",
  ".web.js",
  ".tsx",
  ".ts",
  ".jsx",
  ".js",
  ".mjs",
  ".json",
];

const reactNativeWebAliases = {
  "react-native": "react-native-web",
  "react-native-screens": "@lvcn/preview/react-native-screens-web",
  "expo-font": "@lvcn/preview/expo-font-web",
  "react-native/Libraries/EventEmitter/RCTDeviceEventEmitter":
    "react-native-web/dist/vendor/react-native/EventEmitter/RCTDeviceEventEmitter",
  "react-native/Libraries/vendor/emitter/EventEmitter":
    "react-native-web/dist/vendor/react-native/vendor/emitter/EventEmitter",
  "react-native/Libraries/EventEmitter/NativeEventEmitter":
    "react-native-web/dist/vendor/react-native/EventEmitter/NativeEventEmitter",
};

const config: NextConfig = {
  reactStrictMode: true,
  compiler: {
    define: {
      __DEV__: process.env.NODE_ENV !== "production",
    },
  },
  transpilePackages: [
    "@lvcn/preview",
    "@expo/vector-icons",
    "@rn-primitives/accordion",
    "@rn-primitives/alert-dialog",
    "@rn-primitives/aspect-ratio",
    "@rn-primitives/avatar",
    "@rn-primitives/checkbox",
    "@rn-primitives/collapsible",
    "@rn-primitives/context-menu",
    "@rn-primitives/dialog",
    "@rn-primitives/dropdown-menu",
    "@rn-primitives/hover-card",
    "@rn-primitives/label",
    "@rn-primitives/menubar",
    "@rn-primitives/popover",
    "@rn-primitives/portal",
    "@rn-primitives/progress",
    "@rn-primitives/radio-group",
    "@rn-primitives/select",
    "@rn-primitives/separator",
    "@rn-primitives/slot",
    "@rn-primitives/switch",
    "@rn-primitives/tabs",
    "@rn-primitives/toggle",
    "@rn-primitives/toggle-group",
    "@rn-primitives/tooltip",
    "nativewind",
    "react-native",
    "react-native-css-interop",
    "react-native-gesture-handler",
    "react-native-reanimated",
    "react-native-remix-icon",
    "react-native-safe-area-context",
    "react-native-svg",
    "react-native-web",
    "react-native-worklets",
  ],
  turbopack: {
    resolveAlias: reactNativeWebAliases,
    resolveExtensions,
    rules: {
      "*.ttf": {
        type: "asset",
      },
    },
  },
  webpack(webpackConfig) {
    webpackConfig.resolve.alias = {
      ...webpackConfig.resolve.alias,
      "react-native$": "react-native-web",
      "react-native-screens$": reactNativeWebAliases["react-native-screens"],
      "expo-font$": reactNativeWebAliases["expo-font"],
      "react-native/Libraries/EventEmitter/RCTDeviceEventEmitter$":
        reactNativeWebAliases[
          "react-native/Libraries/EventEmitter/RCTDeviceEventEmitter"
        ],
      "react-native/Libraries/vendor/emitter/EventEmitter$":
        reactNativeWebAliases[
          "react-native/Libraries/vendor/emitter/EventEmitter"
        ],
      "react-native/Libraries/EventEmitter/NativeEventEmitter$":
        reactNativeWebAliases[
          "react-native/Libraries/EventEmitter/NativeEventEmitter"
        ],
    };
    webpackConfig.resolve.extensions = [
      ...resolveExtensions,
      ...(webpackConfig.resolve.extensions ?? []).filter(
        (extension: string) => !resolveExtensions.includes(extension),
      ),
    ];
    webpackConfig.module.rules.push({
      test: /\.ttf$/i,
      type: "asset/resource",
    });
    return webpackConfig;
  },
};

const withMDX = createMDX({
  configPath: "source.config.ts",
});

export default withMDX(config);
