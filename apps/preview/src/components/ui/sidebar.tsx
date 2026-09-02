import { Icon } from '@preview/components/ui/icon';
import { Separator } from '@preview/components/ui/separator';
import { Skeleton } from '@preview/components/ui/skeleton';
import { Text, TextClassContext } from '@preview/components/ui/text';
import { cn } from '@preview/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { PanelLeft } from 'lucide-react-native';
import { Pressable, View } from '@preview/components/ui/primitives';
import * as React from 'react';
import { AccessibilityInfo, Animated, Platform, ScrollView, useWindowDimensions } from 'react-native';

const SIDEBAR_WIDTH = 256;
const SIDEBAR_WIDTH_MOBILE = 288;
const SIDEBAR_WIDTH_ICON = 64;
const MOBILE_BREAKPOINT = 768;

type SidebarState = 'expanded' | 'collapsed';

type SidebarContextValue = {
  state: SidebarState;
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

/**
 * Access the surrounding sidebar's state. Must be rendered inside a
 * {@link SidebarProvider}.
 */
function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider.');
  }
  return context;
}

type SidebarProviderProps = React.ComponentProps<typeof View> & {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/**
 * Wraps a sidebar + its inset content, wiring up open/collapsed state and mobile
 * detection. On screens narrower than 768px the sidebar becomes an off-canvas
 * drawer; otherwise it collapses in place.
 */
function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  children,
  ...props
}: SidebarProviderProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < MOBILE_BREAKPOINT;
  const [openMobile, setOpenMobile] = React.useState(false);

  const [_open, _setOpen] = React.useState(defaultOpen);
  const open = openProp ?? _open;
  const setOpen = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const openState = typeof value === 'function' ? value(open) : value;
      if (setOpenProp) {
        setOpenProp(openState);
      } else {
        _setOpen(openState);
      }
    },
    [setOpenProp, open]
  );

  const toggleSidebar = React.useCallback(() => {
    return isMobile ? setOpenMobile((prev) => !prev) : setOpen((prev) => !prev);
  }, [isMobile, setOpen]);

  // Collapse the drawer automatically when growing past the mobile breakpoint.
  React.useEffect(() => {
    if (!isMobile && openMobile) setOpenMobile(false);
  }, [isMobile, openMobile]);

  const state: SidebarState = open ? 'expanded' : 'collapsed';

  const contextValue = React.useMemo<SidebarContextValue>(
    () => ({ state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar }),
    [state, open, setOpen, isMobile, openMobile, toggleSidebar]
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      <View
        className={cn('bg-background relative w-full flex-1 flex-row overflow-hidden', className)}
        {...props}
      >
        {children}
      </View>
    </SidebarContext.Provider>
  );
}

type SidebarProps = React.ComponentProps<typeof View> & {
  side?: 'left' | 'right';
  variant?: 'sidebar' | 'floating' | 'inset';
  collapsible?: 'offcanvas' | 'icon' | 'none';
};

/**
 * The sidebar surface. Renders as an animated off-canvas drawer on mobile and a
 * collapsible fixed column on wider screens.
 */
function Sidebar({
  side = 'left',
  variant = 'sidebar',
  collapsible = 'offcanvas',
  className,
  children,
  ...props
}: SidebarProps) {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

  // Non-collapsible: a plain static column.
  if (collapsible === 'none') {
    return (
      <View
        className={cn('bg-sidebar h-full flex-col', className)}
        style={{ width: SIDEBAR_WIDTH }}
        {...props}
      >
        {children}
      </View>
    );
  }

  // Mobile: an off-canvas drawer overlaying the inset content.
  if (isMobile) {
    return (
      <SidebarDrawer side={side} open={openMobile} onOpenChange={setOpenMobile}>
        <View className={cn('bg-sidebar h-full w-full flex-col', className)} {...props}>
          {children}
        </View>
      </SidebarDrawer>
    );
  }

  // Desktop: a collapsible in-flow column with an animated width.
  const expandedWidth = variant === 'floating' || variant === 'inset' ? SIDEBAR_WIDTH + 16 : SIDEBAR_WIDTH;
  const collapsedWidth = collapsible === 'icon' ? SIDEBAR_WIDTH_ICON : 0;
  const targetWidth = state === 'expanded' ? expandedWidth : collapsedWidth;

  return (
    <SidebarDesktop width={targetWidth} floating={variant === 'floating' || variant === 'inset'}>
      <View
        className={cn(
          'bg-sidebar h-full w-full flex-col',
          variant === 'floating' && 'border-sidebar-border rounded-lg border shadow-sm',
          variant === 'sidebar' && (side === 'left' ? 'border-sidebar-border border-r' : 'border-sidebar-border border-l'),
          className
        )}
        {...props}
      >
        {children}
      </View>
    </SidebarDesktop>
  );
}

