import { Icon } from '@preview/components/ui/icon';
import { NativeOnlyAnimatedView } from '@preview/components/ui/native-only-animated-view';
import { cn } from '@preview/lib/utils';
import * as DialogPrimitive from '@rn-primitives/dialog';
import { X } from 'lucide-react-native';
import * as React from 'react';
import { durations, Text, View } from '@preview/components/ui/primitives';
import { Platform, type GestureResponderEvent, type ViewProps } from 'react-native';
import { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';

const BottomSheet = DialogPrimitive.Root;
const BottomSheetTrigger = DialogPrimitive.Trigger;
const BottomSheetPortal = DialogPrimitive.Portal;
const BottomSheetClose = DialogPrimitive.Close;

const FullWindowOverlay = Platform.OS === 'ios' ? RNFullWindowOverlay : React.Fragment;

function BottomSheetOverlay({
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
          'absolute bottom-0 left-0 right-0 top-0 z-50 flex justify-end bg-black/80',
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

interface BottomSheetContentProps extends React.ComponentProps<typeof DialogPrimitive.Content> {
  portalHost?: string;
}

function BottomSheetContent({
  className,
  portalHost,
  children,
  ...props
}: BottomSheetContentProps) {
  return (
    <BottomSheetPortal hostName={portalHost}>
      <BottomSheetOverlay>
        <DialogPrimitive.Content
          className={cn(
            'bg-background p-6 shadow-lg shadow-black/5 gap-6 text-sm z-50 flex flex-col w-full rounded-t-4xl border-t border-border max-h-[85%] pb-10',
            Platform.select({
              web: 'animate-in slide-in-from-bottom duration-250',
            }),
            className
          )}
          asChild={Platform.OS !== 'web'}
          {...props}>
          <NativeOnlyAnimatedView entering={SlideInDown.duration(durations.slow)} exiting={SlideOutDown.duration(durations.base)} className="w-full flex-col">
            {/* Drag Handle */}
            <View className="w-12 h-1 bg-muted rounded-full self-center mb-4" />
            
            <View className="w-full gap-4">
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
      </BottomSheetOverlay>
    </BottomSheetPortal>
  );
}

function BottomSheetHeader({ className, ...props }: ViewProps) {
  return (
    <View className={cn('flex flex-col gap-1.5 text-left', className)} {...props} />
  );
}

function BottomSheetFooter({ className, ...props }: ViewProps) {
  return (
    <View
      className={cn('flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-4', className)}
      {...props}
    />
  );
}

function BottomSheetTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn('text-foreground text-lg leading-tight font-semibold', className)}
      {...props}
    />
  );
}

function BottomSheetDescription({
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
  BottomSheet,
  BottomSheetClose,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetOverlay,
  BottomSheetPortal,
  BottomSheetTitle,
  BottomSheetTrigger,
};
