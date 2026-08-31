/**
 * motion — shared animation engine for lovdaCN. [BETA]
 *
 * Provides the `animate` / `activeAnimate` contract used across lovdaCN UI
 * components, plus standalone `Motion` hosts for user-owned content.
 *
 * Design (see ANIMATIONS_NEW.md):
 * - Object configuration is the canonical v1 API. Utility strings are sugar that compiles
 *   to the same object model.
 * - Animations run on the UI thread. Shared values change ONLY when the resolved
 *   target changes (driven by discrete interaction/semantic state). `useDerivedValue`
 *   starts the `withTiming`/`withSpring`; `useAnimatedStyle` only READS shared values.
 *   We never allocate a new spring/timing inside `useAnimatedStyle` on every frame.
 * - User handlers are composed, not replaced (each user callback fires exactly once).
 * - Refs resolve to the underlying host.
 * - System reduced-motion is respected by default: motion snaps to its final
 *   accessible value instead of animating.
 *
 * ## Visibility contract (fail open, never fail hidden)
 *
 * Entrance animations start from a hidden/offset value, so they are only allowed when a
 * hidden first frame cannot be mistaken for missing content:
 *
 * | Environment                                   | First paint |
 * |-----------------------------------------------|-------------|
 * | Static/server web output                      | final value |
 * | Web hydration (host present in initial HTML)  | final value |
 * | Web mount after the page `load` event         | entrance    |
 * | Native (iOS/Android)                          | entrance    |
 * | Reduced motion (system or `reduceMotion`)     | final value |
 *
 * The decision is latched per host on its FIRST render, so a host never renders visible
 * content and then hides it, and the first client render always matches server output.
 * The engine also never emits an animation object on the first evaluation, so content is
 * usable even if the worklet runtime never advances.
 *
 * ## Style ownership contract
 *
 * - `transform`: when motion drives ANY transform key it owns the whole `transform` array.
 *   Static transform operations found on the host's own `style` prop are composed in front
 *   of the animated ones; a static operation for a key motion also drives is dropped with a
 *   development warning. Transforms that come from `className` are invisible to the engine
 *   and are replaced — animate them instead of mixing the two systems.
 * - `borderRadius` and colors (`color`, `backgroundColor`, `borderColor`) are NEVER
 *   invented. They animate only when both an idle and an active endpoint are supplied.
 *   An active-only value is rejected with a development warning and the static style is
 *   kept, so a valid static token can never be replaced by `0` or by `transparent`.
 * - `opacity` and transform keys have safe documented defaults (`1`, `1`, `0`, `0deg`).
 *
 * NOTE (beta): `exit`, object-form `repeat` and `reverse` are parsed but NOT executed —
 * the engine has no presence/unmount coordinator. Supplying them warns in development.
 */
