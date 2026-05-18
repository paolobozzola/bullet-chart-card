# Bullet Chart Card

A Home Assistant Lovelace card that renders Stephen Few-style **bullet charts** using d3.js. Designed for displaying numeric KPIs (energy, temperature, water use, budgets) against qualitative ranges and a comparative target.

![bullet-chart-card preview](docs/img/preview.svg)

## Why bullet charts

A bullet chart packs more information into a single horizontal row than a gauge:

- **Bands** (red/amber/green) communicate "bad / satisfactory / good" ranges.
- **A solid bar** shows the current value.
- **A vertical marker** shows the target.

Stephen Few's original [white paper](https://www.perceptualedge.com/articles/misc/Bullet_Graph_Design_Spec.pdf) makes the case better than this README can.

## Examples

All five previews below are rendered by the actual card code (via the same code path HA uses) — what you see is what you'd get in your dashboard. Regenerate them with `npm run gen-examples` if you tweak the source.

### 1. The simplest possible card

A single sensor with a target. Defaults handle everything else — Few-style traffic-light bands (red / amber / green), a thin line for the target, axis ticks below.

![Simple bullet card with one sensor](docs/img/example-simple.svg)

```yaml
type: custom:bullet-chart-card
entities:
  - entity: sensor.cpu_load
    name: CPU load
    target: 80
```

### 2. Multi-KPI dashboard (Stephen Few-style)

Three KPIs stacked, each with its own scale and threshold marker. Targets are drawn as **arrows below the bar** (`position: below, style: arrow`) so they don't compete with the bands for attention — this matches Few's original layout.

![Three-row dashboard with Few-style arrows](docs/img/example-dashboard.svg)

```yaml
type: custom:bullet-chart-card
title: Today's KPIs
band_palette: traffic
default_bands: [{ to: 33 }, { to: 67 }, { to: 100 }]
entities:
  - entity: sensor.daily_energy_use
    name: Energy
    subtitle: kWh, today
    target: { value: 80, position: below, style: arrow }
  - entity: sensor.daily_water_use
    name: Water
    subtitle: litres, today
    min: 0
    max: 200
    bands: [{ to: 60 }, { to: 130 }, { to: 200 }]
    target: { value: 150, position: below, style: arrow }
  - entity: sensor.living_room_temp
    name: Temperature
    subtitle: °C, set-point 21
    min: 10
    max: 30
    bands: [{ to: 18 }, { to: 23 }, { to: 30 }]
    target: { value: 21, position: below, style: arrow }
```

### 3. Lower-is-better metrics

For metrics where **low is good** (error rate, latency, CPU pressure), use `band_palette: traffic-reverse` so the green band sits at the start of the scale and red at the end.

![Two rows using reversed traffic palette](docs/img/example-lower-is-better.svg)

```yaml
type: custom:bullet-chart-card
band_palette: traffic-reverse
entities:
  - entity: sensor.error_rate
    name: Error rate
    subtitle: errors / hour
    max: 50
    bands: [{ to: 5 }, { to: 20 }, { to: 50 }]
    target: { value: 10, position: below, style: arrow }
  - entity: sensor.p95_latency
    name: p95 latency
    subtitle: milliseconds
    max: 500
    bands: [{ to: 100 }, { to: 250 }, { to: 500 }]
    target: { value: 200, position: below, style: arrow }
```

### 4. Monochrome dashboard with striped bands

Sometimes traffic-light colors are too loud — for a quieter dashboard, pick a **monochromatic palette** (`blues`, `greens`, `gray`, etc.) and turn on `band_style: striped` so the bands stay visually distinct even though they share a hue. `show_value: true` adds the live numeric value next to the bar.

![Monochrome blues with diagonal stripes and inline values](docs/img/example-mono-striped.svg)

```yaml
type: custom:bullet-chart-card
band_palette: blues
band_style: striped
band_opacity: 0.9
show_value: true
entities:
  - entity: sensor.humidity_living
    name: Living room
    subtitle: humidity, %
    bands: [{ to: 30 }, { to: 50 }, { to: 70 }, { to: 100 }]
    target: { value: 45, position: below, style: arrow }
  - entity: sensor.humidity_bedroom
    name: Bedroom
    subtitle: humidity, %
    bands: [{ to: 30 }, { to: 50 }, { to: 70 }, { to: 100 }]
    target: { value: 45, position: below, style: arrow }
```

### 5. Vertical layout — small multiples

For a tighter, dashboard-tile layout — system-load widgets, season snapshots, anything that benefits from side-by-side comparison — flip `orientation: vertical`. Targets get drawn to the right of each column with `position: right`.

![Three vertical bullets for CPU, Memory, Disk](docs/img/example-vertical.svg)

