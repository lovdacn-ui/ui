import { cn } from '@/lib/utils';
import * as ProgressPrimitive from '@rn-primitives/progress';
import { View } from '@/components/ui/primitives';
import { Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
} from 'react-native-reanimated';

function clampProgressValue(value: number | undefined | null) {
  return Math.min(100, Math.max(0, value ?? 0));
}

function Progress({
  className,
  value,
  indicatorClassName,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
  indicatorClassName?: string;
}) {
  const normalizedValue = clampProgressValue(value);

  return (
    <ProgressPrimitive.Root
      value={normalizedValue}
      className={cn('bg-primary/20 relative h-2 w-full overflow-hidden rounded-full', className)}
      {...props}>
      <Indicator value={normalizedValue} className={indicatorClassName} />
    </ProgressPrimitive.Root>
  );
}

export { Progress };

const Indicator = Platform.select({
  web: WebIndicator,
  native: NativeIndicator,
  default: NullIndicator,
});

type IndicatorProps = {
  value: number;
  className?: string;
};

function WebIndicator({ value, className }: IndicatorProps) {
  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <ProgressPrimitive.Indicator asChild>
      <View
        className={cn('bg-primary h-full w-full', className)}
        style={{ transform: `translateX(-${100 - value}%)` }}
      />
    </ProgressPrimitive.Indicator>
  );
}

function NativeIndicator({ value, className }: IndicatorProps) {
  const width = useDerivedValue(
    () =>
      withSpring(value, {
        overshootClamping: true,
      }),
    [value]
  );

  const indicator = useAnimatedStyle(() => {
    return {
      width: `${width.value}%`,
    };
  }, [width]);

  if (Platform.OS === 'web') {
    return null;
  }

  return (
    <ProgressPrimitive.Indicator asChild>
      <Animated.View style={indicator} className={cn('bg-foreground h-full', className)} />
    </ProgressPrimitive.Indicator>
  );
}

function NullIndicator(_props: IndicatorProps) {
  return null;
}