import * as React from "react";
import {
  Platform,
  Pressable,
  type PressableProps,
  StyleSheet,
  Text as RNTextComponent,
  type TextProps,
  TextInput,
  type TextInputProps,
  View as RNViewComponent,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";
// Host instance types — used so refs on the animated hosts resolve to the real native host.
import type { Text as RNTextHost, View as RNViewHost } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  type EasingFunction,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";

/* -------------------------------------------------------------------------------------------------
 * Public types
 * -----------------------------------------------------------------------------------------------*/

export type MotionTarget = {
  opacity?: number;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  translateX?: number;
  translateY?: number;
  rotate?: `${number}deg`;
  rotateX?: `${number}deg`;
  rotateY?: `${number}deg`;
  backgroundColor?: string;
  borderColor?: string;
  color?: string;
  borderRadius?: number;
};

export type MotionTransition =
  | {
      type: "spring";
      damping?: number;
      stiffness?: number;
      mass?: number;
      overshootClamping?: boolean;
      delay?: number;
    }
  | {
      type: "timing";
      duration?: number;
      easing?: "linear" | "ease-in" | "ease-out" | "ease-in-out";
      delay?: number;
    };

export type MotionPresetName =
  | "fade-in"
  | "fade-out"
  | "slide-up"
  | "slide-down"
  | "slide-left"
  | "slide-right"
  | "zoom-in"
  | "zoom-out"
  | "pop"
  | "press"
  | "spin"
  | "pulse"
  | "bounce"
  | "shake"
  | "wiggle";

export interface AnimateConfig {
  initial?: MotionTarget;
  to?: MotionTarget;
  /**
   * @deprecated Not executed. The engine has no presence/unmount coordinator, so an exit
   * target never runs. Supplying it warns in development and will be removed in the next
   * documented breaking release.
   */
  exit?: MotionTarget;
  transition?: MotionTransition;
  /**
   * @deprecated Not executed for object-form animations. Use the continuous presets
   * (`spin`, `pulse`, `bounce`, `shake`, `wiggle`) for looping motion.
   */
  repeat?: number | "infinite";
  /**
   * @deprecated Not executed. Supplying it warns in development.
   */
  reverse?: boolean;
}

export type ActiveState =
  | "press"
  | "hover"
  | "focus"
  | "checked"
  | "selected"
  | "current"
  | "open"
  | "expanded"
  | "visible"
  | "loading"
  | "dragging";

export interface ActiveStateConfig {
  to: MotionTarget;
  transition?: MotionTransition;
}

export interface ActiveAnimateConfig {
  /** Shorthand target for the component's canonical active state. */
  to?: MotionTarget;
  transition?: MotionTransition;
  /** Optional per-state targets for components with more than one state. */
  states?: Partial<Record<ActiveState, ActiveStateConfig>>;
}

/** Preset name, utility string (e.g. 'fade-in slide-up duration-200'), config object, or false. */
export type MotionUtilityString = string & {};
export type AnimateProp =
  | false
  | MotionPresetName
  | MotionUtilityString
  | AnimateConfig;
export type ActiveAnimateProp =
  | false
  | MotionPresetName
  | MotionUtilityString
  | MotionTarget
  | ActiveAnimateConfig;

/**
 * The interaction channel a host routes a SHORTHAND active target to.
 *
 * | Host             | Channel                                   |
 * |------------------|-------------------------------------------|
 * | `MotionPressable`| `press`                                   |
 * | `MotionTextInput`| `focus`                                   |
 * | `MotionView`     | `semantic` (gated by `motionActive`)       |
 * | `MotionText`     | `semantic` (gated by `motionActive`)       |
 * | `MotionSlot`     | explicit — defaults to `semantic`         |
 *
 * A host that is also driven semantically (the caller passes `motionActive`) receives the
 * shorthand on BOTH its canonical channel and the semantic channel, so a Pressable used as
 * a selected tab/toggle works without a per-component workaround. Explicit `states` entries
 * always win for the states they name.
 */
export type MotionChannel = "press" | "focus" | "semantic" | "none";

export interface SharedAnimationProps {
  /** Idle, mount, or continuous animation. `false` disables it. */
  animate?: AnimateProp;
  /** Motion applied while the component's semantic active state is true. */
  activeAnimate?: ActiveAnimateProp;
  /** Explicit active-state override for components without intrinsic state. */
  motionActive?: boolean;
  /** Defaults to `system`. */
  reduceMotion?: "system" | "always" | "never";
}

/* -------------------------------------------------------------------------------------------------
 * Presets
 * -----------------------------------------------------------------------------------------------*/

type LoopKind = "spin" | "pulse" | "bounce" | "shake" | "wiggle";

/**
 * Shared timing tokens — the single vocabulary for animation duration/easing across
 * lovdaCN. Components import these from `@/components/ui/primitives` (which mirrors
 * them) so they never have to depend on this engine directly.
 *
 * Keep these values in sync with the copies in the PLAIN primitives variant and with
 * the Tailwind `duration-*` classes used on web, so an animation looks the same
 * whichever system drives it.
 */
export const durations = {
  instant: 0,
  fast: 150,
  base: 200,
  slow: 250,
  slower: 300,
} as const;

export const transitions = {
  /** Quick exits and dismissals. */
  fast: { type: "timing", duration: durations.fast, easing: "ease-out" },
  /** Default enter/idle transition. */
  base: { type: "timing", duration: durations.base, easing: "ease-out" },
  /** Slower, more deliberate movement (sheets, drawers). */
  slow: { type: "timing", duration: durations.slow, easing: "ease-out" },
  /** Crisp interaction feedback — the default for press/active states. */
  springSnappy: { type: "spring", damping: 18, stiffness: 240, mass: 1 },
  /** Gentle, settling movement. */
  springSoft: { type: "spring", damping: 20, stiffness: 120, mass: 1 },
  /** Playful overshoot. */
  springBouncy: { type: "spring", damping: 10, stiffness: 260, mass: 1 },
} satisfies Record<string, MotionTransition>;

const SPRING_SNAPPY: MotionTransition = transitions.springSnappy;
const TIMING_FAST: MotionTransition = {
  type: "timing",
  duration: 180,
  easing: "ease-out",
};

/**
 * Canonical preset table. `initial`/`to` describe the idle/lifecycle layer,
 * `active` describes the active-state overlay, `loop` marks a continuous animation.
 */
export const motionPresets: Record<
  MotionPresetName,
  {
    initial?: MotionTarget;
    to?: MotionTarget;
    exit?: MotionTarget;
    active?: MotionTarget;
    transition?: MotionTransition;
    loop?: LoopKind;
  }
> = {
  "fade-in": {
    initial: { opacity: 0 },
    to: { opacity: 1 },
    transition: { type: "timing", duration: 200 },
  },
  "fade-out": {
    exit: { opacity: 0 },
    transition: { type: "timing", duration: 150 },
  },
  "slide-up": {
    initial: { opacity: 0, translateY: 12 },
    to: { opacity: 1, translateY: 0 },
    transition: SPRING_SNAPPY,
  },
  "slide-down": {
    initial: { opacity: 0, translateY: -12 },
    to: { opacity: 1, translateY: 0 },
    transition: SPRING_SNAPPY,
  },
  "slide-left": {
    initial: { opacity: 0, translateX: 12 },
    to: { opacity: 1, translateX: 0 },
    transition: SPRING_SNAPPY,
  },
  "slide-right": {
    initial: { opacity: 0, translateX: -12 },
    to: { opacity: 1, translateX: 0 },
    transition: SPRING_SNAPPY,
  },
  "zoom-in": {
    initial: { opacity: 0, scale: 0.9 },
    to: { opacity: 1, scale: 1 },
    transition: SPRING_SNAPPY,
  },
  "zoom-out": {
    exit: { opacity: 0, scale: 0.9 },
    transition: { type: "timing", duration: 150 },
  },
  pop: {
    initial: { scale: 0.8 },
    to: { scale: 1 },
    transition: { type: "spring", damping: 12, stiffness: 260 },
  },
  press: { active: { scale: 0.97 }, transition: SPRING_SNAPPY },
  spin: { loop: "spin", transition: { type: "timing", duration: 1000 } },
  pulse: { loop: "pulse", transition: { type: "timing", duration: 900 } },
  bounce: { loop: "bounce", transition: { type: "timing", duration: 600 } },
  shake: { loop: "shake", transition: { type: "timing", duration: 400 } },
  wiggle: { loop: "wiggle", transition: { type: "timing", duration: 400 } },
};

/* -------------------------------------------------------------------------------------------------
 * Development diagnostics
 * -----------------------------------------------------------------------------------------------*/

const warnedMessages = new Set<string>();

/** Warn once per distinct message so a re-rendering component cannot flood the console. */
function devWarn(message: string) {
  if (!__DEV__) return;
  if (warnedMessages.has(message)) return;
  warnedMessages.add(message);
  console.warn(message);
}

/* -------------------------------------------------------------------------------------------------
 * Normalization (JS thread, memoized)
 * -----------------------------------------------------------------------------------------------*/

const COLOR_KEYS = ["backgroundColor", "borderColor", "color"] as const;

/**
 * Properties whose idle value can NEVER be invented: there is no meaningful neutral color
 * and `0` is not a neutral radius. Motion animates them only when the caller supplies both
 * endpoints.
 */
const NO_INVENT_KEYS: readonly string[] = [...COLOR_KEYS, "borderRadius"];

/**
 * Safe idle defaults. Deliberately contains no color and no radius — see `NO_INVENT_KEYS`.
 */
const NUMERIC_DEFAULTS: Record<string, number | string> = {
  opacity: 1,
  scale: 1,
  scaleX: 1,
  scaleY: 1,
  translateX: 0,
  translateY: 0,
  rotate: "0deg",
  rotateX: "0deg",
  rotateY: "0deg",
};

/** Plain, worklet-serializable target set for one host. */
export type MotionTargets = {
  initial: MotionTarget;
  idle: MotionTarget;
  press?: MotionTarget;
  hover?: MotionTarget;
  focus?: MotionTarget;
  semantic?: MotionTarget;
  dragging?: MotionTarget;
};

/** Discrete interaction/semantic state, read from shared values. */
export type MotionStateFlags = {
  pressed: boolean;
  hovered: boolean;
  focused: boolean;
  dragging: boolean;
  semantic: boolean;
  disabled: boolean;
};

export type ResolvedMotionTarget = {
  /** `undefined` means "no endpoint exists" — the property must not be emitted at all. */
  value: number | string | undefined;
  /** True when the value came from an active state rather than from idle. */
  active: boolean;
};

type Normalized = MotionTargets & {
  activeTransition: MotionTransition;
  idleTransition: MotionTransition;
  used: Record<string, boolean>;
  /** Properties requested for active state only, which the engine refuses to animate. */
  oneSided: Record<string, boolean>;
  loop?: LoopKind;
  loopTransition: MotionTransition;
};

type TargetRecord = Record<string, number | string | undefined>;

function presetFor(name: MotionPresetName) {
  return motionPresets[name];
}

/** Warn about fields the engine parses but does not execute (see section 8.1 of the plan). */
function warnDormantFields(config: AnimateConfig) {
  if (config.exit !== undefined) {
    devWarn(
      "[motion] `animate.exit` is accepted but NOT executed: this engine has no presence/unmount " +
        "coordinator, so exit targets never run. Remove it, or keep the element mounted and drive " +
        "an active state instead.",
    );
  }
  if (config.repeat !== undefined) {
    devWarn(
      "[motion] `animate.repeat` is accepted but NOT executed for object-form animations. Use a " +
        "continuous preset (`spin`, `pulse`, `bounce`, `shake`, `wiggle`) for looping motion.",
    );
  }
  if (config.reverse !== undefined) {
    devWarn(
      "[motion] `animate.reverse` is accepted but NOT executed. Remove it.",
    );
  }
}

function resolveAnimate(
  animate: AnimateProp | undefined,
  fallback: AnimateProp | undefined,
) {
  const value = animate === undefined ? fallback : animate;
  if (value === undefined || value === false)
    return {
      config: undefined as AnimateConfig | undefined,
      loop: undefined as LoopKind | undefined,
    };
  if (typeof value === "string") {
    // Single preset name resolves directly; anything with whitespace/prefixes is a utility string.
    if (value in motionPresets) {
      const p = presetFor(value as MotionPresetName);
      if (!p.initial && !p.to && !p.loop && p.exit) {
        devWarn(
          `[motion] The "${value}" preset only describes an exit animation, which this engine does ` +
            "not run, so it has no effect as an `animate` value.",
        );
      }
      return {
        config: {
          initial: p.initial,
          to: p.to,
          exit: p.exit,
          transition: p.transition,
        } as AnimateConfig,
        loop: p.loop,
      };
    }
    const parsed = parseMotionString(value);
    return { config: parsed.animate, loop: undefined };
  }
  warnDormantFields(value);
  return { config: value, loop: undefined };
}

function resolveActive(
  activeAnimate: ActiveAnimateProp | undefined,
  fallback: ActiveAnimateProp | undefined,
) {
  const value = activeAnimate === undefined ? fallback : activeAnimate;
  if (value === undefined || value === false) return undefined;

  if (typeof value === "string") {
    if (value in motionPresets) {
      const p = presetFor(value as MotionPresetName);
      return {
        simple: p.active ?? p.to,
        transition: p.transition,
        states: undefined,
      } as {
        simple?: MotionTarget;
        transition?: MotionTransition;
        states?: ActiveAnimateConfig["states"];
      };
    }
    // Utility string: bare transforms become the simple target, prefixed ones become states.
    const parsed = parseMotionString(value);
    return {
      simple: parsed.animate?.to,
      transition: parsed.active?.transition ?? parsed.animate?.transition,
      states: parsed.active?.states,
    };
  }
  // MotionTarget vs ActiveAnimateConfig: config has `to`/`states`/`transition`.
  const asConfig = value as ActiveAnimateConfig;
  if (asConfig.states || asConfig.to || asConfig.transition) {
    return {
      simple: asConfig.to,
      transition: asConfig.transition,
      states: asConfig.states,
    };
  }
  return {
    simple: value as MotionTarget,
    transition: undefined,
    states: undefined,
  };
}

function markUsed(used: Record<string, boolean>, target?: MotionTarget) {
  if (!target) return;
  for (const key of Object.keys(target)) used[key] = true;
}

function normalize(props: {
  animate?: AnimateProp;
  activeAnimate?: ActiveAnimateProp;
  defaultAnimate?: AnimateProp;
  defaultActiveAnimate?: ActiveAnimateProp;
  /** The host's canonical shorthand channel. Defaults to `semantic`. */
  channel?: MotionChannel;
  /** True when the caller drives this host's semantic state via `motionActive`. */
  semanticDriven?: boolean;
}): Normalized {
  const used: Record<string, boolean> = {};
  const channel: MotionChannel = props.channel ?? "semantic";

  const { config: idleCfg, loop } = resolveAnimate(
    props.animate,
    props.defaultAnimate,
  );
  const active = resolveActive(props.activeAnimate, props.defaultActiveAnimate);

  const initial = idleCfg?.initial ?? {};
  const idle = idleCfg?.to ?? {};
  const idleTransition = idleCfg?.transition ?? SPRING_SNAPPY;

  markUsed(used, initial);
  markUsed(used, idle);

  // Per-state targets. A component has a single canonical semantic state, so
  // checked/selected/open/expanded/current/visible/loading all collapse into `semantic`.
  let press: MotionTarget | undefined;
  let hover: MotionTarget | undefined;
  let focus: MotionTarget | undefined;
  let semantic: MotionTarget | undefined;
  let dragging: MotionTarget | undefined;
  let activeTransition: MotionTransition = SPRING_SNAPPY;

  if (active) {
    activeTransition = active.transition ?? SPRING_SNAPPY;

    // A shorthand target goes to the host's canonical channel …
    if (active.simple) {
      if (channel === "press") press = active.simple;
      else if (channel === "focus") focus = active.simple;
      else if (channel === "semantic") semantic = active.simple;
      else {
        devWarn(
          "[motion] A shorthand `activeAnimate` target was supplied to a host with no canonical " +
            "active channel. Use `activeAnimate.states` to say which state should drive it.",
        );
      }
      // … and additionally to the semantic channel when the caller drives semantic state,
      // so a Pressable used as a selected tab/toggle animates its selection too.
      if (props.semanticDriven && channel !== "semantic")
        semantic = active.simple;
    }

    // Explicit per-state targets always win for the state they name.
    if (active.states) {
      const s = active.states;
      if (s.press) press = s.press.to;
      if (s.hover) hover = s.hover.to;
      if (s.focus) focus = s.focus.to;
      if (s.dragging) dragging = s.dragging.to;
      const sem =
        s.checked ??
        s.selected ??
        s.current ??
        s.open ??
        s.expanded ??
        s.visible ??
        s.loading;
      if (sem) semantic = sem.to;
    }

    markUsed(used, press);
    markUsed(used, hover);
    markUsed(used, focus);
    markUsed(used, semantic);
    markUsed(used, dragging);
  }

  // Loops mark their driven property as used.
  if (loop === "spin" || loop === "wiggle") used.rotate = true;
  if (loop === "pulse") used.opacity = true;
  if (loop === "bounce") used.translateY = true;
  if (loop === "shake") used.translateX = true;

  // Colors and radii must never be invented. A property that only has an active endpoint is
  // rejected: the static style keeps ownership and we say so in development.
  const oneSided: Record<string, boolean> = {};
  for (const key of NO_INVENT_KEYS) {
    if (!used[key]) continue;
    const hasIdleEndpoint =
      (idle as TargetRecord)[key] !== undefined ||
      (initial as TargetRecord)[key] !== undefined;
    if (hasIdleEndpoint) continue;
    oneSided[key] = true;
    used[key] = false;
    devWarn(
      `[motion] "${key}" was given an active value but no idle value, so it cannot be interpolated ` +
        "and a neutral default would be wrong. The animation is ignored and the static style is " +
        `kept. Supply both endpoints (\`animate={{ to: { ${key}: … } }}\`) to animate it.`,
    );
  }

  const loopTransition = loop
    ? (idleCfg?.transition ??
      motionPresets[loop as MotionPresetName]?.transition ??
      TIMING_FAST)
    : TIMING_FAST;

  return {
    initial,
    idle,
    press,
    hover,
    focus,
    semantic,
    dragging,
    activeTransition,
    idleTransition,
    used,
    oneSided,
    loop,
    loopTransition,
  };
}

/**
 * Resolve the winning target for one property.
 *
 * Precedence: disabled → dragging → press → semantic → focus → hover → idle.
 * `fallback` is the invented idle default and is deliberately `undefined` for colors and
 * radii, in which case the result may be `undefined` — meaning "do not emit this property".
 *
 * Pure and worklet-safe so both the UI thread and the engine tests can call it.
 */
function resolveMotionTarget(
  prop: string,
  targets: MotionTargets,
  flags: MotionStateFlags,
  fallback?: number | string,
): ResolvedMotionTarget {
  "worklet";
  const idleValue = (targets.idle as TargetRecord)[prop] ?? fallback;
  if (flags.disabled) return { value: idleValue, active: false };

  let value: number | string | undefined;
  if (flags.dragging && targets.dragging)
    value = (targets.dragging as TargetRecord)[prop];
  if (value === undefined && flags.pressed && targets.press)
    value = (targets.press as TargetRecord)[prop];
  if (value === undefined && flags.semantic && targets.semantic)
    value = (targets.semantic as TargetRecord)[prop];
  if (value === undefined && flags.focused && targets.focus)
    value = (targets.focus as TargetRecord)[prop];
  if (value === undefined && flags.hovered && targets.hover)
    value = (targets.hover as TargetRecord)[prop];

  if (value !== undefined) return { value, active: true };
  return { value: idleValue, active: false };
}

/**
 * True when a host actually has motion to run. Hosts use this to pick the raw React Native
 * host (no Reanimated hooks, styles or effects) over the animated one.
 */
function hasMotionConfig(config: {
  animate?: AnimateProp;
  activeAnimate?: ActiveAnimateProp;
  defaultAnimate?: AnimateProp;
  defaultActiveAnimate?: ActiveAnimateProp;
}): boolean {
  const animate =
    config.animate === undefined ? config.defaultAnimate : config.animate;
  const active =
    config.activeAnimate === undefined
      ? config.defaultActiveAnimate
      : config.activeAnimate;
  const hasAnimate = animate !== undefined && animate !== false;
  const hasActive = active !== undefined && active !== false;
  return hasAnimate || hasActive;
}

/* -------------------------------------------------------------------------------------------------
 * Entrance policy — see the visibility contract at the top of this file
 * -----------------------------------------------------------------------------------------------*/

const IS_WEB = Platform.OS === "web";

/**
 * Narrow view of the browser globals. Accessed through `globalThis` so this file does not
 * need the DOM type library and does not break the native build.
 */
type WebGlobals = {
  document?: { readyState?: string };
  addEventListener?: (
    type: string,
    listener: () => void,
    options?: { once?: boolean },
  ) => void;
  requestAnimationFrame?: (callback: () => void) => unknown;
};

const webGlobal = globalThis as unknown as WebGlobals;

/**
 * On web, entrances stay disarmed until the initial document has loaded and two frames have
 * passed. Static output and the whole hydration pass therefore render final, visible values,
 * while anything mounted later (dialogs, navigations, lists) still animates in.
 *
 * This is a one-way latch and never triggers a re-render, so no host can flip from visible
 * to hidden.
 */
let webEntranceArmed = false;

if (
  IS_WEB &&
  webGlobal.document &&
  typeof webGlobal.addEventListener === "function"
) {
  const arm = () => {
    webEntranceArmed = true;
  };
  const armAfterFrames = () => {
    const raf = webGlobal.requestAnimationFrame;
    if (typeof raf === "function") raf(() => raf(arm));
    else setTimeout(arm, 0);
  };
  if (webGlobal.document.readyState === "complete") armAfterFrames();
  else webGlobal.addEventListener("load", armAfterFrames, { once: true });
}

/** Native and post-load web mounts may animate in; static/hydrating web output may not. */
function entranceAllowed(): boolean {
  return IS_WEB ? webEntranceArmed : true;
}

/* -------------------------------------------------------------------------------------------------
 * useMotion
 * -----------------------------------------------------------------------------------------------*/

export interface UseMotionConfig extends SharedAnimationProps {
  /** When true, interaction/active motion is suppressed (returns to idle). */
  disabled?: boolean;
  /** Component default idle/lifecycle animation. */
  defaultAnimate?: AnimateProp;
  /** Component default active animation (e.g. Button press scale). */
  defaultActiveAnimate?: ActiveAnimateProp;
  /** Canonical channel for a shorthand active target. Defaults to `semantic`. */
  channel?: MotionChannel;
  /**
   * Static transform operations taken from the host's own `style` prop. Motion composes them
   * in front of the animated operations instead of silently replacing them.
   */
  staticTransform?: readonly Record<string, number | string>[];
}

export interface MotionHandlers {
  onPressIn?: (e: unknown) => void;
  onPressOut?: (e: unknown) => void;
  onHoverIn?: (e: unknown) => void;
  onHoverOut?: (e: unknown) => void;
  onFocus?: (e: unknown) => void;
  onBlur?: (e: unknown) => void;
  onPointerCancel?: (e: unknown) => void;
}

function easingFor(
  name: "linear" | "ease-in" | "ease-out" | "ease-in-out",
): EasingFunction {
  "worklet";
  switch (name) {
    case "linear":
      return Easing.linear;
    case "ease-in":
      return Easing.in(Easing.ease);
    case "ease-in-out":
      return Easing.inOut(Easing.ease);
    case "ease-out":
    default:
      return Easing.out(Easing.ease);
  }
}

/**
 * Core hook. Returns an animated style, composed interaction handlers, and
 * shared interaction state for specialized components.
 */
export function useMotion(config: UseMotionConfig) {
  const {
    animate,
    activeAnimate,
    motionActive,
    reduceMotion = "system",
    disabled = false,
    defaultAnimate,
    defaultActiveAnimate,
    channel = "semantic",
    staticTransform,
  } = config;

  const systemReduced = useReducedMotion();
  const rmActive =
    reduceMotion === "always"
      ? true
      : reduceMotion === "never"
        ? false
        : systemReduced;
  const semanticDriven = motionActive !== undefined;

  // JS-thread normalization. Recomputed only when inputs change.
  const n = React.useMemo(
    () =>
      normalize({
        animate,
        activeAnimate,
        defaultAnimate,
        defaultActiveAnimate,
        channel,
        semanticDriven,
      }),
    // Stringify to keep object identity from thrashing the memo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      JSON.stringify(animate),
      JSON.stringify(activeAnimate),
      JSON.stringify(defaultAnimate),
      JSON.stringify(defaultActiveAnimate),
      channel,
      semanticDriven,
    ],
  );

  // Entrance eligibility is decided ONCE, on the first render, so server output, the first
  // client render and every later render of this host agree. A `useState` initializer keeps the
  // decision stable without touching a ref during render.
  const wantsEntrance = Object.keys(n.initial).length > 0;
  const [runEntrance] = React.useState(
    () => wantsEntrance && !rmActive && entranceAllowed(),
  );

  // Discrete state as shared values so derived values react reliably.
  const pressed = useSharedValue(false);
  const hovered = useSharedValue(false);
  const focused = useSharedValue(false);
  const dragging = useSharedValue(false);
  const semActive = useSharedValue(!!motionActive);
  const isDisabled = useSharedValue(!!disabled);
  const rm = useSharedValue(rmActive);
  const mounted = useSharedValue(false);
  const entrance = useSharedValue(runEntrance);
  const loopProgress = useSharedValue(0);

  React.useEffect(() => {
    semActive.value = !!motionActive;
  }, [motionActive, semActive]);
  React.useEffect(() => {
    isDisabled.value = !!disabled;
  }, [disabled, isDisabled]);
  React.useEffect(() => {
    rm.value = rmActive;
  }, [rmActive, rm]);
  React.useEffect(() => {
    mounted.value = true;
  }, [mounted]);

  // Loop lifecycle: start on mount when a loop preset is active + not reduced;
  // cancel on unmount and when reduced motion turns on.
  const loopKind = n.loop;
  const loopDuration =
    n.loopTransition.type === "timing"
      ? (n.loopTransition.duration ?? 1000)
      : 1000;
  React.useEffect(() => {
    if (!loopKind || rmActive) {
      cancelAnimation(loopProgress);
      loopProgress.value = 0;
      return;
    }
    loopProgress.value = 0;
    loopProgress.value = withRepeat(
      withTiming(1, { duration: loopDuration, easing: Easing.linear }),
      -1,
      loopKind !== "spin", // reverse for pulse/bounce/shake/wiggle
    );
    return () => cancelAnimation(loopProgress);
  }, [loopKind, rmActive, loopDuration, loopProgress]);

  // Capture normalized targets as plain, serializable objects for the worklets.
  const targets: MotionTargets = {
    initial: n.initial,
    idle: n.idle,
    press: n.press,
    hover: n.hover,
    focus: n.focus,
    semantic: n.semantic,
    dragging: n.dragging,
  };
  const used = n.used;
  const activeTransition = n.activeTransition;
  const idleTransition = n.idleTransition;

  // Static transform ownership is resolved on the JS thread: keep the operations motion does
  // not drive, drop (loudly) the ones it does.
  const composedStaticTransform = React.useMemo(() => {
    if (!staticTransform || staticTransform.length === 0) return undefined;
    const kept: Record<string, number | string>[] = [];
    for (const operation of staticTransform) {
      const key = Object.keys(operation)[0];
      if (key && used[key]) {
        devWarn(
          `[motion] The animated host owns the "${key}" transform, so the static transform value ` +
            "from the `style` prop is dropped. Move the static value into `animate`, or animate a " +
            "different key.",
        );
        continue;
      }
      kept.push(operation);
    }
    return kept.length > 0 ? kept : undefined;
  }, [staticTransform, used]);

  // Worklet: apply a transition toward a target value, honoring reduced motion.
  const applyTransition = (
    toValue: number | string,
    transition: MotionTransition,
    reduced: boolean,
  ): number | string => {
    "worklet";
    if (reduced) return toValue; // snap to final accessible value
    const t = transition as {
      type: "spring" | "timing";
      duration?: number;
      easing?: "linear" | "ease-in" | "ease-out" | "ease-in-out";
      damping?: number;
      stiffness?: number;
      mass?: number;
      overshootClamping?: boolean;
      delay?: number;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let animatedValue: any;
    if (t.type === "timing") {
      animatedValue = withTiming(toValue as number, {
        duration: t.duration ?? 200,
        easing: easingFor(t.easing ?? "ease-out"),
      });
    } else {
      animatedValue = withSpring(toValue as number, {
        damping: t.damping ?? 15,
        stiffness: t.stiffness ?? 180,
        mass: t.mass ?? 1,
        overshootClamping: t.overshootClamping ?? false,
      });
    }
    if (t.delay && t.delay > 0) {
      return withDelay(t.delay, animatedValue);
    }
    return animatedValue;
  };

  /**
   * Worklet: current value for a property.
   *
   * The first evaluation NEVER returns an animation object — it returns a plain, final (or
   * entrance) value, so static output and the first client paint are usable even if the
   * worklet runtime never advances.
   */
  const resolveValue = (
    prop: string,
    fallback?: number | string,
  ): number | string | undefined => {
    "worklet";
    const resolved = resolveMotionTarget(
      prop,
      targets,
      {
        pressed: pressed.value,
        hovered: hovered.value,
        focused: focused.value,
        dragging: dragging.value,
        semantic: semActive.value,
        disabled: isDisabled.value,
      },
      fallback,
    );
    if (resolved.value === undefined) return undefined;

    if (!mounted.value) {
      if (entrance.value) {
        const initialValue = (targets.initial as TargetRecord)[prop];
        if (initialValue !== undefined) return initialValue;
      }
      return resolved.value;
    }

    return applyTransition(
      resolved.value,
      resolved.active ? activeTransition : idleTransition,
      rm.value,
    );
  };

  /** Worklet: properties with a safe neutral default (opacity + transforms). */
  const resolveInvented = (prop: string): number | string => {
    "worklet";
    const fallback = NUMERIC_DEFAULTS[prop] ?? 0;
    if (!used[prop]) return fallback;
    const value = resolveValue(prop, fallback);
    return value === undefined ? fallback : value;
  };

  /** Worklet: properties that must never be invented (colors + radius). */
  const resolveOptional = (prop: string): number | string | undefined => {
    "worklet";
    if (!used[prop]) return undefined;
    return resolveValue(prop, undefined);
  };

  // One derived value per animatable property. Each re-runs ONLY when a discrete
  // state shared value changes — never every frame — and starts the animation.
  // Explicit dependencies are required on web when the Reanimated Babel/worklets
  // transform is not present (for example, inside the Next.js documentation app).
  // Give every hook its own array because Reanimated appends an internal hash to it.
  const webMotionInputs: unknown[] = [
    n,
    pressed,
    hovered,
    focused,
    dragging,
    semActive,
    isDisabled,
    mounted,
    entrance,
    rm,
  ];
  const opacity = useDerivedValue(
    () => resolveInvented("opacity"),
    [...webMotionInputs],
  );
  const scale = useDerivedValue(
    () => resolveInvented("scale"),
    [...webMotionInputs],
  );
  const scaleX = useDerivedValue(
    () => resolveInvented("scaleX"),
    [...webMotionInputs],
  );
  const scaleY = useDerivedValue(
    () => resolveInvented("scaleY"),
    [...webMotionInputs],
  );
  const translateX = useDerivedValue(
    () => resolveInvented("translateX"),
    [...webMotionInputs],
  );
  const translateY = useDerivedValue(
    () => resolveInvented("translateY"),
    [...webMotionInputs],
  );
  const rotate = useDerivedValue(
    () => resolveInvented("rotate"),
    [...webMotionInputs],
  );
  const rotateX = useDerivedValue(
    () => resolveInvented("rotateX"),
    [...webMotionInputs],
  );
  const rotateY = useDerivedValue(
    () => resolveInvented("rotateY"),
    [...webMotionInputs],
  );
  const backgroundColor = useDerivedValue(
    () => resolveOptional("backgroundColor"),
    [...webMotionInputs],
  );
  const borderColor = useDerivedValue(
    () => resolveOptional("borderColor"),
    [...webMotionInputs],
  );
  const color = useDerivedValue(
    () => resolveOptional("color"),
    [...webMotionInputs],
  );
  const borderRadius = useDerivedValue(
    () => resolveOptional("borderRadius"),
    [...webMotionInputs],
  );

  // useAnimatedStyle ONLY reads shared values and assembles the style. Motion owns the whole
  // transform array (composing the static operations it does not drive) and emits a property
  // only when it actually has a value for it, so a static style is never replaced by nothing.
  const animatedStyle = useAnimatedStyle(() => {
    const style: Record<string, unknown> = {};
    const transform: Record<string, number | string>[] = [];

    if (composedStaticTransform) {
      for (let i = 0; i < composedStaticTransform.length; i += 1) {
        transform.push(composedStaticTransform[i]);
      }
    }

    // Loop contribution takes precedence for its own property.
    let loopHandled = "";
    if (loopKind && !rm.value) {
      const p = loopProgress.value;
      if (loopKind === "spin") {
        transform.push({ rotate: `${p * 360}deg` });
        loopHandled = "rotate";
      } else if (loopKind === "pulse") {
        style.opacity = 1 - p * 0.5; // 1 -> 0.5 -> 1 (reverse repeat)
        loopHandled = "opacity";
      } else if (loopKind === "bounce") {
        transform.push({ translateY: -p * 8 });
        loopHandled = "translateY";
      } else if (loopKind === "shake") {
        transform.push({ translateX: (p - 0.5) * 8 });
        loopHandled = "translateX";
      } else if (loopKind === "wiggle") {
        transform.push({ rotate: `${(p - 0.5) * 6}deg` });
        loopHandled = "rotate";
      }
    }

    if (used.opacity && loopHandled !== "opacity")
      style.opacity = opacity.value;
    if (used.translateX && loopHandled !== "translateX")
      transform.push({ translateX: translateX.value as number });
    if (used.translateY && loopHandled !== "translateY")
      transform.push({ translateY: translateY.value as number });
    if (used.scale) transform.push({ scale: scale.value as number });
    if (used.scaleX) transform.push({ scaleX: scaleX.value as number });
    if (used.scaleY) transform.push({ scaleY: scaleY.value as number });
    if (used.rotate && loopHandled !== "rotate")
      transform.push({ rotate: rotate.value as string });
    if (used.rotateX) transform.push({ rotateX: rotateX.value as string });
    if (used.rotateY) transform.push({ rotateY: rotateY.value as string });

    if (transform.length > 0) style.transform = transform;

    const background = backgroundColor.value;
    if (background !== undefined) style.backgroundColor = background as string;
    const border = borderColor.value;
    if (border !== undefined) style.borderColor = border as string;
    const textColor = color.value;
    if (textColor !== undefined) style.color = textColor as string;
    const radius = borderRadius.value;
    if (radius !== undefined) style.borderRadius = radius as number;

    return style;
  }, [
    backgroundColor,
    borderColor,
    borderRadius,
    color,
    composedStaticTransform,
    loopKind,
    loopProgress,
    n,
    opacity,
    rm,
    rotate,
    rotateX,
    rotateY,
    scale,
    scaleX,
    scaleY,
    translateX,
    translateY,
  ]);

  // Interaction handlers set discrete shared values. Setting `.value` from JS is
  // safe here (these are discrete, not per-frame). Reset on cancel/blur.
  const handlers: MotionHandlers = React.useMemo(
    () => ({
      onPressIn: () => {
        pressed.value = true;
      },
      onPressOut: () => {
        pressed.value = false;
      },
      onHoverIn: () => {
        hovered.value = true;
      },
      onHoverOut: () => {
        hovered.value = false;
      },
      onFocus: () => {
        focused.value = true;
      },
      onBlur: () => {
        focused.value = false;
      },
      onPointerCancel: () => {
        pressed.value = false;
      },
    }),
    [pressed, hovered, focused],
  );

  const setDragging = React.useCallback(
    (value: boolean) => {
      dragging.value = value;
    },
    [dragging],
  );

  return {
    animatedStyle,
    handlers,
    /** Advanced: shared interaction state for specialized components. */
    state: { pressed, hovered, focused, dragging, semActive },
    setDragging,
    /** True when any motion is configured. */
    enabled: Object.keys(n.used).length > 0 || !!n.loop,
  };
}

/* -------------------------------------------------------------------------------------------------
 * Handler composition
 * -----------------------------------------------------------------------------------------------*/

const HANDLER_KEYS = [
  "onPressIn",
  "onPressOut",
  "onHoverIn",
  "onHoverOut",
  "onFocus",
  "onBlur",
  "onPointerCancel",
] as const;

/**
 * Merge user-provided handlers with motion handlers so BOTH run and each user
 * callback fires exactly once. Returns only the handler keys.
 */
export function composeMotionHandlers<T extends Record<string, unknown>>(
  userProps: T,
  motionHandlers: MotionHandlers,
): Partial<Record<(typeof HANDLER_KEYS)[number], (e: unknown) => void>> {
  const out: Partial<Record<string, (e: unknown) => void>> = {};
  for (const key of HANDLER_KEYS) {
    const userHandler = userProps[key] as ((e: unknown) => void) | undefined;
    const motionHandler = motionHandlers[key];
    if (userHandler || motionHandler) {
      out[key] = (e: unknown) => {
        userHandler?.(e);
        motionHandler?.(e);
      };
    }
  }
  return out;
}

/**
 * Lightweight interaction-state hook for specialized components that own their
 * animated style but still want the shared press/hover/focus contract.
 */
export function useMotionState() {
  const pressed = useSharedValue(false);
  const hovered = useSharedValue(false);
  const focused = useSharedValue(false);
  const dragging = useSharedValue(false);

  const handlers: MotionHandlers = React.useMemo(
    () => ({
      onPressIn: () => {
        pressed.value = true;
      },
      onPressOut: () => {
        pressed.value = false;
      },
      onHoverIn: () => {
        hovered.value = true;
      },
      onHoverOut: () => {
        hovered.value = false;
      },
      onFocus: () => {
        focused.value = true;
      },
      onBlur: () => {
        focused.value = false;
      },
      onPointerCancel: () => {
        pressed.value = false;
      },
    }),
    [pressed, hovered, focused],
  );

  return { pressed, hovered, focused, dragging, handlers };
}

/* -------------------------------------------------------------------------------------------------
 * Animated hosts
 *
 * Every host is a thin dispatcher: with no motion configured it renders the RAW React Native
 * host (no Reanimated hooks, shared values, styles or effects), otherwise it renders the
 * animated implementation. Hooks live in the animated implementations, so no hook is ever
 * called conditionally.
 * -----------------------------------------------------------------------------------------------*/

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type WithMotion<P> = P & SharedAnimationProps;

/**
 * Whether this host needs the animated implementation.
 *
 * Derived purely from props, so the decision is stable and testable. Note that toggling motion
 * on or off at runtime changes the rendered host and therefore remounts it: keep a motion prop
 * configured (for example a `false` idle animation plus a real active animation) if a host must
 * preserve native state such as text input focus.
 */
function useAnimatedHost(config: {
  animate?: AnimateProp;
  activeAnimate?: ActiveAnimateProp;
  defaultAnimate?: AnimateProp;
  defaultActiveAnimate?: ActiveAnimateProp;
}): boolean {
  return hasMotionConfig(config);
}

/** Static transform operations from the host's own `style` prop, memoized for the worklet. */
function useStaticTransform(
  style: StyleProp<unknown>,
): readonly Record<string, number | string>[] | undefined {
  return React.useMemo(() => {
    const flat = StyleSheet.flatten(style as StyleProp<ViewStyle>) as
      | { transform?: unknown }
      | undefined;
    const value = flat?.transform;
    if (!Array.isArray(value)) return undefined;
    const operations: Record<string, number | string>[] = [];
    for (const operation of value) {
      if (operation && typeof operation === "object") {
        operations.push({ ...(operation as Record<string, number | string>) });
      }
    }
    return operations.length > 0 ? operations : undefined;
  }, [style]);
}

type ViewHostProps = WithMotion<ViewProps> & { ref?: React.Ref<RNViewHost> };

function AnimatedMotionView({
  animate,
  activeAnimate,
  motionActive,
  reduceMotion,
  style,
  ref,
  ...props
}: ViewHostProps) {
  const staticTransform = useStaticTransform(style);
  const { animatedStyle } = useMotion({
    animate,
    activeAnimate,
    motionActive,
    reduceMotion,
    channel: "semantic",
    staticTransform,
  });
  return <Animated.View ref={ref} style={[style, animatedStyle]} {...props} />;
}

/** Animated View host. Canonical shorthand channel: `semantic`. */
export function MotionView({
  animate,
  activeAnimate,
  motionActive,
  reduceMotion,
  ...props
}: ViewHostProps) {
  const animated = useAnimatedHost({ animate, activeAnimate });
  if (!animated) {
    const { ref, ...rest } = props;
    return <RNViewComponent ref={ref} {...rest} />;
  }
  return (
    <AnimatedMotionView
      animate={animate}
      activeAnimate={activeAnimate}
      motionActive={motionActive}
      reduceMotion={reduceMotion}
      {...props}
    />
  );
}

type PressableHostProps = WithMotion<PressableProps> & {
  ref?: React.Ref<React.ComponentRef<typeof Pressable>>;
};

function AnimatedMotionPressable({
  animate,
  activeAnimate,
  motionActive,
  reduceMotion,
  style,
  ref,
  ...props
}: PressableHostProps) {
  const staticTransform = useStaticTransform(style as StyleProp<unknown>);
  const { animatedStyle, handlers } = useMotion({
    animate,
    activeAnimate,
    motionActive,
    reduceMotion,
    disabled: props.disabled ?? undefined,
    channel: "press",
    staticTransform,
  });
  const composed = composeMotionHandlers(
    props as Record<string, unknown>,
    handlers,
  );
  return (
    <AnimatedPressable
      ref={ref}
      style={[style as object, animatedStyle]}
      {...props}
      {...composed}
    />
  );
}

/** Animated Pressable host. Canonical shorthand channel: `press`. */
export function MotionPressable({
  animate,
  activeAnimate,
  motionActive,
  reduceMotion,
  ...props
}: PressableHostProps) {
  const animated = useAnimatedHost({ animate, activeAnimate });
  if (!animated) {
    const { ref, ...rest } = props;
    return <Pressable ref={ref} {...rest} />;
  }
  return (
    <AnimatedMotionPressable
      animate={animate}
      activeAnimate={activeAnimate}
      motionActive={motionActive}
      reduceMotion={reduceMotion}
      {...props}
    />
  );
}

type TextHostProps = WithMotion<TextProps> & { ref?: React.Ref<RNTextHost> };

function AnimatedMotionText({
  animate,
  activeAnimate,
  motionActive,
  reduceMotion,
  style,
  ref,
  ...props
}: TextHostProps) {
  const staticTransform = useStaticTransform(style as StyleProp<unknown>);
  const { animatedStyle } = useMotion({
    animate,
    activeAnimate,
    motionActive,
    reduceMotion,
    channel: "semantic",
    staticTransform,
  });
  return <Animated.Text ref={ref} style={[style, animatedStyle]} {...props} />;
}

/** Animated Text host. Canonical shorthand channel: `semantic`. */
export function MotionText({
  animate,
  activeAnimate,
  motionActive,
  reduceMotion,
  ...props
}: TextHostProps) {
  const animated = useAnimatedHost({ animate, activeAnimate });
  if (!animated) {
    const { ref, ...rest } = props;
    return <RNTextComponent ref={ref} {...rest} />;
  }
  return (
    <AnimatedMotionText
      animate={animate}
      activeAnimate={activeAnimate}
      motionActive={motionActive}
      reduceMotion={reduceMotion}
      {...props}
    />
  );
}

type TextInputHostProps = WithMotion<TextInputProps> & {
  ref?: React.Ref<React.ComponentRef<typeof TextInput>>;
};

function AnimatedMotionTextInput({
  animate,
  activeAnimate,
  motionActive,
  reduceMotion,
  style,
  ref,
  ...props
}: TextInputHostProps) {
  const staticTransform = useStaticTransform(style as StyleProp<unknown>);
  const { animatedStyle, handlers } = useMotion({
    animate,
    activeAnimate,
    motionActive,
    reduceMotion,
    channel: "focus",
    staticTransform,
  });
  const composed = composeMotionHandlers(
    props as Record<string, unknown>,
    handlers,
  );
  return (
    <AnimatedTextInput
      ref={ref}
      style={[style, animatedStyle]}
      {...props}
      {...composed}
    />
  );
}

/** Animated TextInput host. Canonical shorthand channel: `focus`. */
export function MotionTextInput({
  animate,
  activeAnimate,
  motionActive,
  reduceMotion,
  ...props
}: TextInputHostProps) {
  const animated = useAnimatedHost({ animate, activeAnimate });
  if (!animated) {
    const { ref, ...rest } = props;
    return <TextInput ref={ref} {...rest} />;
  }
  return (
    <AnimatedMotionTextInput
      animate={animate}
      activeAnimate={activeAnimate}
      motionActive={motionActive}
      reduceMotion={reduceMotion}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------------------------------
 * MotionSlot — `asChild` support
 * -----------------------------------------------------------------------------------------------*/

/** Merge two refs so both the caller's ref and ours receive the instance. */
function mergeRefs<T>(...refs: (React.Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") {
        ref(node);
      } else {
        (ref as React.RefObject<T | null>).current = node;
      }
    }
  };
}

/** Animated wrappers are memoized per child component type — never created during render. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const animatedTypeCache = new WeakMap<object, React.ComponentType<any>>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getAnimatedType(type: object): React.ComponentType<any> {
  const cached = animatedTypeCache.get(type);
  if (cached) return cached;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const created = Animated.createAnimatedComponent(
    type as any,
  ) as React.ComponentType<any>;
  animatedTypeCache.set(type, created);
  return created;
}

type MotionSlotProps = SharedAnimationProps & {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * Which state a shorthand `activeAnimate` target drives. A slot has no intrinsic host, so
   * this is explicit; it defaults to `semantic` (gated by `motionActive`).
   */
  channel?: MotionChannel;
};