```yaml
type: custom:bullet-chart-card
orientation: vertical
band_palette: heat
entities:
  - entity: sensor.cpu_load
    name: CPU
    subtitle: "%"
    bands: [{ to: 30 }, { to: 60 }, { to: 80 }, { to: 100 }]
    target: { value: 80, style: arrow, position: right }
  - entity: sensor.mem_use
    name: Memory
    subtitle: "%"
    bands: [{ to: 30 }, { to: 60 }, { to: 80 }, { to: 100 }]
    target: { value: 70, style: arrow, position: right }
  - entity: sensor.disk_io
    name: Disk
    subtitle: MB/s
    max: 200
    bands: [{ to: 60 }, { to: 120 }, { to: 180 }, { to: 200 }]
    target: { value: 100, style: arrow, position: right }
```

---

## Install via HACS

1. In HACS, add this repository as a **Custom Repository** (category: Lovelace).
2. Install **Bullet Chart Card**.
3. HACS adds the resource automatically (URL: `/hacsfiles/bullet-chart-card/bullet-chart-card.js`, type `module`). If you installed manually, add the resource under **Settings → Dashboards → Resources**.
4. Add a card to your dashboard, choose **Bullet Chart** in the picker.

## Configuration

The card supports multiple bullets per instance — one row per entry in `entities`.

```yaml
type: custom:bullet-chart-card
title: "Today's KPIs"
orientation: horizontal      # or "vertical"
show_ticks: true

default_bands:               # used by any row without its own `bands`
  - { to: 33,  color: "var(--error-color)"   }
  - { to: 67,  color: "var(--warning-color)" }
  - { to: 100, color: "var(--success-color)" }

entities:
  - entity: sensor.daily_energy_use
    name: "Energy"
    subtitle: "kWh, today"        # appears under the title in lighter type
    min: 0
    max: 100
    target:
      value: 80
  - entity: sensor.daily_water_use
    name: "Water"
    subtitle: "litres, today"
    unit: "L"
    target:
      entity: input_number.water_target   # target can be dynamic
    bands:                                # row-level override
      - { to: 50,  color: "var(--success-color)" }
      - { to: 80,  color: "var(--warning-color)" }
      - { to: 100, color: "var(--error-color)"   }
```

### Card-level options

| Key                | Type     | Default        | Notes                                                  |
|--------------------|----------|----------------|--------------------------------------------------------|
| `title`            | string   | —              | Card heading.                                          |
| `orientation`      | enum     | `horizontal`   | `horizontal` (rows) or `vertical` (columns).           |
| `show_ticks`       | boolean  | `true`         | Show axis ticks under each row.                        |
| `default_bands`    | `Band[]` | red/amber/green| Card-level fallback for rows without explicit bands.   |
| `band_palette`     | enum     | —              | Named color scheme; fills bands that omit `color`. See below. |
| `bar_height_ratio` | 0..1     | `0.33`         | Bar thickness as a fraction of the row height.         |
| `band_opacity`     | 0..1     | `0.85`         | Opacity of the qualitative bands (composes on top of palette colors). |
| `transition_ms`    | 0..2000  | `350`          | Animation duration for value/target changes.           |
| `title_size`       | px       | `13`           | Title font size.                                       |
| `subtitle_size`    | px       | `11`           | Subtitle font size.                                    |
| `title_weight`     | 100..900 / CSS | `600`    | Title font weight.                                     |
| `label_align`      | `right`/`left` | `right`  | Horizontal: where titles sit relative to the label column. |
| `label_width`      | px       | `130`          | Horizontal: width reserved for titles/subtitles.       |
| `column_width`     | px       | auto           | Vertical: per-column width (0 / unset = auto-fit).     |
| `column_gap`       | px       | `24`           | Vertical: gap between columns.                         |
| `card_padding`     | px       | `12`           | Outer padding inside `<ha-card>`.                      |
| `tick_count`       | int      | `5`            | Approximate number of axis ticks.                      |
| `tick_color`       | string   | inherit        | CSS color for axis text + lines.                       |
| `axis_size`        | px       | `10`           | Axis tick label font size.                             |
| `font_family`      | string   | inherit        | CSS font-family applied to the SVG.                    |
| `show_value`       | boolean  | `false`        | Render the current numeric value next to the bar.      |
| `band_style`       | `solid`/`striped` | `solid` | Solid fill or diagonal-stripe pattern.                 |
| `entities[]`       | `Row[]`  | **required**   | At least one row.                                      |

### Per-row keys

| Key            | Type                                       | Notes                                              |
|----------------|--------------------------------------------|----------------------------------------------------|
| `entity`       | string                                     | Required. Must expose a numeric `state`.           |
| `name`         | string                                     | Bold title. Defaults to entity `friendly_name`.    |
| `subtitle`     | string                                     | Smaller, lighter line under the title (Few-style). |
| `unit`         | string                                     | Defaults to `unit_of_measurement`.                 |
| `min`/`max`    | number                                     | Scale bounds; defaults derive from bands + value.  |
| `target`       | number / object (see below)                | The comparative marker.                            |
| `bands`        | `Band[]` — `{ to: number, color?: string }`| Sorted ascending by `to`. Inherits `default_bands`. `color` is optional when `band_palette` is set. |
| `band_palette` | enum                                       | Overrides the card-level palette for this row.     |
| `icon`         | string                                     | mdi-style icon shown before the title (e.g. `mdi:flash`). |
| `tap_action`   | HA action object                           | Standard Home Assistant action (e.g. `{action: more-info}`). |
| `hold_action`  | HA action object                           | Long-press action.                                 |

