import { h, table, stat, filterBar } from './_kit.js';
export const title = 'Lanes';
export function render(p, el) {
  let open = null;
  const root = h('div'); el.append(root);
  const od = p.owner_turn_defects, db = p.deadline_band;
  const draw = () => {
    const kids = [];
    if (od) kids.push(h('div', { class: 'stats' }, stat(od.turns_flagged, 'owner turns flagged today'), stat(od.over_3min, 'over 3 min'), stat(od.over_5_tools, 'over 5 tools'), stat(od.late_replies, 'late replies')));
    if (db && db.available) kids.push(h('p', { class: 'meta' }, `Deadline band: ${db.band} (${db.overall.on_time}/${db.overall.total} on time)`));
    kids.push(table([{ t: 'Lane', k: 'label' }, ...['needs_owner', 'waiting_verify', 'overdue', 'working', 'unscheduled', 'finished_miss'].map((c) => ({ t: c.replace('_', ' '), n: 1, f: (l) => l.counts[c] ?? 0 }))], p.lanes));
    kids.push(filterBar(p.lanes.map((l) => [l.id, l.label]), open, (v) => { open = open === v ? null : v; draw(); }));
    const l = p.lanes.find((x) => x.id === open);
    if (l) kids.push(table([{ t: 'Order', k: 'id' }, { t: 'Title', k: 'title' }, { t: 'Status', k: 'status' }, { t: 'Seat', k: 'seat' }, { t: 'Bucket', k: 'bucket' }], l.orders));
    root.replaceChildren(...kids);
  };
  draw();
}
