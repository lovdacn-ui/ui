import { Avatar, AvatarFallback, AvatarImage } from '@preview/components/ui/avatar';
import { Badge } from '@preview/components/ui/badge';
import { Button } from '@preview/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@preview/components/ui/card';
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
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@preview/components/ui/sidebar';
import { Text } from '@preview/components/ui/text';
import { cn } from '@preview/lib/utils';
import {
  Activity,
  Bell,
  ChevronsUpDown,
  CreditCard,
  DollarSign,
  Command,
  Home,
  LayoutDashboard,
  LifeBuoy,
  Package,
  Search,
  Settings,
  ShoppingCart,
  TrendingUp,
  User,
  Users,
} from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

type NavItem = {
  label: string;
  icon: React.ComponentProps<typeof Icon>['as'];
  badge?: string;
};

const PLATFORM_NAV: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Analytics', icon: Activity, badge: '12' },
  { label: 'Orders', icon: ShoppingCart, badge: '6' },
  { label: 'Products', icon: Package },
  { label: 'Customers', icon: Users },
];

const SUPPORT_NAV: NavItem[] = [
  { label: 'Settings', icon: Settings },
  { label: 'Support', icon: LifeBuoy },
];

type Kpi = {
  label: string;
  value: string;
  delta: string;
  icon: React.ComponentProps<typeof Icon>['as'];
};

const KPIS: Kpi[] = [
  { label: 'Total Revenue', value: '$45,231.89', delta: '+20.1%', icon: DollarSign },
  { label: 'Subscriptions', value: '+2,350', delta: '+180.1%', icon: Users },
  { label: 'Sales', value: '+12,234', delta: '+19%', icon: CreditCard },
  { label: 'Active Now', value: '+573', delta: '+201', icon: Activity },
];

type Sale = { name: string; email: string; amount: string; initials: string };

const RECENT_SALES: Sale[] = [
  { name: 'Olivia Martin', email: 'olivia@email.com', amount: '+$1,999.00', initials: 'OM' },
  { name: 'Jackson Lee', email: 'jackson@email.com', amount: '+$39.00', initials: 'JL' },
  { name: 'Isabella Nguyen', email: 'isabella@email.com', amount: '+$299.00', initials: 'IN' },
  { name: 'William Kim', email: 'will@email.com', amount: '+$99.00', initials: 'WK' },
  { name: 'Sofia Davis', email: 'sofia@email.com', amount: '+$39.00', initials: 'SD' },
];

// Relative bar heights (%) for the lightweight "Overview" chart.
const OVERVIEW_BARS = [48, 72, 38, 90, 62, 80, 55, 68, 44, 76, 58, 84];

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
 * Preview of the `dashboard-01` block — a full application dashboard built around
 * the `Sidebar` component: a navigation sidebar, a sticky top bar, a row of KPI
 * cards, a simple overview chart, and a recent-activity list.
 */
