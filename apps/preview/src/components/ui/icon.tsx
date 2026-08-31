import { View, type SharedAnimationProps } from '@preview/components/ui/primitives';
import { TextClassContext } from '@preview/components/ui/text';
import { cn } from '@preview/lib/utils';
import type { LucideIcon, LucideProps } from 'lucide-react-native';
import { cssInterop } from 'nativewind';
import * as React from 'react';

type IconProps = LucideProps & {
  as: LucideIcon;
} & React.RefAttributes<LucideIcon>;

function IconImpl({ as: IconComponent, ...props }: IconProps) {
  return <IconComponent {...props} />;
}

cssInterop(IconImpl, {
  className: {
    target: 'style',
    nativeStyleToProp: {
      height: 'size',
      width: 'size',
    },
  },
});

/**
 * A wrapper component for Lucide icons with Nativewind `className` support via `cssInterop`.
 *
 * This component allows you to render any Lucide icon while applying utility classes
 * using `nativewind`. It avoids the need to wrap or configure each icon individually.
 *
 * @component
 * @example
 * ```tsx
 * import { ArrowRight } from 'lucide-react-native';
 * import { Icon } from '@preview/registry/components/ui/icon';
 *
 * <Icon as={ArrowRight} className="text-red-500" size={16} />
 * ```
 *
 * @param {LucideIcon} as - The Lucide icon component to render.
 * @param {string} className - Utility classes to style the icon using Nativewind.
 * @param {number} size - Icon size (defaults to 14).
 * @param {...LucideProps} ...props - Additional Lucide icon props passed to the "as" icon.
 */
function Icon({
  as: IconComponent,
  className,
  size = 14,
  animate,
  activeAnimate,
  motionActive,
  reduceMotion,
  ...props
}: IconProps & SharedAnimationProps) {
  const textClass = React.useContext(TextClassContext);
  const icon = (
    <IconImpl
      as={IconComponent}
      className={cn('text-foreground', textClass, className)}
      size={size}
      {...props}
    />
  );

  // A Lucide SVG is a leaf we don't own, so it can't host an animated style. When (and only
  // when) motion is requested, wrap it in an animated host — rotate/scale/opacity on the
  // wrapper is exactly what icon animation needs. No wrapper, no cost otherwise.
  const hasMotion =
    animate !== undefined || activeAnimate !== undefined || motionActive !== undefined;

  if (!hasMotion) {
    return icon;
  }

  return (
    <View
      animate={animate}
      activeAnimate={activeAnimate}
      motionActive={motionActive}
      reduceMotion={reduceMotion}>
      {icon}
    </View>
  );
}

export { Icon };
