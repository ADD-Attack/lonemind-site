// Public, page-safe settings only. Fill in when the Supabase project exists.
// anonKey is the PUBLIC anon key (Project Settings -> API -> "anon public").
// NEVER put the service_role key here: it bypasses Row-Level Security and stays
// only in the fleet-side publisher on the partner's machines.
window.PARTNER_CONFIG = {
  supabaseUrl: 'https://YOUR-PROJECT-REF.supabase.co',
  anonKey: 'YOUR-ANON-PUBLIC-KEY',
  // Supabase Auth signs in by email. A bare username is turned into username@usernameDomain.
  usernameDomain: 'partner.moorefolio.invalid',

  // Panels, in display order. To remove a panel: delete its line here
  // (and optionally its file in panels/). Nothing else needs to change.
  panels: [
    'partner_items',   // items awaiting your verdict
    'open_orders',     // open-orders picture
    'fleet_health',    // fleet health at a glance
    'latest_board',    // latest board posts
    'usage',           // usage numbers
  ],
};
