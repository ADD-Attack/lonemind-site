import { h, table, asof } from './_kit.js';
export const title = 'Memory';
export function render(p, el) {
  el.append(h('p', { class: 'meta' }, `Cap ${p.cap} chars; bootstrap max ${p.bootstrap_max_chars}. Owner-correction candidates ${p.owner_corrections.candidates}, repeats ${p.owner_corrections.repeat_count}.`));
  el.append(table([{ t: 'Seat', k: 'seat' }, { t: 'Memory chars', k: 'memory_chars', n: 1 }, { t: 'Over cap', f: (r) => (r.over_cap ? 'YES' : '') }, { t: 'Truncated', f: (r) => (r.truncated_at_load ? 'YES' : '') }, { t: 'Index', f: (r) => (r.index_healthy ? 'healthy' : 'UNHEALTHY') },
    { t: 'Lessons', f: (r) => (r.lessons ? `${r.lessons.entries} (${r.lessons.pct}% cited)` : '') }, { t: 'AGENTS.md', f: (r) => (r.agents_md ? `${r.agents_md.chars}/${r.agents_md.limit}` : '') }, { t: 'USER.md', f: (r) => (r.user_md ? `${r.user_md.chars}/${r.user_md.limit}` : '') }], p.seats));
  (p.notes || []).forEach((n) => el.append(h('p', { class: 'meta' }, n)));
  el.append(asof(p.generated));
}
