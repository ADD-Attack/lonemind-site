// Panel: partner items awaiting your verdict. Payload: {count, items:[{id,title,text,due?}]}
import { h, when } from './_dom.js';
export const title = 'Awaiting your verdict';
export function render(p, el) {
  const items = p.items || [];
  el.append(h('p', { class: 'lede' }, h('strong', {}, String(p.count ?? items.length)), ' items need a word from you'));
  const ul = h('ul', { class: 'list' });
  for (const it of items) {
    const li = h('li', {},
      h('div', { class: 'row' }, h('span', { class: 'tag' }, it.id), h('span', { class: 'item-title' }, it.title),
        it.due ? h('span', { class: 'due' }, `due ${when(it.due)}`) : null));
    if (it.text) li.append(h('details', {}, h('summary', {}, 'details'), h('p', {}, it.text)));
    ul.append(li);
  }
  el.append(ul);
}
