-- Run in the Supabase SQL Editor after 20260716_001_phase7_admin_access_governance.sql.
-- This script is read-only and raises on the first security or schema regression.

begin;

do $$
declare
  v_function record;
begin
  if to_regclass('public.admin_users') is null
    or to_regclass('public.admin_invitations') is null
    or to_regclass('public.admin_access_audit_logs') is null
  then
    raise exception 'Phase 7 tables are missing';
  end if;

  if exists (
    select 1
    from (values
      ('admin_users', 'user_id'), ('admin_users', 'is_active'),
      ('admin_users', 'granted_at'), ('admin_users', 'granted_by'),
      ('admin_users', 'deactivated_at'), ('admin_users', 'deactivated_by'),
      ('admin_invitations', 'id'), ('admin_invitations', 'email'),
      ('admin_invitations', 'token_hash'), ('admin_invitations', 'expires_at'),
      ('admin_invitations', 'invited_by'), ('admin_invitations', 'accepted_by'),
      ('admin_invitations', 'accepted_at'), ('admin_invitations', 'revoked_by'),
      ('admin_invitations', 'revoked_at'),
      ('admin_access_audit_logs', 'id'), ('admin_access_audit_logs', 'actor_user_id'),
      ('admin_access_audit_logs', 'action'), ('admin_access_audit_logs', 'target_user_id'),
      ('admin_access_audit_logs', 'target_email'), ('admin_access_audit_logs', 'invitation_id'),
      ('admin_access_audit_logs', 'metadata'), ('admin_access_audit_logs', 'created_at')
    ) as required(table_name, column_name)
    where not exists (
      select 1 from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = required.table_name
        and c.column_name = required.column_name
    )
  ) then
    raise exception 'A required Phase 7 column is missing';
  end if;

  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('admin_users', 'admin_invitations', 'admin_access_audit_logs')
      and c.relrowsecurity is not true
  ) then
    raise exception 'Phase 7 RLS is not enabled';
  end if;

  if exists (
    select 1
    from information_schema.role_table_grants g
    where g.table_schema = 'public'
      and g.table_name in ('admin_users', 'admin_invitations', 'admin_access_audit_logs')
      and g.grantee in ('anon', 'authenticated', 'PUBLIC')
  ) then
    raise exception 'Direct Phase 7 table privileges are too broad';
  end if;

  if exists (
    select 1
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename in ('admin_users', 'admin_invitations', 'admin_access_audit_logs')
  ) then
    raise exception 'Phase 7 tables unexpectedly expose direct RLS policies';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.admin_users'::regclass
      and conname = 'admin_users_access_state_check'
  ) or not exists (
    select 1 from pg_constraint
    where conrelid = 'public.admin_invitations'::regclass
      and conname = 'admin_invitations_terminal_state_check'
  ) then
    raise exception 'Phase 7 state constraints are missing';
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'admin_invitations'
      and indexname = 'admin_invitations_one_unconsumed_email_idx'
      and indexdef ilike '%unique%where%accepted_at is null%revoked_at is null%'
  ) then
    raise exception 'Pending invitation uniqueness index is missing';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.admin_access_audit_logs'::regclass
      and tgname = 'prevent_admin_access_audit_mutation'
      and tgenabled <> 'D'
  ) then
    raise exception 'Append-only audit trigger is missing';
  end if;

  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'is_admin'
      and p.pronargs = 0 and p.prosecdef
      and exists (select 1 from unnest(p.proconfig) setting where setting like 'search_path=%')
  ) then
    raise exception 'is_admin security attributes regressed';
  end if;

  for v_function in
    select * from (values
      ('create_admin_invitation', 'text, integer'),
      ('accept_admin_invitation', 'text'),
      ('revoke_admin_invitation', 'uuid'),
      ('set_admin_active', 'uuid, boolean'),
      ('list_admin_accounts', ''),
      ('list_admin_invitations', 'text'),
      ('list_admin_access_audit_logs', 'integer, timestamp with time zone, bigint, text')
    ) as required(function_name, argument_types)
  loop
    if not exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = v_function.function_name
        and pg_catalog.oidvectortypes(p.proargtypes) = v_function.argument_types
        and p.prosecdef
        and exists (select 1 from unnest(p.proconfig) setting where setting like 'search_path=%')
    ) then
      raise exception 'Missing or unsafe function: %(%)', v_function.function_name, v_function.argument_types;
    end if;

    if (
      select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = v_function.function_name
    ) <> 1 then
      raise exception 'Unexpected function overload: %', v_function.function_name;
    end if;
  end loop;

  if has_function_privilege('anon', 'public.create_admin_invitation(text,integer)', 'EXECUTE')
    or has_function_privilege('anon', 'public.accept_admin_invitation(text)', 'EXECUTE')
    or has_function_privilege('anon', 'public.revoke_admin_invitation(uuid)', 'EXECUTE')
    or has_function_privilege('anon', 'public.set_admin_active(uuid,boolean)', 'EXECUTE')
    or has_function_privilege('anon', 'public.list_admin_accounts()', 'EXECUTE')
    or has_function_privilege('anon', 'public.list_admin_invitations(text)', 'EXECUTE')
    or has_function_privilege('anon', 'public.list_admin_access_audit_logs(integer,timestamptz,bigint,text)', 'EXECUTE')
  then
    raise exception 'anon can execute a Phase 7 function';
  end if;

  if not has_function_privilege('authenticated', 'public.create_admin_invitation(text,integer)', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.accept_admin_invitation(text)', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.revoke_admin_invitation(uuid)', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.set_admin_active(uuid,boolean)', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.list_admin_accounts()', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.list_admin_invitations(text)', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.list_admin_access_audit_logs(integer,timestamptz,bigint,text)', 'EXECUTE')
  then
    raise exception 'authenticated execute grants are incomplete';
  end if;

  if not exists (select 1 from public.admin_users where is_active = true) then
    raise exception 'No active administrator remains';
  end if;
  if exists (
    select 1 from public.admin_users
    where (is_active and (deactivated_at is not null or deactivated_by is not null))
      or (not is_active and deactivated_at is null)
  ) then
    raise exception 'admin_users lifecycle metadata is inconsistent';
  end if;

  if exists (select 1 from public.admin_invitations where octet_length(token_hash) <> 32) then
    raise exception 'Invitation digest is not SHA-256 length';
  end if;
  if exists (
    select 1 from public.admin_access_audit_logs
    where metadata::text ~* '(^|[^0-9a-f])[0-9a-f]{64}([^0-9a-f]|$)'
      or metadata::text ~* '(password|access_token|refresh_token|cookie|jwt)'
  ) then
    raise exception 'Audit metadata contains secret-like content';
  end if;

  if position('pg_advisory_xact_lock' in pg_get_functiondef('public.set_admin_active(uuid,boolean)'::regprocedure)) = 0 then
    raise exception 'Last-admin concurrency lock is missing';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'activities'
      and policyname = 'Active admins can read all activities'
  ) or not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'activity_assets'
      and policyname = 'Active admins can read all activity assets'
  ) or not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'activity_videos'
      and policyname = 'Active admins can read all activity videos'
  ) or not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Active admins can read activity storage objects'
  ) then
    raise exception 'Phase 5/6 policy regression detected';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename in ('admin_users', 'admin_invitations', 'admin_access_audit_logs')
      and cmd = 'ALL'
  ) then
    raise exception 'Broad FOR ALL policy detected';
  end if;
end;
$$;

select
  (select count(*) from public.admin_users where is_active) as active_admin_count,
  (select count(*) from public.admin_invitations where accepted_at is null and revoked_at is null and expires_at > now()) as pending_invitation_count,
  (select count(*) from public.admin_access_audit_logs) as immutable_audit_count,
  true as phase7_schema_security_verified;

rollback;
