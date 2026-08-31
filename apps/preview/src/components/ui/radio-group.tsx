import { View, type SharedAnimationProps } from '@preview/components/ui/primitives';
import { cn } from '@preview/lib/utils';
import * as RadioGroupPrimitive from '@rn-primitives/radio-group';
import * as React from 'react';
import { Platform } from 'react-native';

/** True when the caller actually requested motion for this instance. */
function hasMotionProps(p: SharedAnimationProps) {
  return p.animate !== undefined || p.activeAnimate !== undefined || p.motionActive !== undefined;
}

/**
 * Local motion context.
 *
 * The installed `@rn-primitives/radio-group` Root is controlled-only and exposes no public
 * context hook, so the item cannot read the group's value from the primitive. The adapter
 * publishes the root's value itself and the item compares it with its own value. Nothing here
 * depends on primitive internals.
 */
const RadioGroupMotionContext = React.createContext<{ value?: string } | null>(null);

function RadioGroup({
  className,
  animate,
  activeAnimate,
  motionActive,
  reduceMotion,
  children,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root> & SharedAnimationProps) {
  const motionValue = React.useMemo(() => ({ value: props.value }), [props.value]);
  const scopedChildren = (
    <RadioGroupMotionContext.Provider value={motionValue}>{children}</RadioGroupMotionContext.Provider>
  );

  const rootProps = { className: cn('gap-3', className), ...props };

  if (!hasMotionProps({ animate, activeAnimate, motionActive })) {
    return <RadioGroupPrimitive.Root {...rootProps}>{scopedChildren}</RadioGroupPrimitive.Root>;
  }

  // `asChild` replaces the primitive's host with the animated one, so the children have to be
  // handed to that host explicitly — a JSX child always wins over a spread `children` prop.
  return (
    <RadioGroupPrimitive.Root {...rootProps} asChild>
      <View
        animate={animate}
        activeAnimate={activeAnimate}
        motionActive={motionActive}
        reduceMotion={reduceMotion}>
        {scopedChildren}
      </View>
    </RadioGroupPrimitive.Root>
  );
}

function RadioGroupItem({
  className,
  animate,
  activeAnimate,
  motionActive,
  reduceMotion,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item> & SharedAnimationProps) {
  const rootMotion = React.useContext(RadioGroupMotionContext);

  // Item's canonical active state is `checked` (selected): derived from the root value unless
  // the caller drives it explicitly.
  const derivedActive =
    motionActive ?? (rootMotion ? rootMotion.value === props.value : undefined);

  const itemProps = {
    className: cn(
      'border-input dark:bg-input/30 aspect-square size-4 shrink-0 items-center justify-center rounded-full border shadow-sm shadow-black/5',
      Platform.select({
        web: 'focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive outline-none transition-all focus-visible:ring-[3px] disabled:cursor-not-allowed',
      }),
      props.disabled && 'opacity-50',
      className
    ),
    ...props,
  };

  const indicator = <RadioGroupPrimitive.Indicator className="bg-primary size-2 rounded-full" />;

  // Motion is opt-in per instance: `motionActive` is derived, but it never turns motion on.
  if (!hasMotionProps({ animate, activeAnimate, motionActive })) {
    return <RadioGroupPrimitive.Item {...itemProps}>{indicator}</RadioGroupPrimitive.Item>;
  }

  return (
    <RadioGroupPrimitive.Item {...itemProps} asChild>
      <View
        animate={animate}
        activeAnimate={activeAnimate}
        motionActive={derivedActive}
        reduceMotion={reduceMotion}>
        {indicator}
      </View>
    </RadioGroupPrimitive.Item>
  );
}

export { RadioGroup, RadioGroupItem };
