/* ===================== EDGE — app logic (v3, Supabase-ready) ===================== */

const AUTH_KEY = "edge:auth";
const PROGRESS_KEY = "edge:v2";

/* ---------- Supabase client (falls back to offline demo mode if unconfigured) ---------- */

const supabaseConfigured =
  typeof window.SUPABASE_URL === "string" &&
  typeof window.SUPABASE_ANON_KEY === "string" &&
  !window.SUPABASE_URL.includes("YOUR-PROJECT") &&
  !window.SUPABASE_ANON_KEY.includes("YOUR-ANON");

const supabaseLibLoaded = typeof supabase !== "undefined";

// SUPABASE_ENABLED requires BOTH config filled in AND the library script
// having loaded — if either is missing, fall back to offline mode instead
// of crashing later when something tries to call sb.auth....
const SUPABASE_ENABLED = supabaseConfigured && supabaseLibLoaded;

const sb = SUPABASE_ENABLED
  ? supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
  : null;

if (!SUPABASE_ENABLED) {
  if (supabaseConfigured && !supabaseLibLoaded) {
    console.error("EDGE: supabase-config.js has your keys, but assets/vendor/supabase.js failed to load (check the file exists and the <script> path in index.html is correct). Falling back to offline mode.");
  } else {
    console.warn("EDGE: Supabase not configured — running in offline demo mode. Fill in supabase-config.js to enable real accounts + sync.");
  }
}

/* ---------- Content bank (MELC-based, Grade 9 English Term 1) ---------- */
/* Each item is tagged with its DepEd Term 1 learning competency (melc: "A"|"B"|"C").
   MELC_LABELS below gives the full competency text shown to students; melcLabel is
   the short label used on-screen. One lesson unlocks per week (see
   isLessonUnlocked()); items cycle through READING_ITEMS in order. */

const MELC_LABELS = {
  A: "Analyze structural and linguistic elements in Anglo-American poetry; revise for coherence, unity, and voice",
  B: "Analyze literary texts through historical, sociocultural, biographical, and related contextual lenses",
  C: "Identify meaning and purpose and prepare an original one-act play through prewriting",
};

const READING_ITEMS = [
  {
    melc: "A",
    melcLabel: "Poetry: Structure & Language",
    passage: "In the poem, the poet wrote: “The wind whispered wild and wandering words through the willow trees.” This line repeats the same starting consonant sound in several nearby words.",
    question: "Which sound device is the poet using in this line?",
    options: ["Alliteration", "Assonance", "Onomatopoeia", "Personification"],
    correct: 0,
  },
  {
    melc: "A",
    melcLabel: "Poetry: Structure & Language",
    passage: "A young writer first describes a quiet mind as being “like a still lake.” In the next draft, she rewrites it as “the mind is a still lake,” removing the word “like.”",
    question: "Which literary device does the revised line now use?",
    options: ["Simile", "Metaphor", "Hyperbole", "Alliteration"],
    correct: 1,
  },
  {
    melc: "A",
    melcLabel: "Poetry: Structure & Language",
    passage: "A student is revising this idea for a poem: “The rain fell. The streets flooded. People stayed inside.” The teacher asks for one smoother, more connected sentence.",
    question: "Which revision best improves the coherence of these ideas?",
    options: ["As the rain fell and the streets flooded, people stayed inside.", "The rain fell and the streets flooded and people stayed inside and it was bad.", "Rain. Streets. People. Inside.", "People stayed inside, the streets flooded, rain fell."],
    correct: 0,
  },
  {
    melc: "A",
    melcLabel: "Poetry: Structure & Language",
    passage: "A poem ends with the line: “I bent, but I did not break; I bowed, but I did not yield.”",
    question: "What tone or voice does this line most strongly convey?",
    options: ["Defeated and hopeless", "Determined and resilient", "Playful and carefree", "Confused and uncertain"],
    correct: 1,
  },
  {
    melc: "B",
    melcLabel: "Literary Contextual Lenses",
    passage: "A reader studies a poet’s difficult childhood and lonely adult life to better understand the sadness that appears throughout the poet’s work.",
    question: "Which contextual lens is being used here?",
    options: ["Historical", "Biographical", "Formalist", "Sociocultural"],
    correct: 1,
  },
  {
    melc: "B",
    melcLabel: "Literary Contextual Lenses",
    passage: "A reader researches the actual dates and major events of a war to better understand the setting of a poem about soldiers.",
    question: "Which lens is the reader applying?",
    options: ["Biographical", "Historical", "Reader-response", "Sociocultural"],
    correct: 1,
  },
  {
    melc: "B",
    melcLabel: "Literary Contextual Lenses",
    passage: "A reader examines the class differences and social customs of a story’s time period to explain why one character is treated unfairly by others.",
    question: "Which lens is being applied?",
    options: ["Formalist", "Psychological", "Sociocultural", "Biographical"],
    correct: 2,
  },
  {
    melc: "B",
    melcLabel: "Literary Contextual Lenses",
    question: "Which question would a reader most likely ask when using a sociocultural lens?",
    options: ["How many rhymes are in the poem?", "What year was the author born?", "How do social class and gender roles affect the characters?", "What font was used in the original publication?"],
    correct: 2,
  },
  {
    melc: "C",
    melcLabel: "One-Act Play Prewriting",
    question: "What is the main structural feature that defines a one-act play?",
    options: ["It has many acts and a large cast", "It focuses on one main conflict without act breaks", "It must be a comedy", "It has no dialogue"],
    correct: 1,
  },
  {
    melc: "C",
    melcLabel: "One-Act Play Prewriting",
    passage: "In a play script, a line reads: (She looks away sadly and lowers her voice.)",
    question: "What is this kind of text, written in italics inside parentheses, called?",
    options: ["Dialogue", "Monologue", "Stage directions", "Theme statement"],
    correct: 2,
  },
  {
    melc: "C",
    melcLabel: "One-Act Play Prewriting",
    passage: "A character in a one-act play struggles with her own fear of failure throughout the story, with no other character opposing her directly.",
    question: "What type of conflict is this?",
    options: ["Man vs. Man", "Man vs. Nature", "Man vs. Self", "Man vs. Society"],
    correct: 2,
  },
  {
    melc: "C",
    melcLabel: "One-Act Play Prewriting",
    passage: "During prewriting, a playwright fills out a character profile listing a character’s background, fears, and goals before writing any dialogue.",
    question: "What is the main purpose of this step?",
    options: ["To decide ticket prices", "To design the stage set", "To understand the character’s traits and motivations", "To list props needed for the show"],
    correct: 2,
  },
];

const LESSONS_PER_LEVEL = 5;

/* ---------- Pre-Test / Post-Test bank (MELC-based, Grade 9 English Term 1) ---------- */
/* 20 items total (7 / 7 / 6 across the three Term 1 competencies), used for both
   the Pre-Test and the Post-Test. Same melc/melcLabel tagging as READING_ITEMS. */

