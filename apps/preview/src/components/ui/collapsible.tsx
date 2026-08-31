import { Pressable, View, type SharedAnimationProps } from '@preview/components/ui/primitives';
import * as CollapsiblePrimitive from '@rn-primitives/collapsible';
import * as React from 'react';

/** True when the caller actually requested motion for this instance. */
function hasMotionProps(p: SharedAnimationProps) {
  return p.animate !== undefined || p.activeAnimate !== undefined || p.motionActive !== undefined;
}

/**
 * Local motion context.
 *
 * The primitive supports both controlled (`open`) and uncontrolled (`defaultOpen`) usage but
 * exposes no public context hook, so `props.open` alone is `undefined` for an uncontrolled
 * collapsible. The adapter resolves the real open state itself, drives the primitive from that
 * single source of truth, and publishes it to Trigger/Content. No primitive internals are used.
 */
const CollapsibleMotionContext = React.createContext<{ open: boolean } | null>(null);

/**
 * Collapsible keeps its layout/measurement behaviour in the primitive; `animate` /
 * `activeAnimate` attach to the visual hosts with `asChild` (one host, no extra node), and
 * only when the caller asks for motion so default rendering is unchanged.
 * Canonical active state: `expanded` (open).
 */
function Collapsible({
  animate,
  activeAnimate,
  motionActive,
  reduceMotion,
  open,
  defaultOpen,
  onOpenChange,
  children,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root> & SharedAnimationProps) {
  const isControlled = open !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen ?? false);
  const resolvedOpen = isControlled ? !!open : uncontrolledOpen;

  // One handler for both modes: mirror the state when uncontrolled, then notify the consumer
  // exactly once.
  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  const motionValue = React.useMemo(() => ({ open: resolvedOpen }), [resolvedOpen]);
  const scopedChildren = (
    <CollapsibleMotionContext.Provider value={motionValue}>{children}</CollapsibleMotionContext.Provider>
  );

  // The primitive is driven from the resolved state so the two can never disagree.
  const rootProps = { ...props, open: resolvedOpen, onOpenChange: handleOpenChange };

  if (!hasMotionProps({ animate, activeAnimate, motionActive })) {
    return <CollapsiblePrimitive.Root {...rootProps}>{scopedChildren}</CollapsiblePrimitive.Root>;
  }

  return (
    <CollapsiblePrimitive.Root {...rootProps} asChild>
      <View
        animate={animate}
        activeAnimate={activeAnimate}
        motionActive={motionActive ?? resolvedOpen}
        reduceMotion={reduceMotion}>
        {scopedChildren}
      </View>
    </CollapsiblePrimitive.Root>
  );
}

function CollapsibleTrigger({
  animate,
  activeAnimate,
  motionActive,
  reduceMotion,
  children,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Trigger> & SharedAnimationProps) {
  const rootMotion = React.useContext(CollapsibleMotionContext);

  if (!hasMotionProps({ animate, activeAnimate, motionActive })) {
    return <CollapsiblePrimitive.Trigger {...props}>{children}</CollapsiblePrimitive.Trigger>;
  }

  return (
    <CollapsiblePrimitive.Trigger {...props} asChild>
      <Pressable
        animate={animate}
        activeAnimate={activeAnimate}
        motionActive={motionActive ?? rootMotion?.open}
        reduceMotion={reduceMotion}>
        {children}
      </Pressable>
    </CollapsiblePrimitive.Trigger>
  );
}

function CollapsibleContent({
  animate,
  activeAnimate,
  motionActive,
  reduceMotion,
  children,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Content> & SharedAnimationProps) {
  const rootMotion = React.useContext(CollapsibleMotionContext);

  if (!hasMotionProps({ animate, activeAnimate, motionActive })) {
    return <CollapsiblePrimitive.Content {...props}>{children}</CollapsiblePrimitive.Content>;
  }

  return (
    <CollapsiblePrimitive.Content {...props} asChild>
      <View
        animate={animate}
        activeAnimate={activeAnimate}
        motionActive={motionActive ?? rootMotion?.open}
        reduceMotion={reduceMotion}>
        {children}
      </View>
    </CollapsiblePrimitive.Content>
  );
}

export { Collapsible, CollapsibleContent, CollapsibleTrigger };
