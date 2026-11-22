// Panel: open-orders picture. Payload: {count, by_status:{status:n}, orders:[{id,title,seat,status,deadline}]}
import { h, when } from './_dom.js';
export const title = 'Open orders';
const LIVE = ['dispatched', 'open', 'queued', 'blocked', 'blocked-with-owner', 'queued-held'];
export function render(p, el) {
  const bs = p.by_status || {};
  const total = Object.values(bs).reduce((a, b) => a + b, 0) || 1;
  const bar = h('div', { class: 'stackbar', role: 'img',
    'aria-label': Object.entries(bs).map(([k, v]) => `${k} ${v}`).join(', ') });
  for (const [k, v] of Object.entries(bs).sort((a, b) => b[1] - a[1])) {
    const seg = h('span', { class: `seg st-${k}`, title: `${k}: ${v}` });
    seg.style.flexGrow = v / total;
    bar.append(seg);
  }
  const stats = h('div', { class: 'stats' });
  for (const [k, v] of Object.entries(bs).sort((a, b) => b[1] - a[1])) stats.append(h('div', { class: 'stat' }, h('span', { class: 'stat-n' }, String(v)), h('span', { class: 'stat-l' }, h('i', { class: `sw st-${k}` }), k)));
  el.append(bar, stats);
  const live = (p.orders || []).filter((o) => LIVE.includes(o.status));
  const ul = h('ul', { class: 'list compact' });
  for (const o of live.slice(0, 12)) ul.append(h('li', {},
    h('div', { class: 'row' }, h('span', { class: `dot st-${o.status}`, title: o.status }),
      h('span', { class: 'item-title' }, o.title || o.id), h('span', { class: 'meta' }, o.seat || ''),
      o.deadline ? h('span', { class: 'due' }, when(o.deadline)) : null)));
  if (live.length) el.append(h('p', { class: 'sub' }, `In flight (${live.length})`), ul);
}
