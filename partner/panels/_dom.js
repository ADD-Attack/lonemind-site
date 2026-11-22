// Tiny DOM helpers. Everything goes in as textContent: payload text is never parsed as HTML.
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  for (const k of kids.flat()) if (k != null) el.append(k instanceof Node ? k : String(k));
  return el;
}

export function ago(ts) {
  const t = Date.parse(ts);
  if (!t) return '';
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const hr = Math.round(m / 60);
  if (hr < 48) return `${hr} h ago`;
  return `${Math.round(hr / 24)} days ago`;
}

export function when(ts) {
  const t = Date.parse(ts);
  if (!t) return ts || '';
  return new Date(t).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export const stat = (n, label, cls = '') =>
  h('div', { class: `stat ${cls}` }, h('span', { class: 'stat-n' }, n), h('span', { class: 'stat-l' }, label));
