import './bullet-chart-card';
import { registerCardPicker } from './ha/register-card';

registerCardPicker();

// Friendly console banner — matches the convention of other HACS cards so users
// can confirm the artifact actually loaded.
const VERSION = '0.1.0';
// eslint-disable-next-line no-console
console.info(
  `%c BULLET-CHART-CARD %c v${VERSION} `,
  'color:#fff;background:#03a9f4;font-weight:700;padding:2px 6px;border-radius:3px 0 0 3px;',
  'color:#03a9f4;background:#222;padding:2px 6px;border-radius:0 3px 3px 0;',
);
