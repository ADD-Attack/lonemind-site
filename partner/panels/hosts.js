import { h, bar, asof } from './_kit.js';
export const title = 'Hosts: CPU, RAM, GPU by hour';
export function render(p, el) {
  let day = p.today;
  const days = [...p.days].sort();
  const root = h('div'); el.append(root, asof(p.now));
  const draw = () => {
    const idx = days.indexOf(day);
    const prev = h('button', { type: 'button' }, '‹'), next = h('button', { type: 'button' }, '›');
    prev.disabled = idx <= 0; next.disabled = idx >= days.length - 1;
    prev.addEventListener('click', () => { day = days[idx - 1]; draw(); }); next.addEventListener('click', () => { day = days[idx + 1]; draw(); });
    const kids = [h('div', { class: 'uh-nav' }, prev, h('strong', {}, day), next)];
    for (const [host, l] of Object.entries(p.latest || {})) kids.push(h('p', { class: 'meta' }, `${host} now: CPU ${l.cpu}% · RAM ${l.ram}% · GPU ${l.gpu}%`));
    for (const [host, hrs] of Object.entries(p.by_day[day] || {})) {
      kids.push(h('p', { class: 'sub' }, host));
      for (const m of ['cpu', 'ram', 'gpu']) {
        const row = h('div', { class: 'hh' }, h('span', { class: 'meter-l' }, m.toUpperCase()));
        hrs.forEach((x) => { const c = h('span', { class: 'hhc', title: `${String(x.hour).padStart(2, '0')}:00 avg ${x[m].avg}% peak ${x[m].peak}%${x.missed ? ` (${x.missed} missed)` : ''}` }); const f = h('i'); f.style.height = `${x[m].avg}%`; c.append(f); row.append(c); });
        kids.push(row);
      }
    }
    root.replaceChildren(...kids);
  };
  draw();
}
