import type { PaletteName } from './palettes';

export type Orientation = 'horizontal' | 'vertical';

/** A band as the user writes it (color optional when a palette is in play). */
export interface BandInput {
  to: number;
  color?: string;
}

/** A band after normalization — color always resolved. */
export interface Band {
  to: number;
  color: string;
}

/** Where the target's value comes from. */
export type TargetSource =
  | { kind: 'literal'; value: number }
  | { kind: 'entity'; entity: string; attribute?: string };

export type TargetStyle = 'line' | 'arrow' | 'dot';

/** `above`, `below`, `left`, `right` are shorthand for `outside` + side. */
export type TargetPosition =
  | 'inline'
  | 'outside'
  | 'above'
  | 'below'
  | 'left'
  | 'right';

export type TargetSide = 'auto' | 'top' | 'bottom' | 'start' | 'end';

export interface NormalizedTarget {
  source: TargetSource;
  style: TargetStyle;
  /** After normalization, only `inline | outside` survive (shorthand aliases are unwound). */
  position: 'inline' | 'outside';
  side: TargetSide;
  size: number;
  thickness: number;
  offset: number;
  color?: string;
}

/**
 * `target` accepted shapes (all valid):
 *   target: 80
 *   target: { value: 80 }
 *   target: { entity: input_number.x, attribute?: ... }
 *   target: { value | entity, style?, position?, side?, size?, thickness?, color?, offset? }
 */
export type TargetConfig =
  | number
  | {
      value?: number;
      entity?: string;
      attribute?: string;
      style?: TargetStyle;
      position?: TargetPosition;
      side?: TargetSide;
      size?: number;
      thickness?: number;
      offset?: number;
      color?: string;
    };

export interface EntityRowConfig {
  entity: string;
  name?: string;
  subtitle?: string;
  unit?: string;
  icon?: string;
  min?: number;
  max?: number;
  target?: TargetConfig;
  bands?: BandInput[];
  band_palette?: PaletteName | string;
  tap_action?: unknown;
  hold_action?: unknown;
}

export interface BulletChartCardConfig {
  type: string;
  title?: string;
  orientation?: Orientation;
  show_ticks?: boolean;
  default_bands?: BandInput[];
  band_palette?: PaletteName | string;
  entities: EntityRowConfig[];

  // Visual tweaks (card-level) — Phase 1
  bar_height_ratio?: number;
  band_opacity?: number;
  transition_ms?: number;
  title_size?: number;
  subtitle_size?: number;
  title_weight?: number | string;

  // Visual tweaks (card-level) — Phase 2
  label_align?: 'left' | 'right';
  label_width?: number;
  column_width?: number;
  column_gap?: number;
  card_padding?: number;
  tick_count?: number;
  tick_color?: string;
  axis_size?: number;
  font_family?: string;
  show_value?: boolean;
  band_style?: 'solid' | 'striped';
}

export interface NormalizedRow {
  entity: string;
  name?: string;
  subtitle?: string;
  unit?: string;
  icon?: string;
  min?: number;
  max?: number;
  target?: NormalizedTarget;
  bands: Band[];
  tap_action?: unknown;
  hold_action?: unknown;
}

export interface NormalizedConfig {
  type: string;
  title?: string;
  orientation: Orientation;
  showTicks: boolean;
  entities: NormalizedRow[];

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
