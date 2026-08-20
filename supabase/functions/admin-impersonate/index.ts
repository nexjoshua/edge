// ============================================================
// EDGE — Admin "View as Student" Edge Function
// ============================================================
// Why this has to be a server-side function instead of client JS:
// the anon key alone can never sign in as another account without that
// account's password — that's the whole point of it being safe to expose
// client-side. Impersonation needs the SERVICE ROLE key, which must never
// reach the browser. This function keeps that key server-side, checks the
// caller is really an admin, then hands back a short-lived one-time login
// token (not the service role key itself) for exactly one student.
//
// Deploy with: supabase functions deploy admin-impersonate
// (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY are injected
// automatically by Supabase for every Edge Function — no manual secrets
// setup needed.)

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1. Identify the caller from their own JWT (the anon-scoped client
    //    only ever proves *who is asking*, nothing more).
    const authHeader = req.headers.get("Authorization") ?? "";
    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser();
    if (callerErr || !caller) {
      return json({ error: "Not authenticated." }, 401);
    }

    // 2. Service-role client — only used server-side, never sent to the browser.
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // 3. Confirm the caller is actually an admin before doing anything else.
    const { data: callerProfile, error: profileErr } = await adminClient
      .from("profiles")
      .select("is_admin")
      .eq("id", caller.id)
      .maybeSingle();
    if (profileErr || !callerProfile?.is_admin) {
      return json({ error: "This account does not have admin access." }, 403);
    }

    // 4. Look up the target student.
    const { student_id } = await req.json().catch(() => ({}));
    if (!student_id || typeof student_id !== "string") {
      return json({ error: "student_id is required." }, 400);
    }

    const { data: targetUserRes, error: targetErr } = await adminClient.auth.admin.getUserById(student_id);
    if (targetErr || !targetUserRes?.user?.email) {
      return json({ error: "Student account not found." }, 404);
    }

    // Never allow impersonating another admin account through this path.
    const { data: targetProfile } = await adminClient
      .from("profiles")
      .select("is_admin")
      .eq("id", student_id)
      .maybeSingle();
    if (targetProfile?.is_admin) {
      return json({ error: "Refusing to impersonate an admin account." }, 403);
    }

    // 5. Generate a one-time magic-link token for that student. The
    //    student's real password is never seen or touched.
    const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: targetUserRes.user.email,
    });
    if (linkErr || !linkData?.properties?.hashed_token) {
      return json({ error: linkErr?.message || "Could not generate login token." }, 500);
    }

    return json({
      email: targetUserRes.user.email,
      token: linkData.properties.hashed_token,
    });
  } catch (e) {
    return json({ error: String(e instanceof Error ? e.message : e) }, 500);
  }
});
