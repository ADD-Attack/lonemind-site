import { h, table, asof, when } from './_kit.js';
export const title = 'Socials';
export function render(p, el) {
  el.append(table([{ t: 'Platform', k: 'platform' }, { t: 'Handle', k: 'handle' }, { t: 'Status', k: 'status' }, { t: 'Created', k: 'created' }, { t: 'By', k: 'by' }, { t: 'Custody', k: 'custody' }], p.accounts));
  // local tab: "Latest on board (N)" disclosure per account
  p.accounts.filter((a) => (a.latest || []).length).forEach((a) => el.append(h('details', {}, h('summary', {}, `${a.platform} ${a.handle}: latest on board (${a.latest.length})`),
    ...a.latest.map((x) => h('div', { class: 'brow' }, h('span', { class: 'meta' }, `${when(x.ts)} · ${x.seat}`), h('div', { class: 'muted' }, x.text))))));
  el.append(asof(p.updated));
}
