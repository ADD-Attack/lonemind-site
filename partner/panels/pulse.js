import { h, table, stat, when } from './_kit.js';
export const title = 'Pulse';
export function render(p, el) {
  const s = p.sessions, ho = p.host;
  el.append(h('div', { class: 'stats' }, stat(s.rows.length, 'sessions'), stat(s.flagged, 'flagged', s.flagged ? 'warn' : 'ok'), stat(ho.load.join(' / '), `load (${ho.ncpu} cpu)`), stat(ho.up_since, 'up since'), stat(p.canary.ok ? 'ok' : 'FAIL', 'tailnet canary', p.canary.ok ? 'ok' : 'bad')));
  el.append(h('p', { class: 'meta' }, `Config defaults: seats ${s.defaults ? s.defaults.agent : '?'}, subagents ${s.defaults ? s.defaults.subagent : '?'} · ${ho.boots_today.length} boot${ho.boots_today.length === 1 ? '' : 's'} today${ho.boots_today.length ? ' (' + ho.boots_today.map((b) => (typeof b === 'object' ? (b.at || b.ts || JSON.stringify(b)) : b)).join(', ') + ')' : ''}`));
  const dl = (s.delivery || []).filter((x) => !x.posted_after);
  el.append(h('p', { class: 'sub' }, `Delivery freshness: ${dl.filter((x) => x.stale).length} unposted (finished Toolsmith workers with no Toolsmith board post after their end; flagged after 10 min)`),
    table([{ t: 'Worker', f: (x) => (x.stale ? '⚠ ' : '') + (x.label || x.key) }, { t: 'Status', k: 'status' }, { t: 'Finished s ago', k: 'since_s', n: 1 }], dl));
  el.append(h('p', { class: 'sub' }, 'Probes'), table([{ t: 'Probe', k: 'name' }, { t: 'HTTP', k: 'http' }, { t: 'ms', k: 'ms', n: 1 }, { t: 'OK', f: (r) => (r.ok ? 'yes' : 'NO') }], p.probes));
  el.append(h('p', { class: 'sub' }, 'Disks'), table([{ t: 'Mount', k: 'mount' }, { t: 'Free GB', k: 'free_gb', n: 1 }, { t: 'Used %', k: 'used_pct', n: 1 }], ho.disks));
  el.append(h('p', { class: 'sub' }, 'Top processes'), table([{ t: 'PID', k: 'pid' }, { t: 'CPU %', k: 'cpu', n: 1 }, { t: 'Mem %', k: 'mem', n: 1 }, { t: 'Command', k: 'cmd' }], ho.procs));
  el.append(h('p', { class: 'sub' }, 'Sessions'), table([{ t: 'Label', k: 'label' }, { t: 'Agent', k: 'agent' }, { t: 'Model', k: 'actual' }, { t: 'Flags', f: (r) => (r.flags || []).join(', ') }, { t: 'Age s', k: 'age_s', n: 1 }], s.rows));
  el.append(h('p', { class: 'sub' }, 'Defect register'), table([{ t: 'Id', k: 'id' }, { t: 'Title', k: 'title' }, { t: 'Status', k: 'status' }, { t: 'Note', k: 'status_line' }, { t: 'Updated', f: (r) => when(new Date(r.mtime * 1000).toISOString()) }], p.register));
}
