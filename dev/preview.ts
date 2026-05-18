/**
 * Standalone preview harness for the Bullet Chart Card.
 *
 *  - Shims `<ha-card>` so Lit can render without Home Assistant.
 *  - Builds a fake `hass` object driven by the entity-value sliders.
 *  - Lets the user edit the card YAML config live in a textarea; the card
 *    re-renders on every keystroke (errors are surfaced inline).
 *  - Renders README.md below the workspace using `marked` so the page doubles
 *    as a docs preview of what HACS will show.
 */
import { load as parseYaml, dump as toYaml } from 'js-yaml';
import { marked } from 'marked';

import '../src/index';
import readmeText from '../README.md?raw';

// ---- 1. <ha-card> shim --------------------------------------------------
if (!customElements.get('ha-card')) {
  class HaCardShim extends HTMLElement {
    connectedCallback(): void {
      this.style.display = 'block';
      this.style.background = 'var(--card-background-color, #fff)';
      this.style.color = 'var(--primary-text-color, #212121)';
      this.style.borderRadius = '8px';
      this.style.overflow = 'hidden';
    }
  }
  customElements.define('ha-card', HaCardShim);
}

// ---- 2. DOM refs + fake hass --------------------------------------------
type FakeState = {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
};

const sliders = {
  energy: byId<HTMLInputElement>('energy'),
  water: byId<HTMLInputElement>('water'),
  temp: byId<HTMLInputElement>('temp'),
  energyTarget: byId<HTMLInputElement>('energy-target'),
};
const outs = {
  energy: byId<HTMLOutputElement>('energy-out'),
  water: byId<HTMLOutputElement>('water-out'),
  temp: byId<HTMLOutputElement>('temp-out'),
  energyTarget: byId<HTMLOutputElement>('energy-target-out'),
};

function buildHass() {
  const states: Record<string, FakeState> = {
    'sensor.daily_energy_use': {
      entity_id: 'sensor.daily_energy_use',
      state: sliders.energy.value,
      attributes: { friendly_name: 'Daily energy', unit_of_measurement: 'kWh' },
    },
    'sensor.daily_water_use': {
      entity_id: 'sensor.daily_water_use',
      state: sliders.water.value,
      attributes: { friendly_name: 'Daily water', unit_of_measurement: 'L' },
    },
    'sensor.living_room_temperature': {
      entity_id: 'sensor.living_room_temperature',
      state: sliders.temp.value,
      attributes: { friendly_name: 'Living room', unit_of_measurement: '°C' },
    },
    'input_number.energy_target': {
      entity_id: 'input_number.energy_target',
      state: sliders.energyTarget.value,
      attributes: { friendly_name: 'Energy target' },
    },
  };
  return { states, callService: () => Promise.resolve() };
}

// ---- 3. Default YAML config ---------------------------------------------
const DEFAULT_CONFIG = {
  type: 'custom:bullet-chart-card',
  title: "Today's KPIs",
  orientation: 'horizontal',
  show_ticks: true,
  // Phase 1 visual tweaks
  bar_height_ratio: 0.3,
  band_opacity: 0.8,
  // Phase 2 visual tweaks (try toggling these in the editor)
  label_align: 'right',           // left | right
  label_width: 130,
  card_padding: 14,
  tick_count: 5,
  axis_size: 10,
  show_value: true,               // renders the current value next to the bar
  band_style: 'solid',            // solid | striped
  // font_family: 'Georgia, serif',
  // Try also: traffic-reverse, heat, blues, greens, gray, oranges, purples, teals, pinks
  band_palette: 'traffic',
  default_bands: [{ to: 33 }, { to: 67 }, { to: 100 }],
  entities: [
    {
      entity: 'sensor.daily_energy_use',
      name: 'Energy',
      subtitle: 'kWh, today',
      min: 0,
      max: 100,
      target: {
        entity: 'input_number.energy_target',
        style: 'arrow',
        position: 'outside',
        side: 'bottom',
        size: 9,
      },
    },
    {
      entity: 'sensor.daily_water_use',
      name: 'Water',
      subtitle: 'litres, today',
      min: 0,
      max: 200,
      target: { value: 150, style: 'arrow', position: 'outside', side: 'bottom', size: 9 },
      band_palette: 'traffic-reverse',
      bands: [{ to: 80 }, { to: 150 }, { to: 200 }],
    },
    {
      entity: 'sensor.living_room_temperature',
      name: 'Temperature',
      subtitle: '°C, living room',
      min: 10,
      max: 30,
      target: { value: 21, style: 'arrow', position: 'outside', side: 'bottom', size: 9 },
      band_palette: 'blues',
      bands: [{ to: 17 }, { to: 19 }, { to: 23 }, { to: 25 }, { to: 30 }],
    },
  ],
};

