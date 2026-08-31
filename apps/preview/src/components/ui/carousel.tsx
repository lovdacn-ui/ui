import { Icon } from '@preview/components/ui/icon';
import { Pressable, View } from '@preview/components/ui/primitives';
import * as React from 'react';
import {
  AccessibilityInfo,
  FlatList,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { cn } from '@preview/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

type CarouselAlign = 'start' | 'center' | 'end';

type CarouselContextProps = {
  carouselRef: React.RefObject<FlatList | null>;
  index: number;
  setIndex: (index: number) => void;
  scrollNext: () => void;
  scrollPrev: () => void;
  canScrollNext: boolean;
  canScrollPrev: boolean;
  itemCount: number;
  setItemCount: (count: number) => void;
  viewportWidth: number;
  setViewportWidth: (width: number) => void;
  align: CarouselAlign;
};

const CarouselContext = React.createContext<CarouselContextProps | null>(null);

function useCarousel() {
  const context = React.useContext(CarouselContext);
  if (!context)
    throw new Error('useCarousel must be used within a <Carousel />');
  return context;
}

function useReducedMotionPreference() {
  const [reduceMotion, setReduceMotion] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion
    );
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}

interface CarouselProps extends React.ComponentPropsWithoutRef<typeof View> {
  opts?: {
    align?: CarouselAlign;
    loop?: boolean;
  };
}

function Carousel({
  className,
  children,
  opts,
  ref,
  ...props
}: CarouselProps & { ref?: React.Ref<View> }) {
  const carouselRef = React.useRef<FlatList>(null);
  const [index, setIndex] = React.useState(0);
  const [itemCount, setItemCount] = React.useState(0);
  const [viewportWidth, setViewportWidth] = React.useState(0);
  const reduceMotion = useReducedMotionPreference();
  const align = opts?.align ?? 'start';
  const canScrollPrev = Boolean(itemCount > 1 && (opts?.loop || index > 0));
  const canScrollNext = Boolean(
    itemCount > 1 && (opts?.loop || index < itemCount - 1)
  );

  const scrollTo = React.useCallback(
    (nextIndex: number) => {
      if (viewportWidth <= 0 || itemCount <= 0) return;
      carouselRef.current?.scrollToOffset({
        offset: nextIndex * viewportWidth,
        animated: !reduceMotion,
      });
      setIndex(nextIndex);
      void AccessibilityInfo.announceForAccessibility(
        `Slide ${nextIndex + 1} of ${itemCount}`
      );
    },
    [itemCount, reduceMotion, viewportWidth]
  );

  const scrollPrev = React.useCallback(() => {
    if (!canScrollPrev) return;
    scrollTo(index === 0 ? itemCount - 1 : index - 1);
  }, [canScrollPrev, index, itemCount, scrollTo]);

  const scrollNext = React.useCallback(() => {
    if (!canScrollNext) return;
    scrollTo(index === itemCount - 1 ? 0 : index + 1);
  }, [canScrollNext, index, itemCount, scrollTo]);

  const value = React.useMemo(
    () => ({
      carouselRef,
      index,
      setIndex,
      scrollNext,
      scrollPrev,
      canScrollNext,
      canScrollPrev,
      itemCount,
      setItemCount,
      viewportWidth,
      setViewportWidth,
      align,
    }),
    [
      align,
      canScrollNext,
      canScrollPrev,
      index,
      itemCount,
      scrollNext,
      scrollPrev,
      viewportWidth,
    ]
  );

  return (
    <CarouselContext.Provider value={value}>
      <View
        ref={ref}
        accessibilityLabel="Carousel"
        accessibilityValue={
          itemCount > 0
            ? {
                min: 1,
                max: itemCount,
                now: index + 1,
                text: `Slide ${index + 1} of ${itemCount}`,
              }
            : undefined
        }
        className={cn('relative', className)}
        role="region"
        aria-roledescription="carousel"
        {...props}>
        {children}
      </View>
    </CarouselContext.Provider>
  );
}

Carousel.displayName = 'Carousel';

interface CarouselContentProps<T> extends React.ComponentPropsWithoutRef<
  typeof View
> {
  data: T[];
  renderItem: ({
    item,
    index,
  }: {
    item: T;
    index: number;
  }) => React.ReactElement;
}

