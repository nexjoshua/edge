// ============================================================
// EDGE — Supabase configuration
// ============================================================
// Get these two values from: Supabase Dashboard → Project Settings → API
//   - "Project URL"        → SUPABASE_URL
//   - "anon" "public" key  → SUPABASE_ANON_KEY   (safe to expose client-side —
//                             Row Level Security in supabase-schema.sql is what
//                             actually keeps each student's data private)
//
// Until you fill these in, the app automatically runs in offline demo mode
// (mock login, progress saved only in this browser's localStorage) — nothing
// breaks, you just don't get real accounts or cross-device sync yet.

window.SUPABASE_URL = "https://fyyjtaqwpcvvnniufzkk.supabase.co";
window.SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5eWp0YXF3cGN2dm5uaXVmemtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1NTk4MDksImV4cCI6MjEwMTEzNTgwOX0.93AGaMSW4fIstv7TYomQfgxRDVq56cFJ2NB-y8Yuc3o";
