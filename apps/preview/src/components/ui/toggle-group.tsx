import { Icon } from '@preview/components/ui/icon';
import { Pressable, View, type SharedAnimationProps } from '@preview/components/ui/primitives';
import { TextClassContext } from '@preview/components/ui/text';
import { toggleVariants } from '@preview/components/ui/toggle';
import { cn } from '@preview/lib/utils';
import * as ToggleGroupPrimitive from '@rn-primitives/toggle-group';
import type { VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { Platform } from 'react-native';

const ToggleGroupContext = React.createContext<VariantProps<typeof toggleVariants> | null>(null);

function ToggleGroup({
  className,
  variant,
  size,
  children,
  animate,
  activeAnimate,
  motionActive,
  reduceMotion,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> &
  SharedAnimationProps &
  VariantProps<typeof toggleVariants>) {
  const rootProps = {
    className: cn(
      'flex flex-row items-center rounded-md shadow-none',
      Platform.select({ web: 'w-fit' }),
      variant === 'outline' && 'shadow-sm shadow-black/5',
      className
    ),
    ...props,
  };

  const content = (
    <ToggleGroupContext.Provider value={{ variant, size }}>{children}</ToggleGroupContext.Provider>
  );

  const hasMotion =
    animate !== undefined || activeAnimate !== undefined || motionActive !== undefined;

  if (!hasMotion) {
    return <ToggleGroupPrimitive.Root {...rootProps}>{content}</ToggleGroupPrimitive.Root>;
  }

  return (
    <ToggleGroupPrimitive.Root {...rootProps} asChild>
      <View
        animate={animate}
        activeAnimate={activeAnimate}
        motionActive={motionActive}
        reduceMotion={reduceMotion}>
        {content}
      </View>
    </ToggleGroupPrimitive.Root>
  );
}

function useToggleGroupContext() {
  const context = React.useContext(ToggleGroupContext);
  if (context === null) {
    throw new Error(
      'ToggleGroup compound components cannot be rendered outside the ToggleGroup component'
    );
  }
  return context;
}

function ToggleGroupItem({
  className,
  children,
  variant,
  size,
  isFirst,
  isLast,
  animate,
  activeAnimate,
  motionActive,
  reduceMotion,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> &
  SharedAnimationProps &
  VariantProps<typeof toggleVariants> & {
    isFirst?: boolean;
    isLast?: boolean;
  }) {
  const context = useToggleGroupContext();
  const { value } = ToggleGroupPrimitive.useRootContext();
  const isSelected = ToggleGroupPrimitive.utils.getIsSelected(value, props.value);

  const itemProps = {
    className: cn(
      toggleVariants({
        variant: context.variant || variant,
        size: context.size || size,
      }),
      props.disabled && 'opacity-50',
      isSelected && 'bg-accent',
      'min-w-0 shrink-0 rounded-none shadow-none',
      isFirst && 'rounded-l-md',
      isLast && 'rounded-r-md',
      (context.variant === 'outline' || variant === 'outline') && 'border-l-0',
      (context.variant === 'outline' || variant === 'outline') && isFirst && 'border-l',
      Platform.select({
        web: 'flex-1 focus:z-10 focus-visible:z-10',
      }),
      className
    ),
    ...props,
  };

  // Item's canonical active state is `selected`.
  const hasMotion =
    animate !== undefined || activeAnimate !== undefined || motionActive !== undefined;

  return (
    <TextClassContext.Provider
      value={cn(
        'text-sm text-foreground font-medium',
        isSelected
          ? 'text-accent-foreground'
          : Platform.select({ web: 'group-hover:text-muted-foreground' })
      )}>
      {hasMotion ? (
        <ToggleGroupPrimitive.Item {...itemProps} asChild>
          <Pressable
            animate={animate}
            activeAnimate={activeAnimate}
            motionActive={motionActive ?? isSelected}
            reduceMotion={reduceMotion}>
            {children}
          </Pressable>
        </ToggleGroupPrimitive.Item>
      ) : (
        <ToggleGroupPrimitive.Item {...itemProps}>{children}</ToggleGroupPrimitive.Item>
      )}
    </TextClassContext.Provider>
  );
}

function ToggleGroupIcon({ className, ...props }: React.ComponentProps<typeof Icon>) {
  const textClass = React.useContext(TextClassContext);
  return <Icon className={cn('size-4 shrink-0', textClass, className)} {...props} />;
}

export { ToggleGroup, ToggleGroupIcon, ToggleGroupItem };
