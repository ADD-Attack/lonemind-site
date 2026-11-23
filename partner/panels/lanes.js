import { h, table, stat, filterBar, nf } from './_kit.js';
export const title = 'Lanes';
export function render(p, el) {
  let open = null, detail = null;
  const root = h('div'); el.append(root);
  const od = p.owner_turn_defects, db = p.deadline_band;
  const kv = (o) => h('dl', { class: 'kv' }, ...Object.entries(o || {}).flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, typeof v === 'object' ? JSON.stringify(v) : String(v))]));
  const sect = (t, ...k) => h('section', { class: 'dsec' }, h('h3', {}, t), ...k);
  const drawDetail = () => {
    const d = (p.details || {})[detail];
    const back = h('button', { type: 'button' }, '← All lanes'); back.addEventListener('click', () => { detail = null; draw(); });
    if (!d) { root.replaceChildren(back, h('p', { class: 'muted' }, `No detail published for ${detail}.`)); return; }
    const nfd = (t) => h('p', { class: 'muted' }, `${t}: not found`);
    const art = (a) => h('div', { class: 'dart' }, h('b', {}, a.rel || '(unnamed)'), h('span', { class: 'meta' }, ` ${a.kind === 'dir' ? 'folder' : (a.size != null ? nf.format(a.size) + ' bytes' : '')} · from ${a.origin || '?'} · file stays local`));
    const grades = [...(d.grades || []).map(kv), ...(Object.keys(d.ledger_grade || {}).length ? [kv(d.ledger_grade)] : []), ...(d.grade_records || []).map((r) => r.missing ? h('p', { class: 'muted' }, `Grade record ${r.path || ''}: not found`) : art(r))];
    root.replaceChildren(back, h('h2', {}, d.title || d.id), h('p', { class: 'meta' }, `${d.id} · seat ${d.seat || '?'} · status ${d.status}`),
      sect('What is being asked', Object.keys(d.ask || {}).length ? kv(d.ask) : nfd('What is being asked')),
      sect('Artifact', ...((d.artifacts || []).length ? d.artifacts.map(art) : [nfd('Artifact')])),
      sect('Grade / panel summary', ...(grades.length ? grades : [nfd('Grade / panel summary')])),
      ...((d.board || []).length ? [sect('Board record', ...d.board.map((b) => h('div', { class: 'brow' }, h('span', { class: 'meta' }, `${(b.ts || '').slice(0, 16).replace('T', ' ')} ${b.seat} ${b.state}`), h('div', {}, b.note))))] : []),
      ...((d.not_found || []).length ? [h('p', { class: 'muted' }, `Not found in the records: ${d.not_found.join(', ')}.`)] : []),
      h('p', { class: 'meta' }, 'Read-only: the verdict form stays local (it is a write).'));
  };
  const draw = () => {
    if (detail) return drawDetail();
    const kids = [];
    if (od) kids.push(h('div', { class: 'stats' }, stat(od.turns_flagged, 'owner turns flagged today'), stat(od.over_3min, 'over 3 min'), stat(od.over_5_tools, 'over 5 tools'), stat(od.late_replies, 'late replies')));
    if (db && db.available) kids.push(h('p', { class: 'meta' }, `Deadline band: ${db.band} (${db.overall.on_time}/${db.overall.total} on time)`));
    kids.push(table([{ t: 'Lane', k: 'label' }, ...['needs_owner', 'waiting_verify', 'overdue', 'working', 'unscheduled', 'finished_miss'].map((c) => ({ t: c.replace('_', ' '), n: 1, f: (l) => l.counts[c] ?? 0 }))], p.lanes));
    kids.push(filterBar(p.lanes.map((l) => [l.id, l.label]), open, (v) => { open = open === v ? null : v; draw(); }));
    const l = p.lanes.find((x) => x.id === open);
    if (l) kids.push(table([{ t: 'Order', f: (o) => { const b = h('button', { type: 'button', class: 'linkish' }, o.id); b.addEventListener('click', () => { detail = o.id; draw(); }); return b; } }, { t: 'Title', k: 'title' }, { t: 'Status', k: 'status' }, { t: 'Seat', k: 'seat' }, { t: 'Bucket', k: 'bucket' }], l.orders));
    root.replaceChildren(...kids);
  };
  draw();
}
