import type { Band } from '../config/schema';

/**
 * Derive [min, max] for one bullet row when the user hasn't specified them.
 * Falls back to the union of: 0, value, target, max band, with a small headroom.
 */
export function deriveDomain(
  value: number | undefined,
  target: number | undefined,
  bands: Band[],
  explicitMin?: number,
  explicitMax?: number,
): [number, number] {
  const candidates: number[] = [];
  if (explicitMin === undefined) candidates.push(0);
  if (value !== undefined && Number.isFinite(value)) candidates.push(value);
  if (target !== undefined && Number.isFinite(target)) candidates.push(target);
  for (const b of bands) candidates.push(b.to);

  let min = explicitMin ?? Math.min(...candidates);
  let max = explicitMax ?? Math.max(...candidates);

  if (!Number.isFinite(min)) min = 0;
  if (!Number.isFinite(max)) max = 1;
  if (min === max) max = min + 1;

  return [min, max];
}

// `parseStateNumber` moved to `../util/state.ts` — re-exported here for now
// so existing test imports keep working.
export { parseStateNumber } from '../util/state';

/**
 * Compute the geometry of band rects in scale units. Each band starts where
 * the previous one ended (or at the domain min). Bands outside the domain
 * are clipped.
 */
export function bandSegments(
  bands: Band[],
  domain: [number, number],
): Array<{ from: number; to: number; color: string }> {
  const [domMin, domMax] = domain;
  const segments: Array<{ from: number; to: number; color: string }> = [];
  let cursor = domMin;
  for (const b of bands) {
    const to = Math.min(Math.max(b.to, domMin), domMax);
    if (to > cursor) {
      segments.push({ from: cursor, to, color: b.color });
      cursor = to;
    }
  }
  if (cursor < domMax && segments.length > 0) {
    const last = segments[segments.length - 1]!;
    segments[segments.length - 1] = { ...last, to: domMax };
  }
  return segments;
}
