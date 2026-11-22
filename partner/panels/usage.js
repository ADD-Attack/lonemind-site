// Panel: usage numbers. Payload: {at, target_pct, hosts:{name:{cpu,cpu_1h_avg,gpu,gpu_1h_avg,ram,ram_1h_avg}}, under_target:[]}
import { h } from './_dom.js';
export const title = 'Usage';
const meter = (label, now, avg, target) => {
  const m = h('div', { class: 'meter', role: 'meter', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(now ?? 0),
    'aria-label': `${label} ${now}% now, ${avg}% 1h average` });
  const fill = h('span', { class: 'fill' }); fill.style.width = `${Math.min(100, now ?? 0)}%`;
  const tick = h('span', { class: 'target' }); tick.style.left = `${target}%`;
  m.append(fill, tick);
  return h('div', { class: 'meter-row' }, h('span', { class: 'meter-l' }, label), m,
    h('span', { class: 'meter-n' }, `${Math.round(now ?? 0)}%`), h('span', { class: 'meta' }, `1h ${Math.round(avg ?? 0)}%`));
};
export function render(p, el) {
  const t = p.target_pct ?? 60;
  for (const [name, s] of Object.entries(p.hosts || {})) {
    el.append(h('div', { class: 'host' }, h('p', { class: 'sub' }, name),
      meter('CPU', s.cpu, s.cpu_1h_avg, t), meter('GPU', s.gpu, s.gpu_1h_avg, t), meter('RAM', s.ram, s.ram_1h_avg, t)));
  }
  el.append(h('p', { class: 'meta' }, `Target line at ${t}%.`, (p.under_target || []).length ? ` Under target: ${p.under_target.join(', ')}.` : ''));
}
