import * as React from 'react';

import { usePreviewDesignSystem } from './preview-design-system';
import type { SemanticIconWeight } from './semantic-icon-types';
import type { SemanticIconName } from '@preview/lib/generated/preset-catalog';

export type SemanticIconProps = {
  name: SemanticIconName;
  size?: number;
  color?: string;
  className?: string;
  strokeWidth?: number;
  weight?: SemanticIconWeight;
  accessibilityLabel?: string;
  decorative?: boolean;
};

export function SemanticIcon({
  name,
  size,
  color = 'currentColor',
  className,
  strokeWidth,
  weight,
  accessibilityLabel,
  decorative = !accessibilityLabel,
}: SemanticIconProps) {
  const { iconAdapter: IconAdapter, recipe } = usePreviewDesignSystem();
  return (
    <IconAdapter
      name={name}
      size={size ?? recipe.icon.size}
      color={color}
      className={className}
      strokeWidth={strokeWidth ?? recipe.icon.strokeWidth}
      weight={weight ?? (recipe.icon.weight as SemanticIconWeight)}
      accessibilityLabel={accessibilityLabel}
      decorative={decorative}
    />
  );
}
