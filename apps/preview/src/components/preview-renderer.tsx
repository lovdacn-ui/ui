"use client";

import * as React from "react";
import { View, ScrollView, Image, Platform } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";

import { cn } from "@preview/lib/utils";
import { PreviewNavigationProvider } from "@preview/components/preview-navigation";

// Component imports
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@preview/components/ui/accordion";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@preview/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@preview/components/ui/alert-dialog";
import { AspectRatio } from "@preview/components/ui/aspect-ratio";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@preview/components/ui/avatar";
import { Badge } from "@preview/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@preview/components/ui/breadcrumb";
import { Button } from "@preview/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@preview/components/ui/card";
import { Checkbox } from "@preview/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@preview/components/ui/collapsible";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@preview/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@preview/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@preview/components/ui/dropdown-menu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@preview/components/ui/hover-card";
import { Icon } from "@preview/components/ui/icon";
import { Input } from "@preview/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@preview/components/ui/input-otp";
import { Label } from "@preview/components/ui/label";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from "@preview/components/ui/menubar";
import { NativeOnlyAnimatedView } from "@preview/components/ui/native-only-animated-view";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@preview/components/ui/popover";
import { Progress } from "@preview/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@preview/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@preview/components/ui/select";
import { Separator } from "@preview/components/ui/separator";
import { Skeleton } from "@preview/components/ui/skeleton";
import { Switch } from "@preview/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@preview/components/ui/tabs";
import { Text } from "@preview/components/ui/text";
import { Textarea } from "@preview/components/ui/textarea";
import { Toggle } from "@preview/components/ui/toggle";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@preview/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@preview/components/ui/tooltip";
import {
  BottomSheet,
  BottomSheetClose,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetTrigger,
} from "@preview/components/ui/bottom-sheet";
import { Calendar } from "@preview/components/ui/calendar";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@preview/components/ui/carousel";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@preview/components/ui/sheet";
import { ToastProvider, useToast } from "@preview/components/ui/sonner";
import { Spinner } from "@preview/components/ui/spinner";

// Block previews (rendered in docs iframes via /present?component=<block>)
import { Dashboard01 } from "@preview/components/blocks/dashboard-01";
import { Dashboard02 } from "@preview/components/blocks/dashboard-02";
import { LoginForm01 } from "@preview/components/blocks/login-form-01";
import { LoginForm02 } from "@preview/components/blocks/login-form-02";
import { LoginForm03 } from "@preview/components/blocks/login-form-03";
import { LoginForm04 } from "@preview/components/blocks/login-form-04";
import { SignupForm01 } from "@preview/components/blocks/signup-form-01";
import { SignupForm02 } from "@preview/components/blocks/signup-form-02";
import { SignupForm03 } from "@preview/components/blocks/signup-form-03";
import { StatsPreview } from "@preview/components/blocks/stats";

// Extra dependencies for examples
import { Home, Terminal } from "lucide-react-native";

// ── Preview charts ────────────────────────────────────────────────────────

const CHART_BG = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
] as const;

// Sample data for the dashboard charts.
const STOCK_DATA = [38, 30, 44, 40, 58, 52, 71, 66, 88];
const STOCK_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
];
const POWER_DATA = [
  { use: 45, solar: 20 },
  { use: 62, solar: 34 },
  { use: 50, solar: 27 },
  { use: 80, solar: 45 },
  { use: 66, solar: 52 },
  { use: 94, solar: 61 },
  { use: 72, solar: 47 },
];
const REVENUE = [
  { label: "Subscriptions", value: "$18.2k", pct: 92 },
  { label: "One-time", value: "$11.4k", pct: 64 },
  { label: "Services", value: "$7.8k", pct: 44 },
  { label: "Add-ons", value: "$4.1k", pct: 24 },
  { label: "Other", value: "$1.9k", pct: 12 },
];
const TRAFFIC = [
  { label: "Direct", pct: 38 },
  { label: "Organic", pct: 27 },
  { label: "Referral", pct: 18 },
  { label: "Social", pct: 11 },
  { label: "Email", pct: 6 },
];

