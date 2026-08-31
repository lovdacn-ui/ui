import { Icon } from '@preview/components/ui/icon';
import { NativeOnlyAnimatedView } from '@preview/components/ui/native-only-animated-view';
import { cn } from '@preview/lib/utils';
import * as DialogPrimitive from '@rn-primitives/dialog';
import { X } from 'lucide-react-native';
import * as React from 'react';
import { durations, Text, View } from '@preview/components/ui/primitives';
import { Platform, type GestureResponderEvent, type ViewProps } from 'react-native';
import {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideInLeft,
  SlideInRight,
  SlideInUp,
  SlideOutDown,
  SlideOutLeft,
  SlideOutRight,
  SlideOutUp,
} from 'react-native-reanimated';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetPortal = DialogPrimitive.Portal;
const SheetClose = DialogPrimitive.Close;

const FullWindowOverlay = Platform.OS === 'ios' ? RNFullWindowOverlay : React.Fragment;

type SheetSide = 'top' | 'bottom' | 'left' | 'right';

const SheetSideContext = React.createContext<{ side: SheetSide }>({ side: 'right' });

function SheetOverlay({
  className,
  children,
  onPress,
  ...props
}: Omit<React.ComponentProps<typeof DialogPrimitive.Overlay>, 'asChild'> & {
  children?: React.ReactNode;
}) {
  const { onOpenChange } = DialogPrimitive.useRootContext();

  function onOverlayPress(event: GestureResponderEvent) {
    onPress?.(event);
    if (event.target === event.currentTarget && !event.isDefaultPrevented()) {
      onOpenChange(false);
    }
  }

  return (
    <FullWindowOverlay>
      <DialogPrimitive.Overlay
        className={cn(
          'absolute bottom-0 left-0 right-0 top-0 z-50 flex bg-black/80',
          Platform.select({
            web: 'fixed cursor-default [&>*]:cursor-auto',
          }),
          className
        )}
        {...props}
        onPress={Platform.select({ web: onOverlayPress, native: onPress })}
        asChild={Platform.OS !== 'web'}>
        <NativeOnlyAnimatedView entering={FadeIn.duration(durations.base)} exiting={FadeOut.duration(durations.fast)}>
          <>{children}</>
        </NativeOnlyAnimatedView>
      </DialogPrimitive.Overlay>
    </FullWindowOverlay>
  );
}

interface SheetContentProps extends React.ComponentProps<typeof DialogPrimitive.Content> {
  side?: SheetSide;
  portalHost?: string;
}

function SheetContent({
  className,
  portalHost,
  side = 'right',
  children,
  ...props
}: SheetContentProps) {
  const enteringAnimation = {
    left: SlideInLeft,
    right: SlideInRight,
    top: SlideInUp,
    bottom: SlideInDown,
  }[side].duration(durations.slow);

  const exitingAnimation = {
    left: SlideOutLeft,
    right: SlideOutRight,
    top: SlideOutUp,
    bottom: SlideOutDown,
  }[side].duration(durations.base);

  const sideStyles = {
    left: 'left-0 h-full border-r border-border max-w-sm w-4/5',
    right: 'right-0 h-full border-l border-border max-w-sm w-4/5',
    top: 'top-0 w-full border-b border-border max-h-sm h-1/3',
    bottom: 'bottom-0 w-full border-t border-border max-h-sm h-1/3',
  };

  const webAnimations = {
    left: 'animate-in slide-in-from-left duration-250',
    right: 'animate-in slide-in-from-right duration-250',
    top: 'animate-in slide-in-from-top duration-250',
    bottom: 'animate-in slide-in-from-bottom duration-250',
  };

  return (
    <SheetPortal hostName={portalHost}>
      <SheetOverlay>
        <SheetSideContext.Provider value={{ side }}>
          <DialogPrimitive.Content
            className={cn(
              'absolute bg-background p-6 shadow-lg shadow-black/5 gap-6 text-sm z-50 flex flex-col',
              sideStyles[side],
              Platform.select({
                web: webAnimations[side],
              }),
              className
            )}
            asChild={Platform.OS !== 'web'}
            {...props}>
            <NativeOnlyAnimatedView entering={enteringAnimation} exiting={exitingAnimation} className="h-full w-full justify-between">
              <View className="flex-1 gap-6">
                {children}
              </View>
              <DialogPrimitive.Close
                className={cn(
                  'rounded opacity-70 active:opacity-100 absolute top-4 right-4',
                  Platform.select({
                    web: 'ring-offset-background focus:ring-ring data-[state=open]:bg-accent transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2',
                  })
                )}
                hitSlop={12}>
                <Icon
                  as={X}
                  className={cn('text-accent-foreground web:pointer-events-none size-4 shrink-0')}
                />
                <Text className="sr-only">Close</Text>
              </DialogPrimitive.Close>
            </NativeOnlyAnimatedView>
          </DialogPrimitive.Content>
        </SheetSideContext.Provider>
      </SheetOverlay>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: ViewProps) {
  return (
    <View className={cn('flex flex-col gap-2', className)} {...props} />
  );
}

function SheetFooter({ className, ...props }: ViewProps) {
  return (
    <View
      className={cn('flex flex-col-reverse sm:flex-row sm:justify-end gap-2', className)}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn('text-foreground text-lg leading-tight font-semibold', className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};
