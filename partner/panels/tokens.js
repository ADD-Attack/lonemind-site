import { h, stat, table, asof } from './_kit.js';
export const title = 'Token spend (24 h)';
export function render(p, el) {
  el.append(h('div', { class: 'stats' }, stat(`${p.total.eff_M} M`, 'effective tokens'), stat(p.total.calls, 'calls'), stat(p.total.sessions, 'sessions'),
    stat(`${p.rates.eff_per_h_M} M/h`, `rate (baseline ${p.baseline_eff_per_h_M})`), stat(p.cache_read_per_call, `cache read / call (target ${p.cache_read_target})`),
    stat(p.async_noop_per_day, `no-op async wakes / day (target ${p.async_noop_target_per_day})`)));
  el.append(h('p', { class: 'sub' }, 'By kind'), table([{ t: 'Kind', k: 'kind' }, { t: 'Group', k: 'group' }, { t: 'Eff. M', k: 'eff_M', n: 1 }, { t: 'Share %', k: 'share', n: 1 }, { t: 'Sessions', k: 'sessions', n: 1 }, { t: 'Calls', k: 'calls', n: 1 }], p.kinds));
  el.append(h('p', { class: 'sub' }, 'By seat'), table([{ t: 'Seat', k: 'seat' }, { t: 'Eff. M', k: 'eff_M', n: 1 }, { t: 'Share %', k: 'share', n: 1 }, { t: 'Calls', k: 'calls', n: 1 }, { t: 'Cache read / call', k: 'cr_per_call', n: 1 }], p.seats));
  el.append(asof(p.generated));
}