const TEST_ITEMS = [
  {
    melc: "A",
    melcLabel: "Poetry: Structure & Language",
    passage: "“The garden gate creaked and clanked as the wind pushed it back and forth.”",
    question: "Which sound device appears in the words “creaked” and “clanked”?",
    options: ["Simile", "Onomatopoeia", "Metaphor", "Personification"],
    correct: 1,
  },
  {
    melc: "A",
    melcLabel: "Poetry: Structure & Language",
    passage: "“The moon shone alone on the old stone road.”",
    question: "The repeated long “o” sound in “alone,” “old,” “stone,” and “road” is an example of which device?",
    options: ["Assonance", "Consonance", "Alliteration", "Rhyme scheme"],
    correct: 0,
  },
  {
    melc: "A",
    melcLabel: "Poetry: Structure & Language",
    question: "A traditional sonnet, one of the classic forms used in Anglo-American poetry, is made up of how many total lines?",
    options: ["8", "10", "14", "16"],
    correct: 2,
  },
  {
    melc: "A",
    melcLabel: "Poetry: Structure & Language",
    question: "Which set of line-ending words follows an AABB rhyme scheme?",
    options: ["light, bright, sea, free", "cat, dog, bat, log", "moon, star, soon, far", "sing, song, moon, star"],
    correct: 0,
  },
  {
    melc: "A",
    melcLabel: "Poetry: Structure & Language",
    passage: "“The trees along the ridge / lean toward the valley / where the river bends / and disappears from view.”",
    question: "The sentence continues across several lines without a pause at the end of each line. What is this technique called?",
    options: ["Caesura", "Couplet", "Enjambment", "Refrain"],
    correct: 2,
  },
  {
    melc: "A",
    melcLabel: "Poetry: Structure & Language",
    question: "A poet is revising a poem about the ocean to improve unity. Which set of words should the poet use consistently throughout the poem?",
    options: ["Tide, salt, current, waves", "Desk, chalk, bell, chair", "Engine, wheel, road, horn", "Petal, stem, bloom, garden"],
    correct: 0,
  },
  {
    melc: "A",
    melcLabel: "Poetry: Structure & Language",
    passage: "In a poem, a caged bird sings even though it cannot fly free.",
    question: "What does the caged bird most likely symbolize?",
    options: ["A pet that needs feeding", "A longing for freedom despite limits", "A warning about wild animals", "A description of bird anatomy"],
    correct: 1,
  },
  {
    melc: "B",
    melcLabel: "Literary Contextual Lenses",
    passage: "A critic studies a writer’s personal letters and diary entries to explain the grief expressed in the writer’s poems.",
    question: "This is an example of which lens?",
    options: ["Historical", "Biographical", "Sociocultural", "Formalist"],
    correct: 1,
  },
  {
    melc: "B",
    melcLabel: "Literary Contextual Lenses",
    passage: "A reader analyzes a poem about a famine by researching the real historical famine it describes.",
    question: "This is an example of which lens?",
    options: ["Biographical", "Historical", "Psychological", "Reader-response"],
    correct: 1,
  },
  {
    melc: "B",
    melcLabel: "Literary Contextual Lenses",
    passage: "A reader explains a character’s harsh treatment of servants by describing the strict social hierarchy of the story’s era.",
    question: "Which lens is this?",
    options: ["Formalist", "Sociocultural", "Biographical", "Historical"],
    correct: 1,
  },
  {
    melc: "B",
    melcLabel: "Literary Contextual Lenses",
    question: "Which lens focuses mainly on the text itself — its structure, word choice, and literary devices — rather than outside information about the author or time period?",
    options: ["Formalist", "Biographical", "Historical", "Sociocultural"],
    correct: 0,
  },
  {
    melc: "B",
    melcLabel: "Literary Contextual Lenses",
    passage: "A reader focuses on their own emotional reaction to a poem and how it connects to their personal experiences.",
    question: "Which lens is this?",
    options: ["Historical", "Reader-response", "Sociocultural", "Biographical"],
    correct: 1,
  },
  {
    melc: "B",
    melcLabel: "Literary Contextual Lenses",
    question: "Understanding a text’s “contextual lens” mainly means the reader is looking for what?",
    options: ["The exact publication date only", "The background factors that shape the story", "Grammar mistakes in the text", "The rhyme scheme only"],
    correct: 1,
  },
  {
    melc: "B",
    melcLabel: "Literary Contextual Lenses",
    passage: "A student wants to understand why a character values obedience so strongly, and learns the character’s culture practiced strict respect for elders.",
    question: "Which lens is being applied?",
    options: ["Sociocultural", "Formalist", "Reader-response", "Biographical"],
    correct: 0,
  },
  {
    melc: "C",
    melcLabel: "One-Act Play Prewriting",
    question: "Which part of a play’s structure is the event that sets the rest of the plot into motion?",
    options: ["Climax", "Exposition", "Inciting incident", "Resolution"],
    correct: 2,
  },
  {
    melc: "C",
    melcLabel: "One-Act Play Prewriting",
    question: "Which part of a play’s structure is the moment of greatest tension or turning point?",
    options: ["Exposition", "Climax", "Falling action", "Denouement"],
    correct: 1,
  },
  {
    melc: "C",
    melcLabel: "One-Act Play Prewriting",
    passage: "A character stands alone on stage and speaks their private thoughts aloud to the audience.",
    question: "What is this dramatic device called?",
    options: ["Dialogue", "Prologue", "Soliloquy", "Epilogue"],
    correct: 2,
  },
  {
    melc: "C",
    melcLabel: "One-Act Play Prewriting",
    question: "The underlying message or central idea a playwright wants the audience to understand is called the play’s:",
    options: ["Setting", "Plot", "Theme", "Climax"],
    correct: 2,
  },
  {
    melc: "C",
    melcLabel: "One-Act Play Prewriting",
    passage: "In a one-act play, a student’s character argues with her best friend over a broken promise.",
    question: "What kind of conflict is this?",
    options: ["Man vs. Self", "Man vs. Man", "Man vs. Nature", "Man vs. Society"],
    correct: 1,
  },
  {
    melc: "C",
    melcLabel: "One-Act Play Prewriting",
    question: "Which of the following is a key step during the prewriting stage of an original one-act play?",
    options: ["Selling tickets to the audience", "Filming the final performance", "Brainstorming a central conflict", "Hiring professional actors"],
    correct: 2,
  },
];

/* ---------- State ---------- */

function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore corrupt state */ }
  return {
    lesson: 0,
    streak: 0,
    level: 1,
    lastCompletedDate: null,
    history: [], // { dateKey, dateLabel, question, accuracy }
    gradeLevel: null,
    firstName: "",
    lastName: "",
    lang: "en",
    lastReminderDate: null,
    preTest: null,  // { score, total, date }
    postTest: null, // { score, total, date }
  };
}

function saveProgress() {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  if (SUPABASE_ENABLED && sb && currentUserId) {
    syncProgressToSupabase();
  }
}

let progress = loadProgress();
let wrongAttempts = 0;
let currentLang = progress.lang || "en";

/* ---------- Helpers ---------- */

