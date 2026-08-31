import { Icon } from '@preview/components/ui/icon';
import { NativeOnlyAnimatedView } from '@preview/components/ui/native-only-animated-view';
import { TextClassContext } from '@preview/components/ui/text';
import { cn } from '@preview/lib/utils';
import * as MenubarPrimitive from '@rn-primitives/menubar';
import { Portal } from '@rn-primitives/portal';
import { Check, ChevronDown, ChevronRight, ChevronUp } from 'lucide-react-native';
import * as React from 'react';
import { durations, Pressable, Text, View } from '@preview/components/ui/primitives';
import { Platform, type StyleProp, StyleSheet, type ViewStyle } from 'react-native';
import { FadeIn, FadeOut } from 'react-native-reanimated';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';

const MenubarMenu = MenubarPrimitive.Menu;

const MenubarGroup = MenubarPrimitive.Group;

const MenubarPortal = MenubarPrimitive.Portal;

const MenubarSub = MenubarPrimitive.Sub;

const MenubarRadioGroup = MenubarPrimitive.RadioGroup;

const FullWindowOverlay = Platform.OS === 'ios' ? RNFullWindowOverlay : React.Fragment;

function Menubar({
  className,
  value: valueProp,
  onValueChange: onValueChangeProp,
  ...props
}: Omit<React.ComponentProps<typeof MenubarPrimitive.Root>, 'value' | 'onValueChange'> & {
  value?: string;
  onValueChange?: (value: string | undefined) => void;
}) {
  const id = React.useId();
  const [value, setValue] = React.useState<string | undefined>(undefined);

  function closeMenu() {
    if (onValueChangeProp) {
      onValueChangeProp(undefined);
      return;
    }
    setValue(undefined);
  }

  return (
    <>
      {Platform.OS !== 'web' && (value || valueProp) ? (
        <Portal name={`menubar-overlay-${id}`}>
          <Pressable onPress={closeMenu} style={StyleSheet.absoluteFill} />
        </Portal>
      ) : null}
      <MenubarPrimitive.Root
        className={cn(
          'bg-background border-border flex flex-row items-center gap-1 shadow-sm shadow-black/5 sm:h-9 h-9 rounded-4xl border p-1',
          className
        )}
        value={value ?? valueProp}
        onValueChange={onValueChangeProp ?? setValue}
        {...props}
      />
    </>
  );
}

