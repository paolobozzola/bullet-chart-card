import { select, type Selection } from 'd3-selection';
import { scaleLinear } from 'd3-scale';
import { axisBottom } from 'd3-axis';
import 'd3-transition';

import { DEFAULTS } from '../config/defaults';
import { escapeAttr, formatValue, rowTooltipText } from './format';
import { renderTargetHorizontal } from './target';
import { bandFill, type RenderInput, type RowDatum } from './types';

type Root = Selection<SVGSVGElement, unknown, null, undefined>;

export function renderHorizontal(svg: Root, input: RenderInput): void {
  const {
    rows,
    showTicks,
    width,
    transitionMs,
    bandOpacity,
    barHeightRatio,
    titleSize,
    subtitleSize,
    titleWeight,
    labelAlign,
    labelWidth,
    cardPadding,
    tickCount,
    tickColor,
    axisSize,
    showValue,
  } = input;
  const { rowHeight, rowGap, axisHeight: defaultAxisHeight, labelGap } = DEFAULTS;
  const axisHeight = Math.max(defaultAxisHeight, axisSize + 8);

  const labelLeft = cardPadding;
  const labelRight = cardPadding + labelWidth;
  const chartLeft = labelRight + labelGap;
  const chartRight = width - cardPadding;

  const rowsG = svg.selectAll<SVGGElement, RowDatum>('g.row').data(rows, (d) => d.name);
  rowsG.exit().remove();

  const rowsEnter = rowsG.enter().append('g').attr('class', 'row');
  rowsEnter.append('title');
  rowsEnter.append('foreignObject').attr('class', 'row-icon');
  rowsEnter.append('text').attr('class', 'row-title');
  rowsEnter.append('text').attr('class', 'row-subtitle');
  rowsEnter.append('g').attr('class', 'bands');
  rowsEnter.append('rect').attr('class', 'bar');
  rowsEnter.append('g').attr('class', 'target');
  rowsEnter.append('text').attr('class', 'value');
  rowsEnter.append('g').attr('class', 'axis');

  const rowsMerged = rowsEnter.merge(rowsG);
  rowsMerged
    .attr(
      'transform',
      (_d, i) =>
        `translate(0, ${cardPadding + i * (rowHeight + rowGap + (showTicks ? axisHeight : 0))})`,
    )
    .attr('data-row-index', (_d, i) => i)
    .attr('data-clickable', (d) => (d.clickable ? 'true' : null));

  rowsMerged.each(function (d, rowIdx) {
    const g = select(this);
    const scale = scaleLinear().domain(d.domain).range([chartLeft, chartRight]);
    g.select<SVGTitleElement>('title').text(rowTooltipText(d));

    const hasSubtitle = !!d.subtitle;
    const titleY = hasSubtitle ? rowHeight / 2 - 2 : rowHeight / 2 + 1;
    const labelAnchor = labelAlign === 'right' ? 'end' : 'start';
    const iconSize = d.icon ? 18 : 0;
    const iconPad = d.icon ? 4 : 0;
    // Icon sits at the *start* of the label column, text shrinks to its right.
    const labelX = labelAlign === 'right' ? labelRight : labelLeft + iconSize + iconPad;

    const iconFO = g.select<SVGForeignObjectElement>('foreignObject.row-icon');
    if (d.icon) {
      iconFO
        .attr('x', labelAlign === 'right' ? labelLeft : labelLeft)
        .attr('y', (rowHeight - iconSize) / 2)
        .attr('width', iconSize)
        .attr('height', iconSize)
        .html(
          `<ha-icon icon="${escapeAttr(d.icon)}" style="--mdc-icon-size: ${iconSize}px; color: var(--primary-text-color, #212121);"></ha-icon>`,
        );
    } else {
      iconFO.attr('width', 0).attr('height', 0).html('');
    }
    g.select<SVGTextElement>('text.row-title')
      .attr('x', labelX)
      .attr('y', titleY)
      .attr('text-anchor', labelAnchor)
      .attr('dy', '0em')
      .attr('fill', 'var(--primary-text-color, #212121)')
      .style('font-size', `${titleSize}px`)
      .style('font-weight', titleWeight)
      .text(d.name);

    g.select<SVGTextElement>('text.row-subtitle')
      .attr('x', labelX)
      .attr('y', rowHeight / 2 + subtitleSize)
      .attr('text-anchor', labelAnchor)
      .attr('dy', '0em')
      .attr('fill', 'var(--secondary-text-color, #5f6368)')
      .style('font-size', `${subtitleSize}px`)
      .text(hasSubtitle ? d.subtitle! : '');

    const bands = g
      .select<SVGGElement>('g.bands')
      .selectAll<SVGRectElement, { from: number; to: number; color: string }>('rect')
      .data(d.bands);
    bands.exit().remove();
    bands
      .enter()
      .append('rect')
      .merge(bands as never)
      .attr('x', (b) => scale(b.from))
      .attr('y', 0)
      .attr('width', (b) => Math.max(0, scale(b.to) - scale(b.from)))
      .attr('height', rowHeight)
      .attr('fill', (_b, i) => bandFill(input, rowIdx, i, d.bands[i]!.color))
      .attr('opacity', bandOpacity);

    const barH = Math.max(2, Math.round(rowHeight * barHeightRatio));
    const barY = Math.round((rowHeight - barH) / 2);
    const bar = g.select<SVGRectElement>('rect.bar');
    bar
      .attr('y', barY)
      .attr('height', barH)
      .attr('fill', DEFAULTS.barColor)
      .attr('x', chartLeft);
    if (d.value !== undefined && Number.isFinite(d.value)) {
      bar
        .attr('opacity', 1)
        .transition()
        .duration(transitionMs)
        .attr('width', Math.max(0, scale(d.value) - chartLeft));
    } else {
      bar.attr('opacity', 0).attr('width', 0);
    }

    renderTargetHorizontal(g.select<SVGGElement>('g.target'), d, scale, rowHeight, transitionMs);

    const valueText = g.select<SVGTextElement>('text.value');
    if (showValue && d.value !== undefined && Number.isFinite(d.value)) {
      valueText
        .attr('opacity', 1)
        .attr('y', rowHeight / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'start')
        .attr('fill', DEFAULTS.valueColor)
        .style('font-size', `${Math.max(10, axisSize)}px`)
        .style('font-weight', '600')
        .text(formatValue(d.value, d.unit))
        .transition()
        .duration(transitionMs)
        .attr('x', Math.min(scale(d.value) + 6, chartRight - 4));
    } else {
      valueText.attr('opacity', 0).text('');
    }

    const axisG = g.select<SVGGElement>('g.axis');
    if (showTicks) {
      axisG
        .attr('transform', `translate(0, ${rowHeight})`)
        .style('font-size', `${axisSize}px`)
        .call(axisBottom(scale).ticks(tickCount).tickSizeOuter(0));
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
