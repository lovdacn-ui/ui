import { Icon } from '@preview/components/ui/icon';
import { View } from '@preview/components/ui/primitives';
import { Text, TextClassContext } from '@preview/components/ui/text';
import { cn } from '@preview/lib/utils';
import type { LucideIcon } from 'lucide-react-native';
import * as React from 'react';

function Alert({
  className,
  variant,
  children,
  icon,
  iconClassName,
  ...props
}: React.ComponentProps<typeof View> & React.RefAttributes<View> & {
  icon: LucideIcon;
  variant?: 'default' | 'destructive';
  iconClassName?: string;
}) {
  return (
    <TextClassContext.Provider
      value={cn(
        'text-sm text-foreground',
        variant === 'destructive' && 'text-destructive',
        className
      )}>
      <View
        role="alert"
        className={cn(
          'bg-card border-border relative w-full gap-0.5 rounded-lg border px-4 py-3 text-left text-sm',
          className
        )}
        {...props}>
        <View className="absolute left-3.5 top-3">
          <Icon
            as={icon}
            className={cn('size-4', variant === 'destructive' && 'text-destructive', iconClassName)}
          />
        </View>
        {children}
      </View>
    </TextClassContext.Provider>
  );
}

function AlertTitle({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <Text
      className={cn('mb-1 ml-0.5 min-h-4 pl-6 leading-none tracking-tight font-medium', className)}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  const textClass = React.useContext(TextClassContext);
  return (
    <Text
      className={cn(
        'ml-0.5 pb-1.5 pl-6 text-muted-foreground text-sm',
        textClass?.includes('text-destructive') && 'text-destructive/90',
        className
      )}
      {...props}
    />
  );
}

export { Alert, AlertDescription, AlertTitle };
