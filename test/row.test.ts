/**
 * Schema-adapter tests for the entity-row variant. The renderer for row mode
 * is exercised structurally below.
 */
import 'd3-transition';
import { selection } from 'd3-selection';
import { beforeAll, describe, expect, it } from 'vitest';

import { validateRowConfig } from '../src/config/row';
import { renderRow, ROW_RENDER_HEIGHT } from '../src/render/row';
import { buildRowsForRender } from '../src/render/bullet';
import { select } from 'd3-selection';

beforeAll(() => {
  const proto = selection.prototype as unknown as Record<string, unknown>;
  proto.transition = function (this: unknown) {
    return this;
  };
  proto.duration = function (this: unknown) {
    return this;
  };
});

describe('validateRowConfig', () => {
  it('requires an entity', () => {
    expect(() => validateRowConfig({})).toThrow(/entity/);
    expect(() => validateRowConfig({ entity: '' })).toThrow(/entity/);
  });

  it('produces a NormalizedConfig with exactly one row', () => {
    const c = validateRowConfig({
      type: 'custom:bullet-chart-row',
      entity: 'sensor.x',
      name: 'X',
      target: 50,
    });
    expect(c.entities).toHaveLength(1);
    expect(c.entities[0]!.entity).toBe('sensor.x');
    expect(c.entities[0]!.name).toBe('X');
    expect(c.entities[0]!.target?.source).toEqual({ kind: 'literal', value: 50 });
  });

  it('defaults show_ticks to false (rows are too cramped for an axis)', () => {
    const c = validateRowConfig({ entity: 'sensor.x', target: 50 });
    expect(c.showTicks).toBe(false);
  });

  it('respects an explicit show_ticks: true', () => {
    const c = validateRowConfig({ entity: 'sensor.x', show_ticks: true, target: 50 });
    expect(c.showTicks).toBe(true);
  });

  it('threads band_palette through to the single row', () => {
    const c = validateRowConfig({
      entity: 'sensor.x',
      band_palette: 'blues',
      bands: [{ to: 33 }, { to: 67 }, { to: 100 }],
    });
    const colors = c.entities[0]!.bands.map((b) => b.color);
    expect(colors).toHaveLength(3);
    for (const col of colors) {
      expect(col).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('rejects malformed visual tweaks (delegated to validateConfig)', () => {
    expect(() =>
      validateRowConfig({ entity: 'sensor.x', band_opacity: 2 }),
    ).toThrow(/band_opacity/);
  });
});

describe('renderRow', () => {
  function render(cfg: Parameters<typeof validateRowConfig>[0], value: string): SVGSVGElement {
    const c = validateRowConfig(cfg);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement;
    document.body.appendChild(svg);
    const rows = buildRowsForRender(
      c,
      () => Number(value),
      () => undefined,
      () => undefined,
    );
    renderRow(select(svg), {
      rows,
      orientation: 'horizontal',
      showTicks: c.showTicks,
      width: 400,
      height: ROW_RENDER_HEIGHT,
      barHeightRatio: c.barHeightRatio,
      bandOpacity: c.bandOpacity,
      transitionMs: 0,
      titleSize: c.titleSize,
      subtitleSize: c.subtitleSize,
      titleWeight: c.titleWeight,
      labelAlign: c.labelAlign,
      labelWidth: c.labelWidth,
      columnWidth: c.columnWidth,
      columnGap: c.columnGap,
      cardPadding: 0,
      tickCount: c.tickCount,
      tickColor: c.tickColor,
      axisSize: c.axisSize,
      fontFamily: c.fontFamily,
      showValue: c.showValue,
      bandStyle: c.bandStyle,
    });
    return svg;
  }

  it('emits exactly one g.row with the title and a bar', () => {
    const svg = render({ entity: 'sensor.x', name: 'X', target: 50 }, '40');
    expect(svg.querySelectorAll('g.row')).toHaveLength(1);
    expect(svg.querySelector('g.row text.row-title')?.textContent).toMatch(/X/);
    expect(svg.querySelector('g.row rect.bar')).not.toBeNull();
  });

  it('renders the value text when show_value is true', () => {
    const svg = render(
      { entity: 'sensor.x', show_value: true, target: 50 },
      '42',
    );
    expect(svg.querySelector('g.row text.value')?.textContent).toMatch(/42/);
  });

  it('renders an icon foreignObject when icon is set', () => {
    const svg = render(
      { entity: 'sensor.x', icon: 'mdi:flash', target: 50 },
      '40',
    );
    const fo = svg.querySelector('g.row foreignObject.row-icon');
    expect(fo).not.toBeNull();
    expect(fo?.innerHTML).toMatch(/ha-icon/);
  });

  it('marks the row as clickable when tap_action is set', () => {
    const svg = render(
      {
        entity: 'sensor.x',
        target: 50,
        tap_action: { action: 'more-info' },
      },
      '40',
    );
    expect(svg.querySelector('g.row')?.getAttribute('data-clickable')).toBe('true');
  });

  it('keeps the row at the fixed compact height', () => {
    expect(ROW_RENDER_HEIGHT).toBe(42);
  });
});