function AnimatedMotionSlot({
  children,
  animate,
  activeAnimate,
  motionActive,
  reduceMotion,
  style,
  channel = "semantic",
}: MotionSlotProps) {
  const staticTransform = useStaticTransform(style as StyleProp<unknown>);
  const { animatedStyle, handlers } = useMotion({
    animate,
    activeAnimate,
    motionActive,
    reduceMotion,
    channel,
    staticTransform,
  });

  if (!React.isValidElement(children)) {
    if (__DEV__) {
      console.warn(
        "[motion] MotionSlot expects a single React element child. Rendering children unchanged.",
      );
    }
    return <>{children}</>;
  }

  const child = children as React.ReactElement<Record<string, unknown>> & {
    ref?: React.Ref<unknown>;
  };
  const childType = child.type;

  // Host strings ('View', 'div', …) can't be turned into animated hosts from here.
  if (typeof childType === "string") {
    if (__DEV__) {
      console.warn(
        `[motion] MotionSlot cannot animate the intrinsic element "${childType}". ` +
          "Wrap it in <Motion> instead, or use a component that forwards ref and style.",
      );
    }
    return child;
  }

  const AnimatedChild = getAnimatedType(childType as object);
  const childProps = child.props;
  const composed = composeMotionHandlers(childProps, handlers);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props: any = {
    ...childProps,
    ...composed,
    style: [childProps.style as StyleProp<ViewStyle>, style, animatedStyle],
    ref: mergeRefs(child.ref as React.Ref<unknown> | undefined),
  };

  return <AnimatedChild {...props} />;
}