/**
 * Core Animated does not inherit Reanimated's system reduced-motion policy.
 * Treat the initial async preference as reduced so the first render never starts
 * an unwanted transition, then keep the value current while mounted.
 */
function useReducedMotionPreference() {
  const [reduceMotion, setReduceMotion] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    let mounted = true;
    let receivedEvent = false;

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => {
        receivedEvent = true;
        setReduceMotion(enabled);
      }
    );

    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted && !receivedEvent) setReduceMotion(enabled);
      })
      .catch(() => {
        if (mounted && !receivedEvent) setReduceMotion(false);
      });

    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, []);

  return reduceMotion !== false;
}

/** Animates the desktop sidebar column width when collapsing/expanding. */
function SidebarDesktop({
  width,
  floating,
  children,
}: {
  width: number;
  floating?: boolean;
  children: React.ReactNode;
}) {
  const animated = React.useRef(new Animated.Value(width)).current;
  const reduceMotion = useReducedMotionPreference();

  React.useEffect(() => {
    animated.stopAnimation();

    if (reduceMotion) {
      animated.setValue(width);
      return;
    }

    const transition = Animated.timing(animated, {
      toValue: width,
      duration: 200,
      useNativeDriver: false,
    });
    transition.start();

    return () => transition.stop();
  }, [animated, reduceMotion, width]);

  return (
    <Animated.View style={{ width: animated, overflow: 'hidden' }}>
      <View className={cn('h-full w-full', floating && 'p-2')} style={{ width: floating ? width : undefined }}>
        {children}
      </View>
    </Animated.View>
  );
}

/** Animated off-canvas drawer used for the mobile sidebar. */
function SidebarDrawer({
  side,
  open,
  onOpenChange,
  children,
}: {
  side: 'left' | 'right';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const progress = React.useRef(new Animated.Value(open ? 1 : 0)).current;
  const reduceMotion = useReducedMotionPreference();

  React.useEffect(() => {
    progress.stopAnimation();
    const target = open ? 1 : 0;

    if (reduceMotion) {
      progress.setValue(target);
      return;
    }

    const transition = Animated.timing(progress, {
      toValue: target,
      duration: 220,
      useNativeDriver: true,
    });
    transition.start();

    return () => transition.stop();
  }, [open, progress, reduceMotion]);

  const offscreen = side === 'left' ? -SIDEBAR_WIDTH_MOBILE : SIDEBAR_WIDTH_MOBILE;
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [offscreen, 0] });

  return (
    <View className="absolute inset-0 z-50" pointerEvents={open ? 'auto' : 'none'}>
      <Animated.View style={{ flex: 1, opacity: progress }}>
        <Pressable
          className="bg-black/50 flex-1"
          onPress={() => onOpenChange(false)}
          accessibilityLabel="Close sidebar"
        />
      </Animated.View>
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: side === 'left' ? 0 : undefined,
          right: side === 'right' ? 0 : undefined,
          width: SIDEBAR_WIDTH_MOBILE,
          transform: [{ translateX }],
        }}
      >
        {children}
      </Animated.View>
    </View>
  );
}

/** A button that toggles the sidebar open/closed (or opens the mobile drawer). */
function SidebarTrigger({
  className,
  onPress,
  ...props
}: React.ComponentProps<typeof Pressable>) {
  const { toggleSidebar } = useSidebar();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Toggle sidebar"
      onPress={(e) => {
        onPress?.(e);
        toggleSidebar();
      }}
      className={cn(
        'size-9 items-center justify-center rounded-md',
        Platform.select({ web: 'hover:bg-accent' }),
        className
      )}
      {...props}
    >
      <Icon as={PanelLeft} className="text-foreground size-5" />
    </Pressable>
  );
}

