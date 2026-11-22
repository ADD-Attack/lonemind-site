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

// One authenticated RLS query per panel. A panel failing never blocks the others.
async function loadPanel(id, slot) {
  try {
    const mod = await import(`./panels/${id}.js`);
    const { data, error } = await sb
      .from('panel_data')
      .select('panel,payload,updated_at,seq')
      .eq('panel', id)
      .maybeSingle();
    if (error) throw error;
    const body = h('div', { class: 'panel-body' });
    if (!data) body.append(h('p', { class: 'muted' }, 'No data published yet.'));
    else mod.render(data.payload, body);
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

async function loadPanels() {
  panelsEl.replaceChildren();
  await Promise.all(cfg.panels.map((id) => {
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

let current = null;
sb.auth.onAuthStateChange((event, session) => {
  const uid = session?.user?.id || null;
  if (uid === current && event !== 'INITIAL_SESSION') return;   // token refresh: keep the view
  current = uid;
  if (session) showDash(session); else showLogin();
});
