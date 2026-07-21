begin;

create table public.content_migration_runs (
  id uuid primary key default gen_random_uuid(),
  run_key text not null unique,
  source_system text not null,
  source_snapshot_sha256 text not null,
  app_commit_sha text not null,
  mode text not null,
  status text not null default 'running',
  summary jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  constraint content_migration_runs_key_check check (char_length(run_key) between 1 and 200),
  constraint content_migration_runs_source_check check (char_length(source_system) between 1 and 80),
  constraint content_migration_runs_snapshot_check check (source_snapshot_sha256 ~ '^[0-9a-f]{64}$'),
  constraint content_migration_runs_commit_check check (app_commit_sha ~ '^[0-9a-f]{40}$'),
  constraint content_migration_runs_mode_check check (mode in ('apply', 'verify', 'rollback-test')),
  constraint content_migration_runs_status_check check (status in ('running', 'completed', 'failed', 'rolled-back')),
  constraint content_migration_runs_completed_check check (
    (status = 'running' and completed_at is null)
    or (status in ('completed', 'failed', 'rolled-back') and completed_at is not null)
  ),
  constraint content_migration_runs_summary_object_check check (jsonb_typeof(summary) = 'object')
);

create table public.content_source_refs (
  id uuid primary key default gen_random_uuid(),
  migration_run_id uuid not null references public.content_migration_runs(id) on delete restrict,
  source_system text not null,
  source_kind text not null,
  source_key text not null,
  source_url text,
  source_sha256 text not null,
  normalized_sha256 text not null,
  target_kind text not null,
  target_id uuid not null,
  target_natural_key text not null,
  operation text not null,
  migrated_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id),
  constraint content_source_refs_source_unique unique (source_system, source_kind, source_key),
  constraint content_source_refs_source_hash_check check (source_sha256 ~ '^[0-9a-f]{64}$'),
  constraint content_source_refs_normalized_hash_check check (normalized_sha256 ~ '^[0-9a-f]{64}$'),
  constraint content_source_refs_source_key_check check (char_length(source_key) between 1 and 500),
  constraint content_source_refs_target_key_check check (char_length(target_natural_key) between 1 and 500),
  constraint content_source_refs_target_kind_check check (
    target_kind in ('activity', 'post', 'file', 'faq', 'year-summary', 'site-settings', 'static-page')
  ),
  constraint content_source_refs_operation_check check (operation in ('create', 'update', 'merge', 'skip')),
  constraint content_source_refs_url_check check (
    source_url is null or (source_url ~ '^https://[^[:space:]]+$' and char_length(source_url) <= 2000)
  )
);

create index content_migration_runs_status_started_idx
  on public.content_migration_runs (status, started_at desc, id);
create index content_source_refs_run_idx
  on public.content_source_refs (migration_run_id, migrated_at, id);
create index content_source_refs_target_idx
  on public.content_source_refs (target_kind, target_id);

alter table public.content_migration_runs enable row level security;
alter table public.content_source_refs enable row level security;

revoke all on table public.content_migration_runs from public, anon, authenticated;
revoke all on table public.content_source_refs from public, anon, authenticated;

