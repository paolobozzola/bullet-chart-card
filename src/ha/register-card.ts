import './types';

export function registerCardPicker(): void {
  window.customCards = window.customCards ?? [];
  if (window.customCards.some((c) => c.type === 'bullet-chart-card')) {
    // eslint-disable-next-line no-console
    console.warn('[bullet-chart-card] already registered — ignoring duplicate load');
    return;
  }
  window.customCards.push({
    type: 'bullet-chart-card',
    name: 'Bullet Chart',
    description: 'Stephen Few-style bullet chart for numeric Home Assistant entities',
    preview: true,
  });
}
