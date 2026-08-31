import { View, type SharedAnimationProps } from '@preview/components/ui/primitives';
import { cn } from '@preview/lib/utils';
import * as AvatarPrimitive from '@rn-primitives/avatar';

/** True when the caller actually requested motion for this instance. */
function hasMotionProps(p: SharedAnimationProps) {
  return p.animate !== undefined || p.activeAnimate !== undefined || p.motionActive !== undefined;
}

function Avatar({
  className,
  animate,
  activeAnimate,
  motionActive,
  reduceMotion,
  children,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root> & SharedAnimationProps) {
  const rootProps = {
    className: cn('relative flex size-8 shrink-0 overflow-hidden rounded-full', className),
    ...props,
  };

  // Primitive-owned host: motion is attached with `asChild` (one host, no extra node) and
  // only when requested, so default rendering is untouched.
  if (!hasMotionProps({ animate, activeAnimate, motionActive })) {
    return <AvatarPrimitive.Root {...rootProps}>{children}</AvatarPrimitive.Root>;
  }

  // `asChild` replaces the primitive's host, so children must be handed to the animated host
  // explicitly — a JSX child always wins over a spread `children` prop.
  return (
    <AvatarPrimitive.Root {...rootProps} asChild>
      <View
        animate={animate}
        activeAnimate={activeAnimate}
        motionActive={motionActive}
        reduceMotion={reduceMotion}>
        {children}
      </View>
    </AvatarPrimitive.Root>
  );
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return <AvatarPrimitive.Image className={cn('aspect-square size-full', className)} {...props} />;
}

function AvatarFallback({
  className,
  animate,
  activeAnimate,
  motionActive,
  reduceMotion,
  children,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback> & SharedAnimationProps) {
  const fallbackProps = {
    className: cn(
      'bg-muted flex size-full flex-row items-center justify-center rounded-full',
      className
    ),
    ...props,
  };

  if (!hasMotionProps({ animate, activeAnimate, motionActive })) {
    return <AvatarPrimitive.Fallback {...fallbackProps}>{children}</AvatarPrimitive.Fallback>;
  }

  return (
    <AvatarPrimitive.Fallback {...fallbackProps} asChild>
      <View
        animate={animate}
        activeAnimate={activeAnimate}
        motionActive={motionActive}
        reduceMotion={reduceMotion}>
        {children}
      </View>
    </AvatarPrimitive.Fallback>
  );
}

export { Avatar, AvatarFallback, AvatarImage };
