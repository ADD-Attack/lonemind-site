// Partner dashboard shell. No data lives in this file or anywhere in the build:
// each panel runs its own authenticated query against public.panel_data, and
// Row-Level Security returns rows only to the allow-listed partner user.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { h, ago } from './panels/_dom.js';
import './web.js';

const cfg = window.PARTNER_CONFIG;
const sb = createClient(cfg.supabaseUrl, cfg.anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'lonemind-partner' },
});

const $ = (id) => document.getElementById(id);
const loginView = $('login-view'), dashView = $('dash-view'), panelsEl = $('panels');

function toEmail(u) {
  u = u.trim();
  return u.includes('@') ? u : `${u.toLowerCase()}@${cfg.usernameDomain}`;
}

function showLogin() {
  dashView.hidden = true;
  panelsEl.replaceChildren();          // drop any rendered data on sign-out
  loginView.hidden = false;
  document.title = 'Partner sign-in · LoneMind';
  $('username').focus();
}

async function showDash(session) {
  loginView.hidden = true;
  dashView.hidden = false;
  document.title = 'Partner dashboard · LoneMind';
  $('who').textContent = session.user.email.split('@')[0];
  await loadPanels();
}

const rowCache = new Map();           // one RLS query per row per load, shared by panels packed in the same row
const fetchRow = (host) => { if (!rowCache.has(host)) rowCache.set(host, sb.from('panel_data').select('panel,payload,updated_at,seq').eq('panel', host).maybeSingle()); return rowCache.get(host); };
// One authenticated RLS query per panel. A panel failing never blocks the others.
async function loadPanel(id, slot) {
  try {
    const mod = await import(`./panels/${id}.js`);
    if (mod.standalone) {            // live panels with no stored row (camera): they open their own authenticated connection
      const body = h('div', { class: 'panel-body' });
      slot.replaceChildren(h('header', { class: 'panel-head' }, h('h2', {}, mod.title)), body);
      slot.classList.remove('loading'); mod.mount(body, { sb, cfg });
      return;
    }
    const host = (cfg.packed || {})[id] || id;        // packed panels ride inside an admitted row's _ext
    const { data: row, error } = await fetchRow(host);
    if (error) throw error;
    let data = row;
    if (row && host !== id) data = row.payload && row.payload._ext && row.payload._ext[id] ? { payload: row.payload._ext[id], updated_at: row.updated_at } : null;
    const body = h('div', { class: 'panel-body' });
    if (!data) body.append(h('p', { class: 'muted' }, 'No data published yet.'));
    else mod.render(data.payload, body, { sb });
    slot.replaceChildren(
      h('header', { class: 'panel-head' },
        h('h2', {}, mod.title),
        h('span', { class: 'stamp', title: data ? data.updated_at : '' },
          data ? `updated ${ago(data.updated_at)}` : '—')),
      body);
    slot.classList.remove('loading');
  } catch (e) {
    slot.classList.remove('loading');
    slot.replaceChildren(h('header', { class: 'panel-head' }, h('h2', {}, id)),
      h('p', { class: 'error' }, `Couldn't load this panel (${e.message || e}).`));
  }
}

const tabs = cfg.tabs || [{ id: 'all', title: 'All', panels: cfg.panels }];
let activeTab = (location.hash || '').slice(1);
if (!tabs.some((t) => t.id === activeTab)) activeTab = tabs[0].id;
function drawTabs() {
  const nav = $('tabs');
  nav.replaceChildren(...tabs.map((t) => {
    const b = h('button', { type: 'button', role: 'tab', 'aria-selected': String(t.id === activeTab) }, t.title);
    b.addEventListener('click', () => { activeTab = t.id; history.replaceState(null, '', '#' + t.id); drawTabs(); loadPanels(); });
    return b;
  }));
}
async function loadPanels() {
  drawTabs();
  panelsEl.replaceChildren(); rowCache.clear();
  const ids = tabs.find((t) => t.id === activeTab).panels;
  await Promise.all(ids.map((id) => {
    const slot = h('article', { class: `panel panel-${id} loading`, 'data-panel': id },
      h('p', { class: 'muted' }, 'Loading…'));
    panelsEl.append(slot);
    return loadPanel(id, slot);
  }));
}

$('login-form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const btn = $('login-btn'), err = $('login-error');
  btn.disabled = true; err.textContent = '';
  const { error } = await sb.auth.signInWithPassword({
    email: toEmail($('username').value), password: $('password').value,
  });
  btn.disabled = false;
  if (error) { err.textContent = 'That username and password did not match.'; return; }
  $('password').value = '';
});

$('logout-btn').addEventListener('click', () => sb.auth.signOut());
$('refresh-btn').addEventListener('click', () => loadPanels());
// Family calendar: opens behind the same partner sign-in. The access token rides in the URL fragment
// (never sent to a server or logged); the calendar's gate checks it with Supabase (rpc/is_partner) and
// swaps it for its own short-lived cookie. Without a valid partner session the calendar shows nothing.
if (cfg.calendar && cfg.calendar.url) $('cal-btn').hidden = false;
$('cal-btn').addEventListener('click', async () => {
  const w = window.open('', '_blank');          // opened inside the click so pop-up blockers allow it
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { if (w) w.close(); showLogin(); return; }
  const url = cfg.calendar.url.replace(/\/$/, '') + '/auth#t=' + encodeURIComponent(session.access_token);
  if (w) { w.opener = null; w.location.replace(url); } else location.assign(url);
});

// Password setup: one-time link  /partner/?token_hash=...&type=recovery  (minted fleet-side on request).
// The partner types his own password here; it goes straight to Supabase Auth and is never seen elsewhere.
const qs = new URLSearchParams(location.search);
const recoveryHash = qs.get('type') === 'recovery' ? qs.get('token_hash') : null;
if (recoveryHash) history.replaceState(null, '', location.pathname);   // drop the token from the address bar
let setupMode = false;
async function startSetup() {
  setupMode = true;
  loginView.hidden = true; dashView.hidden = true; $('setpw-view').hidden = false;
  const { error } = await sb.auth.verifyOtp({ token_hash: recoveryHash, type: 'recovery' });
  if (error) $('setpw-error').textContent = 'This link has expired or was already used. Ask for a new one.';
}
$('setpw-form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const err = $('setpw-error'), a = $('newpw').value, b = $('newpw2').value;
  if (a !== b) { err.textContent = 'The two passwords differ.'; return; }
  const { error } = await sb.auth.updateUser({ password: a });
  if (error) { err.textContent = error.message; return; }
  $('newpw').value = ''; $('newpw2').value = '';
  setupMode = false; $('setpw-view').hidden = true;
  await sb.auth.signOut();       // then sign in normally with the new password
  err.textContent = '';
  showLogin();
  $('login-error').textContent = 'Password saved. Sign in with it.';
});

let current = null;
sb.auth.onAuthStateChange((event, session) => {
  const uid = session?.user?.id || null;
  if (uid === current && event !== 'INITIAL_SESSION') return;   // token refresh: keep the view
  current = uid;
  if (setupMode) return;
  if (session) showDash(session); else showLogin();
});

if (recoveryHash) startSetup();
