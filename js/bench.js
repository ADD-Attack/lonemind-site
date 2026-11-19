// Test bench page logic. Five models, all run in this tab. Hook window.LM_BENCH is used by the parity harness (qa/parity.mjs) to drive the real page code.
(function () {
  const MODELS = window.BENCH_MODELS, $ = id => document.getElementById(id);
  const rail = $('models'), info = $('minfo'), go = $('go'), q = $('q'), out = $('out');
  const RT = { tny2: () => window.Tiny21, lmpk: () => window.LoneMindMini };
  const cache = {}, P = new URLSearchParams(location.search);
  let cur = null, M = null, busy = false, abort = null;

  MODELS.forEach(m => {
    const l = document.createElement('label'); l.className = 'mrow';
    l.innerHTML = '<input type="radio" name="model" value="' + m.id + '"><span class="mname"></span><span class="mspec"></span>';
    l.querySelector('.mname').textContent = m.name; l.querySelector('.mspec').textContent = m.spec + (m.def ? ' · default' : '');
    rail.append(l);
  });
  rail.addEventListener('change', e => { if (e.target.name === 'model') select(e.target.value); });

  function ready(on, label) { go.disabled = !on; go.textContent = label || (on ? 'Ask' : 'Loading…'); }
  function setInfo(m) { info.textContent = m.who + ' · ' + m.licence + ' · runs in this tab'; $('curname').textContent = m.name; }

  async function select(id) {
    const m = MODELS.find(x => x.id === id); if (!m) return;
    cur = m; M = null; rail.querySelector('input[value="' + id + '"]').checked = true; setInfo(m);
    document.querySelectorAll('.lic').forEach(el => el.classList.toggle('on', el.dataset.id === id));
    ready(false);
    try {
      if (!cache[id]) { const r = await fetch(m.file); if (!r.ok) throw new Error(r.status); const buf = await r.arrayBuffer(); const rt = RT[m.kind](); cache[id] = m.kind === 'tny2' ? rt.load(buf) : rt.loadPK(buf, { decoder: m.decoder }); }
      if (cur !== m) return; M = cache[id]; ready(true);
    } catch (e) { if (cur === m) ready(false, 'Could not load'); console.warn(e); }
  }
  function card(question, name) {
    const c = document.createElement('div'); c.className = 'acard';
    const a = document.createElement('div'); a.className = 'aq'; a.textContent = 'You: ' + question + '  ·  ' + name;
    const b = document.createElement('div'); b.className = 'aa'; const m = document.createElement('div'); m.className = 'am';
    c.append(a, b, m); out.prepend(c); return { b, m };
  }
  async function ask(t) {
    if (!t.trim() || !M || busy) return; busy = true; const m = cur; ready(false, 'Thinking…');
    const c = card(t, m.name);
    await new Promise(r => setTimeout(r, 20)); const t0 = performance.now(), a = RT[m.kind]().answer(M, t);
    c.b.textContent = a || '(no answer)'; c.m.textContent = 'Answered on this device in ' + Math.round(performance.now() - t0) + ' ms';
    busy = false; ready(true);
  }
  $('ask').addEventListener('submit', e => { e.preventDefault(); ask(q.value); });
  document.querySelectorAll('.ex').forEach(a => a.addEventListener('click', e => { e.preventDefault(); q.value = a.textContent; ask(a.textContent); }));

  // Licence block: one entry per model, the selected model's entry is lit.
  const L = $('lics');
  MODELS.forEach(m => {
    const d = document.createElement('article'); d.className = 'lic'; d.dataset.id = m.id;
    const h = document.createElement('h3'); h.textContent = m.name;
    const p = document.createElement('p'); p.className = 'lt'; p.textContent = m.who + ' · ' + m.licence;
    const c = document.createElement('p'); c.textContent = m.credit;
    d.append(h, p); if (m.credit) d.append(c);
    if (m.docs.length) { const u = document.createElement('p'); m.docs.forEach((x, i) => { if (i) u.append(' · '); const a = document.createElement('a'); a.href = x[1]; a.textContent = x[0]; u.append(a); }); d.append(u); }
    L.append(d);
  });

  // parity hook: window.LM_BENCH.run(id, questions) -> [{out, ids, prompt}] using the same runtime objects as the page
  window.LM_BENCH = {
    async run(id, qs) {
      await select(id); for (let i = 0; i < 200 && !M; i++) await new Promise(r => setTimeout(r, 50)); if (!M) throw new Error('model not ready: ' + id);
      const rt = RT[cur.kind](), res = []; for (const s of qs) { const o = rt.answer(M, s); const l = rt.answer.last; res.push({ out: o, ids: l.ids, prompt: l.prompt }); } return res;
    }
  };
  const start = P.get('model') && MODELS.some(m => m.id === P.get('model')) ? P.get('model') : MODELS.find(m => m.def).id;
  select(start).then(() => { const p = P.get('q'); if (p && M) { q.value = p; ask(p); } });
})();
