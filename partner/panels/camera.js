// Panel: camera. Live video from our own camera, via the partner-only relay.
// No row in panel_data: the browser opens ONE authenticated stream with the signed-in session's access token.
// The relay refuses every request that is not the partner (anonymous, other users, expired, tampered).
// Page and config carry only the relay's web address; never the camera's address, a stream credential, or a service key.
import { h } from './_dom.js';
export const title = 'Camera';
export const standalone = true;

const STALL_MS = 4000;            // no part of any kind from the relay for this long: treat the connection as broken
const BACKOFF = [1000, 2000, 4000, 8000, 10000];

function cat(buf, b) { const o = new Uint8Array(buf.length + b.length); o.set(buf); o.set(b, buf.length); return o; }
function indexOf(buf, pat, from = 0) {
  outer: for (let i = from; i <= buf.length - pat.length; i++) { for (let j = 0; j < pat.length; j++) if (buf[i + j] !== pat[j]) continue outer; return i; }
  return -1;
}
const CRLF2 = new Uint8Array([13, 10, 13, 10]);
const dec = new TextDecoder();

// Read a multipart/x-mixed-replace stream: parts are `--frame\r\nHeader: v\r\n...\r\n\r\n<Content-Length bytes>\r\n`.
async function* parts(reader) {
  let buf = new Uint8Array(0);
  for (;;) {
    for (;;) {
      const he = indexOf(buf, CRLF2);
      if (he < 0) break;
      const head = dec.decode(buf.subarray(0, he));
      const m = /content-length:\s*(\d+)/i.exec(head);
      if (!m) throw new Error('bad part');
      const n = +m[1], start = he + 4;
      if (n > 4_000_000) throw new Error('part too large');
      if (buf.length < start + n + 2) break;
      const hdr = {};
      for (const ln of head.split('\r\n')) { const k = ln.indexOf(':'); if (k > 0) hdr[ln.slice(0, k).trim().toLowerCase()] = ln.slice(k + 1).trim(); }
      const body = buf.slice(start, start + n);
      buf = buf.slice(start + n + 2);
      yield { hdr, body };
    }
    const { value, done } = await reader.read();
    if (done) return;
    buf = cat(buf, value);
  }
}

