// Panel: fleet health at a glance. Payload: {checked_at, counts:{green,amber,red}, checks:[{name,status,detail}]}
import { h, stat } from './_dom.js';
export const title = 'Fleet health';
export function render(p, el) {
  const c = p.counts || {};
  el.append(h('div', { class: 'stats' }, stat(c.green ?? 0, 'green', 'ok'), stat(c.amber ?? 0, 'amber', 'warn'), stat(c.red ?? 0, 'red', 'bad')));
  const order = { red: 0, amber: 1, green: 2 };
  const ul = h('ul', { class: 'list compact' });
  for (const k of [...(p.checks || [])].sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3)))
    ul.append(h('li', {}, h('div', { class: 'row' }, h('span', { class: `dot h-${k.status}`, title: k.status }),
      h('span', { class: 'item-title' }, k.name), k.detail ? h('span', { class: 'meta' }, k.detail) : null)));
  el.append(ul);
}
