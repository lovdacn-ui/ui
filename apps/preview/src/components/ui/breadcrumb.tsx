import { Icon } from '@preview/components/ui/icon';
import { Text, TextClassContext } from '@preview/components/ui/text';
import { cn } from '@preview/lib/utils';
import { Slot } from '@rn-primitives/slot';
import { ChevronRight, MoreHorizontal } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from '@preview/components/ui/primitives';
import { Platform } from 'react-native';

function Breadcrumb({ ...props }: React.ComponentProps<typeof View>) {
  return <View accessibilityLabel="breadcrumb" {...props} />;
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<typeof View>) {
  return (
    <TextClassContext.Provider value="text-muted-foreground text-sm">
      <View
        className={cn('flex-row flex-wrap items-center gap-1.5', className)}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<typeof View>) {
  return <View className={cn('flex-row items-center gap-1.5', className)} {...props} />;
}

type BreadcrumbLinkProps = React.ComponentProps<typeof Pressable> & {
  asChild?: boolean;
};

function BreadcrumbLink({ asChild, className, ...props }: BreadcrumbLinkProps) {
  const Component = asChild ? Slot : Pressable;
  return (
    <TextClassContext.Provider
      value={cn(
        'text-muted-foreground text-sm',
        Platform.select({ web: 'transition-colors group-hover:text-foreground' })
      )}
    >
      <Component
        accessibilityRole="link"
        className={cn('group', Platform.select({ web: 'hover:text-foreground' }), className)}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<typeof Text>) {
  return (
    <Text
      role="none"
      aria-current="page"
      className={cn('text-foreground text-sm font-normal', className)}
      {...props}
    />
  );
}

function BreadcrumbSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View role="presentation" className={cn(className)} {...props}>
      {children ?? <Icon as={ChevronRight} className="text-muted-foreground size-3.5" />}
    </View>
  );
}

function BreadcrumbEllipsis({ className, ...props }: React.ComponentProps<typeof View>) {
  return (
    <View
      role="presentation"
      accessibilityLabel="More"
      className={cn('size-9 items-center justify-center', className)}
      {...props}
    >
      <Icon as={MoreHorizontal} className="text-muted-foreground size-4" />
    </View>
  );
}

export {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
};
