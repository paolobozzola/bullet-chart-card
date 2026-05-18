import { LitElement, css, html, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';

import type { ActionConfig } from 'custom-card-helpers';

import { validateConfig, type NormalizedConfig } from './config/schema';
import { buildRowsForRender, computeSvgHeight, renderBullets, type RowDatum } from './render/bullet';
import { parseStateNumber } from './util/state';
import type { HomeAssistant, LovelaceCard } from './ha/types';

@customElement('bullet-chart-card')
export class BulletChartCard extends LitElement implements LovelaceCard {
  static override styles = css`
    :host {
      display: block;
    }
    ha-card {
      display: flex;
      flex-direction: column;
      padding: 0;
      overflow: hidden;
    }
    .title {
      padding: 12px 16px 4px;
      font-size: 1rem;
      font-weight: 500;
      color: var(--primary-text-color, #212121);
    }
    .error {
      padding: 12px 16px;
      color: var(--error-color, #db4437);
    }
    svg {
      display: block;
      width: 100%;
    }
    svg g.row[data-clickable='true'],
    svg g.col[data-clickable='true'] {
      cursor: pointer;
    }
  `;

  @state() private _config?: NormalizedConfig;
  @state() private _error?: string;
  @state() private _width = 0;

  @query('svg') private _svg!: SVGSVGElement;

  private _hass?: HomeAssistant;
  private _lastSnapshot: string | undefined;
  private _resizeObserver?: ResizeObserver;

  /**
   * Static config element factory used by the Lovelace card-edit dialog.
   * Lazy-loads the editor module so we don't drag it into the runtime bundle path.
   */
  static async getConfigElement(): Promise<HTMLElement> {
    await import('./bullet-chart-card-editor');
    return document.createElement('bullet-chart-card-editor');
  }

  static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
  ): Record<string, unknown> {
    // Prefer a numeric sensor — picking a string-valued entity (e.g.
    // sensor.weather_state = "Sunny") would render an empty card on first
    // drop, which is confusing in the card picker.
    const pickNumeric = (id: string): boolean => {
      if (!id.startsWith('sensor.') && !id.startsWith('input_number.')) return false;
      const raw = hass?.states[id]?.state;
      if (raw === undefined || raw === null) return false;
      const n = Number(raw);
      return Number.isFinite(n);
    };
    const first = entities.find(pickNumeric) ?? entities.find((e) => e.startsWith('sensor.')) ?? entities[0];
    return {
      type: 'custom:bullet-chart-card',
      entities: first
        ? [{ entity: first, target: { value: 75 } }]
        : [{ entity: 'sensor.example', target: { value: 75 } }],
    };
  }

  setConfig(config: unknown): void {
    try {
      this._config = validateConfig(config);
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

    const snapshot = this._snapshotEntities(hass, this._config);
    if (snapshot !== this._lastSnapshot) {
      this._lastSnapshot = snapshot;
      this.requestUpdate('_hass', prev);
    }
  }

  get hass(): HomeAssistant | undefined {
    return this._hass;
  }

  getCardSize(): number {
    if (!this._config) return 1;
    // Vertical layout: the whole card is roughly a fixed 3 rows of HA's grid,
    // independent of column count. Horizontal: one HA row per entity (capped).
    if (this._config.orientation === 'vertical') return 3;
    return Math.max(1, Math.ceil(this._config.entities.length * 0.8));
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const w = Math.round(entry.contentRect.width);
          if (w !== this._width) {
            this._width = w;
          }
        }
      });
      this._resizeObserver.observe(this);
    } else {
      this._width = this.clientWidth || 320;
    }
  }

  override disconnectedCallback(): void {
    this._resizeObserver?.disconnect();
    this._resizeObserver = undefined;
    super.disconnectedCallback();
  }

  override render(): TemplateResult {
    if (this._error) {
      return html`<ha-card><div class="error">${this._error}</div></ha-card>`;
    }
    if (!this._config) {
      return html`<ha-card></ha-card>`;
    }
    return html`
      <ha-card>
        ${this._config.title ? html`<div class="title">${this._config.title}</div>` : ''}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          @click=${this._onClick}
          @contextmenu=${this._onContextMenu}
          @pointerdown=${this._onPointerDown}
          @pointerup=${this._onPointerUp}
          @pointerleave=${this._onPointerUp}
        ></svg>
      </ha-card>
    `;
  }

  private _holdTimer?: ReturnType<typeof setTimeout>;
  private _holdFired = false;

  private _onPointerDown = (ev: PointerEvent): void => {
    this._holdFired = false;
    const row = this._findRowFromEvent(ev);
    if (!row?.hold_action) return;
    this._holdTimer = setTimeout(() => {
      this._holdFired = true;
      void this._handleAction(row, 'hold');
    }, 500);
  };

  private _onPointerUp = (): void => {
    if (this._holdTimer) {
      clearTimeout(this._holdTimer);
      this._holdTimer = undefined;
    }
  };

  private _onClick = (ev: MouseEvent): void => {
    if (this._holdFired) {
      this._holdFired = false;
      return;
    }
    const row = this._findRowFromEvent(ev);
    if (!row?.tap_action) return;
    void this._handleAction(row, 'tap');
  };

  private _onContextMenu = (ev: MouseEvent): void => {
    // Suppress the browser context menu when the row has a hold_action wired
    // up; long-press already fires via the pointer timer above.
    const row = this._findRowFromEvent(ev);
    if (row?.hold_action) ev.preventDefault();
  };

  private async _handleAction(
    row: NonNullable<NormalizedConfig['entities'][number]>,
    action: 'tap' | 'hold',
  ): Promise<void> {
    if (!this._hass) return;
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

  private _findRowFromEvent(ev: Event):
    | NonNullable<NormalizedConfig['entities'][number]>
    | undefined {
    if (!this._config) return undefined;
    const target = ev.target as Element | null;
    const rowGroup = target?.closest<SVGGElement>('g.row, g.col');
    if (!rowGroup) return undefined;
    const idx = Number(rowGroup.getAttribute('data-row-index'));
    if (!Number.isInteger(idx) || idx < 0 || idx >= this._config.entities.length) {
      return undefined;
    }
    return this._config.entities[idx];
  }

  override updated(changed: PropertyValues): void {
    if (!this._config || !this._svg) return;
    void changed;
    this._draw();
  }

  override firstUpdated(): void {
    if (this._width === 0) {
      this._width = this.clientWidth || 320;
    }
    this._draw();
  }

  private _draw(): void {
    if (!this._config || !this._svg) return;
    const width = this._width || this.clientWidth || 320;
    const rows = this._buildRows(this._config);
    const height = computeSvgHeight(
      rows.length,
      this._config.orientation,
      this._config.showTicks,
      this._config.cardPadding,
      this._config.axisSize,
    );
    renderBullets(this._svg, {
      rows,
      orientation: this._config.orientation,
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
      cardPadding: this._config.cardPadding,
      tickCount: this._config.tickCount,
      tickColor: this._config.tickColor,
      axisSize: this._config.axisSize,
      fontFamily: this._config.fontFamily,
      showValue: this._config.showValue,
      bandStyle: this._config.bandStyle,
    });
  }

  private _buildRows(config: NormalizedConfig): RowDatum[] {
    const hass = this._hass;
    const resolveNumber = (entityId: string, attribute?: string): number | undefined => {
      const s = hass?.states[entityId];
      if (!s) return undefined;
      if (attribute) return parseStateNumber(s.attributes?.[attribute]);
      return parseStateNumber(s.state);
    };
    const resolveName = (entityId: string): string | undefined => {
      return hass?.states[entityId]?.attributes?.friendly_name as string | undefined;
    };
    const resolveUnit = (entityId: string): string | undefined => {
      return hass?.states[entityId]?.attributes?.unit_of_measurement as string | undefined;
    };
    return buildRowsForRender(config, resolveNumber, resolveName, resolveUnit);
  }

  /** Stable string fingerprint of the entity states we care about. */
  private _snapshotEntities(hass: HomeAssistant, config: NormalizedConfig): string {
    const parts: string[] = [];
    const seen = new Set<string>();
    const push = (id: string, attr?: string) => {
      const key = attr ? `${id}::${attr}` : id;
      if (seen.has(key)) return;
      seen.add(key);
      const s = hass.states[id];
      if (!s) {
        parts.push(`${key}=∅`);
        return;
      }
      const v = attr ? s.attributes?.[attr] : s.state;
      parts.push(`${key}=${String(v)}`);
    };
    for (const row of config.entities) {
      push(row.entity);
      const src = row.target?.source;
      if (src?.kind === 'entity') push(src.entity, src.attribute);
    }
    return parts.join('|');
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'bullet-chart-card': BulletChartCard;
  }
}
