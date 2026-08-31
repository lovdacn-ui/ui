import { View, type SharedAnimationProps } from '@preview/components/ui/primitives';
import * as AspectRatioPrimitive from '@rn-primitives/aspect-ratio';

function AspectRatio({
  animate,
  activeAnimate,
  motionActive,
  reduceMotion,
  children,
  ...props
}: React.ComponentProps<typeof AspectRatioPrimitive.Root> & SharedAnimationProps) {
  // Primitive-owned host: attach motion with `asChild` (no extra layout node), and only
  // when the caller asks for it so default rendering is unchanged.
  const hasMotion =
    animate !== undefined || activeAnimate !== undefined || motionActive !== undefined;

  if (!hasMotion) {
    return <AspectRatioPrimitive.Root {...props}>{children}</AspectRatioPrimitive.Root>;
  }

  // `asChild` replaces the primitive's host, so children must be handed to the animated host
  // explicitly — a JSX child always wins over a spread `children` prop.
  return (
    <AspectRatioPrimitive.Root {...props} asChild>
      <View
        animate={animate}
        activeAnimate={activeAnimate}
        motionActive={motionActive}
        reduceMotion={reduceMotion}>
        {children}
      </View>
    </AspectRatioPrimitive.Root>
  );
}

export { AspectRatio };
