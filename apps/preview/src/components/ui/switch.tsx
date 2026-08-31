import { View, type SharedAnimationProps } from '@preview/components/ui/primitives';
import { cn } from '@preview/lib/utils';
import * as SwitchPrimitives from '@rn-primitives/switch';
import { Platform } from 'react-native';

function Switch({
  className,
  animate,
  activeAnimate,
  motionActive,
  reduceMotion,
  ...props
}: React.ComponentProps<typeof SwitchPrimitives.Root> & SharedAnimationProps) {
  const rootProps = {
    className: cn(
      'flex h-[1.15rem] w-8 shrink-0 flex-row items-center rounded-full border border-transparent shadow-sm shadow-black/5',
      Platform.select({
        web: 'focus-visible:border-ring focus-visible:ring-ring/50 peer inline-flex outline-none transition-all focus-visible:ring-[3px] disabled:cursor-not-allowed',
      }),
      props.checked ? 'bg-primary' : 'bg-input dark:bg-input/80',
      props.disabled && 'opacity-50',
      className
    ),
    ...props,
  };

  // The thumb keeps its existing class-based travel (specialized motion stays specialized);
  // `animate`/`activeAnimate` apply to the switch root. Canonical active state is `checked`.
  const thumb = (
    <SwitchPrimitives.Thumb
      className={cn(
        'size-4 transition-transform bg-background dark:data-unchecked:bg-foreground dark:data-checked:bg-primary-foreground rounded-full',
        Platform.select({
          web: 'pointer-events-none block ring-0',
        }),
        props.checked
          ? 'dark:bg-primary-foreground translate-x-3.5'
          : 'dark:bg-foreground translate-x-0'
      )}
    />
  );

  const hasMotion =
    animate !== undefined || activeAnimate !== undefined || motionActive !== undefined;

  if (!hasMotion) {
    return <SwitchPrimitives.Root {...rootProps}>{thumb}</SwitchPrimitives.Root>;
  }

  return (
    <SwitchPrimitives.Root {...rootProps} asChild>
      <View
        animate={animate}
        activeAnimate={activeAnimate}
        motionActive={motionActive ?? props.checked}
        reduceMotion={reduceMotion}>
        {thumb}
      </View>
    </SwitchPrimitives.Root>
  );
}

export { Switch };
