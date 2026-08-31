import { Icon } from '@preview/components/ui/icon';
import { View, type SharedAnimationProps } from '@preview/components/ui/primitives';
import { cn } from '@preview/lib/utils';
import * as CheckboxPrimitive from '@rn-primitives/checkbox';
import { Check } from 'lucide-react-native';
import { Platform } from 'react-native';

const DEFAULT_HIT_SLOP = 24;

function Checkbox({
  className,
  checkedClassName,
  indicatorClassName,
  iconClassName,
  animate,
  activeAnimate,
  motionActive,
  reduceMotion,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root> &
  SharedAnimationProps & {
    checkedClassName?: string;
    indicatorClassName?: string;
    iconClassName?: string;
  }) {
  const rootProps = {
    className: cn(
      'border-input dark:bg-input/30 size-4 shrink-0 rounded-[4px] border shadow-sm shadow-black/5',
      Platform.select({
        web: 'focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive peer cursor-default outline-none transition-shadow focus-visible:ring-[3px] disabled:cursor-not-allowed',
        native: 'overflow-hidden',
      }),
      props.checked && cn('border-primary', checkedClassName),
      props.disabled && 'opacity-50',
      className
    ),
    hitSlop: DEFAULT_HIT_SLOP,
    ...props,
  };

  const indicator = (
    <CheckboxPrimitive.Indicator
      className={cn('bg-primary h-full w-full items-center justify-center', indicatorClassName)}>
      <Icon
        as={Check}
        size={12}
        strokeWidth={Platform.OS === 'web' ? 2.5 : 3.5}
        className={cn('text-primary-foreground', iconClassName)}
      />
    </CheckboxPrimitive.Indicator>
  );

  // Primitive-owned host: motion attaches with `asChild` (one host, no extra node), only when
  // requested. Checkbox's canonical active state is `checked`, so `activeAnimate` follows it
  // unless the caller drives `motionActive` explicitly.
  const hasMotion =
    animate !== undefined || activeAnimate !== undefined || motionActive !== undefined;

  if (!hasMotion) {
    return <CheckboxPrimitive.Root {...rootProps}>{indicator}</CheckboxPrimitive.Root>;
  }

  return (
    <CheckboxPrimitive.Root {...rootProps} asChild>
      <View
        animate={animate}
        activeAnimate={activeAnimate}
        motionActive={motionActive ?? props.checked}
        reduceMotion={reduceMotion}>
        {indicator}
      </View>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
