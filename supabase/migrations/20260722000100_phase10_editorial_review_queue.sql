-- Phase 10: auditable editorial review, privacy derivatives, and redirect decisions.
-- All tables are private. Authenticated active administrators use the narrow RPCs below.

create table public.editorial_bootstrap_runs (
  id uuid primary key default gen_random_uuid(),
  source_snapshot_sha256 text not null unique check (source_snapshot_sha256 ~ '^[0-9a-f]{64}$'),
  manifest_sha256 text not null check (manifest_sha256 ~ '^[0-9a-f]{64}$'),
  review_count integer not null check (review_count = 122),
  target_count integer not null check (target_count = 70),
  redirect_count integer not null check (redirect_count = 83),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.editorial_targets (
  id uuid primary key default gen_random_uuid(),
  source_snapshot_sha256 text not null check (source_snapshot_sha256 ~ '^[0-9a-f]{64}$'),
  source_key text not null unique,
  source_sha256 text not null check (source_sha256 ~ '^[0-9a-f]{64}$'),
  normalized_sha256 text not null check (normalized_sha256 ~ '^[0-9a-f]{64}$'),
  target_kind text not null check (target_kind in ('activity', 'file', 'year-summary')),
  target_id uuid not null,
  target_natural_key text not null,
  original_status text not null check (original_status = 'draft'),
  original_published_at timestamptz,
  decision text not null default 'pending'
    check (decision in ('pending', 'publish', 'keep-draft', 'archive')),
  decision_reason text,
  content_verified boolean not null default false,
  privacy_verified boolean not null default false,
  authorization_verified boolean not null default false,
  target_version text,
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (target_kind, target_id),
  check (
    (decision = 'pending' and decided_at is null)
    or (decision <> 'pending' and decided_at is not null and nullif(btrim(decision_reason), '') is not null)
  )
);

create table public.editorial_redirects (
  id uuid primary key default gen_random_uuid(),
  source_snapshot_sha256 text not null check (source_snapshot_sha256 ~ '^[0-9a-f]{64}$'),
  redirect_key text not null unique check (redirect_key ~ '^R9-[0-9a-f]{24}$'),
  source_key text not null,
  source_url text not null,
  source_path text not null unique check (source_path like '/%'),
  target_path text,
  phase9_status_code integer not null check (phase9_status_code in (0, 301)),
  phase9_disposition text not null check (phase9_disposition in ('structural-candidate', 'draft-target', 'utility-archive')),
  decision text not null default 'pending'
    check (decision in ('pending', 'activate', 'keep-inactive', 'archive')),
  decision_reason text,
  target_version text,
  target_verified boolean not null default false,
  verified_origin text,
  verified_final_url text,
  verified_final_status integer,
  verified_hops integer,
  verified_at timestamptz,
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (phase9_disposition = 'utility-archive' and target_path is null)
    or (phase9_disposition <> 'utility-archive' and target_path like '/%'
      and left(target_path, 2) <> '//' and position('?' in target_path) = 0
      and position('#' in target_path) = 0 and target_path !~ '^/(admin|api|auth)(/|$)')
  ),
  check (
    target_verified = false
    or (verified_origin is not null and verified_final_url is not null
      and verified_final_status = 200 and verified_hops = 1 and verified_at is not null)
  ),
  check (
    decision <> 'activate'
    or (target_verified = true and verified_final_status = 200 and verified_hops = 1)
  )
);

create table public.editorial_reviews (
  id uuid primary key default gen_random_uuid(),
  review_key text not null unique check (review_key ~ '^P9-[0-9]{4}$'),
  source_snapshot_sha256 text not null check (source_snapshot_sha256 ~ '^[0-9a-f]{64}$'),
  source_key text not null,
  source_url text,
  target_kind text not null check (target_kind in ('activity', 'file', 'year-summary', 'redirect')),
  editorial_target_id uuid references public.editorial_targets(id) on delete restrict,
  editorial_redirect_id uuid references public.editorial_redirects(id) on delete restrict,
  severity text not null check (severity in ('high', 'medium', 'low')),
  issue_code text not null,
  description text not null,
  recommended_action text not null,
  phase9_resolution text not null,
  state text not null default 'pending' check (state in ('pending', 'in-review', 'resolved', 'deferred')),
  decision text check (decision in ('publish', 'keep-draft', 'archive', 'activate-redirect', 'keep-inactive')),
  decision_reason text,
  content_verified boolean not null default false,
  privacy_verified boolean not null default false,
  authorization_verified boolean not null default false,
  public_target_verified boolean not null default false,
  target_version text,
  reviewer_id uuid references auth.users(id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (target_kind = 'redirect' and editorial_target_id is null and editorial_redirect_id is not null)
    or (target_kind <> 'redirect' and editorial_target_id is not null and editorial_redirect_id is null)
  ),
  check (
    state not in ('resolved', 'deferred')
    or (decision is not null and nullif(btrim(decision_reason), '') is not null and decided_at is not null)
  )
);

create table public.editorial_redacted_derivatives (
  id uuid primary key default gen_random_uuid(),
  editorial_target_id uuid not null references public.editorial_targets(id) on delete restrict,
  asset_kind text not null check (asset_kind in ('activity-asset', 'file')),
  asset_id uuid not null,
  original_bucket text not null check (original_bucket in ('activity-assets', 'downloads')),
  original_path text not null,
  original_sha256 text not null check (original_sha256 ~ '^[0-9a-f]{64}$'),
  derivative_bucket text not null check (derivative_bucket in ('activity-assets', 'downloads')),
  derivative_path text not null,
  derivative_sha256 text not null check (derivative_sha256 ~ '^[0-9a-f]{64}$'),
  derivative_mime_type text not null,
  derivative_original_name text not null,
  derivative_size_bytes bigint not null check (derivative_size_bytes > 0 and derivative_size_bytes <= 20971520),
  redaction_method text not null,
  inspection_summary jsonb not null,
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_by uuid not null references auth.users(id),
  revoked_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  check (original_path <> derivative_path),
  check (original_sha256 <> derivative_sha256),
  check (original_bucket = derivative_bucket)
);

create unique index editorial_redacted_derivatives_one_active
  on public.editorial_redacted_derivatives(asset_kind, asset_id)
  where status = 'active';

create table public.editorial_audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid not null references auth.users(id),
  action text not null check (action in (
    'bootstrap_completed', 'review_updated', 'redirect_verified', 'redirect_decided', 'derivative_registered',
    'release_planned', 'release_applied', 'release_verified', 'release_rolled_back',
    'target_published', 'target_unpublished'
  )),
  review_id uuid references public.editorial_reviews(id) on delete restrict,
  editorial_target_id uuid references public.editorial_targets(id) on delete restrict,
  editorial_redirect_id uuid references public.editorial_redirects(id) on delete restrict,
  release_batch_id uuid,
  correlation_id uuid not null,
  before_state jsonb not null default '{}'::jsonb,
  after_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.activity_assets
  add column privacy_state text not null default 'unknown'
    check (privacy_state in ('unknown', 'cleared', 'redaction-required', 'redacted')),
  add column original_sha256 text check (original_sha256 is null or original_sha256 ~ '^[0-9a-f]{64}$'),
  add column public_storage_path text,
  add column public_mime_type text,
  add column public_original_name text,
  add column public_size_bytes bigint check (public_size_bytes is null or public_size_bytes > 0),
  add column public_sha256 text check (public_sha256 is null or public_sha256 ~ '^[0-9a-f]{64}$');

alter table public.files
  add column privacy_state text not null default 'unknown'
    check (privacy_state in ('unknown', 'cleared', 'redaction-required', 'redacted')),
  add column original_sha256 text check (original_sha256 is null or original_sha256 ~ '^[0-9a-f]{64}$'),
  add column public_storage_path text,
  add column public_mime_type text,
  add column public_original_name text,
  add column public_size_bytes bigint check (public_size_bytes is null or public_size_bytes > 0),
  add column public_sha256 text check (public_sha256 is null or public_sha256 ~ '^[0-9a-f]{64}$');

create or replace function public.set_phase10_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_editorial_targets_updated_at before update on public.editorial_targets
for each row execute function public.set_phase10_updated_at();
create trigger set_editorial_redirects_updated_at before update on public.editorial_redirects
for each row execute function public.set_phase10_updated_at();
create trigger set_editorial_reviews_updated_at before update on public.editorial_reviews
for each row execute function public.set_phase10_updated_at();

create or replace function public.prevent_editorial_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'AUDIT_APPEND_ONLY' using errcode = 'P0001';
end;
$$;

create trigger prevent_editorial_audit_update
before update or delete on public.editorial_audit_logs
for each row execute function public.prevent_editorial_audit_mutation();