export function mount(body, { sb, cfg }) {
  const relay = ((cfg.camera || {}).relayUrl || '').replace(/\/$/, '');
  const canvas = h('canvas', { class: 'cam-canvas', width: '640', height: '360', 'aria-label': 'Live camera video' });
  const msg = h('div', { class: 'cam-msg', role: 'status', 'aria-live': 'polite' });
  const badge = h('span', { class: 'cam-badge' });
  const stage = h('div', { class: 'cam-stage', 'data-state': 'connecting' }, canvas, msg);
  const stat = h('span', { class: 'cam-stat' });
  const pauseBtn = h('button', { type: 'button', class: 'ghost' }, 'Pause');
  const fsBtn = h('button', { type: 'button', class: 'ghost' }, 'Full screen');
  const note = h('p', { class: 'cam-note' });
  body.append(h('div', { class: 'cam-bar' }, badge, stat, h('span', { class: 'cam-spacer' }), pauseBtn, fsBtn), stage, note);

  let ctl = null, paused = false, dead = false, attempt = 0, lastPart = 0, lastFrame = 0, shown = 0, fpsN = 0, fpsT = performance.now(), fps = 0;
  let skew = 0, source = null, retryTimer = null, state = 'connecting';

  function setState(s, text, extra = {}) {
    state = s; stage.dataset.state = s; msg.textContent = text || '';
    badge.textContent = ({ live: 'LIVE', stalled: 'STALLED', offline: 'OFFLINE', connecting: 'CONNECTING', reconnecting: 'RECONNECTING', paused: 'PAUSED', error: 'UNAVAILABLE', ended: 'SIGNED OUT' })[s] || s;
    if (s === 'live' && source === 'camera' && !(cfg.camera && cfg.camera.verified === true)) badge.textContent = 'LIVE · UNVERIFIED';
    badge.className = `cam-badge cam-${s}`;
    if (extra.stat !== undefined) stat.textContent = extra.stat;
  }
  function sourceNote() {
    note.textContent = source === 'synthetic-test'
      ? 'TEST STREAM. This is a synthetic picture from the relay, not the camera. The real camera connection is unverified until our own firmware boots on the camera.'
      : source === 'camera' ? 'Source: the camera, via the relay on our own network, then to this page. Not routed through any Wyze service.' + (cfg.camera && cfg.camera.verified === true ? '' : ' UNVERIFIED: this connection has not yet been confirmed on our own firmware.') : '';
    stage.classList.toggle('cam-test', source === 'synthetic-test');
  }
  const gone = () => dead || !body.isConnected;
  function stop() { dead = true; if (ctl) ctl.abort(); clearInterval(tick); clearTimeout(retryTimer); document.removeEventListener('visibilitychange', onVis); }

  async function token() {
    const { data } = await sb.auth.getSession();
    return data && data.session ? data.session.access_token : null;
  }
  async function calibrate(tok) {         // clock offset between relay and this browser, so latency is real, not skew
    let best = null;
    for (let i = 0; i < 5; i++) {         // keep the sample with the smallest round trip: its midpoint is the best estimate
      const t0 = Date.now();
      const r = await fetch(`${relay}/v1/status`, { headers: { Authorization: `Bearer ${tok}` }, cache: 'no-store' });
      const t1 = Date.now();
      if (r.status === 401) throw Object.assign(new Error('auth'), { auth: true });
      if (!r.ok) throw new Error('status ' + r.status);
      const j = await r.json();
      if (!best || t1 - t0 < best.rtt) best = { rtt: t1 - t0, skew: j.server_time_ms - (t0 + t1) / 2, source: j.source };
    }
    skew = best.skew; source = best.source; sourceNote();
  }

  async function connect() {
    if (gone() || paused) return;
    clearTimeout(retryTimer);
    ctl = new AbortController(); const my = ctl;
    setState(attempt ? 'reconnecting' : 'connecting', attempt ? `Connection lost. Reconnecting (attempt ${attempt})…` : 'Connecting to the camera relay…');
    try {
      const tok = await token();
      if (!tok) { setState('ended', 'Signed out.'); return; }
      await calibrate(tok);
      const res = await fetch(`${relay}/v1/stream`, { headers: { Authorization: `Bearer ${tok}` }, signal: my.signal, cache: 'no-store' });
      if (res.status === 401) throw Object.assign(new Error('auth'), { auth: true });
      if (!res.ok) throw new Error('stream ' + res.status);
      source = res.headers.get('X-Source') || source; sourceNote();
      lastPart = Date.now(); attempt = 0;
      for await (const p of parts(res.body.getReader())) {
        if (gone() || my !== ctl) return;
        lastPart = Date.now();
        if (p.hdr['content-type'] === 'image/jpeg') {
          const bmp = await createImageBitmap(new Blob([p.body], { type: 'image/jpeg' }));
          canvas.width = bmp.width; canvas.height = bmp.height; canvas.getContext('2d').drawImage(bmp, 0, 0); bmp.close();
          const ts = +p.hdr['x-ts'], lat = Math.max(0, Date.now() + skew - ts);
          lastFrame = Date.now(); shown = ts; fpsN++;
          if (state !== 'live') setState('live', '');
          const now = performance.now(); if (now - fpsT >= 1000) { fps = fpsN * 1000 / (now - fpsT); fpsN = 0; fpsT = now; }
          stat.textContent = `latency ${Math.round(lat)} ms · ${fps.toFixed(1)} fps`;
          stage.dataset.lat = String(Math.round(lat));
        } else {
          const j = JSON.parse(dec.decode(p.body));
          if (j.state === 'offline') setState('offline', 'The camera is offline. Waiting for it to come back…', { stat: '' });
          else if (j.state === 'stalled') setState('stalled', `No new picture for ${Math.round((j.age_ms || 0) / 1000)} s. The last frame is shown; waiting for the camera…`, { stat: '' });
        }
      }
      throw new Error('ended');
    } catch (e) {
      if (gone() || my.signal.aborted && paused) return;
      if (e && e.auth) {                                     // token rejected: refresh once, else the session is over
        const { data, error } = await sb.auth.refreshSession();
        if (error || !data.session) { setState('ended', 'Your session ended. Sign in again to watch.'); return; }
      }
      const failedFast = !lastFrame && attempt >= 2;
      attempt++;
      const wait = BACKOFF[Math.min(attempt - 1, BACKOFF.length - 1)];
      setState(failedFast ? 'error' : 'reconnecting', failedFast ? `Can't reach the camera relay. Retrying in ${Math.round(wait / 1000)} s… (This device must be on the Tailscale network, and the browser must allow local network access for this site.)` : `Connection lost. Reconnecting in ${Math.round(wait / 1000)} s…`, { stat: '' });
      retryTimer = setTimeout(connect, wait);
    }
  }

  const tick = setInterval(() => {                           // watchdog: a stream that went silent is a dead connection
    if (gone()) { stop(); return; }
    if (state !== 'paused' && ctl && !ctl.signal.aborted && lastPart && Date.now() - lastPart > STALL_MS && ['live', 'stalled', 'offline'].includes(state)) ctl.abort();
    if (ctl && ctl.signal.aborted && !paused && !retryTimer) { /* handled by catch */ }
  }, 1000);
  // an aborted-by-watchdog read lands in catch (not paused): it schedules the reconnect.

  function pause() { paused = true; if (ctl) ctl.abort(); clearTimeout(retryTimer); setState('paused', 'Paused.', { stat: '' }); pauseBtn.textContent = 'Resume'; }
  function resume() { paused = false; attempt = 0; lastFrame = 0; pauseBtn.textContent = 'Pause'; connect(); }
  pauseBtn.addEventListener('click', () => (paused ? resume() : pause()));
  fsBtn.addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen(); else if (stage.requestFullscreen) stage.requestFullscreen(); });
  const onVis = () => { if (document.hidden) { if (!paused) { ctl && ctl.abort(); clearTimeout(retryTimer); setState('paused', 'Paused while this tab is hidden.', { stat: '' }); } } else if (!paused && state === 'paused') { attempt = 0; lastFrame = 0; connect(); } };
  document.addEventListener('visibilitychange', onVis);

  if (!relay) { setState('error', 'The camera relay address is not configured on this page.'); return; }
  connect();
}
