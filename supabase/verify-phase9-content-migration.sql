begin;

do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from information_schema.tables
  where table_schema = 'public'
    and table_name in ('content_migration_runs', 'content_source_refs');
  if v_count <> 2 then raise exception 'Phase 9 provenance tables are missing'; end if;

  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('content_migration_runs', 'content_source_refs')
      and c.relrowsecurity is not true
  ) then raise exception 'Phase 9 provenance RLS is not enabled'; end if;

  if has_table_privilege('anon', 'public.content_migration_runs', 'SELECT')
    or has_table_privilege('authenticated', 'public.content_migration_runs', 'SELECT')
    or has_table_privilege('authenticated', 'public.content_source_refs', 'INSERT') then
    raise exception 'Phase 9 provenance direct table privileges are too broad';
  end if;

  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'phase9_%'
      and (not p.prosecdef or coalesce(array_to_string(p.proconfig, ','), '') not like '%search_path=%')
  ) then raise exception 'Phase 9 function is not fixed-search-path SECURITY DEFINER'; end if;

  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'set_phase9_publication_timestamp'
      and not p.prosecdef
      and coalesce(array_to_string(p.proconfig, ','), '') like '%search_path=%'
  ) then raise exception 'Phase 9 publication timestamp trigger function is not fixed-search-path invoker'; end if;

  select count(*) into v_count
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('activities', 'posts', 'files', 'year_summaries')
    and t.tgname like 'set_%_phase9_publication_timestamp'
    and not t.tgisinternal;
  if v_count <> 4 then raise exception 'Phase 9 publication timestamp triggers are incomplete'; end if;

  if has_function_privilege('anon', 'public.phase9_begin_migration_run(text,text,text,text,text)', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.phase9_begin_migration_run(text,text,text,text,text)', 'EXECUTE') then
    raise exception 'Phase 9 RPC execute grants are invalid';
  end if;

  if exists (
    select 1 from public.content_source_refs r
    where not (
      (r.target_kind = 'activity' and exists(select 1 from public.activities t where t.id = r.target_id))
      or (r.target_kind = 'post' and exists(select 1 from public.posts t where t.id = r.target_id))
      or (r.target_kind = 'file' and exists(select 1 from public.files t where t.id = r.target_id))
      or (r.target_kind = 'faq' and exists(select 1 from public.faq t where t.id = r.target_id))
      or (r.target_kind = 'year-summary' and exists(select 1 from public.year_summaries t where t.id = r.target_id))
      or (r.target_kind = 'site-settings' and exists(select 1 from public.site_settings t where t.id = r.target_id and t.singleton_key = true))
    )
  ) then raise exception 'Phase 9 provenance has an orphan target'; end if;

  if exists (select 1 from public.content_migration_runs where status = 'running') then
    raise exception 'Phase 9 has an incomplete migration run';
  end if;
end;
$$;

select
  true as phase9_provenance_verified,
  true as phase9_target_integrity_verified,
  true as phase9_migration_run_verified;

rollback;
