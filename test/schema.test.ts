import { describe, expect, it } from 'vitest';
import { validateConfig } from '../src/config/schema';

describe('validateConfig', () => {
  it('rejects non-object input', () => {
    expect(() => validateConfig(null)).toThrow(/expected an object/);
    expect(() => validateConfig('hi')).toThrow(/expected an object/);
  });

  it('requires entities array', () => {
    expect(() => validateConfig({ type: 'custom:bullet-chart-card' })).toThrow(/entities/);
    expect(() => validateConfig({ entities: [] })).toThrow(/entities/);
  });

  it('requires each row to have an entity id', () => {
    expect(() => validateConfig({ entities: [{}] })).toThrow(/entity is required/);
    expect(() => validateConfig({ entities: [{ entity: '' }] })).toThrow(/entity is required/);
  });

  it('rejects non-numeric min/max', () => {
    expect(() =>
      validateConfig({ entities: [{ entity: 'sensor.x', min: 'oops' }] }),
    ).toThrow(/min must be a number/);
  });

  it('rejects min >= max', () => {
    expect(() =>
      validateConfig({ entities: [{ entity: 'sensor.x', min: 10, max: 5 }] }),
    ).toThrow(/min must be < max/);
  });

  it('accepts a minimal config and fills defaults', () => {
    const c = validateConfig({
      type: 'custom:bullet-chart-card',
      entities: [{ entity: 'sensor.x' }],
    });
    expect(c.orientation).toBe('horizontal');
    expect(c.showTicks).toBe(true);
    expect(c.entities[0]!.entity).toBe('sensor.x');
    expect(c.entities[0]!.bands.length).toBeGreaterThan(0);
  });

  it('normalizes the legacy numeric target', () => {
    const c = validateConfig({ entities: [{ entity: 'sensor.x', target: 42 }] });
    expect(c.entities[0]!.target?.source).toEqual({ kind: 'literal', value: 42 });
    expect(c.entities[0]!.target?.style).toBe('line');
    expect(c.entities[0]!.target?.position).toBe('inline');
  });

  it('normalizes the legacy {value} and {entity} shapes', () => {
    const b = validateConfig({ entities: [{ entity: 'sensor.x', target: { value: 99 } }] });
    expect(b.entities[0]!.target?.source).toEqual({ kind: 'literal', value: 99 });

    const c = validateConfig({
      entities: [{ entity: 'sensor.x', target: { entity: 'input_number.t' } }],
    });
    expect(c.entities[0]!.target?.source).toEqual({
      kind: 'entity',
      entity: 'input_number.t',
      attribute: undefined,
    });
  });

  it('accepts a full target object with style/position/side/size', () => {
    const c = validateConfig({
      entities: [
        {
          entity: 'sensor.x',
          target: { value: 80, style: 'arrow', position: 'outside', side: 'bottom', size: 12, offset: 4, color: '#abc' },
        },
      ],
    });
    const t = c.entities[0]!.target!;
    expect(t.style).toBe('arrow');
    expect(t.position).toBe('outside');
    expect(t.side).toBe('bottom');
    expect(t.size).toBe(12);
    expect(t.offset).toBe(4);
    expect(t.color).toBe('#abc');
  });

  it('treats target position above/below/left/right as outside + side shorthand', () => {
    const cases: Array<['above' | 'below' | 'left' | 'right', 'top' | 'bottom' | 'start' | 'end']> = [
      ['above', 'top'],
      ['below', 'bottom'],
      ['left', 'start'],
      ['right', 'end'],
    ];
    for (const [position, side] of cases) {
      const c = validateConfig({
        entities: [{ entity: 'sensor.x', target: { value: 50, position } }],
      });
      const t = c.entities[0]!.target!;
      expect(t.position).toBe('outside');
      expect(t.side).toBe(side);
    }
  });

  it('rejects malformed targets', () => {
    expect(() =>
      validateConfig({ entities: [{ entity: 'sensor.x', target: 'high' }] }),
    ).toThrow(/target/);
    expect(() =>
      validateConfig({ entities: [{ entity: 'sensor.x', target: { value: 1, style: 'nope' } }] }),
    ).toThrow(/style/);
    expect(() =>
      validateConfig({ entities: [{ entity: 'sensor.x', target: { value: 1, side: 'left' } }] }),
    ).toThrow(/side/);
  });

  it('rejects out-of-range visual tweaks', () => {
    expect(() =>
      validateConfig({ entities: [{ entity: 'sensor.x' }], bar_height_ratio: 1.5 }),
    ).toThrow(/bar_height_ratio/);
    expect(() =>
      validateConfig({ entities: [{ entity: 'sensor.x' }], band_opacity: -0.1 }),
    ).toThrow(/band_opacity/);
    expect(() =>
      validateConfig({ entities: [{ entity: 'sensor.x' }], transition_ms: -1 }),
    ).toThrow(/transition_ms/);
  });

  it('applies visual-tweak defaults when not provided', () => {
    const c = validateConfig({ entities: [{ entity: 'sensor.x' }] });
    expect(c.barHeightRatio).toBeCloseTo(0.33);
    expect(c.bandOpacity).toBeCloseTo(0.9);
    expect(c.transitionMs).toBe(350);
    expect(c.titleSize).toBe(13);
    expect(c.subtitleSize).toBe(11);
    expect(c.titleWeight).toBe('600');
  });

  it('fills missing band colors from a named card-level palette', () => {
    const c = validateConfig({
      band_palette: 'blues',
      entities: [
        {
          entity: 'sensor.x',
          bands: [{ to: 40 }, { to: 70 }, { to: 100 }],
        },
      ],
    });
    const colors = c.entities[0]!.bands.map((b) => b.color);
    expect(colors).toHaveLength(3);
    for (const col of colors) {
      expect(col).toMatch(/^#[0-9a-f]{6}$/i);
    }
    // Light → dark blue ramp: first lighter than last.
    expect(parseInt(colors[0]!.slice(1, 3), 16)).toBeGreaterThan(
      parseInt(colors[2]!.slice(1, 3), 16),
    );
  });

  it('row-level band_palette overrides card-level', () => {
    const c = validateConfig({
      band_palette: 'blues',
      entities: [
        { entity: 'sensor.x', band_palette: 'reds', bands: [{ to: 50 }, { to: 100 }] },
      ],
    });
    // Reds palette is heavy in the R channel
    const [c1] = c.entities[0]!.bands.map((b) => b.color);
    expect(parseInt(c1!.slice(1, 3), 16)).toBeGreaterThan(
      parseInt(c1!.slice(3, 5), 16),
    );
  });

  it('throws on unknown palette name', () => {
    expect(() =>
      validateConfig({ band_palette: 'not-a-thing', entities: [{ entity: 'sensor.x' }] }),
    ).toThrow(/band_palette/);
  });

  it('throws if bands omit color without a palette', () => {
    expect(() =>
      validateConfig({
        entities: [{ entity: 'sensor.x', bands: [{ to: 50 }, { to: 100 }] }],
      }),
    ).toThrow(/color is required/);
  });

  it('explicit per-band color still wins over a palette', () => {
    const c = validateConfig({
      band_palette: 'blues',
      entities: [
        {
          entity: 'sensor.x',
          bands: [
            { to: 50, color: '#abcdef' },
            { to: 100 },
          ],
        },
      ],
    });
    expect(c.entities[0]!.bands[0]!.color).toBe('#abcdef');
    // second band is filled from palette
    expect(c.entities[0]!.bands[1]!.color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('honours overridden visual tweaks', () => {
    const c = validateConfig({
      entities: [{ entity: 'sensor.x' }],
      bar_height_ratio: 0.5,
      band_opacity: 0.6,
      transition_ms: 0,
      title_weight: 700,
    });
    expect(c.barHeightRatio).toBe(0.5);
    expect(c.bandOpacity).toBe(0.6);
    expect(c.transitionMs).toBe(0);
    expect(c.titleWeight).toBe('700');
  });

  it('applies Phase 2 defaults', () => {
    const c = validateConfig({ entities: [{ entity: 'sensor.x' }] });
    expect(c.labelAlign).toBe('right');
    expect(c.labelWidth).toBe(130);
    expect(c.columnWidth).toBe(0);
    expect(c.columnGap).toBe(24);
    expect(c.cardPadding).toBe(12);
    expect(c.tickCount).toBe(5);
    expect(c.axisSize).toBe(10);
    expect(c.showValue).toBe(false);
    expect(c.bandStyle).toBe('solid');
    expect(c.tickColor).toBeUndefined();
    expect(c.fontFamily).toBeUndefined();
  });

  it('honours Phase 2 overrides', () => {
    const c = validateConfig({
      entities: [{ entity: 'sensor.x' }],
      label_align: 'left',
      label_width: 220,
      column_width: 90,
      column_gap: 40,
      card_padding: 24,
      tick_count: 8,
      tick_color: '#abcdef',
      axis_size: 12,
      font_family: 'Helvetica Neue',
      show_value: true,
      band_style: 'striped',
    });
    expect(c.labelAlign).toBe('left');
    expect(c.labelWidth).toBe(220);
    expect(c.columnWidth).toBe(90);
    expect(c.columnGap).toBe(40);
    expect(c.cardPadding).toBe(24);
    expect(c.tickCount).toBe(8);
    expect(c.tickColor).toBe('#abcdef');
    expect(c.axisSize).toBe(12);
    expect(c.fontFamily).toBe('Helvetica Neue');
    expect(c.showValue).toBe(true);
    expect(c.bandStyle).toBe('striped');
  });

  it('rejects bad Phase 2 values', () => {
    expect(() =>
      validateConfig({ entities: [{ entity: 'sensor.x' }], label_align: 'centre' }),
    ).toThrow(/label_align/);
    expect(() =>
      validateConfig({ entities: [{ entity: 'sensor.x' }], band_style: 'spotted' }),
    ).toThrow(/band_style/);
    expect(() =>
      validateConfig({ entities: [{ entity: 'sensor.x' }], tick_count: 0 }),
    ).toThrow(/tick_count/);
    expect(() =>
      validateConfig({ entities: [{ entity: 'sensor.x' }], label_width: -5 }),
    ).toThrow(/label_width/);
  });

  it('sorts bands ascending by `to`', () => {
    const c = validateConfig({
      entities: [
        {
          entity: 'sensor.x',
          bands: [
            { to: 70, color: 'g' },
            { to: 30, color: 'r' },
            { to: 50, color: 'o' },
          ],
        },
      ],
    });
    expect(c.entities[0]!.bands.map((b) => b.to)).toEqual([30, 50, 70]);
  });

  it('applies default_bands when a row omits bands', () => {
    const c = validateConfig({
      default_bands: [
        { to: 40, color: 'r' },
        { to: 100, color: 'g' },
      ],
      entities: [{ entity: 'sensor.x' }],
    });
    expect(c.entities[0]!.bands.map((b) => b.to)).toEqual([40, 100]);
  });

  it('produces a frozen config object', () => {
    const c = validateConfig({ entities: [{ entity: 'sensor.x' }] });
    expect(Object.isFrozen(c)).toBe(true);
  });
});
