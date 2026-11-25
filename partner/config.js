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
    { id: 'tokens', title: 'Tokens', panels: ['usage_hours', 'usage_summary', 'tokens'] },
    { id: 'hosts', title: 'Hosts', panels: ['hosts'] },
    { id: 'work', title: 'Work', panels: ['work', 'queue'] },
    { id: 'lanes', title: 'Lanes', panels: ['lanes'] },
    { id: 'board', title: 'Board', panels: ['board'] },
    { id: 'pulse', title: 'Pulse', panels: ['pulse'] },
    { id: 'memory', title: 'Memory', panels: ['memory'] },
    { id: 'socials', title: 'Socials', panels: ['socials'] },
    { id: 'camera', title: 'Camera', panels: ['camera'] },
  ],
  // Camera relay: the web address of the partner-only video relay. It refuses everything without the partner's sign-in token.
  // This is NOT the camera's address; the camera's address and any stream credential live only on the relay host.
  camera: { relayUrl: 'https://abraham.tail629694.ts.net:10000', verified: false }, // flip verified to true only after the own-firmware camera is confirmed live
  // Family calendar (partner-only): the gate refuses everything without the partner's sign-in.
  calendar: { url: 'https://abraham.tail629694.ts.net:8443/fcal' },
  // Every panel has its own row (the table CHECK now admits any panel name). Nothing is packed any more.
  packed: {},
  panels: [
    'partner_items',   // items awaiting your verdict
    'open_orders',     // open-orders picture
    'fleet_health',    // fleet health at a glance
    'latest_board',    // latest board posts
    'usage',           // usage numbers
  ],
};
