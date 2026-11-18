// TINY 2.1 runtime: plain JS, runs in the visitor's browser (or Node for parity tests). No server, no install.
// Port of upstream dos/TINY.C (WollyMonjac/Tiny-2.1 @ 4934844) step()/pick(creativity 0)/clean(), float32 with
// Math.fround after every float op, C loop order, int8 K/V cache with C's truncating (signed char) cast.
// Weights: TINY.BIN unmodified (MIT, (c) 2026 WollyMonjac). Same api as LoneMindMini: {load(arrayBuffer), answer(M, q)}.
(function (root) {
  const f = Math.fround, VOCAB = 97, CTX = 128, MAXQ = 72;
  function load(buf) {
    const u8 = new Uint8Array(buf), dv = new DataView(buf);
    if (String.fromCharCode(u8[0], u8[1], u8[2], u8[3]) !== "TNY2") throw new Error("not a TINY 2 file");
    const D = dv.getUint16(4, true), L = dv.getUint16(6, true), H = dv.getUint16(8, true), HID = dv.getUint16(10, true);
    let off = 12;
    function table(R, C) {
      const scale = new Float32Array(R), w = new Int8Array(R * C);
      for (let r = 0; r < R; r++) {
        scale[r] = dv.getFloat32(off, true); off += 4;
        for (let c = 0; c < C; c++) w[r * C + c] = dv.getInt8(off + c);
        off += C;
      }
      return { scale, w, R, C };
    }
    function gains() { const g = new Float32Array(D); for (let i = 0; i < D; i++) { g[i] = dv.getFloat32(off, true); off += 4; } return g; }
    const emb = table(VOCAB, D), pos = table(CTX, D), layers = [];
    for (let l = 0; l < L; l++) {
      const ly = { g1: gains() };
      ly.wq = table(D, D); ly.wk = table(D, D); ly.wv = table(D, D); ly.wo = table(D, D);
      ly.g2 = gains(); ly.f1 = table(HID, D); ly.f2 = table(D, HID);
      layers.push(ly);
    }
    const gf = gains();
    if (off !== buf.byteLength) throw new Error("TINY.BIN has the wrong size");
    return { a: { D, L, H, HID, HD: D / H, V: VOCAB, CTX }, attDiv: f(Math.sqrt(D / H)), emb, pos, layers, gf };
  }
  // C: s += w[c]*x[c] (int8 promoted to float, float mul, float add); y[r] = s*scale[r]
  function matvec(t, x, y) {
    const w = t.w, C = t.C;
    for (let r = 0, b = 0; r < t.R; r++, b += C) {
      let s = 0;
      for (let c = 0; c < C; c++) s = f(s + f(w[b + c] * x[c]));
      y[r] = f(s * t.scale[r]);
    }
  }
  // C: s = (float)(1.0/sqrt(s/D + 1e-5)) with s/D in float, the rest in double; y = (x*s)*g
  function norm(x, g, y, D) {
    let s = 0;
    for (let i = 0; i < D; i++) s = f(s + f(x[i] * x[i]));
    s = f(1.0 / Math.sqrt(f(s / D) + 1e-5));
    for (let i = 0; i < D; i++) y[i] = f(f(x[i] * s) * g[i]);
  }
  function safeExp(x) { return x < -60 ? 0 : f(Math.exp(x)); }
  function store(dst, o, src, D) {
    let big = 0;
    for (let i = 0; i < D; i++) { const v = src[i] < 0 ? -src[i] : src[i]; if (v > big) big = v; }
    if (big < f(1e-20)) big = f(1e-20);
    const k = f(127 / big);
    for (let i = 0; i < D; i++) { const v = f(src[i] * k); dst[o + i] = Math.trunc(v < 0 ? f(v - 0.5) : f(v + 0.5)); }
    return f(big / 127);
  }
  function newState(M) {
    const { D, L, HID } = M.a, st = { kc: [], vc: [], ks: [], vs: [] };
    for (let l = 0; l < L; l++) { st.kc.push(new Int8Array(CTX * D)); st.vc.push(new Int8Array(CTX * D)); st.ks.push(new Float32Array(CTX)); st.vs.push(new Float32Array(CTX)); }
    st.bx = new Float32Array(D); st.bh = new Float32Array(D); st.bq = new Float32Array(D); st.bt = new Float32Array(D);
    st.ba = new Float32Array(D); st.bm = new Float32Array(HID); st.bs = new Float32Array(CTX);
    return st;
  }
  function step(M, st, tok, p, score) {
    const { D, H, HD } = M.a, E = M.emb, P = M.pos, { bx, bh, bq, bt, ba, bm, bs } = st;
    const es = E.scale[tok], ps = P.scale[p];
    for (let i = 0; i < D; i++) bx[i] = f(f(E.w[tok * D + i] * es) + f(P.w[p * D + i] * ps));
    for (let l = 0; l < M.layers.length; l++) {
      const ly = M.layers[l], kc = st.kc[l], vc = st.vc[l], ks = st.ks[l], vs = st.vs[l];
      norm(bx, ly.g1, bh, D);
      matvec(ly.wk, bh, bt); ks[p] = store(kc, p * D, bt, D);
      matvec(ly.wv, bh, bt); vs[p] = store(vc, p * D, bt, D);
      matvec(ly.wq, bh, bq);
      for (let h = 0; h < H; h++) {
        const ho = h * HD;
        let big = f(-1e30);
        for (let j = 0; j <= p; j++) {
          const kp = j * D + ho; let s = 0;
          for (let i = 0; i < HD; i++) s = f(s + f(bq[ho + i] * kc[kp + i]));
          s = f(f(s * ks[j]) / M.attDiv);
          bs[j] = s; if (s > big) big = s;
        }
        let sum = 0;
        for (let j = 0; j <= p; j++) { bs[j] = safeExp(f(bs[j] - big)); sum = f(sum + bs[j]); }
        for (let i = 0; i < HD; i++) ba[ho + i] = 0;
        for (let j = 0; j <= p; j++) {
          if (bs[j] === 0) continue;
          const vp = j * D + ho, s = f(f(bs[j] * vs[j]) / sum);
          for (let i = 0; i < HD; i++) ba[ho + i] = f(ba[ho + i] + f(s * vc[vp + i]));
        }
      }
      matvec(ly.wo, ba, bt);
      for (let i = 0; i < D; i++) bx[i] = f(bx[i] + bt[i]);
      norm(bx, ly.g2, bh, D);
      matvec(ly.f1, bh, bm);
      for (let i = 0; i < bm.length; i++) if (bm[i] < 0) bm[i] = 0;
      matvec(ly.f2, bm, bt);
      for (let i = 0; i < D; i++) bx[i] = f(bx[i] + bt[i]);
    }
    norm(bx, M.gf, bh, D);
    matvec(E, bh, score);
  }
  // TINY.C clean(): keep 32..126, stop after 72 kept, strip trailing spaces, lowercase if caps and no lowercase
  function clean(line) {
    let q = "";
    for (let i = 0; i < line.length && q.length < MAXQ; i++) { const c = line.charCodeAt(i); if (c >= 32 && c <= 126) q += line[i]; }
    q = q.replace(/ +$/, "");
    if (/[A-Z]/.test(q) && !/[a-z]/.test(q)) q = q.toLowerCase();
    return q;
  }
  function answer(M, question) {
    const q = clean(question), prompt = [];
    for (let i = 0; i < q.length; i++) prompt.push(q.charCodeAt(i) - 30);
    prompt.push(1);
    const st = newState(M), lg = new Float32Array(VOCAB), ids = [], steps = [];
    let p = 0, out = "";
    for (const t of prompt) step(M, st, t, p++, lg);
    const step0 = Array.from(lg);
    for (;;) {
      let b = 0; for (let v = 1; v < VOCAB; v++) if (lg[v] > lg[b]) b = v;   // greedy, first max wins
      steps.push({ top1: b, logit: lg[b] });              // last step = the stop token, or the p=128 cap
      if (p >= CTX || b <= 1) break;
      ids.push(b); out += String.fromCharCode(b + 30);
      step(M, st, b, p++, lg);
    }
    answer.last = { ids, prompt, step0, steps, cleaned: q };
    return out;
  }
  const api = { load, answer, clean };
  if (typeof module !== "undefined") module.exports = api; else root.Tiny21 = api;
})(typeof window !== "undefined" ? window : this);
