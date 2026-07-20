begin;

-- Phase 8 evolves the legacy content tables in place. Existing URL columns are
-- deliberately retained for Phase 9 migration, but new writes use private
-- Storage paths exclusively.

alter table public.posts
  add column if not exists cover_storage_path text,
  add column if not exists cover_alt text,
  add column if not exists is_featured boolean not null default false,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

update public.posts set content = '' where content is null;
update public.posts
set published_at = coalesce(published_at, created_at, now())
where status = 'published' and published_at is null;

alter table public.posts
  alter column content set not null,
  drop constraint if exists posts_status_check,
  add constraint posts_status_check check (status in ('draft', 'published')),
  drop constraint if exists posts_publish_state_check,
  add constraint posts_publish_state_check check (status = 'draft' or published_at is not null),
  drop constraint if exists posts_title_length_check,
  add constraint posts_title_length_check check (char_length(btrim(title)) between 1 and 160),
  drop constraint if exists posts_slug_format_check,
  add constraint posts_slug_format_check check (
    char_length(slug) between 1 and 180
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  drop constraint if exists posts_excerpt_length_check,
  add constraint posts_excerpt_length_check check (excerpt is null or char_length(excerpt) <= 500),
  drop constraint if exists posts_content_length_check,
  add constraint posts_content_length_check check (char_length(content) between 1 and 100000) not valid,
  drop constraint if exists posts_cover_alt_length_check,
  add constraint posts_cover_alt_length_check check (cover_alt is null or char_length(cover_alt) <= 300);

create index if not exists posts_status_published_idx
  on public.posts (status, published_at desc, id);
create index if not exists posts_featured_published_idx
  on public.posts (is_featured, published_at desc, id);

alter table public.files
  add column if not exists storage_path text,
  add column if not exists original_filename text,
  add column if not exists mime_type text,
  add column if not exists size_bytes bigint,
  add column if not exists status text not null default 'draft',
  add column if not exists published_at timestamptz,
  add column if not exists sort_order integer not null default 0,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

alter table public.files alter column file_url drop not null;

update public.files
set published_at = coalesce(published_at, created_at, now())
where status = 'published' and published_at is null;

alter table public.files
  drop constraint if exists files_status_check,
  add constraint files_status_check check (status in ('draft', 'published')),
  drop constraint if exists files_publish_state_check,
  add constraint files_publish_state_check check (status = 'draft' or published_at is not null),
  drop constraint if exists files_title_length_check,
  add constraint files_title_length_check check (char_length(btrim(title)) between 1 and 200),
  drop constraint if exists files_academic_year_check,
  add constraint files_academic_year_check check (academic_year is null or academic_year between 90 and 200),
  drop constraint if exists files_size_bytes_check,
  add constraint files_size_bytes_check check (size_bytes is null or size_bytes > 0),
  drop constraint if exists files_sort_order_check,
  add constraint files_sort_order_check check (sort_order >= 0);

create index if not exists files_status_sort_idx
  on public.files (status, sort_order, published_at desc, id);
create index if not exists files_year_category_idx
  on public.files (academic_year desc, category, sort_order, id);

alter table public.faq
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

alter table public.faq
  alter column sort_order set not null,
  drop constraint if exists faq_question_length_check,
  add constraint faq_question_length_check check (char_length(btrim(question)) between 1 and 300),
  drop constraint if exists faq_answer_length_check,
  add constraint faq_answer_length_check check (char_length(btrim(answer)) between 1 and 10000),
  drop constraint if exists faq_sort_order_check,
  add constraint faq_sort_order_check check (sort_order >= 0);

create index if not exists faq_visibility_sort_idx
  on public.faq (is_visible, sort_order, id);

create table public.year_summaries (
  id uuid primary key default gen_random_uuid(),
  academic_year integer not null unique,
  title text not null,
  theme text,
  summary text not null,
  highlights jsonb not null default '[]'::jsonb,
  statistics jsonb not null default '[]'::jsonb,
  cover_storage_path text,
  cover_alt text,
  report_file_id uuid references public.files(id) on delete set null,
  status text not null default 'draft',
  published_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  constraint year_summaries_academic_year_check check (academic_year between 90 and 200),
  constraint year_summaries_title_length_check check (char_length(btrim(title)) between 1 and 200),
  constraint year_summaries_summary_length_check check (char_length(btrim(summary)) between 1 and 50000),
  constraint year_summaries_highlights_array_check check (jsonb_typeof(highlights) = 'array'),
  constraint year_summaries_statistics_array_check check (jsonb_typeof(statistics) = 'array'),
  constraint year_summaries_status_check check (status in ('draft', 'published')),
  constraint year_summaries_publish_state_check check (status = 'draft' or published_at is not null),
  constraint year_summaries_sort_order_check check (sort_order >= 0),
  constraint year_summaries_cover_alt_length_check check (cover_alt is null or char_length(cover_alt) <= 300)
);

create index year_summaries_status_year_idx
  on public.year_summaries (status, academic_year desc, sort_order, id);

alter table public.site_settings
  add column if not exists singleton_key boolean not null default false,
  add column if not exists hero_title text,
  add column if not exists hero_subtitle text,
  add column if not exists about_summary text,
  add column if not exists logo_storage_path text,
  add column if not exists youtube_url text,
  add column if not exists default_seo_title text,
  add column if not exists default_seo_description text,
  add column if not exists footer_text text,
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

with first_setting as (
  select id from public.site_settings order by created_at asc, id asc limit 1
)
update public.site_settings s
set singleton_key = (s.id = (select id from first_setting));

create unique index if not exists site_settings_singleton_true_idx
  on public.site_settings (singleton_key)
  where singleton_key = true;

insert into public.site_settings (
  singleton_key, site_name, club_name_zh, club_name_en, slogan,
  hero_title, hero_subtitle, about_summary, contact_text, email, phone,
  map_locations, default_seo_title, default_seo_description, footer_text
)
select
  true,
  'March Out For Love',
  '愛潮關懷社',
  'March Out For Love',
  '讓陪伴走進日常，讓關懷成為行動。',
  'March Out For Love',
  '以早餐開始陪伴，以行動實踐關懷',
  '愛潮關懷社以陪伴、服務與探索行動，連結青年與社區。',
  '歡迎社區、學校與志工夥伴與我們聯繫。',
  '',
  '',
  '[]'::jsonb,
  'March Out For Love | 愛潮關懷社',
  '愛潮關懷社以陪伴、服務與探索行動，連結青年與社區。',
  'March Out For Love／愛潮關懷社'
where not exists (select 1 from public.site_settings where singleton_key = true);

alter table public.site_settings
  alter column map_locations set default '[]'::jsonb,
  drop constraint if exists site_settings_map_locations_array_check,
  add constraint site_settings_map_locations_array_check check (
    map_locations is null or jsonb_typeof(map_locations) = 'array'
  );

create or replace function public.set_phase8_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_posts_phase8_updated_at on public.posts;
create trigger set_posts_phase8_updated_at before update on public.posts
for each row execute function public.set_phase8_updated_at();
drop trigger if exists set_files_phase8_updated_at on public.files;
create trigger set_files_phase8_updated_at before update on public.files
for each row execute function public.set_phase8_updated_at();
drop trigger if exists set_faq_phase8_updated_at on public.faq;
create trigger set_faq_phase8_updated_at before update on public.faq
for each row execute function public.set_phase8_updated_at();
drop trigger if exists set_year_summaries_phase8_updated_at on public.year_summaries;
create trigger set_year_summaries_phase8_updated_at before update on public.year_summaries
for each row execute function public.set_phase8_updated_at();
drop trigger if exists set_site_settings_phase8_updated_at on public.site_settings;
create trigger set_site_settings_phase8_updated_at before update on public.site_settings
for each row execute function public.set_phase8_updated_at();

create or replace function public.reorder_faq(p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_count integer;
begin
  if v_actor is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;
  if public.is_admin() is not true then
    raise exception 'ADMIN_REQUIRED' using errcode = 'P0001';
  end if;
  if p_ids is null or cardinality(p_ids) = 0 or cardinality(p_ids) > 500 then
    raise exception 'VALIDATION_ERROR' using errcode = 'P0001';
  end if;
  if (select count(distinct item) from unnest(p_ids) item) <> cardinality(p_ids) then
    raise exception 'VALIDATION_ERROR' using errcode = 'P0001';
  end if;
  select count(*) into v_count from public.faq where id = any(p_ids);
  if v_count <> cardinality(p_ids) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;

  update public.faq f
  set sort_order = ordered.position - 1,
      updated_by = v_actor
  from unnest(p_ids) with ordinality as ordered(id, position)
  where f.id = ordered.id;
end;
$$;

alter table public.posts enable row level security;
alter table public.files enable row level security;
alter table public.faq enable row level security;
alter table public.year_summaries enable row level security;
alter table public.site_settings enable row level security;
alter table public.categories enable row level security;

-- Remove every known Phase 1-4 broad policy before installing operation-specific policies.
drop policy if exists "Authenticated admins manage posts" on public.posts;
drop policy if exists "Authenticated admins manage files" on public.files;
drop policy if exists "Authenticated admins manage faq" on public.faq;
drop policy if exists "Authenticated admins manage site settings" on public.site_settings;
drop policy if exists "Authenticated admins manage categories" on public.categories;
drop policy if exists "Public can read published posts" on public.posts;
drop policy if exists "Public can read files" on public.files;
drop policy if exists "Public can read visible faq" on public.faq;
drop policy if exists "Public can read site settings" on public.site_settings;
drop policy if exists "Public can read categories" on public.categories;

create policy "Published posts are readable" on public.posts
for select to anon, authenticated
using (status = 'published' and published_at is not null and published_at <= now());
create policy "Active admins can read all posts" on public.posts
for select to authenticated using ((select public.is_admin()));
create policy "Active admins can insert posts" on public.posts
for insert to authenticated with check ((select public.is_admin()));
create policy "Active admins can update posts" on public.posts
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Active admins can delete posts" on public.posts
for delete to authenticated using ((select public.is_admin()));

create policy "Published files are readable" on public.files
for select to anon, authenticated
using (status = 'published' and published_at is not null and published_at <= now());
create policy "Active admins can read all files" on public.files
for select to authenticated using ((select public.is_admin()));
create policy "Active admins can insert files" on public.files
for insert to authenticated with check ((select public.is_admin()));
create policy "Active admins can update files" on public.files
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Active admins can delete files" on public.files
for delete to authenticated using ((select public.is_admin()));

create policy "Visible FAQ is readable" on public.faq
for select to anon, authenticated using (is_visible = true);
create policy "Active admins can read all FAQ" on public.faq
for select to authenticated using ((select public.is_admin()));
create policy "Active admins can insert FAQ" on public.faq
for insert to authenticated with check ((select public.is_admin()));
create policy "Active admins can update FAQ" on public.faq
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Active admins can delete FAQ" on public.faq
for delete to authenticated using ((select public.is_admin()));

create policy "Published year summaries are readable" on public.year_summaries
for select to anon, authenticated
using (status = 'published' and published_at is not null and published_at <= now());
create policy "Active admins can read all year summaries" on public.year_summaries
for select to authenticated using ((select public.is_admin()));
create policy "Active admins can insert year summaries" on public.year_summaries
for insert to authenticated with check ((select public.is_admin()));
create policy "Active admins can update year summaries" on public.year_summaries
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Active admins can delete year summaries" on public.year_summaries
for delete to authenticated using ((select public.is_admin()));

create policy "Singleton site settings are readable" on public.site_settings
for select to anon, authenticated using (singleton_key = true);
create policy "Active admins can read site settings" on public.site_settings
for select to authenticated using ((select public.is_admin()));
create policy "Active admins can update site settings" on public.site_settings
for update to authenticated
using (singleton_key = true and (select public.is_admin()))
with check (singleton_key = true and (select public.is_admin()));

create policy "Categories are read only" on public.categories
for select to anon, authenticated using (true);

revoke all on table public.posts from public, anon, authenticated;
revoke all on table public.files from public, anon, authenticated;
revoke all on table public.faq from public, anon, authenticated;
revoke all on table public.year_summaries from public, anon, authenticated;
revoke all on table public.site_settings from public, anon, authenticated;
revoke all on table public.categories from public, anon, authenticated;
grant select on table public.posts, public.files, public.faq, public.year_summaries, public.site_settings, public.categories to anon;
grant select, insert, update, delete on table public.posts, public.files, public.faq, public.year_summaries to authenticated;
grant select, update on table public.site_settings to authenticated;
grant select on table public.categories to authenticated;

revoke all on function public.set_phase8_updated_at() from public, anon, authenticated;
revoke all on function public.reorder_faq(uuid[]) from public, anon, authenticated;
grant execute on function public.reorder_faq(uuid[]) to authenticated;

-- Retire Phase 1-4 public buckets without deleting any legacy objects.
update storage.buckets set public = false where id in ('activity-images', 'public-files');
drop policy if exists "Public can read public storage" on storage.objects;
drop policy if exists "Authenticated admins manage public storage" on storage.objects;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'content-assets', 'content-assets', false, 10485760,
  array['image/jpeg','image/png','image/webp']::text[]
), (
  'downloads', 'downloads', false, 20971520,
  array[
    'application/pdf','text/plain','image/jpeg','image/png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]::text[]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Published content assets are readable" on storage.objects;
create policy "Published content assets are readable" on storage.objects
for select to anon, authenticated
using (
  bucket_id = 'content-assets'
  and (
    ((storage.foldername(name))[1] = 'posts' and exists (
      select 1 from public.posts p
      where p.id::text = (storage.foldername(name))[2]
        and p.status = 'published' and p.published_at is not null and p.published_at <= now()
    ))
    or
    ((storage.foldername(name))[1] = 'years' and exists (
      select 1 from public.year_summaries y
      where y.id::text = (storage.foldername(name))[2]
        and y.status = 'published' and y.published_at is not null and y.published_at <= now()
    ))
  )
);

drop policy if exists "Active admins can read content assets" on storage.objects;
create policy "Active admins can read content assets" on storage.objects
for select to authenticated using (bucket_id = 'content-assets' and (select public.is_admin()));
drop policy if exists "Active admins can insert content assets" on storage.objects;
create policy "Active admins can insert content assets" on storage.objects
for insert to authenticated with check (
  bucket_id = 'content-assets'
  and (select public.is_admin())
  and (storage.foldername(name))[1] in ('posts','years')
  and lower(storage.extension(name)) in ('jpg','jpeg','png','webp')
  and (
    ((storage.foldername(name))[1] = 'posts' and exists (
      select 1 from public.posts p where p.id::text = (storage.foldername(name))[2]
    ))
    or
    ((storage.foldername(name))[1] = 'years' and exists (
      select 1 from public.year_summaries y where y.id::text = (storage.foldername(name))[2]
    ))
  )
);
drop policy if exists "Active admins can delete content assets" on storage.objects;
create policy "Active admins can delete content assets" on storage.objects
for delete to authenticated using (bucket_id = 'content-assets' and (select public.is_admin()));

drop policy if exists "Published downloads are readable" on storage.objects;
create policy "Published downloads are readable" on storage.objects
for select to anon, authenticated
using (
  bucket_id = 'downloads'
  and (storage.foldername(name))[1] = 'files'
  and exists (
    select 1 from public.files f
    where f.id::text = (storage.foldername(name))[2]
      and f.status = 'published' and f.published_at is not null and f.published_at <= now()
  )
);
drop policy if exists "Active admins can read downloads" on storage.objects;
create policy "Active admins can read downloads" on storage.objects
for select to authenticated using (bucket_id = 'downloads' and (select public.is_admin()));
drop policy if exists "Active admins can insert downloads" on storage.objects;
create policy "Active admins can insert downloads" on storage.objects
for insert to authenticated with check (
  bucket_id = 'downloads'
  and (select public.is_admin())
  and (storage.foldername(name))[1] = 'files'
  and lower(storage.extension(name)) in ('pdf','txt','jpg','jpeg','png','docx','xlsx','pptx')
  and exists (
    select 1 from public.files f where f.id::text = (storage.foldername(name))[2]
  )
);
drop policy if exists "Active admins can delete downloads" on storage.objects;
create policy "Active admins can delete downloads" on storage.objects
for delete to authenticated using (bucket_id = 'downloads' and (select public.is_admin()));

commit;