// Smooth-ish area + line chart. Inherits the active chart color through
// `currentColor`, so it lives inside a `text-chart-1` container. It measures its
// own width so the stroke stays crisp instead of being stretched by a viewBox.
function AreaLineChart({
  data,
  height = 76,
  strokeWidth = 2.5,
  labels,
  formatValue,
}: {
  data: number[];
  height?: number;
  strokeWidth?: number;
  /** Optional x-axis labels, shown in the hover tooltip alongside the value. */
  labels?: string[];
  formatValue?: (value: number) => string;
}) {
  const [width, setWidth] = React.useState(0);
  const [hovered, setHovered] = React.useState<number | null>(null);
  const pad = strokeWidth + 3;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;

  const points = data.map((v, i) => {
    const x =
      data.length > 1
        ? pad + (i * (width - pad * 2)) / (data.length - 1)
        : width / 2;
    const y = pad + (1 - (v - min) / span) * (height - pad * 2);
    return [x, y] as [number, number];
  });

  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`)
    .join(" ");
  const first = points[0];
  const last = points[points.length - 1];
  const area =
    first && last
      ? `${line} L ${last[0]} ${height - pad} L ${first[0]} ${height - pad} Z`
      : "";

  // Snap to the closest data point. `offsetX` is the web hover position;
  // `locationX` is the native touch position.
  const trackAt = React.useCallback(
    (x: number) => {
      if (!width || points.length === 0) return;
      let closest = 0;
      let best = Infinity;
      points.forEach((p, i) => {
        const distance = Math.abs(p[0] - x);
        if (distance < best) {
          best = distance;
          closest = i;
        }
      });
      setHovered(closest);
    },
    [points, width],
  );

  const active = hovered !== null ? points[hovered] : null;
  const activeValue = hovered !== null ? data[hovered] : null;
  const activeLabel = hovered !== null ? labels?.[hovered] : undefined;
  const tooltipWidth = 84;

  return (
    <View
      className="text-chart-1 relative"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ height }}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onPointerMove={(e: any) => {
        const ne = e?.nativeEvent ?? {};
        trackAt(ne.offsetX ?? ne.locationX ?? 0);
      }}
      onPointerLeave={() => setHovered(null)}
      onStartShouldSetResponder={() => true}
      onResponderGrant={(e) => trackAt(e.nativeEvent.locationX)}
      onResponderMove={(e) => trackAt(e.nativeEvent.locationX)}
      onResponderRelease={() => setHovered(null)}
      onResponderTerminate={() => setHovered(null)}
    >
      {width > 0 ? (
        <Svg width={width} height={height}>
          {!!area && <Path d={area} fill="currentColor" fillOpacity={0.15} />}
          <Path
            d={line}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {active && (
            <Path
              d={`M ${active[0]} ${pad} L ${active[0]} ${height - pad}`}
              stroke="currentColor"
              strokeOpacity={0.35}
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          )}
          {points.map((p, i) => (
            <Circle
              key={i}
              cx={p[0]}
              cy={p[1]}
              r={hovered === i ? strokeWidth * 2 : strokeWidth}
              fill="currentColor"
            />
          ))}
        </Svg>
      ) : null}

      {active && activeValue !== null ? (
        <View
          pointerEvents="none"
          className="border-border bg-popover absolute items-center rounded-lg border px-2 py-1 shadow-sm shadow-black/10"
          style={{
            width: tooltipWidth,
            left: Math.min(
              Math.max(active[0] - tooltipWidth / 2, 0),
              Math.max(width - tooltipWidth, 0),
            ),
            top: Math.max(active[1] - 42, 0),
          }}
        >
          {!!activeLabel && (
            <Text className="text-muted-foreground text-[10px] leading-tight">
              {activeLabel}
            </Text>
          )}
          <Text className="text-popover-foreground text-xs font-semibold leading-tight">
            {formatValue ? formatValue(activeValue) : String(activeValue)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// Dashboard Component rendering a premium 3-column desktop layout of cards
const DashboardComponent = ({ topPad = 64 }: { topPad?: number }) => {
  const [checked1, setChecked1] = React.useState(true);
  const [checked2, setChecked2] = React.useState(true);
  const [checked3, setChecked3] = React.useState(false);
  const [checked4, setChecked4] = React.useState(false);
  const [powerProgress, setPowerProgress] = React.useState(85);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setPowerProgress((prev) => (prev >= 100 ? 10 : prev + 5));
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <ScrollView
      className="flex-1 bg-background w-full"
      contentContainerStyle={{
        paddingTop: topPad,
        paddingBottom: 48,
        paddingHorizontal: 24,
      }}
    >
      <View className="flex-row flex-wrap -mx-3 gap-y-6">
        {/* Column 1 */}
        <View className="w-full lg:w-1/3 px-3 gap-6">
          {/* Card 1: Account Access */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">
                Account Access
              </CardTitle>
              <CardDescription>
                Update your credentials or re-authenticate.
              </CardDescription>
            </CardHeader>
            <CardContent className="gap-4">
              <View className="gap-1.5">
                <Label htmlFor="email">
                  <Text className="text-xs font-semibold">Email Address</Text>
                </Label>
                <Input
                  id="email"
                  placeholder="artist@studio.inc"
                  defaultValue="artist@studio.inc"
                />
              </View>
              <View className="gap-1.5">
                <Label htmlFor="password">
                  <Text className="text-xs font-semibold">
                    Current Password
                  </Text>
                </Label>
                <Input
                  id="password"
                  secureTextEntry
                  defaultValue="hunter2hunter2"
                />
              </View>
              <Button>
                <Text>Update Security</Text>
              </Button>
              <View className="mt-2 p-3 rounded-lg border border-destructive/20 bg-destructive/5 gap-1">
                <Text className="text-xs font-semibold text-destructive">
                  Danger Zone
                </Text>
                <Text className="text-[11px] text-muted-foreground">
                  Archive account and remove catalog.
                </Text>
              </View>
            </CardContent>
          </Card>

          {/* Card 2: Card Balance */}
          <Card>
            <CardContent className="pt-6 flex-row justify-between items-center">
              <View>
                <Text className="text-xs text-muted-foreground">
                  Card Balance
                </Text>
                <Text className="text-2xl font-bold mt-1">US$12.94</Text>
                <Text className="text-[11px] text-muted-foreground mt-0.5">
                  US$11,337.06 Available
                </Text>
              </View>
              <Button size="sm" variant="outline">
                <Text>Pay Early</Text>
              </Button>
            </CardContent>
          </Card>

          {/* Card: Revenue by Category */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">
                Revenue by Category
              </CardTitle>
              <CardDescription>Last 30 days.</CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              {REVENUE.map((r, i) => (
                <View key={r.label} className="gap-1.5">
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-muted-foreground">
                      {r.label}
                    </Text>
                    <Text className="text-xs font-semibold text-foreground">
                      {r.value}
                    </Text>
                  </View>
                  <View className="h-2 overflow-hidden rounded-full bg-muted/40">
                    <View
                      className={cn("h-full rounded-full", CHART_BG[i])}
                      style={{ width: `${r.pct}%` }}
                    />
                  </View>
                </View>
              ))}
            </CardContent>
          </Card>

          {/* Card 3: Transfer Funds */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg font-bold">
                Transfer Funds
              </CardTitle>
              <CardDescription>Move money between accounts.</CardDescription>
            </CardHeader>
            <CardContent className="gap-4">
              <View className="gap-1.5">
                <Label>
                  <Text className="text-xs font-semibold">
                    Amount to Transfer
                  </Text>
                </Label>
                <Input
                  placeholder="$ 1,200.00"
                  defaultValue="$ 1,200.00"
                  keyboardType="decimal-pad"
                />
              </View>
              <View className="gap-1.5">
                <Label>
                  <Text className="text-xs font-semibold">From Account</Text>
                </Label>
                <Input defaultValue="Main Checking (•8402) — $12,450.00" />
              </View>
              <View className="gap-1.5">
                <Label>
                  <Text className="text-xs font-semibold">To Account</Text>
                </Label>
                <Input defaultValue="High Yield Savings (•1192) — $42,100.00" />
              </View>
              <Separator />
              <View className="gap-2">
                <View className="flex-row justify-between">
                  <Text className="text-xs text-muted-foreground">
                    Estimated arrival
                  </Text>
                  <Text className="text-xs font-semibold text-foreground">
                    Today, Apr 14
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-xs text-muted-foreground">
                    Transaction fee
                  </Text>
                  <Text className="text-xs font-semibold text-foreground">
                    $0.00
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-xs text-muted-foreground">
                    Total amount
                  </Text>
                  <Text className="text-xs font-bold text-foreground">
                    $1,200.00
                  </Text>
                </View>
              </View>
              <Button className="w-full mt-2">
                <Text>Confirm Transfer</Text>
              </Button>
            </CardContent>
          </Card>
        </View>

        {/* Column 2 */}
        <View className="w-full lg:w-1/3 px-3 gap-6">
          {/* Card 4: Payout Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">
                Receiving Method
              </CardTitle>
              <CardDescription>
                Set how you receive payout transfers.
              </CardDescription>
            </CardHeader>
            <CardContent className="gap-4">
              <View className="gap-1.5">
                <Label>
                  <Text className="text-xs font-semibold">
                    Account Holder Name
                  </Text>
                </Label>
                <Input defaultValue="Synthetic Horizons Music LLC" />
              </View>
              <View className="gap-1.5">
                <Label>
                  <Text className="text-xs font-semibold">
                    IBAN / Account Number
                  </Text>
                </Label>
                <Input defaultValue="DE89 3704 0044 •••• ••" />
              </View>
              <Button className="w-full">
                <Text>Save Payout Settings</Text>
              </Button>
            </CardContent>
          </Card>

          {/* Card 5: Power Usage */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Power Usage</CardTitle>
              <CardDescription>Whole Home analysis.</CardDescription>
            </CardHeader>
            <CardContent className="gap-4">
              {/* Usage vs. solar — two-series bar chart */}
              <View className="gap-2 rounded-lg bg-muted/20 px-3 py-3">
                <View className="h-24 flex-row items-end justify-between">
                  {POWER_DATA.map((d, i) => (
                    <View
                      key={i}
                      className="h-full flex-1 flex-row items-end justify-center gap-0.5"
                    >
                      <View
                        className="w-2 rounded-t bg-chart-1"
                        style={{ height: `${d.use}%` }}
                      />
                      <View
                        className="w-2 rounded-t bg-chart-2"
                        style={{ height: `${d.solar}%` }}
                      />
                    </View>
                  ))}
                </View>
                <View className="flex-row justify-between px-0.5">
                  {["M", "T", "W", "T", "F", "S", "S"].map((l, i) => (
                    <Text
                      key={i}
                      className="flex-1 text-center text-[9px] text-muted-foreground"
                    >
                      {l}
                    </Text>
                  ))}
                </View>
              </View>
              <View className="flex-row gap-4">
                <View className="flex-row items-center gap-1.5">
                  <View className="size-2 rounded-full bg-chart-1" />
                  <Text className="text-[10px] text-muted-foreground">
                    Usage
                  </Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <View className="size-2 rounded-full bg-chart-2" />
                  <Text className="text-[10px] text-muted-foreground">
                    Solar
                  </Text>
                </View>
              </View>
              <View className="flex-row justify-between">
                <View>
                  <Text className="text-[10px] text-muted-foreground">
                    Currently Using
                  </Text>
                  <Text className="text-sm font-semibold text-foreground">
                    3.4 kW
                  </Text>
                </View>
                <View>
                  <Text className="text-[10px] text-muted-foreground">
                    Solar Gen
                  </Text>
                  <Text className="text-sm font-semibold text-green-600">
                    +1.2 kW
                  </Text>
                </View>
              </View>
              <View className="gap-1.5">
                <View className="flex-row justify-between">
                  <Text className="text-xs text-muted-foreground">
                    Battery Level
                  </Text>
                  <Text className="text-xs font-semibold text-foreground">
                    {powerProgress}%
                  </Text>
                </View>
                <Progress value={powerProgress} />
              </View>
            </CardContent>
          </Card>

          {/* Card 6: Upcoming Payments */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg font-bold">
                Upcoming Payments
              </CardTitle>
              <CardDescription>Scheduled subscription items.</CardDescription>
            </CardHeader>
            <CardContent className="gap-4">
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-sm font-semibold text-foreground">
                    Netflix Subscription
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    Apr 15, 2024
                  </Text>
                </View>
                <Text className="text-sm font-bold text-foreground">
                  $19.99
                </Text>
              </View>
              <Separator />
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-sm font-semibold text-foreground">
                    Rent Payment
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    Apr 1, 2024
                  </Text>
                </View>
                <Text className="text-sm font-bold text-foreground">
                  $2,400.00
                </Text>
              </View>
              <Separator />
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-sm font-semibold text-foreground">
                    Auto Insurance
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    Apr 22, 2024
                  </Text>
                </View>
                <Text className="text-sm font-bold text-foreground">
                  $186.00
                </Text>
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Column 3 */}
        <View className="w-full lg:w-1/3 px-3 gap-6">
          {/* Card 7: Stock Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">
                Stock Performance
              </CardTitle>
              <CardDescription>6-month price history.</CardDescription>
            </CardHeader>
            <CardContent className="gap-4">
              <View className="flex-row justify-between items-center">
                <Text className="text-xs text-muted-foreground">Ticker</Text>
                <Badge variant="outline">
                  <Text>VOO</Text>
                </Badge>
              </View>
              {/* 6-month price trend */}
              <View className="rounded-lg bg-muted/20 p-2">
                <AreaLineChart
                  data={STOCK_DATA}
                  labels={STOCK_LABELS}
                  formatValue={(v) => `$${v.toFixed(2)}`}
                />
              </View>
              <View className="flex-row justify-between">
                <Text className="text-[11px] text-muted-foreground">
                  65% achieved
                </Text>
                <Text className="text-xs font-bold text-foreground">
                  $273,000
                </Text>
              </View>
            </CardContent>
          </Card>

          {/* Card: Traffic Sources */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">
                Traffic Sources
              </CardTitle>
              <CardDescription>Sessions this month.</CardDescription>
            </CardHeader>
            <CardContent className="gap-4">
              <View className="h-3 flex-row overflow-hidden rounded-full">
                {TRAFFIC.map((t, i) => (
                  <View
                    key={t.label}
                    className={cn("h-full", CHART_BG[i])}
                    style={{ width: `${t.pct}%` }}
                  />
                ))}
              </View>
              <View className="gap-2">
                {TRAFFIC.map((t, i) => (
                  <View
                    key={t.label}
                    className="flex-row items-center justify-between"
                  >
                    <View className="flex-row items-center gap-2">
                      <View
                        className={cn("size-2.5 rounded-full", CHART_BG[i])}
                      />
                      <Text className="text-xs text-muted-foreground">
                        {t.label}
                      </Text>
                    </View>
                    <Text className="text-xs font-semibold text-foreground">
                      {t.pct}%
                    </Text>
                  </View>
                ))}
              </View>
            </CardContent>
          </Card>

          {/* Card 8: Set Milestone */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">
                Set a milestone
              </CardTitle>
              <CardDescription>Define your financial target.</CardDescription>
            </CardHeader>
            <CardContent className="gap-4">
              <View className="gap-1.5">
                <Label>
                  <Text className="text-xs font-semibold">Goal Name</Text>
                </Label>
                <Input placeholder="e.g. New Car, Home Downpayment" />
              </View>
              <View className="flex-row gap-2">
                <View className="flex-1 gap-1.5">
                  <Label>
                    <Text className="text-xs font-semibold">Target Amount</Text>
                  </Label>
                  <Input placeholder="$15,000" keyboardType="decimal-pad" />
                </View>
                <View className="flex-1 gap-1.5">
                  <Label>
                    <Text className="text-xs font-semibold">Target Date</Text>
                  </Label>
                  <Input placeholder="Dec 2025" />
                </View>
              </View>
              <View className="flex-row gap-2 mt-2">
                <Button className="flex-1">
                  <Text>Create Goal</Text>
                </Button>
                <Button variant="outline" className="flex-1">
                  <Text>Cancel</Text>
                </Button>
              </View>
            </CardContent>
          </Card>

          {/* Card 9: Notifications */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Notifications</CardTitle>
              <CardDescription>
                Choose what you want to be notified about.
              </CardDescription>
            </CardHeader>
            <CardContent className="gap-4">
              <View className="flex-row items-center gap-2">
                <Checkbox checked={checked1} onCheckedChange={setChecked1} />
                <Text className="text-xs font-semibold text-foreground">
                  Transaction alerts
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Checkbox checked={checked2} onCheckedChange={setChecked2} />
                <Text className="text-xs font-semibold text-foreground">
                  Security alerts
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Checkbox checked={checked3} onCheckedChange={setChecked3} />
                <Text className="text-xs font-semibold text-foreground">
                  Goal milestones
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Checkbox checked={checked4} onCheckedChange={setChecked4} />
                <Text className="text-xs font-semibold text-foreground">
                  Market updates
                </Text>
              </View>
              <Button className="w-full mt-2">
                <Text>Save Preferences</Text>
              </Button>
            </CardContent>
          </Card>
        </View>
      </View>
    </ScrollView>
  );
};

// Showcase Component rendering a dynamic dashboard mockup of key controls
const ShowcaseComponent = ({ topPad = 60 }: { topPad?: number }) => {
  const [checked, setChecked] = React.useState(false);
  const [airplane, setAirplane] = React.useState(false);
  const [progressVal, setProgressVal] = React.useState(33);
  const [activeTab, setActiveTab] = React.useState("general");

  React.useEffect(() => {
    const timer = setInterval(() => {
      setProgressVal((prev) => (prev >= 100 ? 10 : prev + 10));
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <ScrollView
      className="flex-1 bg-background w-full"
      contentContainerStyle={{
        paddingTop: topPad,
        paddingBottom: 32,
        paddingHorizontal: 16,
        gap: 16,
      }}
    >
      {/* Header Info */}
      <Card className="w-full">
        <CardHeader className="flex-row items-center justify-between pb-2">
          <View>
            <CardTitle className="text-xl font-bold">
              Showcase Preview
            </CardTitle>
            <CardDescription>Live styling customizer</CardDescription>
          </View>
          <Badge>
            <Text>Live</Text>
          </Badge>
        </CardHeader>
        <CardContent className="gap-4">
          <Text>
            This dashboard displays your real-time styling, base colors, font
            selections, and roundness.
          </Text>
          <View className="flex-row gap-2">
            <Badge variant="outline">
              <Text>v4.0</Text>
            </Badge>
          </View>
        </CardContent>
      </Card>

      {/* Interactive Controls */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-xl font-bold">
            Interactive Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="gap-6">
          <View className="flex-row items-center gap-2">
            <Checkbox
              id="showcase-checkbox"
              checked={checked}
              onCheckedChange={setChecked}
            />
            <Label
              htmlFor="showcase-checkbox"
              onPress={() => setChecked(!checked)}
            >
              <Text>Enable features</Text>
            </Label>
          </View>

          <View className="flex-row items-center justify-between">
            <Label
              htmlFor="showcase-switch"
              onPress={() => setAirplane(!airplane)}
            >
              <Text>Airplane Mode</Text>
            </Label>
            <Switch
              id="showcase-switch"
              checked={airplane}
              onCheckedChange={setAirplane}
            />
          </View>

          <View className="gap-2">
            <View className="flex-row justify-between">
              <Text className="text-xs text-muted-foreground">
                System Loading
              </Text>
              <Text className="text-xs text-muted-foreground">
                {progressVal}%
              </Text>
            </View>
            <Progress value={progressVal} />
          </View>

          <View className="flex-row gap-2">
            <Button className="flex-1">
              <Text>Primary Action</Text>
            </Button>
            <Button variant="outline" className="flex-1">
              <Text>Cancel</Text>
            </Button>
          </View>
        </CardContent>
      </Card>

      {/* Tabs Layout */}
      <Card className="w-full">
        <CardContent className="pt-6">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="flex-row">
              <TabsTrigger value="general" className="flex-1">
                <Text>General</Text>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex-1">
                <Text>Security</Text>
              </TabsTrigger>
            </TabsList>
            <TabsContent
              value="general"
              className="p-4 border border-t-0 border-border rounded-b-lg gap-2"
            >
              <Text variant="large">Profile Details</Text>
              <Input placeholder="John Doe" defaultValue="John Doe" />
              <Input
                placeholder="john@example.com"
                defaultValue="john@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </TabsContent>
            <TabsContent
              value="security"
              className="p-4 border border-t-0 border-border rounded-b-lg gap-2"
            >
              <Text variant="large">Change Password</Text>
              <Input placeholder="Current Password" secureTextEntry />
              <Input placeholder="New Password" secureTextEntry />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </ScrollView>
  );
};

function InputOTPDemo() {
  const [value, setValue] = React.useState("");
  return (
    <InputOTP value={value} onChangeText={setValue} maxLength={6}>
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        <InputOTPSlot index={3} />
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
      </InputOTPGroup>
    </InputOTP>
  );
}

const COMPONENT_RENDERERS: Record<string, () => React.ReactNode> = {
  dashboard: () => <DashboardComponent />,
  showcase: () => <ShowcaseComponent />,
  // Blocks (pre-composed sections previewed in the docs).
  "dashboard-01": () => <Dashboard01 />,
  "dashboard-02": () => <Dashboard02 />,
  // `sidebar` (the component) reuses the dashboard-02 app shell as its live demo;
  // it is rendered full-bleed via the branch below.
  sidebar: () => <Dashboard02 />,
  breadcrumb: () => (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink onPress={() => {}}>
            <Text>Home</Text>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink onPress={() => {}}>
            <Text>Components</Text>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbEllipsis />
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  ),
  "input-otp": () => <InputOTPDemo />,
  "login-01": () => <LoginForm01 />,
  "login-02": () => <LoginForm02 />,
  "login-03": () => <LoginForm03 />,
  "login-04": () => <LoginForm04 />,
  "signup-01": () => <SignupForm01 />,
  "signup-02": () => <SignupForm02 />,
  "signup-03": () => <SignupForm03 />,
  "stats-01": () => <StatsPreview />,
  accordion: () => (
    <Accordion type="single" collapsible className="w-full max-w-sm">
      <AccordionItem value="item-1">
        <AccordionTrigger>
          <Text>Is it accessible?</Text>
        </AccordionTrigger>
        <AccordionContent>
          <Text>Yes. It adheres to the WAI-ARIA design pattern.</Text>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
  alert: () => (
    <Alert icon={Terminal} className="w-full max-w-sm">
      <AlertTitle>
        <Text>Heads up!</Text>
      </AlertTitle>
      <AlertDescription>
        <Text>You can add components to your app using the CLI.</Text>
      </AlertDescription>
    </Alert>
  ),
  "alert-dialog": () => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline">
          <Text>Show Dialog</Text>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Text>Are you sure?</Text>
          </AlertDialogTitle>
          <AlertDialogDescription>
            <Text>This action cannot be undone.</Text>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            <Text>Cancel</Text>
          </AlertDialogCancel>
          <AlertDialogAction>
            <Text>Continue</Text>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
  "aspect-ratio": () => (
    <View className="w-full max-w-sm">
      <AspectRatio ratio={16 / 9}>
        <Image
          source={{ uri: "https://picsum.photos/800/450" }}
          style={{ width: "100%", height: "100%", borderRadius: 8 }}
          resizeMode="cover"
        />
      </AspectRatio>
    </View>
  ),
  avatar: () => (
    <Avatar alt="User">
      <AvatarImage source={{ uri: "https://github.com/shadcn.png" }} />
      <AvatarFallback>
        <Text>CN</Text>
      </AvatarFallback>
    </Avatar>
  ),
  badge: () => (
    <View className="flex-row flex-wrap items-center justify-center gap-2">
      <Badge>
        <Text>Badge</Text>
      </Badge>
      <Badge variant="secondary">
        <Text>Secondary</Text>
      </Badge>
      <Badge variant="outline">
        <Text>Outline</Text>
      </Badge>
      <Badge variant="destructive">
        <Text>Destructive</Text>
      </Badge>
    </View>
  ),
  button: () => (
    <View className="flex-row flex-wrap items-center justify-center gap-3">
      <Button>
        <Text>Default</Text>
      </Button>
      <Button variant="secondary">
        <Text>Secondary</Text>
      </Button>
      <Button variant="outline">
        <Text>Outline</Text>
      </Button>
      <Button variant="ghost">
        <Text>Ghost</Text>
      </Button>
      <Button variant="destructive">
        <Text>Destructive</Text>
      </Button>
    </View>
  ),
  card: () => (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>
          <Text>Card Title</Text>
        </CardTitle>
        <CardDescription>
          <Text>Card description</Text>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Text>Card content</Text>
      </CardContent>
      <CardFooter>
        <Text>Card footer</Text>
      </CardFooter>
    </Card>
  ),
  checkbox: function PreviewComponent() {
    const [checked, setChecked] = React.useState(false);
    return (
      <View className="flex-row items-center gap-2">
        <Checkbox id="terms" checked={checked} onCheckedChange={setChecked} />
        <Label htmlFor="terms" onPress={() => setChecked(!checked)}>
          <Text>Accept terms and conditions</Text>
        </Label>
      </View>
    );
  },
  collapsible: () => (
    <Collapsible className="w-full max-w-sm">
      <CollapsibleTrigger className="p-2 border border-border rounded-md">
        <Text className="text-center">Toggle collapsible panel</Text>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <View className="p-4 border border-t-0 border-border rounded-b-md bg-muted/20">
          <Text>Collapsible content</Text>
        </View>
      </CollapsibleContent>
    </Collapsible>
  ),
  "context-menu": () => (
    <ContextMenu>
      <ContextMenuTrigger>
        <View className="rounded-md border border-dashed border-border p-8 min-w-[200px] items-center justify-center">
          <Text className="text-muted-foreground">Long press here</Text>
        </View>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem>
          <Text>Back</Text>
        </ContextMenuItem>
        <ContextMenuItem>
          <Text>Forward</Text>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
  dialog: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Text>Open Dialog</Text>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <Text>Dialog title</Text>
          </DialogTitle>
          <DialogDescription>
            <Text>Dialog description</Text>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  ),
  "dropdown-menu": () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Text>Open Dropdown</Text>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>
          <Text>Profile</Text>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Text>Settings</Text>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
  "hover-card": () => (
    <HoverCard>
      <HoverCardTrigger>
        <Text className="underline text-primary">@lvcn</Text>
      </HoverCardTrigger>
      <HoverCardContent>
        <Text>Beautifully designed React Native components.</Text>
      </HoverCardContent>
    </HoverCard>
  ),
  icon: () => <Icon as={Home} className="size-6 text-foreground" />,
  input: function PreviewComponent() {
    const [val, setVal] = React.useState("");
    const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val);
    return (
      <View className="w-full max-w-sm gap-2">
        <Label>
          <Text className="font-medium">Email</Text>
        </Label>
        <Input
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={val}
          onChangeText={setVal}
          aria-invalid={val.length > 0 && !valid}
        />
        <View className="flex-row items-center justify-between">
          <Text variant="muted" className="text-xs">
            {val.length === 0
              ? "Type to see live state."
              : valid
                ? "Looks good."
                : "Enter a valid email address."}
          </Text>
          <Text variant="muted" className="text-xs tabular-nums">
            {val.length}/64
          </Text>
        </View>
      </View>
    );
  },
  label: () => (
    <Label>
      <Text className="font-bold">Email Address</Text>
    </Label>
  ),
  menubar: () => (
    <Menubar>
      <MenubarMenu value="file">
        <MenubarTrigger>
          <Text>File</Text>
        </MenubarTrigger>
        <MenubarContent>
          <MenubarItem>
            <Text>New Tab</Text>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  ),
  "native-only-animated-view": () => (
    <NativeOnlyAnimatedView className="p-4 bg-muted/30 border border-border rounded-lg">
      <Text>Animated on native, plain view on web.</Text>
    </NativeOnlyAnimatedView>
  ),
  popover: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <Text>Open Popover</Text>
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <Text>Place content for the popover here.</Text>
      </PopoverContent>
    </Popover>
  ),
  progress: () => (
    <View className="w-full max-w-sm p-4">
      <Progress value={33} />
    </View>
  ),
  "radio-group": function PreviewComponent() {
    const [value, setValue] = React.useState("comfortable");
    return (
      <RadioGroup value={value} onValueChange={setValue} className="gap-2">
        <View className="flex-row items-center gap-2">
          <RadioGroupItem value="default" id="r1" />
          <Label htmlFor="r1" onPress={() => setValue("default")}>
            <Text>Default</Text>
          </Label>
        </View>
        <View className="flex-row items-center gap-2">
          <RadioGroupItem value="comfortable" id="r2" />
          <Label htmlFor="r2" onPress={() => setValue("comfortable")}>
            <Text>Comfortable</Text>
          </Label>
        </View>
      </RadioGroup>
    );
  },
  select: function PreviewComponent() {
    const [value, setValue] = React.useState<{ value: string; label: string }>({
      value: "apple",
      label: "Apple",
    });
    return (
      <View className="w-full max-w-sm items-center">
        <Select value={value} onValueChange={(val) => val && setValue(val)}>
          <SelectTrigger>
            <SelectValue placeholder="Select a fruit" />
          </SelectTrigger>
          <SelectContent align="center">
            <SelectItem value="apple" label="Apple" />
            <SelectItem value="banana" label="Banana" />
          </SelectContent>
        </Select>
      </View>
    );
  },
  separator: () => (
    <View className="w-full max-w-sm items-center gap-2">
      <Text>Above</Text>
      <Separator className="my-2" />
      <Text>Below</Text>
    </View>
  ),
  skeleton: () => (
    <View className="flex-row items-center gap-4">
      <Skeleton className="size-12 rounded-full" />
      <View className="gap-2">
        <Skeleton className="h-4 w-[200px]" />
        <Skeleton className="h-4 w-[160px]" />
      </View>
    </View>
  ),
  switch: function PreviewComponent() {
    const [checked, setChecked] = React.useState(false);
    return (
      <View className="flex-row items-center gap-2">
        <Switch id="airplane" checked={checked} onCheckedChange={setChecked} />
        <Label htmlFor="airplane" onPress={() => setChecked(!checked)}>
          <Text>Airplane Mode</Text>
        </Label>
      </View>
    );
  },
  tabs: function PreviewComponent() {
    const [value, setValue] = React.useState("account");
    return (
      <Tabs value={value} onValueChange={setValue} className="w-full max-w-sm">
        <TabsList className="flex-row">
          <TabsTrigger value="account" className="flex-1">
            <Text>Account</Text>
          </TabsTrigger>
          <TabsTrigger value="password" className="flex-1">
            <Text>Password</Text>
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value="account"
          className="p-4 border border-t-0 border-border rounded-b-lg"
        >
          <Text>Make changes to your account here.</Text>
        </TabsContent>
        <TabsContent
          value="password"
          className="p-4 border border-t-0 border-border rounded-b-lg"
        >
          <Text>Change your password here.</Text>
        </TabsContent>
      </Tabs>
    );
  },
  text: () => (
    <View className="gap-2 items-center">
      <Text variant="h1">Heading 1</Text>
      <Text variant="large">Large text</Text>
      <Text>Default body text</Text>
      <Text variant="muted">Muted text</Text>
    </View>
  ),
  textarea: function PreviewComponent() {
    const [val, setVal] = React.useState("");
    const words = val.trim() ? val.trim().split(/\s+/).length : 0;
    return (
      <View className="w-full max-w-sm gap-2">
        <Label>
          <Text className="font-medium">Message</Text>
        </Label>
        <Textarea
          placeholder="Type your message here."
          value={val}
          onChangeText={setVal}
        />
        <View className="flex-row items-center justify-between">
          <Text variant="muted" className="text-xs">
            {words === 0
              ? "Your message is private."
              : `${words} word${words === 1 ? "" : "s"}`}
          </Text>
          <Text variant="muted" className="text-xs tabular-nums">
            {val.length} chars
          </Text>
        </View>
      </View>
    );
  },
  toggle: function PreviewComponent() {
    const [active, setActive] = React.useState(false);
    return (
      <Toggle
        aria-label="Toggle italic"
        pressed={active}
        onPressedChange={setActive}
      >
        <Text>Italic</Text>
      </Toggle>
    );
  },
  "toggle-group": function PreviewComponent() {
    const [value, setValue] = React.useState("a");
    return (
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(val) => val && setValue(val)}
      >
        <ToggleGroupItem value="a">
          <Text>A</Text>
        </ToggleGroupItem>
        <ToggleGroupItem value="b">
          <Text>B</Text>
        </ToggleGroupItem>
        <ToggleGroupItem value="c">
          <Text>C</Text>
        </ToggleGroupItem>
      </ToggleGroup>
    );
  },
  // Key must stay lowercase — it is matched against `?component=` and the docs slug.
  tooltip: () => (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <Button variant="outline">
          <Text>Hover or Tap</Text>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <Text>Add to library</Text>
      </TooltipContent>
    </Tooltip>
  ),
  typography: () => (
    <ScrollView className="w-full" contentContainerClassName="gap-1 px-2 pb-4">
      <Text variant="h1">The Joke Tax</Text>
      <Text variant="lead">
        A short tour of every text variant shipped with the Text component.
      </Text>
      <Text variant="h2">The King&apos;s Plan</Text>
      <Text variant="p">
        The king thought long and hard, and finally came up with a brilliant
        plan: he would tax the jokes in the kingdom.
      </Text>
      <Text variant="h3">The Joke Tax</Text>
      <Text variant="blockquote">
        &quot;After all,&quot; he said, &quot;everyone enjoys a good joke, so
        it&apos;s only fair that they should pay for the privilege.&quot;
      </Text>
      <Text variant="h4">People of the Kingdom</Text>
      <Text variant="p">
        Use <Text variant="code">variant=&quot;code&quot;</Text> for inline
        snippets.
      </Text>
      <Text variant="large">Large — a slightly heavier lead-in.</Text>
      <Text variant="small">Small — dense metadata and captions.</Text>
      <Text variant="muted">Muted — secondary, lower-contrast copy.</Text>
    </ScrollView>
  ),
  charts: function PreviewComponent() {
    const series = [
      {
        title: "Revenue",
        caption: "Last 9 months",
        data: STOCK_DATA,
        labels: STOCK_LABELS,
        format: (v: number) => `$${(v * 120).toLocaleString()}`,
      },
      {
        title: "Active users",
        caption: "Weekly average",
        data: [12, 19, 16, 28, 24, 33, 41, 38, 52],
        labels: ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9"],
        format: (v: number) => `${v}k users`,
      },
    ];
    return (
      <View className="w-full gap-4">
        {series.map((s) => (
          <Card key={s.title}>
            <CardHeader>
              <CardTitle>
                <Text>{s.title}</Text>
              </CardTitle>
              <CardDescription>
                <Text>
                  {s.caption} — hover or drag across the line for values.
                </Text>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AreaLineChart
                data={s.data}
                labels={s.labels}
                formatValue={s.format}
                height={110}
              />
            </CardContent>
          </Card>
        ))}
      </View>
    );
  },
  "bottom-sheet": () => (
    <BottomSheet>
      <BottomSheetTrigger asChild>
        <Button>
          <Text>Open Bottom Sheet</Text>
        </Button>
      </BottomSheetTrigger>
      <BottomSheetContent>
        <BottomSheetHeader>
          <BottomSheetTitle>
            <Text>Bottom Sheet Menu</Text>
          </BottomSheetTitle>
          <BottomSheetDescription>
            <Text>
              This sheet animates smoothly from the bottom of the viewport.
            </Text>
          </BottomSheetDescription>
        </BottomSheetHeader>
        <View className="py-4">
          <Text>Your custom content here.</Text>
        </View>
        <BottomSheetFooter>
          <BottomSheetClose asChild>
            <Button variant="outline">
              <Text>Close</Text>
            </Button>
          </BottomSheetClose>
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheet>
  ),
  calendar: function PreviewComponent() {
    const [date, setDate] = React.useState<Date | undefined>(new Date());
    return (
      <View className="items-center gap-4">
        <Calendar value={date} onChange={setDate} />
        {date && (
          <Text className="text-sm text-muted-foreground mt-2">
            Selected: {date.toDateString()}
          </Text>
        )}
      </View>
    );
  },
  carousel: function PreviewComponent() {
    const items = [
      { id: "1", title: "Slide 1", color: "bg-red-500/20" },
      { id: "2", title: "Slide 2", color: "bg-blue-500/20" },
      { id: "3", title: "Slide 3", color: "bg-green-500/20" },
    ];
    return (
      <Carousel className="w-full max-w-sm h-48">
        <CarouselContent
          data={items}
          renderItem={({ item }) => (
            <CarouselItem
              key={item.id}
              className={cn(
                "h-40 rounded-xl justify-center items-center border border-border",
                item.color,
              )}
            >
              <Text className="text-lg font-bold">{item.title}</Text>
            </CarouselItem>
          )}
        />
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    );
  },
  sheet: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">
          <Text>Open Side Sheet</Text>
        </Button>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>
            <Text>Side Panel</Text>
          </SheetTitle>
          <SheetDescription>
            <Text>
              This sheet animates smoothly from the right side of the screen.
            </Text>
          </SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  ),
  sonner: function PreviewComponent() {
    const { toast } = useToast();
    return (
      <View className="flex-row flex-wrap gap-2 justify-center">
        <Button
          onPress={() =>
            toast("Success Notification", {
              description: "The operation completed successfully.",
              type: "success",
            })
          }
        >
          <Text>Success Toast</Text>
        </Button>
        <Button
          variant="destructive"
          onPress={() =>
            toast("Error Alert", {
              description: "An unexpected error occurred.",
              type: "error",
            })
          }
        >
          <Text>Error Toast</Text>
        </Button>
      </View>
    );
  },
  spinner: () => (
    <View className="flex-row items-center gap-4 justify-center">
      <Spinner size="small" />
      <Spinner size="large" />
      <Spinner size={48} color="#f43f5e" />
    </View>
  ),
};

// Premium fake StatusBar inside the phone frame
const StatusBar = () => {
  const [time, setTime] = React.useState("9:41 AM");

  React.useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      let hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      setTime(`${hours}:${minutes} ${ampm}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <View className="absolute top-0 left-0 right-0 h-10 px-6 flex-row items-center justify-between z-50 bg-background/80 border-b border-border/10 backdrop-blur-md">
      <Text className="text-xs font-semibold">{time}</Text>
      <View className="flex-row items-center gap-1.5">
        <Text className="text-[10px]">📶</Text>
        <Text className="text-[10px]">🔋</Text>
      </View>
    </View>
  );
};

