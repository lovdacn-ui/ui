import { durations } from '@preview/components/ui/primitives';
import { NativeOnlyAnimatedView } from '@preview/components/ui/native-only-animated-view';
import { TextClassContext } from '@preview/components/ui/text';
import { cn } from '@preview/lib/utils';
import * as TooltipPrimitive from '@rn-primitives/tooltip';
import * as React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { FadeIn, FadeOut } from 'react-native-reanimated';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const FullWindowOverlay = Platform.OS === 'ios' ? RNFullWindowOverlay : React.Fragment;

function TooltipContent({
  className,
  sideOffset = 4,
  portalHost,
  side = 'top',
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content> & {
    portalHost?: string;
  }) {
  return (
    <TooltipPrimitive.Portal hostName={portalHost}>
      <FullWindowOverlay>
        <TooltipPrimitive.Overlay style={Platform.select({ native: StyleSheet.absoluteFill })}>
          <NativeOnlyAnimatedView
            entering={FadeIn.duration(durations.fast)}
            exiting={FadeOut.duration(durations.fast)}>
            <TextClassContext.Provider value="text-xs text-primary-foreground">
              <TooltipPrimitive.Content
                sideOffset={sideOffset}
                className={cn(
                  'bg-primary z-50 sm:py-1.5 items-center gap-1.5 rounded-2xl px-3 py-1.5 text-xs',
                  Platform.select({
                    web: cn(
                      'animate-in fade-in-0 zoom-in-95 origin-(--radix-tooltip-content-transform-origin) w-fit text-balance',
                      side === 'bottom' && 'slide-in-from-top-2',
                      side === 'left' && 'slide-in-from-right-2',
                      side === 'right' && 'slide-in-from-left-2',
                      side === 'top' && 'slide-in-from-bottom-2'
                    ),
                  }),
                  className
                )}
                side={side}
                {...props}
              />
            </TextClassContext.Provider>
          </NativeOnlyAnimatedView>
        </TooltipPrimitive.Overlay>
      </FullWindowOverlay>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipTrigger };
