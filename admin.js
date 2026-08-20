/* ===================== EDGE — Admin dashboard logic ===================== */
/* Separate from app.js on purpose: this page has its own login and its own
   session, even though it authenticates against the same Supabase Auth
   users table. Access is gated by profiles.is_admin — see
   supabase-admin-addon.sql for the column + RLS policies this relies on. */

const supabaseConfigured =
  typeof window.SUPABASE_URL === "string" &&
  typeof window.SUPABASE_ANON_KEY === "string" &&
  !window.SUPABASE_URL.includes("YOUR-PROJECT") &&
  !window.SUPABASE_ANON_KEY.includes("YOUR-ANON");

const supabaseLibLoaded = typeof supabase !== "undefined";
const SUPABASE_ENABLED = supabaseConfigured && supabaseLibLoaded;

const sb = SUPABASE_ENABLED
  ? supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
  : null;

/* ---------- Elements ---------- */

const loginScreen = document.getElementById("adminLoginScreen");
const dashboardScreen = document.getElementById("adminDashboardScreen");
const offlineBanner = document.getElementById("adminOfflineBanner");
const loginForm = document.getElementById("adminLoginForm");
const loginError = document.getElementById("adminLoginError");
const emailInput = document.getElementById("adminEmail");
const passwordInput = document.getElementById("adminPassword");
const toggleEye = document.getElementById("adminToggleEye");
const submitBtn = document.getElementById("adminSubmitBtn");
const searchInput = document.getElementById("studentSearch");
const refreshBtn = document.getElementById("refreshBtn");
const tbody = document.getElementById("studentTableBody");

if (!SUPABASE_ENABLED) {
  offlineBanner.style.display = "block";
  loginForm.querySelectorAll("input, button").forEach((el) => (el.disabled = true));
}

toggleEye.addEventListener("click", () => {
  const isHidden = passwordInput.type === "password";
  passwordInput.type = isHidden ? "text" : "password";
  toggleEye.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
});

/* ---------- State ---------- */

let students = [];
let sortState = { key: "name", dir: 1 };

// Fields to actually sort by, since a couple of visible columns
// ("Pre-Test", "Post-Test", "Change") are displayed as strings like "18/20"
// or "+4" but need to sort on the underlying numbers.
const SORT_ACCESSORS = {
  name: (s) => s.name.toLowerCase(),
  grade: (s) => Number(s.grade) || s.grade,
  lesson: (s) => s.lesson,
  streak: (s) => s.streak,
  level: (s) => s.level,
  pre: (s) => (s.preScore === null ? -Infinity : s.preScore),
  post: (s) => (s.postScore === null ? -Infinity : s.postScore),
  delta: (s) => (s.deltaVal === null ? -Infinity : s.deltaVal),
};

/* ---------- Login ---------- */

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!SUPABASE_ENABLED) return;

  loginError.textContent = "";
  submitBtn.disabled = true;
  const originalLabel = submitBtn.textContent;
  submitBtn.textContent = "Please wait…";

  try {
    const { data, error } = await sb.auth.signInWithPassword({
      email: emailInput.value.trim(),
      password: passwordInput.value,
    });
    if (error) throw error;

    const profile = await fetchAdminProfile(data.user.id);
    if (!profile || !profile.is_admin) {
      await sb.auth.signOut();
      throw new Error("This account doesn't have admin access.");
    }

    document.getElementById("adminEmailDisplay").textContent = data.user.email;
    setAdminAvatar(profile, data.user.email);
    showDashboard();
    await loadStudents();
  } catch (err) {
    loginError.textContent = err.message || "Sign-in failed. Please try again.";
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalLabel;
  }
});

async function fetchAdminProfile(userId) {
  const { data, error } = await sb
    .from("profiles")
    .select("is_admin, first_name, last_name")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error("EDGE Admin: profile check failed", error);
    return null;
  }
  return data;
}

function setAdminAvatar(profile, email) {
  const el = document.getElementById("adminAvatarInitials");
  const first = (profile && profile.first_name || "").trim();
  const last = (profile && profile.last_name || "").trim();
  const combo = (first.charAt(0) + last.charAt(0)).toUpperCase();
  el.textContent = combo || (email || "A").slice(0, 2).toUpperCase();
}

document.getElementById("adminSignOutBtn").addEventListener("click", async () => {
  if (SUPABASE_ENABLED) await sb.auth.signOut();
  dashboardScreen.style.display = "none";
  loginScreen.style.display = "flex";
  emailInput.value = "";
  passwordInput.value = "";
  loginError.textContent = "";
});

function showDashboard() {
  loginScreen.style.display = "none";
  dashboardScreen.style.display = "block";
}

/* ---------- Resume session on load ---------- */

(async function initAdminAuth() {
  if (!SUPABASE_ENABLED) return;
  const { data: { session } } = await sb.auth.getSession();
  if (!session || !session.user) return;

  const profile = await fetchAdminProfile(session.user.id);
  if (!profile || !profile.is_admin) {
    await sb.auth.signOut();
    return;
  }

  document.getElementById("adminEmailDisplay").textContent = session.user.email;
  setAdminAvatar(profile, session.user.email);
  showDashboard();
  await loadStudents();
})();

/* ---------- Load + merge every student's data ---------- */

async function loadStudents() {
  tbody.innerHTML = `<tr><td colspan="9" class="admin-table-empty">Loading…</td></tr>`;

  const [profilesRes, progressRes, testRes] = await Promise.all([
    sb.from("profiles").select("id, first_name, last_name, grade_level, is_admin"),
    sb.from("progress").select("user_id, lesson, streak, level"),
    sb.from("test_results").select("user_id, test_type, score, total, taken_at"),
  ]);

  if (profilesRes.error) {
    tbody.innerHTML = `<tr><td colspan="9" class="admin-table-empty">Couldn't load students — ${escapeHtml(profilesRes.error.message)}</td></tr>`;
    return;
  }

  const progressByUser = new Map();
  (progressRes.data || []).forEach((p) => progressByUser.set(p.user_id, p));

  // Keep only the most recent pre/post attempt per student.
  const preByUser = new Map();
  const postByUser = new Map();
  (testRes.data || []).forEach((t) => {
    const map = t.test_type === "pre" ? preByUser : postByUser;
    const existing = map.get(t.user_id);
    if (!existing || new Date(t.taken_at) > new Date(existing.taken_at)) map.set(t.user_id, t);
  });

  students = (profilesRes.data || [])
    .filter((p) => !p.is_admin) // admin accounts don't show up in the student list
    .map((p) => {
      const prog = progressByUser.get(p.id) || {};
      const pre = preByUser.get(p.id);
      const post = postByUser.get(p.id);
      const delta = pre && post ? post.score - pre.score : null;

      return {
        id: p.id,
        name: [p.first_name, p.last_name].filter(Boolean).join(" ") || "—",
        grade: p.grade_level || "—",
        lesson: prog.lesson ?? 0,
        streak: prog.streak ?? 0,
        level: prog.level ?? 1,
        pre: pre ? `${pre.score}/${pre.total}` : "—",
        preScore: pre ? pre.score : null,
        post: post ? `${post.score}/${post.total}` : "—",
        postScore: post ? post.score : null,
        delta: delta === null ? "—" : `${delta > 0 ? "+" : ""}${delta}`,
        deltaVal: delta,
      };
    });

  renderSummary();
  renderTable();
}

/* ---------- Summary cards ---------- */

function renderSummary() {
  const total = students.length;
  document.getElementById("summaryTotal").textContent = total;
  document.getElementById("summaryAvgLevel").textContent = total
    ? (students.reduce((sum, s) => sum + s.level, 0) / total).toFixed(1)
    : "—";

  const withPre = students.filter((s) => s.preScore !== null);
  const withPost = students.filter((s) => s.postScore !== null);
  document.getElementById("summaryAvgPre").textContent = withPre.length
    ? (withPre.reduce((sum, s) => sum + s.preScore, 0) / withPre.length).toFixed(1)
    : "—";
  document.getElementById("summaryAvgPost").textContent = withPost.length
    ? (withPost.reduce((sum, s) => sum + s.postScore, 0) / withPost.length).toFixed(1)
    : "—";
}

/* ---------- Table: search, sort, render ---------- */

function renderTable() {
  const query = searchInput.value.trim().toLowerCase();

  let rows = students.filter(
    (s) =>
      !query ||
      s.name.toLowerCase().includes(query) ||
      String(s.grade).toLowerCase().includes(query)
  );

  const accessor = SORT_ACCESSORS[sortState.key] || SORT_ACCESSORS.name;
  rows = rows.slice().sort((a, b) => {
    const av = accessor(a);
    const bv = accessor(b);
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * sortState.dir;
    return String(av).localeCompare(String(bv)) * sortState.dir;
  });

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="admin-table-empty">No students found.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows
    .map(
      (s) => `
    <tr>
      <td data-label="Student">${escapeHtml(s.name)}</td>
      <td data-label="Grade">${escapeHtml(String(s.grade))}</td>
      <td data-label="Lessons">${s.lesson}</td>
      <td data-label="Streak">${s.streak}d</td>
      <td data-label="Level">${s.level}</td>
      <td data-label="Pre-Test">${s.pre}</td>
      <td data-label="Post-Test">${s.post}</td>
      <td data-label="Change">${s.delta}</td>
      <td data-label="Action"><button type="button" class="view-as-btn" data-student-id="${s.id}">View as Student</button></td>
    </tr>`
    )
    .join("");

  tbody.querySelectorAll(".view-as-btn").forEach((btn) => {
    btn.addEventListener("click", () => viewAsStudent(btn.dataset.studentId, btn));
  });
}

/* ---------- "View as Student" (admin impersonation) ---------- */
/* Calls the admin-impersonate Edge Function (service-role-key work stays
   server-side there — see supabase/functions/admin-impersonate/index.ts).
   The returned one-time token is exchanged for a session under a SEPARATE
   Supabase client / localStorage key, so the admin's own login here is
   never touched — closing that tab (or clicking "Return to Admin" inside
   it) leaves this dashboard exactly as it was. */

async function viewAsStudent(studentId, btnEl) {
  if (!SUPABASE_ENABLED) return;
  const originalLabel = btnEl.textContent;
  btnEl.disabled = true;
  btnEl.textContent = "Opening…";

  try {
    const { data, error } = await sb.functions.invoke("admin-impersonate", {
      body: { student_id: studentId },
    });
    if (error || !data || data.error) {
      throw new Error((data && data.error) || error?.message || "Impersonation failed.");
    }

    const sbImpersonate = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
      auth: { storageKey: "edge:impersonation" },
    });
    const { error: otpError } = await sbImpersonate.auth.verifyOtp({
      email: data.email,
      token: data.token,
      type: "magiclink",
    });
    if (otpError) throw otpError;

    window.location.href = "index.html?impersonated=1";
  } catch (err) {
    alert(
      "Couldn't open student view: " + (err.message || err) +
      "\n\nThis feature needs the admin-impersonate Edge Function deployed " +
      "(supabase functions deploy admin-impersonate) — see README.md."
    );
    btnEl.disabled = false;
    btnEl.textContent = originalLabel;
  }
}

function escapeHtml(str) {
  return String(str).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

searchInput.addEventListener("input", renderTable);
refreshBtn.addEventListener("click", loadStudents);

document.querySelectorAll("#studentTable thead th[data-sort]").forEach((th) => {
  th.addEventListener("click", () => {
    const key = th.dataset.sort;
    sortState.dir = sortState.key === key ? -sortState.dir : 1;
    sortState.key = key;
    renderTable();
  });
});

/* ---------- Register service worker (same one the student app uses) ---------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}