/**
 * Render motion INTO a single child instead of adding a wrapper node.
 *
 * The child keeps its identity (event target, accessibility role, layout box); it receives the
 * animated style, the composed interaction handlers, and a merged ref. Use this when the thing
 * you want to animate is someone else's single element and an extra host would be wrong.
 *
 * Requirements: the child must forward `ref` and accept `style`. If it cannot, animation has
 * nowhere to attach — we warn in development and render the child untouched.
 *
 * With no motion configured the child is returned untouched (only `style` is merged), so a
 * slot costs nothing.
 */
export function MotionSlot(props: MotionSlotProps) {
  const animated = useAnimatedHost({
    animate: props.animate,
    activeAnimate: props.activeAnimate,
  });
  if (!animated) {
    const { children, style } = props;
    if (!React.isValidElement(children)) return <>{children}</>;
    if (!style) return <>{children}</>;
    const child = children as React.ReactElement<{
      style?: StyleProp<ViewStyle>;
    }>;
    return React.cloneElement(child, { style: [child.props.style, style] });
  }
  return <AnimatedMotionSlot {...props} />;
}

/* -------------------------------------------------------------------------------------------------
 * Stagger helper
 * -----------------------------------------------------------------------------------------------*/

/**
 * Build a per-index `animate` config so a list enters as a sequence rather than all at once.
 *
 * ```tsx
 * {items.map((item, i) => (
 *   <Motion key={item.id} animate={stagger('slide-up', i, 60)}>…</Motion>
 * ))}
 * ```
 */
