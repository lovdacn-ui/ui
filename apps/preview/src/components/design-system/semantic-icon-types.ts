import type * as React from 'react';

import type { SemanticIconName } from '@preview/lib/generated/preset-catalog';

export type SemanticIconWeight =
  | 'thin'
  | 'light'
  | 'regular'
  | 'bold'
  | 'fill'
  | 'duotone';

export type SemanticIconAdapterProps = {
  name: SemanticIconName;
  size: number;
  color: string;
  className?: string;
  strokeWidth: number;
  weight: SemanticIconWeight;
  accessibilityLabel?: string;
  decorative: boolean;
};

export type IconAdapter = React.ComponentType<SemanticIconAdapterProps>;
