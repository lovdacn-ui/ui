"use client";

import * as React from "react";
import dynamic from "next/dynamic";

import { cn } from "@/lib/utils";

function PreviewLoadingState() {
  return (
    <div
      className="flex size-full items-center justify-center text-sm text-muted-foreground"
      role="status"
    >
      Loading preview…
    </div>
  );
}

const InlineComponentPreview = dynamic(
  () =>
    import("@lvcn/preview/inline-preview").then(
      (module) => module.InlineComponentPreview,
    ),
  {
    ssr: false,
    loading: PreviewLoadingState,
  },
);

/** Live docs preview rendered inline through React Native Web. */
export function ComponentPreviewCard({
  children,
  className,
  title,
  name,
}: {
  children?: React.ReactNode;
  className?: string;
  title?: string;
  name?: string;
}) {
  const componentName = name ?? title?.toLowerCase().replace(/ /g, "-");
  const hasTallBlockPreview = [
    "login-03",
    "login-04",
    "signup-02",
    "signup-03",
  ].includes(componentName ?? "");

  return (
    <div
      className={cn(
        "my-6 overflow-hidden rounded-xl border border-border bg-background shadow-sm",
        className,
      )}
    >
      <div
        className={cn(
          "relative flex w-full items-center justify-center bg-muted/5",
          hasTallBlockPreview ? "min-h-[760px]" : "aspect-video min-h-[450px]",
        )}
      >
        {componentName ? (
          <div
            className="absolute inset-0"
            data-docs-component-preview="true"
            data-preview-inline="true"
            role="region"
            aria-label={`${title ?? componentName} live preview`}
          >
            <InlineComponentPreview component={componentName} />
          </div>
        ) : (
          (children ?? (
            <div className="flex flex-col items-center gap-2 p-8 text-center">
              <div className="rounded-lg border border-dashed border-border bg-muted/40 px-6 py-4 text-sm text-muted-foreground">
                No preview available
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