export function stagger(
  base: MotionPresetName | AnimateConfig,
  index: number,
  step = 50,
): AnimateConfig {
  const config: AnimateConfig =
    typeof base === "string"
      ? {
          initial: motionPresets[base].initial,
          to: motionPresets[base].to,
          transition: motionPresets[base].transition,
        }
      : base;

  const transition: MotionTransition = config.transition ?? transitions.base;
  const delay = (transition.delay ?? 0) + index * step;

  return { ...config, transition: { ...transition, delay } };
}

/* -------------------------------------------------------------------------------------------------
 * Utility strings — sugar that COMPILES TO the object model above
 * -----------------------------------------------------------------------------------------------*/

const STRING_TRANSITIONS: Record<string, MotionTransition> = {
  "spring-soft": transitions.springSoft,
  "spring-snappy": transitions.springSnappy,
  "spring-bouncy": transitions.springBouncy,
};

const STATE_PREFIXES = [
  "press",
  "hover",
  "focus",
  "checked",
  "selected",
  "open",
  "expanded",
] as const;

/** `scale-95` → 0.95, `opacity-50` → 0.5, `translate-x-4` → 4, `rotate-45` → '45deg'. */
function numericToken(
  kind: string,
  raw: string,
): [keyof MotionTarget, number | `${number}deg`] | null {
  const negative = raw.startsWith("-");
  const n = Number(raw.replace("-", ""));
  if (Number.isNaN(n)) return null;
  const signed = negative ? -n : n;

  switch (kind) {
    case "scale":
      return ["scale", signed / 100];
    case "opacity":
      return ["opacity", signed / 100];
    case "translate-x":
      return ["translateX", signed];
    case "translate-y":
      return ["translateY", signed];
    case "rotate":
      return ["rotate", `${signed}deg`];
    default:
      return null;
  }
}

