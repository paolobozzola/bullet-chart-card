/**
 * Configuration validation + normalization. Pure (no `hass`, no DOM); throws
 * on invalid input so HA's editor surfaces the error message.
 *
 * Type definitions live in `./types.ts`; this module re-exports them so
 * callers can import everything from `./schema`.
 */
import { DEFAULT_BANDS, DEFAULTS } from './defaults';
import { generatePalette, isPaletteName, PALETTE_NAMES, type PaletteName } from './palettes';
import type {
  Band,
  BulletChartCardConfig,
  EntityRowConfig,
  NormalizedConfig,
  NormalizedRow,
  NormalizedTarget,
  Orientation,
  TargetSide,
  TargetSource,
} from './types';

// Re-export the public type surface so existing imports keep working.
export type {
  Band,
  BandInput,
  BulletChartCardConfig,
  EntityRowConfig,
  NormalizedConfig,
  NormalizedRow,
  NormalizedTarget,
  Orientation,
  TargetConfig,
  TargetPosition,
  TargetSide,
  TargetSource,
  TargetStyle,
} from './types';

/**
 * Validate and normalize a raw user config. Throws on invalid input — Home
 * Assistant uses the thrown message to surface editor errors.
 */
export function validateConfig(raw: unknown): NormalizedConfig {
  if (!isObject(raw)) {
    throw new Error('Invalid configuration: expected an object');
  }
  const cfg = raw as Partial<BulletChartCardConfig>;

  if (!Array.isArray(cfg.entities) || cfg.entities.length === 0) {
    throw new Error('`entities` is required and must contain at least one entry');
  }

  const orientation: Orientation =
    cfg.orientation === 'vertical' ? 'vertical' : DEFAULTS.orientation;
  const showTicks = cfg.show_ticks ?? DEFAULTS.showTicks;

  const cardPalette = parsePaletteName(cfg.band_palette, 'band_palette');
  const defaultBands =
    normalizeBands(cfg.default_bands, cardPalette, 'default_bands') ?? [...DEFAULT_BANDS];

  const entities = cfg.entities.map((row, i) =>
    normalizeRow(row, i, defaultBands, cardPalette),
  );

  return Object.freeze({
    type: typeof cfg.type === 'string' ? cfg.type : 'custom:bullet-chart-card',
    title: typeof cfg.title === 'string' ? cfg.title : undefined,
    orientation,
    showTicks,
    entities: Object.freeze(entities) as unknown as NormalizedRow[],

    // Phase 1
    barHeightRatio: clampRatio(cfg.bar_height_ratio, DEFAULTS.barHeightRatio, 'bar_height_ratio'),
    bandOpacity: clampRatio(cfg.band_opacity, DEFAULTS.bandOpacity, 'band_opacity'),
    transitionMs: clampNonNegative(
      cfg.transition_ms,
      DEFAULTS.transitionMs,
      'transition_ms',
      2000,
    ),
    titleSize: clampPositive(cfg.title_size, DEFAULTS.titleSize, 'title_size', 48),
    subtitleSize: clampPositive(cfg.subtitle_size, DEFAULTS.subtitleSize, 'subtitle_size', 32),
    titleWeight: normalizeWeight(cfg.title_weight),

    // Phase 2
    labelAlign: parseEnum(cfg.label_align, ['left', 'right'], DEFAULTS.labelAlign, 'label_align'),
    labelWidth: clampPositive(cfg.label_width, DEFAULTS.labelWidth, 'label_width', 400),
    columnWidth: clampNonNegative(cfg.column_width, DEFAULTS.columnWidth, 'column_width', 400),
    columnGap: clampNonNegative(cfg.column_gap, DEFAULTS.columnGap, 'column_gap', 200),
    cardPadding: clampNonNegative(cfg.card_padding, DEFAULTS.cardPadding, 'card_padding', 64),
    tickCount: clampPositive(cfg.tick_count, DEFAULTS.tickCount, 'tick_count', 20),
    tickColor: typeof cfg.tick_color === 'string' ? cfg.tick_color : undefined,
    axisSize: clampPositive(cfg.axis_size, DEFAULTS.axisSize, 'axis_size', 24),
    fontFamily:
      typeof cfg.font_family === 'string' && cfg.font_family.length > 0
        ? cfg.font_family
        : undefined,
    showValue: typeof cfg.show_value === 'boolean' ? cfg.show_value : DEFAULTS.showValue,
    bandStyle: parseEnum(cfg.band_style, ['solid', 'striped'], DEFAULTS.bandStyle, 'band_style'),
  });
}