function todayKey(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`; // ISO date — also valid for Postgres `date` columns
}

function shortLabel(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function normalize(str) {
  return str.trim().toLowerCase().replace(/[.!?,]/g, "");
}

/* ===================== LOGIN / AUTH ===================== */

const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const toggleEye = document.getElementById("toggleEye");
const passwordInput = document.getElementById("password");
const emailInput = document.getElementById("email");
const firstNameInput = document.getElementById("firstName");
const lastNameInput = document.getElementById("lastName");
const gradeLevelInput = document.getElementById("gradeLevel");
const signupOnlyEls = document.querySelectorAll(".signup-only");
const authTitleEl = document.getElementById("authTitle");
const authSubmitBtn = document.getElementById("authSubmitBtn");
const authSwitchText = document.getElementById("authSwitchText");
const authModeToggle = document.getElementById("authModeToggle");
const offlineBanner = document.getElementById("offlineBanner");

let authMode = "signin"; // "signin" | "signup"
let currentUserId = null; // set once signed in / hydrated via Supabase

if (!SUPABASE_ENABLED) {
  offlineBanner.style.display = "block";
  if (supabaseConfigured && !supabaseLibLoaded) {
    offlineBanner.innerHTML = "Supabase keys found, but the Supabase library didn't load — check <code>assets/vendor/supabase.js</code> exists. Running in offline demo mode for now.";
  }
}

function applyAuthMode() {
  const isSignup = authMode === "signup";
  const showSignupFields = !SUPABASE_ENABLED || isSignup;

  signupOnlyEls.forEach((el) => el.classList.toggle("hidden", !showSignupFields));
  gradeLevelInput.required = showSignupFields;
  firstNameInput.required = showSignupFields;
  lastNameInput.required = showSignupFields;

  authTitleEl.textContent = isSignup ? "Create Student Account" : "Student Login";
  authSubmitBtn.textContent = isSignup ? "Create Account & Sign In" : "Sign In to Dashboard";
  authSwitchText.textContent = isSignup ? "Already have an account?" : "New here?";
  authModeToggle.textContent = isSignup ? "Sign in" : "Create an account";
}
applyAuthMode();

authModeToggle.addEventListener("click", () => {
  authMode = authMode === "signin" ? "signup" : "signin";
  loginError.textContent = "";
  applyAuthMode();
});

toggleEye.addEventListener("click", () => {
  const isHidden = passwordInput.type === "password";
  passwordInput.type = isHidden ? "text" : "password";
  toggleEye.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = emailInput.value.trim();
  const firstName = firstNameInput.value.trim();
  const lastName = lastNameInput.value.trim();
  const gradeLevel = gradeLevelInput.value;
  const password = passwordInput.value;
  const needsSignupFields = !SUPABASE_ENABLED || authMode === "signup";

  if (!email || password.length < 6 || (needsSignupFields && (!gradeLevel || !firstName || !lastName))) {
    loginError.textContent = needsSignupFields
      ? "Enter your first name, last name, email, grade level, and a password (6+ characters)."
      : "Enter your email and password (6+ characters).";
    return;
  }

  loginError.textContent = "";
  authSubmitBtn.disabled = true;
  const originalLabel = authSubmitBtn.textContent;
  authSubmitBtn.textContent = "Please wait…";

  try {
    if (SUPABASE_ENABLED) {
      if (authMode === "signup") {
        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: { data: { grade_level: gradeLevel, first_name: firstName, last_name: lastName } }, // read by the handle_new_user trigger
        });
        if (error) throw error;

        if (!data.session) {
          // Email confirmation is required on this project — can't log in yet.
          loginError.textContent = "Account created! Check your email to confirm, then sign in.";
          authMode = "signin";
          applyAuthMode();
          authSubmitBtn.disabled = false;
          authSubmitBtn.textContent = "Sign In to Dashboard";
          return;
        }

        if (data.user) {
          currentUserId = data.user.id;
          // Fallback in case the DB trigger isn't installed yet (older schema
          // runs before the trigger was added) — safe to keep even with the
          // trigger present, since these are simple upserts.
          const { error: profileErr } = await sb.from("profiles")
            .upsert({ id: data.user.id, grade_level: gradeLevel, first_name: firstName, last_name: lastName });
          if (profileErr) console.error("EDGE: profile upsert failed", profileErr);

          const { error: progressErr } = await sb.from("progress")
            .upsert({ user_id: data.user.id, lang: "en" });
          if (progressErr) console.error("EDGE: progress upsert failed", progressErr);
        }
      } else {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        currentUserId = data.user.id;
      }
      await hydrateFromSupabase();
    } else {
      // Offline demo mode — no real backend, any non-empty credentials work.
      sessionStorage.setItem(AUTH_KEY, JSON.stringify({ email, at: Date.now() }));
      progress.gradeLevel = gradeLevel;
      if (firstName) progress.firstName = firstName;
      if (lastName) progress.lastName = lastName;
      currentFirstName = progress.firstName || "";
      currentLastName = progress.lastName || "";
      saveProgress();
      setAvatarDisplay(localStorage.getItem(AVATAR_LOCAL_KEY) || null);
    }

    updateAvatarInitials(email);
    enterApp();
  } catch (err) {
    loginError.textContent = err.message || "Something went wrong. Please try again.";
    authSubmitBtn.disabled = false;
    authSubmitBtn.textContent = originalLabel;
  }
});

document.getElementById("signOutBtn").addEventListener("click", async () => {
  if (SUPABASE_ENABLED && sb) {
    await sb.auth.signOut();
  }
  currentUserId = null;
  sessionStorage.removeItem(AUTH_KEY);
  goToScreen("login");
});

let currentUserEmail = "";
let currentFirstName = "";
let currentLastName = "";

function updateAvatarInitials(email) {
  currentUserEmail = email || "";
  const initials = deriveInitials();
  document.getElementById("avatarInitials").textContent = initials;
  document.getElementById("menuAvatarInitials").textContent = initials;
  document.getElementById("profileMenuEmail").textContent = fullName() || email || "—";
}

function deriveInitials() {
  if (currentFirstName || currentLastName) {
    const a = currentFirstName.trim().charAt(0);
    const b = currentLastName.trim().charAt(0);
    const combo = (a + b).toUpperCase();
    if (combo) return combo;
  }
  return (currentUserEmail || "").trim().slice(0, 2).toUpperCase() || "ST";
}

function fullName() {
  return [currentFirstName, currentLastName].filter(Boolean).join(" ").trim();
}

/* Call after currentFirstName/currentLastName are set (login, hydrate) to
   refresh anything already on screen that shows the name/initials. */
function refreshIdentityDisplay() {
  const initials = deriveInitials();
  document.getElementById("avatarInitials").textContent = initials;
  document.getElementById("menuAvatarInitials").textContent = initials;
  document.getElementById("pageAvatarInitials").textContent = initials;
  document.getElementById("profileMenuEmail").textContent = fullName() || currentUserEmail || "—";
}

function enterApp() {
  goToScreen("app");
  setTab("home");
  renderHome();
}

/* ---------- Screen switching (splash vs lock gate vs login vs app shell) ---------- */

const screens = {
  splash: document.getElementById("screen-splash"),
  lock: document.getElementById("screen-lock"),
  login: document.getElementById("screen-login"),
  app: document.getElementById("screen-app"),
};

function goToScreen(name) {
  Object.entries(screens).forEach(([key, el]) => {
    el.setAttribute("aria-hidden", key === name ? "false" : "true");
  });
}

/* ---------- Pull this student's data down from Supabase into local state ---------- */

async function hydrateFromSupabase() {
  if (!SUPABASE_ENABLED || !sb) return;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;
  currentUserId = user.id;

  const [profileRes, progressRes, historyRes, preTestRes, postTestRes] = await Promise.all([
    sb.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    sb.from("progress").select("*").eq("user_id", user.id).maybeSingle(),
    sb.from("lesson_history").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
    sb.from("test_results").select("*").eq("user_id", user.id).eq("test_type", "pre").order("taken_at", { ascending: false }).limit(1),
    sb.from("test_results").select("*").eq("user_id", user.id).eq("test_type", "post").order("taken_at", { ascending: false }).limit(1),
  ]);

  const profileRow = profileRes.data;
  const progressRow = progressRes.data;
  const historyRows = historyRes.data || [];
  const preRow = (preTestRes.data || [])[0];
  const postRow = (postTestRes.data || [])[0];

  progress = {
    lesson: progressRow?.lesson ?? 0,
    streak: progressRow?.streak ?? 0,
    level: progressRow?.level ?? 1,
    lastCompletedDate: progressRow?.last_completed_date ?? null,
    lastReminderDate: progressRow?.last_reminder_date ?? null,
    lang: progressRow?.lang ?? "en",
    gradeLevel: profileRow?.grade_level ?? null,
    firstName: profileRow?.first_name ?? "",
    lastName: profileRow?.last_name ?? "",
    history: historyRows.map((r) => ({
      dateKey: r.date_key,
      dateKeyRaw: r.created_at,
      dateLabel: new Date(r.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      question: r.question,
      accuracy: r.accuracy,
    })),
    preTest: preRow ? { score: preRow.score, total: preRow.total, date: preRow.taken_at } : null,
    postTest: postRow ? { score: postRow.score, total: postRow.total, date: postRow.taken_at } : null,
  };
  currentLang = progress.lang;
  currentFirstName = progress.firstName || "";
  currentLastName = progress.lastName || "";
  refreshIdentityDisplay();
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); // cache locally, skip re-triggering a sync
  setAvatarDisplay(profileRow?.avatar_url || null);
}

/* ---------- Push local progress up to Supabase (fire-and-forget) ---------- */

async function syncProgressToSupabase() {
  if (!SUPABASE_ENABLED || !sb || !currentUserId) return;
  const { error } = await sb.from("progress").upsert({
    user_id: currentUserId,
    lesson: progress.lesson,
    streak: progress.streak,
    level: progress.level,
    last_completed_date: progress.lastCompletedDate,
    last_reminder_date: progress.lastReminderDate,
    lang: progress.lang,
    updated_at: new Date().toISOString(),
  });
  if (error) console.error("EDGE: progress sync failed", error);
}

/* ---------- Resume session on load (runs after the lock gate clears) ---------- */

async function initAuth() {
  if (SUPABASE_ENABLED && sb) {
    const { data: { session } } = await sb.auth.getSession();
    if (session && session.user) {
      await hydrateFromSupabase();
      updateAvatarInitials(session.user.email || "ST");
      enterApp();
      return;
    }
    goToScreen("login");
  } else {
    const savedAuth = sessionStorage.getItem(AUTH_KEY);
    if (savedAuth) {
      currentFirstName = progress.firstName || "";
      currentLastName = progress.lastName || "";
      try { updateAvatarInitials(JSON.parse(savedAuth).email || "ST"); } catch (e) {}
      setAvatarDisplay(localStorage.getItem(AVATAR_LOCAL_KEY) || null);
      enterApp();
    } else {
      goToScreen("login");
    }
  }
}

/* ===================== PROFILE MENU, THEME, AVATAR ===================== */

const THEME_KEY = "edge:theme";
const AVATAR_LOCAL_KEY = "edge:avatarDataUrl"; // offline-mode-only fallback, device-local

const profileMenu = document.getElementById("profileMenu");
const avatarBtn = document.getElementById("avatarBtn");
const avatarPhotoEl = document.getElementById("avatarPhoto");
const avatarInitialsEl = document.getElementById("avatarInitials");
const menuAvatarPhotoEl = document.getElementById("menuAvatarPhoto");
const menuAvatarInitialsEl = document.getElementById("menuAvatarInitials");
const profilePhotoBtn = document.getElementById("profilePhotoBtn");
const avatarFileInput = document.getElementById("avatarFileInput");
const profilePhotoStatusEl = document.getElementById("profilePhotoStatus");
const themeSwitch = document.getElementById("themeSwitch");

/* ---- Theme (light default, dark optional, saved per device) ---- */

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  themeSwitch.setAttribute("aria-checked", theme === "dark" ? "true" : "false");
  localStorage.setItem(THEME_KEY, theme);
  if (typeof rebuildChartForTheme === "function") rebuildChartForTheme();
}

applyTheme(localStorage.getItem(THEME_KEY) || "light");

themeSwitch.addEventListener("click", () => {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  applyTheme(isDark ? "light" : "dark");
});

/* ---- Avatar display (photo if set, otherwise initials) ---- */

function setAvatarDisplay(photoUrl) {
  const show = Boolean(photoUrl);
  const pageAvatarPhotoEl = document.getElementById("pageAvatarPhoto");
  const pageAvatarInitialsEl = document.getElementById("pageAvatarInitials");

  avatarPhotoEl.style.display = show ? "block" : "none";
  avatarInitialsEl.style.display = show ? "none" : "flex";
  menuAvatarPhotoEl.style.display = show ? "block" : "none";
  menuAvatarInitialsEl.style.display = show ? "none" : "flex";
  pageAvatarPhotoEl.style.display = show ? "block" : "none";
  pageAvatarInitialsEl.style.display = show ? "none" : "flex";
  if (show) {
    avatarPhotoEl.src = photoUrl;
    menuAvatarPhotoEl.src = photoUrl;
    pageAvatarPhotoEl.src = photoUrl;
  }
}

/* ---- Dropdown open/close ---- */

function closeProfileMenu() {
  profileMenu.setAttribute("aria-hidden", "true");
  avatarBtn.setAttribute("aria-expanded", "false");
}

avatarBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  const isOpen = profileMenu.getAttribute("aria-hidden") === "false";
  profileMenu.setAttribute("aria-hidden", isOpen ? "true" : "false");
  avatarBtn.setAttribute("aria-expanded", isOpen ? "false" : "true");
});

document.addEventListener("click", (e) => {
  if (profileMenu.getAttribute("aria-hidden") === "false" && !profileMenu.contains(e.target) && e.target !== avatarBtn) {
    closeProfileMenu();
  }
});

document.getElementById("menuSettingsBtn").addEventListener("click", () => {
  closeProfileMenu();
  setTab("more");
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  document.getElementById("settingsThemeSwitch").setAttribute("aria-checked", isDark ? "true" : "false");
  document.getElementById("passwordStatus").textContent = "";
  showMoreView("settings");
});

document.getElementById("menuLogoutBtn").addEventListener("click", () => {
  closeProfileMenu();
  document.getElementById("signOutBtn").click();
});

/* ---- Profile photo upload (with crop step) ---- */

profilePhotoBtn.addEventListener("click", () => avatarFileInput.click());
document.getElementById("profilePagePhotoBtn").addEventListener("click", () => avatarFileInput.click());

function setAvatarStatus(msg) {
  profilePhotoStatusEl.textContent = msg;
  document.getElementById("profilePagePhotoStatus").textContent = msg;
}

avatarFileInput.addEventListener("change", () => {
  const file = avatarFileInput.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    setAvatarStatus("Please choose an image file.");
    avatarFileInput.value = "";
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    setAvatarStatus("Image must be under 8MB.");
    avatarFileInput.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = () => openCropModal(reader.result);
  reader.readAsDataURL(file);
});

/* Upload the final cropped image blob — shared by both online (Supabase
   Storage) and offline (localStorage data URL) paths. */
async function uploadAvatarBlob(blob) {
  setAvatarStatus("Saving…");

  if (SUPABASE_ENABLED && sb && currentUserId) {
    try {
      const path = `${currentUserId}/avatar.jpg`;

      const { error: uploadError } = await sb.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, cacheControl: "3600", contentType: "image/jpeg" });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = sb.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`; // cache-bust so the new photo shows immediately

      const { error: profileError } = await sb.from("profiles").update({ avatar_url: publicUrl }).eq("id", currentUserId);
      if (profileError) throw profileError;

      setAvatarDisplay(publicUrl);
      setAvatarStatus("Photo updated.");
    } catch (err) {
      console.error("EDGE: avatar upload failed", err);
      setAvatarStatus("Upload failed — try again.");
    }
  } else {
    // Offline demo mode: no backend to upload to, so save a local copy
    // (this device/browser only, won't sync — see README).
    const reader = new FileReader();
    reader.onload = () => {
      localStorage.setItem(AVATAR_LOCAL_KEY, reader.result);
      setAvatarDisplay(reader.result);
      setAvatarStatus("Saved on this device (offline mode).");
    };
    reader.readAsDataURL(blob);
  }

  setTimeout(() => setAvatarStatus(""), 2500);
}

