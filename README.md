# EDGE — starter app (v3, aligned to the research plan)

Same layout as v2 (login → Home / Dashboard / Learn / More), now revised to
match what the research plan actually calls for.

## How to log in

This is still a **front-end-only mock** — there's no real backend yet, so
**any non-empty Student ID/Email + Grade Level + Password gets you in.**
Wire up real authentication per Procedures 2.5 once your backend exists (see
"Wiring up real data" below).

## What changed from v2 → v3

| Gap identified | What was added |
|---|---|
| "Bilingual" in the module name, but content was English-only | Originally added an English/Filipino toggle. **Reverted per client instruction — the app is English-only.** The Filipino text is still sitting unused in `READING_ITEMS[i].fil` in `app.js` in case bilingual support is wanted back later; `currentReadingItem()` just ignores it for now. |
| Grade 7–10 respondents, but no grade field anywhere | **Grade Level dropdown** (7–10) added to the login form, required at sign-up. Shown in the Home tab greeting. |
| Plan B (daily pop-up/notification) was written into Scope & Limitations, but the app had no reminder feature at all | **Full-screen PIN Lock Gate** — see "Lock Gate" section below. Superseded an earlier, simpler "Daily Reminder" text pop-up. |
| Pre-test / Post-test (20 items) mentioned in Procedures and Data Analysis, but nothing in the app administered one | New **Test tab** (Assessment): separate Pre-Test and Post-Test flows, multiple-choice, auto-scored, with a Pre vs. Post comparison card once both are done. Ships with **10 placeholder items** in `TEST_ITEMS` — expand to your full 20-item instrument before actual field testing; the structure doesn't need to change. |

## Lock Gate (Unified Homescreen and Lockflow — Plan B)

The original mockup showed a full phone lock screen with a math question and
numeric keypad ("Enter password to unlock phone"). That's now implemented as
closely as a web app can:

- On opening the app, a **full-screen PIN lock gate** appears first — before
  the student even sees the login form — with a short math question
  (`LOCK_QUESTIONS` in `app.js`) and an on-screen numeric keypad with an
  animated dot indicator, matching the mockup.
- It's shown **once per day per device** (tracked in `localStorage` under
  `edge:lastUnlockDate`), not tied to any specific account — since it
  appears before we know who's signing in, this can't be synced through
  Supabase; it's intentionally a device-level gate, the same way a real
  phone's lock screen doesn't care which app you'll open afterward.
- After a correct answer, it fades out and the app proceeds normally (either
  straight to Home if already signed in, or to the login form).
- A wrong answer triggers a brief shake animation and clears the input —
  no attempt limit, so a student can't get permanently locked out.

**Still true from before:** a web app cannot override the real OS lock
screen — Android/iOS block that for security. This is the honest, working
substitute: an app-open gate with the same "answer to get in" habit-building
intent, not a true system-level lock screen override.

## Visual design & animation pass

Per a design review request, the whole app got a pass toward a more
corporate/professional look:

