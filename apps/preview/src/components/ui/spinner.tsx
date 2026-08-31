import * as React from 'react';
import { View } from '@preview/components/ui/primitives';
import { ActivityIndicator } from 'react-native';
import { cn } from '@preview/lib/utils';
import { Loader2 } from 'lucide-react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface SpinnerProps extends React.ComponentPropsWithoutRef<typeof View> {
  size?: 'small' | 'large' | number;
  color?: string;
  nativeOnly?: boolean;
}

function Spinner({ className, size = 'small', color, nativeOnly = false, ref, ...props }: SpinnerProps & { ref?: React.Ref<View> }) {
  if (nativeOnly) {
    return (
      <View ref={ref} className={cn('items-center justify-center', className)} {...props}>
        <ActivityIndicator size={typeof size === 'number' ? 'small' : size} color={color} />
      </View>
    );
  }

  const iconSize = typeof size === 'number' ? size : size === 'large' ? 36 : 24;

  return (
    <View ref={ref} className={cn('items-center justify-center', className)} {...props}>
      <AnimatedSpinnerIcon size={iconSize} color={color} />
    </View>
  );
}

function AnimatedSpinnerIcon({ size, color }: { size: number; color?: string }) {
  const rotation = useSharedValue(0);

  React.useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 1000,
        easing: Easing.linear,
      }),
      -1,
      false
    );

    return () => {
      cancelAnimation(rotation);
      rotation.value = 0;
    };
  }, [rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }), [rotation]);

  return (
    <Animated.View style={animatedStyle}>
      <Loader2 size={size} color={color} className="text-primary" />
    </Animated.View>
  );
}

Spinner.displayName = 'Spinner';

export { Spinner };
export type { SpinnerProps };
