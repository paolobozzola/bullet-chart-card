/**
 * Coerce an HA state string to a number. Returns undefined for non-numeric
 * states ("unavailable", "unknown", "on"/"off", etc.).
 */
export function parseStateNumber(state: unknown): number | undefined {
  if (typeof state === 'number') return Number.isFinite(state) ? state : undefined;
  if (typeof state !== 'string') return undefined;
  if (state === 'unavailable' || state === 'unknown' || state === '') return undefined;
  const n = Number(state);
  return Number.isFinite(n) ? n : undefined;
}
