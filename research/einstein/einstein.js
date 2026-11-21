/* Einstein setup page. Background: a tilted field of nested light rings settling onto one circle (schematic, not data). Foreground: ticket stepper. */
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  (function bg() {
    var c = document.getElementById('bg'); if (!c || !c.getContext) return;
    var x = c.getContext('2d'), W, H, dpr, t = 0, tx = 0, ty = 0, mx = 0, my = 0;
    var N = 900, P = [];
    function size() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = c.width = Math.round(innerWidth * dpr); H = c.height = Math.round(innerHeight * dpr);
      c.style.width = innerWidth + 'px'; c.style.height = innerHeight + 'px';
    }
    // each particle lives on ring k: radius R*(1 + 0.9*0.5^k), so rings crowd onto the critical circle
    for (var i = 0; i < N; i++) {
      var k = Math.floor(Math.pow(Math.random(), 1.6) * 7);
      P.push({ k: k, a: Math.random() * 6.283, s: (0.0006 + Math.random() * 0.0012) * (k % 2 ? -1 : 1), j: (Math.random() - 0.5) * 0.04, z: (Math.random() - 0.5) * 0.06 });
    }
    function frame(adv) {
      if (adv) { t += 1; mx += (tx - mx) * 0.03; my += (ty - my) * 0.03; }
      x.clearRect(0, 0, W, H);
      var cx = W * (innerWidth > 900 ? 0.76 : 0.5), cy = H * (innerWidth > 900 ? 0.45 : 0.32);
      var R = Math.min(W, H) * (innerWidth > 900 ? 0.24 : 0.3);
      var tilt = 1.05 + my * 0.5, spin = t * 0.0009 + mx * 0.8;
      var ct = Math.cos(tilt), st = Math.sin(tilt), cs = Math.cos(spin), ss = Math.sin(spin);
      // dark core
      var g = x.createRadialGradient(cx, cy, 0, cx, cy, R * 1.1);
      g.addColorStop(0, 'rgba(0,0,0,0.9)'); g.addColorStop(0.8, 'rgba(0,0,0,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.beginPath(); x.arc(cx, cy, R * 1.1, 0, 6.283); x.fill();
      x.globalCompositeOperation = 'lighter';
      for (var i = 0; i < N; i++) {
        var p = P[i]; if (adv) p.a += p.s * (1 + 3 / (1 + p.k));
        var r = R * (1 + 0.9 * Math.pow(0.5, p.k) + p.j);
        var px = Math.cos(p.a) * r, py = Math.sin(p.a) * r, pz = p.z * R;
        var X = px * cs - py * ss, Y = px * ss + py * cs;
        var Y2 = Y * ct - pz * st, Z = Y * st + pz * ct;
        var f = 1 / (1 + Z / (R * 4));
        var sx = cx + X * f, sy = cy + Y2 * f;
        var warm = p.k > 2;
        var al = (0.18 + 0.5 * (p.k / 7)) * f * (Z < 0 ? 1 : 0.55);
        x.fillStyle = warm ? 'rgba(255,181,74,' + al.toFixed(3) + ')' : 'rgba(150,190,235,' + (al * 0.8).toFixed(3) + ')';
        var sz = (warm ? 1.6 : 1.2) * dpr * f;
        x.fillRect(sx, sy, sz, sz);
      }
      // the critical circle
      x.strokeStyle = 'rgba(255,200,120,0.22)'; x.lineWidth = 1.2 * dpr; x.beginPath();
      for (var a = 0; a <= 6.3; a += 0.05) {
        var X1 = Math.cos(a) * R, Y1 = Math.sin(a) * R, Xr = X1 * cs - Y1 * ss, Yr = X1 * ss + Y1 * cs;
        var Zr = Yr * st, f1 = 1 / (1 + Zr / (R * 4)), qx = cx + Xr * f1, qy = cy + Yr * ct * f1;
        a ? x.lineTo(qx, qy) : x.moveTo(qx, qy);
      }
      x.stroke();
      x.globalCompositeOperation = 'source-over';
    }
    size(); frame(false);
    addEventListener('resize', function () { size(); frame(false); });
    addEventListener('pointermove', function (e) { tx = e.clientX / innerWidth - 0.5; ty = e.clientY / innerHeight - 0.5; }, { passive: true });
    if (reduce) return;
    (function loop() { if (!document.hidden) frame(true); requestAnimationFrame(loop); })();
  })();

  (function walk() {
    var tabs = [].slice.call(document.querySelectorAll('.walk-tabs [role=tab]')); if (!tabs.length) return;
    var rail = document.getElementById('rail'), cur = 0;
    var prev = document.getElementById('w-prev'), next = document.getElementById('w-next');
    function show(i, focus) {
      cur = (i + tabs.length) % tabs.length;
      tabs.forEach(function (t, j) {
        var on = j === cur; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
      rail.style.width = ((cur + 1) / tabs.length * 100).toFixed(1) + '%';
      next.textContent = cur === tabs.length - 1 ? 'Start again ↺' : 'Next stage →';
      prev.disabled = cur === 0;
      if (focus) tabs[cur].focus();
    }
    tabs.forEach(function (t, j) {
      t.addEventListener('click', function () { show(j); });
      t.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { e.preventDefault(); show(cur + 1, true); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); show(cur - 1, true); }
      });
    });
    next.addEventListener('click', function () { show(cur + 1); });
    prev.addEventListener('click', function () { show(cur - 1); });
    show(0);
  })();
})();
