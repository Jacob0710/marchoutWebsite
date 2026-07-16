-- Run in the Supabase SQL Editor after 20260715_001_phase6_activity_crud_assets.sql.
-- This file is read-only. Runtime anon/non-admin/admin behavior is verified by
-- scripts/phase6-admin-crud-smoke.mjs with real JWT sessions.

do $$
declare
  invalid_count integer;
begin
  if to_regclass('public.activity_assets') is null then raise exception 'activity_assets is missing'; end if;
  if to_regclass('public.activity_videos') is null then raise exception 'activity_videos is missing'; end if;
  if not exists (select 1 from storage.buckets where id = 'activity-assets' and public = false) then
    raise exception 'private activity-assets bucket is missing';
  end if;
  if not exists (select 1 from pg_class where oid = 'public.admin_users'::regclass and relrowsecurity) then
    raise exception 'admin_users RLS is not enabled';
  end if;
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'is_admin' and p.prosecdef
      and p.provolatile = 's' and array_to_string(p.proconfig, ',') like '%search_path=%'
  ) then raise exception 'is_admin security attributes have regressed'; end if;

  select count(*) into invalid_count
  from pg_policies
  where roles @> array['authenticated'::name]
    and cmd = 'ALL';
  if invalid_count <> 0 then raise exception 'authenticated FOR ALL policy detected'; end if;

  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'activities' and cmd in ('INSERT','UPDATE','DELETE')) <> 3 then
    raise exception 'activities must have exactly three operation-specific write policies';
  end if;
  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'activity_assets' and cmd in ('INSERT','UPDATE','DELETE')) <> 3 then
    raise exception 'activity_assets write policies are incomplete';
  end if;
  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'activity_videos' and cmd in ('INSERT','UPDATE','DELETE')) <> 3 then
    raise exception 'activity_videos write policies are incomplete';
  end if;
  if exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname like '%activity storage objects%' and cmd in ('UPDATE','ALL')
  ) then raise exception 'activity storage UPDATE/ALL policy detected'; end if;
end $$;

select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'activity-assets';

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where (schemaname = 'public' and tablename in ('activities','activity_assets','activity_videos','admin_users'))
   or (schemaname = 'storage' and tablename = 'objects' and policyname ilike '%activity%')
order by schemaname, tablename, cmd, policyname;

select table_schema, table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('activities','activity_assets','activity_videos','admin_users')
  and grantee in ('anon','authenticated')
order by table_name, grantee, privilege_type;

select p.proname, p.prosecdef as security_definer, p.provolatile = 's' as stable, p.proconfig
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'is_admin' and p.pronargs = 0;
