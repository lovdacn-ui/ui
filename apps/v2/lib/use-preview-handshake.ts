"use client"

/**
 * React binding for the parent side of the `lvcn:*` preview handshake
 * (see `lib/preview-protocol.ts`).
 *
 * Owns the whole lifecycle the three v2 iframe hosts need:
 *
 * - a fresh session whenever `src` changes or the user retries,
 * - request/retry until the presenter answers,
 * - a bounded timeout that reveals a recoverable state instead of leaving the
 *   frame at `opacity: 0`,
 * - configuration delivery on readiness and on every later change,
 * - optional "reveal only once the child echoed this exact configuration back".
 */
import * as React from "react"

import {
  createPreviewHandshake,
  projectPreviewHandshakeState,
  type PreviewColorScheme,
  type PreviewHandshake,
  type PreviewHandshakePhase,
  type PreviewHandshakeState,
} from "./preview-protocol"

export type UsePreviewHandshakeOptions = {
  /** Iframe URL. A change starts a new session. */
  src: string
  /** Origin the presenter is served from. */
  childOrigin: string
  colorScheme: PreviewColorScheme
  preset?: string
  /**
   * Reveal only after the presenter echoes the exact configuration back with
   * `lvcn:applied`. Used by the customizer so a default-theme frame is never
   * shown. The safety timeout still applies.
   */
  requireConfirmation?: boolean
}

export type UsePreviewHandshakeResult = {
  iframeRef: React.RefObject<HTMLIFrameElement | null>
  /** Use as the iframe `key`: changing it remounts the frame so retry truly reloads. */
  frameKey: string
  phase: PreviewHandshakePhase
  /** True when the iframe may be visible. Never stays false indefinitely. */
  revealed: boolean
  /** True while waiting for the presenter (show a loading affordance). */
  pending: boolean
  /** True after a live configuration was sent and until that exact revision is painted. */
  applying: boolean
  /** True when the presenter never answered in time (show a retry affordance). */
  unreachable: boolean
  handleLoad: () => void
  retry: () => void
}

const INITIAL_STATE: PreviewHandshakeState = {
  phase: "connecting",
  sessionId: null,
  requests: 0,
  revealed: false,
}

export function usePreviewHandshake({
  src,
  childOrigin,
  colorScheme,
  preset,
  requireConfirmation = false,
}: UsePreviewHandshakeOptions): UsePreviewHandshakeResult {
  const iframeRef = React.useRef<HTMLIFrameElement | null>(null)
  const handshakeRef = React.useRef<PreviewHandshake | null>(null)
  const [reloadNonce, setReloadNonce] = React.useState(0)
  const [applyingRevision, setApplyingRevision] = React.useState<number | null>(null)
  const frameKey = `${src}::${reloadNonce}`
  const [snapshot, setSnapshot] = React.useState(() => ({
    frameKey,
    state: INITIAL_STATE,
  }))
  const state = projectPreviewHandshakeState(frameKey, snapshot)

  // Latest configuration, readable from callbacks without re-creating the machine.
  const configRef = React.useRef({ colorScheme, preset })
  React.useEffect(() => {
    configRef.current = { colorScheme, preset }
  }, [colorScheme, preset])

  // Last configuration actually posted, used to confirm the child's echo.
  const sentRef = React.useRef({ revision: 0, colorScheme, preset })

  const deliverConfig = React.useCallback(() => {
    const handshake = handshakeRef.current
    if (!handshake) return
    const revision = sentRef.current.revision + 1
    const next = configRef.current
    sentRef.current = { revision, colorScheme: next.colorScheme, preset: next.preset }
    const posted = handshake.sendPreset({
      revision,
      colorScheme: next.colorScheme,
      preset: next.preset,
    })
    if (requireConfirmation && posted) setApplyingRevision(revision)
  }, [requireConfirmation])

  React.useEffect(() => {
    if (typeof window === "undefined") return
    // Hosts that render a fallback instead of an iframe pass an empty src; there
    // is nothing to hand shake with, and no timeout should be armed.
    if (!src) return

    const sessionFrameKey = frameKey
    sentRef.current = {
      revision: 0,
      colorScheme: configRef.current.colorScheme,
      preset: configRef.current.preset,
    }

    const handshake = createPreviewHandshake({
      childOrigin,
      requireConfirmation,
      getChildWindow: () => iframeRef.current?.contentWindow ?? null,
      subscribe: (listener) => {
        const onMessage = (event: MessageEvent) => listener(event)
        window.addEventListener("message", onMessage)
        return () => window.removeEventListener("message", onMessage)
      },
      onState: (nextState) => {
        setSnapshot({ frameKey: sessionFrameKey, state: nextState })
        if (nextState.phase === "connecting" || nextState.phase === "unreachable") {
          setApplyingRevision(null)
        }
      },
      onReady: () => deliverConfig(),
      onApplied: (message) => {
        if (!requireConfirmation) return
        const expected = sentRef.current
        // Exact match only: a stale revision must neither reveal the frame nor
        // dismiss the transition for a newer configuration still being applied.
        if (
          message.revision === expected.revision &&
          message.colorScheme === expected.colorScheme &&
          message.preset === expected.preset
        ) {
          setApplyingRevision((current) =>
            current === message.revision ? null : current
          )
          handshakeRef.current?.confirm()
        }
      },
    })

    handshakeRef.current = handshake
    handshake.start()

    return () => {
      handshake.destroy()
      if (handshakeRef.current === handshake) handshakeRef.current = null
    }
    // A new `src` or a retry means a new document, therefore a new session.
  }, [src, childOrigin, frameKey, requireConfirmation, deliverConfig])

  // Configuration changes after readiness travel over postMessage so the frame
  // is never reloaded. Changes made *before* readiness are covered by `onReady`,
  // which always sends the newest values.
  React.useEffect(() => {
    if (state.phase === "connecting") return
    const sent = sentRef.current
    if (sent.colorScheme === colorScheme && sent.preset === preset) return
    deliverConfig()
  }, [state.phase, colorScheme, preset, deliverConfig])

  const handleLoad = React.useCallback(() => {
    handshakeRef.current?.handleLoad()
  }, [])

  const retry = React.useCallback(() => {
    setReloadNonce((nonce) => nonce + 1)
  }, [])

  return {
    iframeRef,
    frameKey,
    phase: state.phase,
    revealed: state.revealed,
    pending: !state.revealed,
    applying: applyingRevision !== null,
    unreachable: state.phase === "unreachable",
    handleLoad,
    retry,
  }
}
