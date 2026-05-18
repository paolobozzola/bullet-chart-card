import { describe, expect, it } from 'vitest';
import { bandSegments, deriveDomain, parseStateNumber } from '../src/render/scales';

describe('parseStateNumber', () => {
  it('parses numeric strings', () => {
    expect(parseStateNumber('42')).toBe(42);
    expect(parseStateNumber('3.14')).toBeCloseTo(3.14);
    expect(parseStateNumber('-10')).toBe(-10);
  });

  it('returns undefined for non-numeric HA states', () => {
    expect(parseStateNumber('unavailable')).toBeUndefined();
    expect(parseStateNumber('unknown')).toBeUndefined();
    expect(parseStateNumber('')).toBeUndefined();
    expect(parseStateNumber('on')).toBeUndefined();
    expect(parseStateNumber(null)).toBeUndefined();
    expect(parseStateNumber(undefined)).toBeUndefined();
  });

  it('passes through finite numbers, rejects non-finite', () => {
    expect(parseStateNumber(7)).toBe(7);
    expect(parseStateNumber(Number.NaN)).toBeUndefined();
    expect(parseStateNumber(Number.POSITIVE_INFINITY)).toBeUndefined();
  });
});

describe('deriveDomain', () => {
  const bands = [
    { to: 30, color: 'red' },
    { to: 70, color: 'orange' },
    { to: 100, color: 'green' },
  ];

  it('honors explicit min/max when provided', () => {
    expect(deriveDomain(50, 80, bands, -10, 200)).toEqual([-10, 200]);
  });

  it('derives min=0 when not explicit, and max from band extents', () => {
    expect(deriveDomain(42, 80, bands)).toEqual([0, 100]);
  });

  it('expands max to cover value or target if they exceed bands', () => {
    expect(deriveDomain(150, undefined, bands)).toEqual([0, 150]);
    expect(deriveDomain(undefined, 200, bands)).toEqual([0, 200]);
  });

  it('avoids collapsed domain when min===max', () => {
    const [lo, hi] = deriveDomain(0, undefined, [{ to: 0, color: 'red' }], 0, 0);
    expect(hi).toBeGreaterThan(lo);
  });

  it('handles undefined value gracefully', () => {
    expect(deriveDomain(undefined, undefined, bands)).toEqual([0, 100]);
  });
});

describe('bandSegments', () => {
  it('produces consecutive segments inside the domain', () => {
    const segs = bandSegments(
      [
        { to: 30, color: 'red' },
        { to: 70, color: 'orange' },
        { to: 100, color: 'green' },
      ],
      [0, 100],
    );
    expect(segs).toEqual([
      { from: 0, to: 30, color: 'red' },
      { from: 30, to: 70, color: 'orange' },
      { from: 70, to: 100, color: 'green' },
    ]);
  });

  it('clips bands that exceed the domain', () => {
    const segs = bandSegments(
      [
        { to: 30, color: 'red' },
        { to: 150, color: 'orange' },
      ],
      [0, 100],
    );
    expect(segs[segs.length - 1]).toMatchObject({ to: 100 });
  });

  it('extends the last segment to fill the domain when bands fall short', () => {
    const segs = bandSegments([{ to: 50, color: 'red' }], [0, 100]);
    expect(segs[segs.length - 1]).toMatchObject({ to: 100 });
  });
});
