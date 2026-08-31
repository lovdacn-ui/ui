/**
 * primitives — host indirection layer for lovdaCN. [MOTION-AWARE VARIANT]
 *
 * Installed by `lovdacn add motion`, replacing the plain variant. Because every
 * component renders its host from this file, swapping this one file upgrades the
 * whole library: `animate` / `activeAnimate` now work everywhere, with no changes
 * to the components themselves.
 *
 * Components keep importing exactly the same names:
 *
 *   import { Pressable, View, Text, TextInput } from '@preview/components/ui/primitives';
 *
 * These hosts are engine-backed (see `@preview/components/ui/motion`): animations run on
 * the UI thread, user handlers are composed rather than replaced, refs resolve to
 * the underlying host, and system reduced-motion is respected by default.
 *
 * Hosts are intentionally generic — they apply no default animation. Each component
 * owns its own default (e.g. Button passes `activeAnimate ?? 'press'`).
 *
 * ## What these hosts guarantee
 *
 * - **No motion, no cost.** With no `animate` / `activeAnimate` configured (or with them set
 *   to `false`), the host renders the RAW React Native component: no Reanimated hooks, shared
 *   values, animated style or effects. Adding a motion prop switches to the animated host.
 * - **Visible by default.** Entrance animations only start hidden where a hidden first frame
 *   cannot be mistaken for missing content (native, and web mounts after page load). Static
 *   web output, hydration and reduced motion always render final, visible values.
 * - **Canonical state routing.** A shorthand `activeAnimate` target follows the host: press
 *   for `Pressable`, focus for `TextInput`, semantic (`motionActive`) for `View` / `Text`.
 * - **Explicit style ownership.** Motion owns the whole `transform` array once it animates any
 *   transform key, composing static operations from the `style` prop in front of its own.
 *   Colors and `borderRadius` are never invented: they animate only when both an idle and an
 *   active endpoint are supplied.
 *
 * The full contract lives in the header of `@preview/components/ui/motion`.
 */

/** Marker: tells the CLI this file is the motion-aware variant so a later plain
 *  install cannot overwrite it. Do not remove. */
export const MOTION_PRIMITIVES = true;

export {
  MotionPressable as Pressable,
  MotionText as Text,
  MotionTextInput as TextInput,
  MotionView as View,
  // Shared timing vocabulary. Mirrored by the plain seam so components can use these
  // tokens without ever depending on the animation engine.
  durations,
  transitions,
} from '@preview/components/ui/motion';

/**
 * Host INSTANCE types, exported under the same names as the components above so this
 * variant is a drop-in replacement for the plain seam. TypeScript keeps types and values
 * in separate declaration spaces, so `View` is both the component and the host instance
 * type — `React.RefAttributes<View>` in component code keeps resolving to the real
 * native host, which is what refs still point at.
 */
import type {
  Pressable as RNPressable,
  Text as RNText,
  TextInput as RNTextInput,
  View as RNView,
} from 'react-native';

export type View = RNView;
export type Text = RNText;
export type TextInput = RNTextInput;
export type Pressable = React.ComponentRef<typeof RNPressable>;

/**
 * Type surface kept EXACTLY in sync with the plain seam so the two files stay drop-in
 * replacements for one another. Engine-only types (e.g. `MotionChannel`) are intentionally not
 * re-exported here — import them from `@preview/components/ui/motion` if you need them.
 */
export type {
  ActiveAnimateConfig,
  ActiveAnimateProp,
  ActiveState,
  ActiveStateConfig,
  AnimateConfig,
  AnimateProp,
  MotionPresetName,
  MotionTarget,
  MotionTransition,
  MotionUtilityString,
  SharedAnimationProps,
} from '@preview/components/ui/motion';
