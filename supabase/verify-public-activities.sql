-- Run after supabase/schema.sql and supabase/seed.sql in the Supabase SQL Editor.
-- These queries are read-only.

select
  id,
  title,
  slug,
  status,
  event_date,
  is_featured
from public.activities
order by event_date desc nulls last, id asc;

select
  count(*) as total_count,
  count(*) filter (where status = 'published') as published_count,
  count(*) filter (where status = 'draft') as draft_count
from public.activities;

select slug, count(*) as duplicate_count
from public.activities
group by slug
having count(*) > 1;

select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'activities'
order by policyname;

select
  relname as table_name,
  relrowsecurity as rls_enabled,
  relforcerowsecurity as rls_forced
from pg_class
where oid = 'public.activities'::regclass;
