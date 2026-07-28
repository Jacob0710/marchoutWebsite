-- Run after both Phase 10 migrations and the deterministic editorial bootstrap.
-- Any failure aborts verification; this script never mutates application data.

do $$
declare
  v_table text;
  v_function_count integer;
begin
  foreach v_table in array array[
    'editorial_bootstrap_runs', 'editorial_targets', 'editorial_redirects',
    'editorial_reviews', 'editorial_redacted_derivatives', 'editorial_audit_logs',
    'release_safety_checkpoints', 'release_batches', 'release_batch_items', 'release_batch_redirects'
  ] loop
    if not exists (
      select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = v_table and c.relkind = 'r' and c.relrowsecurity
    ) then raise exception 'Phase 10 RLS is missing for %', v_table; end if;
    if has_table_privilege('anon', format('public.%I', v_table), 'SELECT')
      or has_table_privilege('anon', format('public.%I', v_table), 'INSERT')
      or has_table_privilege('authenticated', format('public.%I', v_table), 'SELECT')
      or has_table_privilege('authenticated', format('public.%I', v_table), 'INSERT')
      or has_table_privilege('authenticated', format('public.%I', v_table), 'UPDATE')
      or has_table_privilege('authenticated', format('public.%I', v_table), 'DELETE') then
      raise exception 'Direct table privilege remains for %', v_table;
    end if;
  end loop;

  if exists (
    select 1 from pg_policies where schemaname = 'public' and tablename in (
      'editorial_bootstrap_runs', 'editorial_targets', 'editorial_redirects',
      'editorial_reviews', 'editorial_redacted_derivatives', 'editorial_audit_logs',
      'release_safety_checkpoints', 'release_batches', 'release_batch_items', 'release_batch_redirects'
    )
  ) then raise exception 'Phase 10 private tables must not have direct RLS policies'; end if;

  if has_table_privilege('anon', 'public.activity_assets', 'SELECT')
    or has_table_privilege('anon', 'public.files', 'SELECT') then
    raise exception 'Anon retains direct access to private asset/file metadata';
  end if;
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and (
      (tablename = 'activity_assets' and policyname = 'Published activity assets are readable')
      or (tablename = 'files' and policyname = 'Published files are readable')
    )
  ) then raise exception 'Legacy direct published asset/file policy remains'; end if;
  if not has_function_privilege('anon', 'public.phase10_public_activity_assets(uuid)', 'EXECUTE')
    or not has_function_privilege('anon', 'public.phase10_get_public_activity_asset(uuid)', 'EXECUTE')
    or not has_function_privilege('anon', 'public.phase10_public_files()', 'EXECUTE')
    or not has_function_privilege('anon', 'public.phase10_get_public_file_download(uuid)', 'EXECUTE') then
    raise exception 'Narrow public asset/file RPC grants are incomplete';
  end if;

  select count(*) into v_function_count
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname like 'phase10_%'
    and p.prosecdef and coalesce(array_to_string(p.proconfig, ','), '') like '%search_path=%';
  if v_function_count < 16 then raise exception 'Phase 10 fixed-search_path RPC set is incomplete: %', v_function_count; end if;

  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'phase10_%'
      and (not p.prosecdef or coalesce(array_to_string(p.proconfig, ','), '') not like '%search_path=%')
  ) then raise exception 'A Phase 10 RPC lacks SECURITY DEFINER or fixed search_path'; end if;

  if (select count(*) from public.editorial_bootstrap_runs) <> 1 then raise exception 'Expected one editorial bootstrap'; end if;
  if (select count(*) from public.editorial_targets) <> 70 then raise exception 'Expected exactly 70 Phase 9 editorial targets'; end if;
  if (select count(*) from public.editorial_targets where target_kind = 'activity') <> 46
    or (select count(*) from public.editorial_targets where target_kind = 'file') <> 18
    or (select count(*) from public.editorial_targets where target_kind = 'year-summary') <> 6 then
    raise exception 'Phase 9 target-kind reconciliation failed';
  end if;
  if (select count(*) from public.editorial_reviews) <> 122
    or (select count(*) from public.editorial_reviews where target_kind = 'redirect') <> 52
    or (select count(*) from public.editorial_reviews where severity = 'high') <> 40 then
    raise exception 'Phase 9 review reconciliation failed';
  end if;
  if (select count(*) from public.editorial_redirects) <> 83
    or (select count(distinct redirect_key) from public.editorial_redirects) <> 83
    or (select count(distinct source_path) from public.editorial_redirects) <> 83
    or (select count(*) from public.editorial_redirects where phase9_disposition = 'structural-candidate') <> 29
    or (select count(*) from public.editorial_redirects where phase9_disposition = 'draft-target') <> 52
    or (select count(*) from public.editorial_redirects where phase9_disposition = 'utility-archive') <> 2 then
    raise exception 'Phase 9 redirect reconciliation failed';
  end if;
  if exists (select 1 from public.editorial_targets where decision = 'pending')
    or exists (select 1 from public.editorial_reviews where state not in ('resolved', 'deferred'))
    or exists (select 1 from public.editorial_redirects where decision = 'pending') then
    raise exception 'Phase 10 decisions are incomplete';
  end if;
  if exists (select 1 from public.editorial_reviews where editorial_target_id is null and editorial_redirect_id is null)
    or exists (select editorial_target_id from public.editorial_reviews where editorial_target_id is not null group by editorial_target_id having count(*) <> 1)
    or exists (select editorial_redirect_id from public.editorial_reviews where editorial_redirect_id is not null group by editorial_redirect_id having count(*) <> 1) then
    raise exception 'Editorial review orphan or duplicate detected';
  end if;

  if (select count(*) from public.activities a where a.status = 'draft'
      and not exists (select 1 from public.editorial_targets t where t.target_kind = 'activity' and t.target_id = a.id)) <> 1 then
    raise exception 'The pre-existing Activity draft was not kept separate';
  end if;
  if exists (
    select 1 from public.editorial_targets t
    where not exists (
      select 1 from public.content_source_refs r
      where r.source_system = 'wix' and r.source_key = t.source_key
        and r.target_kind = t.target_kind and r.target_id = t.target_id
        and r.source_sha256 = t.source_sha256 and r.normalized_sha256 = t.normalized_sha256
    )
  ) then raise exception 'Editorial target provenance mismatch'; end if;

  if exists (
    select 1 from public.editorial_redirects
    where decision = 'activate' and (not target_verified or verified_final_status <> 200 or verified_hops <> 1)
  ) then raise exception 'An active redirect lacks one-hop public 200 evidence'; end if;
  if exists (
    select 1 from public.editorial_redirects d
    join public.editorial_targets t on t.source_key = d.source_key
    cross join lateral public.phase10_target_state(t.target_kind, t.target_id) s
    where d.decision = 'activate' and d.phase9_disposition = 'draft-target'
      and (s.target_status <> 'published' or s.published_at is null or s.published_at > now()
        or d.target_version is distinct from s.target_version)
  ) then raise exception 'An active draft-target redirect is stale or not public'; end if;
  if exists (
    select 1 from public.editorial_redirects
    where phase9_disposition = 'utility-archive' and decision not in ('pending', 'archive')
  ) then raise exception 'A utility route escaped archive handling'; end if;

  if exists (
    select 1 from public.editorial_targets t
    join public.editorial_reviews r on r.editorial_target_id = t.id
    cross join lateral public.phase10_target_state(t.target_kind, t.target_id) s
    where s.target_status = 'published' and (
      t.decision <> 'publish' or r.state <> 'resolved' or r.decision <> 'publish'
      or s.published_at is null or s.published_at > now()
      or t.target_version is distinct from s.target_version or r.target_version is distinct from s.target_version
      or not t.content_verified or not t.privacy_verified or not t.authorization_verified
      or not r.content_verified or not r.privacy_verified or not r.authorization_verified
    )
  ) then raise exception 'A published imported target lacks resolved evidence'; end if;
  if exists (select 1 from public.activity_assets a join public.activities x on x.id = a.activity_id
      join public.editorial_targets t on t.target_kind = 'activity' and t.target_id = x.id
      where x.status = 'published' and a.privacy_state = 'redaction-required')
    or exists (select 1 from public.files f join public.editorial_targets t on t.target_kind = 'file' and t.target_id = f.id
      where f.status = 'published' and f.privacy_state = 'redaction-required') then
    raise exception 'A published target still references an unredacted sensitive object';
  end if;
  if exists (
    select 1 from public.editorial_redacted_derivatives
    where original_path = derivative_path or original_sha256 = derivative_sha256 or original_bucket <> derivative_bucket
  ) then raise exception 'A derivative overwrote or duplicated its original'; end if;
  if exists (
    select 1 from public.editorial_redacted_derivatives d
    where d.status = 'active' and (
      d.derivative_mime_type not in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')
      or not exists (
        select 1 from storage.objects o
        where o.bucket_id = d.derivative_bucket and o.name = d.derivative_path
      )
    )
  ) then raise exception 'An active derivative lacks its exact private Storage object'; end if;
  if exists (
    select 1 from public.activity_assets a
    where a.privacy_state in ('redacted', 'redaction-required')
      and public.phase10_can_read_activity_object(a.storage_path)
  ) or exists (
    select 1 from public.files f
    where f.privacy_state in ('redacted', 'redaction-required') and f.storage_path is not null
      and public.phase10_can_read_download_object(f.storage_path)
  ) then raise exception 'A private original remains public through Storage policy'; end if;

  if not exists (
    select 1 from pg_trigger where tgrelid = 'public.editorial_audit_logs'::regclass
      and tgname = 'prevent_editorial_audit_update' and tgenabled <> 'D'
  ) then raise exception 'Editorial audit append-only trigger is missing'; end if;
  if not exists (
    select 1 from pg_trigger where tgrelid = 'public.activities'::regclass
      and tgname = 'protect_phase10_managed_activity' and tgenabled <> 'D'
  ) or not exists (
    select 1 from pg_trigger where tgrelid = 'public.files'::regclass
      and tgname = 'protect_phase10_managed_file' and tgenabled <> 'D'
  ) or not exists (
    select 1 from pg_trigger where tgrelid = 'public.year_summaries'::regclass
      and tgname = 'protect_phase10_managed_year_summary' and tgenabled <> 'D'
  ) or not exists (
    select 1 from pg_trigger where tgrelid = 'public.activity_assets'::regclass
      and tgname = 'protect_phase10_managed_activity_asset' and tgenabled <> 'D'
  ) then raise exception 'Managed content immutability/release trigger is missing'; end if;
  if exists (
    select 1 from public.release_batches b where b.status = 'completed' and exists (
      select 1 from public.release_batch_items i
      where i.release_batch_id = b.id and i.status not in ('applied', 'verified')
    )
  ) then raise exception 'A completed release contains a non-applied item'; end if;
end;
$$;

select public.phase10_editorial_reconciliation() as phase10_reconciliation;
