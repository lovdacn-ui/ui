import * as React from "react"

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col w-full min-h-0 animate-in fade-in-50 duration-200 ease-out motion-reduce:animate-none">
      {children}
    </div>
  )
}