function normalizeRow(
  raw: unknown,
  index: number,
  defaultBands: Band[],
  cardPalette: PaletteName | undefined,
): NormalizedRow {
  if (!isObject(raw)) {
    throw new Error(`entities[${index}]: expected an object`);
  }
  const r = raw as Partial<EntityRowConfig>;

  if (typeof r.entity !== 'string' || r.entity.length === 0) {
    throw new Error(`entities[${index}].entity is required`);
  }
  if (r.min !== undefined && typeof r.min !== 'number') {
    throw new Error(`entities[${index}].min must be a number`);
  }
  if (r.max !== undefined && typeof r.max !== 'number') {
    throw new Error(`entities[${index}].max must be a number`);
  }
  if (r.min !== undefined && r.max !== undefined && r.min >= r.max) {
    throw new Error(`entities[${index}]: min must be < max`);
  }

  const target = normalizeTarget(r.target, index);
  const rowPalette =
    parsePaletteName(r.band_palette, `entities[${index}].band_palette`) ?? cardPalette;
  const bands =
    normalizeBands(r.bands, rowPalette, `entities[${index}].bands`) ??
    defaultBands.map((b) => ({ ...b }));

  return Object.freeze({
    entity: r.entity,
    name: typeof r.name === 'string' ? r.name : undefined,
    subtitle: typeof r.subtitle === 'string' ? r.subtitle : undefined,
    unit: typeof r.unit === 'string' ? r.unit : undefined,
    icon: typeof r.icon === 'string' ? r.icon : undefined,
    min: r.min,
    max: r.max,
    target,
    bands,
    tap_action: r.tap_action,
    hold_action: r.hold_action,
  });
}

function normalizeTarget(t: unknown, index: number): NormalizedTarget | undefined {
  if (t === undefined || t === null) return undefined;

  if (typeof t === 'number') {
    return Object.freeze(defaultTargetVisual({ kind: 'literal', value: t }));
  }

  if (isObject(t)) {
    const o = t as Record<string, unknown>;
    let source: TargetSource | undefined;
    if (typeof o.value === 'number') {
      source = { kind: 'literal', value: o.value };
    } else if (typeof o.entity === 'string') {
      source = {
        kind: 'entity',
        entity: o.entity,
        attribute: typeof o.attribute === 'string' ? o.attribute : undefined,
      };
    }
    if (!source) {
      throw new Error(
        `entities[${index}].target needs either a numeric \`value\` or an \`entity\``,
      );
    }

    const visual = defaultTargetVisual(source);
    const style = parseEnum(
      o.style,
      ['line', 'arrow', 'dot'],
      visual.style,
      `entities[${index}].target.style`,
    );
    const rawPos = parseEnum(
      o.position,
      ['inline', 'outside', 'above', 'below', 'left', 'right'],
      visual.position,
      `entities[${index}].target.position`,
    );
    const position: 'inline' | 'outside' = rawPos === 'inline' ? 'inline' : 'outside';
    let side: TargetSide = parseEnum(
      o.side,
      ['auto', 'top', 'bottom', 'start', 'end'],
      visual.side,
      `entities[${index}].target.side`,
    );
    switch (rawPos) {
      case 'above':
        side = 'top';
        break;
      case 'below':
        side = 'bottom';
        break;
      case 'left':
        side = 'start';
        break;
      case 'right':
        side = 'end';
        break;
      default:
        break;
    }
    const size = parsePositiveNumber(o.size, visual.size, `entities[${index}].target.size`, 64);
    const thickness = parsePositiveNumber(
      o.thickness,
      visual.thickness,
      `entities[${index}].target.thickness`,
      16,
    );
    const offset = parseNonNegativeNumber(
      o.offset,
      visual.offset,
      `entities[${index}].target.offset`,
      32,
    );
    const color = typeof o.color === 'string' ? o.color : undefined;

    return Object.freeze({ source, style, position, side, size, thickness, offset, color });
  }

  throw new Error(`entities[${index}].target must be a number or an object`);
}

