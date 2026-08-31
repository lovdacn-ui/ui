import { Text, type SharedAnimationProps } from '@preview/components/ui/primitives';
import { cn } from '@preview/lib/utils';
import * as LabelPrimitive from '@rn-primitives/label';
import { Platform } from 'react-native';

function Label({
  className,
  onPress,
  onLongPress,
  onPressIn,
  onPressOut,
  disabled,
  animate,
  activeAnimate,
  motionActive,
  reduceMotion,
  children,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Text> & SharedAnimationProps) {
  const textProps = {
    className: cn(
      'text-foreground text-sm font-medium',
      Platform.select({ web: 'leading-none' }),
      className
    ),
    ...props,
  };

  // The primitive owns the text host, so motion is attached with `asChild` — and only when
  // the caller asks for it, leaving default rendering untouched.
  const hasMotion =
    animate !== undefined || activeAnimate !== undefined || motionActive !== undefined;

  return (
    <LabelPrimitive.Root
      className={cn(
        'flex select-none flex-row items-center gap-2',
        Platform.select({
          web: 'cursor-default leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50',
        }),
        disabled && 'opacity-50'
      )}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}>
      {hasMotion ? (
        // `asChild` replaces the primitive's text host, so the label content must be handed to
        // the animated host explicitly — a JSX child always wins over a spread `children` prop.
        <LabelPrimitive.Text {...textProps} asChild>
          <Text
            animate={animate}
            activeAnimate={activeAnimate}
            motionActive={motionActive}
            reduceMotion={reduceMotion}>
            {children}
          </Text>
        </LabelPrimitive.Text>
      ) : (
        <LabelPrimitive.Text {...textProps}>{children}</LabelPrimitive.Text>
      )}
    </LabelPrimitive.Root>
  );
}

export { Label };
