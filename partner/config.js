// Public, page-safe settings only. Fill in when the Supabase project exists.
// anonKey is the PUBLIC anon key (Project Settings -> API -> "anon public").
// NEVER put the service_role key here: it bypasses Row-Level Security and stays
// only in the fleet-side publisher on the partner's machines.
window.PARTNER_CONFIG = {
  supabaseUrl: 'https://yooryjndcobgwvuopexr.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvb3J5am5kY29iZ3d2dW9wZXhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUyODE4MTgsImV4cCI6MjExMDg1NzgxOH0.gX3wP85ILS4vR2U4NDpUfUfCoGIliHcndTa0faNKCU0',
  // Supabase Auth signs in by email. A bare username is turned into username@usernameDomain.
  usernameDomain: 'partner.moorefolio.invalid',

  // Panels, in display order. To remove a panel: delete its line here
  // (and optionally its file in panels/). Nothing else needs to change.
  tabs: [
    { id: 'overview', title: 'Overview', panels: ['partner_items', 'open_orders', 'fleet_health', 'latest_board', 'usage'] },
    { id: 'tokens', title: 'Tokens', panels: ['usage_hours', 'tokens'] },
    { id: 'hosts', title: 'Hosts', panels: ['hosts'] },
    { id: 'work', title: 'Work', panels: ['work', 'queue'] },
    { id: 'lanes', title: 'Lanes', panels: ['lanes'] },
    { id: 'board', title: 'Board', panels: ['board'] },
    { id: 'pulse', title: 'Pulse', panels: ['pulse'] },
    { id: 'memory', title: 'Memory', panels: ['memory'] },
    { id: 'socials', title: 'Socials', panels: ['socials'] },
  ],
  // Panels stored inside another row's _ext (the table's CHECK admits five names only).
  packed: { usage_hours: 'usage', tokens: 'usage', hosts: 'usage', work: 'partner_items', lanes: 'partner_items', queue: 'partner_items',
            board: 'latest_board', pulse: 'latest_board', memory: 'open_orders', socials: 'open_orders' },
  panels: [
    'partner_items',   // items awaiting your verdict
    'open_orders',     // open-orders picture
    'fleet_health',    // fleet health at a glance
    'latest_board',    // latest board posts
    'usage',           // usage numbers
  ],
};
