/**
 * Named color palettes for the bullet chart's qualitative bands.
 *
 * Each palette is a list of "anchor" colors. `generatePalette(name, n)`
 * returns `n` colors by linearly interpolating along the anchors, so a single
 * palette adapts to 2, 3, 5 or more bands without losing meaning.
 *
 * Palettes return plain RGB hex strings ("#rrggbb") — `band_opacity` is
 * applied separately at render time, so a 0.5 opacity composes naturally on
 * top of any palette colour.
 */
export type RGB = [r: number, g: number, b: number];

const PALETTES = {
  // Diverging — Stephen Few's classic. Low values are bad (red), high are good (green).
  traffic: [
    [219, 68, 55],  // red
    [244, 180, 0],  // amber
    [15, 157, 88],  // green
  ],
  // For "lower is better" metrics (energy use, error count, etc.)
  'traffic-reverse': [
    [15, 157, 88],
    [244, 180, 0],
    [219, 68, 55],
  ],
  // Smooth 4-stop heatmap, green → red.
  heat: [
    [15, 157, 88],
    [255, 213, 79],
    [255, 109, 0],
    [219, 68, 55],
  ],
  // Cool diverging — light blue → deep blue.
  cool: [
    [227, 242, 253],
    [144, 202, 249],
    [33, 150, 243],
    [13, 71, 161],
  ],

  // Monochromatic / sequential — shades of a single hue.
  gray:    [[245, 245, 245], [80, 80, 80]],
  blues:   [[227, 242, 253], [13, 71, 161]],
  greens:  [[232, 245, 233], [27, 94, 32]],
  reds:    [[255, 235, 238], [183, 28, 28]],
  oranges: [[255, 243, 224], [230, 81, 0]],
  purples: [[243, 229, 245], [74, 20, 140]],
  teals:   [[224, 242, 241], [0, 77, 64]],
  pinks:   [[252, 228, 236], [173, 20, 87]],
} satisfies Record<string, RGB[]>;

export type PaletteName = keyof typeof PALETTES;

export const PALETTE_NAMES: readonly PaletteName[] = Object.freeze(
  Object.keys(PALETTES) as PaletteName[],
);

export function isPaletteName(s: string): s is PaletteName {
  return Object.prototype.hasOwnProperty.call(PALETTES, s);
}

/**
 * Generate `count` colors from the named palette. Linearly interpolates
 * along the anchor stops, so any count ≥ 1 produces an evenly-spaced ramp.
 */
export function generatePalette(name: PaletteName, count: number): string[] {
  if (count <= 0) return [];
  const anchors = PALETTES[name];

  if (count === 1) {
    // Single band — pick the middle of the ramp.
    const mid = anchors[Math.floor((anchors.length - 1) / 2)]!;
    return [rgbToHex(mid)];
  }

  const segments = anchors.length - 1;
  return Array.from({ length: count }, (_, i) => {
    const t = (i / (count - 1)) * segments;
    const seg = Math.min(Math.floor(t), segments - 1);
    const f = t - seg;
    return rgbToHex(interp(anchors[seg]!, anchors[seg + 1]!, f));
  });
}

function interp(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function rgbToHex([r, g, b]: RGB): string {
  return `#${componentHex(r)}${componentHex(g)}${componentHex(b)}`;
}

function componentHex(c: number): string {
  return Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0');
}
