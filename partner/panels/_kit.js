// Shared helpers for the parity panels. All text goes in via textContent.
import { h, when, stat } from './_dom.js';
export { h, when, stat };
export const nf = new Intl.NumberFormat('en-US');
export function table(cols, rows, cls = '') {
  const tb = h('tbody');
  rows.forEach((r) => tb.append(h('tr', {}, ...cols.map((c) => h('td', { class: c.n ? 'n' : '' }, c.f ? c.f(r) : r[c.k] ?? '')))));
  if (!rows.length) tb.append(h('tr', {}, h('td', { colspan: String(cols.length), class: 'muted' }, 'Nothing here.')));
  return h('div', { class: 'tbl-wrap' }, h('table', { class: `grid ${cls}` },
    h('thead', {}, h('tr', {}, ...cols.map((c) => h('th', { class: c.n ? 'n' : '' }, c.t)))), tb));
}
export function filterBar(opts, cur, on) {
  const g = h('div', { class: 'sgrp' });
  opts.forEach(([v, t]) => { const b = h('button', { type: 'button', 'aria-pressed': String(cur === v) }, t); b.addEventListener('click', () => on(v)); g.append(b); });
  return g;
}
export const bar = (pct, cls = '') => { const s = h('span', { class: 'fill' }); s.style.width = `${Math.max(0, Math.min(100, pct || 0))}%`; return h('span', { class: `meter inline ${cls}` }, s); };
export const asof = (t) => h('p', { class: 'meta' }, t ? `Collected ${when(t)}` : '');
