"use client"

import { toggleBeta, useBeta } from "@/lib/beta"
import { cn } from "@/lib/utils"

/**
 * Beta switch.
 *
 * A real switch rather than a decorated button: the track and knob show the current state at a
 * glance, so the control reads as on/off instead of as an action. Off is quiet and neutral so it
 * does not compete with the header; on adopts the burnt-orange accent to match the skin it turns on.
 *
 * `role="switch"` + `aria-checked` is the accessible pairing for a two-state control, and the
 * label is real text rather than an icon so it survives screen readers and small viewports.
 */
export function BetaToggle({ className }: { className?: string }) {
  const beta = useBeta()

  return (
    <button
      type="button"
      role="switch"
      aria-checked={beta}
      aria-label="Beta mode"
      onClick={toggleBeta}
      title={
        beta
          ? "Beta mode is on — showing beta components and beta install commands"
          : "Turn on Beta mode to see beta components and beta install commands"
      }
      className={cn(
        "group inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold transition-all duration-300 ease-out active:scale-[0.97]",
        beta
          ? "border-[var(--beta-accent-line)] bg-[var(--beta-accent-soft)] text-[var(--beta-accent-strong)] shadow-xs"
          : "border-border/80 bg-muted/40 text-muted-foreground hover:border-border hover:text-foreground",
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          "relative flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition-colors duration-300 ease-out",
          beta ? "bg-[var(--beta-accent)]" : "bg-foreground/20"
        )}
      >
        <span
          className={cn(
            "size-3 rounded-full bg-white shadow-xs transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
            beta ? "translate-x-3" : "translate-x-0"
          )}
        />
      </span>
      <span className="pr-0.5 select-none transition-colors duration-300">Beta</span>
    </button>
  )
}
