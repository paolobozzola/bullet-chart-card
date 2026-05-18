import { select, type Selection } from 'd3-selection';
import { scaleLinear, type ScaleLinear } from 'd3-scale';
import { axisRight } from 'd3-axis';
import 'd3-transition';

import { DEFAULTS } from '../config/defaults';
import { formatValue, rowTooltipText } from './format';
import { renderTargetVertical } from './target';
import { bandFill, type RenderInput, type RowDatum } from './types';

type Root = Selection<SVGSVGElement, unknown, null, undefined>;

export function renderVertical(svg: Root, input: RenderInput): void {
  const {
    rows,
    width,
    height,
    showTicks,
    transitionMs,
    bandOpacity,
    barHeightRatio,
    titleSize,
    subtitleSize,
    titleWeight,
    cardPadding,
    columnWidth: configuredColWidth,
    columnGap,
    tickCount,
    tickColor,
    axisSize,
    showValue,
  } = input;

  const cols = Math.max(rows.length, 1);
  const minColWidth = 40;
  const maxAutoColWidth = 72;
  const axisReserved = showTicks ? Math.max(20, axisSize + 8) : 0;
  let colWidth: number;
  if (configuredColWidth > 0) {
    colWidth = configuredColWidth;
  } else {
    const avail = width - 2 * cardPadding - (cols - 1) * columnGap;
    colWidth = Math.max(minColWidth, Math.min(maxAutoColWidth, avail / cols));
  }
  const groupWidth = cols * colWidth + (cols - 1) * columnGap;
  const groupLeft = Math.max(cardPadding, (width - groupWidth) / 2);
  const headerHeight = titleSize + subtitleSize + 8;
  const chartTop = cardPadding + headerHeight;
  const chartBottom = height - cardPadding - axisReserved;

  const cells = svg.selectAll<SVGGElement, RowDatum>('g.col').data(rows, (d) => d.name);
  cells.exit().remove();
  const cellsEnter = cells.enter().append('g').attr('class', 'col');
  cellsEnter.append('title');
  cellsEnter.append('text').attr('class', 'col-title');
  cellsEnter.append('text').attr('class', 'col-subtitle');
  cellsEnter.append('g').attr('class', 'bands');
  cellsEnter.append('rect').attr('class', 'bar');
  cellsEnter.append('g').attr('class', 'target');
  cellsEnter.append('text').attr('class', 'value');
  cellsEnter.append('g').attr('class', 'axis');

  const merged = cellsEnter.merge(cells);
  merged
    .attr(
      'transform',
      (_d, i) => `translate(${groupLeft + i * (colWidth + columnGap)}, 0)`,
    )
    .attr('data-row-index', (_d, i) => i)
    .attr('data-clickable', (d) => (d.clickable ? 'true' : null));

  merged.each(function (d, rowIdx) {
    const g = select(this);
    const scale: ScaleLinear<number, number> = scaleLinear()
      .domain(d.domain)
      .range([chartBottom, chartTop]);
    g.select<SVGTitleElement>('title').text(rowTooltipText(d));

    g.select<SVGTextElement>('text.col-title')
      .attr('x', colWidth / 2)
      .attr('y', cardPadding + titleSize)
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--primary-text-color, #212121)')
      .style('font-size', `${titleSize}px`)
      .style('font-weight', titleWeight)
      .text(d.name);
    g.select<SVGTextElement>('text.col-subtitle')
      .attr('x', colWidth / 2)
      .attr('y', cardPadding + titleSize + subtitleSize + 2)
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--secondary-text-color, #5f6368)')
      .style('font-size', `${subtitleSize}px`)
      .text(d.subtitle ?? '');

    const bands = g
      .select<SVGGElement>('g.bands')
      .selectAll<SVGRectElement, { from: number; to: number; color: string }>('rect')
      .data(d.bands);
    bands.exit().remove();
    bands
      .enter()
      .append('rect')
      .merge(bands as never)
      .attr('x', 0)
      .attr('width', colWidth)
      .attr('y', (b) => scale(b.to))
      .attr('height', (b) => Math.max(0, scale(b.from) - scale(b.to)))
      .attr('fill', (_b, i) => bandFill(input, rowIdx, i, d.bands[i]!.color))
      .attr('opacity', bandOpacity);

    const barW = Math.max(2, Math.round(colWidth * barHeightRatio));
    const barX = Math.round((colWidth - barW) / 2);
    const bar = g.select<SVGRectElement>('rect.bar');
    bar.attr('x', barX).attr('width', barW).attr('fill', DEFAULTS.barColor);
    if (d.value !== undefined && Number.isFinite(d.value)) {
      bar
        .attr('opacity', 1)
        .transition()
        .duration(transitionMs)
        .attr('y', scale(d.value))
        .attr('height', Math.max(0, chartBottom - scale(d.value)));
    } else {
      bar.attr('opacity', 0).attr('height', 0);
    }

    renderTargetVertical(
      g.select<SVGGElement>('g.target'),
      d,
      scale,
      colWidth,
      transitionMs,
    );

    const valueText = g.select<SVGTextElement>('text.value');
    if (showValue && d.value !== undefined && Number.isFinite(d.value)) {
      valueText
        .attr('opacity', 1)
        .attr('x', colWidth / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', DEFAULTS.valueColor)
        .style('font-size', `${Math.max(10, axisSize)}px`)
        .style('font-weight', '600')
        .text(formatValue(d.value, d.unit))
        .transition()
        .duration(transitionMs)
        .attr('y', Math.max(chartTop + 12, scale(d.value) - 4));
    } else {
      valueText.attr('opacity', 0).text('');
    }

    const axisG = g.select<SVGGElement>('g.axis');
    if (showTicks) {
      axisG
        .attr('transform', `translate(${colWidth + 4}, 0)`)
        .style('font-size', `${axisSize}px`)
        .call(axisRight(scale).ticks(tickCount).tickSizeOuter(0));
      if (tickColor) {
        axisG.selectAll('text').attr('fill', tickColor);
        axisG.selectAll('line, path').attr('stroke', tickColor);
      } else {
        axisG.selectAll('text').attr('fill', null);
        axisG.selectAll('line, path').attr('stroke', null);
      }
    } else {
      axisG.selectAll('*').remove();
    }
  });
}
