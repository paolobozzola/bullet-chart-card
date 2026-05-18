/**
 * Renderer smoke / structural tests. We don't snapshot the full SVG (too brittle
 * for layout tweaks); instead we assert the key structural invariants for a few
 * representative configs.
 *
 * The jsdom env is set up by Vitest. We monkey-patch d3-selection.prototype so
 * `.transition().duration().attr()` runs synchronously (no animation frames in
 * jsdom). Mirrors the trick in `scripts/gen-examples.ts`.
 */
import 'd3-transition';
import { selection } from 'd3-selection';
import { beforeAll, describe, expect, it } from 'vitest';

import { validateConfig } from '../src/config/schema';
import { buildRowsForRender, computeSvgHeight, renderBullets } from '../src/render/bullet';

beforeAll(() => {
  const proto = selection.prototype as unknown as Record<string, unknown>;
  proto.transition = function (this: unknown) {
    return this;
  };
  proto.duration = function (this: unknown) {
    return this;
  };
});

function renderToSvg(rawConfig: Record<string, unknown>, hassValues: Record<string, string>): SVGSVGElement {
  const cfg = validateConfig(rawConfig);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement;
  document.body.appendChild(svg);

  const rows = buildRowsForRender(
    cfg,
    (id) => {
      const v = hassValues[id];
      if (v === undefined) return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    },
    () => undefined,
    () => undefined,
  );
  const height = computeSvgHeight(rows.length, cfg.orientation, cfg.showTicks, cfg.cardPadding, cfg.axisSize);

  renderBullets(svg, {
    rows,
    orientation: cfg.orientation,
    showTicks: cfg.showTicks,
    width: 600,
    height,
    barHeightRatio: cfg.barHeightRatio,
    bandOpacity: cfg.bandOpacity,
    transitionMs: 0,
    titleSize: cfg.titleSize,
    subtitleSize: cfg.subtitleSize,
    titleWeight: cfg.titleWeight,
    labelAlign: cfg.labelAlign,
    labelWidth: cfg.labelWidth,
    columnWidth: cfg.columnWidth,
    columnGap: cfg.columnGap,
    cardPadding: cfg.cardPadding,
    tickCount: cfg.tickCount,
    tickColor: cfg.tickColor,
    axisSize: cfg.axisSize,
    fontFamily: cfg.fontFamily,
    showValue: cfg.showValue,
    bandStyle: cfg.bandStyle,
  });

  return svg;
}

