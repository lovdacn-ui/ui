"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { CheckIcon, ChevronRightIcon, LockIcon, UnlockIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface PickerOption<T extends string> {
  value: T
  label: string
  hint?: string
  swatch?: string | readonly string[]
}

interface PickerProps<T extends string> {
  label: string
  value: T
  selectedValue?: T | null
  options: readonly PickerOption<T>[]
  onChange: (value: T) => void
  onPreview?: (value: T | null) => void
  locked?: boolean
  onToggleLock?: () => void
  renderValue?: (value: T) => React.ReactNode
  icon?: React.ReactNode
  disabled?: boolean
  disabledHint?: string
}

function Swatch({ value }: { value: string | readonly string[] }) {
  if (typeof value === "string") {
    return (
      <span
        className="size-3.5 shrink-0 rounded-full ring-1 ring-border"
        style={{ backgroundColor: value }}
      />
    )
  }
  return (
    <span className="flex h-3.5 w-10 shrink-0 overflow-hidden rounded-full ring-1 ring-border">
      {value.map((color, index) => (
        <span key={`${color}-${index}`} className="h-full flex-1" style={{ backgroundColor: color }} />
      ))}
    </span>
  )
}

export function Picker<T extends string>({
  label,
  value,
  selectedValue,
  options,
  onChange,
  onPreview,
  locked,
  onToggleLock,
  renderValue,
  icon,
  disabled = false,
  disabledHint,
}: PickerProps<T>) {
  const [open, setOpen] = React.useState(false)
  const [coords, setCoords] = React.useState<{ top: number; left: number; width: number } | null>(null)
  const buttonRef = React.useRef<HTMLButtonElement>(null)
  const menuRef = React.useRef<HTMLDivElement>(null)
  const activeValue = selectedValue === undefined ? value : selectedValue
  const current = options.find((option) => option.value === activeValue)

  const close = React.useCallback(() => {
    setOpen(false)
    onPreview?.(null)
  }, [onPreview])

  const updateCoords = React.useCallback(() => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768

    if (isDesktop) {
      const estimatedHeight = Math.min(options.length * 36 + 16, 380)
      const top = Math.max(12, Math.min(rect.top, window.innerHeight - estimatedHeight - 12))
      const left = rect.right + 8
      setCoords({ top, left, width: 220 })
    } else {
      setCoords({ top: rect.bottom + 6, left: rect.left, width: rect.width })
    }
  }, [options.length])

  React.useEffect(() => {
    if (!open) return
    updateCoords()

    function onScrollOrResize() {
      updateCoords()
    }
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (
        buttonRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return
      }
      close()
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close()
    }

    window.addEventListener("resize", onScrollOrResize)
    window.addEventListener("scroll", onScrollOrResize, true)
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("resize", onScrollOrResize)
      window.removeEventListener("scroll", onScrollOrResize, true)
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [close, open, updateCoords])

  return (
    <div className="group/picker relative">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        title={disabled ? disabledHint : undefined}
        onClick={() => {
          if (open) close()
          else setOpen(true)
        }}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl border border-border bg-zinc-100/70 px-3.5 py-2.5 text-left shadow-xs transition-all duration-200 hover:bg-zinc-200/70 dark:border-border/80 dark:bg-zinc-900/50 dark:hover:bg-zinc-900/80",
          disabled && "cursor-not-allowed opacity-65 hover:bg-zinc-100/70 dark:hover:bg-zinc-900/50",
          open && "ring-1 ring-ring/40 dark:bg-zinc-900/80"
        )}
      >
        {icon && <div className="shrink-0">{icon}</div>}
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
          <span className="mt-0.5 truncate text-sm font-semibold text-foreground">
            {renderValue ? renderValue(value) : current?.label ?? value}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onToggleLock && !disabled && (
            <div
              role="button"
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation()
                onToggleLock()
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.stopPropagation()
                  event.preventDefault()
                  onToggleLock()
                }
              }}
              className={cn(
                "cursor-pointer rounded p-0.5 transition-all hover:bg-zinc-200 active:scale-95 dark:hover:bg-zinc-800",
                locked ? "text-foreground opacity-100" : "text-muted-foreground/45 opacity-0 group-hover/picker:opacity-100"
              )}
              aria-label={locked ? "Unlock" : "Lock"}
            >
              {locked ? <LockIcon className="size-3.5" strokeWidth={2.5} /> : <UnlockIcon className="size-3.5" strokeWidth={2.5} />}
            </div>
          )}
          {current?.swatch && <Swatch value={current.swatch} />}
          <ChevronRightIcon
            className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-150", open && "translate-x-0.5 text-foreground")}
          />
        </div>
      </button>

      {open && !disabled && coords && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              style={{
                position: "fixed",
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                width: `${coords.width}px`,
              }}
              className="z-[9999] max-h-[380px] overflow-y-auto rounded-xl border border-zinc-200/80 bg-popover/95 p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in-0 zoom-in-95 duration-150 dark:border-zinc-800 dark:bg-zinc-950/95 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onMouseEnter={() => onPreview?.(option.value)}
                  onMouseLeave={() => onPreview?.(null)}
                  onFocus={() => onPreview?.(option.value)}
                  onBlur={() => onPreview?.(null)}
                  onClick={() => {
                    onChange(option.value)
                    close()
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800/80 cursor-pointer",
                    option.value === activeValue && "bg-zinc-100 font-medium dark:bg-zinc-900"
                  )}
                >
                  <span className="flex-1 truncate">{option.label}</span>
                  {option.swatch && <Swatch value={option.swatch} />}
                  {option.hint && <span className="text-xs text-muted-foreground">{option.hint}</span>}
                  {option.value === activeValue && (
                    <CheckIcon className="size-4 shrink-0 text-foreground" />
                  )}
                </button>
              ))}
            </div>,
            document.body
          )
        : null}
    </div>
  )
}
