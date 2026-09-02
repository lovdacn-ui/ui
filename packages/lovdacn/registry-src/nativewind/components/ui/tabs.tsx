import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import * as TabsPrimitive from '@rn-primitives/tabs';
import { Platform, ScrollView } from 'react-native';

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root className={cn('flex flex-col gap-2', className)} {...props} />;
}

function TabsList({
  className,
  scrollable = true,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & {
  /**
   * Scroll the row horizontally on native once the triggers are wider than the
   * available width.
   *
   * A flex row cannot overflow on native: it compresses its children instead, so
   * a row of five triggers silently truncates their labels ("Starred" renders as
   * "Starre"). Scrolling is therefore the default. When the row already fits, the
   * content container still lays out identically, so this changes nothing visible
   * until the row would otherwise have been clipped.
   *
   * Set `false` for a fixed, non-scrolling row.
   */
  scrollable?: boolean;
}) {
  const list = (
    <TabsPrimitive.List
      className={cn(
        'bg-muted flex h-9 flex-row items-center justify-center rounded-lg p-[3px]',
        Platform.select({ web: 'inline-flex w-fit', native: 'mr-auto' }),
        className
      )}
      {...props}
    />
  );

  // Web already has real overflow, and keeps its `inline-flex w-fit` sizing.
  if (!scrollable || Platform.OS === 'web') {
    return list;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      // flexGrow 0 stops the scroller expanding to fill the Tabs column;
      // flexGrow 1 on the content lets the row keep its own alignment.
      style={{ flexGrow: 0 }}
      contentContainerStyle={{ flexGrow: 1 }}>
      {list}
    </ScrollView>
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const { value } = TabsPrimitive.useRootContext();
  return (
    <TextClassContext.Provider
      value={cn(
        'text-foreground dark:text-muted-foreground text-sm font-medium leading-tight',
        value === props.value && 'text-primary-foreground dark:text-primary-foreground'
      )}>
      <TabsPrimitive.Trigger
        className={cn(
          'flex flex-row items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 shadow-none shadow-black/5',
          Platform.select({
            web: 'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring h-full inline-flex cursor-default whitespace-nowrap transition-[color,box-shadow] focus-visible:outline-1 focus-visible:ring-[3px] disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0',
            native: 'h-full py-0',
          }),
          props.disabled && 'opacity-50',
          props.value === value && 'bg-primary text-primary-foreground shadow-xs',
          className
        )}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn(Platform.select({ web: 'flex-1 outline-none' }), '', className)}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
