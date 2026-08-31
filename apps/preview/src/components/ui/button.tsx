import { Pressable } from '@preview/components/ui/primitives';
import { TextClassContext } from '@preview/components/ui/text';
import { cn } from '@preview/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { Platform } from 'react-native';

const buttonVariants = cva(cn('focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-4xl border border-transparent bg-clip-padding focus-visible:ring-[3px] aria-invalid:ring-[3px]', '', '', '', '', '', '', '',
  'group shrink-0 flex-row items-center justify-center gap-2 shadow-none focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-4xl border border-transparent bg-clip-padding focus-visible:ring-[3px] aria-invalid:ring-[3px]',
  Platform.select({
    web: "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive whitespace-nowrap outline-none transition-all focus-visible:ring-[3px] disabled:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  })
),
  {
    variants: {
      variant: {
        default: cn('active:bg-primary/90 shadow-sm shadow-black/5 bg-primary hover:bg-primary/80',
          Platform.select({ web: 'hover:bg-primary/90' })
        ),
        destructive: cn('active:bg-destructive/90 shadow-sm shadow-black/5 bg-destructive/10 hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:bg-destructive/20 focus-visible:border-destructive/40 dark:hover:bg-destructive/30',
          Platform.select({
            web: 'hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40',
          })
        ),
        outline: cn('active:bg-accent dark:bg-input/30 dark:border-input dark:active:bg-input/50 border shadow-sm shadow-black/5 border-border bg-input/30 hover:bg-input/50 aria-expanded:bg-muted',
          Platform.select({
            web: 'hover:bg-accent dark:hover:bg-input/50',
          })
        ),
        secondary: cn('active:bg-secondary/80 shadow-sm shadow-black/5 bg-secondary aria-expanded:bg-secondary',
          Platform.select({ web: 'hover:bg-secondary/80' })
        ),
        ghost: cn('active:bg-accent dark:active:bg-accent/50 hover:bg-muted dark:hover:bg-muted/50 aria-expanded:bg-muted',
          Platform.select({ web: 'hover:bg-accent dark:hover:bg-accent/50' })
        ),
        link: '',
      },
      size: {
        default: cn('py-2 sm:h-9 h-9 gap-1.5 px-3', Platform.select({ web: 'has-[>svg]:px-3' })),
        sm: cn('rounded-md sm:h-8 h-8 gap-1 px-3', Platform.select({ web: 'has-[>svg]:px-2.5' })),
        lg: cn('rounded-md sm:h-10 h-10 gap-1.5 px-4', Platform.select({ web: 'has-[>svg]:px-4' })),
        icon: 'sm:h-9 sm:w-9 size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const buttonTextVariants = cva(cn('text-sm font-medium', '', '', '', '', '', '', '',
  'text-foreground text-sm font-medium',
  Platform.select({ web: 'pointer-events-none transition-colors' })
),
  {
    variants: {
      variant: {
        default: 'text-primary-foreground',
        destructive: 'text-destructive',
        outline: cn('group-active:text-accent-foreground hover:text-foreground aria-expanded:text-foreground',
          Platform.select({ web: 'group-hover:text-accent-foreground' })
        ),
        secondary: 'text-secondary-foreground aria-expanded:text-secondary-foreground',
        ghost: 'group-active:text-accent-foreground hover:text-foreground aria-expanded:text-foreground',
        link: cn('group-active:underline text-primary underline-offset-4 hover:underline',
          Platform.select({ web: 'underline-offset-4 hover:underline group-hover:underline' })
        ),
      },
      size: {
        default: '',
        sm: '',
        lg: '',
        icon: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

type ButtonProps = React.ComponentProps<typeof Pressable> &
  React.RefAttributes<typeof Pressable> &
  VariantProps<typeof buttonVariants>;

function Button({ className, variant, size, activeAnimate, ...props }: ButtonProps) {
  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
      <Pressable
        className={cn(props.disabled && 'opacity-50', buttonVariants({ variant, size }), className)}
        role="button"
        // Button owns its default press feedback. With the plain primitives this prop
        // is ignored (no animation runtime); after `lovdacn add motion` it animates.
        // Callers override with `activeAnimate={…}` or opt out with `activeAnimate={false}`.
        activeAnimate={activeAnimate ?? 'press'}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };
