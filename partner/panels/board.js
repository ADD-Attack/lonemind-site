import { h, when } from './_dom.js';
export const title = 'Board';
async function unpack(c) {
  const bin = Uint8Array.from(atob(c.data), (ch) => ch.charCodeAt(0));
  const text = await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  return JSON.parse(text).map((r) => ({ ts: r[0], seat: r[1], item: r[2], state: r[3], note: r[4], mentions: r[5], needs_owner: !!r[6] }));
}
export function render(p, el, ctx) {
  const S = { seat: '', mention: '', owner: false, limit: 500 };
  let full = !(p.chunks || []).length, err = '';
  const root = h('div'); el.append(root);
  const seatNames = Object.keys(p.seats).sort(), mentNames = Object.keys(p.mentions).sort();
  const draw = () => {
    const sel = (label, key, first, names, fmt) => {
      const s = h('select', { 'aria-label': label }, h('option', { value: '' }, first), ...names.map((n) => h('option', { value: n }, fmt(n))));
      s.value = S[key]; s.addEventListener('change', () => { S[key] = s.value; S.limit = 500; draw(); }); return s;
    };
    const cb = h('input', { type: 'checkbox', id: 'f-owner' }); cb.checked = S.owner; cb.addEventListener('change', () => { S.owner = cb.checked; S.limit = 500; draw(); });
    const rows = p.lines.filter((l) => (!S.seat || l.seat === S.seat) && (!S.mention || (l.mentions || []).includes(S.mention)) && (!S.owner || l.needs_owner)).reverse();
    const total = S.owner ? (!S.seat && !S.mention ? p.needs_owner_total : null) : S.mention ? p.mentions[S.mention] : S.seat ? p.seats[S.seat] : p.count;
    const more = rows.length > S.limit ? h('button', { type: 'button', class: 'linkish' }, `Show ${Math.min(500, rows.length - S.limit)} more (${rows.length - S.limit} older)`) : null;
    if (more) more.addEventListener('click', () => { S.limit += 500; draw(); });
    const list = h('div', { class: 'blist' }, ...rows.slice(0, S.limit).map((l) => h('div', { class: 'brow' + (l.needs_owner ? ' owner' : '') }, h('span', { class: 'meta' }, `${when(l.ts)} · ${l.seat} · ${l.state}${l.needs_owner ? ' · needs partner' : ''}`), h('div', {}, l.item), h('div', { class: 'muted' }, l.note))));
    root.replaceChildren(h('div', { class: 'uh-ctl' }, sel('Seat', 'seat', 'All seats', seatNames, (n) => `${n} (${p.seats[n]})`), sel('Mention', 'mention', 'Anyone', mentNames, (n) => `@${n} (${p.mentions[n]})`),
      h('label', { class: 'toggle' }, cb, ' Needs partner only')),
      h('p', { class: 'meta' }, `${rows.length} line${rows.length === 1 ? '' : 's'} shown${total != null ? ` of ${total} matching on the full board (${p.count} lines)` : ` (board has ${p.count} lines)`}. ${full ? 'Full board loaded.' : err ? `Full board did not load (${err}); showing the newest ${p.lines.length}.` : 'Loading the full board…'}`), list, ...(more ? [more] : []));
  };
  draw();
  if (ctx && ctx.sb && (p.chunks || []).length) {
    // the full board: every line, in chunk rows read under the same signed-in session (RLS)
    Promise.all(p.chunks.map((nm) => ctx.sb.from('panel_data').select('payload').eq('panel', nm).maybeSingle().then(async ({ data, error }) => {
      if (error || !data) throw error || new Error('missing ' + nm); return unpack(data.payload);
    }))).then((parts) => { p = { ...p, lines: parts.flat() }; full = true; draw(); })
      .catch((e) => { full = false; err = String(e.message || e); draw(); });
  }
}