type ParsedStrings = { animate?: AnimateConfig; active?: ActiveAnimateConfig };

/**
 * Parse a bounded utility-string vocabulary into the canonical object config.
 *
 * Supported: presets (`fade-in`, `slide-up`, `zoom-in`, `pop`, `spin`, `pulse`, …),
 * transforms (`scale-*`, `translate-x-*`, `translate-y-*`, `rotate-*`, `opacity-*`),
 * transitions (`duration-*`, `delay-*`, `ease-*`, `spring-soft|snappy|bouncy`) and state
 * prefixes (`press:`, `hover:`, `focus:`, `checked:`, `selected:`, `open:`, `expanded:`).
 *
 * Unknown tokens warn in development and are ignored — they never reach a native view.
 */
export function parseMotionString(input: string): ParsedStrings {
  const out: ParsedStrings = {};
  const idle: AnimateConfig = {};
  const states: NonNullable<ActiveAnimateConfig["states"]> = {};
  let transition: MotionTransition | undefined;
  let delay: number | undefined;

  for (const rawToken of input.trim().split(/\s+/).filter(Boolean)) {
    // State-prefixed token → goes to activeAnimate.states
    const colon = rawToken.indexOf(":");
    if (colon > 0) {
      const prefix = rawToken.slice(0, colon);
      const token = rawToken.slice(colon + 1);
      if (!(STATE_PREFIXES as readonly string[]).includes(prefix)) {
        if (__DEV__)
          console.warn(
            `[motion] Unknown state prefix "${prefix}:" in "${input}".`,
          );
        continue;
      }
      const match = token.match(
        /^(scale|opacity|translate-x|translate-y|rotate)-(-?\d+)$/,
      );
      if (!match) {
        if (__DEV__)
          console.warn(`[motion] Unsupported state token "${rawToken}".`);
        continue;
      }
      const parsed = numericToken(match[1], match[2]);
      if (!parsed) continue;
      const key = prefix as (typeof STATE_PREFIXES)[number];
      const existing = states[key]?.to ?? {};
      states[key] = { to: { ...existing, [parsed[0]]: parsed[1] } };
      continue;
    }

    // Preset
    if (rawToken in motionPresets) {
      const preset = motionPresets[rawToken as MotionPresetName];
      if (preset.initial) idle.initial = { ...idle.initial, ...preset.initial };
      if (preset.to) idle.to = { ...idle.to, ...preset.to };
      if (preset.transition && !transition) transition = preset.transition;
      if (!preset.initial && !preset.to && !preset.loop && preset.exit) {
        devWarn(
          `[motion] The "${rawToken}" preset only describes an exit animation, which this engine ` +
            "does not run, so it has no effect.",
        );
      }
      continue;
    }

    // Named spring
    if (rawToken in STRING_TRANSITIONS) {
      transition = STRING_TRANSITIONS[rawToken];
      continue;
    }

    // duration-*/delay-*
    const timing = rawToken.match(/^(duration|delay)-(\d+)$/);
    if (timing) {
      const value = Number(timing[2]);
      if (timing[1] === "duration") {
        transition = { type: "timing", duration: value, easing: "ease-out" };
      } else {
        delay = value;
      }
      continue;
    }

    // ease-*
    if (
      rawToken === "ease-linear" ||
      rawToken === "ease-in" ||
      rawToken === "ease-out" ||
      rawToken === "ease-in-out"
    ) {
      const easing = rawToken === "ease-linear" ? "linear" : rawToken;
      transition = {
        type: "timing",
        duration:
          transition && transition.type === "timing"
            ? (transition.duration ?? durations.base)
            : durations.base,
        easing,
      };
      continue;
    }

    // Bare transform → idle target
    const transform = rawToken.match(
      /^(scale|opacity|translate-x|translate-y|rotate)-(-?\d+)$/,
    );
    if (transform) {
      const parsed = numericToken(transform[1], transform[2]);
      if (parsed) idle.to = { ...idle.to, [parsed[0]]: parsed[1] };
      continue;
    }

    if (__DEV__)
      console.warn(
        `[motion] Unknown animate token "${rawToken}" in "${input}".`,
      );
  }

  if (transition || delay !== undefined) {
    const base = transition ?? transitions.base;
    idle.transition = delay !== undefined ? { ...base, delay } : base;
  }

  if (Object.keys(idle).length > 0) out.animate = idle;
  if (Object.keys(states).length > 0) {
    out.active = {
      states,
      ...(idle.transition ? { transition: idle.transition } : {}),
    };
  }

  return out;
}

