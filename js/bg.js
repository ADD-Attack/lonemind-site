// Living background: one warm mind inside a faint shell; the world's dust drifts outside it.
// School pages (data-scene="school") show nine small minds orbiting a shared bell.
// Vendored three.js only. Reduced motion: one still frame. Hidden tab: paused.
import * as THREE from '../vendor/three.module.js';

const canvas = document.getElementById('bg');
const scene = document.body.getAttribute('data-scene') || 'home';
const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches || /[?&]still\b/.test(location.search);

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,240,210,1)');
  r.addColorStop(0.18, 'rgba(255,190,90,.85)');
  r.addColorStop(0.45, 'rgba(255,150,50,.22)');
  r.addColorStop(1, 'rgba(255,140,40,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function init() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
  } catch (e) { canvas.remove(); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x06080c, 1);
  document.documentElement.classList.add('has-webgl');

  const sc = new THREE.Scene();
  sc.fog = new THREE.FogExp2(0x06080c, 0.035);
  const cam = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  cam.position.set(0, 0, 14);

  const glow = glowTexture();
  const root = new THREE.Group(); sc.add(root);

  // The mind
  function mind(size, bright) {
    const g = new THREE.Group();
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(size, 1),
      new THREE.MeshBasicMaterial({ color: 0xffe2b0, fog: false }));
    const lattice = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(size * 1.7, 1)),
      new THREE.LineBasicMaterial({ color: 0xffb54a, transparent: true, opacity: 0.7 * bright, fog: false }));
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xffffff, transparent: true,
      opacity: 0.9 * bright, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    halo.scale.setScalar(size * 9);
    g.add(halo, core, lattice);
    g.userData = { core, lattice, halo };
    return g;
  }

  const minds = [];
  let shell = null;
  if (scene === 'school') {
    const hub = mind(0.35, 0.8); root.add(hub); minds.push(hub);
    for (let i = 0; i < 9; i++) {
      const m = mind(0.22, 0.75);
      const a = (i / 9) * Math.PI * 2;
      m.userData.orbit = { a, r: 4.2 + (i % 3) * 0.9, y: (i % 3 - 1) * 0.9, s: 0.06 + (i % 4) * 0.012 };
      root.add(m); minds.push(m);
    }
    const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: 160 }, (_, i) => { const a = i / 160 * Math.PI * 2; return new THREE.Vector3(Math.cos(a) * 5.1, 0, Math.sin(a) * 5.1); })),
      new THREE.LineBasicMaterial({ color: 0x5a6b80, transparent: true, opacity: 0.35 }));
    root.add(ring);
    root.rotation.x = 0.42;
  } else {
    const m = mind(0.6, 1); root.add(m); minds.push(m);
    shell = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.SphereGeometry(3.4, 28, 18)),
      new THREE.LineBasicMaterial({ color: 0x4d5f75, transparent: true, opacity: 0.14 }));
    root.add(shell);
  }

  // The world outside: dust that never enters the shell
  const N = 1400, pos = new Float32Array(N * 3), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    let x, y, z, d;
    do { x = (Math.random() * 2 - 1) * 26; y = (Math.random() * 2 - 1) * 16; z = (Math.random() * 2 - 1) * 20 - 4; d = Math.hypot(x, y, z); } while (d < 4.6);
    pos.set([x, y, z], i * 3); seed[i] = Math.random();
  }
  const dustG = new THREE.BufferGeometry();
  dustG.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(dustG, new THREE.PointsMaterial({ color: 0x8fa6c2, size: 0.06, transparent: true, opacity: 0.7, depthWrite: false }));
  sc.add(dust);

  let w = 0, h = 0;
  function resize() {
    w = window.innerWidth; h = window.innerHeight;
    renderer.setSize(w, h, false);
    cam.aspect = w / h;
    // keep the mind to the right on wide screens, centred-high on phones
    const wide = w / h > 1.1;
    root.position.set(wide ? (scene === 'school' ? 6.2 : 4.2) : 0, wide ? 0.2 : 2.4, 0);
    cam.fov = wide ? 45 : 58;
    cam.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  let mx = 0, my = 0, tx = 0, ty = 0;
  window.addEventListener('pointermove', e => { tx = e.clientX / w - 0.5; ty = e.clientY / h - 0.5; }, { passive: true });

  const clock = new THREE.Clock();
  let t = 4.0;
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    t += dt;
    mx += (tx - mx) * 0.04; my += (ty - my) * 0.04;
    const sy = window.scrollY / Math.max(1, h);
    cam.position.x = mx * 1.6; cam.position.y = -my * 1.0 - sy * 0.8;
    cam.lookAt(root.position.x * 0.6, root.position.y * 0.6 - sy * 0.8, 0);

    minds.forEach((m, i) => {
      const u = m.userData, o = u.orbit;
      if (o) { const a = o.a + t * o.s; m.position.set(Math.cos(a) * o.r, o.y + Math.sin(t * 0.5 + i) * 0.15, Math.sin(a) * o.r); }
      u.lattice.rotation.y = t * 0.18 + i; u.lattice.rotation.x = t * 0.07;
      u.core.rotation.y = -t * 0.3;
      const pulse = 1 + Math.sin(t * 1.3 + i * 0.7) * 0.06;
      u.halo.scale.setScalar((o ? 0.22 : 0.6) * 9 * pulse);
    });
    if (shell) { shell.rotation.y = t * 0.03; shell.rotation.z = Math.sin(t * 0.1) * 0.05; }
    dust.rotation.y = t * 0.008; dust.position.y = Math.sin(t * 0.07) * 0.4;
    renderer.render(sc, cam);
  }

  if (still) { frame(); window.addEventListener('resize', frame); return; }
  let raf = 0;
  function loop() { frame(); raf = requestAnimationFrame(loop); }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf); else { clock.getDelta(); loop(); }
  });
  loop();
}

if (canvas) init();
