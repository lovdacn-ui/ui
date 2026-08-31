import { View, type SharedAnimationProps } from '@preview/components/ui/primitives';
import { cn } from '@preview/lib/utils';
import * as SeparatorPrimitive from '@rn-primitives/separator';

function Separator({
  className,
  orientation = 'horizontal',
  decorative = true,
  animate,
  activeAnimate,
  motionActive,
  reduceMotion,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root> & SharedAnimationProps) {
  const rootProps = {
    decorative,
    orientation,
    className: cn(
      'bg-border shrink-0',
      orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
      className
    ),
    ...props,
  };

  // The primitive owns this host, so animation is attached with `asChild` — one host, no
  // extra layout node. We only take that path when the caller actually asks for motion, so
  // rendering is unchanged (and free) otherwise.
  const hasMotion =
    animate !== undefined || activeAnimate !== undefined || motionActive !== undefined;

  if (!hasMotion) {
    return <SeparatorPrimitive.Root {...rootProps} />;
  }

  return (
    <SeparatorPrimitive.Root {...rootProps} asChild>
      <View
        animate={animate}
        activeAnimate={activeAnimate}
        motionActive={motionActive}
        reduceMotion={reduceMotion}
      />
    </SeparatorPrimitive.Root>
  );
}

export { Separator };