/** A thin rail on the sidebar's edge that toggles it (web/desktop affordance). */
function SidebarRail({ className, ...props }: React.ComponentProps<typeof Pressable>) {
  const { toggleSidebar } = useSidebar();
  return (
    <Pressable
      accessibilityLabel="Toggle sidebar"
      onPress={() => toggleSidebar()}
      className={cn('absolute inset-y-0 right-0 w-1', Platform.select({ web: 'hover:bg-sidebar-border' }), className)}
      {...props}
    />
  );
}

/** The main content area that sits beside the sidebar. */
function SidebarInset({ className, ...props }: React.ComponentProps<typeof View>) {
  return <View className={cn('bg-background flex-1', className)} {...props} />;
}

function SidebarHeader({ className, ...props }: React.ComponentProps<typeof View>) {
  return <View className={cn('flex-col gap-2 p-2', className)} {...props} />;
}

function SidebarFooter({ className, ...props }: React.ComponentProps<typeof View>) {
  return <View className={cn('flex-col gap-2 p-2', className)} {...props} />;
}

function SidebarContent({ className, ...props }: React.ComponentProps<typeof ScrollView>) {
  return (
    <ScrollView
      className={cn('flex-1', className)}
      contentContainerStyle={{ gap: 4, padding: 8 }}
      showsVerticalScrollIndicator={false}
      {...props}
    />
  );
}

function SidebarSeparator({ className, ...props }: React.ComponentProps<typeof Separator>) {
  return <Separator className={cn('bg-sidebar-border mx-2 w-auto', className)} {...props} />;
}

function SidebarGroup({ className, ...props }: React.ComponentProps<typeof View>) {
  return <View className={cn('w-full flex-col p-2', className)} {...props} />;
}

function SidebarGroupLabel({ className, ...props }: React.ComponentProps<typeof Text>) {
  const { state, isMobile } = useSidebar();
  const collapsed = state === 'collapsed' && !isMobile;
  if (collapsed) return null;
  return (
    <Text
      className={cn('text-sidebar-foreground/70 h-8 px-2 py-1.5 text-xs font-medium', className)}
      {...props}
    />
  );
}

function SidebarGroupContent({ className, ...props }: React.ComponentProps<typeof View>) {
  return <View className={cn('w-full flex-col gap-1', className)} {...props} />;
}

function SidebarMenu({ className, ...props }: React.ComponentProps<typeof View>) {
  return <View className={cn('w-full flex-col gap-1', className)} {...props} />;
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<typeof View>) {
  return <View className={cn('relative w-full', className)} {...props} />;
}

