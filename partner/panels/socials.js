import { h, table, asof, when } from './_kit.js';
export const title = 'Socials';
const OK = /^https:\/\/(x\.com|www\.instagram\.com|www\.tiktok\.com|www\.reddit\.com|www\.twitch\.tv|github\.com)\//;
// Public profile links only: https, fixed host allowlist, opens in a new tab without opener or referrer.
const handle = (a) => (OK.test(a.url || '') ? h('a', { href: a.url, target: '_blank', rel: 'noopener noreferrer' }, a.handle) : a.handle);
export function render(p, el) {
  el.append(table([{ t: 'Platform', k: 'platform' }, { t: 'Handle', f: handle }, { t: 'Status', k: 'status' }, { t: 'Created', k: 'created' }, { t: 'By', k: 'by' }, { t: 'Custody', k: 'custody' }, { t: 'Vault item', f: (a) => `${a.vault || ''}${a.vault_note || ''}` }], p.accounts));
  // local tab: "Latest on board (N)" disclosure per account
  p.accounts.filter((a) => (a.latest || []).length).forEach((a) => el.append(h('details', {}, h('summary', {}, `${a.platform} ${a.handle}: latest on board (${a.latest.length})`),
    ...a.latest.map((x) => h('div', { class: 'brow' }, h('span', { class: 'meta' }, `${when(x.ts)} · ${x.seat}`), h('div', { class: 'muted' }, x.text))))));
  el.append(asof(p.updated));
}