- Buttons switched from a tri-color gradient to solid navy (`--navy`), with
  hover/press states — closer to a banking or productivity app than the
  earlier EdTech-gradient look. The gradient is now reserved for a couple of
  signature accents (the login card's top strip) rather than every button.
- Added a consistent shadow/elevation system (`--shadow-sm/md/lg` in
  `style.css`) applied uniformly across cards instead of ad-hoc shadow
  values.
- Added `:focus-visible` rings on interactive elements for accessibility.
- Subtle animations throughout: fade-in transitions when switching screens
  or tabs, scale-down press feedback on buttons/tiles, a shake animation for
  a wrong lock-gate answer, animated PIN dots. All animation respects
  `prefers-reduced-motion` (see the media query near the top of
  `style.css`) — nothing forces motion on someone who's asked their OS to
  minimize it.

## Theme, profile menu, and profile photo

- **Light theme is the default** now — dark mode from the visual pass above
  is still there, but as an opt-in toggle rather than the default. The
  choice is saved per device in `localStorage` (`edge:theme`) and restored
  on next visit.
- **Splash screen and Lock Gate stay dark always**, regardless of the
  chosen app theme — same reasoning as a phone's boot/lock screen usually
  looking the same no matter what theme you run apps in.
- Click the **avatar icon** (top-right) to open a dropdown with:
  - Your profile photo (or initials if none set) — click it to upload a new
    photo.
  - A **Dark mode** switch.
  - **Settings** (jumps to the More tab).
  - **Log out**.
- **Profile photo upload**: if Supabase is connected, the photo uploads to
  a `avatars` Storage bucket and the public URL is saved to
  `profiles.avatar_url` (see `supabase-schema.sql` — run the "Profile photo
  upload" section near the bottom if you already ran the schema before this
  update). In offline demo mode, the photo is instead saved as a data URL
  in `localStorage` — works for trying it out, but it's device-only and
  won't sync or survive clearing browser data.
- The logo automatically swaps between a normal-color version (light theme)
  and a brightened version — `assets/logo-dark.png` — for dark theme, so it
  stays legible without needing a white card behind it.



```
edge_app_v3/
├── index.html         → Splash + Lock Gate + Login (+ grade level) + Home / Dashboard / Learn / Test / More
├── style.css           → light theme (default) + dark theme override, animations, profile menu
├── app.js              → all logic: auth, theme, avatar upload, lessons, reminder, tests, chart
├── manifest.json
├── sw.js                → offline caching (cache bumped each release)
├── supabase-config.js    → your Project URL + anon key go here
├── supabase-schema.sql   → run in Supabase SQL Editor — tables, triggers, storage bucket, RLS
├── assets/
│   ├── logo.png           → normal-color logo (light theme)
│   ├── logo-dark.png       → brightened logo (dark theme, splash, lock gate)
│   ├── icons/
│   └── vendor/
│       ├── chart.umd.min.js
│       └── supabase.js
└── README.md
```

## Important caveat: real daily notifications

A browser/PWA **cannot** reliably wake itself up in the background to fire a
notification at a specific time every day without a server — that needs:
1. A backend that stores each student's push subscription.
2. A scheduled job (cron) that sends a push message at the chosen time.
3. The service worker receiving that push and displaying it.

What's implemented now is the honest, working subset:
- The **in-app Lock Gate** fires every time the app is opened on a new day
  — no backend needed, works today (see "Lock Gate" above).
- The **Daily Notifications toggle** (in More) requests browser permission
  and fires one real notification immediately as a demo/confirmation — it
  does **not** yet schedule a recurring daily one on its own.

If true scheduled push matters for your defense, mention this clearly as a
**Phase 2 / post-defense** item requiring backend work (this is also worth
adding as a line in your Scope and Limitations, since it's a real constraint
of Plan B, not just this prototype).

## Connecting Supabase (real accounts + cross-device sync)

The app now supports a real backend via [Supabase](https://supabase.com) —
free tier is enough for a school project. Until you connect it, the app
keeps working exactly as before in **offline demo mode** (mock login,
progress saved only in the browser).

### 1. Create a Supabase project
Sign up at supabase.com → **New project** → wait ~2 minutes for it to spin up.

### 2. Run the schema
Dashboard → **SQL Editor** → **New query** → paste the entire contents of
`supabase-schema.sql` from this folder → **Run**. This creates four tables
(`profiles`, `progress`, `lesson_history`, `test_results`), each with Row
Level Security so students can only ever read/write their own data — plus
an `avatars` Storage bucket for profile photos.

> Already had a Supabase project set up before this update? The whole file
> is safe to re-run — every statement uses `if not exists` / `on conflict
> do nothing`, so re-running it just adds the new `avatar_url` column and
> the `avatars` bucket without touching your existing data.

### 3. Get your API keys
Dashboard → **Project Settings → API** → copy the **Project URL** and the
**`anon` `public`** key.

### 4. Fill in `supabase-config.js`
```js
window.SUPABASE_URL = "https://xxxxxxxx.supabase.co";
window.SUPABASE_ANON_KEY = "eyJhbGciOi...";
```
Save, then hard-refresh the app (the offline banner on the login screen
should disappear).

### 5. (Recommended for testing) Turn off email confirmation
By default Supabase requires students to click a confirmation link before
they can sign in. For a controlled classroom pilot this is usually
unnecessary friction — turn it off at: **Authentication → Providers → Email
→ "Confirm email"**. Leave it ON if the app will ever be reachable by the
public internet with real student emails.

### 6. Try it
- **Create an account** from the login screen (this is now real — it calls
  `supabase.auth.signUp`, and writes a row to `profiles` + `progress`).
- Complete a lesson, take the Pre-Test — check the Supabase Table Editor and
  you should see rows appear in `lesson_history` / `test_results` live.
- Sign out, sign back in (even on a different device/browser) — progress
  should be exactly where you left it.

### What's synced vs. local-only
- **Synced to Supabase**: lesson/streak/level counters, language
  preference, grade level, full lesson history, Pre-Test/Post-Test scores.
- **Local-only, by design**: the "remind me later" snooze for today's Daily
  Reminder pop-up (`sessionStorage`) and the browser Notification
  permission — both are per-device/per-browser concepts and don't belong in
  the database.

### If you edit `supabase-config.js` after first load
The service worker caches it for offline use — do a hard refresh (or clear
site data / unregister the service worker in DevTools → Application) after
changing your Supabase keys so the new values actually take effect.

## Running it in VS Code

Same as before — open the folder, Live Server on `index.html`, narrow the
browser to phone width. Deploy via Netlify Drop to test Add to Home Screen
and real notification permission prompts on an actual phone (notifications
need HTTPS, so `file://` previews in VS Code won't show the permission
prompt).

## What's left to wire up

- **Login/data**: done — see "Connecting Supabase" above. Once configured,
  real accounts + database replace the old mock/localStorage-only behavior
  automatically, no further code changes needed.
- **Test bank**: expand `TEST_ITEMS` in `app.js` from 10 to your full 20
  items — everything else (scoring, comparison card, Supabase sync) works
  unchanged.
- **Reminder prompts**: edit `REMINDER_PROMPTS` in `app.js`, or fetch a
  daily prompt from a `reminder_prompts` table in Supabase instead of the
  local array, if you want teachers to be able to edit them without a code
  change.
- **Teacher/admin view**: not included — the current schema and RLS
  policies are student-facing only (each student can only see their own
  rows). A teacher dashboard showing all students would need a `teachers`
  table and a separate RLS policy checking membership in it (noted in
  `supabase-schema.sql`).