/**
 * `Motion` — standalone host for user-owned content. Defaults to a View host.
 * Pass `asChild` to merge the animation into a single child instead of adding a node.
 */
export function Motion({
  asChild,
  channel,
  ...props
}: WithMotion<ViewProps> & { asChild?: boolean; channel?: MotionChannel }) {
  if (asChild) {
    const {
      animate,
      activeAnimate,
      motionActive,
      reduceMotion,
      style,
      children,
    } = props;
    return (
      <MotionSlot
        animate={animate}
        activeAnimate={activeAnimate}
        motionActive={motionActive}
        reduceMotion={reduceMotion}
        channel={channel}
        style={style}
      >
        {children}
      </MotionSlot>
    );
  }
  return <MotionView {...props} />;
}

// Keep a named marker so the beta status is discoverable at runtime/tooling.
export const MOTION_BETA = true;

/**
 * @internal
 *
 * Engine internals exposed for the dedicated motion tests only. Not part of the public API;
 * do not import this from component code — the shape can change without notice.
 */
export const __motionInternals = {
  normalize,
  resolveAnimate,
  resolveActive,
  resolveMotionTarget,
  hasMotionConfig,
  entranceAllowed,
  NUMERIC_DEFAULTS,
  NO_INVENT_KEYS,
  resetDevWarnings: () => warnedMessages.clear(),
};
