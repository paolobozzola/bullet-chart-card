import type { Selection } from 'd3-selection';
import type { ScaleLinear } from 'd3-scale';
import 'd3-transition';

import { DEFAULTS } from '../config/defaults';
import { appendFading } from './format';
import type { RowDatum } from './types';

type Anchored = Selection<SVGGElement, unknown, null, undefined>;

/** Render the target indicator inside a horizontal row's <g class="target">. */
export function renderTargetHorizontal(
  g: Anchored,
  d: RowDatum,
  scale: ScaleLinear<number, number>,
  rowHeight: number,
  transitionMs: number,
): void {
  g.selectAll('*').remove();
  if (!d.target) return;
  const t = d.target;
  const color = t.color ?? DEFAULTS.markerColor;
  const x = scale(t.value);

  // Horizontal: valid outside sides are top/bottom. start/end fall back to bottom.
  let side: 'top' | 'bottom' = 'bottom';
  if (t.side === 'top') side = 'top';
  else if (t.side === 'bottom') side = 'bottom';

  if (t.style === 'line') {
    const y1 = t.position === 'outside' && side === 'top' ? -t.offset - t.size : rowHeight * 0.15;
    const y2 =
      t.position === 'outside' && side === 'bottom'
        ? rowHeight + t.offset + t.size
        : rowHeight * 0.85;
    appendFading(g.append('line'), transitionMs)
      .attr('stroke', color)
      .attr('stroke-width', t.thickness)
      .attr('x1', x)
      .attr('x2', x)
      .attr('y1', y1)
      .attr('y2', y2);
    return;
  }

  if (t.style === 'dot') {
    appendFading(g.append('circle'), transitionMs)
      .attr('cx', x)
      .attr('cy', rowHeight / 2)
      .attr('r', t.size / 2)
      .attr('fill', color);
    return;
  }

  // arrow
  const half = t.size / 2;
  let pts: string;
  if (t.position === 'outside' && side === 'top') {
    const tipY = -t.offset;
    pts = `${x - half},${tipY - t.size} ${x + half},${tipY - t.size} ${x},${tipY}`;
  } else if (t.position === 'outside' && side === 'bottom') {
    const tipY = rowHeight + t.offset;
    pts = `${x - half},${tipY + t.size} ${x + half},${tipY + t.size} ${x},${tipY}`;
  } else {
    // inline: simple downward triangle centered on the bar
    const cy = rowHeight / 2;
    pts = `${x - half},${cy - t.size} ${x + half},${cy - t.size} ${x},${cy}`;
  }
  appendFading(g.append('polygon'), transitionMs).attr('points', pts).attr('fill', color);
}

/** Render the target indicator inside a vertical column's <g class="target">. */
export function renderTargetVertical(
  g: Anchored,
  d: RowDatum,
  scale: ScaleLinear<number, number>,
  colWidth: number,
  transitionMs: number,
): void {
  g.selectAll('*').remove();
  if (!d.target) return;
  const t = d.target;
  const color = t.color ?? DEFAULTS.markerColor;
  const y = scale(t.value);

  // Vertical: valid outside sides are start/end. top/bottom fall back to end.
  let side: 'start' | 'end' = 'end';
  if (t.side === 'start') side = 'start';
  else if (t.side === 'end') side = 'end';

  if (t.style === 'line') {
    const x1 =
      t.position === 'outside' && side === 'start' ? -t.offset - t.size : colWidth * 0.15;
    const x2 =
      t.position === 'outside' && side === 'end' ? colWidth + t.offset + t.size : colWidth * 0.85;
    appendFading(g.append('line'), transitionMs)
      .attr('stroke', color)
      .attr('stroke-width', t.thickness)
      .attr('x1', x1)
      .attr('x2', x2)
      .attr('y1', y)
      .attr('y2', y);
    return;
  }

  if (t.style === 'dot') {
    appendFading(g.append('circle'), transitionMs)
      .attr('cx', colWidth / 2)
      .attr('cy', y)
      .attr('r', t.size / 2)
      .attr('fill', color);
    return;
  }

  // arrow
  const half = t.size / 2;
  let pts: string;
  if (t.position === 'outside' && side === 'start') {
    const tipX = -t.offset;
    pts = `${tipX - t.size},${y - half} ${tipX - t.size},${y + half} ${tipX},${y}`;
  } else if (t.position === 'outside' && side === 'end') {
    const tipX = colWidth + t.offset;
    pts = `${tipX + t.size},${y - half} ${tipX + t.size},${y + half} ${tipX},${y}`;
  } else {
    const cx = colWidth / 2;
    pts = `${cx - t.size},${y - half} ${cx - t.size},${y + half} ${cx},${y}`;
  }
  appendFading(g.append('polygon'), transitionMs).attr('points', pts).attr('fill', color);
}
