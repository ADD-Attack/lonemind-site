import { h, when } from './_dom.js';
export const title = 'Board';
export function render(p, el) {
  const S = { seat: '', mention: '', owner: false };
  const root = h('div'); el.append(root);
  const seatNames = Object.keys(p.seats).sort(), mentNames = Object.keys(p.mentions).sort();
  const draw = () => {
    const sel = (label, key, first, names, fmt) => {
      const s = h('select', { 'aria-label': label }, h('option', { value: '' }, first), ...names.map((n) => h('option', { value: n }, fmt(n))));
      s.value = S[key]; s.addEventListener('change', () => { S[key] = s.value; draw(); }); return s;
    };
    const cb = h('input', { type: 'checkbox', id: 'f-owner' }); cb.checked = S.owner; cb.addEventListener('change', () => { S.owner = cb.checked; draw(); });
    const rows = p.lines.filter((l) => (!S.seat || l.seat === S.seat) && (!S.mention || (l.mentions || []).includes(S.mention)) && (!S.owner || l.needs_owner)).reverse();
    const total = S.owner ? (!S.seat && !S.mention ? p.needs_owner_total : null) : S.mention ? p.mentions[S.mention] : S.seat ? p.seats[S.seat] : p.count;
    const list = h('div', { class: 'blist' }, ...rows.map((l) => h('div', { class: 'brow' + (l.needs_owner ? ' owner' : '') }, h('span', { class: 'meta' }, `${when(l.ts)} · ${l.seat} · ${l.state}${l.needs_owner ? ' · needs partner' : ''}`), h('div', {}, l.item), h('div', { class: 'muted' }, l.note))));
    root.replaceChildren(h('div', { class: 'uh-ctl' }, sel('Seat', 'seat', 'All seats', seatNames, (n) => `${n} (${p.seats[n]})`), sel('Mention', 'mention', 'Anyone', mentNames, (n) => `@${n} (${p.mentions[n]})`),
      h('label', { class: 'toggle' }, cb, ' Needs partner only')),
      h('p', { class: 'meta' }, `${rows.length} line${rows.length === 1 ? '' : 's'} shown${total != null ? ` of ${total} matching on the full board (${p.count} lines)` : ` (board has ${p.count} lines)`}. Older lines than the newest 1,500 appear when they are needs-partner lines or among the newest 25 for their seat or mention; the rest stay local (single-row size cap).`), list);
  };
  draw();
}
