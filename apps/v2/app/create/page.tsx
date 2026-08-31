import type { Metadata } from "next"
import { CreateCustomizer } from "./customizer"
import { DEFAULT_CONFIG, decodePreset } from "./preset-data"

const title = "Create Custom UI Theme & Components"
const description =
  "Customize everything. Pick your style, base color, font, icons, and radius — then create your own custom version of lovdaCN for React Native and Expo."

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/create",
  },
  openGraph: {
    title,
    description,
    url: "/create",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
}

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string | string[] }>
}) {
  const requestedPreset = (await searchParams).preset
  const preset = Array.isArray(requestedPreset) ? requestedPreset[0] : requestedPreset
  const initialConfig = (preset && decodePreset(preset)) || DEFAULT_CONFIG

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full bg-background">
      <CreateCustomizer initialConfig={initialConfig} />
    </div>
  )
}
