begin;

-- Remove the legacy Phase 4 policies that treated every authenticated user
-- as an administrator. Phase 5 intentionally grants no write permissions.
drop policy if exists "Authenticated admins manage activities" on public.activities;
drop policy if exists "Authenticated admins manage activity images" on public.activity_images;
drop policy if exists "Authenticated admins manage posts" on public.posts;
drop policy if exists "Authenticated admins manage files" on public.files;
drop policy if exists "Authenticated admins manage categories" on public.categories;
drop policy if exists "Authenticated admins manage faq" on public.faq;
drop policy if exists "Authenticated admins manage site settings" on public.site_settings;
drop policy if exists "Authenticated admins manage public storage" on storage.objects;

drop policy if exists "Active admins can read all activities" on public.activities;
create policy "Active admins can read all activities"
on public.activities
for select
to authenticated
using ((select public.is_admin()));

commit;
