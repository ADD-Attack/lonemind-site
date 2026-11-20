/* Stasimetry, the toy version. Original art, all drawn in code. One rAF loop drives every toy; Calm mode stops ambient motion,
   reduced motion turns every tween into a jump. Toy math: Toy 1 is a real contraction map (bubble = q/(1-q) x last step),
   Toy 5 is live double-precision arithmetic. */
(() => {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let calm = RM;
  const $ = id => document.getElementById(id);
  const DPR = () => Math.min(devicePixelRatio || 1, 2);
  const TAU = Math.PI * 2;
  const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const sup = n => String(n).replace(/./g, c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[c] ?? c);
  const ticks = [];
  const visible = new Set();
  const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? visible.add(e.target.id) : visible.delete(e.target.id)), { rootMargin: '80px' });
  function fit(cv) {
    const r = cv.getBoundingClientRect(), d = DPR();
    const w = Math.max(1, Math.round(r.width * d)), h = Math.max(1, Math.round(r.height * d));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    const ctx = cv.getContext('2d'); ctx.setTransform(d, 0, 0, d, 0, 0);
    return { ctx, W: r.width, H: r.height };
  }

  /* ---------- Calm toggle ---------- */
  const calmBtn = $('calm');
  const calmListeners = [];
  function setCalm(v) {
    calm = v; document.body.classList.toggle('is-calm', v);
    calmBtn.setAttribute('aria-pressed', String(v));
    calmBtn.querySelector('.lbl').textContent = v ? 'Calm mode: on' : 'Calm mode';
    calmListeners.forEach(f => f(v));
  }
  calmBtn.addEventListener('click', () => setCalm(!calm));

  /* ---------- Background: a slow drain-swirl of points with depth ---------- */
  const bg = $('bg');
  {
    const N = innerWidth < 700 ? 380 : 700;
    const P = [];
    const spawn = (p, fresh) => { p.r = fresh ? .2 + Math.random() * 2.9 : 2.7 + Math.random() * .4; p.a = Math.random() * TAU; p.h = Math.random() * .3 - .15; p.s = .6 + Math.random() * 1.1; return p; };
    for (let i = 0; i < N; i++) P.push(spawn({}, true));
    const tilt = 1.08, ct = Math.cos(tilt), st = Math.sin(tilt);
    function draw(dt) {
      const r0 = bg.getBoundingClientRect(), W = r0.width, H = r0.height;
      if (bg.width !== Math.round(W) || bg.height !== Math.round(H)) { bg.width = Math.round(W); bg.height = Math.round(H); }
      const ctx = bg.getContext('2d');
      ctx.clearRect(0, 0, W, H);
      const cx = W > 900 ? W * .68 : W * .5, cy = W > 900 ? H * .42 : H * .66, f = Math.min(W, H) * .95;
      const cg = ctx.createRadialGradient(cx, cy + f * .02, 0, cx, cy, f * .42);
      cg.addColorStop(0, 'rgba(255,170,70,.20)'); cg.addColorStop(.35, 'rgba(255,140,50,.06)'); cg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cg; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (const p of P) {
        if (dt) {
          p.a += dt * .32 / Math.pow(p.r, 1.5);
          p.r -= dt * .035 / Math.sqrt(p.r);
          if (p.r < .16) { spawn(p, false); p.px = undefined; }
        }
        const x = p.r * Math.cos(p.a), z = p.r * Math.sin(p.a), y = -.55 / (p.r + .25) + p.h;
        const Y = y * ct - z * st, Z = y * st + z * ct + 5;
        const sx = cx + f * x / Z, sy = cy - f * Y / Z;
        const near = Math.max(0, Math.min(1, 1 - (p.r - .16) / 2.9));
        const al = Math.min(1, (.32 + .68 * near) * (1.55 - Z / 6));
        ctx.fillStyle = near > .62 ? `rgba(255,190,100,${al})` : `rgba(127,227,212,${al * .8})`;
        const s = p.s * 1.25 * (6 / Z);
        if (p.px !== undefined && Math.abs(p.px - sx) + Math.abs(p.py - sy) < 40) {
          ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = s; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(sx, sy); ctx.stroke();
        } else ctx.fillRect(sx, sy, s, s);
        if (dt) { p.px = p.px === undefined ? sx : p.px + (sx - p.px) * .25; p.py = p.py === undefined ? sy : p.py + (sy - p.py) * .25; }
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    let still = false;
    ticks.push(dt => {
      if (document.hidden) return;
      if (calm) { if (!still) { draw(0); still = true; } return; }
      still = false; draw(dt);
    });
    addEventListener('resize', () => { still = false; });
  }

  /* ---------- Toy 1: marble in a bowl ---------- */
  {
    const cv = $('marble'), read = $('m-read'), qIn = $('m-q'), qOut = $('m-qv');
    io.observe($('toy-marble'));
    const TH = .55;
    let q = +qIn.value, mode = 'bowl';
    let p = null, trail = [], bubble = null, passes = 0, running = false, tw = null, drag = false, started = false, wait = 0;
    const S = () => cv.getBoundingClientRect().width;
    const C = () => ({ x: S() / 2, y: S() / 2 });
    const rot = (v, a, k) => ({ x: k * (v.x * Math.cos(a) - v.y * Math.sin(a)), y: k * (v.x * Math.sin(a) + v.y * Math.cos(a)) });
    function place(x, y) {
      const c = C(), R = S() * .43, dx = x - c.x, dy = y - c.y, d = Math.hypot(dx, dy);
      const k = d > R ? R / d : 1;
      p = { x: c.x + dx * k, y: c.y + dy * k };
    }
    function reset() { running = false; tw = null; bubble = null; passes = 0; trail = p ? [{ ...p }] : []; }
    function start() { reset(); running = true; wait = 0; }
    function pass() {
      const c = C(), qq = mode === 'ice' ? 1 : q, v = { x: p.x - c.x, y: p.y - c.y };
      const from = { ...p };
      const to = (() => { const w = rot(v, TH, qq); return { x: c.x + w.x, y: c.y + w.y }; })();
      const finish = () => {
        p = to; passes++; trail.push({ ...p }); if (trail.length > 400) trail.shift();
        const step = Math.hypot(to.x - from.x, to.y - from.y);
        const dist = Math.hypot(to.x - c.x, to.y - c.y);
        if (mode === 'ice') {
          bubble = null;
          read.innerHTML = passes < 36 ? `Pass ${passes} · no friction, so nothing shrinks · <span class="no">certificate: refused</span>`
            : `Still spinning after ${passes} passes. It never settles. Volume-preserving, so <span class="no">no certificate can exist.</span>`;
          if (passes >= 36) running = false;
        } else {
          bubble = { x: to.x, y: to.y, r: q / (1 - q) * step };
          const inside = dist <= bubble.r + 1e-9;
          if (dist < .5) { running = false; read.innerHTML = `At rest after ${passes} passes. The bubble never lost the bottom. <span class="ok">Whoa.</span>`; }
          else read.innerHTML = `Pass ${passes} · last step ${step.toFixed(1)} px · bubble ${bubble.r.toFixed(1)} px · bottom inside: <span class="${inside ? 'ok' : 'no'}">${inside ? 'yes' : 'NO'}</span>`;
        }
      };
      if (RM) { finish(); wait = .35; return; }
      tw = { t: 0, dur: mode === 'ice' ? .32 : .55, v, qq, c, finish };
    }
    function draw() {
      const { ctx, W } = fit(cv), c = C();
      ctx.clearRect(0, 0, W, W);
      const R = W * .47;
      const g = ctx.createRadialGradient(c.x - R * .2, c.y - R * .25, R * .05, c.x, c.y, R);
      g.addColorStop(0, mode === 'ice' ? '#132733' : '#1a2230'); g.addColorStop(.7, '#0c1119'); g.addColorStop(1, '#06080d');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c.x, c.y, R, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(159,195,230,.09)'; ctx.lineWidth = 1;
      for (let i = 1; i <= 6; i++) { ctx.beginPath(); ctx.arc(c.x, c.y, R * i / 6.4, 0, TAU); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(159,195,230,.25)'; ctx.beginPath(); ctx.arc(c.x, c.y, R, 0, TAU); ctx.stroke();
      // bottom marker
      ctx.strokeStyle = '#7fe3d4'; ctx.lineWidth = 1.5; ctx.beginPath();
      ctx.moveTo(c.x - 6, c.y); ctx.lineTo(c.x + 6, c.y); ctx.moveTo(c.x, c.y - 6); ctx.lineTo(c.x, c.y + 6); ctx.stroke();
      if (!p) return;
      // trail
      if (trail.length > 1) {
        ctx.strokeStyle = 'rgba(255,181,74,.35)'; ctx.lineWidth = 1.2; ctx.beginPath();
        trail.forEach((t, i) => i ? ctx.lineTo(t.x, t.y) : ctx.moveTo(t.x, t.y)); ctx.lineTo(p.x, p.y); ctx.stroke();
      }
      // bubble
      if (bubble) {
        ctx.fillStyle = 'rgba(255,181,74,.07)'; ctx.beginPath(); ctx.arc(bubble.x, bubble.y, bubble.r, 0, TAU); ctx.fill();
        ctx.setLineDash([6, 6]); ctx.strokeStyle = '#ffb54a'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(bubble.x, bubble.y, Math.max(bubble.r, 1), 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      }
      // marble
      const mr = W * .032;
      ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(p.x + mr * .35, p.y + mr * .55, mr, mr * .7, 0, 0, TAU); ctx.fill();
      const mg = ctx.createRadialGradient(p.x - mr * .4, p.y - mr * .4, mr * .1, p.x, p.y, mr);
      mg.addColorStop(0, '#fff3dc'); mg.addColorStop(.35, '#ffb54a'); mg.addColorStop(1, '#7a4a10');
      ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(p.x, p.y, mr, 0, TAU); ctx.fill();
    }
    let dirty = true;
    ticks.push(dt => {
      if (!visible.has('toy-marble') && started) { if (dirty) { draw(); dirty = false; } return; }
      if (!started && visible.has('toy-marble')) {
        started = true; const s = S(); place(s * .5 + s * .38 * Math.cos(-2.3), s * .5 + s * .38 * Math.sin(-2.3)); reset();
        if (!calm) start();
      }
      if (tw) {
        tw.t += dt / tw.dur; const t = Math.min(1, ease(tw.t));
        const w = rot(tw.v, TH * t, Math.pow(tw.qq, t)); p = { x: tw.c.x + w.x, y: tw.c.y + w.y };
        if (tw.t >= 1) { const f = tw.finish; tw = null; f(); wait = mode === 'ice' ? 0 : .12; }
      } else if (running && !drag) {
        wait -= dt; if (wait <= 0) pass();
      }
      draw();
    });
    const pt = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    cv.addEventListener('pointerdown', e => { drag = true; cv.classList.add('drag'); cv.setPointerCapture(e.pointerId); reset(); place(...pt(e)); trail = [{ ...p }]; read.textContent = 'Let go when ready.'; });
    cv.addEventListener('pointermove', e => { if (!drag) return; place(...pt(e)); trail = [{ ...p }]; });
    const up = () => { if (!drag) return; drag = false; cv.classList.remove('drag'); start(); };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    $('m-fling').addEventListener('click', () => { const s = S(), a = Math.random() * TAU; place(s / 2 + s * .42 * Math.cos(a), s / 2 + s * .42 * Math.sin(a)); start(); });
    const setMode = m => {
      mode = m;
      [['bowl', 'm-mode-bowl'], ['ice', 'm-mode-ice']].forEach(([k, id]) => { $(id).classList.toggle('on', k === m); $(id).setAttribute('aria-pressed', String(k === m)); });
      if (p) { const c = C(); if (Math.hypot(p.x - c.x, p.y - c.y) < S() * .25) { const s = S(); place(s / 2 + s * .38, s / 2); } start(); }
    };
    $('m-mode-bowl').addEventListener('click', () => setMode('bowl'));
    $('m-mode-ice').addEventListener('click', () => setMode('ice'));
    qIn.addEventListener('input', () => { q = +qIn.value; qOut.textContent = q.toFixed(2); if (p && mode === 'bowl') start(); });
  }

  /* ---------- Toy 2: squeeze 40x ---------- */
  {
    const btn = $('sq-btn'), bub = $('sq-bub'), glow = $('sq-glow'), ping = $('sq-ping'), lbl = $('sq-lbl');
    const BIG = 136, SMALL = 136 / 40;
    let small = false, r = BIG, tw = null;
    const set = v => { r = v; bub.setAttribute('r', v.toFixed(2)); glow.setAttribute('r', (v * 1.15).toFixed(2)); bub.setAttribute('stroke-dasharray', v < 12 ? '1.6 1.6' : '7 7'); };
    btn.addEventListener('click', () => {
      small = !small; btn.setAttribute('aria-pressed', String(small));
      btn.textContent = small ? 'Back to the whole-model guarantee' : 'Check this answer on its own';
      lbl.textContent = small ? 'per-answer guarantee: roughly 40× tighter' : 'whole-model guarantee';
      ping.setAttribute('opacity', small ? '1' : '0'); document.getElementById('sq-ghost').setAttribute('opacity', small ? '.8' : '0');
      const to = small ? SMALL : BIG;
      if (RM) { set(to); return; }
      tw = { from: r, to, t: 0 };
    });
    ticks.push((dt, now) => {
      if (tw) { tw.t += dt / 1.3; const t = ease(Math.min(1, tw.t)); set(Math.exp(Math.log(tw.from) + (Math.log(tw.to) - Math.log(tw.from)) * t)); if (tw.t >= 1) tw = null; }
      if (small && !RM && !calm) ping.setAttribute('r', (6 + 6 * ((now / 1400) % 1)).toFixed(2));
    });
  }

  /* ---------- Toy 3: rings, zoom x23 forever ---------- */
  {
    const cv = $('rings'), meter = $('r-meter'), autoBtn = $('r-auto');
    io.observe($('toy-rings'));
    let t = 0, auto = true, tw = null, clock = 0, dirty = true;
    const fmt = t => { const n = Math.floor(t + 1e-9); return n <= 5 ? `zoom ×${Math.round(Math.pow(23, t)).toLocaleString('en-US')}` : `zoom ×23${sup(n)} and counting`; };
    function draw() {
      const { ctx, W, H } = fit(cv);
      ctx.fillStyle = '#04050a'; ctx.fillRect(0, 0, W, H);
      const Rs = H * 1.15, cx = W * .34 - Rs, cy = H / 2, G = W * .022, f = t - Math.floor(t);
      // drain swirl inside the shadow
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, Rs, 0, TAU); ctx.clip();
      ctx.fillStyle = '#020306'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(159,195,230,.05)'; ctx.lineWidth = 1;
      for (let j = 0; j < 7; j++) {
        ctx.beginPath();
        for (let s = 0; s <= 60; s++) { const u = s / 60, rr = Rs * (1 - u * .9), a = j * TAU / 7 + u * 3.2 + clock * .05; const x = cx + rr * Math.cos(a), y = cy + rr * Math.sin(a); s ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = 'rgba(125,136,152,.6)'; ctx.setLineDash([3, 6]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, Rs, -.8, .8); ctx.stroke(); ctx.setLineDash([]);
      for (let k = -1; k <= 7; k++) {
        const d = G * Math.pow(23, f - k);
        if (d < .05) continue;
        const R = Rs + d, fade = Math.max(0, Math.min(1, (W * .64 - d) / (W * .12))), born = Math.min(1, d / 1.2);
        const a = fade * born; if (a <= 0) continue;
        const lw = Math.max(.8, Math.min(9, d * .12));
        ctx.strokeStyle = `rgba(255,181,74,${.16 * a})`; ctx.lineWidth = lw * 3.2; ctx.beginPath(); ctx.arc(cx, cy, R, -.9, .9); ctx.stroke();
        ctx.strokeStyle = `rgba(255,214,150,${.95 * a})`; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(cx, cy, R, -.9, .9); ctx.stroke();
        // photons looping along the ring
        ctx.fillStyle = `rgba(255,244,220,${a})`;
        for (let i = 0; i < 4; i++) { const ang = ((clock * .07 / (1 + k * .4) + i / 4 + k * .13) % 1) * 1.6 - .8; ctx.beginPath(); ctx.arc(cx + R * Math.cos(ang), cy + R * Math.sin(ang), Math.max(1.2, lw * .55), 0, TAU); ctx.fill(); }
      }
      ctx.fillStyle = '#7d8898'; ctx.font = '500 13px ui-monospace, Menlo, Consolas, monospace';
      ctx.fillText('shadow', 14, H - 16);
      meter.textContent = fmt(t);
    }
    ticks.push(dt => {
      const vis = visible.has('toy-rings');
      if (tw) { tw.k += dt / 1.6; t = tw.from + (tw.to - tw.from) * ease(Math.min(1, tw.k)); if (tw.k >= 1) { t = tw.to; tw = null; } dirty = true; }
      else if (auto && !calm && vis) { t += dt * .11; dirty = true; }
      if (!calm && vis) { clock += dt; dirty = true; }
      if (dirty && vis) { draw(); dirty = false; }
    });
    $('r-zoom').addEventListener('click', () => { const to = Math.floor(t + 1e-6) + 1; if (RM) { t = to; dirty = true; } else tw = { from: t, to, k: 0 }; });
    const setAuto = v => { auto = v; autoBtn.setAttribute('aria-pressed', String(v)); autoBtn.textContent = `Auto-drift: ${v ? 'on' : 'off'}`; };
    autoBtn.addEventListener('click', () => setAuto(!auto));
    if (RM) setAuto(false);
    let dx0 = null;
    cv.style.touchAction = 'pan-y';
    cv.addEventListener('pointerdown', e => { dx0 = e.clientX; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', e => { if (dx0 === null) return; t = Math.max(0, t - (e.clientX - dx0) / cv.clientWidth * 1.4); dx0 = e.clientX; tw = null; dirty = true; });
    const up = () => { dx0 = null; }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    addEventListener('resize', () => dirty = true);
    calmListeners.push(() => dirty = true);
  }

  /* ---------- Toy 4: saddle, split time ---------- */
  {
    const cv = $('saddle'), read = $('s-read'), kIn = $('s-k');
    io.observe($('toy-saddle'));
    let mode = 'split', k = +kIn.value, tw = null, dirty = true;
    const N = 150, D = [];
    const rnd = () => ({ x: (Math.random() * 2 - 1) * .95, y: (Math.random() * 2 - 1) * .95 });
    for (let i = 0; i < N; i++) D.push(rnd());
    const exps = () => mode === 'fwd' ? [1, -1] : mode === 'bwd' ? [-1, 1] : [-1, -1];
    const msg = {
      fwd: 'Forward: the dots escape sideways. <span class="no">Certificate: refused.</span>',
      bwd: 'Backward: the dots escape up and down. <span class="no">Certificate: refused.</span>',
      split: 'Split: squishy part forward, stretchy part backward. Everything settles. <span class="ok">Certificate: granted.</span>'
    };
    function apply(amount) {
      const [ex, ey] = exps(), sx = Math.pow(k, ex * amount), sy = Math.pow(k, ey * amount);
      for (const d of D) {
        d.x *= sx; d.y *= sy;
        if (Math.abs(d.x) > 1.2 || Math.abs(d.y) > 1.2) Object.assign(d, mode === 'fwd' ? { x: (Math.random() * 2 - 1) * .08, y: Math.random() < .5 ? -1 : 1 } : mode === 'bwd' ? { x: Math.random() < .5 ? -1 : 1, y: (Math.random() * 2 - 1) * .08 } : rnd());
        else if (mode === 'split' && Math.hypot(d.x, d.y) < .012) Object.assign(d, (() => { const a = Math.random() * TAU; return { x: Math.cos(a) * 1.1, y: Math.sin(a) * 1.1 }; })());
      }
    }
    function draw() {
      const { ctx, W, H } = fit(cv), cx = W / 2, cy = H / 2, sx = W * .46, sy = H * .46;
      ctx.fillStyle = '#04050a'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(159,195,230,.08)'; ctx.lineWidth = 1;
      for (const c of [.02, .06, .14, .28]) for (const sgn of [1, -1]) for (const qd of [1, -1]) {
        ctx.beginPath(); let first = true;
        for (let x = c / 1.2; x <= 1.2; x += .01) { const y = sgn * c / x; if (Math.abs(y) > 1.2) continue; const X = cx + qd * x * sx, Y = cy - y * sy; first ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); first = false; }
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255,181,74,.55)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(10, cy); ctx.lineTo(W - 10, cy); ctx.stroke();
      ctx.strokeStyle = 'rgba(127,227,212,.55)'; ctx.beginPath(); ctx.moveTo(cx, 10); ctx.lineTo(cx, H - 10); ctx.stroke();
      ctx.font = '600 13px ui-monospace, Menlo, Consolas, monospace';
      ctx.fillStyle = '#ffb54a'; ctx.fillText('stretchy ⟷', W - 104, cy - 10);
      ctx.fillStyle = '#7fe3d4'; ctx.fillText('squishy ↕', cx + 10, 22);
      const [ex, ey] = exps();
      for (const d of D) {
        const X = cx + d.x * sx, Y = cy - d.y * sy;
        const vx = d.x * ex, vy = -d.y * ey, m = Math.hypot(vx, vy) || 1, L = Math.min(24, 70 * m * Math.log(k));
        ctx.strokeStyle = 'rgba(255,214,150,.28)'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X - vx / m * L, Y - vy / m * L); ctx.stroke();
        ctx.fillStyle = '#ffe2b0'; ctx.beginPath(); ctx.arc(X, Y, 2.2, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = '#7fe3d4'; ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, TAU); ctx.fill();
    }
    ticks.push(dt => {
      const vis = visible.has('toy-saddle');
      if (tw) { const step = Math.min(dt / .7, 1 - tw.k); tw.k += step; apply(step); if (tw.k >= 1 - 1e-9) tw = null; dirty = true; }
      else if (!calm && vis) { apply(dt * .45); dirty = true; }
      if (dirty && vis) { draw(); dirty = false; }
    });
    const setMode = m => {
      mode = m; read.innerHTML = msg[m];
      [['fwd', 's-fwd'], ['bwd', 's-bwd'], ['split', 's-split']].forEach(([kk, id]) => { $(id).classList.toggle('on', kk === m); $(id).setAttribute('aria-pressed', String(kk === m)); });
      dirty = true;
    };
    $('s-fwd').addEventListener('click', () => setMode('fwd'));
    $('s-bwd').addEventListener('click', () => setMode('bwd'));
    $('s-split').addEventListener('click', () => setMode('split'));
    kIn.addEventListener('input', () => { k = +kIn.value; dirty = true; });
    $('s-pass').addEventListener('click', () => { if (RM) { apply(1); dirty = true; } else tw = { k: 0 }; });
    setMode('split');
    addEventListener('resize', () => dirty = true);
  }

  /* ---------- Toy 5: the calculator that falls asleep (live doubles) ---------- */
  {
    const P = 1000, X0 = 1000.00001;
    const kIn = $('c-k'), calc = $('calc');
    let x = X0, n = 0, lastStep = null;
    const q = () => 1 - Math.pow(10, -(+kIn.value));
    const show = () => {
      const kk = +kIn.value, qq = q(), naive = qq / (1 - qq) * Math.abs(lastStep ?? 0), real = x - P;
      $('c-kv').textContent = `10⁻${sup(kk)}`;
      $('c-q').textContent = `1 − 10⁻${sup(kk)}`;
      $('c-n').textContent = String(n);
      $('c-real').textContent = real.toFixed(8);
      if (lastStep === null) { $('c-step').textContent = '—'; $('c-naive').textContent = '—'; $('c-verdict').textContent = 'Press "One more pass".'; calc.classList.remove('asleep'); return; }
      const zero = lastStep === 0;
      $('c-step').textContent = zero ? '0' : lastStep.toExponential(3);
      $('c-naive').textContent = zero ? '0  ("all done!")' : naive.toFixed(8);
      calc.classList.toggle('asleep', zero);
      $('c-verdict').textContent = zero
        ? `Step = 0, so the naive certificate says 0. False: still ${real.toFixed(8)} away. An honest certificate never drops below its arithmetic floor.`
        : naive >= real ? 'Tiny step, not zero. Here the naive certificate still covers the gap.' : 'Tiny step, and the naive certificate already falls short of the gap.';
    };
    const doPass = () => { const nx = P + q() * (x - P); lastStep = nx - x; x = nx; n++; show(); };
    const reset = () => { x = X0; n = 0; lastStep = null; show(); };
    kIn.addEventListener('input', () => { reset(); doPass(); });
    $('c-pass').addEventListener('click', doPass);
    $('c-reset').addEventListener('click', reset);
    show();
  }

  /* ---------- Toy 6: wormhole images ---------- */
  {
    const svg = $('worm'), read = $('w-read'), NS = 'http://www.w3.org/2000/svg';
    const M = 10, circles = [];
    for (let i = 0; i < M; i++) { const c = document.createElementNS(NS, 'circle'); c.setAttribute('cy', '100'); c.setAttribute('fill', 'none'); c.setAttribute('stroke', i ? '#ffd696' : '#ffb54a'); c.setAttribute('stroke-width', '1.6'); c.style.transition = RM ? 'none' : 'r .9s ease, cx .9s ease, opacity .9s ease'; svg.appendChild(c); circles.push(c); }
    const set = m => {
      const r = [...Array(M)].map((_, i) => m === 'short' ? 46 * Math.pow(.55, i) : 46 / (1 + .55 * i));
      const gap = 8, total = r.reduce((s, v) => s + 2 * v + gap, 0) - gap, sc = Math.min(1, 396 / total);
      let x = 12;
      circles.forEach((c, i) => { const rr = r[i] * sc; c.setAttribute('cx', (x + rr).toFixed(2)); c.setAttribute('r', Math.max(rr, .6).toFixed(2)); c.style.opacity = rr < .8 ? '.3' : '1'; x += 2 * rr + gap * sc; });
      read.innerHTML = m === 'short' ? 'Steady shrink factor. <span class="ok">Certificate applies.</span>' : 'Ratio creeps toward 1. <span class="no">No geometric certificate (proved).</span> Backup: a slower 1/n² guarantee.';
      [['short', 'w-short'], ['long', 'w-long']].forEach(([k, id]) => { $(id).classList.toggle('on', k === m); $(id).setAttribute('aria-pressed', String(k === m)); });
    };
    $('w-short').addEventListener('click', () => set('short'));
    $('w-long').addEventListener('click', () => set('long'));
    set('short');
  }

  /* ---------- loop ---------- */
  setCalm(calm);
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    for (const f of ticks) f(dt, now);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
