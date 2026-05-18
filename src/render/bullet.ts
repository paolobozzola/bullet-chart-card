/**
 * Top-level renderer dispatch + per-row data builder. The actual SVG drawing
 * lives in `horizontal.ts`, `vertical.ts`, and `target.ts`.
 */
import { select } from 'd3-selection';
import 'd3-transition';

import { DEFAULTS } from '../config/defaults';
import type { NormalizedConfig, Orientation } from '../config/schema';
import { buildAriaLabel } from './format';
import { renderHorizontal } from './horizontal';
import { renderVertical } from './vertical';
import { bandSegments, deriveDomain } from './scales';
import { patternId, type RenderInput, type ResolvedTarget, type RowDatum } from './types';

export type { RenderInput, ResolvedTarget, RowDatum };

/**
 * Build the per-row data the renderer needs from the validated config plus the
 * current HA state snapshot. Kept separate so the renderer stays pure.
 */
export function buildRowsForRender(
  config: NormalizedConfig,
  resolveNumber: (entityId: string, attribute?: string) => number | undefined,
  resolveName: (entityId: string) => string | undefined,
  resolveUnit: (entityId: string) => string | undefined,
): RowDatum[] {
  return config.entities.map((row) => {
    const value = resolveNumber(row.entity);

    let resolvedTarget: ResolvedTarget | undefined;
    if (row.target) {
      const src = row.target.source;
      const tv =
        src.kind === 'literal' ? src.value : resolveNumber(src.entity, src.attribute);
      if (tv !== undefined && Number.isFinite(tv)) {
        resolvedTarget = {
          value: tv,
          style: row.target.style,
          position: row.target.position,
          side: row.target.side,
          size: row.target.size,
          thickness: row.target.thickness,
          offset: row.target.offset,
          color: row.target.color,
        };
      }
    }

    const domain = deriveDomain(value, resolvedTarget?.value, row.bands, row.min, row.max);
    return {
      name: row.name ?? resolveName(row.entity) ?? row.entity,
      subtitle: row.subtitle,
      unit: row.unit ?? resolveUnit(row.entity),
      icon: row.icon,
      value,
      target: resolvedTarget,
      domain,
      bands: bandSegments(row.bands, domain),
      clickable: Boolean(row.tap_action || row.hold_action),
    };
  });
}

/** Render bullets into an SVG root. Idempotent. Owns *all* children of the svg. */
export function renderBullets(svgEl: SVGSVGElement, input: RenderInput): void {
  const svg = select(svgEl);
  svg
    .attr('width', input.width)
    .attr('height', input.height)
    .attr('role', 'img')
    .attr('aria-label', buildAriaLabel(input));
  if (input.fontFamily) {
    svg.style('font-family', input.fontFamily);
  } else {
    (svg.node() as SVGSVGElement | null)?.style.removeProperty('font-family');
  }

  // Wipe stale orientation groups + defs (defs are recreated below for striped bands).
  if (input.orientation === 'vertical') {
    svg.selectAll('g.row').remove();
  } else {
    svg.selectAll('g.col').remove();
  }
  svg.select('defs').remove();

  if (input.bandStyle === 'striped') {
    const defs = svg.append('defs');
    input.rows.forEach((row, rowIdx) => {
      row.bands.forEach((band, bandIdx) => {
        const id = patternId(rowIdx, bandIdx);
        const p = defs
          .append('pattern')
          .attr('id', id)
          .attr('width', 6)
          .attr('height', 6)
          .attr('patternUnits', 'userSpaceOnUse')
          .attr('patternTransform', 'rotate(45)');
        p.append('rect').attr('width', 6).attr('height', 6).attr('fill', band.color);
        p.append('rect')
          .attr('width', 2)
          .attr('height', 6)
          .attr('fill', 'rgba(255, 255, 255, 0.55)');
      });
    });
  }

  if (input.orientation === 'vertical') {
    renderVertical(svg, input);
  } else {
    renderHorizontal(svg, input);
  }
}

/** Compute the SVG height needed for the given row count and orientation. */
export function computeSvgHeight(
  rowCount: number,
  orientation: Orientation,
  showTicks: boolean,
  cardPadding = DEFAULTS.cardPadding,
  axisSize = DEFAULTS.axisSize,
): number {
  const { rowHeight, rowGap, axisHeight: defaultAxisHeight } = DEFAULTS;
  if (orientation === 'vertical') return 240;
  const axisHeight = Math.max(defaultAxisHeight, axisSize + 8);
  const perRow = rowHeight + rowGap + (showTicks ? axisHeight : 0);
  return cardPadding * 2 + Math.max(1, rowCount) * perRow - rowGap;
}
