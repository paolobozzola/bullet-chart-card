/**
 * Bullet chart as an HA entity row.
 *
 * Used as `type: custom:bullet-chart-row` inside an `entities:` card. There is
 * no `<ha-card>` wrapper — the wrapping card provides the chrome. The element
 * adapts the single-entity config into the same `NormalizedConfig` pipeline as
 * the standalone card, then calls a row-mode renderer.
 */
import type { ActionConfig } from 'custom-card-helpers';
import { select } from 'd3-selection';
import { LitElement, css, html, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, query, state } from 'lit/decorators.js';

import { validateRowConfig } from './config/row';
import type { NormalizedConfig } from './config/schema';
import { buildRowsForRender } from './render/bullet';
import { ROW_RENDER_HEIGHT, renderRow } from './render/row';
import type { HomeAssistant } from './ha/types';
import { parseStateNumber } from './util/state';

@customElement('bullet-chart-row')
export class BulletChartRow extends LitElement {
  static override styles = css`
    :host {
      display: block;
      width: 100%;
    }
    .error {
      padding: 4px 8px;
      color: var(--error-color, #db4437);
      font-size: 0.85rem;
    }
    svg {
      display: block;
      width: 100%;
    }
    svg g.row[data-clickable='true'] {
      cursor: pointer;
    }
  `;

  @state() private _config?: NormalizedConfig;
  @state() private _error?: string;
  @state() private _width = 0;
  @query('svg') private _svg!: SVGSVGElement;

  private _hass?: HomeAssistant;
  private _lastSnapshot?: string;
  private _resizeObserver?: ResizeObserver;
  private _holdTimer?: ReturnType<typeof setTimeout>;
  private _holdFired = false;

  /**
   * Lazy-load the editor when the Lovelace dashboard opens the row-edit dialog.
   * HA picks this up automatically for any custom element with a matching name.
   */
  static async getConfigElement(): Promise<HTMLElement> {
    await import('./bullet-chart-row-editor');
    return document.createElement('bullet-chart-row-editor');
  }

  static getStubConfig(hass: HomeAssistant, entities: string[]): Record<string, unknown> {
    const pickNumeric = (id: string): boolean => {
      if (!id.startsWith('sensor.') && !id.startsWith('input_number.')) return false;
      const raw = hass?.states[id]?.state;
      if (raw === undefined || raw === null) return false;
      return Number.isFinite(Number(raw));
    };
    const first =
      entities.find(pickNumeric) ?? entities.find((e) => e.startsWith('sensor.')) ?? entities[0];
    return {
      type: 'custom:bullet-chart-row',
      entity: first ?? 'sensor.example',
      target: 75,
      show_value: true,
    };
  }

  setConfig(config: unknown): void {
    try {
      this._config = validateRowConfig(config);
      this._error = undefined;
      this._lastSnapshot = undefined;
    } catch (e) {
      this._config = undefined;
      this._error = e instanceof Error ? e.message : 'Invalid configuration';
      throw e;
    }
  }

  set hass(hass: HomeAssistant) {
    const prev = this._hass;
    this._hass = hass;
    if (!this._config) return;
    const snap = this._snapshot(hass, this._config);
    if (snap !== this._lastSnapshot) {
      this._lastSnapshot = snap;
      this.requestUpdate('_hass', prev);
    }
  }

