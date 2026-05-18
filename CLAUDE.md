# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A custom [Home Assistant](https://www.home-assistant.io/) Lovelace card that renders Stephen Few-style **bullet charts** using **d3.js**. Distributed via HACS; users install it as a custom Lovelace resource and configure it against entities exposing a numeric `state`.

## Tech stack

- **Language**: TypeScript (strict, `noUncheckedIndexedAccess: true`).
- **UI base**: LitElement 3 + lit-html. Matches HA's own frontend; gives reactive properties + Shadow DOM.
- **Visualization**: d3 v7, granular ES module imports (`d3-selection`, `d3-scale`, `d3-axis`, `d3-transition`).
- **Build**: Vite library mode → `dist/bullet-chart-card.js` (single ES module).
- **Types**: `custom-card-helpers` for `HomeAssistant` / `LovelaceCard` / `LovelaceCardConfig`.
- **Lint/format**: ESLint + Prettier with `eslint-plugin-lit` / `eslint-plugin-wc`.
- **Tests**: Vitest. Schema + palette + scales tested. Renderer tested via jsdom-based snapshot tests (see `test/render.test.ts`).
- **Distribution**: HACS-compatible layout (`hacs.json`, `info.md` at root, built artifact attached to GitHub Releases).

## Layout convention

Lit owns the `<svg>` container; d3 owns everything inside it. **Don't render the chart contents through lit-html** — the imperative/declarative split is intentional. d3 selections must be scoped to `this.renderRoot` (never `document`), or multiple cards collide.

## Source map

```
src/
  bullet-chart-card.ts          Main element (setConfig, hass setter, lifecycle).
  bullet-chart-card-editor.ts   ha-form-based visual editor.
  index.ts                      Side-effect registration entry.
  config/
    schema.ts                   Validates + normalizes user config.
    defaults.ts                 Default values for all knobs.
    palettes.ts                 12 named color palettes + interpolator.
  render/
    bullet.ts                   Pure d3 renderer (orientations, target, bands).
    scales.ts                   Scale math + parseStateNumber.
  ha/
    types.ts                    HA type re-exports.
    register-card.ts            window.customCards push.
test/
  schema.test.ts, palettes.test.ts, scales.test.ts, render.test.ts
scripts/
  gen-examples.ts               Renders example SVGs to docs/img/ via jsdom.
dev/
  preview.ts, dev.d.ts          Local Vite dev page (npm run dev).
docs/img/                       Auto-generated example SVGs for the README.
```

## Architecture conventions for HA custom cards

Non-obvious things easy to get wrong:

- `setConfig(config)` **throws** on invalid input — HA uses the thrown message to surface editor errors. Store a frozen copy on `_config`; do not mutate input.
- Implement the `hass` setter (not just a `@property`): HA calls it on every state tick. Diff against the prior state — naive re-renders repaint the chart on every entity change in the system. The diff lives in `_snapshotEntities` (stable fingerprint string).
- `getCardSize()` returns integer rows for masonry layout. Branch on orientation: horizontal scales with entity count, vertical is a fixed-height card.
- The card is registered via `window.customCards.push(...)` so it shows up in HA's card picker.
- The editor is **lazy-loaded** through `static async getConfigElement()` — keeps the runtime bundle small for users who only use YAML.

## Feature surface

The card supports:

- **Multiple entities per card** (`entities: []`) — one bullet row per entry.
- **Horizontal** (rows, default) and **vertical** (small-multiples) orientations.
- **Target indicator** with `style: line | arrow | dot`, `position: inline | outside | above | below | left | right`, configurable `size`, `thickness`, `color`, `offset`.
- **12 named palettes** (`band_palette`) plus per-band explicit colors. Palettes interpolate to any band count.
- **Phase 1 visual tweaks**: `bar_height_ratio`, `band_opacity`, `transition_ms`, `title_size`, `subtitle_size`, `title_weight`.
- **Phase 2 visual tweaks**: `label_align`, `label_width`, `column_width`, `column_gap`, `card_padding`, `tick_count`, `tick_color`, `axis_size`, `font_family`, `show_value`, `band_style` (solid / striped).
- **`tap_action` / `hold_action`** per row — standard HA action objects.

## Build / test / preview

- `npm install` — install deps (one-time).
- `npm test` — run Vitest.
- `npm run build` — TypeScript check + Vite library build → `dist/bullet-chart-card.js`. Target: < 50 KB gzipped (CI fails above 50 KB).
- `npm run dev` — local preview page at `http://localhost:5173/` with live YAML editor and rendered README.
- `npm run gen-examples` — regenerate `docs/img/*.svg` using the real renderer (jsdom + monkey-patched d3-transition).

## Bundle budget

Target ~30–50 KB gzipped for the final artifact. CI enforces a 50 KB ceiling. If `d3-*` submodule imports push past, audit before adding more.
