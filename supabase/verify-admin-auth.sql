-- Run in Supabase SQL Editor after both Phase 5 migrations.
-- This script reports structure and aggregate results only; it does not expose
-- credentials, tokens, email addresses, or user UUIDs.

select
  to_regclass('public.admin_users') is not null as admin_users_exists,
  coalesce(c.relrowsecurity, false) as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'admin_users';

select
  p.proname as function_name,
  p.prosecdef as security_definer,
  p.provolatile = 's' as stable,
  coalesce(array_to_string(p.proconfig, ',') like 'search_path=%', false) as fixed_search_path
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'is_admin'
  and p.pronargs = 0;

select
  grantee,
  privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name = 'is_admin'
order by grantee, privilege_type;

select
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
  policyname,
  roles,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'admin_users'
order by policyname;

select
  count(*) filter (where is_active) as active_admin_count,
  count(*) filter (where not is_active) as inactive_admin_count,
  count(*) filter (where u.id is null) as unmatched_auth_user_count
from public.admin_users a
left join auth.users u on u.id = a.user_id;

select
  count(*) as activity_write_policy_count
from pg_policies
where schemaname = 'public'
  and tablename = 'activities'
  and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL');

select
  count(*) as legacy_authenticated_manage_policy_count
from pg_policies
where schemaname in ('public', 'storage')
  and policyname like 'Authenticated admins manage%';