const sidebarMenuButtonVariants = cva(
  'group w-full flex-row items-center gap-2 overflow-hidden rounded-md px-2',
  {
    variants: {
      variant: {
        default: Platform.select({ web: 'hover:bg-sidebar-accent' }) ?? '',
        outline: cn('border-sidebar-border border', Platform.select({ web: 'hover:bg-sidebar-accent' })),
      },
      size: {
        default: 'h-9',
        sm: 'h-8',
        lg: 'h-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

type SidebarMenuButtonProps = React.ComponentProps<typeof Pressable> &
  VariantProps<typeof sidebarMenuButtonVariants> & {
    isActive?: boolean;
    /** Retained for API compatibility with shadcn; not rendered on native. */
    tooltip?: string;
  };

/**
 * A pressable navigation row. Colors its `Text`/`Icon` children via
 * {@link TextClassContext} and highlights when `isActive`.
 */
function SidebarMenuButton({
  className,
  variant = 'default',
  size = 'default',
  isActive = false,
  tooltip: _tooltip,
  children,
  ...props
}: SidebarMenuButtonProps) {
  const { state, isMobile } = useSidebar();
  const collapsed = state === 'collapsed' && !isMobile;
  // On the collapsed icon rail, drop text labels so a single icon stays
  // centered instead of a clipped icon + label peeking out of the rail.
  const content = collapsed && typeof children !== 'function'
    ? React.Children.toArray(children).filter(
        (child) => !(React.isValidElement(child) && child.type === Text)
      )
    : children;
  return (
    <TextClassContext.Provider
      value={cn('text-sm', isActive ? 'text-sidebar-accent-foreground font-medium' : 'text-sidebar-foreground')}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: isActive }}
        className={cn(
          sidebarMenuButtonVariants({ variant, size }),
          isActive && 'bg-sidebar-accent',
          collapsed && 'size-8 justify-center gap-0 self-center px-0',
          Platform.select({ web: !isActive ? 'active:bg-sidebar-accent' : undefined }),
          className
        )}
        {...props}
      >
        {content}
      </Pressable>
    </TextClassContext.Provider>
  );
}

/** A trailing action button (e.g. a "+" or menu) aligned to the row's end. */
function SidebarMenuAction({
  className,
  showOnHover: _showOnHover,
  ...props
}: React.ComponentProps<typeof Pressable> & { showOnHover?: boolean }) {
  const { state, isMobile } = useSidebar();
  // Trailing actions have no room on the collapsed icon rail.
  if (state === 'collapsed' && !isMobile) return null;
  return (
    <Pressable
      accessibilityRole="button"
      className={cn(
        'absolute right-1 top-1.5 size-6 items-center justify-center rounded-md',
        Platform.select({ web: 'hover:bg-sidebar-accent' }),
        className
      )}
      {...props}
    />
  );
}

/** A small count/label pinned to the end of a menu row. */
function SidebarMenuBadge({ className, ...props }: React.ComponentProps<typeof View>) {
  const { state, isMobile } = useSidebar();
  // Badges have no room on the collapsed icon rail.
  if (state === 'collapsed' && !isMobile) return null;
  return (
    <View
      pointerEvents="none"
      className={cn(
        'absolute right-2 top-2 h-5 min-w-5 items-center justify-center rounded-md px-1',
        className
      )}
      {...props}
    />
  );
}

/** A loading placeholder row for menus. */
function SidebarMenuSkeleton({ className, ...props }: React.ComponentProps<typeof View>) {
  const { state, isMobile } = useSidebar();
  const collapsed = state === 'collapsed' && !isMobile;
  const width = React.useMemo<`${number}%`>(() => `${Math.floor(Math.random() * 40) + 50}%`, []);
  if (collapsed) {
    return (
      <View
        className={cn('size-8 items-center justify-center self-center rounded-md', className)}
        {...props}
      >
        <Skeleton className="size-4 rounded-md" />
      </View>
    );
  }
  return (
    <View className={cn('h-9 flex-row items-center gap-2 rounded-md px-2', className)} {...props}>
      <Skeleton className="size-4 rounded-md" />
      <Skeleton className="h-4 flex-1" style={{ maxWidth: width }} />
    </View>
  );
}

function SidebarMenuSub({ className, ...props }: React.ComponentProps<typeof View>) {
  const { state, isMobile } = useSidebar();
  if (state === 'collapsed' && !isMobile) return null;
  return (
    <View
      className={cn('border-sidebar-border ml-3.5 flex-col gap-1 border-l px-2.5 py-0.5', className)}
      {...props}
    />
  );
}

function SidebarMenuSubItem({ className, ...props }: React.ComponentProps<typeof View>) {
  return <View className={cn('relative w-full', className)} {...props} />;
}

type SidebarMenuSubButtonProps = React.ComponentProps<typeof Pressable> & {
  size?: 'sm' | 'md';
  isActive?: boolean;
};

function SidebarMenuSubButton({
  className,
  size = 'md',
  isActive = false,
  ...props
}: SidebarMenuSubButtonProps) {
  return (
    <TextClassContext.Provider
      value={cn(
        size === 'sm' ? 'text-xs' : 'text-sm',
        isActive ? 'text-sidebar-accent-foreground font-medium' : 'text-sidebar-foreground'
      )}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: isActive }}
        className={cn(
          'min-h-11 min-w-11 w-full flex-row items-center gap-2 overflow-hidden rounded-md px-2',
          isActive && 'bg-sidebar-accent',
          Platform.select({ web: 'hover:bg-sidebar-accent' }),
          className
        )}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

/** A search/input slot styled to sit inside the sidebar (wrap your own Input). */
function SidebarInput({ className, ...props }: React.ComponentProps<typeof View>) {
  return <View className={cn('w-full px-1', className)} {...props} />;
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
};
