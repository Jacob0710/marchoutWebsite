-- Phase 8 read-only verification. Safe to run repeatedly in Supabase SQL Editor.
begin;
set transaction read only;

do $$
declare
  v_missing text;
begin
  select string_agg(name, ', ') into v_missing
  from unnest(array['posts','files','faq','year_summaries','site_settings','categories']) name
  where to_regclass('public.' || name) is null;
  if v_missing is not null then raise exception 'Phase 8 tables missing: %', v_missing; end if;

  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname in ('posts','files','faq','year_summaries','site_settings','categories')
      and c.relrowsecurity is not true
  ) then raise exception 'A Phase 8 table does not have RLS enabled'; end if;

  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='posts' and column_name='cover_storage_path' and data_type='text')
    or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='files' and column_name='storage_path' and data_type='text')
    or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='year_summaries' and column_name='highlights' and data_type='jsonb')
    or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='site_settings' and column_name='singleton_key' and data_type='boolean')
  then raise exception 'Required Phase 8 columns or types are missing'; end if;

  if not exists (select 1 from pg_constraint where conrelid='public.year_summaries'::regclass and contype='u')
    or not exists (select 1 from pg_constraint where conrelid='public.year_summaries'::regclass and contype='f')
    or not exists (select 1 from pg_indexes where schemaname='public' and tablename='site_settings' and indexname='site_settings_singleton_true_idx')
  then raise exception 'Year uniqueness/FK or settings singleton index is missing'; end if;

  if exists (
    select 1 from pg_policies
    where schemaname='public' and tablename in ('posts','files','faq','year_summaries','site_settings','categories')
      and cmd='ALL'
  ) then raise exception 'Broad ALL content policy remains'; end if;

  if exists (
    select 1 from pg_policies
    where schemaname='public' and tablename in ('posts','files','faq','year_summaries','site_settings')
      and cmd in ('INSERT','UPDATE','DELETE')
      and coalesce(qual,'') !~ 'is_admin' and coalesce(with_check,'') !~ 'is_admin'
  ) then raise exception 'A content mutation policy is not bound to active admin'; end if;

  if exists (
    select 1
    from (values
      ('anon','public.posts'), ('anon','public.files'), ('anon','public.faq'),
      ('anon','public.year_summaries'), ('anon','public.site_settings'),
      ('authenticated','public.categories')
    ) checked(role_name, relation_name)
    where has_table_privilege(role_name, relation_name, 'INSERT')
       or has_table_privilege(role_name, relation_name, 'UPDATE')
       or has_table_privilege(role_name, relation_name, 'DELETE')
  )
  then raise exception 'Unsafe anon or category table grant remains'; end if;

  if exists (select 1 from pg_roles where rolname in ('anon','authenticated','authenticator') and rolbypassrls)
  then raise exception 'An application role bypasses RLS'; end if;

  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='reorder_faq' and p.prosecdef
      and coalesce(array_to_string(p.proconfig, ','),'') like '%search_path=%'
  ) then raise exception 'FAQ reorder function is not fixed-search-path SECURITY DEFINER'; end if;

  if has_function_privilege('anon','public.reorder_faq(uuid[])','EXECUTE')
    or not has_function_privilege('authenticated','public.reorder_faq(uuid[])','EXECUTE')
  then raise exception 'FAQ reorder execute grants are incorrect'; end if;

  if exists (select 1 from storage.buckets where id in ('content-assets','downloads') and public)
    or (select count(*) from storage.buckets where id in ('content-assets','downloads')) <> 2
  then raise exception 'Phase 8 private buckets are missing or public'; end if;

  if exists (
    select 1 from pg_policies where schemaname='storage' and tablename='objects'
      and cmd in ('INSERT','UPDATE','DELETE') and coalesce(qual,with_check,'') !~ 'is_admin'
      and (coalesce(qual,'') like '%content-assets%' or coalesce(with_check,'') like '%content-assets%'
        or coalesce(qual,'') like '%downloads%' or coalesce(with_check,'') like '%downloads%')
  ) then raise exception 'Phase 8 Storage write policy is not bound to active admin'; end if;

  if exists (select 1 from public.posts where status='published' and published_at is null)
    or exists (select 1 from public.files where status='published' and published_at is null)
    or exists (select 1 from public.year_summaries where status='published' and published_at is null)
    or exists (select 1 from public.faq where sort_order < 0)
    or (select count(*) from public.site_settings where singleton_key=true) <> 1
    or exists (select 1 from public.year_summaries where jsonb_typeof(highlights)<>'array' or jsonb_typeof(statistics)<>'array')
  then raise exception 'A Phase 8 data invariant is violated'; end if;
end $$;

select true as phase8_schema_verified;
select true as phase8_rls_verified;
select true as phase8_grants_verified;
select true as phase8_functions_verified;
select true as phase8_storage_verified;
select true as phase8_invariants_verified;
rollback;
