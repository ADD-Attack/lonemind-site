// Panel: latest board. Payload: {posts:[{ts,seat,subject,category,text}]}
import { h, when } from './_dom.js';
export const title = 'Latest on the board';
export function render(p, el) {
  const ul = h('ul', { class: 'list' });
  for (const b of (p.posts || []).slice(0, 10)) {
    const li = h('li', {}, h('div', { class: 'row' }, h('span', { class: 'tag' }, b.seat), h('span', { class: 'item-title' }, b.subject),
      h('span', { class: 'due' }, when(b.ts))));
    if (b.text) li.append(h('details', {}, h('summary', {}, b.category || 'post'), h('p', {}, b.text)));
    ul.append(li);
  }
  el.append(ul);
}
