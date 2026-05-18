# HA demo dashboard

A self-contained demo that exercises **both modes** of the card:

- `custom:bullet-chart-card` — full-width card (horizontal multi-row + vertical small-multiples).
- `custom:bullet-chart-row` — bullet inside a standard `entities:` card.

Drag the **sliders** at the top of the dashboard to make all the cards react in real time — no real sensors required.

## What's in here

| File | Purpose |
|---|---|
| `configuration.yaml` | Four `input_number` sliders + three `template` sensors that mirror them. Paste into your HA `configuration.yaml`. |
| `dashboard.yaml` | The full demo dashboard (5 cards). Paste into a new manual dashboard. |

## Install steps

### 1. Install the card resource

Choose one:

**HACS (recommended)** — Settings → HACS → Frontend → ⋮ → Custom repositories → add `https://github.com/paolobozzola/bullet-chart-card` (category Lovelace). Then install "Bullet Chart Card". HACS adds the Lovelace resource automatically.

**Manual** — Download `bullet-chart-card.js` from the [latest release](https://github.com/paolobozzola/bullet-chart-card/releases) into your HA `config/www/` folder. Then go to **Settings → Dashboards → Resources → Add Resource**:

- URL: `/local/bullet-chart-card.js`
- Type: **JavaScript Module**

### 2. Create the demo entities

Open `configuration.yaml` in this folder and paste the whole content into your HA `configuration.yaml` (or include it as a package).

In **Developer Tools → YAML**:
- Click "Check Configuration".
- Click **Restart** (a full restart is needed the first time, because `template:` sensors that didn't exist before won't appear via Quick Reload).

After the restart, you should see four `input_number.bullet_demo_*` entities and three `sensor.bullet_demo_*` entities under **Developer Tools → States**.

### 3. Create the demo dashboard

**Settings → Dashboards → ＋ Add Dashboard → New dashboard from scratch**:

- Title: `Bullet Chart Demo`
- Icon: `mdi:chart-bar`
- (Show in sidebar: optional)

Open the new dashboard. Click the **⋮ menu** (top right) → **Edit dashboard** → **⋮** again → **Raw configuration editor**. Replace the entire YAML with the content of `dashboard.yaml` in this folder. **Save**.

You should now see five cards stacked:

1. **Live controls** — four `input_number` sliders.
2. **Today's KPIs (card)** — the standalone card, three KPIs, Few-style arrows below.
3. **Today's KPIs (vertical)** — same data, vertical small-multiples.
4. **Today's KPIs (row)** — same data, bullet rows inside an entities card.
5. **Styling tweaks** — striped blues palette + `show_value`.

Drag any of the sliders in card 1 and watch every other card update.

## Removing the demo

When you're done playing:

1. Settings → Dashboards → click the demo dashboard → ⋮ → **Delete**.
2. Remove the `input_number:` and `template:` blocks from `configuration.yaml`.
3. Restart HA.