/* ---- Crop modal: drag to reposition, slider to zoom ---- */

const CROP_VIEWPORT = 260;
const CROP_OUTPUT = 480;

const cropModal = document.getElementById("cropModal");
const cropViewport = document.getElementById("cropViewport");
const cropImageEl = document.getElementById("cropImage");
const cropZoomEl = document.getElementById("cropZoom");

const cropState = {
  naturalW: 0, naturalH: 0, baseScale: 1, zoom: 1,
  offsetX: 0, offsetY: 0,
  dragging: false, startX: 0, startY: 0, startOffsetX: 0, startOffsetY: 0,
};

function openCropModal(dataUrl) {
  cropImageEl.src = dataUrl;
  cropModal.setAttribute("aria-hidden", "false");
}

function closeCropModal() {
  cropModal.setAttribute("aria-hidden", "true");
  avatarFileInput.value = "";
}

function cropTotalScale() {
  return cropState.baseScale * cropState.zoom;
}

function clampCropOffsets() {
  const scale = cropTotalScale();
  const dispW = cropState.naturalW * scale;
  const dispH = cropState.naturalH * scale;
  const minX = CROP_VIEWPORT - dispW;
  const minY = CROP_VIEWPORT - dispH;
  cropState.offsetX = Math.min(0, Math.max(minX, cropState.offsetX));
  cropState.offsetY = Math.min(0, Math.max(minY, cropState.offsetY));
}

function applyCropTransform() {
  clampCropOffsets();
  const scale = cropTotalScale();
  cropImageEl.style.width = `${cropState.naturalW * scale}px`;
  cropImageEl.style.height = `${cropState.naturalH * scale}px`;
  cropImageEl.style.transform = `translate(${cropState.offsetX}px, ${cropState.offsetY}px)`;
}

cropImageEl.addEventListener("load", () => {
  cropState.naturalW = cropImageEl.naturalWidth;
  cropState.naturalH = cropImageEl.naturalHeight;
  cropState.baseScale = CROP_VIEWPORT / Math.min(cropState.naturalW, cropState.naturalH);
  cropState.zoom = 1;
  cropZoomEl.value = 100;
  cropState.offsetX = (CROP_VIEWPORT - cropState.naturalW * cropState.baseScale) / 2;
  cropState.offsetY = (CROP_VIEWPORT - cropState.naturalH * cropState.baseScale) / 2;
  applyCropTransform();
});

