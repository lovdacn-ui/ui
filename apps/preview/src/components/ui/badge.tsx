import { View } from '@preview/components/ui/primitives';
import { TextClassContext } from '@preview/components/ui/text';
import { cn } from '@preview/lib/utils';
import { Slot } from '@rn-primitives/slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Platform } from 'react-native';

const badgeVariants = cva(cn('h-5 gap-1 rounded-4xl border border-transparent px-2 py-0.5 transition-all','','','','','','','',
    'group shrink-0 flex-row items-center justify-center overflow-hidden h-5 gap-1 rounded-4xl border border-transparent px-2 py-0.5 transition-all',
    Platform.select({
      web: 'focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive w-fit whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] [&>svg]:pointer-events-none [&>svg]:size-3',
    })
  ),
  {
    variants: {
      variant: {
        default: cn('border-transparent bg-primary',
          Platform.select({ web: '[a&]:hover:bg-primary/90' })
        ),
        secondary: cn('border-transparent bg-secondary',
          Platform.select({ web: '[a&]:hover:bg-secondary/90' })
        ),
        destructive: cn('border-transparent bg-destructive/10 focus-visible:ring-destructive/20 dark:bg-destructive/20',
          Platform.select({ web: '[a&]:hover:bg-destructive/90' })
        ),
        outline: Platform.select({ web: '[a&]:hover:bg-accent [a&]:hover:text-accent-foreground' }),
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const badgeTextVariants = cva('text-xs font-medium', {
  variants: {
    variant: {
      default: 'text-primary-foreground',
      secondary: 'text-secondary-foreground',
      destructive: 'text-white',
      outline: 'text-foreground',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

type BadgeProps = React.ComponentProps<typeof View> & React.RefAttributes<View> & {
  asChild?: boolean;
} & VariantProps<typeof badgeVariants>;

function Badge({ className, variant, asChild, ...props }: BadgeProps) {
  const Component = asChild ? Slot : View;
  return (
    <TextClassContext.Provider value={badgeTextVariants({ variant })}>
      <Component className={cn(badgeVariants({ variant }), className)} {...props} />
    </TextClassContext.Provider>
  );
}

export { Badge, badgeTextVariants, badgeVariants };
export type { BadgeProps };
