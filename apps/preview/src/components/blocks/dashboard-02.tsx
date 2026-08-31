import { Avatar, AvatarFallback, AvatarImage } from '@preview/components/ui/avatar';
import { Icon } from '@preview/components/ui/icon';
import { Input } from '@preview/components/ui/input';
import { Separator } from '@preview/components/ui/separator';
import {
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
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from '@preview/components/ui/sidebar';
import { Text } from '@preview/components/ui/text';
import { cn } from '@preview/lib/utils';
import {
  Bell,
  Bot,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Command,
  Frame,
  Home,
  MoreHorizontal,
  PieChart,
  Plus,
  Search,
  Settings2,
  SquareTerminal,
  User,
} from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

const PLAYGROUND_SUB = ['History', 'Starred', 'Settings'];

type NavItem = {
  label: string;
  icon: React.ComponentProps<typeof Icon>['as'];
};

const PLATFORM_NAV: NavItem[] = [
  { label: 'Models', icon: Bot },
  { label: 'Documentation', icon: BookOpen },
  { label: 'Settings', icon: Settings2 },
];

const PROJECTS: NavItem[] = [
  { label: 'Design Engineering', icon: Frame },
  { label: 'Sales & Marketing', icon: PieChart },
  { label: 'Travel', icon: Command },
];

const BOTTOM_TABS: NavItem[] = [
  { label: 'Home', icon: Home },
  { label: 'Search', icon: Search },
  { label: 'Inbox', icon: Bell },
  { label: 'Profile', icon: User },
];

/**
 * A bottom tab bar. Rendered inside `SidebarInset`, so the sidebar drawer (a
 * z-50 overlay) covers it while open — and we also hide it then, so the sidebar
 * effectively overrides the bottom navbar whenever it is active.
 */
function BottomNav({ bottomInset = 0 }: { bottomInset?: number }) {
  const { openMobile } = useSidebar();
  const [tab, setTab] = React.useState('Home');
  if (openMobile) return null;
  return (
    <View
      className="border-border bg-background flex-row border-t"
      style={{ paddingBottom: bottomInset }}
    >
      {BOTTOM_TABS.map((t) => {
        const isActive = tab === t.label;
        return (
          <Pressable
            key={t.label}
            onPress={() => setTab(t.label)}
            className="flex-1 items-center justify-center gap-1 py-2"
          >
            <Icon
              as={t.icon}
              className={cn('size-5', isActive ? 'text-primary' : 'text-muted-foreground')}
            />
            <Text
              className={cn(
                'text-[10px]',
                isActive ? 'text-primary font-medium' : 'text-muted-foreground'
              )}
            >
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * A dashboard application shell built around the `Sidebar`: a branded
 * `SidebarHeader` with a `SidebarInput` search, `SidebarGroup`s of `SidebarMenu`
 * items, a collapsible item with a `SidebarMenuSub`, per-row `SidebarMenuAction`s,
 * and a `SidebarFooter` user card. A bottom tab bar sits under the content and is
 * overridden by the sidebar drawer when it opens.
 */
export function Dashboard02({ topPad = 0 }: { topPad?: number }) {
  const [active, setActive] = React.useState('Playground');
  const [openPlayground, setOpenPlayground] = React.useState(true);
  const [activeSub, setActiveSub] = React.useState('History');

  return (
    <SidebarProvider>
      <Sidebar collapsible="offcanvas">
        <SidebarHeader style={{ paddingTop: topPad + 8 }}>
          <View className="flex-row items-center gap-2 px-2 py-1.5">
            <View className="bg-primary size-8 items-center justify-center rounded-lg">
              <Icon as={Command} className="text-primary-foreground size-4" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold" numberOfLines={1}>
                lovdaCN
              </Text>
              <Text className="text-muted-foreground text-xs" numberOfLines={1}>
                Application
              </Text>
            </View>
          </View>
          <SidebarInput>
            <View className="relative">
              <View className="absolute left-2 top-2 z-10">
                <Icon as={Search} className="text-muted-foreground size-4" />
              </View>
              <Input placeholder="Search…" className="native:pl-8 h-9 pl-8" />
            </View>
          </SidebarInput>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {/* Collapsible nav item with a sub-menu */}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={active === 'Playground'}
                    onPress={() => {
                      setActive('Playground');
                      setOpenPlayground((prev) => !prev);
                    }}
                  >
                    <Icon as={SquareTerminal} className="size-4" />
                    <Text className="flex-1">Playground</Text>
                    <Icon
                      as={openPlayground ? ChevronDown : ChevronRight}
                      className="text-muted-foreground size-4"
                    />
                  </SidebarMenuButton>
                  {openPlayground ? (
                    <SidebarMenuSub>
                      {PLAYGROUND_SUB.map((sub) => (
                        <SidebarMenuSubItem key={sub}>
                          <SidebarMenuSubButton
                            isActive={activeSub === sub}
                            onPress={() => setActiveSub(sub)}
                          >
                            <Text className="flex-1">{sub}</Text>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  ) : null}
                </SidebarMenuItem>

                {PLATFORM_NAV.map((item) => (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      isActive={active === item.label}
                      onPress={() => setActive(item.label)}
                    >
                      <Icon as={item.icon} className="size-4" />
                      <Text className="flex-1">{item.label}</Text>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          <SidebarGroup>
            <SidebarGroupLabel>Projects</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {PROJECTS.map((item) => (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      isActive={active === item.label}
                      onPress={() => setActive(item.label)}
                    >
                      <Icon as={item.icon} className="size-4" />
                      <Text className="flex-1" numberOfLines={1}>
                        {item.label}
                      </Text>
                    </SidebarMenuButton>
                    <SidebarMenuAction>
                      <Icon as={MoreHorizontal} className="text-muted-foreground size-4" />
                    </SidebarMenuAction>
                  </SidebarMenuItem>
                ))}
                <SidebarMenuItem>
                  <SidebarMenuButton onPress={() => {}}>
                    <Icon as={Plus} className="text-muted-foreground size-4" />
                    <Text className="text-muted-foreground flex-1">More</Text>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <View className="border-border flex-row items-center gap-2 rounded-lg border p-2">
            <Avatar alt="Shad" className="size-8">
              <AvatarImage source={{ uri: 'https://github.com/shadcn.png' }} />
              <AvatarFallback>
                <Text className="text-xs">SC</Text>
              </AvatarFallback>
            </Avatar>
            <View className="flex-1">
              <Text className="text-sm font-medium" numberOfLines={1}>
                shadcn
              </Text>
              <Text className="text-muted-foreground text-xs" numberOfLines={1}>
                m@example.com
              </Text>
            </View>
          </View>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        {/* Top navbar — holds the sidebar trigger + current page title (no breadcrumb) */}
        <View
          className="border-border bg-background flex-row items-center gap-2 border-b px-4 pb-3"
          style={{ paddingTop: topPad + 12 }}
        >
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <Text className="text-base font-semibold">{active}</Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-row flex-wrap gap-4">
            <View className="bg-muted/50 aspect-video min-w-[160px] flex-1 rounded-xl" />
            <View className="bg-muted/50 aspect-video min-w-[160px] flex-1 rounded-xl" />
            <View className="bg-muted/50 aspect-video min-w-[160px] flex-1 rounded-xl" />
          </View>
          <View className="bg-muted/50 h-64 w-full rounded-xl" />
        </ScrollView>

        {/* Bottom navbar — overridden by the sidebar drawer while it is open */}
        <BottomNav />
      </SidebarInset>
    </SidebarProvider>
  );
}