cropZoomEl.addEventListener("input", () => {
  cropState.zoom = Number(cropZoomEl.value) / 100;
  applyCropTransform();
});

cropViewport.addEventListener("pointerdown", (e) => {
  cropState.dragging = true;
  cropState.startX = e.clientX;
  cropState.startY = e.clientY;
  cropState.startOffsetX = cropState.offsetX;
  cropState.startOffsetY = cropState.offsetY;
  cropViewport.setPointerCapture(e.pointerId);
});

cropViewport.addEventListener("pointermove", (e) => {
  if (!cropState.dragging) return;
  cropState.offsetX = cropState.startOffsetX + (e.clientX - cropState.startX);
  cropState.offsetY = cropState.startOffsetY + (e.clientY - cropState.startY);
  applyCropTransform();
});

["pointerup", "pointercancel"].forEach((evt) =>
  cropViewport.addEventListener(evt, () => { cropState.dragging = false; })
);

document.getElementById("cropCancelBtn").addEventListener("click", closeCropModal);

document.getElementById("cropSaveBtn").addEventListener("click", () => {
  const scale = cropTotalScale();
  const cropX = -cropState.offsetX / scale;
  const cropY = -cropState.offsetY / scale;
  const cropSize = CROP_VIEWPORT / scale;

  const canvas = document.createElement("canvas");
  canvas.width = CROP_OUTPUT;
  canvas.height = CROP_OUTPUT;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(cropImageEl, cropX, cropY, cropSize, cropSize, 0, 0, CROP_OUTPUT, CROP_OUTPUT);

  canvas.toBlob(async (blob) => {
    if (!blob) return;
    closeCropModal();
    await uploadAvatarBlob(blob);
  }, "image/jpeg", 0.92);
});

/* ===================== TAB NAVIGATION ===================== */

const tabPanels = document.querySelectorAll(".tab-panel");
const tabButtons = document.querySelectorAll(".tab-btn");

function setTab(name) {
  tabPanels.forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === name));
  tabButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === name));

  if (name === "home") renderHome();
  if (name === "dashboard") renderDashboard();
  if (name === "learn") renderReading();
  if (name === "test") renderTestHome();
  if (name === "more" && typeof showMoreView === "function") showMoreView("main");
}

tabButtons.forEach((btn) => btn.addEventListener("click", () => setTab(btn.dataset.tab)));
document.querySelectorAll("[data-goto]").forEach((el) => {
  el.addEventListener("click", () => setTab(el.dataset.goto));
});

/* ===================== HOME ===================== */

function renderHome() {
  document.getElementById("homeWeek").textContent = lessonsThisWeek();
  document.getElementById("homeStreak").textContent = `${progress.streak} week${progress.streak === 1 ? "" : "s"}`;
  document.getElementById("homeStreakInline").textContent = progress.streak;
  document.getElementById("homeLevel").textContent = progress.level;

  const eyebrow = document.querySelector(".greeting-eyebrow");
  if (eyebrow) {
    eyebrow.textContent = progress.gradeLevel ? `Grade ${progress.gradeLevel} · Welcome back` : "Welcome back";
  }

  const title = document.querySelector(".greeting-title");
  if (title) {
    const firstName = (progress.firstName || currentFirstName || "").trim();
    title.textContent = firstName ? `Hi ${firstName}, ready for this week's lesson?` : "Ready for this week's lesson?";
  }
}

function lessonsThisWeek() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay()); // Sunday as week start
  start.setHours(0, 0, 0, 0);
  return progress.history.filter((h) => new Date(h.dateKeyRaw) >= start).length;
}

/* ===================== LEARN (reading module) ===================== */
/* English-only, MELC-tagged (see MELC_LABELS + READING_ITEMS above). Each
   item cycles through in order; competencyPillEl surfaces which Term 1
   learning competency the current item covers. */

const passageEl = document.getElementById("passageText");
const passageLabelEl = document.getElementById("passageLabel");
const readingQuestionEl = document.getElementById("readingQuestion");
const readingOptionsEl = document.getElementById("readingOptions");
const readingFeedbackEl = document.getElementById("readingFeedback");
const lessonPillEl = document.getElementById("lessonPill");
const competencyPillEl = document.getElementById("competencyPill");
const readingActiveCardEl = document.getElementById("readingActiveCard");
const readingLockedCardEl = document.getElementById("readingLockedCard");
const lessonLockedNoteEl = document.getElementById("lessonLockedNote");

// One lesson unlocks per week, per feedback: each lesson's question stays
// available for the week, then the next lesson opens the following week.
// Gated off progress.lastCompletedDate (already tracked for the old daily
// streak) — no new storage needed.
const LESSON_COOLDOWN_DAYS = 7;

function daysBetween(dateStrA, dateStrB) {
  return Math.round((new Date(dateStrB) - new Date(dateStrA)) / (1000 * 60 * 60 * 24));
}

function isLessonUnlocked() {
  if (!progress.lastCompletedDate) return true; // very first lesson — no wait
  return daysBetween(progress.lastCompletedDate, todayKey()) >= LESSON_COOLDOWN_DAYS;
}

function daysUntilNextLesson() {
  if (!progress.lastCompletedDate) return 0;
  return Math.max(0, LESSON_COOLDOWN_DAYS - daysBetween(progress.lastCompletedDate, todayKey()));
}

function currentReadingItem() {
  return READING_ITEMS[progress.lesson % READING_ITEMS.length];
}

function renderReading() {
  lessonPillEl.textContent = `Lesson ${progress.lesson + 1}`;

  if (!isLessonUnlocked()) {
    readingActiveCardEl.style.display = "none";
    readingLockedCardEl.style.display = "flex";
    const remaining = daysUntilNextLesson();
    lessonLockedNoteEl.textContent =
      remaining <= 0 ? "A new lesson unlocks soon." : `A new lesson unlocks in ${remaining} day${remaining === 1 ? "" : "s"}.`;
    return;
  }

  readingLockedCardEl.style.display = "none";
  readingActiveCardEl.style.display = "block";

  const item = currentReadingItem();
  competencyPillEl.textContent = item.melcLabel;
  // Some items are passage-free (the question stands on its own) — hide the
  // passage card entirely rather than showing an empty box.
  const hasPassage = !!item.passage;
  passageLabelEl.style.display = hasPassage ? "block" : "none";
  passageEl.style.display = hasPassage ? "block" : "none";
  passageEl.textContent = hasPassage ? item.passage : "";
  readingQuestionEl.textContent = item.question;
  readingFeedbackEl.textContent = "";
  readingFeedbackEl.className = "reading-feedback";
  wrongAttempts = 0;
  renderReadingOptions(item);
}
renderReading();

function renderReadingOptions(item) {
  readingOptionsEl.innerHTML = "";
  item.options.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.className = "test-option-btn";
    btn.type = "button";
    btn.textContent = opt;
    btn.addEventListener("click", () => selectReadingOption(i));
    readingOptionsEl.appendChild(btn);
  });
}

// Multiple-choice: a wrong pick shows which option was correct, then resets
// after a moment so the student can try again — the lesson only completes
// (and advances) once they pick the right option, same "keep trying" spirit
// the typed-answer version had.
function selectReadingOption(selectedIndex) {
  const item = currentReadingItem();
  const buttons = readingOptionsEl.querySelectorAll(".test-option-btn");
  buttons.forEach((b) => (b.disabled = true));

  const isCorrect = selectedIndex === item.correct;
  buttons[selectedIndex].classList.add(isCorrect ? "correct" : "incorrect");
  if (!isCorrect) buttons[item.correct].classList.add("correct");

  if (isCorrect) {
    readingFeedbackEl.textContent = "Correct! Lesson complete.";
    readingFeedbackEl.className = "reading-feedback correct";
    completeLesson(item);
    setTimeout(renderReading, 900);
  } else {
    wrongAttempts += 1;
    readingFeedbackEl.textContent = "Not quite — check the passage and try again.";
    readingFeedbackEl.className = "reading-feedback wrong";
    setTimeout(() => {
      readingFeedbackEl.textContent = "";
      readingFeedbackEl.className = "reading-feedback";
      buttons.forEach((b) => {
        b.disabled = false;
        b.classList.remove("correct", "incorrect");
      });
    }, 1100);
  }
}