export const COMPONENT_PREVIEW_NAMES = Object.freeze(
  Object.keys(COMPONENT_RENDERERS),
);

export function hasComponentPreview(component: string): boolean {
  return component in COMPONENT_RENDERERS;
}

type PreviewRendererProps = {
  component: string;
  chrome?: string;
  contained?: boolean;
  onNavigate?: (component: string) => void;
};

/** Renders the canonical React Native demo in either the Expo presenter or an inline RN Web host. */
export function PreviewRenderer({
  component,
  chrome = "web",
  contained = false,
  onNavigate,
}: PreviewRendererProps) {
  const Renderer = COMPONENT_RENDERERS[component];
  if (!Renderer) return null;

  const content = (() => {
    if (
      component === "showcase" ||
      component === "dashboard" ||
      component === "dashboard-01" ||
      component === "dashboard-02" ||
      component === "sidebar"
    ) {
      const isWeb = chrome === "web";
      const topPad = isWeb ? 24 : component === "showcase" ? 60 : 64;

      return (
        <View
          className="relative w-full flex-1 bg-background"
          style={
            Platform.OS === "web"
              ? ({
                  height: contained ? "100%" : "100vh",
                  minHeight: contained ? "100%" : "100vh",
                } as any)
              : undefined
          }
        >
          {!isWeb && <StatusBar />}
          {component === "showcase" ? (
            <ShowcaseComponent topPad={topPad} />
          ) : component === "dashboard" ? (
            <DashboardComponent topPad={topPad} />
          ) : component === "dashboard-01" ? (
            <Dashboard01 topPad={topPad} />
          ) : (
            <Dashboard02 topPad={topPad} />
          )}
        </View>
      );
    }

    const previewMaxWidth =
      component === "login-04" || component === "signup-02" ? 1024 : 420;

    return (
      <ToastProvider portal={false}>
        <CenteredStage
          component={component}
          maxWidth={previewMaxWidth}
          contained={contained}
        >
          <Renderer />
        </CenteredStage>
      </ToastProvider>
    );
  })();

  return (
    <PreviewNavigationProvider onNavigate={onNavigate}>
      {content}
    </PreviewNavigationProvider>
  );
}

