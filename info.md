# Bullet Chart Card

Stephen Few-style **bullet charts** for Home Assistant — compact, information-dense KPI rows for numeric entities. Built on LitElement + d3 v7.

![preview](docs/img/preview.svg)

## Quick start

After installing via HACS, add a card to your dashboard:

```yaml
type: custom:bullet-chart-card
entities:
  - entity: sensor.daily_energy_use
    name: Energy
    subtitle: kWh, today
    target: { value: 80, position: below, style: arrow }
```

See the [README](https://github.com/paolobozzola/bullet-chart-card#readme) for the full configuration reference, color palettes, and visual tweaks.
