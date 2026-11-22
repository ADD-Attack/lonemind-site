// Living background: a slowly turning 3D web of threads, lit toward the pointer.
// Decorative only. It is static under prefers-reduced-motion and pauses when the tab is hidden.
const c = document.getElementById('web');
const ctx = c.getContext('2d');
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const RINGS = 7, SPOKES = 14;
const pts = [];
for (let r = 1; r <= RINGS; r++)
  for (let s = 0; s < SPOKES; s++) {
    const a = (s / SPOKES) * Math.PI * 2 + r * 0.04;
    const rad = r / RINGS;
    pts.push({ x: Math.cos(a) * rad, y: Math.sin(a) * rad, z: Math.sin(r * 1.3 + s) * 0.12, r, s });
  }
let w, hgt, dpr, mx = 0.6, my = 0.4, t = 0;
function size() {
  dpr = Math.min(devicePixelRatio || 1, 2);
  w = c.width = innerWidth * dpr; hgt = c.height = innerHeight * dpr;
}
function proj(p, rotY, rotX) {
  let x = p.x * Math.cos(rotY) + p.z * Math.sin(rotY), z = -p.x * Math.sin(rotY) + p.z * Math.cos(rotY);
  let y = p.y * Math.cos(rotX) - z * Math.sin(rotX); z = p.y * Math.sin(rotX) + z * Math.cos(rotX);
  const scale = Math.max(w, hgt) * 0.62, persp = 2.4 / (2.4 + z);
  return [w * 0.72 + x * scale * persp, hgt * 0.42 + y * scale * persp, persp];
}
function frame() {
  ctx.clearRect(0, 0, w, hgt);
  const rotY = 0.5 + Math.sin(t * 0.00011) * 0.35 + (mx - 0.5) * 0.3;
  const rotX = 0.35 + Math.cos(t * 0.00009) * 0.2 + (my - 0.5) * 0.2;
  const P = pts.map((p) => {
    const q = { ...p, z: p.z + Math.sin(t * 0.0006 + p.r * 0.9 + p.s) * 0.03 };
    return proj(q, rotY, rotX);
  });
  const lx = mx * w, ly = my * hgt;
  ctx.lineWidth = dpr;
  const line = (a, b) => {
    const d = Math.hypot((a[0] + b[0]) / 2 - lx, (a[1] + b[1]) / 2 - ly) / Math.max(w, hgt);
    const glow = Math.max(0, 0.5 - d) * 0.5;
    ctx.strokeStyle = `rgba(232,180,74,${(0.05 + glow) * a[2]})`;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  };
  for (let r = 0; r < RINGS; r++)
    for (let s = 0; s < SPOKES; s++) {
      const i = r * SPOKES + s;
      line(P[i], P[r * SPOKES + ((s + 1) % SPOKES)]);       // ring thread
      if (r < RINGS - 1) line(P[i], P[i + SPOKES]);        // spoke thread
    }
}
function loop(ts) {
  t = ts; frame();
  if (!reduce.matches && !document.hidden) requestAnimationFrame(loop);
}
size(); frame();
addEventListener('resize', () => { size(); frame(); });
addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth; my = e.clientY / innerHeight; if (reduce.matches) frame(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden && !reduce.matches) requestAnimationFrame(loop); });
if (!reduce.matches) requestAnimationFrame(loop);