function CenteredStage({
  component,
  maxWidth,
  children,
  contained = false,
}: {
  component: string;
  maxWidth: number;
  children: React.ReactNode;
  contained?: boolean;
}) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <View
      className="flex-1 items-center justify-center bg-background w-full"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      style={
        Platform.OS === "web"
          ? ({
              minHeight: contained ? "100%" : "100vh",
              height: contained ? "100%" : undefined,
              padding: 40,
              // Subtle dotted grid backdrop (shadcn block-preview vibe).
              backgroundImage:
                "radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0)",
              backgroundSize: "24px 24px",
            } as any)
          : { flex: 1, padding: 24 }
      }
    >
      <View className="w-full items-center justify-center" style={{ maxWidth }}>
        {children}
      </View>

      {hovered && Platform.OS === "web" ? (
        <View
          style={{ pointerEvents: "none" }}
          className="border-border bg-popover/95 absolute bottom-3 left-3 flex-row items-center gap-2 rounded-full border px-3 py-1.5 shadow-sm shadow-black/10"
        >
          <Text className="text-popover-foreground text-xs font-semibold">
            {component}
          </Text>
          <View className="bg-border h-3 w-px" />
          <Text className="text-muted-foreground font-mono text-[11px]">
            npx lovdacn add {component}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