// ---- 4. Card mount + reactive wiring ------------------------------------
const host = byId<HTMLDivElement>('card-host');
const yamlInput = byId<HTMLTextAreaElement>('yaml-input');
const yamlStatus = byId<HTMLDivElement>('yaml-status');

type CardEl = HTMLElement & {
  setConfig: (c: unknown) => void;
  hass: unknown;
};

let card: CardEl | undefined;

function mountCardIfNeeded(): CardEl {
  if (!card || !card.isConnected) {
    host.innerHTML = '';
    card = document.createElement('bullet-chart-card') as CardEl;
    host.appendChild(card);
  }
  return card;
}

function applyConfigFromYaml(): void {
  let parsed: unknown;
  try {
    parsed = parseYaml(yamlInput.value);
  } catch (e) {
    showError(`YAML parse error:\n${e instanceof Error ? e.message : String(e)}`);
    return;
  }
  if (!parsed || typeof parsed !== 'object') {
    showError('YAML must be an object.');
    return;
  }
  // The card may have thrown on a previous bad config; remount so it's fresh.
  const el = mountCardIfNeeded();
  try {
    el.setConfig(parsed);
    el.hass = buildHass();
    showOk('parsed OK');
  } catch (e) {
    showError(`setConfig: ${e instanceof Error ? e.message : String(e)}`);
    // Force a remount on the next successful parse — the element is now in
    // an error state and a fresh attempt deserves a clean slot.
    host.innerHTML = '';
    card = undefined;
  }
}

function pushHass(): void {
  if (card && card.isConnected) {
    card.hass = buildHass();
  }
}

function showOk(msg: string): void {
  yamlStatus.textContent = msg;
  yamlStatus.classList.add('ok');
  yamlStatus.classList.remove('err');
}
function showError(msg: string): void {
  yamlStatus.textContent = msg;
  yamlStatus.classList.add('err');
  yamlStatus.classList.remove('ok');
}

function seedYaml(): void {
  yamlInput.value = toYaml(DEFAULT_CONFIG, { lineWidth: 100 });
}

function updateOutputs(): void {
  outs.energy.value = sliders.energy.value;
  outs.water.value = sliders.water.value;
  outs.temp.value = sliders.temp.value;
  outs.energyTarget.value = sliders.energyTarget.value;
}

for (const el of Object.values(sliders)) {
  el.addEventListener('input', () => {
    updateOutputs();
    pushHass();
  });
}

yamlInput.addEventListener('input', applyConfigFromYaml);

byId<HTMLButtonElement>('theme').addEventListener('click', () => {
  document.documentElement.classList.toggle('dark');
});

byId<HTMLButtonElement>('reset').addEventListener('click', () => {
  seedYaml();
  applyConfigFromYaml();
});

byId<HTMLButtonElement>('randomize').addEventListener('click', () => {
  sliders.energy.value = String(Math.round(Math.random() * 100));
  sliders.water.value = String(Math.round(Math.random() * 200));
  sliders.temp.value = String((10 + Math.random() * 20).toFixed(1));
  sliders.energyTarget.value = String(Math.round(40 + Math.random() * 50));
  updateOutputs();
  pushHass();
});

// ---- 5. Render README into the docs panel -------------------------------
const readmeEl = byId<HTMLElement>('readme');
readmeEl.innerHTML = marked.parse(readmeText, { async: false }) as string;

// ---- 6. Boot ------------------------------------------------------------
seedYaml();
applyConfigFromYaml();

// ---- helpers ------------------------------------------------------------
function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing`);
  return el as T;
}
