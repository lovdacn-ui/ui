import { Pressable, View, type SharedAnimationProps } from '@preview/components/ui/primitives';
import { TextClassContext } from '@preview/components/ui/text';
import { cn } from '@preview/lib/utils';
import * as TabsPrimitive from '@rn-primitives/tabs';
import { Platform } from 'react-native';

/** True when the caller actually requested motion for this instance. */
function hasMotionProps(p: SharedAnimationProps) {
  return p.animate !== undefined || p.activeAnimate !== undefined || p.motionActive !== undefined;
}

function Tabs({
  className,
  animate,
  activeAnimate,
  motionActive,
  reduceMotion,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root> & SharedAnimationProps) {
  const rootProps = { className: cn('flex flex-col gap-2', className), ...props };

  if (!hasMotionProps({ animate, activeAnimate, motionActive })) {
    return <TabsPrimitive.Root {...rootProps}>{children}</TabsPrimitive.Root>;
  }

  // `asChild` replaces the primitive's host, so children must be handed to the animated host
  // explicitly — a JSX child always wins over a spread `children` prop.
  return (
    <TabsPrimitive.Root {...rootProps} asChild>
      <View
        animate={animate}
        activeAnimate={activeAnimate}
        motionActive={motionActive}
        reduceMotion={reduceMotion}>
        {children}
      </View>
    </TabsPrimitive.Root>
  );
}

function TabsList({
  className,
  animate,
  activeAnimate,
  motionActive,
  reduceMotion,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & SharedAnimationProps) {
  const listProps = {
    className: cn(
      'bg-muted flex h-9 flex-row items-center justify-center rounded-4xl p-[3px]',
      Platform.select({ web: 'inline-flex w-fit', native: 'mr-auto' }),
      className
    ),
    ...props,
  };

  if (!hasMotionProps({ animate, activeAnimate, motionActive })) {
    return <TabsPrimitive.List {...listProps}>{children}</TabsPrimitive.List>;
  }

  return (
    <TabsPrimitive.List {...listProps} asChild>
      <View
        animate={animate}
        activeAnimate={activeAnimate}
        motionActive={motionActive}
        reduceMotion={reduceMotion}>
        {children}
      </View>
    </TabsPrimitive.List>
  );
}

function TabsTrigger({
  className,
  animate,
  activeAnimate,
  motionActive,
  reduceMotion,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger> & SharedAnimationProps) {
  const { value } = TabsPrimitive.useRootContext();
  const isSelected = props.value === value;

  const triggerProps = {
    className: cn(
      'flex flex-row items-center justify-center shadow-none shadow-black/5 gap-1.5 rounded-xl border border-transparent px-2 py-1 text-sm font-medium',
      Platform.select({
        web: 'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring h-full inline-flex cursor-default whitespace-nowrap transition-[color,box-shadow] focus-visible:outline-1 focus-visible:ring-[3px] disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0',
        native: 'h-full py-0',
      }),
      props.disabled && 'opacity-50',
      isSelected && 'bg-background dark:border-foreground/10 dark:bg-input/30',
      className
    ),
    ...props,
  };

  return (
    <TextClassContext.Provider
      value={cn(
        'text-foreground dark:text-muted-foreground text-sm font-medium',
        value === props.value && 'dark:text-foreground'
      )}>
      {hasMotionProps({ animate, activeAnimate, motionActive }) ? (
        <TabsPrimitive.Trigger {...triggerProps} asChild>
          {/* Trigger's canonical active state is `selected`. `asChild` replaces the primitive's
              host, so children must be handed to the animated host explicitly. */}
          <Pressable
            animate={animate}
            activeAnimate={activeAnimate}
            motionActive={motionActive ?? isSelected}
            reduceMotion={reduceMotion}>
            {children}
          </Pressable>
        </TabsPrimitive.Trigger>
      ) : (
        <TabsPrimitive.Trigger {...triggerProps}>{children}</TabsPrimitive.Trigger>
      )}
    </TextClassContext.Provider>
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn(Platform.select({ web: 'flex-1 outline-none' }), '', className)}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
