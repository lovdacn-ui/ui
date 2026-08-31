import { Icon } from '@preview/components/ui/icon';
import { Pressable, type SharedAnimationProps } from '@preview/components/ui/primitives';
import { TextClassContext } from '@preview/components/ui/text';
import { cn } from '@preview/lib/utils';
import * as TogglePrimitive from '@rn-primitives/toggle';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { Platform } from 'react-native';

const toggleVariants = cva(
  cn(
    'active:bg-muted group flex flex-row items-center justify-center hover:text-foreground aria-pressed:bg-muted focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive gap-1 rounded-4xl text-sm font-medium transition-colors',
    Platform.select({
      web: 'hover:bg-muted hover:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive inline-flex cursor-default whitespace-nowrap outline-none transition-[color,box-shadow] focus-visible:ring-[3px] disabled:pointer-events-none [&_svg]:pointer-events-none',
    })
  ),
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        outline: cn(
          'active:bg-accent shadow-sm shadow-black/5 border-input hover:bg-muted border bg-transparent',
          Platform.select({
            web: 'hover:bg-accent hover:text-accent-foreground',
          })
        ),
      },
      size: {
        default: 'h-10 min-w-10 px-2.5 sm:h-9 sm:min-w-9 sm:px-2',
        sm: 'h-9 min-w-9 px-2 sm:h-8 sm:min-w-8 sm:px-1.5',
        lg: 'h-11 min-w-11 px-3 sm:h-10 sm:min-w-10 sm:px-2.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

function Toggle({
  className,
  variant,
  size,
  animate,
  activeAnimate,
  motionActive,
  reduceMotion,
  children,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  SharedAnimationProps &
  VariantProps<typeof toggleVariants>) {
  const rootProps = {
    className: cn(
      toggleVariants({ variant, size }),
      props.disabled && 'opacity-50',
      props.pressed && 'bg-accent',
      className
    ),
    ...props,
  };

  // Toggle's canonical active state is the primitive's `pressed` (i.e. selected).
  const hasMotion =
    animate !== undefined || activeAnimate !== undefined || motionActive !== undefined;

  return (
    <TextClassContext.Provider
      value={cn(
        'text-sm text-foreground font-medium',
        props.pressed
          ? 'text-accent-foreground'
          : Platform.select({ web: 'group-hover:text-muted-foreground' }),
        className
      )}>
      {hasMotion ? (
        // `asChild` replaces the primitive's host, so children must be handed to the animated
        // host explicitly — a JSX child always wins over a spread `children` prop.
        <TogglePrimitive.Root {...rootProps} asChild>
          <Pressable
            animate={animate}
            activeAnimate={activeAnimate}
            motionActive={motionActive ?? props.pressed}
            reduceMotion={reduceMotion}>
            {children}
          </Pressable>
        </TogglePrimitive.Root>
      ) : (
        <TogglePrimitive.Root {...rootProps}>{children}</TogglePrimitive.Root>
      )}
    </TextClassContext.Provider>
  );
}

function ToggleIcon({ className, ...props }: React.ComponentProps<typeof Icon>) {
  const textClass = React.useContext(TextClassContext);
  return <Icon className={cn('size-4 shrink-0', textClass, className)} {...props} />;
}

export { Toggle, ToggleIcon, toggleVariants };
