/**
 * Minimal `react-native-reanimated` stub for the motion engine tests.
 *
 * Worklets are evaluated synchronously on the JS thread and every transition helper
 * resolves to its final value. That is exactly the property the plan's visibility tests
 * care about: whatever the engine emits on the FIRST evaluation is what static output and
 * the first client paint would contain.
 *
 * `useDerivedValue` returns a lazy getter so a test can mutate an interaction shared value
 * and re-read the animated style without a second React render.
 */
import * as React from 'react';

import { Pressable, Text, TextInput, View } from './react-native.mjs';

export function useSharedValue(initial) {
  const ref = React.useRef(null);
  if (ref.current === null) ref.current = { value: initial };
  return ref.current;
}

export function useDerivedValue(worklet, dependencies) {
  if (!Array.isArray(dependencies)) {
    throw new Error('useDerivedValue requires explicit web dependencies in the motion engine');
  }
  return {
    get value() {
      return worklet();
    },
  };
}

export function useAnimatedStyle(worklet, dependencies) {
  if (!Array.isArray(dependencies)) {
    throw new Error('useAnimatedStyle requires explicit web dependencies in the motion engine');
  }
  return worklet();
}

export function useReducedMotion() {
  return globalThis.__TEST_REDUCED_MOTION__ === true;
}

export const withTiming = (toValue) => toValue;
export const withSpring = (toValue) => toValue;
export const withDelay = (_delay, value) => value;
export const withRepeat = (value) => value;
export const withSequence = (...values) => values[values.length - 1];
export const cancelAnimation = () => {};
export const runOnJS = (fn) => fn;
export const runOnUI = (fn) => fn;
export const interpolate = (value) => value;
export const interpolateColor = (_value, _input, output) => output[output.length - 1];

const identity = (value) => value;
export const Easing = {
  linear: identity,
  ease: identity,
  quad: identity,
  in: () => identity,
  out: () => identity,
  inOut: () => identity,
  bezier: () => identity,
};

export const ReduceMotion = { System: 'system', Always: 'always', Never: 'never' };

function markAnimated(Component, displayName) {
  function AnimatedHost(props) {
    return React.createElement(Component, { ...props, __motionAnimated: true });
  }
  AnimatedHost.displayName = displayName;
  return AnimatedHost;
}

export function createAnimatedComponent(Component) {
  const name =
    (Component && (Component.displayName || Component.name)) || 'AnimatedComponent';
  return markAnimated(Component, `Animated.${name}`);
}

const Animated = {
  View: markAnimated(View, 'Animated.View'),
  Text: markAnimated(Text, 'Animated.Text'),
  ScrollView: markAnimated(View, 'Animated.ScrollView'),
  createAnimatedComponent,
};

export const FadeIn = { duration: () => FadeIn };
export const FadeOut = { duration: () => FadeOut };

export { Pressable, TextInput };
export default Animated;