function completeLesson(item) {
  const today = todayKey();
  // Streak now counts consecutive *weeks* with a completed lesson (lessons
  // are gated to one per week — see isLessonUnlocked() above). Continues if
  // this completion lands in the very next weekly window after the last
  // one; resets if a week (or more) was skipped.
  if (!progress.lastCompletedDate) {
    progress.streak = 1;
  } else {
    const gap = daysBetween(progress.lastCompletedDate, today);
    if (gap >= LESSON_COOLDOWN_DAYS && gap < LESSON_COOLDOWN_DAYS * 2) {
      progress.streak += 1;
    } else if (gap >= LESSON_COOLDOWN_DAYS * 2) {
      progress.streak = 1;
    }
    // gap < 7 shouldn't happen (the weekly gate prevents it), so streak is
    // left unchanged as a safety fallback.
  }
  progress.lastCompletedDate = today;

  progress.lesson += 1;
  progress.level = Math.floor(progress.lesson / LESSONS_PER_LEVEL) + 1;

  const accuracy = Math.max(50, 100 - wrongAttempts * 15);
  progress.history.push({
    dateKey: today,
    dateKeyRaw: new Date().toISOString(),
    dateLabel: shortLabel(0),
    question: item.question,
    accuracy,
  });
  // keep the last 60 entries so storage doesn't grow forever
  progress.history = progress.history.slice(-60);

  saveProgress();

  if (SUPABASE_ENABLED && sb && currentUserId) {
    sb.from("lesson_history").insert({
      user_id: currentUserId,
      date_key: today,
      question: item.question,
      accuracy,
    }).then(({ error }) => { if (error) console.error("EDGE: lesson history sync failed", error); });
  }

  renderHome();
  if (window.__chartInstance) refreshChart();
}

/* ===================== DASHBOARD ===================== */

function animateNumber(el, target, duration = 650) {
  const startVal = 0;
  const startTime = performance.now();
  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    el.textContent = Math.round(startVal + (target - startVal) * eased);
    if (progress < 1) requestAnimationFrame(tick);
    else el.textContent = target;
  }
  requestAnimationFrame(tick);
}

function renderDashboard() {
  animateNumber(document.getElementById("statWeek"), lessonsThisWeek());
  animateNumber(document.getElementById("statStreak"), progress.streak);
  document.getElementById("statStreakNote").textContent =
    progress.streak === 0 ? "complete a lesson to start" : "weeks in a row";
  animateNumber(document.getElementById("statLevel"), progress.level);

  const remaining = LESSONS_PER_LEVEL - (progress.lesson % LESSONS_PER_LEVEL);
  document.getElementById("statLevelNote").textContent =
    remaining === LESSONS_PER_LEVEL ? "level up! new set unlocked" : `${remaining} lesson${remaining === 1 ? "" : "s"} to next level`;

  if (window.__chartInstance) {
    refreshChart();
  } else {
    renderChart();
  }

  renderHistoryList();
}

/* Detailed Progress list: every completed lesson (newest first), with the
   question that was asked and the accuracy earned on that attempt. Reads
   straight from progress.history, which is already synced to Supabase's
   lesson_history table (or kept in localStorage in offline mode) — so no
   extra data fetching is needed here. */
const historyListEl = document.getElementById("historyList");
const HISTORY_LIST_LIMIT = 25;

function accuracyBand(accuracy) {
  if (accuracy >= 85) return "acc-high";
  if (accuracy >= 65) return "acc-mid";
  return "acc-low";
}

function renderHistoryList() {
  const entries = progress.history.slice().reverse().slice(0, HISTORY_LIST_LIMIT);

  if (!entries.length) {
    historyListEl.innerHTML = `<p class="history-empty">No lessons completed yet — finish one in the Learn tab to see it here.</p>`;
    return;
  }

  historyListEl.innerHTML = entries
    .map((h) => {
      const dateLabel = h.dateKeyRaw
        ? new Date(h.dateKeyRaw).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
        : h.dateKey || "—";
      return `
      <div class="history-item">
        <div class="history-item-main">
          <p class="history-item-question">${escapeHtml(h.question || "Lesson")}</p>
          <p class="history-item-date">${escapeHtml(dateLabel)}</p>
        </div>
        <span class="history-item-accuracy ${accuracyBand(h.accuracy)}">${h.accuracy}%</span>
      </div>`;
    })
    .join("");
}

function escapeHtml(str) {
  return String(str).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function last7DaysData() {
  const labels = [];
  const lessonCounts = [];
  const accuracyAvgs = [];

  for (let i = 6; i >= 0; i--) {
    const key = todayKey(-i);
    labels.push(shortLabel(-i));
    const dayEntries = progress.history.filter((h) => h.dateKey === key);
    lessonCounts.push(dayEntries.length);
    const avgAcc = dayEntries.length
      ? Math.round(dayEntries.reduce((sum, h) => sum + h.accuracy, 0) / dayEntries.length)
      : 0;
    accuracyAvgs.push(avgAcc);
  }
  return { labels, lessonCounts, accuracyAvgs };
}

function getChartColors() {
  const s = getComputedStyle(document.documentElement);
  const v = (name, fallback) => (s.getPropertyValue(name).trim() || fallback);
  return {
    green: v("--green", "#65A238"),
    greenFill: v("--chart-green-fill", "rgba(101,162,56,0.10)"),
    teal: v("--teal", "#127A91"),
    tealFill: v("--chart-teal-fill", "rgba(18,122,145,0.08)"),
    ink: v("--ink", "#17181A"),
    muted: v("--muted", "#7A8892"),
    cardBg: v("--card-bg", "#FFFFFF"),
    line: v("--line", "#E7ECEF"),
  };
}

function renderChart() {
  const ctx = document.getElementById("analyticsChart");
  if (!ctx || typeof Chart === "undefined") return;
  const { labels, lessonCounts, accuracyAvgs } = last7DaysData();
  const c = getChartColors();

  window.__chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Lessons completed",
          data: lessonCounts,
          borderColor: c.green,
          backgroundColor: c.greenFill,
          tension: 0.45,
          fill: true,
          pointRadius: 0,
          borderWidth: 2,
          yAxisID: "y",
        },
        {
          label: "Accuracy %",
          data: accuracyAvgs,
          borderColor: c.teal,
          backgroundColor: c.tealFill,
          tension: 0.45,
          fill: true,
          pointRadius: 0,
          borderWidth: 2,
          yAxisID: "y1",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: c.cardBg,
          titleColor: c.ink,
          bodyColor: c.ink,
          borderColor: c.line,
          borderWidth: 1,
          padding: 12,
          titleFont: { weight: "700" },
          bodyFont: { weight: "600" },
          boxPadding: 4,
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: c.muted, font: { size: 11 } } },
        y: {
          beginAtZero: true,
          position: "left",
          grid: { color: c.line },
          ticks: { color: c.muted, font: { size: 11 }, stepSize: 1 },
        },
        y1: {
          beginAtZero: true,
          max: 100,
          position: "right",
          grid: { display: false },
          ticks: { color: c.muted, font: { size: 11 }, stepSize: 25 },
        },
      },
    },
  });
}

function refreshChart() {
  const { labels, lessonCounts, accuracyAvgs } = last7DaysData();
  const chart = window.__chartInstance;
  chart.data.labels = labels;
  chart.data.datasets[0].data = lessonCounts;
  chart.data.datasets[1].data = accuracyAvgs;
  chart.update();
}

/* Rebuild the chart with fresh colors whenever the theme changes, so it
   doesn't stay stuck with light-theme (or dark-theme) colors after a toggle. */
function rebuildChartForTheme() {
  if (!window.__chartInstance) return;
  window.__chartInstance.destroy();
  window.__chartInstance = null;
  renderChart();
}

/* ===================== MORE ===================== */

/* ---- Sub-view navigation: main menu <-> Profile <-> Settings ---- */