function defaultTargetVisual(source: TargetSource): NormalizedTarget {
  return {
    source,
    style: 'line',
    position: 'inline',
    side: 'auto',
    size: DEFAULTS.targetSize,
    thickness: DEFAULTS.targetThickness,
    offset: DEFAULTS.targetOffset,
    color: undefined,
  };
}

function normalizeBands(
  raw: unknown,
  palette: PaletteName | undefined,
  fieldName: string,
): Band[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error(`\`${fieldName}\` must be a non-empty array`);
  }

  const parsed = raw.map((b, i) => {
    if (!isObject(b)) {
      throw new Error(`${fieldName}[${i}]: expected an object`);
    }
    const o = b as { to?: unknown; color?: unknown };
    if (typeof o.to !== 'number') {
      throw new Error(`${fieldName}[${i}].to must be a number`);
    }
    if (o.color !== undefined && typeof o.color !== 'string') {
      throw new Error(`${fieldName}[${i}].color must be a string`);
    }
    return { to: o.to, color: o.color as string | undefined };
  });
  parsed.sort((a, b) => a.to - b.to);

  const generated = palette ? generatePalette(palette, parsed.length) : [];
  return parsed.map((b, i) => {
    if (b.color) return { to: b.to, color: b.color };
    if (palette) return { to: b.to, color: generated[i]! };
    throw new Error(`${fieldName}[${i}].color is required (or set band_palette to fill it)`);
  });
}

function parsePaletteName(v: unknown, name: string): PaletteName | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== 'string') {
    throw new Error(`${name} must be a string`);
  }
  if (!isPaletteName(v)) {
    throw new Error(`${name} must be one of: ${PALETTE_NAMES.join(', ')}`);
  }
  return v;
}

function clampRatio(v: unknown, fallback: number, name: string): number {
  if (v === undefined || v === null) return fallback;
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new Error(`${name} must be a number between 0 and 1`);
  }
  if (v < 0 || v > 1) throw new Error(`${name} must be between 0 and 1`);
  return v;
}

function clampPositive(v: unknown, fallback: number, name: string, max: number): number {
  if (v === undefined || v === null) return fallback;
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0 || v > max) {
    throw new Error(`${name} must be a positive number ≤ ${max}`);
  }
  return v;
}

function clampNonNegative(v: unknown, fallback: number, name: string, max: number): number {
  if (v === undefined || v === null) return fallback;
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > max) {
    throw new Error(`${name} must be between 0 and ${max}`);
  }
  return v;
}

function parsePositiveNumber(v: unknown, fallback: number, name: string, max: number): number {
  if (v === undefined || v === null) return fallback;
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0 || v > max) {
    throw new Error(`${name} must be a positive number ≤ ${max}`);
  }
  return v;
}

function parseNonNegativeNumber(v: unknown, fallback: number, name: string, max: number): number {
  if (v === undefined || v === null) return fallback;
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > max) {
    throw new Error(`${name} must be between 0 and ${max}`);
  }
  return v;
}

function parseEnum<T extends string>(
  v: unknown,
  allowed: readonly T[],
  fallback: T,
  name: string,
): T {
  if (v === undefined || v === null) return fallback;
  if (typeof v === 'string' && (allowed as readonly string[]).includes(v)) return v as T;
  throw new Error(`${name} must be one of: ${allowed.join(', ')}`);
}

function normalizeWeight(v: unknown): string {
  if (v === undefined || v === null) return DEFAULTS.titleWeight;
  if (typeof v === 'number') {
    if (v < 100 || v > 900) throw new Error('title_weight must be a number between 100 and 900');
    return String(v);
  }
  if (typeof v === 'string') {
    return v;
  }
  throw new Error('title_weight must be a number or a string');
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
