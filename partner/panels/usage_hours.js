// Panel: token usage, hour by hour (parity with the local inbox /usage/ viewer).
// Payload: {as_of, tz, profiles[{id,label}], fields[...], days[{date,complete,hours[{hour,start,rows:[[seat,task,profile,in,out,cr,cw,rec]]}]|null}]}
import { h, ago } from './_dom.js';
export const title = 'Tokens, hour by hour';
const COL = ['#6aa5ff', '#f0a35e', '#6fcf97', '#c792ea', '#f2d36b', '#5fd0d0'], OTHER = '#7d8590';
const nf = new Intl.NumberFormat('en-US');
const compact = (n) => n >= 1e9 ? (n / 1e9).toFixed(2) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : String(n);
const metricName = (m) => (m === 'output' ? 'output tokens' : 'all tokens');
const val = (r, m) => m === 'output' ? r[4] : r[3] + r[4] + r[5] + r[6];
const dayName = (d) => new Date(d + 'T12:00:00').toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
const hh = (iso) => iso.slice(11, 13).replace(/^0(?=\d)/, '');

export function render(p, el) {
  const days = (p.days || []).filter((d) => d.hours);
  if (!days.length) { el.append(h('p', { class: 'muted' }, 'No hourly data published yet.')); return; }
  const byDate = Object.fromEntries(days.map((d) => [d.date, d]));
  const dates = days.map((d) => d.date).sort();
  const today = dates[dates.length - 1];
  const S = { prof: 'all', metric: 'total', hby: 'seat', gran: 'hour', date: today, hour: null };
  const root = h('div', { class: 'uh' });
  el.append(root);
  const seg = (label, key, opts) => {
    const g = h('div', { class: 'sgrp', role: 'group', 'aria-label': label });
    for (const [v, t] of opts) {
      const b = h('button', { type: 'button', 'aria-pressed': String(S[key] === v), 'data-k': key, 'data-v': v }, t);
      b.addEventListener('click', () => { S[key] = v; S.hour = null; draw(); });
      g.append(b);
    }
    return g;
  };
  function draw() {
    const keep = (r) => S.prof === 'all' || r[2] === S.prof;
    const controls = h('div', { class: 'uh-ctl' },
      seg('Granularity', 'gran', [['hour', 'Hour'], ['day', 'Day']]),
      seg('Group by', 'hby', [['seat', 'By seat'], ['task', 'By task']]),
      seg('Profile', 'prof', [['all', 'All'], ...(p.profiles || []).map((x) => [x.id, x.label])]),
      seg('Metric', 'metric', [['total', 'All tokens'], ['output', 'Output only']]));
    const nav = h('div', { class: 'uh-nav' });
    const idx = dates.indexOf(S.date);
    const prev = h('button', { type: 'button', 'aria-label': 'Previous day' }, '‹'), next = h('button', { type: 'button', 'aria-label': 'Next day' }, '›');
    prev.disabled = idx <= 0; next.disabled = idx >= dates.length - 1;
    prev.addEventListener('click', () => { S.date = dates[idx - 1]; S.hour = null; draw(); });
    next.addEventListener('click', () => { S.date = dates[idx + 1]; S.hour = null; draw(); });
    const di = h('input', { type: 'date', value: S.date, min: dates[0], max: today, 'aria-label': 'Day' });
    di.addEventListener('change', () => { if (byDate[di.value]) { S.date = di.value; S.hour = null; draw(); } });
    if (S.gran === 'hour') nav.append(prev, di, next);
    const keyOf = (r) => S.hby === 'seat' ? r[0] : (r[1] || '__none');
    const kName = (k) => k === '__none' ? 'Unattributed' : k;

    // series: columns are hours of one day, or whole days
    let cols;
    if (S.gran === 'hour') {
      cols = byDate[S.date].hours.map((hr) => ({ label: hh(hr.start), tip: `${dayName(S.date)} ${hh(hr.start)}:00`, rows: hr.rows.filter(keep), hr }));
    } else {
      cols = dates.map((d) => ({ label: d.slice(8), tip: dayName(d), rows: byDate[d].hours.flatMap((x) => x.rows).filter(keep), date: d }));
    }
    const tot = {};
    cols.forEach((c) => c.rows.forEach((r) => { tot[keyOf(r)] = (tot[keyOf(r)] || 0) + val(r, S.metric); }));
    const top = Object.keys(tot).filter((k) => tot[k] > 0).sort((a, b) => tot[b] - tot[a] || (a < b ? -1 : 1)).slice(0, 6);
    const colour = (k) => top.indexOf(k) < 0 ? OTHER : COL[top.indexOf(k)];
    cols.forEach((c) => { c.by = {}; c.t = 0; c.rows.forEach((r) => { const k = top.includes(keyOf(r)) ? keyOf(r) : '__other'; const v = val(r, S.metric); c.by[k] = (c.by[k] || 0) + v; c.t += v; }); });
    const max = Math.max(1, ...cols.map((c) => c.t));
    const chart = h('div', { class: 'uh-chart', style: `--n:${cols.length}` });
    cols.forEach((c, i) => {
      const stk = h('span', { class: 'hstk' });
      [...top, '__other'].filter((k) => c.by[k]).forEach((k) => { const s = h('i'); s.style.height = (c.by[k] / max * 100) + '%'; s.style.background = k === '__other' ? OTHER : colour(k); stk.append(s); });
      const b = h('button', { type: 'button', class: `hcol${c.t ? '' : ' zero'}`, 'aria-expanded': String(S.hour === i),
        title: `${c.tip}: ${c.t ? nf.format(c.t) + ' ' + metricName(S.metric) : 'no usage'}`, 'aria-label': `${c.tip}, ${compact(c.t)} ${metricName(S.metric)}` }, stk,
        h('span', { class: `hlab${i % 3 ? ' minor' : ''}` }, c.label));
      b.addEventListener('click', () => {
        if (S.gran === 'day') { S.date = c.date; S.gran = 'hour'; S.hour = null; } else S.hour = S.hour === i ? null : i;
        draw();
      });
      chart.append(b);
    });
    const legend = h('div', { class: 'uh-legend' }, ...top.map((k) => { const sw = h('span', { class: 'sw' }); sw.style.background = colour(k); return h('span', {}, sw, kName(k)); }),
      Object.keys(tot).some((k) => tot[k] > 0 && !top.includes(k)) ? (() => { const sw = h('span', { class: 'sw' }); sw.style.background = OTHER; return h('span', {}, sw, 'Others'); })() : null,
      top.length ? null : h('span', {}, 'No usage in this view'));

    // Σ hours = day rows check, per day on screen (hours are the only series published; days are their sum)
    const grand = cols.reduce((a, c) => a + c.t, 0);
    const note = h('p', { class: 'meta' }, S.gran === 'hour'
      ? `${dayName(S.date)}${S.date === today ? ' so far' : ''} · ${metricName(S.metric)} · ${S.prof === 'all' ? 'all profiles' : (p.profiles.find((x) => x.id === S.prof) || {}).label} · total ${nf.format(grand)} · click an hour for its table`
      : `Last ${cols.length} days · ${metricName(S.metric)} · total ${nf.format(grand)} · click a day to see its hours`);
    const stamp = h('p', { class: 'meta uh-asof', title: p.as_of }, `Data as of ${new Date(p.as_of).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })} (${ago(p.as_of)}) · hours are ${p.tz}`);

    // Σ hours = day rows, per profile, for the day on screen (same check as the local viewer)
    const chk = h('div', { class: 'uh-chk' });
    const dd = byDate[S.gran === 'hour' ? S.date : today];
    const sums = {};
    dd.hours.forEach((x) => x.rows.forEach((r) => { const a = sums[r[2]] || (sums[r[2]] = [0, 0, 0, 0]); a[0] += r[3]; a[1] += r[4]; a[2] += r[5]; a[3] += r[6]; }));
    Object.keys({ ...sums, ...(dd.day_rows || {}) }).forEach((pid) => {
      const a = sums[pid] || [0, 0, 0, 0], b = (dd.day_rows || {})[pid] || [0, 0, 0, 0];
      const ok = a.every((v, i) => v === b[i]), lab = (p.profiles.find((x) => x.id === pid) || { label: pid }).label;
      const tot = (z) => z.reduce((u, v) => u + v, 0);
      chk.append(h('span', { class: `chip ${ok ? 'ok' : 'flag'}`, role: ok ? null : 'alert' }, ok ? `${lab}: Σ hours = day rows ${nf.format(tot(b))}` : `${lab}: Σ hours ${nf.format(tot(a))} ≠ day rows ${nf.format(tot(b))}`));
    });
    const kids = [controls, nav, note, chk, chart, legend, stamp];
    if (S.gran === 'hour' && S.hour != null && cols[S.hour]) kids.push(hourTable(cols[S.hour]));
    root.replaceChildren(...kids.filter(Boolean));
  }
  function hourTable(c) {
    const seats = {};
    c.rows.forEach((r) => {
      const s = seats[r[0]] || (seats[r[0]] = { rec: 0, out: 0, all: 0, tasks: {} });
      const all = r[3] + r[4] + r[5] + r[6]; s.rec += r[7]; s.out += r[4]; s.all += all;
      const k = (r[1] || '') + '|' + r[2];
      const e = s.tasks[k] || (s.tasks[k] = { task: r[1], prof: r[2], rec: 0, out: 0, all: 0 });
      e.rec += r[7]; e.out += r[4]; e.all += all;
    });
    const label = (id) => (p.profiles.find((x) => x.id === id) || { label: id }).label;
    const tb = h('tbody');
    const order = Object.keys(seats).sort((a, b) => seats[b].all - seats[a].all);
    if (!order.length) tb.append(h('tr', {}, h('td', { colspan: '5', class: 'muted' }, 'No usage recorded in this hour (0 tokens).')));
    order.forEach((k) => {
      const s = seats[k];
      tb.append(h('tr', { class: 'hseat' }, h('td', {}, k), h('td'), h('td', { class: 'n' }, nf.format(s.rec)), h('td', { class: 'n' }, nf.format(s.out)), h('td', { class: 'n' }, nf.format(s.all))));
      Object.values(s.tasks).sort((a, b) => b.all - a.all).forEach((e) =>
        tb.append(h('tr', { class: 'htask' }, h('td', { class: 'tid' }, e.task || 'unattributed'), h('td', {}, label(e.prof)), h('td', { class: 'n' }, nf.format(e.rec)), h('td', { class: 'n' }, nf.format(e.out)), h('td', { class: 'n' }, nf.format(e.all)))));
    });
    const close = h('button', { type: 'button' }, 'Close hour');
    close.addEventListener('click', () => { S.hour = null; draw(); });
    return h('div', { class: 'hpanel' }, h('div', { class: 'hpanel-h' }, h('strong', {}, c.tip), close),
      h('div', { class: 'tbl-wrap' }, h('table', { class: 'grid' },
        h('thead', {}, h('tr', {}, ...['Seat / task', 'Profile', 'Records', 'Output', 'All tokens'].map((t, i) => h('th', { class: i > 1 ? 'n' : '' }, t)))), tb)));
  }
  draw();
}
