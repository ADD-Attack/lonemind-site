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
  // LMPK v1 (bit-packed, Einstein's lonemind-6models-packs): 32-byte header (magic, u16 ver, bits, V, D, L, H, KVH, HID, CTX, REUSE),
  // then emb, pos, per layer [n1.g q k v o n2.g f1 f2], nf.g. Table row = f32 scale + ceil(cols*bits/8) bytes of codes (low bits first), row stride padded to 4 bytes.
  function loadPK(buf, opts) {
    const tf = !!(opts && opts.decoder === 'torchf32');   // torch-f32-faithful decoder: tables and gains rounded to float32 like the trainer's torch run
    const u8 = new Uint8Array(buf), dv = new DataView(buf);
    if (String.fromCharCode(u8[0], u8[1], u8[2], u8[3]) !== "LMPK") throw new Error("not an LMPK file");
    const u = i => dv.getUint16(4 + 2 * i, true), ver = u(0), bits = u(1);
    if (ver !== 1) throw new Error("unsupported LMPK version " + ver);
    const a = { V: u(2), D: u(3), L: u(4), H: u(5), KVH: u(6), HID: u(7), CTX: u(8), reuse: u(9), bits };
    const { D, L, H, KVH, HID, V, CTX } = a, hd = D / H, KV = KVH * hd;
    let off = 32; const T = {};
    // Tables are held as float64: level * row scale, not rounded to float32 (the pack's reference.py in float64, "what a plain JS Number port computes").
    function table(name, R, C) {
      const w = new Float64Array(R * C), cb = Math.ceil(C * bits / 8);
      for (let r = 0; r < R; r++) {
        const sc = dv.getFloat32(off, true); off += 4;
        for (let c = 0; c < C; c++) {
          if (bits === 2) w[r * C + c] = tf ? Math.fround((((u8[off + (c >> 2)] >> (2 * (c & 3))) & 3) - 1.5) * sc) : (((u8[off + (c >> 2)] >> (2 * (c & 3))) & 3) - 1.5) * sc;
          else if (bits === 8) w[r * C + c] = tf ? Math.fround(dv.getInt8(off + c) * sc) : dv.getInt8(off + c) * sc;
          else throw new Error("unsupported bits " + bits);
        }
        off += ((4 + cb + 3) & ~3) - 4;   // row stride = scale + codes, padded to a multiple of 4 bytes
      }
      T[name] = { w, R, C };
    }
    function gains(name, n) { const g = new Float64Array(n); for (let i = 0; i < n; i++) { g[i] = dv.getFloat32(off, true); off += 4; } T[name] = g; }
    table("emb", V, D); table("pos", CTX, D);
    for (let l = 0; l < L; l++) {
      const p = "ls." + l + ".";
      gains(p + "n1", D); table(p + "q", D, D); table(p + "k", KV, D); table(p + "v", KV, D); table(p + "o", D, D);
      gains(p + "n2", D); table(p + "f1", HID, D); table(p + "f2", D, HID);
    }
    gains("nf", D);
    if (off !== buf.byteLength) throw new Error("LMPK size mismatch: parsed " + off + " of " + buf.byteLength);
    return { a, T, pk: true, tf };
  }
  // reference.py (float64) step, op for op: rms, GQA attention with int8-rounded K/V per vector, ReLU FFN, tied head.
  function mvd(W, x, o) { const C = W.C, w = W.w; for (let r = 0, b = 0; r < W.R; r++, b += C) { let s = 0; for (let c = 0; c < C; c++) s += w[b + c] * x[c]; o[r] = s; } return o; }
  function rmsd(x, g, D) { let s = 0; for (let i = 0; i < D; i++) s += x[i] * x[i]; const r = 1 / Math.sqrt(s / D + 1e-5), o = new Float64Array(D); for (let i = 0; i < D; i++) o[i] = x[i] * r * g[i]; return o; }
  function kvqd(t) { let m = 0; for (let i = 0; i < t.length; i++) { const v = Math.abs(t[i]); if (v > m) m = v; } const sc = Math.max(m, 1e-20) / 127; for (let i = 0; i < t.length; i++) { const x = t[i] / sc; t[i] = Math.trunc(x < 0 ? x - 0.5 : x + 0.5) * sc; } return t; }
  function stepPK(M, cache, t, p) {
    const { D, L, H, V, KVH, HID } = M.a, T = M.T, hd = D / H, R = M.a.reuse || 1, grp = H / KVH, kvd = hd * KVH, isq = 1 / Math.sqrt(hd), E = T.emb, P = T.pos;
    let x = new Float64Array(D); for (let i = 0; i < D; i++) x[i] = E.w[t * D + i] + P.w[p * D + i];
    for (let pass = 0; pass < L * R; pass++) {
      const pre = "ls." + Math.floor(pass / R) + ".", h = rmsd(x, T[pre + "n1"], D), C = cache[pass];
      const q = mvd(T[pre + "q"], h, new Float64Array(D));
      C.K[p] = kvqd(mvd(T[pre + "k"], h, new Float64Array(kvd))); C.V[p] = kvqd(mvd(T[pre + "v"], h, new Float64Array(kvd)));
      const a = new Float64Array(D), n = p + 1, sc = new Float64Array(n);
      for (let hh = 0; hh < H; hh++) {
        const o0 = hh * hd, g0 = Math.floor(hh / grp) * hd; let mx = -Infinity;
        for (let j = 0; j < n; j++) { const k = C.K[j]; let s = 0; for (let i = 0; i < hd; i++) s += k[g0 + i] * q[o0 + i]; s *= isq; sc[j] = s; if (s > mx) mx = s; }
        let den = 0; for (let j = 0; j < n; j++) { sc[j] = Math.exp(sc[j] - mx); den += sc[j]; }
        for (let i = 0; i < hd; i++) { let s = 0; for (let j = 0; j < n; j++) s += (sc[j] / den) * C.V[j][g0 + i]; a[o0 + i] = s; }
      }
      const ao = mvd(T[pre + "o"], a, new Float64Array(D)); for (let i = 0; i < D; i++) x[i] += ao[i];
      const f1 = mvd(T[pre + "f1"], rmsd(x, T[pre + "n2"], D), new Float64Array(HID)); for (let i = 0; i < HID; i++) if (f1[i] < 0) f1[i] = 0;
      const f2 = mvd(T[pre + "f2"], f1, new Float64Array(D)); for (let i = 0; i < D; i++) x[i] += f2[i];
    }
    const hf = rmsd(x, T.nf, D), lg = new Float64Array(V); return mvd(E, hf, lg);
  }
  const f = Math.fround;
  function rms(x, g, D) { let s = 0; for (let i = 0; i < D; i++) s += x[i] * x[i]; const r = f(1 / Math.sqrt(f(s / D) + 1e-5)); const o = new Float32Array(D); for (let i = 0; i < D; i++) o[i] = f(f(x[i] * r) * g[i]); return o; }
  function mv(W, x) { const o = new Float32Array(W.R); for (let r = 0; r < W.R; r++) { let s = 0; const b = r * W.C; for (let c = 0; c < W.C; c++) s += W.w[b + c] * x[c]; o[r] = s; } return o; }
  function kvround(t) { let m = 0; for (const v of t) m = Math.max(m, Math.abs(v)); const sc = f(Math.max(m, 1e-20) / 127); const o = new Float32Array(t.length); for (let i = 0; i < t.length; i++) { const x = f(t[i] / sc); o[i] = f(Math.trunc(x < 0 ? f(x - 0.5) : f(x + 0.5)) * sc); } return o; }
  // One causal step with a per-layer K/V cache (identical math to the full causal forward: each position only sees <= itself).
  function step(M, cache, t, p) {
    const { D, L, H, V } = M.a, T = M.T, hd = D / H, E = T.emb, P = T.pos;
    const KVH = M.a.KVH || H, R = M.a.reuse || 1, rep = H / KVH;   // GQA: KVH key/value heads shared by H query heads; reuse: each block applied R times (shared weights, own KV per pass)
    let z = new Float32Array(D); for (let i = 0; i < D; i++) z[i] = f(E.w[t * D + i] + P.w[p * D + i]);
    for (let pass = 0; pass < L * R; pass++) {
      const l = Math.floor(pass / R);
      const pre = "ls." + l + ".", h = rms(z, T[pre + "n1"], D), C = cache[pass];
      C.K.push(kvround(mv(T[pre + "k"], h))); C.V.push(kvround(mv(T[pre + "v"], h))); const q = mv(T[pre + "q"], h);
      const att = new Float32Array(D), n = C.K.length;
      for (let hh = 0; hh < H; hh++) {
        const o0 = hh * hd, g0 = Math.floor(hh / rep) * hd, sc = new Float64Array(n); let mx = -Infinity;
        for (let j = 0; j < n; j++) { let s = 0; const k = C.K[j]; for (let i = 0; i < hd; i++) s += q[o0 + i] * k[g0 + i]; s /= Math.sqrt(hd); sc[j] = s; if (s > mx) mx = s; }
        let den = 0; for (let j = 0; j < n; j++) { sc[j] = Math.exp(sc[j] - mx); den += sc[j]; }
        for (let i = 0; i < hd; i++) { let s = 0; for (let j = 0; j < n; j++) s += sc[j] * C.V[j][g0 + i]; att[o0 + i] = s / den; }
      }
      const ao = mv(T[pre + "o"], att), x = new Float32Array(D); for (let i = 0; i < D; i++) x[i] = f(z[i] + ao[i]);
      const a1 = mv(T[pre + "f1"], rms(x, T[pre + "n2"], D)); for (let i = 0; i < a1.length; i++) a1[i] = Math.max(0, a1[i]);
      const a2 = mv(T[pre + "f2"], a1); for (let i = 0; i < D; i++) x[i] = f(x[i] + a2[i]); z = x;
    }
    const hf = rms(z, T.nf, D), lg = new Float32Array(V);
    for (let v = 0; v < V; v++) { let s = 0; for (let i = 0; i < D; i++) s += hf[i] * E.w[v * D + i]; lg[v] = s; }
    return lg;
  }

  // ---- torch-f32-faithful decoder (pack of record's reference.py generate_torchf32), ported op for op. ----
  // The checkpoint record was made by PyTorch CPU float32 (full-sequence forward per step). Every value is rounded to float32 after each op
  // (Math.fround); a*b+c of float32 inputs is formed in float64 (the product is exact) and rounded once, as the reference does.
  // Caching: attention row r depends on the sequence length n only through the exp chunking (columns < 8*floor(n/8) use exp_u20, the tail uses expf),
  // so rows below 8*floor(n/8) are final and are kept; only the last 1..15 rows are recomputed each step. (n <= CTX <= 192, one sgemm K-block in P.V.)
  const U32 = new Uint32Array(1), F32 = new Float32Array(U32.buffer), fu = h => (U32[0] = h, F32[0]);
  const EC = [0.999999701, 0.499991506, 0.166676521, 0.0418978221, 0.00828929059].map(f), L2E = fu(0x3fb8aa3b), LN2 = fu(0x3f317218), LMIN = fu(0xc2aeac50), LMAX = fu(0x42b17218), EPS = f(1e-5);
  function expu20(x) {
    const small = x < LMIN, s = Math.max(Math.min(x, LMAX), LMIN), fx = Math.floor(f(s * L2E + 0.5)), p = f(s - fx * LN2);
    let r = f(p * EC[4] + EC[3]); r = f(p * r + EC[2]); r = f(p * r + EC[1]); r = f(p * r + EC[0]); r = f(p * r + 1);
    return small ? 0 : f(f(r * Math.pow(2, fx - 1)) * 2);
  }
  // sequential-FMA matvec, MKL sgemm order: K-blocks of 192, block sums added in order. W is a table {w,R,C} (rows = outputs). Returns a Float64Array of float32 values.
  function mmv(W, x, K) {
    const R = W.R, w = W.w, o = new Float64Array(R);
    for (let j = 0; j < R; j++) {
      const b = j * K; let out = 0;
      for (let k0 = 0; k0 < K; k0 += 192) { let acc = 0; const k1 = Math.min(k0 + 192, K); for (let k = k0; k < k1; k++) acc = f(acc + x[k] * w[b + k]); out = k0 === 0 ? acc : f(out + acc); }
      o[j] = out;
    }
    return o;
  }
  function rmsT(x, g, D) {   // ATen rmsnorm sum: 4 accumulators x 8 lanes over 32-chunks, leftover 8-chunks into acc 0, then accumulators, then lanes
    const acc = new Float64Array(32), m = D >> 5 << 5;
    for (let k = 0; k < m; k += 32) for (let i = 0; i < 32; i++) { const v = f(x[k + i] * x[k + i]); acc[i] = f(acc[i] + v); }
    for (let k = m; k < D; k += 8) for (let i = 0; i < 8; i++) { const v = f(x[k + i] * x[k + i]); acc[i] = f(acc[i] + v); }
    const a = new Float64Array(8); for (let i = 0; i < 8; i++) a[i] = acc[i];
    for (let q = 1; q < 4; q++) for (let i = 0; i < 8; i++) a[i] = f(a[i] + acc[8 * q + i]);
    let r = a[0]; for (let j = 1; j < 8; j++) r = f(r + a[j]);
    const rr = f(1 / f(Math.sqrt(f(f(r / D) + EPS)))), o = new Float64Array(D);
    for (let i = 0; i < D; i++) o[i] = f(f(x[i] * rr) * g[i]);
    return o;
  }
  function kvqT(t) {
    let m = 0; for (let i = 0; i < t.length; i++) { const v = Math.abs(t[i]); if (v > m) m = v; }
    const sc = f(Math.max(m, 1e-20) / 127), o = new Float64Array(t.length);
    for (let i = 0; i < t.length; i++) { const y = f(t[i] / sc); o[i] = f(Math.trunc(y < 0 ? f(y - 0.5) : f(y + 0.5)) * sc); }
    return o;
  }
  function attnRow(q, o0, g0, r, n, ve, hd, K, V, out) {   // one query row, causal columns 0..r of n; ATen flash-attention order
    const S = new Float64Array(r + 1), scale = f(1 / Math.sqrt(hd)); let mx = -Infinity;
    for (let j = 0; j <= r; j++) { let a = 0; const k = K[j]; for (let i = 0; i < hd; i++) a = f(a + q[o0 + i] * k[g0 + i]); a = f(a * scale); S[j] = a; if (a > mx) mx = a; }
    const lane = new Float64Array(8), P = new Float64Array(r + 1); let tail = 0;
    for (let j = 0; j <= r; j++) { const xv = f(S[j] - mx); if (j < ve) { const t = expu20(xv); lane[j & 7] = f(lane[j & 7] + t); P[j] = t; } }
    const l1 = [4, 5, 6, 7, 0, 1, 2, 3].map((s, i) => f(lane[i] + lane[s])), l2 = [2, 3, 0, 1, 6, 7, 4, 5].map((s, i) => f(l1[i] + l1[s]));
    let ts = f(l2[0] + l2[1]);
    for (let j = ve; j <= r; j++) { const xv = f(S[j] - mx), t = Number.isFinite(xv) ? f(Math.exp(xv)) : 0; P[j] = t; ts = f(ts + t); }
    const inv = f(1 / ts);
    for (let i = 0; i < hd; i++) { let a = 0; for (let j = 0; j <= r; j++) a = f(a + P[j] * V[j][g0 + i]); out[o0 + i] = f(a * inv); }
  }
  function ensureTF(M, cache) {
    if (cache.tf) return cache.tf;
    return cache.tf = { cm: 0, K: Array.from({ length: M.a.L * (M.a.reuse || 1) }, () => []), V: Array.from({ length: M.a.L * (M.a.reuse || 1) }, () => []) };
  }
  // Forward the whole sequence `ids` (length n) and return the last row's logits (float32 values). Rows below cm are cached.
  function stepTF(M, st, ids) {
    const { D, H, KVH, HID } = M.a, T = M.T, hd = D / H, grp = H / KVH, kvd = hd * KVH, R = M.a.reuse || 1, n = ids.length, ve = n >> 3 << 3, cm = st.cm;
    const Z = []; for (let r = cm; r < n; r++) { const z = new Float64Array(D); for (let i = 0; i < D; i++) z[i] = f(T.emb.w[ids[r] * D + i] + T.pos.w[r * D + i]); Z.push(z); }
    for (let pass = 0; pass < M.a.L * R; pass++) {
      const pre = "ls." + Math.floor(pass / R) + ".", Kp = st.K[pass], Vp = st.V[pass], Q = [];
      for (let r = cm; r < n; r++) { const h = rmsT(Z[r - cm], T[pre + "n1"], D); Q.push(mmv(T[pre + "q"], h, D)); Kp[r] = kvqT(mmv(T[pre + "k"], h, D)); Vp[r] = kvqT(mmv(T[pre + "v"], h, D)); }
      for (let r = cm; r < n; r++) {
        const a = new Float64Array(D); for (let hh = 0; hh < H; hh++) attnRow(Q[r - cm], hh * hd, Math.floor(hh / grp) * hd, r, n, ve, hd, Kp, Vp, a);
        const z = Z[r - cm], ao = mmv(T[pre + "o"], a, D); for (let i = 0; i < D; i++) z[i] = f(z[i] + ao[i]);
        const f1 = mmv(T[pre + "f1"], rmsT(z, T[pre + "n2"], D), D); for (let i = 0; i < HID; i++) if (f1[i] < 0) f1[i] = 0;
        const f2 = mmv(T[pre + "f2"], f1, HID); for (let i = 0; i < D; i++) z[i] = f(z[i] + f2[i]);
      }
    }
    st.cm = ve;
    return mmv(T.emb, rmsT(Z[n - 1 - cm], T.nf, D), D);
  }
  function answerTF(M, q, maxn) {
    const ids = enc(q).slice(0, 72); ids.push(1); const prompt = ids.slice(), out = [], st = ensureTF(M, {}); let s = "";
    for (let k = 0; k < maxn; k++) {
      const lg = stepTF(M, st, ids); let b = 0; for (let v = 1; v < lg.length; v++) if (lg[v] > lg[b]) b = v;
      if (b <= 1 || ids.length >= M.a.CTX) break; ids.push(b); out.push(b); s += String.fromCharCode(b + 30);
    }
    answer.last = { ids: out, prompt }; return s;
  }
  const enc = s => [...s].map(c => c.charCodeAt(0)).filter(c => c >= 32 && c <= 126).map(c => c - 30);
  function answer(M, q, maxn = 58) {
    if (M.tf) return answerTF(M, q, maxn);
    const seq = enc(q).slice(0, 72); seq.push(1); let out = ""; const ids = [];
    const cache = Array.from({ length: M.a.L * (M.a.reuse || 1) }, () => ({ K: [], V: [] }));
    const stp = M.pk ? stepPK : step;
    let lg; for (let p = 0; p < seq.length; p++) lg = stp(M, cache, seq[p], p);
    for (let k = 0; k < maxn; k++) {
      let b = 0; for (let v = 1; v < lg.length; v++) if (lg[v] > lg[b]) b = v;
      if (b <= 1 || seq.length >= M.a.CTX) break; seq.push(b); ids.push(b); out += String.fromCharCode(b + 30);
      lg = stp(M, cache, b, seq.length - 1);
    }
    answer.last = { ids, prompt: seq.slice(0, seq.length - ids.length) };
    return out;
  }
  const api = { load, loadPK, answer };
  if (typeof module !== "undefined") module.exports = api; else root.LoneMindMini = api;
})(this);
