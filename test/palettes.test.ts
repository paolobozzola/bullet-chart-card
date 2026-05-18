import { describe, expect, it } from 'vitest';
import { generatePalette, isPaletteName, PALETTE_NAMES } from '../src/config/palettes';

describe('palettes', () => {
  it('exposes the canonical set of palette names', () => {
    expect(PALETTE_NAMES).toContain('traffic');
    expect(PALETTE_NAMES).toContain('traffic-reverse');
    expect(PALETTE_NAMES).toContain('heat');
    expect(PALETTE_NAMES).toContain('blues');
    expect(PALETTE_NAMES).toContain('gray');
  });

  it('isPaletteName matches all listed names', () => {
    for (const n of PALETTE_NAMES) {
      expect(isPaletteName(n)).toBe(true);
    }
    expect(isPaletteName('not-a-real-palette')).toBe(false);
  });

  it('generatePalette returns N hex colors', () => {
    for (const n of [1, 2, 3, 4, 5, 7]) {
      const cols = generatePalette('blues', n);
      expect(cols).toHaveLength(n);
      for (const c of cols) {
        expect(c).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });

  it('sequential palettes go from light to dark', () => {
    const [light, , dark] = generatePalette('blues', 3) as [string, string, string];
    expect(luminance(light)).toBeGreaterThan(luminance(dark));
  });

  it('diverging traffic palette spans red → green over 3 stops', () => {
    const [a, b, c] = generatePalette('traffic', 3) as [string, string, string];
    // 'red' channel should be highest at the start, lowest at the end
    expect(hexChannel(a, 0)).toBeGreaterThan(hexChannel(c, 0));
    // 'green' channel should be highest at the end
    expect(hexChannel(c, 1)).toBeGreaterThan(hexChannel(a, 1));
    expect(b).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('traffic-reverse is the inverse of traffic', () => {
    const fwd = generatePalette('traffic', 3) as [string, string, string];
    const rev = generatePalette('traffic-reverse', 3) as [string, string, string];
    expect(rev[0]).toBe(fwd[2]);
    expect(rev[2]).toBe(fwd[0]);
  });
});

function hexChannel(hex: string, idx: 0 | 1 | 2): number {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)!;
  return parseInt(m[idx + 1]!, 16);
}

function luminance(hex: string): number {
  const r = hexChannel(hex, 0);
  const g = hexChannel(hex, 1);
  const b = hexChannel(hex, 2);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}
