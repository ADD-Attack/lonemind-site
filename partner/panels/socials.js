import { h, table, asof } from './_kit.js';
export const title = 'Socials';
export function render(p, el) {
  el.append(table([{ t: 'Platform', k: 'platform' }, { t: 'Handle', k: 'handle' }, { t: 'Status', k: 'status' }, { t: 'Created', k: 'created' }, { t: 'By', k: 'by' }, { t: 'Custody', k: 'custody' }], p.accounts));
  el.append(asof(p.updated));
}
