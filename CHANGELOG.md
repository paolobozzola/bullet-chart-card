# Changelog

All notable changes to this project will be documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] — 2026-05-18

Initial release.

### Added
- Stephen Few-style horizontal bullet card with multi-entity support.
- Vertical orientation (`orientation: vertical`) — small-multiples layout.
- Target indicator with three styles (`line`, `arrow`, `dot`), positionable `inline` or `outside` (`above` / `below` / `left` / `right` shorthand).
- 12 named color palettes (`traffic`, `traffic-reverse`, `heat`, `cool`, `gray`, `blues`, `greens`, `reds`, `oranges`, `purples`, `teals`, `pinks`) with linear interpolation for any band count.
- Phase 1 visual tweaks: `bar_height_ratio`, `band_opacity`, `transition_ms`, `title_size`, `subtitle_size`, `title_weight`.
- Phase 2 visual tweaks: `label_align`, `label_width`, `column_width`, `column_gap`, `card_padding`, `tick_count`, `tick_color`, `axis_size`, `font_family`, `show_value`, `band_style` (solid / striped).
- HACS-compatible layout (`hacs.json`, `info.md`).
- Visual config editor (`ha-form`-based) with entity list management.
- Local preview page (`npm run dev`) with live YAML editing and rendered README.
- Generator script (`npm run gen-examples`) that renders documentation SVGs using the real card code (jsdom-based).
