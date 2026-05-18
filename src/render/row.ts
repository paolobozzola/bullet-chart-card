/**
 * Compact "entity row" renderer.
 *
 * Layout (left → right):
 *   [icon 24] · [name + subtitle, max 40%] · [bands + bar + target] · [value]
 *
 * No axis, no `<ha-card>` chrome — the wrapping `entities:` card provides
 * those. Bands fill the full row height; the bar is centered vertically.
 */
import { select, type Selection } from 'd3-selection';
import { scaleLinear } from 'd3-scale';
import 'd3-transition';

import { DEFAULTS } from '../config/defaults';
import { escapeAttr, formatValue, rowTooltipText } from './format';
import { renderTargetHorizontal } from './target';
import { bandFill, type RenderInput, type RowDatum } from './types';

type Root = Selection<SVGSVGElement, unknown, null, undefined>;

const ROW_HEIGHT = 42;
const ICON_SIZE = 22;
const ICON_PAD = 6;
const NAME_MAX_FRAC = 0.4; // name column may use up to 40 % of total width
const VALUE_WIDTH = 64;
const VALUE_PAD = 8;

export function renderRow(svg: Root, input: RenderInput): void {
  const {
    rows,
    width,
    transitionMs,
    bandOpacity,
    barHeightRatio,
    titleSize,
    subtitleSize,
    titleWeight,
    showValue,
  } = input;

  const d = rows[0];
  if (!d) {
    svg.selectAll('*').remove();
    return;
  }

  const hasIcon = !!d.icon;
  const hasSubtitle = !!d.subtitle;
  const iconLeft = 0;
  const iconRight = hasIcon ? ICON_SIZE + ICON_PAD : 0;

  const nameLeft = iconRight;
  // Name area: at least 60 px, at most NAME_MAX_FRAC of width.
  const nameMax = Math.min(160, Math.max(60, width * NAME_MAX_FRAC));
  const nameRight = nameLeft + nameMax;

  const valueRight = width;
  const valueLeft = showValue ? valueRight - VALUE_WIDTH : valueRight;

  const chartLeft = nameRight + 8;
  const chartRight = showValue ? valueLeft - VALUE_PAD : valueRight;

  // Root <g class="row"> — single one. We always recreate, simpler than diffing.
  svg.selectAll('g.row').remove();
  const g = svg
    .append('g')
    .attr('class', 'row')
    .attr('data-row-index', 0)
    .attr('data-clickable', d.clickable ? 'true' : null);

  // Native tooltip
  g.append('title').text(rowTooltipText(d));

  // Icon
  if (hasIcon) {
    const iconY = Math.round((ROW_HEIGHT - ICON_SIZE) / 2);
    g.append('foreignObject')
      .attr('class', 'row-icon')
      .attr('x', iconLeft)
      .attr('y', iconY)
      .attr('width', ICON_SIZE)
      .attr('height', ICON_SIZE)
      .html(
        `<ha-icon icon="${escapeAttr(d.icon!)}" style="--mdc-icon-size: ${ICON_SIZE}px; color: var(--primary-text-color, #212121);"></ha-icon>`,
      );
  }

  // Name + subtitle (stacked, left-aligned)
  const nameCenterY = hasSubtitle ? ROW_HEIGHT / 2 - 2 : ROW_HEIGHT / 2 + 1;
  g.append('text')
    .attr('class', 'row-title')
    .attr('x', nameLeft)
    .attr('y', nameCenterY)
    .attr('dy', '0em')
    .attr('text-anchor', 'start')
    .attr('fill', 'var(--primary-text-color, #212121)')
    .style('font-size', `${titleSize}px`)
    .style('font-weight', titleWeight)
    .text(truncateForWidth(d.name, nameMax, titleSize));

  if (hasSubtitle) {
    g.append('text')
      .attr('class', 'row-subtitle')
      .attr('x', nameLeft)
      .attr('y', ROW_HEIGHT / 2 + subtitleSize)
      .attr('dy', '0em')
      .attr('text-anchor', 'start')
      .attr('fill', 'var(--secondary-text-color, #5f6368)')
      .style('font-size', `${subtitleSize}px`)
      .text(truncateForWidth(d.subtitle!, nameMax, subtitleSize));
  }

  // If chart space collapsed (very narrow card), skip the chart silently.
  const chartW = chartRight - chartLeft;
  if (chartW < 30) {
    // Still draw value if requested.
    if (showValue && d.value !== undefined && Number.isFinite(d.value)) {
      drawValue(g, valueRight, d, input);
    }
    return;
  }

  const scale = scaleLinear().domain(d.domain).range([chartLeft, chartRight]);

  // Bands
  const bandsG = g.append('g').attr('class', 'bands');
  d.bands.forEach((b, i) => {
    bandsG
      .append('rect')
      .attr('x', scale(b.from))
      .attr('y', 0)
      .attr('width', Math.max(0, scale(b.to) - scale(b.from)))
      .attr('height', ROW_HEIGHT)
      .attr('fill', bandFill(input, 0, i, b.color))
      .attr('opacity', bandOpacity);
  });

  // Bar
  const barH = Math.max(2, Math.round(ROW_HEIGHT * barHeightRatio));
  const barY = Math.round((ROW_HEIGHT - barH) / 2);
  const bar = g
    .append('rect')
    .attr('class', 'bar')
    .attr('x', chartLeft)
    .attr('y', barY)
    .attr('height', barH)
    .attr('fill', DEFAULTS.barColor);
  if (d.value !== undefined && Number.isFinite(d.value)) {
    bar
      .attr('opacity', 1)
      .transition()
      .duration(transitionMs)
      .attr('width', Math.max(0, scale(d.value) - chartLeft));
  } else {
    bar.attr('opacity', 0).attr('width', 0);
  }

  // Target
  renderTargetHorizontal(
    g.append('g').attr('class', 'target') as unknown as Selection<
      SVGGElement,
      unknown,
      null,
      undefined
    >,
    d,
    scale,
    ROW_HEIGHT,
    transitionMs,
  );

  // Value (right-aligned)
  if (showValue && d.value !== undefined && Number.isFinite(d.value)) {
    drawValue(g, valueRight, d, input);
  }
}

function drawValue(
  g: Selection<SVGGElement, unknown, null, undefined>,
  valueRight: number,
  d: RowDatum,
  input: RenderInput,
): void {
  g.append('text')
    .attr('class', 'value')
    .attr('x', valueRight)
    .attr('y', ROW_HEIGHT / 2)
    .attr('dy', '0.35em')
    .attr('text-anchor', 'end')
    .attr('fill', 'var(--primary-text-color, #212121)')
    .style('font-size', `${Math.max(11, input.axisSize)}px`)
    .style('font-weight', '600')
    .text(formatValue(d.value!, d.unit));
}

/**
 * Approximate text truncation. SVG can't ellipsize natively; we'd need
 * `getComputedTextLength` (no-op in jsdom). For now, char-clip on a rough
 * px/char ratio so the docs SVG output is sensible.
 */
function truncateForWidth(s: string, maxWidth: number, fontSize: number): string {
  const charsPerPx = fontSize * 0.55;
  const maxChars = Math.max(3, Math.floor(maxWidth / charsPerPx));
  if (s.length <= maxChars) return s;
  return s.slice(0, Math.max(1, maxChars - 1)) + '…';
}

/** Constant row height — exported so the LitElement host can size its <svg>. */
export const ROW_RENDER_HEIGHT = ROW_HEIGHT;
