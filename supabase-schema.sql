-- ============================================================
-- EDGE — Supabase schema
-- Run this once in your Supabase project: Dashboard → SQL Editor → New query
-- ============================================================

-- ---------- profiles ----------
-- One row per student, linked 1:1 to their auth.users account.
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  grade_level text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

drop policy if exists "Users can view their own profile" on profiles;
create policy "Users can view their own profile"
  on profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on profiles;
create policy "Users can insert their own profile"
  on profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on profiles;
create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

-- ---------- progress ----------
-- One row per student: lesson count, streak, level, language preference.
create table if not exists progress (
  user_id uuid references auth.users on delete cascade primary key,
  lesson int default 0,
  streak int default 0,
  level int default 1,
  last_completed_date date,
  last_reminder_date date,
  lang text default 'en',
  updated_at timestamptz default now()
);

alter table progress enable row level security;

drop policy if exists "Users can view their own progress" on progress;
create policy "Users can view their own progress"
  on progress for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own progress" on progress;
create policy "Users can insert their own progress"
  on progress for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own progress" on progress;
create policy "Users can update their own progress"
  on progress for update
  using (auth.uid() = user_id);

-- ---------- lesson_history ----------
-- One row per completed lesson, used to build the Dashboard analytics chart.
create table if not exists lesson_history (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade not null,
  date_key date not null,
  question text,
  accuracy int,
  created_at timestamptz default now()
);

alter table lesson_history enable row level security;

drop policy if exists "Users can view their own lesson history" on lesson_history;
create policy "Users can view their own lesson history"
  on lesson_history for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own lesson history" on lesson_history;
create policy "Users can insert their own lesson history"
  on lesson_history for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own lesson history" on lesson_history;
create policy "Users can delete their own lesson history"
  on lesson_history for delete
  using (auth.uid() = user_id);

create index if not exists lesson_history_user_date_idx
  on lesson_history (user_id, date_key);

-- ---------- test_results ----------
-- Pre-Test and Post-Test scores.
create table if not exists test_results (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade not null,
  test_type text check (test_type in ('pre', 'post')) not null,
  score int not null,
  total int not null,
  taken_at timestamptz default now()
);

alter table test_results enable row level security;

drop policy if exists "Users can view their own test results" on test_results;
create policy "Users can view their own test results"
  on test_results for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own test results" on test_results;
create policy "Users can insert their own test results"
  on test_results for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own test results" on test_results;
create policy "Users can delete their own test results"
  on test_results for delete
  using (auth.uid() = user_id);

-- ============================================================
-- Auto-create profile + progress rows on signup
-- ============================================================
-- Runs as a database trigger (SECURITY DEFINER) so it always succeeds,
-- regardless of any client-side timing between signUp() completing and the
-- browser's next request carrying the new session. grade_level is read from
-- the signup metadata the app sends via `options: { data: { grade_level } }`.

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, grade_level)
  values (new.id, new.raw_user_meta_data->>'grade_level')
  on conflict (id) do nothing;

  insert into public.progress (user_id, lang)
  values (new.id, 'en')
  on conflict (user_id) do nothing;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Profile photo upload
-- ============================================================
-- Run this after the tables above already exist (safe to re-run — every
-- statement below is idempotent).

-- 1. Add a column on `profiles` to store the public URL of the uploaded photo.
alter table profiles add column if not exists avatar_url text;

-- 2. Create a public Storage bucket named "avatars" (idempotent — no-op if
--    it already exists). Public so uploaded photos can be displayed
--    directly via their URL without a signed-request round trip.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 3. RLS policies on storage.objects for this bucket. Each student's photo
--    is stored at a path like "<their-user-id>/avatar.jpg" — these policies
--    restrict writes/deletes to files inside a student's own folder, while
--    allowing anyone to READ (since avatars are meant to be publicly
--    viewable, e.g. shown to a teacher — tighten the select policy below if
--    you'd rather keep photos private to signed-in users only).

drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- Notes
-- ============================================================
-- 1. RLS policies above mean each student can only ever read/write their
--    OWN rows — this is enforced by the database itself, not just the app.
-- 2. For a teacher/admin dashboard that reads ALL students' data, you'll
--    need a separate role (e.g. a `teachers` table + a policy that checks
--    membership in it) — not included here since the current app is
--    student-facing only.
-- 3. By default, Supabase requires email confirmation before a new sign-up
--    can sign in. For quick classroom testing, you can turn this off at:
--    Authentication → Providers → Email → "Confirm email" toggle.
--    Keep it ON for anything beyond a controlled classroom pilot.
-- 4. If "Users can upload their own avatar" fails with a permissions error,
--    double check Storage → avatars bucket exists in the dashboard (step 2
--    above creates it via SQL, but on some older Supabase projects Storage
--    policies must be added from Dashboard → Storage → Policies instead of
--    SQL — if the CREATE POLICY statements above error out, recreate them
--    there using the same "restrict to auth.uid() folder" logic).
