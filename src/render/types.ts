import type { NormalizedTarget, Orientation } from '../config/schema';

export interface ResolvedTarget extends Omit<NormalizedTarget, 'source'> {
  value: number;
}

export interface RowDatum {
  name: string;
  subtitle?: string;
  unit?: string;
  icon?: string;
  value?: number;
  target?: ResolvedTarget;
  domain: [number, number];
  bands: Array<{ from: number; to: number; color: string }>;
  /** True if this row has tap_action / hold_action — the renderer uses it for cursor styling. */
  clickable?: boolean;
}

export interface RenderInput {
  rows: RowDatum[];
  orientation: Orientation;
  showTicks: boolean;
  width: number;
  height: number;

  // Phase 1 tweaks
  barHeightRatio: number;
  bandOpacity: number;
  transitionMs: number;
  titleSize: number;
  subtitleSize: number;
  titleWeight: string;

  // Phase 2 tweaks
  labelAlign: 'left' | 'right';
  labelWidth: number;
  columnWidth: number; // 0 = auto
  columnGap: number;
  cardPadding: number;
  tickCount: number;
  tickColor?: string;
  axisSize: number;
  fontFamily?: string;
  showValue: boolean;
  bandStyle: 'solid' | 'striped';
}

/** SVG <pattern> id used by `band_style: striped`. */
export function patternId(rowIdx: number, bandIdx: number): string {
  return `bcc-stripe-${rowIdx}-${bandIdx}`;
}

/** Resolve the fill for a band — either its color or a striped pattern. */
export function bandFill(
  input: RenderInput,
  rowIdx: number,
  bandIdx: number,
  fallback: string,
): string {
  return input.bandStyle === 'striped' ? `url(#${patternId(rowIdx, bandIdx)})` : fallback;
}
