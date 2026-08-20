-- ============================================================
-- EDGE — Admin + Leaderboard add-on
-- Run this ONCE in: Supabase Dashboard → SQL Editor → New query → paste all → Run
-- Safe to re-run (every statement is idempotent).
-- ============================================================
-- This fixes a real gap in the original schema: profiles.first_name,
-- profiles.last_name, and profiles.is_admin were referenced by app.js and
-- admin.js but never actually created — signup / profile-save / the admin
-- dashboard would all fail without this. It also adds:
--   1) is_admin column + a safe way to check it without RLS recursion
--   2) RLS policies so an admin account can read every student's rows
--      (needed for the Admin dashboard AND the "View as Student" feature)
--   3) a public.leaderboard view students can safely read (no emails/PII)
--   4) instructions at the bottom for creating your first admin account

-- ---------- 1. Missing profile columns ----------

alter table profiles add column if not exists first_name text;
alter table profiles add column if not exists last_name text;
alter table profiles add column if not exists is_admin boolean not null default false;

-- Make the signup trigger populate first/last name too (grade_level was
-- already handled — this just adds the two missing fields to the same
-- trigger, reading from the same signup metadata the app already sends).
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, grade_level, first_name, last_name)
  values (
    new.id,
    new.raw_user_meta_data->>'grade_level',
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name'
  )
  on conflict (id) do nothing;

  insert into public.progress (user_id, lang)
  values (new.id, 'en')
  on conflict (user_id) do nothing;

  return new;
end;
$$ language plpgsql security definer set search_path = public;
-- (trigger itself is already wired up in supabase-schema.sql — replacing
-- the function body above is enough, no need to redefine the trigger)

-- ---------- 2. is_admin() helper (avoids RLS recursion) ----------
-- A policy on `profiles` that queries `profiles` again to check is_admin
-- would recurse. Wrapping the check in a SECURITY DEFINER function runs it
-- with the function owner's privileges, sidestepping that recursion — this
-- is the standard, Supabase-documented pattern for admin-gated RLS.

create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_admin from profiles where id = uid), false);
$$;

-- ---------- 3. Admin read-all policies ----------
-- Students still only see their own rows (existing policies from
-- supabase-schema.sql are untouched). These ADD a second way in: any row
-- is also visible if the requester is an admin.

drop policy if exists "Admins can view all profiles" on profiles;
create policy "Admins can view all profiles"
  on profiles for select
  using (public.is_admin());

drop policy if exists "Admins can view all progress" on progress;
create policy "Admins can view all progress"
  on progress for select
  using (public.is_admin());

drop policy if exists "Admins can view all lesson_history" on lesson_history;
create policy "Admins can view all lesson_history"
  on lesson_history for select
  using (public.is_admin());

drop policy if exists "Admins can view all test_results" on test_results;
create policy "Admins can view all test_results"
  on test_results for select
  using (public.is_admin());

-- ---------- 4. Public leaderboard view ----------
-- Exposes only rankable, non-sensitive fields (first name + last INITIAL,
-- grade, lesson/streak/level) — never email or full last name. Views in
-- Postgres run with the owner's privileges for the underlying table scan
-- (unless declared security_invoker), so this view intentionally bypasses
-- the per-student RLS above to show everyone's rank — that's what makes a
-- leaderboard a leaderboard. Only the columns actually selected here are
-- ever exposed.

create or replace view public.leaderboard as
select
  p.id as user_id,
  coalesce(nullif(trim(p.first_name), ''), 'Student') as first_name,
  left(coalesce(nullif(trim(p.last_name), ''), ''), 1) as last_initial,
  p.grade_level,
  coalesce(pr.lesson, 0) as lesson,
  coalesce(pr.streak, 0) as streak,
  coalesce(pr.level, 1) as level
from profiles p
left join progress pr on pr.user_id = p.id
where coalesce(p.is_admin, false) = false;

grant select on public.leaderboard to authenticated;

-- ============================================================
-- Creating your first admin account
-- ============================================================
-- The admin dashboard (admin.html) only has a Sign In form, not Sign Up —
-- admin accounts are meant to be created deliberately, not self-registered.
--
-- 1. Supabase Dashboard → Authentication → Users → Add user
--    Enter the teacher/admin's email + a password. Leave "Auto Confirm
--    User" checked so they can sign in immediately.
-- 2. Come back here and run (replace the email):
--
--      update profiles set is_admin = true
--      where id = (select id from auth.users where email = 'admin@school.edu.ph');
--
-- 3. That account can now sign in at admin.html. Repeat step 2 for any
--    other teacher accounts.
--
-- Note: an admin account also gets a `progress` row like any user (from
-- the same signup trigger) but is excluded from the leaderboard view and
-- from the student list in admin.js via `is_admin = false` filters.
