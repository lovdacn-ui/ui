"use client";

import * as React from "react";

const PreviewNavigationContext = React.createContext<
  (component: string) => void
>(() => {});

export function PreviewNavigationProvider({
  children,
  onNavigate,
}: {
  children: React.ReactNode;
  onNavigate?: (component: string) => void;
}) {
  return (
    <PreviewNavigationContext.Provider value={onNavigate ?? (() => {})}>
      {children}
    </PreviewNavigationContext.Provider>
  );
}

export function usePreviewNavigation() {
  return React.useContext(PreviewNavigationContext);
}
