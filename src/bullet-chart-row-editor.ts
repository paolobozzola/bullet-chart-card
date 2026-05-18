/**
 * Visual editor for `<bullet-chart-row>`. Single-entity form; mirrors the
 * card editor's per-row + target sub-form but flattened (no entities array,
 * no card chrome).
 */
import { LitElement, css, html, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { PALETTE_NAMES } from './config/palettes';
import type { BulletChartRowConfig } from './config/row';
import type { HomeAssistant } from './ha/types';

interface HaFormSchemaItem {
  name: string;
  selector?: Record<string, unknown>;
  required?: boolean;
  default?: unknown;
}

@customElement('bullet-chart-row-editor')
export class BulletChartRowEditor extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }
    h3 {
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin: 12px 0 4px;
      color: var(--secondary-text-color, #757575);
    }
    .hint {
      font-size: 0.85rem;
      color: var(--secondary-text-color, #757575);
      padding: 8px 0;
    }
    .section {
      margin-top: 12px;
      padding-top: 4px;
      border-top: 1px solid var(--divider-color, #e0e0e0);
    }
  `;

  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private _config?: BulletChartRowConfig;

  setConfig(config: BulletChartRowConfig): void {
    this._config = { ...config };
  }

  override render(): TemplateResult {
    if (!this._config) return html`<div class="hint">Loading…</div>`;

    const paletteOptions = [
      { value: '', label: '(none — use explicit band colors)' },
      ...PALETTE_NAMES.map((p) => ({ value: p, label: p })),
    ];

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

    const looksSchema: HaFormSchemaItem[] = [
      { name: 'show_value', selector: { boolean: {} } },
      { name: 'show_ticks', selector: { boolean: {} } },
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

    const targetVal =
      typeof this._config.target === 'object' && this._config.target !== null
        ? this._config.target
        : typeof this._config.target === 'number'
          ? { value: this._config.target }
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
      <h3>Entity</h3>
      ${this._renderHaForm(baseSchema, this._config as unknown as Record<string, unknown>, this._update)}

      <h3>Appearance</h3>
      ${this._renderHaForm(
        looksSchema,
        {
          show_value: this._config.show_value ?? false,
          show_ticks: this._config.show_ticks ?? false,
          band_palette: this._config.band_palette ?? '',
          band_style: this._config.band_style ?? 'solid',
        },
        this._update,
      )}

      <h3>Target</h3>
      <div class="section">
        ${this._renderHaForm(targetSchema, targetVal as Record<string, unknown>, this._updateTarget)}
      </div>
    `;
  }

  private _renderHaForm(
    schema: HaFormSchemaItem[],
    data: Record<string, unknown>,
    onChange: (data: Record<string, unknown>) => void,
  ): TemplateResult {
    if (!customElements.get('ha-form')) {
      return html`<div class="hint">Open the YAML editor to configure this row.</div>`;
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

  private _update = (data: Record<string, unknown>): void => {
    if (!this._config) return;
    const merged: BulletChartRowConfig = {
      ...this._config,
      ...(data as Partial<BulletChartRowConfig>),
    };
    // Empty strings should clear, not be stored.
    for (const k of Object.keys(merged) as (keyof BulletChartRowConfig)[]) {
      if (merged[k] === '') (merged as unknown as Record<string, unknown>)[k] = undefined;
    }
    this._emit(merged);
  };

  private _updateTarget = (data: Record<string, unknown>): void => {
    if (!this._config) return;
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== '' && v !== null && v !== undefined) cleaned[k] = v;
    }
    const next: BulletChartRowConfig = { ...this._config };
    next.target = Object.keys(cleaned).length > 0 ? (cleaned as never) : undefined;
    this._emit(next);
  };

  private _emit(config: BulletChartRowConfig): void {
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
    'bullet-chart-row-editor': BulletChartRowEditor;
  }
}
