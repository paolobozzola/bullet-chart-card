import type { Selection } from 'd3-selection';
import type { RenderInput, RowDatum } from './types';

/**
 * Format a numeric value for display next to the bar / inside aria-label.
 * Uses one decimal under 10, integer otherwise, plus suffixes for big numbers.
 */
export function formatValue(value: number, unit?: string): string {
  const abs = Math.abs(value);
  let formatted: string;
  if (abs >= 1_000_000) {
    formatted = trim((value / 1_000_000).toFixed(1)) + 'M';
  } else if (abs >= 10_000) {
    formatted = trim((value / 1_000).toFixed(1)) + 'k';
  } else if (abs >= 10) {
    formatted = String(Math.round(value));
  } else {
    formatted = trim((Math.round(value * 10) / 10).toFixed(1));
  }
  return unit ? `${formatted} ${unit}` : formatted;
}

function trim(s: string): string {
  return s.endsWith('.0') ? s.slice(0, -2) : s;
}

/** Screen-reader summary describing every row's current value + target. */
export function buildAriaLabel(input: RenderInput): string {
  if (input.rows.length === 0) return 'Bullet chart, no entities';
  const summaries = input.rows
    .map((r) => {
      const v =
        r.value !== undefined && Number.isFinite(r.value)
          ? formatValue(r.value, r.unit)
          : 'unknown';
      const t =
        r.target?.value !== undefined && Number.isFinite(r.target.value)
          ? `, target ${formatValue(r.target.value, r.unit)}`
          : '';
      return `${r.name} ${v}${t}`;
    })
    .join('; ');
  return `Bullet chart: ${summaries}`;
}

/** SVG `<title>` text — appears as a native browser tooltip on hover. */
export function rowTooltipText(d: RowDatum): string {
  const parts: string[] = [d.name];
  if (d.subtitle) parts.push(`(${d.subtitle})`);
  const v =
    d.value !== undefined && Number.isFinite(d.value)
      ? formatValue(d.value, d.unit)
      : 'unknown';
  parts.push(`= ${v}`);
  if (d.target?.value !== undefined && Number.isFinite(d.target.value)) {
    parts.push(`target ${formatValue(d.target.value, d.unit)}`);
  }
  if (d.bands.length > 0) {
    const ranges = d.bands.map((b) => `${trimNumber(b.from)}–${trimNumber(b.to)}`).join(' / ');
    parts.push(`bands: ${ranges}`);
  }
  return parts.join(' ');
}

function trimNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** Escape a string for use inside an HTML attribute. */
export function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Sets opacity from 0 → 1 over `ms`, returning the original selection. */
export function appendFading<E extends Element>(
  sel: Selection<E, unknown, null, undefined>,
  ms: number,
): Selection<E, unknown, null, undefined> {
  sel.attr('opacity', 0).transition().duration(ms).attr('opacity', 1);
  return sel;
}