describe('renderBullets — horizontal', () => {
  it('emits one g.row per entity with band rects, a bar, and the title text', () => {
    const svg = renderToSvg(
      {
        type: 'custom:bullet-chart-card',
        entities: [
          { entity: 'sensor.a', name: 'Alpha', target: 80 },
          { entity: 'sensor.b', name: 'Beta', target: 50 },
        ],
      },
      { 'sensor.a': '40', 'sensor.b': '90' },
    );
    expect(svg.querySelectorAll('g.row')).toHaveLength(2);
    expect(svg.querySelectorAll('g.row text.row-title')).toHaveLength(2);
    expect(svg.querySelectorAll('g.row rect.bar')).toHaveLength(2);
    // Bar should have a positive width since the value is mid-range.
    const bar = svg.querySelector('g.row rect.bar') as SVGRectElement;
    expect(parseFloat(bar.getAttribute('width') ?? '0')).toBeGreaterThan(0);
  });

  it('renders an outside-below arrow for `position: below`', () => {
    const svg = renderToSvg(
      {
        type: 'custom:bullet-chart-card',
        entities: [
          { entity: 'sensor.a', target: { value: 70, style: 'arrow', position: 'below' } },
        ],
      },
      { 'sensor.a': '40' },
    );
    const polygon = svg.querySelector('g.row g.target polygon');
    expect(polygon).not.toBeNull();
    // The tip y should be below the row height (≈ rowHeight + offset).
    const points = polygon!.getAttribute('points') ?? '';
    const ys = points.split(' ').map((p) => Number(p.split(',')[1]));
    const tipY = Math.min(...ys);
    expect(tipY).toBeGreaterThan(20); // below the row (rowHeight=34)
  });

  it('honors show_value by rendering a non-empty text.value', () => {
    const svg = renderToSvg(
      {
        type: 'custom:bullet-chart-card',
        show_value: true,
        entities: [{ entity: 'sensor.a', target: 80 }],
      },
      { 'sensor.a': '42' },
    );
    const v = svg.querySelector('g.row text.value');
    expect(v?.textContent).toMatch(/42/);
  });

  it('uses palette colors when band_palette is set', () => {
    const svg = renderToSvg(
      {
        type: 'custom:bullet-chart-card',
        band_palette: 'blues',
        entities: [{ entity: 'sensor.a', bands: [{ to: 33 }, { to: 67 }, { to: 100 }] }],
      },
      { 'sensor.a': '50' },
    );
    const bandRects = svg.querySelectorAll('g.row g.bands rect');
    expect(bandRects).toHaveLength(3);
    for (const r of Array.from(bandRects)) {
      expect(r.getAttribute('fill')).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('emits a <defs> with patterns when band_style is striped', () => {
    const svg = renderToSvg(
      {
        type: 'custom:bullet-chart-card',
        band_palette: 'blues',
        band_style: 'striped',
        entities: [{ entity: 'sensor.a', bands: [{ to: 50 }, { to: 100 }] }],
      },
      { 'sensor.a': '60' },
    );
    expect(svg.querySelectorAll('defs pattern').length).toBe(2);
    const fill = svg.querySelector('g.row g.bands rect')?.getAttribute('fill') ?? '';
    expect(fill).toMatch(/^url\(#/);
  });

  it('sets data-clickable on rows with tap_action', () => {
    const svg = renderToSvg(
      {
        type: 'custom:bullet-chart-card',
        entities: [
          { entity: 'sensor.a', target: 50, tap_action: { action: 'more-info' } },
          { entity: 'sensor.b', target: 50 },
        ],
      },
      { 'sensor.a': '20', 'sensor.b': '40' },
    );
    const rows = svg.querySelectorAll('g.row');
    expect(rows[0]?.getAttribute('data-clickable')).toBe('true');
    expect(rows[1]?.getAttribute('data-clickable')).toBeNull();
  });

  it('emits aria-label summarising each row', () => {
    const svg = renderToSvg(
      {
        type: 'custom:bullet-chart-card',
        entities: [
          { entity: 'sensor.energy', name: 'Energy', target: 80 },
          { entity: 'sensor.water', name: 'Water', target: 100 },
        ],
      },
      { 'sensor.energy': '62', 'sensor.water': '135' },
    );
    const label = svg.getAttribute('aria-label') ?? '';
    expect(label).toMatch(/Energy/);
    expect(label).toMatch(/Water/);
  });
});

describe('renderBullets — vertical', () => {
  it('emits g.col per entity, not g.row', () => {
    const svg = renderToSvg(
      {
        type: 'custom:bullet-chart-card',
        orientation: 'vertical',
        entities: [
          { entity: 'sensor.a', target: 70 },
          { entity: 'sensor.b', target: 60 },
        ],
      },
      { 'sensor.a': '40', 'sensor.b': '70' },
    );
    expect(svg.querySelectorAll('g.col')).toHaveLength(2);
    expect(svg.querySelectorAll('g.row')).toHaveLength(0);
  });

  it('renders an outside-end arrow for `position: right`', () => {
    const svg = renderToSvg(
      {
        type: 'custom:bullet-chart-card',
        orientation: 'vertical',
        entities: [
          { entity: 'sensor.a', target: { value: 70, style: 'arrow', position: 'right' } },
        ],
      },
      { 'sensor.a': '40' },
    );
    const polygon = svg.querySelector('g.col g.target polygon');
    expect(polygon).not.toBeNull();
  });
});

describe('renderBullets — orientation switching', () => {
  it('cleans up the previous orientation\'s groups when switching', () => {
    const config = {
      type: 'custom:bullet-chart-card',
      entities: [{ entity: 'sensor.a', target: 70 }],
    };
    const svg = renderToSvg(config, { 'sensor.a': '40' });
    expect(svg.querySelectorAll('g.row').length).toBe(1);
    expect(svg.querySelectorAll('g.col').length).toBe(0);

    // Now re-render the same svg with vertical — g.row should disappear.
    const cfg = validateConfig({ ...config, orientation: 'vertical' });
    const rows = buildRowsForRender(
      cfg,
      () => 40,
      () => undefined,
      () => undefined,
    );
    renderBullets(svg, {
      rows,
      orientation: cfg.orientation,
      showTicks: cfg.showTicks,
      width: 600,
      height: 240,
      barHeightRatio: cfg.barHeightRatio,
      bandOpacity: cfg.bandOpacity,
      transitionMs: 0,
      titleSize: cfg.titleSize,
      subtitleSize: cfg.subtitleSize,
      titleWeight: cfg.titleWeight,
      labelAlign: cfg.labelAlign,
      labelWidth: cfg.labelWidth,
      columnWidth: cfg.columnWidth,
      columnGap: cfg.columnGap,
      cardPadding: cfg.cardPadding,
      tickCount: cfg.tickCount,
      tickColor: cfg.tickColor,
      axisSize: cfg.axisSize,
      fontFamily: cfg.fontFamily,
      showValue: cfg.showValue,
      bandStyle: cfg.bandStyle,
    });

    expect(svg.querySelectorAll('g.row').length).toBe(0);
    expect(svg.querySelectorAll('g.col').length).toBe(1);
  });
});
