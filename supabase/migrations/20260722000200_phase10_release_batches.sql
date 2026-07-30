-- Phase 10: fail-closed release checkpoints and resumable/idempotent batches.

create table public.release_safety_checkpoints (
  id uuid primary key default gen_random_uuid(),
  checkpoint_key text not null unique,
  environment text not null check (environment in ('staging', 'production')),
  database_backup_id text not null,
  database_evidence_sha256 text not null check (database_evidence_sha256 ~ '^[0-9a-f]{64}$'),
  storage_inventory_sha256 text not null check (storage_inventory_sha256 ~ '^[0-9a-f]{64}$'),
  restore_evidence_sha256 text not null check (restore_evidence_sha256 ~ '^[0-9a-f]{64}$'),
  restored_without_production_mutation boolean not null check (restored_without_production_mutation = true),
  restore_rehearsed_at timestamptz not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  check (restore_rehearsed_at <= created_at)
);

create table public.release_batches (
  id uuid primary key default gen_random_uuid(),
  batch_key text not null unique check (batch_key ~ '^[a-z0-9][a-z0-9-]{2,99}$'),
  manifest_sha256 text not null check (manifest_sha256 ~ '^[0-9a-f]{64}$'),
  mode text not null check (mode in ('dry-run', 'apply')),
  status text not null default 'planned'
    check (status in ('planned', 'running', 'completed', 'failed', 'rolled-back')),
  safety_checkpoint_id uuid references public.release_safety_checkpoints(id) on delete restrict,
  total_items integer not null check (total_items between 1 and 70),
  next_position integer not null default 1 check (next_position between 1 and 71),
  checkpoint_token uuid not null default gen_random_uuid(),
  summary jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (mode = 'dry-run' or safety_checkpoint_id is not null)
);

create table public.release_batch_items (
  id uuid primary key default gen_random_uuid(),
  release_batch_id uuid not null references public.release_batches(id) on delete restrict,
  position integer not null check (position between 1 and 70),
  editorial_target_id uuid not null references public.editorial_targets(id) on delete restrict,
  source_key text not null,
  target_kind text not null check (target_kind in ('activity', 'file', 'year-summary')),
  target_id uuid not null,
  requested_action text not null check (requested_action = 'publish'),
  manifest_review_keys text[] not null check (cardinality(manifest_review_keys) >= 1),
  manifest_redirect_keys text[] not null default '{}'::text[],
  status text not null default 'pending' check (status in ('pending', 'applied', 'verified', 'failed', 'rolled-back')),
  expected_target_version text not null,
  pre_status text not null,
  pre_published_at timestamptz,
  post_target_version text,
  applied_at timestamptz,
  verified_at timestamptz,
  rolled_back_at timestamptz,
  error_code text,
  created_at timestamptz not null default now(),
  unique (release_batch_id, position),
  unique (release_batch_id, editorial_target_id)
);

create table public.release_batch_redirects (
  id uuid primary key default gen_random_uuid(),
  release_batch_id uuid not null references public.release_batches(id) on delete restrict,
  release_batch_item_id uuid not null references public.release_batch_items(id) on delete restrict,
  editorial_redirect_id uuid not null references public.editorial_redirects(id) on delete restrict,
  redirect_key text not null,
  pre_decision text not null check (pre_decision in ('pending', 'keep-inactive', 'archive', 'activate')),
  status text not null default 'pending' check (status in ('pending', 'activated', 'rolled-back')),
  activated_at timestamptz,
  rolled_back_at timestamptz,
  created_at timestamptz not null default now(),
  unique (release_batch_id, editorial_redirect_id),
  check (status <> 'activated' or activated_at is not null),
  check (status <> 'rolled-back' or rolled_back_at is not null)
);

alter table public.editorial_audit_logs
  add constraint editorial_audit_logs_release_batch_fk
  foreign key (release_batch_id) references public.release_batches(id) on delete restrict;

create trigger set_release_batches_updated_at before update on public.release_batches
for each row execute function public.set_phase10_updated_at();

create or replace function public.phase10_register_safety_checkpoint(
  p_checkpoint_key text,
  p_environment text,
  p_database_backup_id text,
  p_database_evidence_sha256 text,
  p_storage_inventory_sha256 text,
  p_restore_evidence_sha256 text,
  p_restore_rehearsed_at timestamptz,
  p_correlation_id uuid
)
returns public.release_safety_checkpoints
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_checkpoint public.release_safety_checkpoints;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode = 'P0001'; end if;
  if public.is_admin() is not true then raise exception 'ADMIN_REQUIRED' using errcode = 'P0001'; end if;
  if p_correlation_id is null or p_checkpoint_key !~ '^[a-z0-9][a-z0-9-]{2,99}$'
    or p_environment not in ('staging', 'production')
    or nullif(btrim(coalesce(p_database_backup_id, '')), '') is null
    or p_database_evidence_sha256 !~ '^[0-9a-f]{64}$'
    or p_storage_inventory_sha256 !~ '^[0-9a-f]{64}$'
    or p_restore_evidence_sha256 !~ '^[0-9a-f]{64}$'
    or p_restore_rehearsed_at is null or p_restore_rehearsed_at > now() then
    raise exception 'BACKUP_EVIDENCE_REQUIRED' using errcode = 'P0001';
  end if;
  select * into v_checkpoint from public.release_safety_checkpoints where checkpoint_key = p_checkpoint_key for update;
  if found then
    if v_checkpoint.environment <> p_environment
      or v_checkpoint.database_backup_id <> p_database_backup_id
      or v_checkpoint.database_evidence_sha256 <> p_database_evidence_sha256
      or v_checkpoint.storage_inventory_sha256 <> p_storage_inventory_sha256
      or v_checkpoint.restore_evidence_sha256 <> p_restore_evidence_sha256 then
      raise exception 'CHECKPOINT_CONFLICT' using errcode = 'P0001';
    end if;
    return v_checkpoint;
  end if;
  insert into public.release_safety_checkpoints (
    checkpoint_key, environment, database_backup_id, database_evidence_sha256,
    storage_inventory_sha256, restore_evidence_sha256,
    restored_without_production_mutation, restore_rehearsed_at, created_by
  ) values (
    p_checkpoint_key, p_environment, btrim(p_database_backup_id), p_database_evidence_sha256,
    p_storage_inventory_sha256, p_restore_evidence_sha256, true, p_restore_rehearsed_at, v_actor
  ) returning * into v_checkpoint;
  return v_checkpoint;
