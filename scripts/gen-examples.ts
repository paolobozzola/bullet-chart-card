/**
 * Render the README's example cards to standalone SVG files using the real
 * renderer. d3 transitions are patched to be synchronous so the output is the
 * final state (bar at value, target tip in place) — no animation in flight.
 *
 *   npm run gen-examples
 */
import { JSDOM } from 'jsdom';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ---- 1. Set up DOM globals BEFORE importing anything that uses them ------
const dom = new JSDOM(`<!DOCTYPE html><body></body>`);
const W = dom.window as unknown as typeof globalThis & {
  Element: typeof Element;
  SVGElement: typeof SVGElement;
  Node: typeof Node;
  HTMLElement: typeof HTMLElement;
  document: Document;
};

(globalThis as unknown as { window: typeof dom.window }).window = dom.window;
(globalThis as unknown as { document: Document }).document = W.document;
(globalThis as unknown as { Element: typeof Element }).Element = W.Element;
(globalThis as unknown as { SVGElement: typeof SVGElement }).SVGElement = W.SVGElement;
(globalThis as unknown as { HTMLElement: typeof HTMLElement }).HTMLElement = W.HTMLElement;
(globalThis as unknown as { Node: typeof Node }).Node = W.Node;

// ---- 2. Patch d3-selection so transitions are synchronous ----------------
// Order matters: d3-transition's import-time side-effect augments
// selection.prototype with the real (async) transition(). If our patch runs
// before that, it gets overwritten. So we import d3-transition first, then
// patch over its augmentation; later imports (e.g. from the renderer) hit the
// same module instance and don't re-run the augmentation.
import 'd3-transition';
const { selection } = await import('d3-selection');
const proto = selection.prototype as unknown as {
  transition: (...args: unknown[]) => unknown;
  duration: (...args: unknown[]) => unknown;
};
proto.transition = function (this: unknown) {
  return this;
};
proto.duration = function (this: unknown) {
  return this;
};

// ---- 3. Import the renderer ---------------------------------------------
const { validateConfig } = await import('../src/config/schema');
const { renderBullets, buildRowsForRender, computeSvgHeight } = await import(
  '../src/render/bullet'
);
const { validateRowConfig } = await import('../src/config/row');
const { renderRow, ROW_RENDER_HEIGHT } = await import('../src/render/row');
const d3sel = await import('d3-selection');

// ---- 4. Example definitions ---------------------------------------------
interface State {
  state: string;
  friendly_name?: string;
  unit?: string;
}
interface Example {
  filename: string;
  width?: number;
  config: Record<string, unknown>;
  state: Record<string, State>;
}

