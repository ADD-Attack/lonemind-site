// LoneMind Mini runtime: plain JS, runs in the visitor's browser (or Node for parity tests). No server, no install.
// Port of Einstein's train_mm.py Tiny.forward + answer(), shipped int2 weights, KV int8 rounding (the "shipped" config).
(function (root) {
  const CODES = [-1.5, -0.5, 0.5, 1.5];
  function load(buf) {
    const u8 = new Uint8Array(buf), dv = new DataView(buf);
    if (String.fromCharCode(...u8.slice(0, 4)) !== "LMM1") throw new Error("not a LoneMind Mini file");
    const hl = dv.getUint32(4, true), hdr = JSON.parse(new TextDecoder().decode(u8.slice(8, 8 + hl))), base = 8 + hl, T = {};
    for (const t of hdr.tensors) {
      if (t.kind === "g") { T[t.name] = new Float32Array(buf.slice(base + t.off, base + t.off + 4 * t.shape[0])); continue; }
      const [R, C] = t.shape, sc = new Float32Array(buf.slice(base + t.off, base + t.off + 4 * R)), w = new Float32Array(R * C);
      const cb = base + t.codes_off;
      for (let i = 0; i < R * C; i++) { const c = (u8[cb + (i >> 2)] >> (2 * (i & 3))) & 3; w[i] = Math.fround(CODES[c] * sc[Math.floor(i / C)]); }
      T[t.name] = { w, R, C };
    }
    return { a: hdr.arch, T };
  }
  const f = Math.fround;
  function rms(x, g, D) { let s = 0; for (let i = 0; i < D; i++) s += x[i] * x[i]; const r = f(1 / Math.sqrt(f(s / D) + 1e-5)); const o = new Float32Array(D); for (let i = 0; i < D; i++) o[i] = f(f(x[i] * r) * g[i]); return o; }
  function mv(W, x) { const o = new Float32Array(W.R); for (let r = 0; r < W.R; r++) { let s = 0; const b = r * W.C; for (let c = 0; c < W.C; c++) s += W.w[b + c] * x[c]; o[r] = s; } return o; }
  function kvround(t) { let m = 0; for (const v of t) m = Math.max(m, Math.abs(v)); const sc = f(Math.max(m, 1e-20) / 127); const o = new Float32Array(t.length); for (let i = 0; i < t.length; i++) { const x = f(t[i] / sc); o[i] = f(Math.trunc(x < 0 ? f(x - 0.5) : f(x + 0.5)) * sc); } return o; }
  // One causal step with a per-layer K/V cache (identical math to the full causal forward: each position only sees <= itself).
  function step(M, cache, t, p) {
    const { D, L, H, V } = M.a, T = M.T, hd = D / H, E = T.emb, P = T.pos;
    let z = new Float32Array(D); for (let i = 0; i < D; i++) z[i] = f(E.w[t * D + i] + P.w[p * D + i]);
    for (let l = 0; l < L; l++) {
      const pre = "ls." + l + ".", h = rms(z, T[pre + "n1"], D), C = cache[l];
      C.K.push(kvround(mv(T[pre + "k"], h))); C.V.push(kvround(mv(T[pre + "v"], h))); const q = mv(T[pre + "q"], h);
      const att = new Float32Array(D), n = C.K.length;
      for (let hh = 0; hh < H; hh++) {
        const o0 = hh * hd, sc = new Float64Array(n); let mx = -Infinity;
        for (let j = 0; j < n; j++) { let s = 0; const k = C.K[j]; for (let i = 0; i < hd; i++) s += q[o0 + i] * k[o0 + i]; s /= Math.sqrt(hd); sc[j] = s; if (s > mx) mx = s; }
        let den = 0; for (let j = 0; j < n; j++) { sc[j] = Math.exp(sc[j] - mx); den += sc[j]; }
        for (let i = 0; i < hd; i++) { let s = 0; for (let j = 0; j < n; j++) s += sc[j] * C.V[j][o0 + i]; att[o0 + i] = s / den; }
      }
      const ao = mv(T[pre + "o"], att), x = new Float32Array(D); for (let i = 0; i < D; i++) x[i] = f(z[i] + ao[i]);
      const a1 = mv(T[pre + "f1"], rms(x, T[pre + "n2"], D)); for (let i = 0; i < a1.length; i++) a1[i] = Math.max(0, a1[i]);
      const a2 = mv(T[pre + "f2"], a1); for (let i = 0; i < D; i++) x[i] = f(x[i] + a2[i]); z = x;
    }
    const hf = rms(z, T.nf, D), lg = new Float32Array(V);
    for (let v = 0; v < V; v++) { let s = 0; for (let i = 0; i < D; i++) s += hf[i] * E.w[v * D + i]; lg[v] = s; }
    return lg;
  }
  const enc = s => [...s].map(c => c.charCodeAt(0)).filter(c => c >= 32 && c <= 126).map(c => c - 30);
  function answer(M, q, maxn = 58) {
    const seq = enc(q).slice(0, 72); seq.push(1); let out = ""; const ids = [];
    const cache = Array.from({ length: M.a.L }, () => ({ K: [], V: [] }));
    let lg; for (let p = 0; p < seq.length; p++) lg = step(M, cache, seq[p], p);
    for (let k = 0; k < maxn; k++) {
      let b = 0; for (let v = 1; v < lg.length; v++) if (lg[v] > lg[b]) b = v;
      if (b <= 1 || seq.length >= M.a.CTX) break; seq.push(b); ids.push(b); out += String.fromCharCode(b + 30);
      lg = step(M, cache, b, seq.length - 1);
    }
    answer.last = { ids, prompt: seq.slice(0, seq.length - ids.length) };
    return out;
  }
  const api = { load, answer };
  if (typeof module !== "undefined") module.exports = api; else root.LoneMindMini = api;
})(this);
