// Stasimetry note. Three pieces, no libraries:
// 1. a living background: drifting points that each spiral in and come to rest, then rise again;
// 2. Fig. 1, a real contraction (rotate-and-shrink by q) with the q/(1-q) ball drawn from the true last change;
// 3. Fig. 3 saddle flow lines (u*v = c).
// Reduced motion: still frames, nothing autoplays. Hidden tab: paused.
(function () {
  'use strict';
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches || /[?&]still\b/.test(location.search);
  var NS = 'http://www.w3.org/2000/svg';
  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  /* ---------- 1. background: points coming to rest ---------- */
  (function bg() {
    var c = document.getElementById('bg');
    if (!c || !c.getContext) return;
    var g = c.getContext('2d');
    document.documentElement.classList.add('has-webgl');
    var W, H, dpr, pts = [], mx = 0, my = 0, tmx = 0, tmy = 0;
    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = c.width = Math.round(innerWidth * dpr); H = c.height = Math.round(innerHeight * dpr);
    }
    function seed(p, fresh) {
      p.r = (0.55 + Math.random() * 0.75) * Math.max(W, H) * 0.55;
      p.a = Math.random() * Math.PI * 2;
      p.z = 0.25 + Math.random() * 0.75;            // depth: far points are dim, slow, small
      p.k = 0.9965 - Math.random() * 0.004;         // per-frame shrink, each point its own q
      p.w = (0.004 + Math.random() * 0.006) * (Math.random() < 0.5 ? 1 : -1);
      p.life = fresh ? Math.random() : 0;
      p.hx = []; p.hy = [];
    }
    function init() {
      size(); pts = [];
      var n = Math.round(Math.min(220, (innerWidth * innerHeight) / 7000));
      for (var i = 0; i < n; i++) { var p = {}; seed(p, true); p.r *= Math.random(); pts.push(p); }
    }
    function centre() { return { x: W * (innerWidth > 900 ? 0.78 : 0.5), y: H * (innerWidth > 900 ? 0.42 : 0.3) }; }
    function frame(step) {
      g.fillStyle = '#06080c'; g.fillRect(0, 0, W, H);
      var o = centre();
      mx += (tmx - mx) * 0.04; my += (tmy - my) * 0.04;
      // the rest point
      var halo = g.createRadialGradient(o.x, o.y, 0, o.x, o.y, 160 * dpr);
      halo.addColorStop(0, 'rgba(255,214,150,.30)'); halo.addColorStop(0.25, 'rgba(255,181,74,.10)'); halo.addColorStop(1, 'rgba(255,181,74,0)');
      g.fillStyle = halo; g.fillRect(o.x - 160 * dpr, o.y - 160 * dpr, 320 * dpr, 320 * dpr);
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        if (step) {
          p.r *= p.k; p.a += p.w / p.z; p.life += 0.004;
          if (p.r < 2 * dpr) seed(p, false);
        }
        var par = (1 - p.z) * 30 * dpr;
        var x = o.x + Math.cos(p.a) * p.r * (0.6 + p.z * 0.4) + mx * par;
        var y = o.y + Math.sin(p.a) * p.r * 0.62 * (0.6 + p.z * 0.4) + my * par;
        p.hx.push(x); p.hy.push(y); if (p.hx.length > 14) { p.hx.shift(); p.hy.shift(); }
        var fade = Math.min(1, p.life * 4);
        var warm = Math.max(0, 1 - p.r / (220 * dpr));
        var col = warm > 0 ? 'rgba(255,' + Math.round(200 - 40 * warm) + ',' + Math.round(150 - 80 * warm) + ',' : 'rgba(150,185,220,';
        if (p.hx.length > 2) {
          g.beginPath(); g.moveTo(p.hx[0], p.hy[0]);
          for (var j = 1; j < p.hx.length; j++) g.lineTo(p.hx[j], p.hy[j]);
          g.strokeStyle = col + (0.10 + 0.25 * p.z) * fade + ')'; g.lineWidth = (0.6 + p.z) * dpr; g.stroke();
        }
        g.beginPath(); g.arc(x, y, (0.7 + 1.3 * p.z) * dpr, 0, 6.283);
        g.fillStyle = col + (0.25 + 0.6 * p.z) * fade + ')'; g.fill();
      }
      g.beginPath(); g.arc(o.x, o.y, 3.2 * dpr, 0, 6.283); g.fillStyle = 'rgba(255,226,176,.95)'; g.fill();
    }
    init();
    addEventListener('resize', init);
    addEventListener('pointermove', function (e) { tmx = e.clientX / innerWidth - 0.5; tmy = e.clientY / innerHeight - 0.5; }, { passive: true });
    if (still) {
      for (var s = 0; s < 40; s++) for (var i = 0; i < pts.length; i++) { var p = pts[i]; p.r *= p.k; p.a += p.w / p.z; p.life = 1; }
      frame(false);
      addEventListener('resize', function () { frame(false); });
      return;
    }
    function loop() { if (!document.hidden) frame(true); requestAnimationFrame(loop); }
    requestAnimationFrame(loop);
  })();

  /* ---------- 2. Fig. 1: contraction with the q/(1-q) ball ---------- */
  (function contract() {
    var svg = document.getElementById('contract');
    if (!svg) return;
    var step = document.getElementById('c-step'), reset = document.getElementById('c-reset'), qIn = document.getElementById('c-q');
    var FX = 470, FY = 205, TH = 0.62, MAXN = 14;           // fixed point, rotation per pass
    var X0 = { x: 150, y: 360 };
    var START = 3, n = START, auto = null;
    function q() { return parseFloat(qIn.value); }
    function iterates(N) {
      var out = [X0], qq = q(), c = Math.cos(TH), s = Math.sin(TH);
      for (var i = 0; i < N; i++) {
        var p = out[out.length - 1], dx = p.x - FX, dy = p.y - FY;
        out.push({ x: FX + qq * (c * dx - s * dy), y: FY + qq * (s * dx + c * dy) });
      }
      return out;
    }
    function label(x, y, txt, cls, anchor) {
      var t = el('text', { x: x, y: y, 'class': cls || '', 'text-anchor': anchor || 'start' }, svg);
      t.textContent = txt; return t;
    }
    function draw() {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var defs = el('defs', {}, svg);
      var m = el('marker', { id: 'cah', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto' }, defs);
      el('path', { d: 'M0 0 L10 5 L0 10 z', fill: '#eef1f5' }, m);
      // Keep labels at least ~13 px on screen: scale label size by k when the figure is narrow.
      var w = svg.getBoundingClientRect().width || 720, k = Math.max(1, (13 * 720) / (16 * w));
      var st = el('style', {}, svg);
      st.textContent = 'text{font-family:ui-sans-serif,system-ui,sans-serif;font-size:' + (16 * k) + 'px;fill:#a9b3c1;paint-order:stroke;stroke:#0a0e14;stroke-width:' + (6 * k) + 'px;stroke-linejoin:round}text.hi{fill:#ffb54a}text.w{fill:#eef1f5}text.m{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:' + (15 * k) + 'px}';
      var P = iterates(n), qq = q();
      // path of passes
      var d = 'M' + P.map(function (p) { return p.x.toFixed(1) + ' ' + p.y.toFixed(1); }).join(' L');
      el('path', { d: d, fill: 'none', stroke: '#4f5d70', 'stroke-width': 1.4 }, svg);
      for (var i = 0; i < P.length - 1; i++) el('circle', { cx: P[i].x, cy: P[i].y, r: 3.2, fill: '#6f7d90' }, svg);
      var cur = P[P.length - 1], prev = P[P.length - 2];
      var last = Math.hypot(cur.x - prev.x, cur.y - prev.y);
      var R = qq / (1 - qq) * last;
      // the guarantee ball
      el('circle', { cx: cur.x, cy: cur.y, r: R, fill: 'rgba(255,181,74,.07)', stroke: '#ffb54a', 'stroke-width': 1.6, 'stroke-dasharray': '6 6' }, svg);
      // last change
      el('line', { x1: prev.x, y1: prev.y, x2: cur.x, y2: cur.y, stroke: '#eef1f5', 'stroke-width': 2, 'marker-end': 'url(#cah)' }, svg);
      // final answer
      el('circle', { cx: FX, cy: FY, r: 6, fill: '#9fc3e6' }, svg);
      el('circle', { cx: FX, cy: FY, r: 11, fill: 'none', stroke: '#9fc3e6', 'stroke-width': 1, opacity: .6 }, svg);
      el('circle', { cx: cur.x, cy: cur.y, r: 5, fill: '#ffb54a' }, svg);
      // labels, kept clear of the action
      var L = 22 * k, x0 = 12 * k + 12;
      label(FX + 14 * k, FY - 14 * k, 'final answer', 'w');
      label(x0 + 12 * k, 34 * k, 'current answer', 'hi');
      label(x0 + 12 * k, 34 * k + L, 'last change', 'w');
      label(x0 + 12 * k, 34 * k + 2 * L, 'q/(1−q) × last change', 'hi m');
      el('circle', { cx: x0, cy: 29 * k, r: 4.5 * k, fill: '#ffb54a' }, svg);
      el('line', { x1: x0 - 6 * k, y1: 29 * k + L, x2: x0 + 6 * k, y2: 29 * k + L, stroke: '#eef1f5', 'stroke-width': 2 * k }, svg);
      el('circle', { cx: x0, cy: 29 * k + 2 * L, r: 6 * k, fill: 'none', stroke: '#ffb54a', 'stroke-dasharray': '3 3', 'stroke-width': k }, svg);
      step.textContent = n >= MAXN ? 'Start again' : 'One more pass';
    }
    function advance() { if (n >= MAXN) n = START; else n++; draw(); }
    step.addEventListener('click', function () { stopAuto(); advance(); });
    reset.addEventListener('click', function () { stopAuto(); n = START; draw(); });
    qIn.addEventListener('input', function () { stopAuto(); draw(); });
    function stopAuto() { if (auto) { clearInterval(auto); auto = null; } }
    draw();
    var rw = 0; addEventListener('resize', function () { var w = svg.getBoundingClientRect().width; if (Math.abs(w - rw) > 20) { rw = w; draw(); } });
    // Autoplay a slow loop while the figure is on screen, until the reader touches a control.
    if (!still && 'IntersectionObserver' in window) {
      var touched = false;
      [step, reset, qIn].forEach(function (b) { b.addEventListener('pointerdown', function () { touched = true; }); });
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting && !touched && !auto) auto = setInterval(function () { if (!document.hidden) advance(); }, 1100);
          else if (!e.isIntersecting) stopAuto();
        });
      }, { threshold: 0.5 }).observe(svg);
    }
  })();

  /* ---------- 3. Fig. 3: saddle flow lines ---------- */
  (function saddle() {
    var g = document.getElementById('saddle-lines');
    if (!g) return;
    var cx = 250, cy = 190, UMAX = 200, VMAX = 120;
    [700, 2000, 4400].forEach(function (c) {
      [1, -1].forEach(function (su) {
        [1, -1].forEach(function (sv) {
          var u0 = c / VMAX, pts = [];
          for (var i = 0; i <= 40; i++) {
            var u = u0 * Math.exp(Math.log(UMAX / u0) * i / 40), v = c / u;
            pts.push((cx + su * u).toFixed(1) + ' ' + (cy - sv * v).toFixed(1));
          }
          el('path', { d: 'M' + pts.join(' L'), stroke: '#4f5d70', 'stroke-width': 1.3, 'marker-end': 'url(#ah)', 'class': 'traj' }, g);
        });
      });
    });
    // Narrow screens: bigger labels, moved under the drawing (colour ties each pair to its axis).
    var svg = document.getElementById('saddle'), T = svg.querySelectorAll('text');
    var wide = [[476, 186], [476, 208], [262, 46], [262, 68]], narrow = [[340, 392], [340, 422], [30, 392], [30, 422]];
    function lay() {
      var w = svg.getBoundingClientRect().width || 640, nar = w < 520;
      svg.setAttribute('viewBox', nar ? '0 0 640 440' : '0 0 640 380');
      for (var i = 0; i < T.length; i++) {
        var xy = (nar ? narrow : wide)[i];
        T[i].setAttribute('x', xy[0]); T[i].setAttribute('y', xy[1]);
        T[i].setAttribute('font-size', nar ? Math.max(17, 13 * 640 / w) : 17);
      }
    }
    lay(); addEventListener('resize', lay);
  })();
})();
