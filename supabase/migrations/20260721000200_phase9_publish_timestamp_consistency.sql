begin;

-- Application and database clocks can differ by milliseconds. Public RLS uses
-- database now(), so publication transitions must use the same clock to avoid a
-- transient public 404 immediately after a successful publish response.
create or replace function public.set_phase9_publication_timestamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and old.status is distinct from 'published' then
    new.published_at = now();
  elsif new.status = 'draft' then
    new.published_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists set_activities_phase9_publication_timestamp on public.activities;
create trigger set_activities_phase9_publication_timestamp
before update of status on public.activities
for each row execute function public.set_phase9_publication_timestamp();

drop trigger if exists set_posts_phase9_publication_timestamp on public.posts;
create trigger set_posts_phase9_publication_timestamp
before update of status on public.posts
for each row execute function public.set_phase9_publication_timestamp();

drop trigger if exists set_files_phase9_publication_timestamp on public.files;
create trigger set_files_phase9_publication_timestamp
before update of status on public.files
for each row execute function public.set_phase9_publication_timestamp();

drop trigger if exists set_year_summaries_phase9_publication_timestamp on public.year_summaries;
create trigger set_year_summaries_phase9_publication_timestamp
before update of status on public.year_summaries
for each row execute function public.set_phase9_publication_timestamp();

revoke all on function public.set_phase9_publication_timestamp() from public, anon, authenticated;

commit;
