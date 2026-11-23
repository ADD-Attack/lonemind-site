// Read-only: the local inbox's decision buttons are writes and are not hosted.
import { h, when } from './_kit.js';
export const title = 'Decision queue (read only)';
export function render(p, el) {
  if (!p.items.length) el.append(h('p', { class: 'muted' }, 'Nothing waiting on you.'));
  p.items.forEach((i) => el.append(h('div', { class: 'brow' }, h('strong', {}, `${i.id} · ${i.title}`), h('p', {}, i.ask),
    h('p', { class: 'meta' }, `${i.seat} · ${i.kind}${i.deadline ? ' · deadline ' + when(i.deadline) : ''}${i.default_if_unanswered ? ' · if unanswered: ' + i.default_if_unanswered : ''}`))));
  el.append(h('p', { class: 'meta' }, 'To answer an item, use the local inbox or Discord; answering is not available on this page.'));
}