const moreMainView = document.getElementById("moreMainView");
const moreProfileView = document.getElementById("moreProfileView");
const moreSettingsView = document.getElementById("moreSettingsView");

function showMoreView(view) {
  moreMainView.style.display = view === "main" ? "block" : "none";
  moreProfileView.style.display = view === "profile" ? "block" : "none";
  moreSettingsView.style.display = view === "settings" ? "block" : "none";
}

document.getElementById("moreProfileItem").addEventListener("click", () => {
  document.getElementById("profileFirstName").value = progress.firstName || currentFirstName || "";
  document.getElementById("profileLastName").value = progress.lastName || currentLastName || "";
  document.getElementById("profileEmailDisplay").value = currentUserEmail || "";
  document.getElementById("saveProfileStatus").textContent = "";
  showMoreView("profile");
});

document.getElementById("profileBackBtn").addEventListener("click", () => showMoreView("main"));

document.getElementById("moreSettingsItem").addEventListener("click", () => {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  document.getElementById("settingsThemeSwitch").setAttribute("aria-checked", isDark ? "true" : "false");
  document.getElementById("passwordStatus").textContent = "";
  document.getElementById("newPassword").value = "";
  document.getElementById("confirmPassword").value = "";
  showMoreView("settings");
});

document.getElementById("settingsBackBtn").addEventListener("click", () => showMoreView("main"));

/* Keep the Settings-page theme switch in sync with the dropdown's one */
document.getElementById("settingsThemeSwitch").addEventListener("click", () => {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  applyTheme(isDark ? "light" : "dark");
  document.getElementById("settingsThemeSwitch").setAttribute("aria-checked", isDark ? "false" : "true");
});

/* ---- Save profile (first/last name) ---- */

document.getElementById("saveProfileBtn").addEventListener("click", async () => {
  const firstName = document.getElementById("profileFirstName").value.trim();
  const lastName = document.getElementById("profileLastName").value.trim();
  const statusEl = document.getElementById("saveProfileStatus");

  if (!firstName || !lastName) {
    statusEl.textContent = "First and last name can't be empty.";
    return;
  }

  statusEl.textContent = "Saving…";

  if (SUPABASE_ENABLED && sb && currentUserId) {
    const { error } = await sb.from("profiles")
      .update({ first_name: firstName, last_name: lastName })
      .eq("id", currentUserId);
    if (error) {
      console.error("EDGE: profile save failed", error);
      statusEl.textContent = "Couldn't save — try again.";
      return;
    }
  }

  progress.firstName = firstName;
  progress.lastName = lastName;
  currentFirstName = firstName;
  currentLastName = lastName;
  saveProgress();
  refreshIdentityDisplay();
  renderHome();

  statusEl.textContent = "Saved.";
  setTimeout(() => { statusEl.textContent = ""; }, 2000);
});

/* ---- Change password (Supabase only) ---- */

document.getElementById("changePasswordBtn").addEventListener("click", async () => {
  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const statusEl = document.getElementById("passwordStatus");

  if (!SUPABASE_ENABLED || !sb) {
    statusEl.textContent = "Connect Supabase to change your password.";
    return;
  }
  if (newPassword.length < 6) {
    statusEl.textContent = "Password must be at least 6 characters.";
    return;
  }
  if (newPassword !== confirmPassword) {
    statusEl.textContent = "Passwords don't match.";
    return;
  }

  statusEl.textContent = "Updating…";
  const { error } = await sb.auth.updateUser({ password: newPassword });
  if (error) {
    console.error("EDGE: password update failed", error);
    statusEl.textContent = error.message || "Couldn't update password.";
    return;
  }

  document.getElementById("newPassword").value = "";
  document.getElementById("confirmPassword").value = "";
  statusEl.textContent = "Password updated.";
  setTimeout(() => { statusEl.textContent = ""; }, 2500);
});

document.getElementById("resetProgressItem").addEventListener("click", async () => {
  if (!confirm("Reset all lesson progress, streak, level, and test results?")) return;
  const keep = { gradeLevel: progress.gradeLevel, lang: progress.lang, firstName: progress.firstName, lastName: progress.lastName };
  progress = {
    lesson: 0, streak: 0, level: 1, lastCompletedDate: null, history: [],
    gradeLevel: keep.gradeLevel, lang: keep.lang, lastReminderDate: null,
    firstName: keep.firstName, lastName: keep.lastName,
    preTest: null, postTest: null,
  };
  saveProgress();

  if (SUPABASE_ENABLED && sb && currentUserId) {
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      sb.from("lesson_history").delete().eq("user_id", currentUserId),
      sb.from("test_results").delete().eq("user_id", currentUserId),
    ]);
    if (e1) console.error("EDGE: history reset failed", e1);
    if (e2) console.error("EDGE: test reset failed", e2);
  }

  renderHome();
  renderReading();
  renderTestHome();
  if (window.__chartInstance) refreshChart();
});

document.getElementById("bellBtn").addEventListener("click", () => {
  setTab("more");
});

/* ---------- Daily notifications (Plan B) ---------- */
/* True scheduled background push needs a server + push subscriptions —
   out of scope for a static front-end. This wires up the browser
   Notification API so you can see a real notification fire, and pairs it
   with the in-app daily reminder pop-up below, which works even without
   notification permission. */

const notificationsItem = document.getElementById("notificationsItem");
const notifStatus = document.getElementById("notifStatus");

function refreshNotifStatus() {
  if (!("Notification" in window)) {
    notifStatus.textContent = "Unsupported";
    return;
  }
  notifStatus.textContent = Notification.permission === "granted" ? "On"
    : Notification.permission === "denied" ? "Blocked"
    : "Off";
}
refreshNotifStatus();

notificationsItem.addEventListener("click", async () => {
  if (!("Notification" in window)) {
    alert("This browser doesn't support notifications. The in-app Daily Prompt will still appear on open.");
    return;
  }
  if (Notification.permission === "granted") {
    new Notification("EDGE", { body: "Notifications are already on. You'll get a daily reading prompt.", icon: "assets/icons/icon-192.png" });
    return;
  }
  const result = await Notification.requestPermission();
  refreshNotifStatus();
  if (result === "granted") {
    new Notification("EDGE", { body: "Daily notifications are on — expect a reminder each day.", icon: "assets/icons/icon-192.png" });
  }
});

/* ===================== LOCK GATE (Unified Homescreen and Lockflow — Plan B) ===================== */
/* A full-screen "unlock the app" step shown once per day, before the app
   shell appears — mirrors the original mockup's phone lock screen as closely
   as a web app can. Unlike the earlier math-puzzle version, this is now real
   authentication: it re-checks the returning student's actual account
   password against Supabase Auth. It only appears when there's already a
   session on this device (a returning student) — if there's no session yet
   (first visit, or already signed out), it's skipped and the app goes
   straight to the normal Login screen, since that already asks for a
   password and there's no account yet to "re-check" against. */

const LOCK_DATE_KEY = "edge:lastUnlockDate";

const lockEmailEl = document.getElementById("lockEmail");
const lockFormEl = document.getElementById("lockForm");
const lockPasswordEl = document.getElementById("lockPassword");
const lockToggleEyeEl = document.getElementById("lockToggleEye");
const lockFeedbackEl = document.getElementById("lockFeedback");
const unlockBtn = document.getElementById("unlockBtn");
const lockContentEl = document.querySelector(".lock-content");
const lockSignOutBtn = document.getElementById("lockSignOutBtn");

let lockSessionEmail = "";

lockToggleEyeEl.addEventListener("click", () => {
  const isHidden = lockPasswordEl.type === "password";
  lockPasswordEl.type = isHidden ? "text" : "password";
  lockToggleEyeEl.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
});

function markUnlockedToday() {
  localStorage.setItem(LOCK_DATE_KEY, todayKey());
}

function proceedToLogin() {
  goToScreen("login"); // initAuth() below will flip to "app" if a session already exists
  initAuth();
}

function shakeLock(message) {
  lockFeedbackEl.textContent = message;
  lockContentEl.classList.remove("shake");
  void lockContentEl.offsetWidth; // restart animation
  lockContentEl.classList.add("shake");
}

lockFormEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  const pwd = lockPasswordEl.value;
  if (!pwd) {
    shakeLock("Enter your password.");
    return;
  }

  unlockBtn.disabled = true;
  const originalLabel = unlockBtn.textContent;
  unlockBtn.textContent = "Checking…";
  lockFeedbackEl.textContent = "";

  try {
    if (SUPABASE_ENABLED) {
      // Re-verifies the actual account password against Supabase Auth —
      // this is what makes it real authentication instead of a puzzle.
      const { error } = await sb.auth.signInWithPassword({ email: lockSessionEmail, password: pwd });
      if (error) throw error;
    }
    // Offline demo mode has no real backend to check a password against —
    // any non-empty entry is accepted here, same as the rest of offline mode.
    markUnlockedToday();
    lockContentEl.classList.add("unlocking");
    setTimeout(proceedToLogin, 350);
  } catch (err) {
    shakeLock("Incorrect password — try again.");
    lockPasswordEl.value = "";
    lockPasswordEl.focus();
  } finally {
    unlockBtn.disabled = false;
    unlockBtn.textContent = originalLabel;
  }
});

// Escape hatch: if the returning session on this device isn't actually the
// student in front of it, let them sign out here instead of being stuck
// entering a password they don't know.
lockSignOutBtn.addEventListener("click", async () => {
  if (SUPABASE_ENABLED && sb) await sb.auth.signOut();
  sessionStorage.removeItem(AUTH_KEY);
  markUnlockedToday();
  proceedToLogin();
});

async function getReturningSessionEmail() {
  if (SUPABASE_ENABLED && sb) {
    const { data: { session } } = await sb.auth.getSession();
    return session && session.user ? session.user.email : null;
  }
  const savedAuth = sessionStorage.getItem(AUTH_KEY);
  if (!savedAuth) return null;
  try {
    return JSON.parse(savedAuth).email || null;
  } catch (e) {
    return null;
  }
}

async function prepareLockGate() {
  const email = await getReturningSessionEmail();
  if (!email) {
    // No one's signed in on this device yet — nothing to re-authenticate,
    // so skip straight to the normal login/signup screen.
    markUnlockedToday();
    proceedToLogin();
    return;
  }
  lockSessionEmail = email;
  lockEmailEl.textContent = email;
  lockPasswordEl.value = "";
  lockFeedbackEl.textContent = "";
  goToScreen("lock");
  lockPasswordEl.focus();
}

/* Show the splash for 3s, then skip the lock gate if already unlocked
   today — otherwise decide whether to show it (returning session) or skip
   straight to login (no session yet). */
const SPLASH_DURATION_MS = 3000;

setTimeout(() => {
  if (localStorage.getItem(LOCK_DATE_KEY) === todayKey()) {
    proceedToLogin();
  } else {
    prepareLockGate();
  }
}, SPLASH_DURATION_MS);

/* ===================== TEST (Pre-Test / Post-Test) ===================== */

let activeTest = null; // "pre" | "post"
let testIndex = 0;
let testScore = 0;

const testHomeEl = document.getElementById("testHome");
const testRunnerEl = document.getElementById("testRunner");
const testResultEl = document.getElementById("testResult");
const testQuestionEl = document.getElementById("testQuestion");
const testOptionsEl = document.getElementById("testOptions");
const testProgressFillEl = document.getElementById("testProgressFill");
const testProgressTextEl = document.getElementById("testProgressText");
const testRunnerLabelEl = document.getElementById("testRunnerLabel");
const testCompetencyPillEl = document.getElementById("testCompetencyPill");

function renderTestHome() {
  const pre = progress.preTest;
  const post = progress.postTest;

  document.getElementById("preTestStatus").textContent = pre ? `Completed — ${pre.score}/${pre.total}` : "Not started";
  document.getElementById("postTestStatus").textContent = post ? `Completed — ${post.score}/${post.total}` : "Not started";

  const startPostBtn = document.getElementById("startPostTest");
  startPostBtn.disabled = !pre;
  startPostBtn.title = pre ? "" : "Complete the Pre-Test first";

  const cmpCard = document.getElementById("comparisonCard");
  if (pre && post) {
    cmpCard.style.display = "block";
    document.getElementById("cmpPre").textContent = `${pre.score}/${pre.total}`;
    document.getElementById("cmpPost").textContent = `${post.score}/${post.total}`;
    const delta = post.score - pre.score;
    document.getElementById("cmpDelta").textContent = `${delta > 0 ? "+" : ""}${delta} item${Math.abs(delta) === 1 ? "" : "s"}`;
  } else {
    cmpCard.style.display = "none";
  }
}
renderTestHome();

function startTest(type) {
  activeTest = type;
  testIndex = 0;
  testScore = 0;
  testHomeEl.style.display = "none";
  testResultEl.style.display = "none";
  testRunnerEl.style.display = "block";
  testRunnerLabelEl.textContent = type === "pre" ? "Pre-Test" : "Post-Test";
  renderTestQuestion();
}

document.getElementById("startPreTest").addEventListener("click", () => startTest("pre"));
document.getElementById("startPostTest").addEventListener("click", () => {
  if (!progress.preTest) return;
  startTest("post");
});

function renderTestQuestion() {
  const item = TEST_ITEMS[testIndex];
  const passageHtml = item.passage
    ? `<span style="display:block; font-weight:500; margin-bottom:8px;">${item.passage}</span>`
    : "";
  testQuestionEl.innerHTML = `${passageHtml}${item.question}`;
  testCompetencyPillEl.textContent = item.melcLabel;
  testProgressTextEl.textContent = `Item ${testIndex + 1} / ${TEST_ITEMS.length}`;
  testProgressFillEl.style.width = `${(testIndex / TEST_ITEMS.length) * 100}%`;

  testOptionsEl.innerHTML = "";
  item.options.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.className = "test-option-btn";
    btn.type = "button";
    btn.textContent = opt;
    btn.addEventListener("click", () => selectTestOption(i));
    testOptionsEl.appendChild(btn);
  });
}

function selectTestOption(selectedIndex) {
  const item = TEST_ITEMS[testIndex];
  const buttons = testOptionsEl.querySelectorAll(".test-option-btn");
  buttons.forEach((b) => (b.disabled = true));
  buttons[selectedIndex].classList.add(selectedIndex === item.correct ? "correct" : "incorrect");
  if (selectedIndex !== item.correct) buttons[item.correct].classList.add("correct");
  if (selectedIndex === item.correct) testScore += 1;

  setTimeout(() => {
    testIndex += 1;
    if (testIndex < TEST_ITEMS.length) {
      renderTestQuestion();
    } else {
      finishTest();
    }
  }, 700);
}

function finishTest() {
  testRunnerEl.style.display = "none";
  testResultEl.style.display = "block";
  testProgressFillEl.style.width = "100%";

  const result = { score: testScore, total: TEST_ITEMS.length, date: todayKey() };
  if (activeTest === "pre") progress.preTest = result;
  else progress.postTest = result;
  saveProgress();

  if (SUPABASE_ENABLED && sb && currentUserId) {
    sb.from("test_results").insert({
      user_id: currentUserId,
      test_type: activeTest,
      score: testScore,
      total: TEST_ITEMS.length,
    }).then(({ error }) => { if (error) console.error("EDGE: test result sync failed", error); });
  }

  document.getElementById("resultLabel").textContent = activeTest === "pre" ? "Pre-Test complete" : "Post-Test complete";
  document.getElementById("resultScore").textContent = `${testScore} / ${TEST_ITEMS.length}`;
  document.getElementById("resultNote").textContent =
    activeTest === "pre"
      ? "This is your baseline score. Start your daily lessons, then take the Post-Test at the end of the intervention period."
      : "This is your final score. Check the comparison against your Pre-Test on the Assessment tab.";
}

document.getElementById("exitTestBtn").addEventListener("click", () => {
  if (!confirm("Exit without finishing? Your progress on this attempt won't be saved.")) return;
  testRunnerEl.style.display = "none";
  testHomeEl.style.display = "block";
  renderTestHome();
});

document.getElementById("backToTestsBtn").addEventListener("click", () => {
  testResultEl.style.display = "none";
  testHomeEl.style.display = "block";
  renderTestHome();
});

/* ---------- Register service worker (offline support once installed) ---------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