  get hass(): HomeAssistant | undefined {
    return this._hass;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const w = Math.round(entry.contentRect.width);
          if (w !== this._width) this._width = w;
        }
      });
      this._resizeObserver.observe(this);
    } else {
      this._width = this.clientWidth || 360;
    }
  }

  override disconnectedCallback(): void {
    this._resizeObserver?.disconnect();
    this._resizeObserver = undefined;
    if (this._holdTimer) {
      clearTimeout(this._holdTimer);
      this._holdTimer = undefined;
    }
    super.disconnectedCallback();
  }

  override render(): TemplateResult {
    if (this._error) {
      return html`<div class="error">${this._error}</div>`;
    }
    return html`
      <svg
        xmlns="http://www.w3.org/2000/svg"
        @click=${this._onClick}
        @contextmenu=${this._onContextMenu}
        @pointerdown=${this._onPointerDown}
        @pointerup=${this._onPointerUp}
        @pointerleave=${this._onPointerUp}
      ></svg>
    `;
  }

  override firstUpdated(): void {
    if (this._width === 0) this._width = this.clientWidth || 360;
    this._draw();
  }

  override updated(_changed: PropertyValues): void {
    this._draw();
  }

  private _draw(): void {
    if (!this._config || !this._svg) return;
    const width = this._width || this.clientWidth || 360;
    const rows = this._buildRows(this._config);
    const height = ROW_RENDER_HEIGHT;

    renderRow(select(this._svg), {
        rows,
        orientation: 'horizontal',
        showTicks: this._config.showTicks,
        width,
        height,
        barHeightRatio: this._config.barHeightRatio,
        bandOpacity: this._config.bandOpacity,
        transitionMs: this._config.transitionMs,
        titleSize: this._config.titleSize,
        subtitleSize: this._config.subtitleSize,
        titleWeight: this._config.titleWeight,
        labelAlign: this._config.labelAlign,
        labelWidth: this._config.labelWidth,
        columnWidth: this._config.columnWidth,
        columnGap: this._config.columnGap,
        cardPadding: 0, // row has no card padding
        tickCount: this._config.tickCount,
        tickColor: this._config.tickColor,
        axisSize: this._config.axisSize,
        fontFamily: this._config.fontFamily,
        showValue: this._config.showValue,
        bandStyle: this._config.bandStyle,
      },
    );

    this._svg.setAttribute('height', String(height));
  }

  private _buildRows(config: NormalizedConfig) {
    const hass = this._hass;
    const resolveNumber = (id: string, attribute?: string): number | undefined => {
      const s = hass?.states[id];
      if (!s) return undefined;
      if (attribute) return parseStateNumber(s.attributes?.[attribute]);
      return parseStateNumber(s.state);
    };
    const resolveName = (id: string): string | undefined =>
      hass?.states[id]?.attributes?.friendly_name as string | undefined;
    const resolveUnit = (id: string): string | undefined =>
      hass?.states[id]?.attributes?.unit_of_measurement as string | undefined;
    return buildRowsForRender(config, resolveNumber, resolveName, resolveUnit);
  }

  private _snapshot(hass: HomeAssistant, config: NormalizedConfig): string {
    const parts: string[] = [];
    const push = (id: string, attr?: string): void => {
      const s = hass.states[id];
      const v = s ? (attr ? s.attributes?.[attr] : s.state) : '∅';
      parts.push(`${attr ? `${id}::${attr}` : id}=${String(v)}`);
    };
    for (const row of config.entities) {
      push(row.entity);
      const src = row.target?.source;
      if (src?.kind === 'entity') push(src.entity, src.attribute);
    }
    return parts.join('|');
  }

  // ---- Click / long-press → tap_action / hold_action --------------------

  private _onPointerDown = (): void => {
    this._holdFired = false;
    const row = this._config?.entities[0];
    if (!row?.hold_action) return;
    this._holdTimer = setTimeout(() => {
      this._holdFired = true;
      void this._handleAction('hold');
    }, 500);
  };

  private _onPointerUp = (): void => {
    if (this._holdTimer) {
      clearTimeout(this._holdTimer);
      this._holdTimer = undefined;
    }
  };

  private _onClick = (): void => {
    if (this._holdFired) {
      this._holdFired = false;
      return;
    }
    const row = this._config?.entities[0];
    if (!row?.tap_action) return;
    void this._handleAction('tap');
  };

  private _onContextMenu = (ev: MouseEvent): void => {
    const row = this._config?.entities[0];
    if (row?.hold_action) ev.preventDefault();
  };

  private async _handleAction(action: 'tap' | 'hold'): Promise<void> {
    if (!this._hass || !this._config) return;
    const row = this._config.entities[0];
    if (!row) return;
    const { handleAction } = await import('custom-card-helpers');
    handleAction(
      this,
      this._hass,
      {
        entity: row.entity,
        tap_action: row.tap_action as ActionConfig | undefined,
        hold_action: row.hold_action as ActionConfig | undefined,
      },
      action,
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'bullet-chart-row': BulletChartRow;
  }
}