create or replace function public.phase10_target_state(p_target_kind text, p_target_id uuid)
returns table (target_status text, published_at timestamptz, target_version text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  case p_target_kind
    when 'activity' then
      return query select a.status, a.published_at,
        to_char(a.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
          || '|assets:' || (select count(*)::text from public.activity_assets x where x.activity_id = a.id)
          || ':' || coalesce((select to_char(max(x.updated_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') from public.activity_assets x where x.activity_id = a.id), 'none')
          || '|videos:' || (select count(*)::text from public.activity_videos v where v.activity_id = a.id)
          || ':' || coalesce((select to_char(max(v.updated_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') from public.activity_videos v where v.activity_id = a.id), 'none')
        from public.activities a where a.id = p_target_id;
    when 'file' then
      return query select f.status, f.published_at, to_char(f.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') from public.files f where f.id = p_target_id;
    when 'year-summary' then
      return query select y.status, y.published_at,
        to_char(y.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
          || '|report:' || coalesce(y.report_file_id::text, 'none')
          || ':' || coalesce(f.status, 'none')
          || ':' || coalesce(to_char(f.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'), 'none')
        from public.year_summaries y left join public.files f on f.id = y.report_file_id
        where y.id = p_target_id;
    else
      raise exception 'UNSUPPORTED_TARGET_KIND' using errcode = 'P0001';
  end case;
end;
$$;

create or replace function public.protect_phase10_managed_target()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kind text;
  v_managed boolean;
begin
  v_kind := case tg_table_name
    when 'activities' then 'activity'
    when 'files' then 'file'
    when 'year_summaries' then 'year-summary'
    else null end;
  if v_kind is null then raise exception 'UNSUPPORTED_TARGET_KIND' using errcode = 'P0001'; end if;
  select exists (
    select 1 from public.editorial_targets t
    where t.target_kind = v_kind and t.target_id = old.id
  ) into v_managed;
  if not v_managed then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  if tg_op = 'DELETE' then
    raise exception 'MANAGED_TARGET_DELETE_FORBIDDEN' using errcode = 'P0001';
  end if;
  if old.status = 'published' and (
    (to_jsonb(new) - 'status' - 'published_at' - 'updated_at' - 'updated_by')
      is distinct from
    (to_jsonb(old) - 'status' - 'published_at' - 'updated_at' - 'updated_by')
  ) then raise exception 'MANAGED_TARGET_MUST_BE_UNPUBLISHED' using errcode = 'P0001'; end if;
  if (old.status is distinct from new.status or old.published_at is distinct from new.published_at)
    and current_setting('app.phase10_release_target', true) is distinct from old.id::text then
    raise exception 'MANAGED_TARGET_RELEASE_REQUIRED' using errcode = 'P0001';
  end if;
  if v_kind = 'file' and (
    to_jsonb(old)->>'storage_path' is distinct from to_jsonb(new)->>'storage_path'
    or to_jsonb(old)->>'original_filename' is distinct from to_jsonb(new)->>'original_filename'
    or to_jsonb(old)->>'mime_type' is distinct from to_jsonb(new)->>'mime_type'
    or to_jsonb(old)->>'size_bytes' is distinct from to_jsonb(new)->>'size_bytes'
    or ((to_jsonb(old)->>'original_sha256') is not null
      and to_jsonb(old)->>'original_sha256' is distinct from to_jsonb(new)->>'original_sha256')
  ) then raise exception 'ORIGINAL_ASSET_IMMUTABLE' using errcode = 'P0001'; end if;
  return new;
end;
$$;

create trigger protect_phase10_managed_activity
before update or delete on public.activities
for each row execute function public.protect_phase10_managed_target();
create trigger protect_phase10_managed_file
before update or delete on public.files
for each row execute function public.protect_phase10_managed_target();
create trigger protect_phase10_managed_year_summary
before update or delete on public.year_summaries
for each row execute function public.protect_phase10_managed_target();

create or replace function public.protect_phase10_managed_activity_child()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_activity_id uuid := case when tg_op = 'DELETE' then old.activity_id else new.activity_id end;
  v_target public.editorial_targets;
  v_activity_status text;
begin
  select * into v_target from public.editorial_targets t
  where t.target_kind = 'activity' and t.target_id = v_activity_id;
  if v_target.id is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  select status into v_activity_status from public.activities where id = v_activity_id;
  if v_activity_status = 'published' then
    raise exception 'MANAGED_TARGET_MUST_BE_UNPUBLISHED' using errcode = 'P0001';
  end if;
  if tg_table_name = 'activity_assets' then
    if tg_op = 'DELETE' and old.created_at <= v_target.created_at then
      raise exception 'ORIGINAL_ASSET_IMMUTABLE' using errcode = 'P0001';
    end if;
    if tg_op = 'UPDATE' and (
      old.activity_id is distinct from new.activity_id
      or old.storage_bucket is distinct from new.storage_bucket
      or old.storage_path is distinct from new.storage_path
      or old.original_name is distinct from new.original_name
      or old.mime_type is distinct from new.mime_type
      or old.size_bytes is distinct from new.size_bytes
      or (old.original_sha256 is not null and old.original_sha256 is distinct from new.original_sha256)
    ) then raise exception 'ORIGINAL_ASSET_IMMUTABLE' using errcode = 'P0001'; end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger protect_phase10_managed_activity_asset
before insert or update or delete on public.activity_assets
for each row execute function public.protect_phase10_managed_activity_child();
create trigger protect_phase10_managed_activity_video
before insert or update or delete on public.activity_videos
for each row execute function public.protect_phase10_managed_activity_child();

create or replace function public.phase10_assert_target_delete_allowed(p_target_kind text, p_target_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = 'P0001'; end if;
  if public.is_admin() is not true then raise exception 'ADMIN_REQUIRED' using errcode = 'P0001'; end if;
  if p_target_kind not in ('activity', 'file', 'year-summary') or p_target_id is null then
    raise exception 'VALIDATION_ERROR' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.editorial_targets where target_kind = p_target_kind and target_id = p_target_id) then
    raise exception 'MANAGED_TARGET_DELETE_FORBIDDEN' using errcode = 'P0001';
  end if;
  return true;
end;
$$;

create or replace function public.phase10_assert_activity_asset_delete_allowed(p_asset_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = 'P0001'; end if;
  if public.is_admin() is not true then raise exception 'ADMIN_REQUIRED' using errcode = 'P0001'; end if;
  if exists (
    select 1 from public.activity_assets a
    join public.editorial_targets t on t.target_kind = 'activity' and t.target_id = a.activity_id
    where a.id = p_asset_id and (a.created_at <= t.created_at
      or exists (select 1 from public.activities x where x.id = a.activity_id and x.status = 'published'))
  ) then raise exception 'ORIGINAL_ASSET_IMMUTABLE' using errcode = 'P0001'; end if;
  return true;
end;
$$;

create or replace function public.phase10_bootstrap_editorial(
  p_source_snapshot_sha256 text,
  p_manifest_sha256 text,
  p_targets jsonb,
  p_redirects jsonb,
  p_reviews jsonb,
  p_correlation_id uuid
)
returns table (bootstrap_id uuid, target_count bigint, redirect_count bigint, review_count bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_bootstrap public.editorial_bootstrap_runs;
  v_item jsonb;
  v_asset jsonb;
  v_target public.editorial_targets;
  v_redirect public.editorial_redirects;
  v_review public.editorial_reviews;
  v_state record;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode = 'P0001'; end if;
  if public.is_admin() is not true then raise exception 'ADMIN_REQUIRED' using errcode = 'P0001'; end if;
  if p_source_snapshot_sha256 <> '3a6a00bcd5a5b8030ab5da6b61cd597f2df4c0762edb46dd9f8655e003cceb60'
    or p_manifest_sha256 !~ '^[0-9a-f]{64}$' or p_correlation_id is null then
    raise exception 'BASELINE_MISMATCH' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_targets) <> 'array' or jsonb_array_length(p_targets) <> 70
    or jsonb_typeof(p_redirects) <> 'array' or jsonb_array_length(p_redirects) <> 83
    or jsonb_typeof(p_reviews) <> 'array' or jsonb_array_length(p_reviews) <> 122 then
    raise exception 'RECONCILIATION_MISMATCH' using errcode = 'P0001';
  end if;
  if (select count(distinct item->>'sourceKey') from jsonb_array_elements(p_targets) item) <> 70
    or (select count(distinct item->>'redirectKey') from jsonb_array_elements(p_redirects) item) <> 83
    or (select count(distinct item->>'sourcePath') from jsonb_array_elements(p_redirects) item) <> 83
    or (select count(*) from jsonb_array_elements(p_targets) item where item->>'targetKind' = 'activity') <> 46
    or (select count(*) from jsonb_array_elements(p_targets) item where item->>'targetKind' = 'file') <> 18
    or (select count(*) from jsonb_array_elements(p_targets) item where item->>'targetKind' = 'year-summary') <> 6
    or (select count(distinct item->>'reviewKey') from jsonb_array_elements(p_reviews) item) <> 122
    or (select count(*) from jsonb_array_elements(p_reviews) item where item->>'targetKind' = 'redirect') <> 52
    or (select sum(jsonb_array_length(coalesce(item->'assets', '[]'::jsonb))) from jsonb_array_elements(p_targets) item) <> 378
    or exists (
      select 1 from jsonb_array_elements(p_redirects) item where
        (item->>'disposition' = 'utility-archive' and nullif(item->>'targetPath', '') is not null)
        or (item->>'disposition' <> 'utility-archive' and (
          coalesce(item->>'targetPath', '') not like '/%'
          or left(item->>'targetPath', 2) = '//' or position('?' in item->>'targetPath') > 0
          or position('#' in item->>'targetPath') > 0
          or item->>'targetPath' ~ '^/(admin|api|auth)(/|$)'
        ))
    ) then
    raise exception 'RECONCILIATION_MISMATCH' using errcode = 'P0001';
  end if;

  select * into v_bootstrap from public.editorial_bootstrap_runs
    where source_snapshot_sha256 = p_source_snapshot_sha256 for update;
  if found and v_bootstrap.manifest_sha256 <> p_manifest_sha256 then
    raise exception 'BOOTSTRAP_CONFLICT' using errcode = 'P0001';
  end if;

  for v_item in select value from jsonb_array_elements(p_targets) loop
    if not exists (
      select 1 from public.content_source_refs r
      where r.source_system = 'wix' and r.source_key = v_item->>'sourceKey'
        and r.target_kind = v_item->>'targetKind' and r.target_id = (v_item->>'targetId')::uuid
        and r.source_sha256 = v_item->>'sourceSha256'
        and r.normalized_sha256 = v_item->>'normalizedSha256'
    ) then raise exception 'PROVENANCE_MISMATCH' using errcode = 'P0001'; end if;
    select * into v_state from public.phase10_target_state(v_item->>'targetKind', (v_item->>'targetId')::uuid);
    if not found or v_state.target_status <> 'draft' or v_state.published_at is not null then
      raise exception 'TARGET_BASELINE_MISMATCH' using errcode = 'P0001';
    end if;
    insert into public.editorial_targets (
      source_snapshot_sha256, source_key, source_sha256, normalized_sha256,
      target_kind, target_id, target_natural_key, original_status,
      original_published_at, target_version
    ) values (
      p_source_snapshot_sha256, v_item->>'sourceKey', v_item->>'sourceSha256',
      v_item->>'normalizedSha256', v_item->>'targetKind', (v_item->>'targetId')::uuid,
      v_item->>'targetNaturalKey', v_state.target_status, v_state.published_at, v_state.target_version
    ) on conflict (source_key) do nothing;
    select * into v_target from public.editorial_targets where source_key = v_item->>'sourceKey';
    if v_target.source_snapshot_sha256 <> p_source_snapshot_sha256
      or v_target.source_sha256 <> v_item->>'sourceSha256'
      or v_target.normalized_sha256 <> v_item->>'normalizedSha256'
      or v_target.target_kind <> v_item->>'targetKind'
      or v_target.target_id <> (v_item->>'targetId')::uuid
      or v_target.target_natural_key <> v_item->>'targetNaturalKey'
      or v_target.original_status <> 'draft' or v_target.original_published_at is not null then
      raise exception 'BOOTSTRAP_CONFLICT' using errcode = 'P0001';
    end if;
    for v_asset in select value from jsonb_array_elements(coalesce(v_item->'assets', '[]'::jsonb)) loop
      if v_asset->>'sourceSha256' !~ '^[0-9a-f]{64}$' then raise exception 'ASSET_HASH_INVALID' using errcode = 'P0001'; end if;
      if v_target.target_kind = 'activity' then
        update public.activity_assets set original_sha256 = v_asset->>'sourceSha256'
          where id = (v_asset->>'assetId')::uuid and activity_id = v_target.target_id
            and original_sha256 is null;
        if not found and not exists (
          select 1 from public.activity_assets where id = (v_asset->>'assetId')::uuid
            and activity_id = v_target.target_id and original_sha256 = v_asset->>'sourceSha256'
        ) then raise exception 'ASSET_RECONCILIATION_FAILED' using errcode = 'P0001'; end if;
      elsif v_target.target_kind = 'file' then
        update public.files set original_sha256 = v_asset->>'sourceSha256'
          where id = v_target.target_id and id = (v_asset->>'assetId')::uuid
            and original_sha256 is null;
        if not found and not exists (
          select 1 from public.files where id = v_target.target_id
            and id = (v_asset->>'assetId')::uuid and original_sha256 = v_asset->>'sourceSha256'
        ) then raise exception 'ASSET_RECONCILIATION_FAILED' using errcode = 'P0001'; end if;
      else
        raise exception 'UNEXPECTED_TARGET_ASSET' using errcode = 'P0001';
      end if;
    end loop;
    select * into v_state from public.phase10_target_state(v_target.target_kind, v_target.target_id);
    update public.editorial_targets set target_version = v_state.target_version
      where id = v_target.id and target_version is distinct from v_state.target_version;
    select * into v_target from public.editorial_targets where source_key = v_item->>'sourceKey';
  end loop;

  for v_item in select value from jsonb_array_elements(p_redirects) loop
    insert into public.editorial_redirects (
      source_snapshot_sha256, redirect_key, source_key, source_url, source_path, target_path,
      phase9_status_code, phase9_disposition, target_version
    ) values (
      p_source_snapshot_sha256, v_item->>'redirectKey', v_item->>'sourceKey', v_item->>'sourceUrl',
      v_item->>'sourcePath', nullif(v_item->>'targetPath', ''), (v_item->>'statusCode')::integer,
      v_item->>'disposition', v_item->>'targetVersion'
    ) on conflict (redirect_key) do nothing;
    select * into v_redirect from public.editorial_redirects where redirect_key = v_item->>'redirectKey';
    if v_redirect.source_snapshot_sha256 <> p_source_snapshot_sha256
      or v_redirect.source_key <> v_item->>'sourceKey' or v_redirect.source_url <> v_item->>'sourceUrl'
      or v_redirect.source_path <> v_item->>'sourcePath'
      or v_redirect.target_path is distinct from nullif(v_item->>'targetPath', '')
      or v_redirect.phase9_status_code <> (v_item->>'statusCode')::integer
      or v_redirect.phase9_disposition <> v_item->>'disposition' then
      raise exception 'BOOTSTRAP_CONFLICT' using errcode = 'P0001';
    end if;
  end loop;

  for v_item in select value from jsonb_array_elements(p_reviews) loop
    v_target := null;
    v_redirect := null;
    if v_item->>'targetKind' = 'redirect' then
      select * into v_redirect from public.editorial_redirects where redirect_key = v_item->>'redirectKey';
      if not found then raise exception 'REDIRECT_NOT_FOUND' using errcode = 'P0001'; end if;
    else
      select * into v_target from public.editorial_targets where source_key = v_item->>'sourceKey';
      if not found then raise exception 'TARGET_NOT_FOUND' using errcode = 'P0001'; end if;
    end if;
    insert into public.editorial_reviews (
      review_key, source_snapshot_sha256, source_key, source_url, target_kind,
      editorial_target_id, editorial_redirect_id, severity, issue_code, description,
      recommended_action, phase9_resolution
    ) values (
      v_item->>'reviewKey', p_source_snapshot_sha256, v_item->>'sourceKey', nullif(v_item->>'sourceUrl', ''),
      v_item->>'targetKind', v_target.id, v_redirect.id, v_item->>'severity', v_item->>'issueCode',
      v_item->>'description', v_item->>'recommendedAction', v_item->>'phase9Resolution'
    ) on conflict (review_key) do nothing;
    select * into v_review from public.editorial_reviews where review_key = v_item->>'reviewKey';
    if v_review.source_snapshot_sha256 <> p_source_snapshot_sha256
      or v_review.source_key <> v_item->>'sourceKey'
      or v_review.source_url is distinct from nullif(v_item->>'sourceUrl', '')
      or v_review.target_kind <> v_item->>'targetKind'
      or v_review.editorial_target_id is distinct from v_target.id
      or v_review.editorial_redirect_id is distinct from v_redirect.id
      or v_review.severity <> v_item->>'severity' or v_review.issue_code <> v_item->>'issueCode'
      or v_review.description <> v_item->>'description'
      or v_review.recommended_action <> v_item->>'recommendedAction'
      or v_review.phase9_resolution <> v_item->>'phase9Resolution' then
      raise exception 'BOOTSTRAP_CONFLICT' using errcode = 'P0001';
    end if;

    if v_item->>'severity' = 'high' and v_target.target_kind = 'activity' then
      update public.activity_assets set privacy_state = 'redaction-required'
        where activity_id = v_target.target_id and kind = 'attachment' and privacy_state = 'unknown';
    elsif v_item->>'severity' = 'high' and v_target.target_kind = 'file' then
      update public.files set privacy_state = 'redaction-required'
        where id = v_target.target_id and privacy_state = 'unknown';
    end if;
  end loop;

  if (select count(*) from public.editorial_targets where source_snapshot_sha256 = p_source_snapshot_sha256) <> 70
    or (select count(*) from public.editorial_redirects where source_snapshot_sha256 = p_source_snapshot_sha256) <> 83
    or (select count(*) from public.editorial_reviews where source_snapshot_sha256 = p_source_snapshot_sha256) <> 122 then
    raise exception 'BOOTSTRAP_RECONCILIATION_FAILED' using errcode = 'P0001';
  end if;

  if v_bootstrap.id is null then
    insert into public.editorial_bootstrap_runs (
      source_snapshot_sha256, manifest_sha256, review_count, target_count, redirect_count, created_by
    ) values (p_source_snapshot_sha256, p_manifest_sha256, 122, 70, 83, v_actor)
    returning * into v_bootstrap;
    insert into public.editorial_audit_logs (
      actor_user_id, action, correlation_id, after_state
    ) values (
      v_actor, 'bootstrap_completed', p_correlation_id,
      jsonb_build_object('snapshotSha256', p_source_snapshot_sha256, 'targets', 70, 'redirects', 83, 'reviews', 122)
    );
  end if;

  return query select v_bootstrap.id,
    (select count(*) from public.editorial_targets where source_snapshot_sha256 = p_source_snapshot_sha256),
    (select count(*) from public.editorial_redirects where source_snapshot_sha256 = p_source_snapshot_sha256),
    (select count(*) from public.editorial_reviews where source_snapshot_sha256 = p_source_snapshot_sha256);
end;
$$;

create or replace function public.phase10_list_editorial_reviews(
  p_state text default 'all',
  p_severity text default 'all',
  p_target_kind text default 'all',
  p_query text default '',
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  review_key text, severity text, target_kind text, source_key text, issue_code text,
  state text, decision text, decision_reason text, target_id uuid, target_title text,
  target_status text, privacy_state text, updated_at timestamptz, total_count bigint
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = 'P0001'; end if;
  if public.is_admin() is not true then raise exception 'ADMIN_REQUIRED' using errcode = 'P0001'; end if;
  if coalesce(p_state, 'all') not in ('all', 'pending', 'in-review', 'resolved', 'deferred')
    or coalesce(p_severity, 'all') not in ('all', 'high', 'medium', 'low')
    or coalesce(p_target_kind, 'all') not in ('all', 'activity', 'file', 'year-summary', 'redirect')
    or p_limit < 1 or p_limit > 100 or p_offset < 0 or length(coalesce(p_query, '')) > 200 then
    raise exception 'VALIDATION_ERROR' using errcode = 'P0001';
  end if;
  return query
  with rows as (
    select r.*,
      t.target_id,
      coalesce(a.title, f.title, y.title, d.target_path, d.source_path) as resolved_title,
      coalesce(a.status, f.status, y.status, case when d.decision = 'activate' then 'active' else 'inactive' end) as resolved_status,
      case
        when f.id is not null then f.privacy_state
        when t.target_kind = 'activity' then case
          when exists (select 1 from public.activity_assets aa where aa.activity_id = t.target_id and aa.privacy_state = 'redaction-required') then 'redaction-required'
          when exists (select 1 from public.activity_assets aa where aa.activity_id = t.target_id and aa.privacy_state = 'unknown') then 'unknown'
          when exists (select 1 from public.activity_assets aa where aa.activity_id = t.target_id and aa.privacy_state = 'redacted') then 'redacted'
          else 'cleared' end
        when r.target_kind = 'redirect' then 'not-applicable'
        when t.target_kind = 'year-summary' then 'cleared'
        else 'unknown'
      end as resolved_privacy
    from public.editorial_reviews r
    left join public.editorial_targets t on t.id = r.editorial_target_id
    left join public.editorial_redirects d on d.id = r.editorial_redirect_id
    left join public.activities a on t.target_kind = 'activity' and a.id = t.target_id
    left join public.files f on t.target_kind = 'file' and f.id = t.target_id
    left join public.year_summaries y on t.target_kind = 'year-summary' and y.id = t.target_id
    where (coalesce(p_state, 'all') = 'all' or r.state = p_state)
      and (coalesce(p_severity, 'all') = 'all' or r.severity = p_severity)
      and (coalesce(p_target_kind, 'all') = 'all' or r.target_kind = p_target_kind)
      and (coalesce(p_query, '') = '' or r.review_key ilike '%' || p_query || '%'
        or r.source_key ilike '%' || p_query || '%' or r.issue_code ilike '%' || p_query || '%'
        or coalesce(a.title, f.title, y.title, d.target_path, d.source_path, '') ilike '%' || p_query || '%')
  )
  select x.review_key, x.severity, x.target_kind, x.source_key, x.issue_code,
    x.state, x.decision, x.decision_reason, x.target_id, x.resolved_title,
    x.resolved_status, x.resolved_privacy, x.updated_at, count(*) over()
  from rows x
  order by case x.severity when 'high' then 0 when 'medium' then 1 else 2 end, x.review_key
  limit p_limit offset p_offset;
end;
$$;

create or replace function public.phase10_get_editorial_review(p_review_key text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_review public.editorial_reviews;
  v_target public.editorial_targets;
  v_redirect public.editorial_redirects;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = 'P0001'; end if;
  if public.is_admin() is not true then raise exception 'ADMIN_REQUIRED' using errcode = 'P0001'; end if;
  select * into v_review from public.editorial_reviews where review_key = p_review_key;
  if not found then raise exception 'REVIEW_NOT_FOUND' using errcode = 'P0001'; end if;
  if v_review.editorial_target_id is not null then select * into v_target from public.editorial_targets where id = v_review.editorial_target_id; end if;
  if v_review.editorial_redirect_id is not null then select * into v_redirect from public.editorial_redirects where id = v_review.editorial_redirect_id; end if;
  return jsonb_build_object(
    'review', to_jsonb(v_review) - 'reviewer_id',
    'target', case when v_target.id is null then null else to_jsonb(v_target) - 'decided_by' end,
    'redirect', case when v_redirect.id is null then null else to_jsonb(v_redirect) - 'decided_by' end,
    'derivatives', coalesce((select jsonb_agg(to_jsonb(d) - 'created_by' - 'revoked_by' order by d.created_at desc)
      from public.editorial_redacted_derivatives d where d.editorial_target_id = v_target.id), '[]'::jsonb),
    'assets', case
      when v_target.target_kind = 'activity' then coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', a.id, 'assetKind', 'activity-asset', 'kind', a.kind,
          'originalName', a.original_name, 'mimeType', a.mime_type, 'sizeBytes', a.size_bytes,
          'privacyState', a.privacy_state, 'hasDerivative', a.public_storage_path is not null
        ) order by a.sort_order, a.id)
        from public.activity_assets a where a.activity_id = v_target.target_id
      ), '[]'::jsonb)
      when v_target.target_kind = 'file' then coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', f.id, 'assetKind', 'file', 'kind', 'download',
          'originalName', f.original_filename, 'mimeType', f.mime_type, 'sizeBytes', f.size_bytes,
          'privacyState', f.privacy_state, 'hasDerivative', f.public_storage_path is not null
        )) from public.files f where f.id = v_target.target_id
      ), '[]'::jsonb)
      else '[]'::jsonb end,
    'audit', coalesce((select jsonb_agg(to_jsonb(l) - 'actor_user_id' order by l.created_at desc)
      from (select * from public.editorial_audit_logs where review_id = v_review.id order by created_at desc limit 50) l), '[]'::jsonb)
  );
end;
$$;

create or replace function public.phase10_update_editorial_review(
  p_review_key text,
  p_state text,
  p_decision text,
  p_decision_reason text,
  p_content_verified boolean,
  p_privacy_verified boolean,
  p_authorization_verified boolean,
  p_public_target_verified boolean,
  p_target_version text,
  p_correlation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_review public.editorial_reviews;
  v_before jsonb;
  v_target public.editorial_targets;
  v_redirect public.editorial_redirects;
  v_state record;
  v_unredacted bigint := 0;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode = 'P0001'; end if;
  if public.is_admin() is not true then raise exception 'ADMIN_REQUIRED' using errcode = 'P0001'; end if;
  if p_correlation_id is null or p_state not in ('pending', 'in-review', 'resolved', 'deferred') then
    raise exception 'VALIDATION_ERROR' using errcode = 'P0001';
  end if;
  select * into v_review from public.editorial_reviews where review_key = p_review_key for update;
  if not found then raise exception 'REVIEW_NOT_FOUND' using errcode = 'P0001'; end if;
  v_before := to_jsonb(v_review) - 'reviewer_id';
  if p_state in ('resolved', 'deferred') and (p_decision is null or nullif(btrim(coalesce(p_decision_reason, '')), '') is null) then
    raise exception 'DECISION_EVIDENCE_REQUIRED' using errcode = 'P0001';
  end if;

  if v_review.editorial_target_id is not null then
    select * into v_target from public.editorial_targets where id = v_review.editorial_target_id for update;
    select * into v_state from public.phase10_target_state(v_target.target_kind, v_target.target_id);
    if p_target_version is distinct from v_state.target_version then raise exception 'TARGET_VERSION_CONFLICT' using errcode = 'P0001'; end if;
    if p_decision not in ('publish', 'keep-draft', 'archive') then raise exception 'INVALID_DECISION' using errcode = 'P0001'; end if;
    if p_decision = 'publish' and p_state <> 'resolved' then raise exception 'INVALID_DECISION' using errcode = 'P0001'; end if;
    if v_review.state = p_state
      and v_review.decision is not distinct from (case when p_state in ('resolved', 'deferred') then p_decision else null end)
      and v_review.decision_reason is not distinct from (case when p_state in ('resolved', 'deferred') then btrim(p_decision_reason) else null end)
      and v_review.content_verified = coalesce(p_content_verified, false)
      and v_review.privacy_verified = coalesce(p_privacy_verified, false)
      and v_review.authorization_verified = coalesce(p_authorization_verified, false)
      and v_review.public_target_verified = coalesce(p_public_target_verified, false)
      and v_review.target_version = v_state.target_version
      and v_target.decision = (case when p_state in ('resolved', 'deferred') then p_decision else 'pending' end)
      and v_target.decision_reason is not distinct from (case when p_state in ('resolved', 'deferred') then btrim(p_decision_reason) else null end)
      and v_target.content_verified = coalesce(p_content_verified, false)
      and v_target.privacy_verified = coalesce(p_privacy_verified, false)
      and v_target.authorization_verified = coalesce(p_authorization_verified, false)
      and v_target.target_version = v_state.target_version
      and (coalesce(p_decision, '') <> 'publish' or not exists (
        select 1 from public.activity_assets a where v_target.target_kind = 'activity'
          and a.activity_id = v_target.target_id and a.privacy_state in ('unknown', 'redaction-required')
        union all
        select 1 from public.files f where v_target.target_kind = 'file'
          and f.id = v_target.target_id and f.privacy_state in ('unknown', 'redaction-required')
      )) then return public.phase10_get_editorial_review(v_review.review_key); end if;
    if p_state = 'resolved' and p_decision = 'publish' then
      if not coalesce(p_content_verified, false) or not coalesce(p_privacy_verified, false)
        or not coalesce(p_authorization_verified, false) then
        raise exception 'PUBLISH_CHECKLIST_INCOMPLETE' using errcode = 'P0001';
      end if;
      if v_target.target_kind = 'activity' then
        select count(*) into v_unredacted from public.activity_assets a
          where a.activity_id = v_target.target_id and a.privacy_state = 'redaction-required';
      elsif v_target.target_kind = 'file' then
        select count(*) into v_unredacted from public.files f
          where f.id = v_target.target_id and f.privacy_state = 'redaction-required';
      end if;
      if v_unredacted > 0 then raise exception 'REDACTION_REQUIRED' using errcode = 'P0001'; end if;
      if v_target.target_kind = 'activity' then
        update public.activity_assets set privacy_state = 'cleared',
          public_original_name = coalesce(public_original_name, original_name),
          public_mime_type = coalesce(public_mime_type, mime_type),
          public_size_bytes = coalesce(public_size_bytes, size_bytes)
          where activity_id = v_target.target_id and privacy_state = 'unknown';
      elsif v_target.target_kind = 'file' then
        update public.files set privacy_state = 'cleared',
          public_original_name = coalesce(public_original_name, original_filename),
          public_mime_type = coalesce(public_mime_type, mime_type),
          public_size_bytes = coalesce(public_size_bytes, size_bytes)
          where id = v_target.target_id and privacy_state = 'unknown';
      end if;
    end if;
    select * into v_state from public.phase10_target_state(v_target.target_kind, v_target.target_id);
    update public.editorial_targets set
      decision = case when p_state in ('resolved', 'deferred') then p_decision else 'pending' end,
      decision_reason = case when p_state in ('resolved', 'deferred') then btrim(p_decision_reason) else null end,
      content_verified = coalesce(p_content_verified, false),
      privacy_verified = coalesce(p_privacy_verified, false),
      authorization_verified = coalesce(p_authorization_verified, false),
      target_version = v_state.target_version,
      decided_by = case when p_state in ('resolved', 'deferred') then v_actor else null end,
      decided_at = case when p_state in ('resolved', 'deferred') then now() else null end
      where id = v_target.id returning * into v_target;
  else
    select * into v_redirect from public.editorial_redirects where id = v_review.editorial_redirect_id for update;
    if p_target_version is distinct from v_redirect.target_version then
      raise exception 'TARGET_VERSION_CONFLICT' using errcode = 'P0001';
    end if;
    if p_decision not in ('activate-redirect', 'keep-inactive', 'archive') then raise exception 'INVALID_DECISION' using errcode = 'P0001'; end if;
    if p_decision = 'activate-redirect' and (p_state <> 'resolved' or not coalesce(p_public_target_verified, false)
      or not v_redirect.target_verified or v_redirect.verified_final_status <> 200 or v_redirect.verified_hops <> 1) then
      raise exception 'PUBLIC_TARGET_EVIDENCE_REQUIRED' using errcode = 'P0001';
    end if;
    if v_review.state = p_state
      and v_review.decision is not distinct from (case when p_state in ('resolved', 'deferred') then p_decision else null end)
      and v_review.decision_reason is not distinct from (case when p_state in ('resolved', 'deferred') then btrim(p_decision_reason) else null end)
      and v_review.content_verified = coalesce(p_content_verified, false)
      and v_review.privacy_verified = coalesce(p_privacy_verified, false)
      and v_review.authorization_verified = coalesce(p_authorization_verified, false)
      and v_review.public_target_verified = coalesce(p_public_target_verified, false)
      and v_review.target_version is not distinct from p_target_version
      and v_redirect.decision = (case when p_state not in ('resolved', 'deferred') then 'pending'
        when p_decision = 'activate-redirect' then 'activate'
        when p_decision = 'keep-inactive' then 'keep-inactive' else 'archive' end)
      and v_redirect.decision_reason is not distinct from (case when p_state in ('resolved', 'deferred') then btrim(p_decision_reason) else null end)
      then return public.phase10_get_editorial_review(v_review.review_key); end if;
    update public.editorial_redirects set
      decision = case when p_state not in ('resolved', 'deferred') then 'pending'
        when p_decision = 'activate-redirect' then 'activate'
        when p_decision = 'keep-inactive' then 'keep-inactive' else 'archive' end,
      decision_reason = case when p_state in ('resolved', 'deferred') then btrim(p_decision_reason) else null end,
      decided_by = case when p_state in ('resolved', 'deferred') then v_actor else null end,
      decided_at = case when p_state in ('resolved', 'deferred') then now() else null end
      where id = v_redirect.id returning * into v_redirect;
  end if;

  update public.editorial_reviews set
    state = p_state,
    decision = case when p_state in ('resolved', 'deferred') then p_decision else null end,
    decision_reason = case when p_state in ('resolved', 'deferred') then btrim(p_decision_reason) else null end,
    content_verified = coalesce(p_content_verified, false), privacy_verified = coalesce(p_privacy_verified, false),
    authorization_verified = coalesce(p_authorization_verified, false),
    public_target_verified = coalesce(p_public_target_verified, false),
    target_version = case when v_review.editorial_target_id is not null
      then (select target_version from public.editorial_targets where id = v_review.editorial_target_id)
      else p_target_version end,
    reviewer_id = v_actor, decided_at = case when p_state in ('resolved', 'deferred') then now() else null end
    where id = v_review.id returning * into v_review;

  insert into public.editorial_audit_logs (
    actor_user_id, action, review_id, editorial_target_id, editorial_redirect_id,
    correlation_id, before_state, after_state
  ) values (
    v_actor, 'review_updated', v_review.id, v_review.editorial_target_id, v_review.editorial_redirect_id,
    p_correlation_id, v_before, to_jsonb(v_review) - 'reviewer_id'
  );
  return public.phase10_get_editorial_review(v_review.review_key);
end;
$$;

create or replace function public.phase10_record_redirect_verification(
  p_redirect_key text,
  p_verified_origin text,
  p_final_url text,
  p_final_status integer,
  p_hops integer,
  p_target_version text,
  p_correlation_id uuid
)
returns public.editorial_redirects
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_redirect public.editorial_redirects;
  v_target public.editorial_targets;
  v_state record;
  v_before jsonb;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode = 'P0001'; end if;
  if public.is_admin() is not true then raise exception 'ADMIN_REQUIRED' using errcode = 'P0001'; end if;
  if p_correlation_id is null or p_verified_origin !~ '^https://[^/?#@[:space:]]+$' or p_final_url !~ '^https://'
    or p_final_status <> 200 or p_hops <> 1 or nullif(btrim(coalesce(p_target_version, '')), '') is null then
    raise exception 'INVALID_HTTP_EVIDENCE' using errcode = 'P0001';
  end if;
  select * into v_redirect from public.editorial_redirects where redirect_key = p_redirect_key for update;
  if not found or v_redirect.target_path is null then raise exception 'REDIRECT_NOT_FOUND' using errcode = 'P0001'; end if;
  if left(v_redirect.target_path, 2) = '//' or position('?' in v_redirect.target_path) > 0
    or position('#' in v_redirect.target_path) > 0 or v_redirect.target_path ~ '^/(admin|api|auth)(/|$)' then
    raise exception 'INVALID_HTTP_EVIDENCE' using errcode = 'P0001';
  end if;
  if p_final_url <> (p_verified_origin || v_redirect.target_path) then
    raise exception 'INVALID_HTTP_EVIDENCE' using errcode = 'P0001';
  end if;
  if v_redirect.phase9_disposition = 'draft-target' then
    select * into v_target from public.editorial_targets where source_key = v_redirect.source_key;
    if not found then raise exception 'TARGET_NOT_FOUND' using errcode = 'P0001'; end if;
    select * into v_state from public.phase10_target_state(v_target.target_kind, v_target.target_id);
    if v_state.target_status <> 'published' or v_state.target_version is distinct from p_target_version then
      raise exception 'PUBLIC_TARGET_EVIDENCE_REQUIRED' using errcode = 'P0001';
    end if;
  end if;
  if v_redirect.target_verified and v_redirect.verified_origin = p_verified_origin
    and v_redirect.verified_final_url = p_final_url and v_redirect.verified_final_status = p_final_status
    and v_redirect.verified_hops = p_hops and v_redirect.target_version = p_target_version then
    return v_redirect;
  end if;
  v_before := to_jsonb(v_redirect) - 'decided_by';
  update public.editorial_redirects set target_verified = true, verified_origin = p_verified_origin,
    verified_final_url = p_final_url, verified_final_status = p_final_status,
    verified_hops = p_hops, verified_at = now(), target_version = p_target_version
    where id = v_redirect.id returning * into v_redirect;
  insert into public.editorial_audit_logs (
    actor_user_id, action, editorial_redirect_id, correlation_id, before_state, after_state
  ) values (v_actor, 'redirect_verified', v_redirect.id, p_correlation_id, v_before, to_jsonb(v_redirect) - 'decided_by');
  return v_redirect;
end;
$$;

create or replace function public.phase10_decide_redirect(
  p_redirect_key text,
  p_decision text,
  p_decision_reason text,
  p_correlation_id uuid
)
returns public.editorial_redirects
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_redirect public.editorial_redirects;
  v_target public.editorial_targets;
  v_state record;
  v_before jsonb;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode = 'P0001'; end if;
  if public.is_admin() is not true then raise exception 'ADMIN_REQUIRED' using errcode = 'P0001'; end if;
  if p_correlation_id is null or p_decision not in ('pending', 'activate', 'keep-inactive', 'archive')
    or (p_decision <> 'pending' and nullif(btrim(coalesce(p_decision_reason, '')), '') is null) then
    raise exception 'VALIDATION_ERROR' using errcode = 'P0001';
  end if;
  select * into v_redirect from public.editorial_redirects where redirect_key = p_redirect_key for update;
  if not found then raise exception 'REDIRECT_NOT_FOUND' using errcode = 'P0001'; end if;
  if p_decision = 'activate' and (v_redirect.target_path is null or not v_redirect.target_verified
    or v_redirect.verified_final_status <> 200 or v_redirect.verified_hops <> 1) then
    raise exception 'PUBLIC_TARGET_EVIDENCE_REQUIRED' using errcode = 'P0001';
  end if;
  if v_redirect.phase9_disposition = 'utility-archive' and p_decision not in ('pending', 'archive') then
    raise exception 'UTILITY_ROUTE_MUST_ARCHIVE' using errcode = 'P0001';
  end if;
  if p_decision = 'activate' and v_redirect.phase9_disposition = 'draft-target' then
    select * into v_target from public.editorial_targets where source_key = v_redirect.source_key;
    if not found then raise exception 'TARGET_NOT_FOUND' using errcode = 'P0001'; end if;
    select * into v_state from public.phase10_target_state(v_target.target_kind, v_target.target_id);
    if not found or v_state.target_status <> 'published' or v_state.published_at is null
      or v_state.published_at > now() or v_state.target_version is distinct from v_redirect.target_version
      or not exists (
        select 1 from public.editorial_reviews r where r.editorial_redirect_id = v_redirect.id
          and r.state = 'resolved' and r.decision = 'activate-redirect'
          and r.public_target_verified and r.target_version = v_redirect.target_version
      ) then raise exception 'PUBLIC_TARGET_EVIDENCE_REQUIRED' using errcode = 'P0001'; end if;
  end if;
  if v_redirect.decision = p_decision
    and coalesce(v_redirect.decision_reason, '') = (case when p_decision = 'pending' then '' else btrim(p_decision_reason) end) then
    return v_redirect;
  end if;
  v_before := to_jsonb(v_redirect) - 'decided_by';
  update public.editorial_redirects set decision = p_decision,
    decision_reason = case when p_decision = 'pending' then null else btrim(p_decision_reason) end,
    decided_by = case when p_decision = 'pending' then null else v_actor end,
    decided_at = case when p_decision = 'pending' then null else now() end
    where id = v_redirect.id returning * into v_redirect;
  insert into public.editorial_audit_logs (
    actor_user_id, action, editorial_redirect_id, correlation_id, before_state, after_state
  ) values (v_actor, 'redirect_decided', v_redirect.id, p_correlation_id,
    v_before, to_jsonb(v_redirect) - 'decided_by');
  return v_redirect;
end;
$$;

create or replace function public.phase10_editorial_reconciliation()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = 'P0001'; end if;
  if public.is_admin() is not true then raise exception 'ADMIN_REQUIRED' using errcode = 'P0001'; end if;
  return jsonb_build_object(
    'targets', jsonb_build_object(
      'total', (select count(*) from public.editorial_targets),
      'pending', (select count(*) from public.editorial_targets where decision = 'pending'),
      'publish', (select count(*) from public.editorial_targets where decision = 'publish'),
      'keepDraft', (select count(*) from public.editorial_targets where decision = 'keep-draft'),
      'archive', (select count(*) from public.editorial_targets where decision = 'archive')
    ),
    'reviews', jsonb_build_object(
      'total', (select count(*) from public.editorial_reviews),
      'pending', (select count(*) from public.editorial_reviews where state = 'pending'),
      'inReview', (select count(*) from public.editorial_reviews where state = 'in-review'),
      'resolved', (select count(*) from public.editorial_reviews where state = 'resolved'),
      'deferred', (select count(*) from public.editorial_reviews where state = 'deferred'),
      'highRemaining', (select count(*) from public.editorial_reviews where severity = 'high' and state not in ('resolved', 'deferred'))
    ),
    'redirects', jsonb_build_object(
      'total', (select count(*) from public.editorial_redirects),
      'activate', (select count(*) from public.editorial_redirects where decision = 'activate'),
      'keepInactive', (select count(*) from public.editorial_redirects where decision = 'keep-inactive'),
      'archive', (select count(*) from public.editorial_redirects where decision = 'archive'),
      'pending', (select count(*) from public.editorial_redirects where decision = 'pending'),
      'verified', (select count(*) from public.editorial_redirects where target_verified)
    ),
    'derivatives', jsonb_build_object(
      'active', (select count(*) from public.editorial_redacted_derivatives where status = 'active'),
      'unredactedRequired',
        (select count(*) from public.activity_assets where privacy_state = 'redaction-required')
        + (select count(*) from public.files where privacy_state = 'redaction-required')
    ),
    'auditRows', (select count(*) from public.editorial_audit_logs)
  );
end;
$$;

create or replace function public.phase10_list_redirects()
returns table (
  redirect_key text, source_key text, source_url text, source_path text, target_path text,
  phase9_status_code integer, phase9_disposition text, decision text,
  decision_reason text, target_version text, target_verified boolean,
  verified_origin text, verified_final_url text, verified_final_status integer,
  verified_hops integer, verified_at timestamptz, decided_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = 'P0001'; end if;
  if public.is_admin() is not true then raise exception 'ADMIN_REQUIRED' using errcode = 'P0001'; end if;
  return query select r.redirect_key, r.source_key, r.source_url, r.source_path, r.target_path,
    r.phase9_status_code, r.phase9_disposition, r.decision, r.decision_reason,
    r.target_version, r.target_verified, r.verified_origin, r.verified_final_url,
    r.verified_final_status, r.verified_hops, r.verified_at, r.decided_at
  from public.editorial_redirects r order by r.source_path, r.source_key;
end;
$$;

create or replace function public.phase10_register_redacted_derivative(
  p_asset_kind text,
  p_asset_id uuid,
  p_original_bucket text,
  p_original_path text,
  p_original_sha256 text,
  p_derivative_bucket text,
  p_derivative_path text,
  p_derivative_sha256 text,
  p_derivative_mime_type text,
  p_derivative_original_name text,
  p_derivative_size_bytes bigint,
  p_redaction_method text,
  p_inspection_summary jsonb,
  p_correlation_id uuid
)
returns public.editorial_redacted_derivatives
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_target public.editorial_targets;
  v_derivative public.editorial_redacted_derivatives;
  v_actual_bucket text;
  v_actual_path text;
  v_actual_sha256 text;
  v_actual_privacy_state text;
  v_derivative_exists boolean;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode = 'P0001'; end if;
  if public.is_admin() is not true then raise exception 'ADMIN_REQUIRED' using errcode = 'P0001'; end if;
  if p_correlation_id is null or p_asset_kind not in ('activity-asset', 'file')
    or p_original_bucket <> p_derivative_bucket or p_original_path = p_derivative_path
    or p_original_sha256 = p_derivative_sha256
    or p_original_sha256 !~ '^[0-9a-f]{64}$' or p_derivative_sha256 !~ '^[0-9a-f]{64}$'
    or nullif(btrim(coalesce(p_derivative_original_name, '')), '') is null
    or nullif(btrim(coalesce(p_redaction_method, '')), '') is null
    or jsonb_typeof(p_inspection_summary) <> 'object'
    or p_inspection_summary->>'operatorContentAndAuthorizationReviewStillRequired' <> 'true'
    or p_derivative_size_bytes < 1 or p_derivative_size_bytes > 20971520 then
    raise exception 'INVALID_DERIVATIVE' using errcode = 'P0001';
  end if;
  if p_asset_kind = 'activity-asset' then
    select t into v_target
      from public.activity_assets a join public.editorial_targets t
        on t.target_kind = 'activity' and t.target_id = a.activity_id
      where a.id = p_asset_id for update of a;
    select a.storage_bucket, a.storage_path, a.original_sha256, a.privacy_state
      into v_actual_bucket, v_actual_path, v_actual_sha256, v_actual_privacy_state
      from public.activity_assets a where a.id = p_asset_id;
  else
    select t into v_target
      from public.files f join public.editorial_targets t
        on t.target_kind = 'file' and t.target_id = f.id
      where f.id = p_asset_id for update of f;
    select 'downloads', f.storage_path, f.original_sha256, f.privacy_state
      into v_actual_bucket, v_actual_path, v_actual_sha256, v_actual_privacy_state
      from public.files f where f.id = p_asset_id;
  end if;
  if v_target.id is null or v_actual_bucket is distinct from p_original_bucket
    or v_actual_path is distinct from p_original_path or v_actual_sha256 is distinct from p_original_sha256 then
    raise exception 'ORIGINAL_MISMATCH' using errcode = 'P0001';
  end if;
  if v_actual_privacy_state <> 'redaction-required' then
    raise exception 'DERIVATIVE_NOT_REQUIRED' using errcode = 'P0001';
  end if;
  if p_derivative_mime_type not in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')
    or (p_derivative_mime_type = 'image/jpeg' and lower(storage.extension(p_derivative_path)) not in ('jpg', 'jpeg'))
    or (p_derivative_mime_type = 'image/png' and lower(storage.extension(p_derivative_path)) <> 'png')
    or (p_derivative_mime_type = 'image/webp' and lower(storage.extension(p_derivative_path)) <> 'webp')
    or (p_derivative_mime_type = 'application/pdf' and lower(storage.extension(p_derivative_path)) <> 'pdf') then
    raise exception 'INVALID_DERIVATIVE' using errcode = 'P0001';
  end if;
  if (p_asset_kind = 'activity-asset' and storage.foldername(p_derivative_path)
      is distinct from array[v_target.target_id::text, 'phase10-redacted', p_asset_id::text])
    or (p_asset_kind = 'file' and storage.foldername(p_derivative_path)
      is distinct from array['files', p_asset_id::text, 'phase10-redacted']) then
    raise exception 'INVALID_DERIVATIVE_PATH' using errcode = 'P0001';
  end if;
  select exists (
    select 1 from storage.objects o
    where o.bucket_id = p_derivative_bucket and o.name = p_derivative_path
      and lower(coalesce(o.metadata->>'mimetype', '')) = p_derivative_mime_type
      and case when coalesce(o.metadata->>'size', '') ~ '^[0-9]+$'
        then (o.metadata->>'size')::bigint = p_derivative_size_bytes else false end
  ) into v_derivative_exists;
  if not v_derivative_exists then raise exception 'DERIVATIVE_OBJECT_NOT_FOUND' using errcode = 'P0001'; end if;
  if exists (select 1 from public.editorial_redacted_derivatives where asset_kind = p_asset_kind and asset_id = p_asset_id and status = 'active') then
    raise exception 'ACTIVE_DERIVATIVE_EXISTS' using errcode = 'P0001';
  end if;
  insert into public.editorial_redacted_derivatives (
    editorial_target_id, asset_kind, asset_id, original_bucket, original_path, original_sha256,
    derivative_bucket, derivative_path, derivative_sha256, derivative_mime_type,
    derivative_original_name, derivative_size_bytes, redaction_method, inspection_summary, created_by
  ) values (
    v_target.id, p_asset_kind, p_asset_id, p_original_bucket, p_original_path, p_original_sha256,
    p_derivative_bucket, p_derivative_path, p_derivative_sha256, p_derivative_mime_type,
    btrim(p_derivative_original_name), p_derivative_size_bytes, btrim(p_redaction_method), p_inspection_summary, v_actor
  ) returning * into v_derivative;
  if p_asset_kind = 'activity-asset' then
    update public.activity_assets set privacy_state = 'redacted', public_storage_path = p_derivative_path,
      public_sha256 = p_derivative_sha256, public_mime_type = p_derivative_mime_type,
      public_original_name = btrim(p_derivative_original_name), public_size_bytes = p_derivative_size_bytes where id = p_asset_id;
  else
    update public.files set privacy_state = 'redacted', public_storage_path = p_derivative_path,
      public_sha256 = p_derivative_sha256, public_mime_type = p_derivative_mime_type,
      public_original_name = btrim(p_derivative_original_name), public_size_bytes = p_derivative_size_bytes where id = p_asset_id;
  end if;
  insert into public.editorial_audit_logs (
    actor_user_id, action, editorial_target_id, correlation_id, after_state
  ) values (
    v_actor, 'derivative_registered', v_target.id, p_correlation_id,
    jsonb_build_object('assetKind', p_asset_kind, 'assetId', p_asset_id,
      'derivativeSha256', p_derivative_sha256, 'derivativeSizeBytes', p_derivative_size_bytes)
  );
  return v_derivative;
end;
$$;

create or replace function public.phase10_public_activity_assets(p_activity_id uuid)
returns table (
  id uuid, activity_id uuid, kind text, original_name text, mime_type text,
  size_bytes bigint, alt_text text, sort_order integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.activity_id, a.kind,
    case when a.privacy_state = 'redacted' then a.public_original_name else coalesce(a.public_original_name, a.original_name) end,
    case when a.privacy_state = 'redacted' then a.public_mime_type else coalesce(a.public_mime_type, a.mime_type) end,
    case when a.privacy_state = 'redacted' then a.public_size_bytes else coalesce(a.public_size_bytes, a.size_bytes) end,
    a.alt_text, a.sort_order
  from public.activity_assets a
  join public.activities x on x.id = a.activity_id
  where a.activity_id = p_activity_id and x.status = 'published'
    and x.published_at is not null and x.published_at <= now()
    and a.privacy_state <> 'redaction-required'
    and (a.privacy_state <> 'unknown' or not exists (
      select 1 from public.editorial_targets t where t.target_kind = 'activity' and t.target_id = a.activity_id
    ))
    and (a.privacy_state <> 'redacted' or (
      a.public_storage_path is not null and a.public_original_name is not null
      and a.public_mime_type is not null and a.public_size_bytes is not null
    ))
  order by a.sort_order, a.id;
$$;

create or replace function public.phase10_get_public_activity_asset(p_asset_id uuid)
returns table (
  active_storage_path text, download_name text, active_mime_type text,
  active_size_bytes bigint, active_sha256 text
)
language sql
stable
security definer
set search_path = ''
as $$
  select case when a.privacy_state = 'redacted' then a.public_storage_path else a.storage_path end,
    case when a.privacy_state = 'redacted' then a.public_original_name else coalesce(a.public_original_name, a.original_name) end,
    case when a.privacy_state = 'redacted' then a.public_mime_type else coalesce(a.public_mime_type, a.mime_type) end,
    case when a.privacy_state = 'redacted' then a.public_size_bytes else coalesce(a.public_size_bytes, a.size_bytes) end,
    case when a.privacy_state = 'redacted' then a.public_sha256 else a.original_sha256 end
  from public.activity_assets a
  join public.activities x on x.id = a.activity_id
  where a.id = p_asset_id and x.status = 'published'
    and x.published_at is not null and x.published_at <= now()
    and a.privacy_state <> 'redaction-required'
    and (a.privacy_state <> 'unknown' or not exists (
      select 1 from public.editorial_targets t where t.target_kind = 'activity' and t.target_id = a.activity_id
    ))
    and (a.privacy_state <> 'redacted' or a.public_storage_path is not null);
$$;

create or replace function public.phase10_public_files()
returns table (
  id uuid, title text, description text, academic_year integer, category text,
  storage_path text, original_filename text, mime_type text, size_bytes bigint,
  status text, published_at timestamptz, sort_order integer, created_at timestamptz, updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select f.id, f.title, f.description, f.academic_year, f.category, null::text,
    case when f.privacy_state = 'redacted' then f.public_original_name else coalesce(f.public_original_name, f.original_filename) end,
    case when f.privacy_state = 'redacted' then f.public_mime_type else coalesce(f.public_mime_type, f.mime_type) end,
    case when f.privacy_state = 'redacted' then f.public_size_bytes else coalesce(f.public_size_bytes, f.size_bytes) end,
    f.status, f.published_at, f.sort_order, f.created_at, f.updated_at
  from public.files f
  where f.status = 'published' and f.published_at is not null and f.published_at <= now()
    and f.privacy_state <> 'redaction-required'
    and (f.privacy_state <> 'unknown' or not exists (
      select 1 from public.editorial_targets t where t.target_kind = 'file' and t.target_id = f.id
    ))
    and (f.privacy_state <> 'redacted' or (
      f.public_storage_path is not null and f.public_original_name is not null
      and f.public_mime_type is not null and f.public_size_bytes is not null
    ))
  order by f.sort_order, f.published_at desc, f.id;
$$;

create or replace function public.phase10_public_activity_file_titles(p_activity_id uuid)
returns table (title text)
language sql
stable
security definer
set search_path = ''
as $$
  select f.title from public.files f
  where f.activity_id = p_activity_id and f.status = 'published'
    and f.published_at is not null and f.published_at <= now()
    and f.privacy_state <> 'redaction-required'
    and (f.privacy_state <> 'unknown' or not exists (
      select 1 from public.editorial_targets t where t.target_kind = 'file' and t.target_id = f.id
    ))
  order by f.created_at desc, f.id;
$$;

create or replace function public.phase10_get_public_file_download(p_file_id uuid)
returns table (
  active_storage_path text, download_name text, active_mime_type text,
  active_size_bytes bigint, active_sha256 text
)
language sql
stable
security definer
set search_path = ''
as $$
  select case when f.privacy_state = 'redacted' then f.public_storage_path else f.storage_path end,
    case when f.privacy_state = 'redacted' then f.public_original_name else coalesce(f.public_original_name, f.original_filename) end,
    case when f.privacy_state = 'redacted' then f.public_mime_type else coalesce(f.public_mime_type, f.mime_type) end,
    case when f.privacy_state = 'redacted' then f.public_size_bytes else coalesce(f.public_size_bytes, f.size_bytes) end,
    case when f.privacy_state = 'redacted' then f.public_sha256 else f.original_sha256 end
  from public.files f
  where f.id = p_file_id and f.status = 'published' and f.published_at is not null and f.published_at <= now()
    and f.privacy_state <> 'redaction-required'
    and (f.privacy_state <> 'unknown' or not exists (
      select 1 from public.editorial_targets t where t.target_kind = 'file' and t.target_id = f.id
    ))
    and (f.privacy_state <> 'redacted' or f.public_storage_path is not null);
$$;

create or replace function public.phase10_can_read_activity_object(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.activity_assets a join public.activities x on x.id = a.activity_id
    where x.status = 'published' and x.published_at is not null and x.published_at <= now() and (
      (a.privacy_state in ('cleared') and a.storage_path = p_name)
      or (a.privacy_state = 'redacted' and a.public_storage_path = p_name)
      or (a.privacy_state = 'unknown' and a.storage_path = p_name and not exists (
        select 1 from public.editorial_targets t where t.target_kind = 'activity' and t.target_id = a.activity_id
      ))
    )
  );
$$;

create or replace function public.phase10_can_read_download_object(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.files f where f.status = 'published' and f.published_at is not null and f.published_at <= now() and (
      (f.privacy_state = 'cleared' and f.storage_path = p_name)
      or (f.privacy_state = 'redacted' and f.public_storage_path = p_name)
      or (f.privacy_state = 'unknown' and f.storage_path = p_name and not exists (
        select 1 from public.editorial_targets t where t.target_kind = 'file' and t.target_id = f.id
      ))
    )
  );
$$;

revoke all on table public.activity_assets from anon;
revoke all on table public.files from anon;

drop policy if exists "Published activity assets are readable" on public.activity_assets;
drop policy if exists "Published files are readable" on public.files;

drop policy if exists "Published activity storage objects are readable" on storage.objects;
create policy "Phase 10 active activity objects are readable" on storage.objects
for select to anon, authenticated
using (bucket_id = 'activity-assets' and public.phase10_can_read_activity_object(name));

drop policy if exists "Active admins can insert activity storage objects" on storage.objects;
create policy "Active admins can insert activity storage objects" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'activity-assets' and (select public.is_admin()) and (
    ((storage.foldername(name))[2] in ('image', 'attachment') and exists (
      select 1 from public.activities x where x.id::text = (storage.foldername(name))[1]
    ))
    or ((storage.foldername(name))[2] = 'phase10-redacted' and exists (
      select 1 from public.activity_assets a
      where a.activity_id::text = (storage.foldername(name))[1]
        and a.id::text = (storage.foldername(name))[3]
    ))
  )
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'pdf')
);

drop policy if exists "Published downloads are readable" on storage.objects;
create policy "Phase 10 active downloads are readable" on storage.objects
for select to anon, authenticated
using (bucket_id = 'downloads' and public.phase10_can_read_download_object(name));

alter table public.editorial_bootstrap_runs enable row level security;
alter table public.editorial_targets enable row level security;
alter table public.editorial_redirects enable row level security;
alter table public.editorial_reviews enable row level security;
alter table public.editorial_redacted_derivatives enable row level security;
alter table public.editorial_audit_logs enable row level security;

revoke all on table public.editorial_bootstrap_runs from public, anon, authenticated;
revoke all on table public.editorial_targets from public, anon, authenticated;
revoke all on table public.editorial_redirects from public, anon, authenticated;
revoke all on table public.editorial_reviews from public, anon, authenticated;
revoke all on table public.editorial_redacted_derivatives from public, anon, authenticated;
revoke all on table public.editorial_audit_logs from public, anon, authenticated;
revoke all on sequence public.editorial_audit_logs_id_seq from public, anon, authenticated;

revoke all on function public.set_phase10_updated_at() from public, anon, authenticated;
revoke all on function public.prevent_editorial_audit_mutation() from public, anon, authenticated;
revoke all on function public.protect_phase10_managed_target() from public, anon, authenticated;
revoke all on function public.protect_phase10_managed_activity_child() from public, anon, authenticated;
revoke all on function public.phase10_target_state(text, uuid) from public, anon, authenticated;
revoke all on function public.phase10_assert_target_delete_allowed(text, uuid) from public, anon, authenticated;
revoke all on function public.phase10_assert_activity_asset_delete_allowed(uuid) from public, anon, authenticated;
revoke all on function public.phase10_bootstrap_editorial(text, text, jsonb, jsonb, jsonb, uuid) from public, anon, authenticated;
revoke all on function public.phase10_list_editorial_reviews(text, text, text, text, integer, integer) from public, anon, authenticated;
revoke all on function public.phase10_get_editorial_review(text) from public, anon, authenticated;
revoke all on function public.phase10_update_editorial_review(text, text, text, text, boolean, boolean, boolean, boolean, text, uuid) from public, anon, authenticated;
revoke all on function public.phase10_record_redirect_verification(text, text, text, integer, integer, text, uuid) from public, anon, authenticated;
revoke all on function public.phase10_decide_redirect(text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.phase10_editorial_reconciliation() from public, anon, authenticated;
revoke all on function public.phase10_list_redirects() from public, anon, authenticated;
revoke all on function public.phase10_register_redacted_derivative(text, uuid, text, text, text, text, text, text, text, text, bigint, text, jsonb, uuid) from public, anon, authenticated;
revoke all on function public.phase10_public_activity_assets(uuid) from public, anon, authenticated;
revoke all on function public.phase10_get_public_activity_asset(uuid) from public, anon, authenticated;
revoke all on function public.phase10_public_files() from public, anon, authenticated;
revoke all on function public.phase10_public_activity_file_titles(uuid) from public, anon, authenticated;
revoke all on function public.phase10_get_public_file_download(uuid) from public, anon, authenticated;
revoke all on function public.phase10_can_read_activity_object(text) from public, anon, authenticated;
revoke all on function public.phase10_can_read_download_object(text) from public, anon, authenticated;

grant execute on function public.phase10_bootstrap_editorial(text, text, jsonb, jsonb, jsonb, uuid) to authenticated;
grant execute on function public.phase10_assert_target_delete_allowed(text, uuid) to authenticated;
grant execute on function public.phase10_assert_activity_asset_delete_allowed(uuid) to authenticated;
grant execute on function public.phase10_list_editorial_reviews(text, text, text, text, integer, integer) to authenticated;
grant execute on function public.phase10_get_editorial_review(text) to authenticated;
grant execute on function public.phase10_update_editorial_review(text, text, text, text, boolean, boolean, boolean, boolean, text, uuid) to authenticated;
grant execute on function public.phase10_record_redirect_verification(text, text, text, integer, integer, text, uuid) to authenticated;
grant execute on function public.phase10_decide_redirect(text, text, text, uuid) to authenticated;
grant execute on function public.phase10_editorial_reconciliation() to authenticated;
grant execute on function public.phase10_list_redirects() to authenticated;
grant execute on function public.phase10_register_redacted_derivative(text, uuid, text, text, text, text, text, text, text, text, bigint, text, jsonb, uuid) to authenticated;
grant execute on function public.phase10_public_activity_assets(uuid) to anon, authenticated;
grant execute on function public.phase10_get_public_activity_asset(uuid) to anon, authenticated;
grant execute on function public.phase10_public_files() to anon, authenticated;
grant execute on function public.phase10_public_activity_file_titles(uuid) to anon, authenticated;
grant execute on function public.phase10_get_public_file_download(uuid) to anon, authenticated;
grant execute on function public.phase10_can_read_activity_object(text) to anon, authenticated;
grant execute on function public.phase10_can_read_download_object(text) to anon, authenticated;

notify pgrst, 'reload schema';