### Color palettes (`band_palette`)

Instead of repeating colors on every band, set a named `band_palette` and let the card fill them. Palette colors are produced as a smooth ramp scaled to the *number of bands*, so the same palette works for 2, 3 or 5+ bands without losing meaning. `band_opacity` still applies on top.

| Palette            | Direction     | Use case                                                 |
|--------------------|---------------|----------------------------------------------------------|
| `traffic`          | red → green   | Default Stephen Few — low is bad, high is good.          |
| `traffic-reverse`  | green → red   | Lower-is-better metrics (energy, errors, latency).       |
| `heat`             | green → red, 4-stop | Smoother gradient than `traffic`.                  |
| `cool`             | light blue → deep blue | Diverging in blue tones.                        |
| `gray`             | light → dark gray | Monochrome, neutral.                                 |
| `blues`            | light → dark blue | Monochrome, calm.                                    |
| `greens`           | light → dark green | Monochrome, growth.                                 |
| `reds`             | light → dark red | Monochrome, alarm-shaded.                             |
| `oranges`          | light → dark orange | Monochrome, warm.                                  |
| `purples`          | light → dark purple | Monochrome.                                        |
| `teals`            | light → dark teal | Monochrome.                                          |
| `pinks`            | light → dark pink | Monochrome.                                          |

```yaml
type: custom:bullet-chart-card
band_palette: blues          # card-level: applies to all rows that don't override
band_opacity: 0.6
entities:
  - entity: sensor.cpu_load
    bands: [{ to: 40 }, { to: 75 }, { to: 100 }]   # colors come from `blues`
  - entity: sensor.disk_io
    band_palette: traffic-reverse                    # row-level override
    bands: [{ to: 30 }, { to: 60 }, { to: 100 }]
  - entity: sensor.uptime
    bands:                                            # mix: palette + an explicit override
      - { to: 50, color: "#888" }
      - { to: 100 }                                   # filled from `blues`
```

Explicit `color` on a band always wins over the palette.

### Target object

`target` can be a plain number for the simplest case, or a full object that also controls how the marker is drawn:

```yaml
target:
  value: 80                # OR `entity: input_number.x` (with optional `attribute:`)
  style: arrow             # line | arrow | dot       (default: line)
  position: below          # inline | outside | above | below | left | right (default: inline)
  side: bottom             # auto | top | bottom | start | end  (default: auto)
  size: 9                  # px (arrow base / dot diameter / line extension)
  thickness: 3             # px (line stroke width — ignored for arrow/dot)
  offset: 2                # px gap between the bar edge and the indicator
  color: "var(--primary-color)"
```

**Position shorthand**: `position: above | below | left | right` is shorthand for `position: outside` plus the corresponding `side`. So `position: above` ≡ `position: outside, side: top`.

**Side compatibility per orientation**:
- *Horizontal* bullets accept `top` / `bottom` outside; `start` / `end` (= `left` / `right`) fall back to `bottom`.
- *Vertical* bullets accept `start` / `end` outside; `top` / `bottom` (= `above` / `below`) fall back to `end`.

`side: auto` resolves to **bottom** in horizontal orientation and **end** (right) in vertical orientation — the position closest to the axis.

### Theme variables

The card inherits the following Home Assistant CSS variables. Override them in your dashboard theme to restyle without touching YAML:

| Variable                    | Used by                                 |
|-----------------------------|-----------------------------------------|
| `--primary-text-color`      | Title text, performance bar, target line/arrow/dot (when `color` is unset). |
| `--secondary-text-color`    | Subtitle, axis ticks (when `tick_color` is unset). |
| `--card-background-color`   | `<ha-card>` background.                 |
| `--divider-color`           | Outer borders (where applicable).       |
| `--error-color`             | Default `traffic` palette — low end.    |
| `--warning-color`           | Default `traffic` palette — middle.    |
| `--success-color`           | Default `traffic` palette — high end.   |
| `--primary-color`           | Suggested for explicit `target.color`. |

Named palettes (`traffic`, `blues`, `greens`, …) use **resolved hex colors** rather than CSS variables, so they look identical across themes. To follow the theme, use explicit `bands: [{ to: …, color: "var(--success-color)" }]`.

All legacy shapes still work:

```yaml
target: 80
target: { value: 80 }
target: { entity: input_number.energy_target }
```

## Development

```bash
npm install
npm test           # Vitest: scale math + config validation
npm run build      # produces dist/bullet-chart-card.js
```

Copy `dist/bullet-chart-card.js` to your HA `config/www/` to test against a live instance.
