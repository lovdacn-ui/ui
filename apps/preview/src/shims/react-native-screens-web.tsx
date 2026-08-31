import * as React from "react";

/** FullWindowOverlay is iOS-only; web portals render correctly with a fragment. */
export function FullWindowOverlay({ children }: React.PropsWithChildren) {
  return <>{children}</>;
}
