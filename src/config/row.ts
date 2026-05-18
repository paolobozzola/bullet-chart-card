/**
 * Schema adapter for the entity-row use case. The row exposes a single-entity
 * shape; internally we synthesize a one-entity card config and reuse the same
 * `validateConfig` pipeline — so all bands / palette / target rules are
 * inherited automatically.
 *
 * Row-specific defaults:
 *   - show_ticks defaults to `false` (axis is too cramped at row scale).
 *   - The single entity's `target.position` defaults to `inline` (the bar is
 *     so short that an outside arrow rarely makes sense), but users can still
 *     pass any value.
 */
import type { PaletteName } from './palettes';
import { validateConfig, type NormalizedConfig } from './schema';
import type { BandInput, TargetConfig } from './types';

export interface BulletChartRowConfig {
  type: string;
  entity: string;
  name?: string;
  subtitle?: string;
  icon?: string;
  unit?: string;
  min?: number;
  max?: number;
  target?: TargetConfig;
  bands?: BandInput[];
  band_palette?: PaletteName | string;
  show_value?: boolean;
  show_ticks?: boolean;
  band_style?: 'solid' | 'striped';
  band_opacity?: number;
  bar_height_ratio?: number;
  transition_ms?: number;
  title_size?: number;
  subtitle_size?: number;
  title_weight?: number | string;
  font_family?: string;
  tap_action?: unknown;
  hold_action?: unknown;
}

export function validateRowConfig(raw: unknown): NormalizedConfig {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Invalid row configuration: expected an object');
  }
  const r = raw as Partial<BulletChartRowConfig>;

  if (typeof r.entity !== 'string' || r.entity.length === 0) {
    throw new Error('`entity` is required for bullet-chart-row');
  }

  // Synthesize a single-entity card config and reuse the card's validator.
  return validateConfig({
    type: 'custom:bullet-chart-card',
    show_ticks: r.show_ticks ?? false,
    show_value: r.show_value ?? false,
    band_palette: r.band_palette,
    band_style: r.band_style,
    band_opacity: r.band_opacity,
    bar_height_ratio: r.bar_height_ratio,
    transition_ms: r.transition_ms,
    title_size: r.title_size,
    subtitle_size: r.subtitle_size,
    title_weight: r.title_weight,
    font_family: r.font_family,
    entities: [
      {
        entity: r.entity,
        name: r.name,
        subtitle: r.subtitle,
        icon: r.icon,
        unit: r.unit,
        min: r.min,
        max: r.max,
        target: r.target,
        bands: r.bands,
        band_palette: r.band_palette,
        tap_action: r.tap_action,
        hold_action: r.hold_action,
      },
    ],
  });
}
