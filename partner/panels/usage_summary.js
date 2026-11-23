// Panel: usage summary (parity with the local /usage/ page): window toggle, Pools, By seat, By task, Day history, Reconciliation, collector runs.
// Payload rows: [seat, task, profile, input, output, cache_read, cache_write, sessions]. No session ids or transcript paths exist in the data.
import { h, when } from './_dom.js';
import { table } from './_kit.js';
export const title = 'Usage summary';
const nf = new Intl.NumberFormat('en-US');
const compact = (n) => n >= 1e9 ? (n / 1e9).toFixed(2) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : String(n);
const val = (r, m) => m === 'output' ? r[4] : r[3] + r[4] + r[5] + r[6];
const dayName = (d) => new Date(d + 'T12:00:00').toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
export function render(p, el) {
  const S = { win: 'today', prof: 'all', metric: 'total', day: null };
  const dates = (p.days || []).map((d) => d.date).sort();
  const root = h('div', { class: 'uh' }); el.append(root);
  const seg = (label, key, opts) => {
    const g = h('div', { class: 'sgrp', role: 'group', 'aria-label': label });
    for (const [v, t] of opts) { const b = h('button', { type: 'button', 'aria-pressed': String(S[key] === v) }, t); b.addEventListener('click', () => { S[key] = v; draw(); }); g.append(b); }
    return g;
  };
  const group = (rows, keyOf) => {
    const g = {};
    for (const r of rows) {
      if (S.prof !== 'all' && r[2] !== S.prof) continue;
      const k = keyOf(r); const e = g[k] || (g[k] = { key: k, t: 0, n: 0, by: {}, seats: new Set() });
      const v = val(r, S.metric); e.t += v; e.n += r[7]; e.by[r[2]] = (e.by[r[2]] || 0) + v; e.seats.add(r[0]);
    }
    return Object.values(g).filter((e) => e.t > 0 || e.n > 0).sort((a, b) => b.t - a.t);
  };
  const draw = () => {
    const day = S.win === 'day' ? p.days.find((d) => d.date === S.day) : null;
    const rows = S.win === 'day' ? (day ? day.rows : []) : p.scopes[S.win];
    const winName = S.win === 'today' ? 'today' : S.win === 'week' ? 'this week' : `on ${dayName(S.day)}`;
    const mn = S.metric === 'output' ? 'output tokens' : 'tokens';
    const seats = group(rows, (r) => r[0]), tasks = group(rows, (r) => r[1] || '__none');
    const grand = seats.reduce((a, e) => a + e.t, 0), tgrand = tasks.reduce((a, e) => a + e.t, 0);
    const ctl = h('div', { class: 'uh-ctl' }, seg('Time window', 'win', [['today', 'Today'], ['week', 'This week']]),
      seg('Profile', 'prof', [['all', 'All'], ...p.profiles.map((x) => [x.id, x.label])]), seg('Measure', 'metric', [['total', 'All tokens'], ['output', 'Output only']]));
    // Day history
    const dayBar = h('div', { class: 'uh-nav' });
    const i = dates.indexOf(S.day);
    const pv = h('button', { type: 'button', 'aria-label': 'Previous day' }, '‹'), nx = h('button', { type: 'button', 'aria-label': 'Next day' }, '›');
    pv.disabled = i <= 0; nx.disabled = i < 0 || i >= dates.length - 1;
    pv.addEventListener('click', () => { S.win = 'day'; S.day = dates[Math.max(0, (i < 0 ? dates.length : i) - 1)]; draw(); });
    nx.addEventListener('click', () => { S.win = 'day'; S.day = dates[Math.min(dates.length - 1, i + 1)]; draw(); });
    const di = h('input', { type: 'date', 'aria-label': 'Pick a day' }); di.value = S.day || ''; di.min = dates[0]; di.max = dates[dates.length - 1];
    di.addEventListener('change', () => { if (dates.includes(di.value)) { S.win = 'day'; S.day = di.value; draw(); } });
    dayBar.append(pv, di, nx, h('span', { class: 'meta' }, S.win === 'day' ? `${dayName(S.day)}${day && !day.complete ? ' (so far)' : ''}` : 'Pick a day to leave the Today / This week window'));
    // Pools
    const cards = p.profiles.filter((x) => S.prof === 'all' || x.id === S.prof).map((x) => {
      const mine = rows.filter((r) => r[2] === x.id), tot = mine.reduce((a, r) => a + val(r, S.metric), 0), n = mine.reduce((a, r) => a + r[7], 0);
      return h('div', { class: 'stat' }, h('span', { class: 'stat-n' }, compact(tot)), h('span', { class: 'stat-l' }, `${x.label} · ${mn} ${winName} · ${n} session${n === 1 ? '' : 's'}${x.pool_limit ? '' : ' · no pool % in the data'}`));
    });
    const pc = p.profiles.filter((x) => S.prof === 'all' || x.id === S.prof);
    const seatTbl = table([{ t: 'Seat', f: (e) => e.key }, ...pc.map((x) => ({ t: x.label.replace(' subscription', ''), n: 1, f: (e) => e.by[x.id] ? compact(e.by[x.id]) : '—' })),
      { t: 'Total', n: 1, f: (e) => nf.format(e.t) }, { t: 'Sessions', n: 1, f: (e) => e.n }], seats);
    const taskTbl = table([{ t: 'Task', f: (e) => e.key === '__none' ? 'Unattributed (no ticket in the session record)' : (p.task_titles[e.key] && p.task_titles[e.key] !== e.key ? `${p.task_titles[e.key]} · ${e.key}` : e.key) },
      { t: 'Seats', f: (e) => [...e.seats].join(', ') }, { t: 'Total', n: 1, f: (e) => nf.format(e.t) }, { t: 'Sessions', n: 1, f: (e) => e.n }], tasks);
    // Day history table: every day's total per profile
    const dayTbl = table([{ t: 'Day', f: (d) => dayName(d.date) + (d.complete ? '' : ' (so far)') }, ...p.profiles.map((x) => ({ t: x.label.replace(' subscription', ''), n: 1, f: (d) => nf.format(d.rows.filter((r) => r[2] === x.id).reduce((a, r) => a + val(r, S.metric), 0)) })),
      { t: 'All', n: 1, f: (d) => nf.format(d.rows.reduce((a, r) => a + val(r, S.metric), 0)) }], p.days.slice());
    // Reconciliation
    const rec = h('div', { class: 'stats' },
      h('div', { class: 'stat' }, h('span', { class: 'stat-n' }, seats.length ? (grand === tgrand ? 'OK' : 'DIFF') : '—'), h('span', { class: 'stat-l' }, `Seats ${nf.format(grand)} ${grand === tgrand ? '=' : '≠'} tasks ${nf.format(tgrand)} ${mn} ${winName}`)),
      ...(p.reconcile.per_profile || []).map((x) => h('div', { class: 'stat' }, h('span', { class: 'stat-n' }, x.ok === false || Object.values(x.diff || {}).some(Boolean) ? 'DIFF' : 'OK'), h('span', { class: 'stat-l' }, `${x.profile}: collector total equals the record sum${x.ok === false ? ' (it does not)' : ''}`))));
    const runs = table([{ t: 'Collector run', f: (r) => when(r.ts) }, { t: 'Duration', n: 1, f: (r) => `${(r.duration_ms / 1000).toFixed(1)} s` }, { t: 'Files', n: 1, f: (r) => nf.format(r.files_read) },
      { t: 'Rows', n: 1, f: (r) => nf.format(r.rows_read) }, { t: 'OK', f: (r) => r.ok ? 'yes' : (r.error || 'no') }], p.collector_runs.slice(0, 20));
    root.replaceChildren(ctl, dayBar, h('p', { class: 'meta' }, `Data as of ${when(p.as_of)}`),
      h('h3', {}, 'Pools'), h('div', { class: 'stats' }, ...cards),
      h('h3', {}, `By seat: ${nf.format(grand)} ${mn} ${winName}`), seatTbl,
      h('h3', {}, `By task: ${tasks.length} tasks ${winName}`), taskTbl,
      h('h3', {}, 'Day history (all 32 days)'), dayTbl,
      h('h3', {}, 'Reconciliation'), rec,
      h('h3', {}, 'Collector runs (latest 20)'), runs,
      h('p', { class: 'meta' }, 'Session-level rows and "Copy session ids" stay local: they carry session ids and transcript paths.'));
  };
  draw();
}
