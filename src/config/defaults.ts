import type { Band } from './types';

export const DEFAULT_BANDS: readonly Band[] = Object.freeze([
  { to: 33, color: 'var(--error-color, #db4437)' },
  { to: 67, color: 'var(--warning-color, #ffa600)' },
  { to: 100, color: 'var(--success-color, #43a047)' },
]);

export const DEFAULTS = {
  orientation: 'horizontal' as const,
  showTicks: true,

  // Layout
  rowHeight: 34,
  rowGap: 12,
  cardPadding: 12,
  axisHeight: 18,
  labelWidth: 130,
  labelGap: 12,
  labelAlign: 'right' as 'left' | 'right',
  columnWidth: 0, // 0 means auto
  columnGap: 24,

  // Typography
  titleSize: 13,
  subtitleSize: 11,
  titleWeight: '600',
  axisSize: 10,
  fontFamily: '',

  // Bar / bands
  barHeightRatio: 0.33,
  bandOpacity: 0.9,
  bandStyle: 'solid' as 'solid' | 'striped',
  trackColor: 'var(--divider-color, #e0e0e0)',
  barColor: 'var(--primary-text-color, #212121)',
  showValue: false,
  valueColor: 'var(--primary-text-color, #212121)',

  // Axis
  tickCount: 5,
  tickColor: '',

  // Target indicator
  markerColor: 'var(--primary-text-color, #212121)',
  targetSize: 9,
  targetThickness: 3,
  targetOffset: 2,

  // Animation
  transitionMs: 350,
};

