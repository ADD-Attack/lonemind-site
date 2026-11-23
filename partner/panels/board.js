import { h, filterBar, when } from './_kit.js';
export const title = 'Board';
export function render(p, el) {
  const S = { seat: 'all', mention: 'all' };
  const seats = ['all', ...[...new Set(p.lines.map((l) => l.seat))].sort()];
  const root = h('div'); el.append(root);
  const draw = () => {
    const sel = h('select', { 'aria-label': 'Seat' }, ...seats.map((s) => { const o = h('option', { value: s }, s); if (s === S.seat) o.selected = true; return o; }));
    sel.addEventListener('change', () => { S.seat = sel.value; draw(); });
    const rows = p.lines.filter((l) => (S.seat === 'all' || l.seat === S.seat) && (S.mention === 'all' || (l.mentions || []).includes(S.mention)));
    const list = h('div', { class: 'blist' }, ...rows.slice().reverse().map((l) => h('div', { class: 'brow' }, h('span', { class: 'meta' }, `${when(l.ts)} · ${l.seat} · ${l.state}`), h('div', {}, l.item), h('div', { class: 'muted' }, l.note))));
    root.replaceChildren(h('div', { class: 'uh-ctl' }, sel, filterBar([['all', 'All'], ['owner', '@owner'], ['producer', '@producer']], S.mention, (v) => { S.mention = v; draw(); })),
      h('p', { class: 'meta' }, `${rows.length} of last ${p.shown} posts (${p.count} on board)`), list);
  };
  draw();
}