const examples: Example[] = [
  // 0) Hero preview — neutral grayscale, three rows. Used at the top of the README.
  {
    filename: 'preview',
    config: {
      type: 'custom:bullet-chart-card',
      title: 'Bullet Chart Card',
      band_palette: 'gray',
      default_bands: [{ to: 40 }, { to: 75 }, { to: 100 }],
      entities: [
        {
          entity: 'sensor.daily_energy_use',
          name: 'Energy',
          subtitle: 'kWh, today',
          target: { value: 80, position: 'below', style: 'arrow' },
        },
        {
          entity: 'sensor.daily_water_use',
          name: 'Water',
          subtitle: 'litres, today',
          min: 0,
          max: 200,
          bands: [{ to: 80 }, { to: 150 }, { to: 200 }],
          target: { value: 150, position: 'below', style: 'arrow' },
        },
        {
          entity: 'sensor.living_room_temp',
          name: 'Temperature',
          subtitle: '°C, set-point 21',
          min: 10,
          max: 30,
          bands: [{ to: 18 }, { to: 23 }, { to: 30 }],
          target: { value: 21, position: 'below', style: 'arrow' },
        },
      ],
    },
    state: {
      'sensor.daily_energy_use': { state: '62' },
      'sensor.daily_water_use': { state: '135' },
      'sensor.living_room_temp': { state: '22.5' },
    },
  },

  // 1) Simplest possible card.
  {
    filename: 'example-simple',
    config: {
      type: 'custom:bullet-chart-card',
      entities: [{ entity: 'sensor.cpu_load', name: 'CPU load', target: 80 }],
    },
    state: {
      'sensor.cpu_load': { state: '45', unit: '%' },
    },
  },

  // 2) Multi-KPI dashboard, Few-style — three rows with outside arrows below.
  {
    filename: 'example-dashboard',
    config: {
      type: 'custom:bullet-chart-card',
      title: "Today's KPIs",
      band_palette: 'traffic',
      default_bands: [{ to: 33 }, { to: 67 }, { to: 100 }],
      entities: [
        {
          entity: 'sensor.daily_energy_use',
          name: 'Energy',
          subtitle: 'kWh, today',
          target: { value: 80, position: 'below', style: 'arrow' },
        },
        {
          entity: 'sensor.daily_water_use',
          name: 'Water',
          subtitle: 'litres, today',
          min: 0,
          max: 200,
          bands: [{ to: 60 }, { to: 130 }, { to: 200 }],
          target: { value: 150, position: 'below', style: 'arrow' },
        },
        {
          entity: 'sensor.living_room_temp',
          name: 'Temperature',
          subtitle: '°C, set-point 21',
          min: 10,
          max: 30,
          bands: [{ to: 18 }, { to: 23 }, { to: 30 }],
          target: { value: 21, position: 'below', style: 'arrow' },
        },
      ],
    },
    state: {
      'sensor.daily_energy_use': { state: '62', unit: 'kWh' },
      'sensor.daily_water_use': { state: '135', unit: 'L' },
      'sensor.living_room_temp': { state: '22.5', unit: '°C' },
    },
  },

  // 3) Lower-is-better metric with reverse traffic + arrow below.
  {
    filename: 'example-lower-is-better',
    config: {
      type: 'custom:bullet-chart-card',
      band_palette: 'traffic-reverse',
      entities: [
        {
          entity: 'sensor.error_rate',
          name: 'Error rate',
          subtitle: 'errors / hour',
          max: 50,
          bands: [{ to: 5 }, { to: 20 }, { to: 50 }],
          target: { value: 10, position: 'below', style: 'arrow' },
        },
        {
          entity: 'sensor.p95_latency',
          name: 'p95 latency',
          subtitle: 'milliseconds',
          max: 500,
          bands: [{ to: 100 }, { to: 250 }, { to: 500 }],
          target: { value: 200, position: 'below', style: 'arrow' },
        },
      ],
    },
    state: {
      'sensor.error_rate': { state: '13' },
      'sensor.p95_latency': { state: '215' },
    },
  },

  // 4) Monochrome blues with diagonal stripes and an inline value label.
  {
    filename: 'example-mono-striped',
    config: {
      type: 'custom:bullet-chart-card',
      band_palette: 'blues',
      band_style: 'striped',
      band_opacity: 0.9,
      show_value: true,
      entities: [
        {
          entity: 'sensor.humidity_living',
          name: 'Living room',
          subtitle: 'humidity, %',
          bands: [{ to: 30 }, { to: 50 }, { to: 70 }, { to: 100 }],
          target: { value: 45, position: 'below', style: 'arrow' },
        },
        {
          entity: 'sensor.humidity_bedroom',
          name: 'Bedroom',
          subtitle: 'humidity, %',
          bands: [{ to: 30 }, { to: 50 }, { to: 70 }, { to: 100 }],
          target: { value: 45, position: 'below', style: 'arrow' },
        },
      ],
    },
    state: {
      'sensor.humidity_living': { state: '54', unit: '%' },
      'sensor.humidity_bedroom': { state: '41', unit: '%' },
    },
  },

  // 5) Vertical layout — small-multiples for system load.
  {
    filename: 'example-vertical',
    width: 380,
    config: {
      type: 'custom:bullet-chart-card',
      orientation: 'vertical',
      band_palette: 'heat',
      column_width: 44,
      entities: [
        {
          entity: 'sensor.cpu_load',
          name: 'CPU',
          subtitle: '%',
          bands: [{ to: 30 }, { to: 60 }, { to: 80 }, { to: 100 }],
          target: { value: 80, style: 'arrow', position: 'right' },
        },
        {
          entity: 'sensor.mem_use',
          name: 'Memory',
          subtitle: '%',
          bands: [{ to: 30 }, { to: 60 }, { to: 80 }, { to: 100 }],
          target: { value: 70, style: 'arrow', position: 'right' },
        },
        {
          entity: 'sensor.disk_io',
          name: 'Disk',
          subtitle: 'MB/s',
          max: 200,
          bands: [{ to: 60 }, { to: 120 }, { to: 180 }, { to: 200 }],
          target: { value: 100, style: 'arrow', position: 'right' },
        },
      ],
    },
    state: {
      'sensor.cpu_load': { state: '45' },
      'sensor.mem_use': { state: '67' },
      'sensor.disk_io': { state: '88' },
    },
  },
];