export function Dashboard01({ topPad = 0 }: { topPad?: number }) {
  const [active, setActive] = React.useState('Dashboard');

  return (
    <SidebarProvider>
      {/* Navigation sidebar */}
      <Sidebar collapsible="offcanvas">
        <SidebarHeader style={{ paddingTop: topPad + 8 }}>
          <View className="flex-row items-center gap-2 px-2 py-1.5">
            <View className="bg-primary size-8 items-center justify-center rounded-lg">
              <Icon as={Command} className="text-primary-foreground size-4" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold" numberOfLines={1}>
                Acme Inc
              </Text>
              <Text className="text-muted-foreground text-xs" numberOfLines={1}>
                Enterprise
              </Text>
            </View>
            <Icon as={ChevronsUpDown} className="text-muted-foreground size-4" />
          </View>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {PLATFORM_NAV.map((item) => (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      isActive={active === item.label}
                      onPress={() => setActive(item.label)}
                    >
                      <Icon as={item.icon} className="size-4" />
                      <Text className="flex-1">{item.label}</Text>
                    </SidebarMenuButton>
                    {item.badge ? (
                      <SidebarMenuBadge className="bg-muted">
                        <Text className="text-muted-foreground text-xs">{item.badge}</Text>
                      </SidebarMenuBadge>
                    ) : null}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Support</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {SUPPORT_NAV.map((item) => (
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
            <Icon as={ChevronsUpDown} className="text-muted-foreground size-4" />
          </View>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      {/* Main content */}
      <SidebarInset>
        {/* Top bar */}
        <View
          className="border-border bg-background flex-row items-center gap-2 border-b px-4 pb-3"
          style={{ paddingTop: topPad + 12 }}
        >
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <Text className="text-base font-semibold">Dashboard</Text>
          <View className="ml-auto flex-row items-center gap-2">
            <View className="hidden flex-row items-center sm:flex">
              <View className="relative">
                <View className="absolute left-2 top-2 z-10">
                  <Icon as={Search} className="text-muted-foreground size-4" />
                </View>
                <Input
                  placeholder="Search…"
                  className="native:pl-8 h-9 w-44 pl-8"
                />
              </View>
            </View>
            <Button variant="outline" size="icon" className="size-9">
              <Icon as={Bell} className="size-4" />
            </Button>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
        >
          {/* KPI cards */}
          <View className="flex-row flex-wrap gap-4">
            {KPIS.map((kpi) => (
              <Card key={kpi.label} className="min-w-[200px] flex-1">
                <CardHeader className="gap-1">
                  <View className="flex-row items-center justify-between">
                    <CardDescription>{kpi.label}</CardDescription>
                    <Icon as={kpi.icon} className="text-muted-foreground size-4" />
                  </View>
                  <CardTitle className="text-2xl">{kpi.value}</CardTitle>
                  <View className="flex-row items-center gap-1">
                    <Icon as={TrendingUp} className="text-primary size-3" />
                    <Text className="text-muted-foreground text-xs">
                      {kpi.delta} from last month
                    </Text>
                  </View>
                </CardHeader>
              </Card>
            ))}
          </View>

          {/* Chart + recent sales */}
          <View className="flex-row flex-wrap gap-4">
            <Card className="min-w-[280px] flex-[2]">
              <CardHeader>
                <CardTitle>Overview</CardTitle>
                <CardDescription>Revenue for the last 12 months</CardDescription>
              </CardHeader>
              <CardContent>
                <View className="h-40 flex-row items-end justify-between gap-1.5">
                  {OVERVIEW_BARS.map((h, i) => (
                    <View
                      key={i}
                      className="bg-primary/80 flex-1 rounded-t-md"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </View>
              </CardContent>
            </Card>

            <Card className="min-w-[260px] flex-1">
              <CardHeader className="gap-1">
                <CardTitle>Recent Sales</CardTitle>
                <CardDescription>You made 265 sales this month.</CardDescription>
              </CardHeader>
              <CardContent className="gap-4">
                {RECENT_SALES.map((sale) => (
                  <View key={sale.email} className="flex-row items-center gap-3">
                    <Avatar alt={sale.name} className="size-9">
                      <AvatarFallback>
                        <Text className="text-xs">{sale.initials}</Text>
                      </AvatarFallback>
                    </Avatar>
                    <View className="flex-1">
                      <Text className="text-sm font-medium" numberOfLines={1}>
                        {sale.name}
                      </Text>
                      <Text className="text-muted-foreground text-xs" numberOfLines={1}>
                        {sale.email}
                      </Text>
                    </View>
                    <Text className="text-sm font-medium">{sale.amount}</Text>
                  </View>
                ))}
              </CardContent>
            </Card>
          </View>

          {/* Callout */}
          <Card>
            <CardHeader className="gap-1">
              <View className="flex-row items-center gap-2">
                <Badge variant="secondary">
                  <Text>Pro</Text>
                </Badge>
                <CardTitle className="text-base">Upgrade your workspace</CardTitle>
              </View>
              <CardDescription>
                Unlock advanced analytics, unlimited seats, and priority support.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-row gap-2">
              <Button size="sm">
                <Text>Upgrade</Text>
              </Button>
              <Button size="sm" variant="outline">
                <Text>Learn more</Text>
              </Button>
            </CardContent>
          </Card>
        </ScrollView>

        {/* Bottom navbar — overridden by the sidebar drawer while it is open */}
        <BottomNav />
      </SidebarInset>
    </SidebarProvider>
  );
}
