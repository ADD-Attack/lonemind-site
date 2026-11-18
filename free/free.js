// LoneMind Free: WebLLM (Apache-2.0, vendored) running Qwen2.5-0.5B-Instruct on the user's GPU.
// Only the weights come from the network (Hugging Face, once, then Cache Storage). Inference is local.
const $ = (id) => document.getElementById(id);
const st = $('fstat'), prog = $('fprog'), log = $('flog'), fin = $('fin'), send = $('fsend'),
  stop = $('fstop'), fresh = $('fnew'), load = $('fload'), perf = $('fperf');
const SYS = 'You are a helpful, friendly assistant. Answer briefly and plainly.';
let engine = null, history = [], busy = false, gpu = null;

function variant(f16) {
  const q = f16 ? 'q4f16_1' : 'q4f32_1';
  return {
    model: `https://huggingface.co/mlc-ai/Qwen2.5-0.5B-Instruct-${q}-MLC`,
    model_id: `Qwen2.5-0.5B-Instruct-${q}-MLC`,
    model_lib: new URL(`vendor/Qwen2-0.5B-Instruct-${q}_cs1k-webgpu.wasm`, import.meta.url).href,
    low_resource_required: true,
    overrides: { context_window_size: 4096 },
  };
}

function noGpu(why) {
  $('fnogpu-why').textContent = why;
  $('fnogpu').hidden = false;
  load.hidden = true; fin.placeholder = 'WebGPU is needed to chat here.';
  st.textContent = 'Unavailable in this browser.';
}

async function probe() {
  if (!('gpu' in navigator) || !navigator.gpu) { noGpu('This browser has no WebGPU (navigator.gpu is missing).'); return null; }
  try {
    const a = await navigator.gpu.requestAdapter();
    if (!a) { noGpu('WebGPU is present but no graphics adapter was offered (blocked GPU or no GPU).'); return null; }
    return { f16: a.features.has('shader-f16') };
  } catch (e) { noGpu('WebGPU failed to start: ' + (e && e.message || e)); return null; }
}

function bubble(cls, text) {
  const li = document.createElement('li'); li.className = cls; li.textContent = text;
  log.appendChild(li); log.scrollTop = log.scrollHeight; return li;
}
function setBusy(b) { busy = b; send.disabled = b || !engine; fin.disabled = !engine; stop.hidden = !b; fresh.disabled = b || !engine; }

async function loadModel() {
  if (engine || !gpu) return;
  load.disabled = true; prog.hidden = false;
  const cfg = variant(gpu.f16);
  $('fmid').textContent = cfg.model_id;
  try {
    const webllm = await import('./vendor/web-llm.js');
    const t0 = performance.now();
    engine = await webllm.CreateWebWorkerMLCEngine(new Worker(new URL('./worker.js', import.meta.url), { type: 'module' }), cfg.model_id, {
      appConfig: { model_list: [cfg], useIndexedDBCache: false },
      initProgressCallback: (r) => { prog.value = r.progress || 0; st.textContent = r.text; },
    });
    const secs = ((performance.now() - t0) / 1000).toFixed(1);
    st.textContent = `Ready · ${cfg.model_id} · loaded in ${secs} s. Everything from here runs on this device.`;
    window.__free.loadSecs = +secs; window.__free.modelId = cfg.model_id;
    prog.hidden = true; load.hidden = true; fin.placeholder = 'Ask anything…'; setBusy(false); fin.focus();
  } catch (e) {
    engine = null; prog.hidden = true; load.disabled = false; load.textContent = 'Try again';
    st.textContent = 'Loading failed: ' + (e && e.message || e);
  }
}

async function ask(text) {
  if (!engine || busy) return null;
  history.push({ role: 'user', content: text });
  bubble('u', text);
  const out = bubble('a', '…');
  setBusy(true);
  const t0 = performance.now(); let tFirst = 0, reply = '', usage = null;
  try {
    const chunks = await engine.chat.completions.create({
      messages: [{ role: 'system', content: SYS }, ...history],
      stream: true, stream_options: { include_usage: true }, temperature: 0.2, max_tokens: 256,
    });
    for await (const c of chunks) {
      const d = c.choices[0]?.delta?.content || '';
      if (d) { if (!tFirst) tFirst = performance.now(); reply += d; out.textContent = reply; log.scrollTop = log.scrollHeight; }
      if (c.usage) usage = c.usage;
    }
  } catch (e) { out.classList.add('err'); reply = reply || ('Error: ' + (e && e.message || e)); out.textContent = reply; }
  const tEnd = performance.now();
  history.push({ role: 'assistant', content: reply });
  const n = usage ? usage.completion_tokens : 0;
  const r = { text: reply, ttftMs: tFirst ? Math.round(tFirst - t0) : null, totalMs: Math.round(tEnd - t0), tokens: n,
    tps: tFirst && n > 1 ? +((n - 1) / ((tEnd - tFirst) / 1000)).toFixed(2) : null,
    decodeTps: usage?.extra?.decode_tokens_per_s ? +usage.extra.decode_tokens_per_s.toFixed(2) : null };
  perf.textContent = `first token ${r.ttftMs} ms · ${r.tokens} tokens · ${r.tps ?? '–'} tokens/s`;
  setBusy(false);
  return r;
}

async function newChat() { if (busy) return; history = []; log.textContent = ''; perf.textContent = ''; try { await engine?.resetChat(); } catch {} }

$('fask').addEventListener('submit', (e) => { e.preventDefault(); const t = fin.value.trim(); if (!t) return; fin.value = ''; ask(t); });
fin.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('fask').requestSubmit(); } });
stop.addEventListener('click', () => engine?.interruptGenerate());
fresh.addEventListener('click', newChat);
load.addEventListener('click', loadModel);

window.__free = { ask, newChat, loadModel };
gpu = await probe();
window.__free.ready = true; window.__free.gpu = gpu;