create or replace function public.phase9_require_target(p_target_kind text, p_target_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_exists boolean := false;
begin
  if public.is_admin() is not true then
    raise exception 'ADMIN_REQUIRED' using errcode = 'P0001';
  end if;

  case p_target_kind
    when 'activity' then select exists(select 1 from public.activities where id = p_target_id) into v_exists;
    when 'post' then select exists(select 1 from public.posts where id = p_target_id) into v_exists;
    when 'file' then select exists(select 1 from public.files where id = p_target_id) into v_exists;
    when 'faq' then select exists(select 1 from public.faq where id = p_target_id) into v_exists;
    when 'year-summary' then select exists(select 1 from public.year_summaries where id = p_target_id) into v_exists;
    when 'site-settings' then select exists(select 1 from public.site_settings where id = p_target_id and singleton_key = true) into v_exists;
    else raise exception 'UNSUPPORTED_TARGET_KIND' using errcode = 'P0001';
  end case;

  if not v_exists then
    raise exception 'TARGET_NOT_FOUND' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.phase9_begin_migration_run(
  p_run_key text,
  p_source_system text,
  p_source_snapshot_sha256 text,
  p_app_commit_sha text,
  p_mode text
)
returns public.content_migration_runs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_run public.content_migration_runs;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode = 'P0001'; end if;
  if public.is_admin() is not true then raise exception 'ADMIN_REQUIRED' using errcode = 'P0001'; end if;

  select * into v_run from public.content_migration_runs where run_key = p_run_key for update;
  if found then
    if v_run.source_system <> p_source_system
      or v_run.source_snapshot_sha256 <> p_source_snapshot_sha256
      or v_run.app_commit_sha <> p_app_commit_sha
      or v_run.mode <> p_mode then
      raise exception 'RUN_KEY_CONFLICT' using errcode = 'P0001';
    end if;
    update public.content_migration_runs
      set status = 'running', completed_at = null
      where id = v_run.id returning * into v_run;
    return v_run;
  end if;

  insert into public.content_migration_runs (
    run_key, source_system, source_snapshot_sha256, app_commit_sha, mode, created_by
  ) values (
    p_run_key, p_source_system, p_source_snapshot_sha256, p_app_commit_sha, p_mode, v_actor
  ) returning * into v_run;
  return v_run;
end;
$$;

create or replace function public.phase9_record_source_ref(
  p_migration_run_id uuid,
  p_source_system text,
  p_source_kind text,
  p_source_key text,
  p_source_url text,
  p_source_sha256 text,
  p_normalized_sha256 text,
  p_target_kind text,
  p_target_id uuid,
  p_target_natural_key text,
  p_operation text
)
returns public.content_source_refs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_ref public.content_source_refs;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode = 'P0001'; end if;
  if public.is_admin() is not true then raise exception 'ADMIN_REQUIRED' using errcode = 'P0001'; end if;
  if not exists (
    select 1 from public.content_migration_runs
    where id = p_migration_run_id and created_by = v_actor and status = 'running'
  ) then raise exception 'RUN_NOT_RUNNING' using errcode = 'P0001'; end if;

  perform public.phase9_require_target(p_target_kind, p_target_id);

  insert into public.content_source_refs (
    migration_run_id, source_system, source_kind, source_key, source_url,
    source_sha256, normalized_sha256, target_kind, target_id,
    target_natural_key, operation, created_by
  ) values (
    p_migration_run_id, p_source_system, p_source_kind, p_source_key, p_source_url,
    p_source_sha256, p_normalized_sha256, p_target_kind, p_target_id,
    p_target_natural_key, p_operation, v_actor
  )
  on conflict (source_system, source_kind, source_key) do update set
    migration_run_id = excluded.migration_run_id,
    source_url = excluded.source_url,
    source_sha256 = excluded.source_sha256,
    normalized_sha256 = excluded.normalized_sha256,
    target_kind = excluded.target_kind,
    target_id = excluded.target_id,
    target_natural_key = excluded.target_natural_key,
    operation = excluded.operation,
    migrated_at = now(),
    created_by = v_actor
  returning * into v_ref;
  return v_ref;
end;
$$;

create or replace function public.phase9_get_source_ref(
  p_source_system text,
  p_source_kind text,
  p_source_key text
)
returns table (
  migration_run_id uuid,
  source_sha256 text,
  normalized_sha256 text,
  target_kind text,
  target_id uuid,
  target_natural_key text,
  operation text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = 'P0001'; end if;
  if public.is_admin() is not true then raise exception 'ADMIN_REQUIRED' using errcode = 'P0001'; end if;
  return query
  select r.migration_run_id, r.source_sha256, r.normalized_sha256, r.target_kind,
    r.target_id, r.target_natural_key, r.operation
  from public.content_source_refs r
  where r.source_system = p_source_system
    and r.source_kind = p_source_kind
    and r.source_key = p_source_key;
end;
$$;

create or replace function public.phase9_finish_migration_run(
  p_run_id uuid,
  p_status text,
  p_summary jsonb
)
returns public.content_migration_runs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_run public.content_migration_runs;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode = 'P0001'; end if;
  if public.is_admin() is not true then raise exception 'ADMIN_REQUIRED' using errcode = 'P0001'; end if;
  if p_status not in ('completed', 'failed', 'rolled-back') then
    raise exception 'INVALID_STATUS' using errcode = 'P0001';
  end if;
  if p_summary is null or jsonb_typeof(p_summary) <> 'object' then
    raise exception 'INVALID_SUMMARY' using errcode = 'P0001';
  end if;

  update public.content_migration_runs
    set status = p_status, summary = p_summary, completed_at = now()
    where id = p_run_id and created_by = v_actor
    returning * into v_run;
  if not found then raise exception 'RUN_NOT_FOUND' using errcode = 'P0001'; end if;
  return v_run;
end;
$$;

create or replace function public.phase9_rollback_test_provenance(
  p_run_id uuid,
  p_summary jsonb
)
returns public.content_migration_runs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_run public.content_migration_runs;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode = 'P0001'; end if;
  if public.is_admin() is not true then raise exception 'ADMIN_REQUIRED' using errcode = 'P0001'; end if;
  select * into v_run from public.content_migration_runs
    where id = p_run_id and created_by = v_actor and source_system = 'synthetic'
    for update;
  if not found then raise exception 'TEST_RUN_NOT_FOUND' using errcode = 'P0001'; end if;

  delete from public.content_source_refs where migration_run_id = p_run_id;
  update public.content_migration_runs
    set status = 'rolled-back', summary = p_summary, completed_at = now()
    where id = p_run_id returning * into v_run;
  return v_run;
end;
$$;

revoke all on function public.phase9_require_target(text, uuid) from public, anon, authenticated;
revoke all on function public.phase9_begin_migration_run(text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.phase9_record_source_ref(uuid, text, text, text, text, text, text, text, uuid, text, text) from public, anon, authenticated;
revoke all on function public.phase9_get_source_ref(text, text, text) from public, anon, authenticated;
revoke all on function public.phase9_finish_migration_run(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.phase9_rollback_test_provenance(uuid, jsonb) from public, anon, authenticated;

grant execute on function public.phase9_begin_migration_run(text, text, text, text, text) to authenticated;
grant execute on function public.phase9_record_source_ref(uuid, text, text, text, text, text, text, text, uuid, text, text) to authenticated;
grant execute on function public.phase9_get_source_ref(text, text, text) to authenticated;
grant execute on function public.phase9_finish_migration_run(uuid, text, jsonb) to authenticated;
grant execute on function public.phase9_rollback_test_provenance(uuid, jsonb) to authenticated;

commit;
