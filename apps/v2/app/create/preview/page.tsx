"use client"

import dynamic from "next/dynamic"

const CustomizerPreview = dynamic(
  () => import("@preview/app/customizer-preview"),
  {
    ssr: false,
    loading: () => <div className="h-dvh w-full bg-background" />,
  }
)

/** Same-origin iframe host for the Create page's React Native Web preview. */
export default function CreatePreviewPage() {
  return (
    <div
      className="fixed inset-0 z-[2147483647] overflow-hidden bg-background"
      data-preview-inline="true"
    >
      <CustomizerPreview cssColorValues />
    </div>
  )
}