function CarouselContent<T>({
  className,
  data,
  renderItem,
  ref,
  onLayout,
  ...props
}: CarouselContentProps<T> & { ref?: React.Ref<View> }) {
  const {
    align,
    carouselRef,
    index,
    setIndex,
    setItemCount,
    setViewportWidth,
    viewportWidth,
  } = useCarousel();
  const previousWidthRef = React.useRef(0);

  React.useEffect(() => {
    setItemCount(data.length);
  }, [data.length, setItemCount]);

  React.useEffect(() => {
    if (data.length === 0) {
      if (index !== 0) setIndex(0);
      return;
    }
    if (index >= data.length) {
      const nextIndex = data.length - 1;
      setIndex(nextIndex);
      if (viewportWidth > 0) {
        carouselRef.current?.scrollToOffset({
          offset: nextIndex * viewportWidth,
          animated: false,
        });
      }
    }
  }, [carouselRef, data.length, index, setIndex, viewportWidth]);

  React.useEffect(() => {
    const previousWidth = previousWidthRef.current;
    if (
      previousWidth > 0 &&
      viewportWidth > 0 &&
      previousWidth !== viewportWidth
    ) {
      carouselRef.current?.scrollToOffset({
        offset: index * viewportWidth,
        animated: false,
      });
    }
    previousWidthRef.current = viewportWidth;
  }, [carouselRef, index, viewportWidth]);

  const handleLayout = React.useCallback(
    (event: LayoutChangeEvent) => {
      const width = event.nativeEvent.layout.width;
      if (width > 0) setViewportWidth(width);
      onLayout?.(event);
    },
    [onLayout, setViewportWidth]
  );

  const handleMomentumScrollEnd = React.useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const pageWidth =
        viewportWidth || event.nativeEvent.layoutMeasurement.width;
      if (pageWidth <= 0 || data.length === 0) return;
      const nextIndex = Math.max(
        0,
        Math.min(
          data.length - 1,
          Math.round(event.nativeEvent.contentOffset.x / pageWidth)
        )
      );
      if (nextIndex === index) return;
      setIndex(nextIndex);
      void AccessibilityInfo.announceForAccessibility(
        `Slide ${nextIndex + 1} of ${data.length}`
      );
    },
    [data.length, index, setIndex, viewportWidth]
  );

  return (
    <View
      ref={ref}
      onLayout={handleLayout}
      className={cn('overflow-hidden', className)}
      {...props}>
      <FlatList
        ref={carouselRef}
        data={data}
        renderItem={renderItem}
        horizontal={true}
        pagingEnabled={true}
        snapToAlignment={align}
        snapToInterval={viewportWidth > 0 ? viewportWidth : undefined}
        decelerationRate="fast"
        disableIntervalMomentum={true}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        keyExtractor={(_, itemIndex) => itemIndex.toString()}
        getItemLayout={
          viewportWidth > 0
            ? (_, itemIndex) => ({
                length: viewportWidth,
                offset: viewportWidth * itemIndex,
                index: itemIndex,
              })
            : undefined
        }
        style={{ width: '100%' }}
      />
    </View>
  );
}

CarouselContent.displayName = 'CarouselContent';

function CarouselItem({
  className,
  children,
  ref,
  style,
  ...props
}: React.ComponentPropsWithoutRef<typeof View> & { ref?: React.Ref<View> }) {
  const { viewportWidth } = useCarousel();

  return (
    <View
      ref={ref}
      role="group"
      aria-roledescription="slide"
      className={cn('items-center justify-center', className)}
      style={[
        { width: viewportWidth > 0 ? viewportWidth : undefined, flexShrink: 0 },
        style,
      ]}
      {...props}>
      {children}
    </View>
  );
}

CarouselItem.displayName = 'CarouselItem';

function CarouselPrevious({
  className,
  ref,
  onPress,
  disabled: disabledProp,
  accessibilityLabel = 'Previous slide',
  accessibilityRole = 'button',
  accessibilityState,
  ...props
}: React.ComponentPropsWithoutRef<typeof Pressable> & {
  ref?: React.Ref<View>;
}) {
  const { scrollPrev, canScrollPrev } = useCarousel();
  const disabled = !canScrollPrev || disabledProp === true;

  return (
    <Pressable
      ref={ref}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ ...accessibilityState, disabled }}
      disabled={disabled}
      onPress={(event) => {
        scrollPrev();
        onPress?.(event);
      }}
      className={cn(
        'bg-background border-border absolute left-4 top-1/2 h-11 min-h-11 w-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full border shadow-sm active:opacity-80 disabled:opacity-50',
        className
      )}
      {...props}>
      <Icon as={ChevronLeft} size={18} className="text-foreground" />
    </Pressable>
  );
}

CarouselPrevious.displayName = 'CarouselPrevious';

function CarouselNext({
  className,
  ref,
  onPress,
  disabled: disabledProp,
  accessibilityLabel = 'Next slide',
  accessibilityRole = 'button',
  accessibilityState,
  ...props
}: React.ComponentPropsWithoutRef<typeof Pressable> & {
  ref?: React.Ref<View>;
}) {
  const { scrollNext, canScrollNext } = useCarousel();
  const disabled = !canScrollNext || disabledProp === true;

  return (
    <Pressable
      ref={ref}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ ...accessibilityState, disabled }}
      disabled={disabled}
      onPress={(event) => {
        scrollNext();
        onPress?.(event);
      }}
      className={cn(
        'bg-background border-border absolute right-4 top-1/2 h-11 min-h-11 w-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full border shadow-sm active:opacity-80 disabled:opacity-50',
        className
      )}
      {...props}>
      <Icon as={ChevronRight} size={18} className="text-foreground" />
    </Pressable>
  );
}

CarouselNext.displayName = 'CarouselNext';

export {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  useCarousel,
};
