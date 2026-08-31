import { View, type SharedAnimationProps } from '@preview/components/ui/primitives';
import { cn } from '@preview/lib/utils';

/**
 * Skeleton — loading placeholder.
 *
 * ONE implementation for preview and registry (this previously drifted: preview used the
 * CSS class while the published registry shipped a hand-rolled Reanimated loop).
 *
 * Exactly ONE system owns the pulse at a time:
 * - `animate` omitted → the `animate-pulse` class owns it. Works with zero animation
 *   runtime, so a project that never installs motion still gets a pulsing skeleton.
 * - `animate` supplied (e.g. `"pulse"` or a custom config) → the motion engine owns it and
 *   the class is dropped, so the two never animate opacity simultaneously. Reduced motion
 *   is then handled by the engine.
 * - `animate={false}` → no pulse at all; a static placeholder.
 */
function Skeleton({
  className,
  animate,
  ...props
}: React.ComponentProps<typeof View> & React.RefAttributes<View> & SharedAnimationProps) {
  // `undefined` means "nobody asked for engine motion" → let CSS own the pulse.
  const cssOwnsPulse = animate === undefined;

  return (
    <View
      className={cn('bg-accent rounded-md', cssOwnsPulse && 'animate-pulse', className)}
      animate={animate}
      {...props}
    />
  );
}

export { Skeleton };
