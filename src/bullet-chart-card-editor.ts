import { LitElement, css, html, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import type { BulletChartCardConfig, EntityRowConfig } from './config/schema';
import { PALETTE_NAMES } from './config/palettes';
import type { HomeAssistant } from './ha/types';

interface HaFormSchemaItem {
  name: string;
  selector?: Record<string, unknown>;
  required?: boolean;
  default?: unknown;
}

@customElement('bullet-chart-card-editor')
export class BulletChartCardEditor extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }
    .row {
      display: grid;
      gap: 8px;
      padding: 8px 0;
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
    }
    .row:last-child {
      border-bottom: none;
    }
    .row-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.9rem;
      color: var(--secondary-text-color, #757575);
    }
    .actions {
      display: flex;
      gap: 8px;
      padding-top: 8px;
    }
    button {
      background: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, #fff);
      border: none;
      border-radius: 4px;
      padding: 6px 12px;
      cursor: pointer;
      font: inherit;
    }
    button.secondary {
      background: var(--secondary-background-color, #eeeeee);
      color: var(--primary-text-color, #212121);
    }
    .section {
      margin-top: 12px;
      padding-top: 4px;
      border-top: 1px solid var(--divider-color, #e0e0e0);
    }
    .hint {
      font-size: 0.85rem;
      color: var(--secondary-text-color, #757575);
      padding: 8px 0;
    }
    h3 {
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin: 12px 0 4px;
      color: var(--secondary-text-color, #757575);
    }
  `;

  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private _config?: BulletChartCardConfig;

  setConfig(config: BulletChartCardConfig): void {
    this._config = { ...config, entities: [...(config.entities ?? [])] };
  }

  override render(): TemplateResult {
    if (!this._config) return html`<div class="hint">Loading…</div>`;

    const paletteOptions = [
      { value: '', label: '(none — use explicit band colors)' },
      ...PALETTE_NAMES.map((p) => ({ value: p, label: p })),
    ];

    const cardSchema: HaFormSchemaItem[] = [
      { name: 'title', selector: { text: {} } },
      {
        name: 'orientation',
        selector: {
          select: {
            mode: 'dropdown',
            options: [
              { value: 'horizontal', label: 'Horizontal' },
              { value: 'vertical', label: 'Vertical' },
            ],
          },
        },
      },
      { name: 'show_ticks', selector: { boolean: {} } },
      { name: 'show_value', selector: { boolean: {} } },
      {
        name: 'band_palette',
        selector: { select: { mode: 'dropdown', options: paletteOptions } },
      },
      {
        name: 'band_style',
        selector: {
          select: {
            mode: 'dropdown',
            options: [
              { value: 'solid', label: 'Solid' },
              { value: 'striped', label: 'Striped' },
            ],
          },
        },
      },
    ];

    return html`
      <h3>Card</h3>
      ${this._renderHaForm(
        cardSchema,
        {
          title: this._config.title ?? '',
          orientation: this._config.orientation ?? 'horizontal',
          show_ticks: this._config.show_ticks ?? true,
          show_value: this._config.show_value ?? false,
          band_palette: this._config.band_palette ?? '',
          band_style: this._config.band_style ?? 'solid',
        },
        this._onCardFieldsChanged,
      )}

      <h3>Entities</h3>
      ${this._config.entities.map((row, i) => this._renderRow(row, i))}

      <div class="actions">
        <button @click=${this._addRow}>+ Add entity</button>
      </div>
    `;
  }

  private _renderRow(row: EntityRowConfig, index: number): TemplateResult {
    const baseSchema: HaFormSchemaItem[] = [
      {
        name: 'entity',
        selector: {
          entity: { domain: ['sensor', 'input_number', 'counter', 'number'] },
        },
        required: true,
      },
      { name: 'name', selector: { text: {} } },
      { name: 'subtitle', selector: { text: {} } },
      { name: 'icon', selector: { icon: {} } },
      { name: 'unit', selector: { text: {} } },
      { name: 'min', selector: { number: { mode: 'box' } } },
      { name: 'max', selector: { number: { mode: 'box' } } },
    ];

    const targetVal =
      typeof row.target === 'object' && row.target !== null
        ? row.target
        : typeof row.target === 'number'
          ? { value: row.target }
          : {};

    const targetSchema: HaFormSchemaItem[] = [
      { name: 'value', selector: { number: { mode: 'box' } } },
      {
        name: 'style',
        selector: {
          select: {
            mode: 'dropdown',
            options: [
              { value: 'line', label: 'Line' },
              { value: 'arrow', label: 'Arrow' },
              { value: 'dot', label: 'Dot' },
            ],
          },
        },
      },
      {
        name: 'position',
        selector: {
          select: {
            mode: 'dropdown',
            options: [
              { value: 'inline', label: 'Inline' },
              { value: 'outside', label: 'Outside (auto)' },
              { value: 'above', label: 'Above' },
              { value: 'below', label: 'Below' },
              { value: 'left', label: 'Left' },
              { value: 'right', label: 'Right' },
            ],
          },
        },
      },
      { name: 'color', selector: { text: {} } },
    ];

    return html`
      <div class="row">
        <div class="row-header">
          <span>Entity #${index + 1}</span>
          <button class="secondary" @click=${() => this._removeRow(index)}>Remove</button>
        </div>
        ${this._renderHaForm(
          baseSchema,
          row as unknown as Record<string, unknown>,
          (data) => this._updateRow(index, data),
        )}
        <div class="section">
          <div class="hint">Target indicator</div>
          ${this._renderHaForm(
            targetSchema,
            targetVal as Record<string, unknown>,
            (data) => this._updateRowTarget(index, data),
          )}
        </div>
      </div>
    `;
  }

  private _renderHaForm(
    schema: HaFormSchemaItem[],
    data: Record<string, unknown>,
    onChange: (data: Record<string, unknown>) => void,
  ): TemplateResult {
    if (!customElements.get('ha-form')) {
      return html`<div class="hint">Open the YAML editor to configure this card.</div>`;
    }
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        .computeLabel=${(s: HaFormSchemaItem) => s.name}
        @value-changed=${(e: CustomEvent<{ value: Record<string, unknown> }>) =>
          onChange(e.detail.value)}
      ></ha-form>
    `;
  }

  private _onCardFieldsChanged = (data: Record<string, unknown>): void => {
    if (!this._config) return;
    const next: BulletChartCardConfig = {
      ...this._config,
      title: (data.title as string) || undefined,
      orientation: (data.orientation as 'horizontal' | 'vertical') ?? 'horizontal',
      show_ticks: data.show_ticks as boolean,
      show_value: data.show_value as boolean,
      band_palette: typeof data.band_palette === 'string' && data.band_palette
        ? data.band_palette
        : undefined,
      band_style: (data.band_style as 'solid' | 'striped') ?? 'solid',
    };
    this._emit(next);
  };

  private _updateRow(index: number, data: Record<string, unknown>): void {
    if (!this._config) return;
    const entities = [...this._config.entities];
    const merged = { ...entities[index], ...data } as EntityRowConfig;
    if (!merged.entity || typeof merged.entity !== 'string') return;
    entities[index] = merged;
    this._emit({ ...this._config, entities });
  }

  private _updateRowTarget(index: number, data: Record<string, unknown>): void {
    if (!this._config) return;
    const entities = [...this._config.entities];
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== '' && v !== null && v !== undefined) cleaned[k] = v;
    }
    const existing = entities[index];
    if (!existing) return;
    const next: EntityRowConfig = { ...existing };
    next.target = Object.keys(cleaned).length > 0 ? (cleaned as never) : undefined;
    entities[index] = next;
    this._emit({ ...this._config, entities });
  }

  private _addRow = (): void => {
    if (!this._config) return;
    const entities = [...this._config.entities, { entity: '' } as EntityRowConfig];
    this._emit({ ...this._config, entities });
  };

  private _removeRow(index: number): void {
    if (!this._config) return;
    const entities = this._config.entities.filter((_, i) => i !== index);
    if (entities.length === 0) return;
    this._emit({ ...this._config, entities });
  }

  private _emit(config: BulletChartCardConfig): void {
    this._config = config;
    this.dispatchEvent(
      new CustomEvent('config-changed', {
        detail: { config },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'bullet-chart-card-editor': BulletChartCardEditor;
  }
}