end;
$$;

create or replace function public.phase10_target_release_ready(p_editorial_target_id uuid)
returns table (ready boolean, failure_code text, current_version text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target public.editorial_targets;
  v_state record;
  v_unredacted bigint := 0;
  v_invalid_assets bigint := 0;
begin
  select * into v_target from public.editorial_targets where id = p_editorial_target_id;
  if not found then return query select false, 'TARGET_NOT_FOUND'::text, null::text; return; end if;
  select * into v_state from public.phase10_target_state(v_target.target_kind, v_target.target_id);
  if not found then return query select false, 'TARGET_NOT_FOUND'::text, null::text; return; end if;
  if v_target.decision <> 'publish' or not v_target.content_verified
    or not v_target.privacy_verified or not v_target.authorization_verified then
    return query select false, 'PUBLISH_CHECKLIST_INCOMPLETE'::text, v_state.target_version; return;
  end if;
  if not exists (
    select 1 from public.editorial_reviews r
    where r.editorial_target_id = v_target.id and r.state = 'resolved' and r.decision = 'publish'
      and r.content_verified and r.privacy_verified and r.authorization_verified
  ) then return query select false, 'REVIEW_NOT_RESOLVED'::text, v_state.target_version; return; end if;
  if not exists (
    select 1 from public.editorial_reviews r
    where r.editorial_target_id = v_target.id and r.state = 'resolved' and r.decision = 'publish'
      and r.content_verified and r.privacy_verified and r.authorization_verified
      and r.target_version = v_state.target_version
  ) then return query select false, 'TARGET_VERSION_CONFLICT'::text, v_state.target_version; return; end if;
  if v_target.target_version is distinct from v_state.target_version then
    return query select false, 'TARGET_VERSION_CONFLICT'::text, v_state.target_version; return;
  end if;
  if v_target.target_kind = 'activity' then
    if not exists (
      select 1 from public.activities a where a.id = v_target.target_id
        and nullif(btrim(a.title), '') is not null
        and a.slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
        and a.academic_year between 1 and 999
        and a.activity_type in ('regular', 'project', 'exploration')
        and a.event_date is not null and nullif(btrim(a.location), '') is not null
        and nullif(btrim(a.result_summary), '') is not null and nullif(btrim(a.content), '') is not null
        and (a.participants_count is null or a.participants_count >= 0)
    ) then return query select false, 'CONTENT_NOT_PUBLISHABLE'::text, v_state.target_version; return; end if;
    select count(*) into v_unredacted from public.activity_assets
      where activity_id = v_target.target_id and privacy_state = 'redaction-required';
    select count(*) into v_invalid_assets from public.activity_assets a
      where a.activity_id = v_target.target_id and (
        a.original_sha256 is null or a.privacy_state = 'unknown'
        or (a.privacy_state = 'redacted' and (
          a.public_storage_path is null or a.public_mime_type is null or a.public_original_name is null
          or a.public_size_bytes is null or a.public_sha256 is null
          or not exists (
            select 1 from public.editorial_redacted_derivatives d
            where d.asset_kind = 'activity-asset' and d.asset_id = a.id and d.status = 'active'
              and d.derivative_bucket = a.storage_bucket and d.derivative_path = a.public_storage_path
              and d.derivative_sha256 = a.public_sha256
          )
        ))
      );
  elsif v_target.target_kind = 'file' then
    if not exists (
      select 1 from public.files f where f.id = v_target.target_id
        and nullif(btrim(f.title), '') is not null and nullif(btrim(f.storage_path), '') is not null
        and nullif(btrim(f.original_filename), '') is not null and nullif(btrim(f.mime_type), '') is not null
        and f.size_bytes > 0 and f.original_sha256 is not null
    ) then return query select false, 'CONTENT_NOT_PUBLISHABLE'::text, v_state.target_version; return; end if;
    select count(*) into v_unredacted from public.files
      where id = v_target.target_id and privacy_state = 'redaction-required';
    select count(*) into v_invalid_assets from public.files f
      where f.id = v_target.target_id and (
        f.privacy_state = 'unknown'
        or (f.privacy_state = 'redacted' and (
          f.public_storage_path is null or f.public_mime_type is null or f.public_original_name is null
          or f.public_size_bytes is null or f.public_sha256 is null
          or not exists (
            select 1 from public.editorial_redacted_derivatives d
            where d.asset_kind = 'file' and d.asset_id = f.id and d.status = 'active'
              and d.derivative_bucket = 'downloads' and d.derivative_path = f.public_storage_path
              and d.derivative_sha256 = f.public_sha256
          )
        ))
      );
  elsif v_target.target_kind = 'year-summary' then
    if not exists (
      select 1 from public.year_summaries y where y.id = v_target.target_id
        and nullif(btrim(y.title), '') is not null and nullif(btrim(y.summary), '') is not null
        and (y.report_file_id is null or exists (
          select 1 from public.files f where f.id = y.report_file_id
            and f.status = 'published' and f.published_at is not null and f.published_at <= now()
        ))
    ) then return query select false, 'CONTENT_NOT_PUBLISHABLE'::text, v_state.target_version; return; end if;
  end if;
  if v_unredacted > 0 then return query select false, 'REDACTION_REQUIRED'::text, v_state.target_version; return; end if;
  if v_invalid_assets > 0 then return query select false, 'PUBLISH_CHECKLIST_INCOMPLETE'::text, v_state.target_version; return; end if;
  if v_state.target_status = 'published' then
    if v_state.published_at is null or v_state.published_at > now() then
      return query select false, 'TARGET_STATUS_CONFLICT'::text, v_state.target_version; return;
    end if;
    return query select true, 'ALREADY_PUBLISHED'::text, v_state.target_version; return;
  end if;
  if v_state.target_status <> 'draft' or v_state.published_at is not null then
    return query select false, 'TARGET_STATUS_CONFLICT'::text, v_state.target_version; return;
  end if;
  return query select true, null::text, v_state.target_version;
end;
$$;

create or replace function public.phase10_plan_release_batch(
  p_batch_key text,
  p_manifest_sha256 text,
  p_source_keys text[],
  p_manifest_items jsonb,
  p_mode text,
  p_environment text,
  p_safety_checkpoint_key text,
  p_correlation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_batch public.release_batches;
  v_safety public.release_safety_checkpoints;
  v_count integer;
  v_row record;
  v_ready record;
  v_review_keys text[];
  v_redirect_keys text[];
  v_eligible integer := 0;
  v_blocked integer := 0;
  v_stale integer := 0;
  v_already_published integer := 0;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode = 'P0001'; end if;
  if public.is_admin() is not true then raise exception 'ADMIN_REQUIRED' using errcode = 'P0001'; end if;
  if p_correlation_id is null or p_batch_key !~ '^[a-z0-9][a-z0-9-]{2,99}$'
    or p_manifest_sha256 !~ '^[0-9a-f]{64}$' or p_mode not in ('dry-run', 'apply')
    or (p_mode = 'dry-run' and p_environment not in ('local', 'staging', 'production'))
    or (p_mode = 'apply' and p_environment not in ('staging', 'production'))
    or p_source_keys is null or cardinality(p_source_keys) < 1 or cardinality(p_source_keys) > 70
    or (select count(distinct value) from unnest(p_source_keys) value) <> cardinality(p_source_keys)
    or jsonb_typeof(p_manifest_items) <> 'array'
    or jsonb_array_length(p_manifest_items) <> cardinality(p_source_keys)
    or (select count(distinct item->>'sourceKey') from jsonb_array_elements(p_manifest_items) item) <> cardinality(p_source_keys)
    or exists (
      select 1 from jsonb_array_elements(p_manifest_items) item
      where item->>'sourceKey' <> all(p_source_keys)
        or coalesce(item->>'targetId', '') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        or coalesce(item->>'targetKind', '') not in ('activity', 'file', 'year-summary')
        or nullif(item->>'expectedTargetVersion', '') is null
        or jsonb_typeof(item->'reviewKeys') <> 'array'
        or jsonb_array_length(item->'reviewKeys') < 1
        or jsonb_typeof(coalesce(item->'redirectKeys', '[]'::jsonb)) <> 'array'
    ) then
    raise exception 'VALIDATION_ERROR' using errcode = 'P0001';
  end if;
  if p_mode = 'apply' then
    select * into v_safety from public.release_safety_checkpoints where checkpoint_key = p_safety_checkpoint_key;
    if not found then raise exception 'BACKUP_EVIDENCE_REQUIRED' using errcode = 'P0001'; end if;
    if v_safety.environment <> p_environment then raise exception 'CHECKPOINT_CONFLICT' using errcode = 'P0001'; end if;
  end if;
  select count(*) into v_count from public.editorial_targets where source_key = any(p_source_keys);
  if v_count <> cardinality(p_source_keys) then raise exception 'TARGET_SET_MISMATCH' using errcode = 'P0001'; end if;

  select * into v_batch from public.release_batches where batch_key = p_batch_key for update;
  if found then
    if v_batch.manifest_sha256 <> p_manifest_sha256 or v_batch.mode <> p_mode
      or v_batch.total_items <> cardinality(p_source_keys)
      or (p_mode = 'apply' and v_batch.safety_checkpoint_id is distinct from v_safety.id) then
      raise exception 'BATCH_KEY_CONFLICT' using errcode = 'P0001';
    end if;
    return jsonb_build_object('id', v_batch.id, 'batchKey', v_batch.batch_key, 'mode', v_batch.mode,
      'status', v_batch.status, 'totalItems', v_batch.total_items, 'nextPosition', v_batch.next_position,
      'checkpointToken', v_batch.checkpoint_token, 'idempotent', true);
  end if;

  for v_row in
    select t.*, source.ordinality::integer as position, source.item as manifest_item
    from jsonb_array_elements(p_manifest_items) with ordinality source(item, ordinality)
    join public.editorial_targets t on t.source_key = source.item->>'sourceKey'
    order by source.ordinality
  loop
    if v_row.target_id <> (v_row.manifest_item->>'targetId')::uuid
      or v_row.target_kind <> v_row.manifest_item->>'targetKind' then
      raise exception 'TARGET_SET_MISMATCH' using errcode = 'P0001';
    end if;
    select coalesce(array_agg(value order by value), '{}'::text[]) into v_review_keys
      from jsonb_array_elements_text(v_row.manifest_item->'reviewKeys') value;
    if cardinality(v_review_keys) <> (select count(distinct value) from unnest(v_review_keys) value)
      or exists (select 1 from unnest(v_review_keys) value where value !~ '^P9-[0-9]{4}$')
      or (select count(*) from public.editorial_reviews r
          where r.editorial_target_id = v_row.id and r.review_key = any(v_review_keys)) <> cardinality(v_review_keys)
      or (select count(*) from public.editorial_reviews r where r.editorial_target_id = v_row.id) <> cardinality(v_review_keys) then
      raise exception 'REVIEW_NOT_RESOLVED' using errcode = 'P0001';
    end if;
    select coalesce(array_agg(value order by value), '{}'::text[]) into v_redirect_keys
      from jsonb_array_elements_text(coalesce(v_row.manifest_item->'redirectKeys', '[]'::jsonb)) value;
    if cardinality(v_redirect_keys) <> (select count(distinct value) from unnest(v_redirect_keys) value)
      or exists (select 1 from unnest(v_redirect_keys) value where value !~ '^R9-[0-9a-f]{24}$')
      or (select count(*) from public.editorial_redirects d
          where d.redirect_key = any(v_redirect_keys) and d.source_key = v_row.source_key
            and d.phase9_disposition = 'draft-target') <> cardinality(v_redirect_keys) then
      raise exception 'REDIRECT_NOT_FOUND' using errcode = 'P0001';
    end if;
    if (select count(*) from public.editorial_redirects d
        where d.source_key = v_row.source_key and d.phase9_disposition = 'draft-target') <> cardinality(v_redirect_keys) then
      raise exception 'REDIRECT_NOT_FOUND' using errcode = 'P0001';
    end if;
    select * into v_ready from public.phase10_target_release_ready(v_row.id);
    if not v_ready.ready then
      if p_mode = 'apply' then raise exception '%', v_ready.failure_code using errcode = 'P0001'; end if;
      if v_ready.failure_code = 'TARGET_VERSION_CONFLICT' then v_stale := v_stale + 1;
      else v_blocked := v_blocked + 1; end if;
      continue;
    end if;
    if v_ready.current_version is distinct from v_row.manifest_item->>'expectedTargetVersion' then
      if p_mode = 'apply' then raise exception 'TARGET_VERSION_CONFLICT' using errcode = 'P0001'; end if;
      v_stale := v_stale + 1;
      continue;
    end if;
    if v_ready.failure_code is null and exists (
      select 1 from public.editorial_redirects d
      where d.redirect_key = any(v_redirect_keys) and d.decision = 'activate'
    ) then raise exception 'PUBLIC_TARGET_EVIDENCE_REQUIRED' using errcode = 'P0001'; end if;
    v_eligible := v_eligible + 1;
    if v_ready.failure_code = 'ALREADY_PUBLISHED' then v_already_published := v_already_published + 1; end if;
  end loop;

  if p_mode = 'dry-run' then
    return jsonb_build_object('batchKey', p_batch_key, 'mode', p_mode, 'status', 'validated',
      'totalItems', cardinality(p_source_keys), 'databaseMutations', 0,
      'storageMutations', 0,
      'eligible', v_eligible,
      'blocked', v_blocked, 'stale', v_stale,
      'alreadyPublished', v_already_published,
      'linkedRedirects', (
        select coalesce(sum(jsonb_array_length(coalesce(item->'redirectKeys', '[]'::jsonb))), 0)
        from jsonb_array_elements(p_manifest_items) item
      ),
      'idempotent', false);
  end if;

  insert into public.release_batches (
    batch_key, manifest_sha256, mode, status, safety_checkpoint_id, total_items,
    next_position, summary, created_by, started_at, completed_at
  ) values (
    p_batch_key, p_manifest_sha256, p_mode,
    'planned',
    v_safety.id, cardinality(p_source_keys), 1,
    jsonb_build_object('validatedItems', cardinality(p_source_keys), 'environment', p_environment,
      'databaseMutations', 0, 'storageMutations', 0),
    v_actor, null, null
  ) returning * into v_batch;

  insert into public.release_batch_items (
    release_batch_id, position, editorial_target_id, source_key, target_kind, target_id,
    requested_action, manifest_review_keys, manifest_redirect_keys,
    expected_target_version, pre_status, pre_published_at
  )
  select v_batch.id, source.ordinality::integer, t.id, t.source_key, t.target_kind, t.target_id,
    'publish',
    array(select value from jsonb_array_elements_text(source.item->'reviewKeys') value order by value),
    array(select value from jsonb_array_elements_text(coalesce(source.item->'redirectKeys', '[]'::jsonb)) value order by value),
    source.item->>'expectedTargetVersion', state.target_status, state.published_at
  from jsonb_array_elements(p_manifest_items) with ordinality source(item, ordinality)
  join public.editorial_targets t on t.source_key = source.item->>'sourceKey'
  cross join lateral public.phase10_target_state(t.target_kind, t.target_id) state;

  insert into public.release_batch_redirects (
    release_batch_id, release_batch_item_id, editorial_redirect_id, redirect_key, pre_decision
  )
  select v_batch.id, batch_item.id, d.id, d.redirect_key, d.decision
  from jsonb_array_elements(p_manifest_items) source(item)
  join public.editorial_targets t on t.source_key = source.item->>'sourceKey'
  join public.release_batch_items batch_item on batch_item.release_batch_id = v_batch.id and batch_item.editorial_target_id = t.id
  cross join lateral jsonb_array_elements_text(coalesce(source.item->'redirectKeys', '[]'::jsonb)) redirect_key(value)
  join public.editorial_redirects d on d.redirect_key = redirect_key.value;

  insert into public.editorial_audit_logs (
    actor_user_id, action, release_batch_id, correlation_id, after_state
  ) values (
    v_actor, 'release_planned', v_batch.id, p_correlation_id,
    jsonb_build_object('batchKey', p_batch_key, 'mode', p_mode, 'items', cardinality(p_source_keys),
      'manifestSha256', p_manifest_sha256)
  );
  return jsonb_build_object('id', v_batch.id, 'batchKey', v_batch.batch_key, 'mode', v_batch.mode,
    'status', v_batch.status, 'totalItems', v_batch.total_items, 'nextPosition', v_batch.next_position,
    'checkpointToken', v_batch.checkpoint_token, 'idempotent', false);
end;
$$;

create or replace function public.phase10_apply_release_batch(
  p_batch_key text,
  p_checkpoint_token uuid,
  p_max_items integer,
  p_correlation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_batch public.release_batches;
  v_item public.release_batch_items;
  v_target public.editorial_targets;
  v_ready record;
  v_state record;
  v_processed integer := 0;
  v_remaining integer;
  v_applied_total integer := 0;
  v_error_code text;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode = 'P0001'; end if;
  if public.is_admin() is not true then raise exception 'ADMIN_REQUIRED' using errcode = 'P0001'; end if;
  if p_correlation_id is null or p_max_items < 1 or p_max_items > 25 then raise exception 'VALIDATION_ERROR' using errcode = 'P0001'; end if;
  select * into v_batch from public.release_batches where batch_key = p_batch_key for update;
  if not found then raise exception 'BATCH_NOT_FOUND' using errcode = 'P0001'; end if;
  if v_batch.mode <> 'apply' then raise exception 'DRY_RUN_CANNOT_APPLY' using errcode = 'P0001'; end if;
  if v_batch.checkpoint_token <> p_checkpoint_token then raise exception 'CHECKPOINT_CONFLICT' using errcode = 'P0001'; end if;
  if v_batch.status = 'completed' then
    return jsonb_build_object('batchKey', v_batch.batch_key, 'status', v_batch.status,
      'processed', 0, 'remaining', 0, 'checkpointToken', v_batch.checkpoint_token, 'idempotent', true);
  end if;
  if v_batch.status not in ('planned', 'running') then raise exception 'BATCH_NOT_APPLICABLE' using errcode = 'P0001'; end if;

  update public.release_batches set status = 'running', started_at = coalesce(started_at, now())
    where id = v_batch.id returning * into v_batch;
  for v_item in
    select * from public.release_batch_items
    where release_batch_id = v_batch.id and status = 'pending'
    order by position limit p_max_items for update
  loop
    begin
      select * into v_target from public.editorial_targets where id = v_item.editorial_target_id for update;
      select * into v_ready from public.phase10_target_release_ready(v_target.id);
      if not v_ready.ready then raise exception '%', v_ready.failure_code using errcode = 'P0001'; end if;
      if v_ready.current_version is distinct from v_item.expected_target_version then
        raise exception 'TARGET_VERSION_CONFLICT' using errcode = 'P0001';
      end if;
      if v_ready.failure_code = 'ALREADY_PUBLISHED' then
        update public.release_batch_items set status = 'applied', post_target_version = v_ready.current_version,
          applied_at = coalesce(applied_at, now()), error_code = null where id = v_item.id;
      else
        perform set_config('app.phase10_release_target', v_target.target_id::text, true);
        case v_target.target_kind
          when 'activity' then update public.activities set status = 'published', published_at = now(), updated_by = v_actor where id = v_target.target_id;
          when 'file' then update public.files set status = 'published', published_at = now(), updated_by = v_actor where id = v_target.target_id;
          when 'year-summary' then update public.year_summaries set status = 'published', published_at = now(), updated_by = v_actor where id = v_target.target_id;
          else raise exception 'UNSUPPORTED_TARGET_KIND' using errcode = 'P0001';
        end case;
        perform set_config('app.phase10_release_target', '', true);
        select * into v_state from public.phase10_target_state(v_target.target_kind, v_target.target_id);
        if v_state.target_status <> 'published' or v_state.published_at is null or v_state.published_at > now() then
          raise exception 'TARGET_STATUS_CONFLICT' using errcode = 'P0001';
        end if;
        update public.editorial_targets set target_version = v_state.target_version where id = v_target.id;
        update public.editorial_reviews set target_version = v_state.target_version where editorial_target_id = v_target.id;
        update public.release_batch_items set status = 'applied', post_target_version = v_state.target_version,
          applied_at = now(), error_code = null where id = v_item.id;
        insert into public.editorial_audit_logs (
          actor_user_id, action, editorial_target_id, release_batch_id, correlation_id, after_state
        ) values (
          v_actor, 'target_published', v_target.id, v_batch.id, p_correlation_id,
          jsonb_build_object('targetKind', v_target.target_kind, 'targetId', v_target.target_id,
            'targetVersion', v_state.target_version, 'position', v_item.position)
        );
      end if;
    exception when others then
      perform set_config('app.phase10_release_target', '', true);
      v_error_code := case when sqlerrm in (
        'TARGET_NOT_FOUND', 'TARGET_VERSION_CONFLICT', 'PUBLISH_CHECKLIST_INCOMPLETE',
        'REVIEW_NOT_RESOLVED', 'REDACTION_REQUIRED', 'CONTENT_NOT_PUBLISHABLE',
        'TARGET_STATUS_CONFLICT', 'UNSUPPORTED_TARGET_KIND', 'MANAGED_TARGET_RELEASE_REQUIRED'
      ) then sqlerrm else 'INTERNAL_ERROR' end;
      update public.release_batch_items set status = 'failed', error_code = v_error_code where id = v_item.id;
      select count(*) into v_remaining from public.release_batch_items
        where release_batch_id = v_batch.id and status = 'pending';
      select count(*) into v_applied_total from public.release_batch_items
        where release_batch_id = v_batch.id and status in ('applied', 'verified');
      update public.release_batches set status = 'failed', next_position = v_item.position,
        checkpoint_token = gen_random_uuid(), completed_at = now(),
        summary = jsonb_build_object('appliedItems', v_applied_total, 'remainingItems', v_remaining,
          'failedPosition', v_item.position, 'errorCode', v_error_code)
        where id = v_batch.id returning * into v_batch;
      insert into public.editorial_audit_logs (
        actor_user_id, action, release_batch_id, correlation_id, after_state
      ) values (
        v_actor, 'release_applied', v_batch.id, p_correlation_id,
        jsonb_build_object('processed', v_processed, 'remaining', v_remaining, 'status', 'failed',
          'failedPosition', v_item.position, 'errorCode', v_error_code)
      );
      return jsonb_build_object('batchKey', v_batch.batch_key, 'status', v_batch.status,
        'processed', v_processed, 'remaining', v_remaining, 'nextPosition', v_batch.next_position,
        'failedPosition', v_item.position, 'errorCode', v_error_code,
        'checkpointToken', v_batch.checkpoint_token, 'idempotent', false);
    end;
    v_processed := v_processed + 1;
  end loop;
  select count(*) into v_remaining from public.release_batch_items where release_batch_id = v_batch.id and status = 'pending';
  update public.release_batches set
    status = case when v_remaining = 0 then 'completed' else 'running' end,
    next_position = coalesce((select min(position) from public.release_batch_items where release_batch_id = v_batch.id and status = 'pending'), total_items + 1),
    checkpoint_token = gen_random_uuid(),
    completed_at = case when v_remaining = 0 then now() else null end,
    summary = jsonb_build_object('appliedItems', total_items - v_remaining, 'remainingItems', v_remaining)
    where id = v_batch.id returning * into v_batch;
  insert into public.editorial_audit_logs (
    actor_user_id, action, release_batch_id, correlation_id, after_state
  ) values (
    v_actor, 'release_applied', v_batch.id, p_correlation_id,
    jsonb_build_object('processed', v_processed, 'remaining', v_remaining, 'status', v_batch.status)
  );
  return jsonb_build_object('batchKey', v_batch.batch_key, 'status', v_batch.status,
    'processed', v_processed, 'remaining', v_remaining, 'nextPosition', v_batch.next_position,
    'checkpointToken', v_batch.checkpoint_token, 'idempotent', false);
end;
$$;

create or replace function public.phase10_verify_release_batch(
  p_batch_key text,
  p_correlation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_batch public.release_batches;
  v_bad integer := 0;
  v_verified integer := 0;
  v_changed integer := 0;
  v_item public.release_batch_items;
  v_state record;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode = 'P0001'; end if;
  if public.is_admin() is not true then raise exception 'ADMIN_REQUIRED' using errcode = 'P0001'; end if;
  if p_correlation_id is null then raise exception 'VALIDATION_ERROR' using errcode = 'P0001'; end if;
  select * into v_batch from public.release_batches where batch_key = p_batch_key for update;
  if not found then raise exception 'BATCH_NOT_FOUND' using errcode = 'P0001'; end if;
  if v_batch.mode = 'apply' and v_batch.status <> 'completed' then
    raise exception 'BATCH_NOT_APPLICABLE' using errcode = 'P0001';
  end if;
  for v_item in select * from public.release_batch_items where release_batch_id = v_batch.id order by position for update loop
    select * into v_state from public.phase10_target_state(v_item.target_kind, v_item.target_id);
    if v_batch.mode = 'dry-run' then
      if v_state.target_status <> v_item.pre_status or v_state.published_at is distinct from v_item.pre_published_at then v_bad := v_bad + 1; end if;
    else
      if v_state.target_status <> 'published' or v_state.published_at is null or v_state.published_at > now()
        or v_item.status not in ('applied', 'verified')
        or v_item.post_target_version is distinct from v_state.target_version then v_bad := v_bad + 1;
      else
        if v_item.status = 'applied' then
          update public.release_batch_items set status = 'verified', verified_at = now() where id = v_item.id;
          v_changed := v_changed + 1;
        end if;
        v_verified := v_verified + 1;
      end if;
    end if;
  end loop;
  if v_bad > 0 then raise exception 'BATCH_RECONCILIATION_FAILED' using errcode = 'P0001'; end if;
  if v_batch.mode = 'dry-run' or v_changed > 0 then
    insert into public.editorial_audit_logs (
      actor_user_id, action, release_batch_id, correlation_id, after_state
    ) values (v_actor, 'release_verified', v_batch.id, p_correlation_id,
      jsonb_build_object('mode', v_batch.mode, 'verifiedItems', v_verified, 'mismatches', 0));
  end if;
  return jsonb_build_object('batchKey', v_batch.batch_key, 'mode', v_batch.mode,
    'status', 'verified', 'items', v_batch.total_items, 'mismatches', 0,
    'idempotent', v_batch.mode = 'apply' and v_changed = 0);
end;
$$;

create or replace function public.phase10_activate_batch_redirect(
  p_batch_key text,
  p_redirect_key text,
  p_correlation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_batch public.release_batches;
  v_link public.release_batch_redirects;
  v_redirect public.editorial_redirects;
  v_item public.release_batch_items;
  v_state record;
  v_before jsonb;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode = 'P0001'; end if;
  if public.is_admin() is not true then raise exception 'ADMIN_REQUIRED' using errcode = 'P0001'; end if;
  if p_correlation_id is null or p_redirect_key !~ '^R9-[0-9a-f]{24}$' then raise exception 'VALIDATION_ERROR' using errcode = 'P0001'; end if;
  select * into v_batch from public.release_batches where batch_key = p_batch_key for update;
  if not found then raise exception 'BATCH_NOT_FOUND' using errcode = 'P0001'; end if;
  if v_batch.mode <> 'apply' or v_batch.status <> 'completed' then raise exception 'BATCH_NOT_APPLICABLE' using errcode = 'P0001'; end if;
  select * into v_link from public.release_batch_redirects
    where release_batch_id = v_batch.id and redirect_key = p_redirect_key for update;
  if not found then raise exception 'REDIRECT_NOT_FOUND' using errcode = 'P0001'; end if;
  select * into v_item from public.release_batch_items where id = v_link.release_batch_item_id;
  select * into v_state from public.phase10_target_state(v_item.target_kind, v_item.target_id);
  if v_state.target_status <> 'published' or v_state.published_at is null or v_state.published_at > now()
    or v_item.status <> 'verified' or v_item.post_target_version is distinct from v_state.target_version then
    raise exception 'PUBLIC_TARGET_EVIDENCE_REQUIRED' using errcode = 'P0001';
  end if;
  select * into v_redirect from public.editorial_redirects where id = v_link.editorial_redirect_id for update;
  if not v_redirect.target_verified or v_redirect.verified_final_status <> 200 or v_redirect.verified_hops <> 1
    or v_redirect.target_version is distinct from v_state.target_version then
    raise exception 'PUBLIC_TARGET_EVIDENCE_REQUIRED' using errcode = 'P0001';
  end if;
  if v_redirect.phase9_disposition = 'draft-target' and not exists (
    select 1 from public.editorial_reviews r where r.editorial_redirect_id = v_redirect.id
      and r.state = 'resolved' and r.decision = 'activate-redirect'
      and r.public_target_verified and r.target_version = v_redirect.target_version
  ) then raise exception 'PUBLIC_TARGET_EVIDENCE_REQUIRED' using errcode = 'P0001'; end if;
  if v_link.status = 'activated' then
    if v_redirect.decision <> 'activate' then raise exception 'BATCH_RECONCILIATION_FAILED' using errcode = 'P0001'; end if;
    return jsonb_build_object('batchKey', p_batch_key, 'redirectKey', p_redirect_key, 'status', 'activated', 'idempotent', true);
  end if;
  if v_link.status <> 'pending' then raise exception 'BATCH_NOT_APPLICABLE' using errcode = 'P0001'; end if;
  v_before := to_jsonb(v_redirect) - 'decided_by';
  update public.editorial_redirects set decision = 'activate',
    decision_reason = 'Approved batch target is public and has recorded one-hop final-200 evidence.',
    decided_by = v_actor, decided_at = now()
    where id = v_redirect.id returning * into v_redirect;
  update public.release_batch_redirects set status = 'activated', activated_at = now() where id = v_link.id;
  insert into public.editorial_audit_logs (
    actor_user_id, action, editorial_redirect_id, release_batch_id, correlation_id, before_state, after_state
  ) values (v_actor, 'redirect_decided', v_redirect.id, v_batch.id, p_correlation_id,
    v_before, to_jsonb(v_redirect) - 'decided_by');
  return jsonb_build_object('batchKey', p_batch_key, 'redirectKey', p_redirect_key, 'status', 'activated', 'idempotent', false);
end;
$$;

create or replace function public.phase10_rollback_release_batch(
  p_batch_key text,
  p_checkpoint_token uuid,
  p_correlation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_batch public.release_batches;
  v_item public.release_batch_items;
  v_redirect_item public.release_batch_redirects;
  v_redirect public.editorial_redirects;
  v_state record;
  v_rolled_back integer := 0;
  v_cancelled integer := 0;
  v_redirects_rolled_back integer := 0;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode = 'P0001'; end if;
  if public.is_admin() is not true then raise exception 'ADMIN_REQUIRED' using errcode = 'P0001'; end if;
  if p_correlation_id is null then raise exception 'VALIDATION_ERROR' using errcode = 'P0001'; end if;
  select * into v_batch from public.release_batches where batch_key = p_batch_key for update;
  if not found then raise exception 'BATCH_NOT_FOUND' using errcode = 'P0001'; end if;
  if v_batch.status = 'rolled-back' then return jsonb_build_object('batchKey', p_batch_key, 'status', 'rolled-back', 'idempotent', true); end if;
  if v_batch.mode <> 'apply' or v_batch.status not in ('running', 'completed', 'failed')
    or v_batch.checkpoint_token <> p_checkpoint_token then raise exception 'ROLLBACK_NOT_ALLOWED' using errcode = 'P0001'; end if;
  for v_redirect_item in
    select * from public.release_batch_redirects
    where release_batch_id = v_batch.id and status in ('pending', 'activated')
    order by created_at desc for update
  loop
    select * into v_redirect from public.editorial_redirects where id = v_redirect_item.editorial_redirect_id for update;
    if v_redirect.decision = 'activate' and v_redirect_item.pre_decision <> 'activate' then
      update public.editorial_redirects set
        decision = case when v_redirect_item.pre_decision = 'archive' then 'archive' else 'keep-inactive' end,
        decision_reason = 'Release batch rolled back; redirect must remain inactive.',
        decided_by = v_actor, decided_at = now() where id = v_redirect.id;
      insert into public.editorial_audit_logs (
        actor_user_id, action, editorial_redirect_id, release_batch_id, correlation_id, before_state, after_state
      ) values (v_actor, 'redirect_decided', v_redirect.id, v_batch.id, p_correlation_id,
        jsonb_build_object('decision', v_redirect.decision),
        jsonb_build_object('decision', case when v_redirect_item.pre_decision = 'archive' then 'archive' else 'keep-inactive' end,
          'reasonCode', 'release-batch-rollback'));
      v_redirects_rolled_back := v_redirects_rolled_back + 1;
    end if;
    update public.release_batch_redirects set status = 'rolled-back', rolled_back_at = now() where id = v_redirect_item.id;
  end loop;
  for v_item in
    select * from public.release_batch_items where release_batch_id = v_batch.id and status in ('applied', 'verified')
    order by position desc for update
  loop
    select * into v_state from public.phase10_target_state(v_item.target_kind, v_item.target_id);
    if v_state.target_status <> 'published' or v_state.target_version is distinct from v_item.post_target_version then
      raise exception 'ROLLBACK_TARGET_CONFLICT' using errcode = 'P0001';
    end if;
    if v_item.pre_status <> 'published' then
      perform set_config('app.phase10_release_target', v_item.target_id::text, true);
      case v_item.target_kind
        when 'activity' then update public.activities set status = v_item.pre_status, published_at = v_item.pre_published_at, updated_by = v_actor where id = v_item.target_id;
        when 'file' then update public.files set status = v_item.pre_status, published_at = v_item.pre_published_at, updated_by = v_actor where id = v_item.target_id;
        when 'year-summary' then update public.year_summaries set status = v_item.pre_status, published_at = v_item.pre_published_at, updated_by = v_actor where id = v_item.target_id;
      end case;
      perform set_config('app.phase10_release_target', '', true);
      select * into v_state from public.phase10_target_state(v_item.target_kind, v_item.target_id);
      update public.editorial_targets set target_version = v_state.target_version where id = v_item.editorial_target_id;
      update public.editorial_reviews set target_version = v_state.target_version where editorial_target_id = v_item.editorial_target_id;
      insert into public.editorial_audit_logs (
        actor_user_id, action, editorial_target_id, release_batch_id, correlation_id, after_state
      ) values (
        v_actor, 'target_unpublished', v_item.editorial_target_id, v_batch.id, p_correlation_id,
        jsonb_build_object('targetKind', v_item.target_kind, 'targetId', v_item.target_id,
          'targetVersion', v_state.target_version, 'reasonCode', 'release-batch-rollback')
      );
    end if;
    update public.release_batch_items set status = 'rolled-back', rolled_back_at = now() where id = v_item.id;
    v_rolled_back := v_rolled_back + 1;
  end loop;
  update public.release_batch_items set status = 'rolled-back', rolled_back_at = now()
    where release_batch_id = v_batch.id and status in ('pending', 'failed');
  get diagnostics v_cancelled = row_count;
  update public.release_batches set status = 'rolled-back', completed_at = now(), checkpoint_token = gen_random_uuid(),
    summary = summary || jsonb_build_object('rolledBackItems', v_rolled_back, 'cancelledItems', v_cancelled,
      'rolledBackRedirects', v_redirects_rolled_back)
    where id = v_batch.id returning * into v_batch;
  insert into public.editorial_audit_logs (
    actor_user_id, action, release_batch_id, correlation_id, after_state
  ) values (v_actor, 'release_rolled_back', v_batch.id, p_correlation_id,
    jsonb_build_object('rolledBackItems', v_rolled_back, 'cancelledItems', v_cancelled,
      'rolledBackRedirects', v_redirects_rolled_back));
  return jsonb_build_object('batchKey', v_batch.batch_key, 'status', v_batch.status,
    'rolledBackItems', v_rolled_back, 'cancelledItems', v_cancelled,
    'rolledBackRedirects', v_redirects_rolled_back,
    'checkpointToken', v_batch.checkpoint_token, 'idempotent', false);
end;
$$;

create or replace function public.phase10_publish_managed_target(
  p_target_kind text,
  p_target_id uuid,
  p_correlation_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_target public.editorial_targets;
  v_ready record;
  v_state record;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode = 'P0001'; end if;
  if public.is_admin() is not true then raise exception 'ADMIN_REQUIRED' using errcode = 'P0001'; end if;
  if p_correlation_id is null then raise exception 'VALIDATION_ERROR' using errcode = 'P0001'; end if;
  select * into v_target from public.editorial_targets where target_kind = p_target_kind and target_id = p_target_id for update;
  if not found then return false; end if;
  select * into v_ready from public.phase10_target_release_ready(v_target.id);
  if not v_ready.ready then raise exception '%', v_ready.failure_code using errcode = 'P0001'; end if;
  if v_ready.failure_code is distinct from 'ALREADY_PUBLISHED' then
    perform set_config('app.phase10_release_target', p_target_id::text, true);
    case p_target_kind
      when 'activity' then update public.activities set status = 'published', published_at = now(), updated_by = v_actor where id = p_target_id;
      when 'file' then update public.files set status = 'published', published_at = now(), updated_by = v_actor where id = p_target_id;
      when 'year-summary' then update public.year_summaries set status = 'published', published_at = now(), updated_by = v_actor where id = p_target_id;
      else raise exception 'UNSUPPORTED_TARGET_KIND' using errcode = 'P0001';
    end case;
    perform set_config('app.phase10_release_target', '', true);
    select * into v_state from public.phase10_target_state(p_target_kind, p_target_id);
    update public.editorial_targets set target_version = v_state.target_version where id = v_target.id;
    update public.editorial_reviews set target_version = v_state.target_version where editorial_target_id = v_target.id;
    insert into public.editorial_audit_logs (
      actor_user_id, action, editorial_target_id, correlation_id, after_state
    ) values (v_actor, 'target_published', v_target.id, p_correlation_id,
      jsonb_build_object('targetKind', p_target_kind, 'targetId', p_target_id, 'targetVersion', v_state.target_version));
  end if;
  return true;
end;
$$;

create or replace function public.phase10_unpublish_managed_target(
  p_target_kind text,
  p_target_id uuid,
  p_correlation_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_target public.editorial_targets;
  v_redirect public.editorial_redirects;
  v_state record;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode = 'P0001'; end if;
  if public.is_admin() is not true then raise exception 'ADMIN_REQUIRED' using errcode = 'P0001'; end if;
  if p_correlation_id is null then raise exception 'VALIDATION_ERROR' using errcode = 'P0001'; end if;
  select * into v_target from public.editorial_targets where target_kind = p_target_kind and target_id = p_target_id for update;
  if not found then return false; end if;
  select * into v_state from public.phase10_target_state(p_target_kind, p_target_id);
  for v_redirect in
    select * from public.editorial_redirects
    where source_key = v_target.source_key and phase9_disposition = 'draft-target' and decision = 'activate'
    order by redirect_key for update
  loop
    update public.editorial_redirects set decision = 'keep-inactive',
      decision_reason = 'Managed target was unpublished; redirect evidence is no longer current.',
      decided_by = v_actor, decided_at = now() where id = v_redirect.id;
    insert into public.editorial_audit_logs (
      actor_user_id, action, editorial_redirect_id, correlation_id, before_state, after_state
    ) values (
      v_actor, 'redirect_decided', v_redirect.id, p_correlation_id,
      jsonb_build_object('decision', v_redirect.decision, 'targetVersion', v_redirect.target_version),
      jsonb_build_object('decision', 'keep-inactive', 'reasonCode', 'managed-target-unpublished')
    );
  end loop;
  if v_state.target_status = 'draft' and v_state.published_at is null then return true; end if;
  if v_state.target_status <> 'published' then raise exception 'TARGET_STATUS_CONFLICT' using errcode = 'P0001'; end if;
  perform set_config('app.phase10_release_target', p_target_id::text, true);
  case p_target_kind
    when 'activity' then update public.activities set status = 'draft', published_at = null, updated_by = v_actor where id = p_target_id;
    when 'file' then update public.files set status = 'draft', published_at = null, updated_by = v_actor where id = p_target_id;
    when 'year-summary' then update public.year_summaries set status = 'draft', published_at = null, updated_by = v_actor where id = p_target_id;
    else raise exception 'UNSUPPORTED_TARGET_KIND' using errcode = 'P0001';
  end case;
  perform set_config('app.phase10_release_target', '', true);
  select * into v_state from public.phase10_target_state(p_target_kind, p_target_id);
  update public.editorial_targets set target_version = v_state.target_version where id = v_target.id;
  update public.editorial_reviews set target_version = v_state.target_version where editorial_target_id = v_target.id;
  insert into public.editorial_audit_logs (
    actor_user_id, action, editorial_target_id, correlation_id, after_state
  ) values (v_actor, 'target_unpublished', v_target.id, p_correlation_id,
    jsonb_build_object('targetKind', p_target_kind, 'targetId', p_target_id, 'targetVersion', v_state.target_version));
  return true;
end;
$$;

create or replace function public.phase10_get_release_batch(p_batch_key text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_batch public.release_batches;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = 'P0001'; end if;
  if public.is_admin() is not true then raise exception 'ADMIN_REQUIRED' using errcode = 'P0001'; end if;
  select * into v_batch from public.release_batches where batch_key = p_batch_key;
  if not found then raise exception 'BATCH_NOT_FOUND' using errcode = 'P0001'; end if;
  return jsonb_build_object(
    'batch', to_jsonb(v_batch) - 'created_by' - 'safety_checkpoint_id',
    'items', coalesce((select jsonb_agg(to_jsonb(i) order by i.position)
      from public.release_batch_items i where i.release_batch_id = v_batch.id), '[]'::jsonb),
    'redirects', coalesce((select jsonb_agg(to_jsonb(r) order by r.redirect_key)
      from public.release_batch_redirects r where r.release_batch_id = v_batch.id), '[]'::jsonb)
  );
end;
$$;

alter table public.release_safety_checkpoints enable row level security;
alter table public.release_batches enable row level security;
alter table public.release_batch_items enable row level security;
alter table public.release_batch_redirects enable row level security;
revoke all on table public.release_safety_checkpoints from public, anon, authenticated;
revoke all on table public.release_batches from public, anon, authenticated;
revoke all on table public.release_batch_items from public, anon, authenticated;
revoke all on table public.release_batch_redirects from public, anon, authenticated;

revoke all on function public.phase10_register_safety_checkpoint(text, text, text, text, text, text, timestamptz, uuid) from public, anon, authenticated;
revoke all on function public.phase10_target_release_ready(uuid) from public, anon, authenticated;
revoke all on function public.phase10_plan_release_batch(text, text, text[], jsonb, text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.phase10_apply_release_batch(text, uuid, integer, uuid) from public, anon, authenticated;
revoke all on function public.phase10_verify_release_batch(text, uuid) from public, anon, authenticated;
revoke all on function public.phase10_activate_batch_redirect(text, text, uuid) from public, anon, authenticated;
revoke all on function public.phase10_rollback_release_batch(text, uuid, uuid) from public, anon, authenticated;
revoke all on function public.phase10_publish_managed_target(text, uuid, uuid) from public, anon, authenticated;
revoke all on function public.phase10_unpublish_managed_target(text, uuid, uuid) from public, anon, authenticated;
revoke all on function public.phase10_get_release_batch(text) from public, anon, authenticated;

grant execute on function public.phase10_register_safety_checkpoint(text, text, text, text, text, text, timestamptz, uuid) to authenticated;
grant execute on function public.phase10_plan_release_batch(text, text, text[], jsonb, text, text, text, uuid) to authenticated;
grant execute on function public.phase10_apply_release_batch(text, uuid, integer, uuid) to authenticated;
grant execute on function public.phase10_verify_release_batch(text, uuid) to authenticated;
grant execute on function public.phase10_activate_batch_redirect(text, text, uuid) to authenticated;
grant execute on function public.phase10_rollback_release_batch(text, uuid, uuid) to authenticated;
grant execute on function public.phase10_publish_managed_target(text, uuid, uuid) to authenticated;
grant execute on function public.phase10_unpublish_managed_target(text, uuid, uuid) to authenticated;
grant execute on function public.phase10_get_release_batch(text) to authenticated;

notify pgrst, 'reload schema';
