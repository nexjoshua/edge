-- ============================================================
-- EDGE — Avatar upload add-on (run this ONLY, not the full schema)
-- ============================================================
-- Use this if you already ran supabase-schema.sql once before and just
-- need to add profile photo support. This script only touches NEW things
-- (a new column, a new bucket, new storage policies) — it does not
-- recreate anything on profiles/progress/lesson_history/test_results, so
-- it won't collide with policies that already exist from your first run.
--
-- Run in: Supabase Dashboard → SQL Editor → New query → paste all of this → Run

-- 1. Add the avatar_url column (safe even if it already exists)
alter table profiles add column if not exists avatar_url text;

-- 2. Create the "avatars" Storage bucket (safe even if it already exists)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 3. Storage policies for the avatars bucket.
--    Each one is dropped first if it already exists, so this whole script
--    is safe to run more than once without erroring.

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
-- Verify it worked
-- ============================================================
-- Table Editor → profiles → you should see a new "avatar_url" column.
-- Storage (left sidebar) → you should see a new "avatars" bucket.