// ---- 5. Render and write each one ---------------------------------------
const outDir = path.join('docs', 'img');
fs.mkdirSync(outDir, { recursive: true });

for (const ex of examples) {
  const cfg = validateConfig(ex.config);

  const svgEl = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'svg',
  ) as unknown as SVGSVGElement;
  document.body.appendChild(svgEl);

  const resolveNumber = (id: string): number | undefined => {
    const raw = ex.state[id]?.state;
    if (raw === undefined) return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  };
  const resolveName = (id: string): string | undefined => ex.state[id]?.friendly_name;
  const resolveUnit = (id: string): string | undefined => ex.state[id]?.unit;

  const rows = buildRowsForRender(cfg, resolveNumber, resolveName, resolveUnit);
  const width = ex.width ?? 680;
  const height = computeSvgHeight(
    rows.length,
    cfg.orientation,
    cfg.showTicks,
    cfg.cardPadding,
    cfg.axisSize,
  );

  renderBullets(svgEl, {
    rows,
    orientation: cfg.orientation,
    showTicks: cfg.showTicks,
    width,
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

  // Add an xmlns so the SVG renders standalone (outside an HTML context).
  svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svgEl.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svgEl.setAttribute('width', String(width));
  svgEl.setAttribute('height', String(height));
  // Bake a system font stack so the SVG matches the README/preview body type
  // when embedded as a standalone image (where CSS inheritance doesn't apply).
  svgEl.setAttribute(
    'style',
    'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;',
  );

  // A neutral light background so the SVG is readable against any page color.
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('width', String(width));
  bg.setAttribute('height', String(height));
  bg.setAttribute('fill', '#ffffff');
  svgEl.insertBefore(bg, svgEl.firstChild);

  const outPath = path.join(outDir, `${ex.filename}.svg`);
  fs.writeFileSync(outPath, svgEl.outerHTML);
  console.log(`✓ ${outPath}  (${svgEl.outerHTML.length} bytes)`);

  // Emit a dark-themed variant by recoloring the background + text fills.
  bg.setAttribute('fill', '#1f1f1f');
  svgEl.querySelectorAll('text').forEach((t) => {
    const cur = t.getAttribute('fill');
    if (cur === 'var(--primary-text-color, #212121)') {
      t.setAttribute('fill', '#e8eaed');
    } else if (cur === 'var(--secondary-text-color, #5f6368)') {
      t.setAttribute('fill', '#9aa0a6');
    }
  });
  // Bar (primary-text-color) becomes light in dark mode.
  svgEl.querySelectorAll('rect.bar').forEach((r) => {
    if (r.getAttribute('fill') === 'var(--primary-text-color, #212121)') {
      r.setAttribute('fill', '#e8eaed');
    }
  });
  // Target line/arrow/dot — anything using markerColor.
  svgEl.querySelectorAll('g.target line, g.target polygon, g.target circle').forEach((el) => {
    const attr = el.tagName === 'line' ? 'stroke' : 'fill';
    if (el.getAttribute(attr) === 'var(--primary-text-color, #212121)') {
      el.setAttribute(attr, '#e8eaed');
    }
  });
  const darkPath = path.join(outDir, `${ex.filename}-dark.svg`);
  fs.writeFileSync(darkPath, svgEl.outerHTML);
  console.log(`✓ ${darkPath}  (${svgEl.outerHTML.length} bytes, dark)`);

  document.body.removeChild(svgEl);
}

// ---- 6. Render an "entity row" example mocking an HA entities card ------
//
// The entities card draws each item as a ~50 px tall row stacked vertically,
// with a 16 px card title at the top and a small horizontal divider between
// items. We reproduce that chrome here so the docs example looks real.
{
  const rowConfigs = [
    {
      entity: 'sensor.daily_energy_use',
      name: 'Energy',
      icon: 'mdi:flash',
      subtitle: 'kWh',
      max: 100,
      band_palette: 'traffic',
      bands: [{ to: 33 }, { to: 67 }, { to: 100 }],
      target: { value: 80, style: 'arrow', position: 'below' },
      show_value: true,
    },
    {
      entity: 'sensor.daily_water_use',
      name: 'Water',
      icon: 'mdi:water',
      subtitle: 'litres',
      max: 200,
      band_palette: 'traffic-reverse',
      bands: [{ to: 80 }, { to: 150 }, { to: 200 }],
      target: { value: 150, style: 'arrow', position: 'below' },
      show_value: true,
    },
    {
      entity: 'sensor.living_room_temp',
      name: 'Temperature',
      icon: 'mdi:thermometer',
      subtitle: '°C',
      min: 10,
      max: 30,
      band_palette: 'cool',
      bands: [{ to: 18 }, { to: 23 }, { to: 30 }],
      target: { value: 21, style: 'dot' },
      show_value: true,
    },
  ];
  const rowState: Record<string, State> = {
    'sensor.daily_energy_use': { state: '62' },
    'sensor.daily_water_use': { state: '135' },
    'sensor.living_room_temp': { state: '22.5' },
  };

  const cardWidth = 480;
  const cardPad = 12;
  const titleH = 28;
  const rowH = ROW_RENDER_HEIGHT;
  const rowGap = 4;
  const totalH = titleH + cardPad + rowConfigs.length * rowH + (rowConfigs.length - 1) * rowGap + cardPad;

  const svgEl = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'svg',
  ) as unknown as SVGSVGElement;
  document.body.appendChild(svgEl);
  svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svgEl.setAttribute('viewBox', `0 0 ${cardWidth} ${totalH}`);
  svgEl.setAttribute('width', String(cardWidth));
  svgEl.setAttribute('height', String(totalH));
  svgEl.setAttribute(
    'style',
    'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;',
  );

  // Background (light card)
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('width', String(cardWidth));
  bg.setAttribute('height', String(totalH));
  bg.setAttribute('fill', '#ffffff');
  bg.setAttribute('rx', '12');
  svgEl.appendChild(bg);

  // Card title — matches HA entities-card chrome
  const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  title.setAttribute('x', String(16));
  title.setAttribute('y', String(20));
  title.setAttribute('fill', '#212121');
  title.setAttribute('style', 'font-size: 14px; font-weight: 600;');
  title.textContent = "Today's KPIs";
  svgEl.appendChild(title);

  // Each row in its own translated <g>
  rowConfigs.forEach((rowCfg, i) => {
    const cfg = validateRowConfig(rowCfg);
    const resolveNumber = (id: string): number | undefined => {
      const v = rowState[id]?.state;
      const n = v !== undefined ? Number(v) : undefined;
      return n !== undefined && Number.isFinite(n) ? n : undefined;
    };
    const rows = buildRowsForRender(
      cfg,
      resolveNumber,
      () => undefined,
      () => undefined,
    );
    const wrapper = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const y = titleH + cardPad + i * (rowH + rowGap);
    wrapper.setAttribute('transform', `translate(${cardPad}, ${y})`);
    svgEl.appendChild(wrapper);

    // Inner svg for the row so it has its own coordinate system
    const innerSvg = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg',
    ) as unknown as SVGSVGElement;
    innerSvg.setAttribute('width', String(cardWidth - 2 * cardPad));
    innerSvg.setAttribute('height', String(rowH));
    wrapper.appendChild(innerSvg);

    renderRow(d3sel.select(innerSvg), {
      rows,
      orientation: 'horizontal',
      showTicks: cfg.showTicks,
      width: cardWidth - 2 * cardPad,
      height: rowH,
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
      cardPadding: 0,
      tickCount: cfg.tickCount,
      tickColor: cfg.tickColor,
      axisSize: cfg.axisSize,
      fontFamily: cfg.fontFamily,
      showValue: cfg.showValue,
      bandStyle: cfg.bandStyle,
    });
  });

  fs.writeFileSync(path.join(outDir, 'example-row.svg'), svgEl.outerHTML);
  console.log(`✓ docs/img/example-row.svg  (${svgEl.outerHTML.length} bytes)`);
}

console.log('\nDone.');