function MenubarTrigger({
  className,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Trigger>) {
  const { value } = MenubarPrimitive.useRootContext();
  const { value: itemValue } = MenubarPrimitive.useMenuContext();

  return (
    <TextClassContext.Provider
      value={cn(
        'text-sm font-medium select-none group-active:text-accent-foreground',
        value === itemValue && 'text-accent-foreground'
      )}>
      <MenubarPrimitive.Trigger
        className={cn(
          'group flex items-center sm:py-1 hover:bg-muted aria-expanded:bg-muted rounded-xl px-2 py-0.75 text-sm font-medium',
          Platform.select({
            web: 'focus:bg-accent focus:text-accent-foreground cursor-default outline-none',
          }),
          value === itemValue && 'bg-accent',
          className
        )}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

function MenubarSubTrigger({
  className,
  inset,
  children,
  iconClassName,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.SubTrigger> & {
    children?: React.ReactNode;
    iconClassName?: string;
    inset?: boolean;
  }) {
  const { open } = MenubarPrimitive.useSubContext();
  const icon = Platform.OS === 'web' ? ChevronRight : open ? ChevronUp : ChevronDown;
  return (
    <TextClassContext.Provider
      value={cn(
        'text-sm select-none group-active:text-accent-foreground',
        open && 'text-accent-foreground'
      )}>
      <MenubarPrimitive.SubTrigger
        className={cn(
          'active:bg-accent group flex flex-row items-center sm:py-1.5 gap-2 rounded-xl px-3 py-2 text-sm',
          Platform.select({
            web: 'focus:bg-accent focus:text-accent-foreground cursor-default outline-none [&_svg]:pointer-events-none',
          }),
          className,
          open && 'bg-accent',
          inset && 'pl-8'
        )}
        {...props}>
        <>{children}</>
        <Icon as={icon} className={cn('text-foreground ml-auto size-4 shrink-0', iconClassName)} />
      </MenubarPrimitive.SubTrigger>
    </TextClassContext.Provider>
  );
}

function MenubarSubContent({
  className,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.SubContent>) {
  return (
    <NativeOnlyAnimatedView entering={FadeIn.duration(durations.base)} exiting={FadeOut.duration(durations.fast)}>
      <MenubarPrimitive.SubContent
        className={cn(
          'border-border overflow-hidden border shadow-black/5 bg-popover text-popover-foreground ring-foreground/5 min-w-32 rounded-2xl p-1 shadow-2xl ring-1',
          Platform.select({
            web: 'animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 fade-in-0 data-[state=closed]:zoom-out-95 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-context-menu-content-transform-origin) z-50 min-w-[8rem]',
          }),
          className
        )}
        {...props}
      />
    </NativeOnlyAnimatedView>
  );
}

function MenubarContent({
  className,
  portalHost,
  align = 'start',
  alignOffset = -4,
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Content> & {
    portalHost?: string;
  }) {
  return (
    <MenubarPrimitive.Portal hostName={portalHost}>
      <FullWindowOverlay>
        <NativeOnlyAnimatedView
          entering={FadeIn.duration(durations.base)}
          exiting={FadeOut.duration(durations.fast)}
          style={StyleSheet.absoluteFill}
          pointerEvents="box-none">
          <TextClassContext.Provider value="text-popover-foreground">
            <MenubarPrimitive.Content
              className={cn(
                'border-border overflow-hidden border shadow-black/5 bg-popover text-popover-foreground ring-foreground/5 min-w-48 rounded-2xl p-1 shadow-2xl ring-1',
                Platform.select({
                  web: cn(
                    'animate-in fade-in-0 zoom-in-95 max-h-(--radix-context-menu-content-available-height) origin-(--radix-context-menu-content-transform-origin) z-50 cursor-default',
                    props.side === 'bottom' && 'slide-in-from-top-2',
                    props.side === 'top' && 'slide-in-from-bottom-2'
                  ),
                }),
                className
              )}
              align={align}
              alignOffset={alignOffset}
              sideOffset={sideOffset}
              {...props}
            />
          </TextClassContext.Provider>
        </NativeOnlyAnimatedView>
      </FullWindowOverlay>
    </MenubarPrimitive.Portal>
  );
}

function MenubarItem({
  className,
  inset,
  variant,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Item> & {
    className?: string;
    inset?: boolean;
    variant?: 'default' | 'destructive';
  }) {
  return (
    <TextClassContext.Provider
      value={cn(
        'select-none text-sm text-popover-foreground group-active:text-popover-foreground',
        variant === 'destructive' && 'text-destructive group-active:text-destructive'
      )}>
      <MenubarPrimitive.Item
        className={cn(
          'active:bg-accent group relative flex flex-row items-center sm:py-1.5 gap-2.5 rounded-xl px-3 py-2 text-sm',
          Platform.select({
            web: cn(
              'focus:bg-accent focus:text-accent-foreground cursor-default outline-none data-[disabled]:pointer-events-none',
              variant === 'destructive' && 'focus:bg-destructive/10 dark:focus:bg-destructive/20'
            ),
          }),
          variant === 'destructive' && 'active:bg-destructive/10 dark:active:bg-destructive/20',
          props.disabled && 'opacity-50',
          inset && 'pl-8',
          className
        )}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

function MenubarCheckboxItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.CheckboxItem> & {
    children?: React.ReactNode;
  }) {
  return (
    <TextClassContext.Provider value="text-sm text-popover-foreground select-none group-active:text-accent-foreground">
      <MenubarPrimitive.CheckboxItem
        className={cn(
          'active:bg-accent group relative flex flex-row items-center gap-2 rounded-sm py-2 pl-8 pr-2 sm:py-1.5',
          Platform.select({
            web: 'focus:bg-accent focus:text-accent-foreground cursor-default outline-none data-[disabled]:pointer-events-none',
          }),
          props.disabled && 'opacity-50',
          className
        )}
        {...props}>
        <View className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <MenubarPrimitive.ItemIndicator>
            <Icon
              as={Check}
              className={cn(
                'text-foreground size-4',
                Platform.select({ web: 'pointer-events-none' })
              )}
            />
          </MenubarPrimitive.ItemIndicator>
        </View>
        <>{children}</>
      </MenubarPrimitive.CheckboxItem>
    </TextClassContext.Provider>
  );
}

function MenubarRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.RadioItem> & {
    children?: React.ReactNode;
  }) {
  return (
    <TextClassContext.Provider value="text-sm text-popover-foreground select-none group-active:text-accent-foreground">
      <MenubarPrimitive.RadioItem
        className={cn(
          'active:bg-accent group relative flex flex-row items-center gap-2 rounded-sm py-2 pl-8 pr-2 sm:py-1.5',
          Platform.select({
            web: 'focus:bg-accent focus:text-accent-foreground cursor-default outline-none data-[disabled]:pointer-events-none',
          }),
          props.disabled && 'opacity-50',
          className
        )}
        {...props}>
        <View className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <MenubarPrimitive.ItemIndicator>
            <View className="bg-foreground h-2 w-2 rounded-full" />
          </MenubarPrimitive.ItemIndicator>
        </View>
        <>{children}</>
      </MenubarPrimitive.RadioItem>
    </TextClassContext.Provider>
  );
}

function MenubarLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Label> & {
    className?: string;
    inset?: boolean;
  }) {
  return (
    <MenubarPrimitive.Label
      className={cn(
        'font-medium sm:py-1.5 text-muted-foreground px-3.5 py-2.5 text-xs',
        inset && 'pl-8',
        className
      )}
      {...props}
    />
  );
}

function MenubarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Separator>) {
  return (
    <MenubarPrimitive.Separator className={cn('-mx-1 my-1 h-px bg-border/50', className)} {...props} />
  );
}

function MenubarShortcut({ className, ...props }: React.ComponentProps<typeof Text>) {
  return (
    <Text
      className={cn('ml-auto text-muted-foreground text-xs tracking-widest', className)}
      {...props}
    />
  );
}

export {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarPortal,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
};
