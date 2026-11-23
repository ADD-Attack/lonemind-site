import { h, table, filterBar, when } from './_kit.js';
export const title = 'Work: orders and tickets';
export function render(p, el) {
  let view = 'orders';
  const root = h('div'); el.append(root);
  const dl = (d) => (d ? when(d) : '');
  const draw = () => {
    const bar = filterBar([['orders', `Orders (${p.orders.length})`], ['inbox', `Tickets inbox (${p.tickets.inbox.length})`], ['done', `Tickets done (${p.tickets.done.length})`], ['items', 'Partner items']], view, (v) => { view = v; draw(); });
    let body;
    if (view === 'orders') body = table([{ t: 'Order', k: 'id' }, { t: 'Title', k: 'title' }, { t: 'Status', k: 'status' }, { t: 'Seat', k: 'seat' }, { t: 'Deadline', f: (r) => dl(r.deadline) }, { t: 'Flags', f: (r) => [r.overdue && 'overdue', r.owner_blocked && 'owner-blocked'].filter(Boolean).join(', ') }], p.orders);
    else if (view === 'items') body = h('pre', { class: 'md' }, p.owner_items.markdown || '');
    else body = table([{ t: 'Ticket', k: 'id' }, { t: 'Subject', k: 'subject' }, { t: 'From', k: 'from' }, { t: 'To', k: 'to' }, { t: 'Status', k: 'status' }, { t: 'Created', f: (r) => dl(r.created) }], p.tickets[view]);
    root.replaceChildren(bar, body);
  };
  draw();
}
