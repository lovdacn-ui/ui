"use client";

import * as React from "react";
import { PortalHost } from "@rn-primitives/portal";
import { cssInterop } from "nativewind";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { PreviewRenderer } from "@preview/components/preview-renderer";
import {
  MotionPressable,
  MotionText,
  MotionTextInput,
  MotionView,
} from "@preview/components/ui/motion";

cssInterop(MotionPressable, { className: "style" });
cssInterop(MotionText, { className: "style" });
cssInterop(MotionTextInput, { className: "style" });
cssInterop(MotionView, { className: "style" });

export type InlineComponentPreviewProps = {
  component: string;
};

/** Inline React Native Web preview used by the Next documentation app. */
export function InlineComponentPreview({
  component,
}: InlineComponentPreviewProps) {
  return <InlinePreviewSession key={component} initialComponent={component} />;
}

function InlinePreviewSession({
  initialComponent,
}: {
  initialComponent: string;
}) {
  const [activeComponent, setActiveComponent] =
    React.useState(initialComponent);

  return (
    <GestureHandlerRootView style={{ flex: 1, width: "100%", height: "100%" }}>
      <PreviewRenderer
        component={activeComponent}
        chrome="web"
        contained
        onNavigate={setActiveComponent}
      />
      <PortalHost />
    </GestureHandlerRootView>
  );
}
