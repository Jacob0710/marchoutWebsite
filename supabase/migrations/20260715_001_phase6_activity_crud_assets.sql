begin;

alter table public.activities
  add column if not exists published_at timestamptz,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

alter table public.activities
  drop constraint if exists activities_slug_format_check,
  add constraint activities_slug_format_check
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$') not valid;

alter table public.activities
  drop constraint if exists activities_participants_count_check,
  add constraint activities_participants_count_check
    check (participants_count is null or participants_count >= 0) not valid;

create table if not exists public.activity_assets (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  kind text not null,
  storage_bucket text not null default 'activity-assets',
  storage_path text not null,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  alt_text text,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activity_assets_kind_check check (kind in ('image', 'attachment')),
  constraint activity_assets_bucket_check check (storage_bucket = 'activity-assets'),
  constraint activity_assets_storage_path_key unique (storage_path),
  constraint activity_assets_size_bytes_check check (size_bytes > 0),
  constraint activity_assets_sort_order_check check (sort_order >= 0)
);

create index if not exists activity_assets_activity_kind_sort_idx
  on public.activity_assets (activity_id, kind, sort_order, id);

create table if not exists public.activity_videos (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  url text not null,
  title text,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activity_videos_https_url_check check (url ~ '^https://[^[:space:]]+$'),
  constraint activity_videos_sort_order_check check (sort_order >= 0)
);

create index if not exists activity_videos_activity_sort_idx
  on public.activity_videos (activity_id, sort_order, id);

alter table public.activities
  add column if not exists cover_asset_id uuid;

alter table public.activities
  drop constraint if exists activities_cover_asset_id_fkey,
  add constraint activities_cover_asset_id_fkey
    foreign key (cover_asset_id) references public.activity_assets(id) on delete set null;

create index if not exists activities_cover_asset_id_idx
  on public.activities (cover_asset_id)
  where cover_asset_id is not null;

create or replace function public.set_phase6_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_activity_assets_updated_at on public.activity_assets;
create trigger set_activity_assets_updated_at
before update on public.activity_assets
for each row execute function public.set_phase6_updated_at();

drop trigger if exists set_activity_videos_updated_at on public.activity_videos;
create trigger set_activity_videos_updated_at
before update on public.activity_videos
for each row execute function public.set_phase6_updated_at();

alter table public.activity_assets enable row level security;
alter table public.activity_videos enable row level security;

drop policy if exists "Active admins can insert activities" on public.activities;
create policy "Active admins can insert activities"
on public.activities
for insert
to authenticated
with check ((select public.is_admin()));

drop policy if exists "Active admins can update activities" on public.activities;
create policy "Active admins can update activities"
on public.activities
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists "Active admins can delete activities" on public.activities;
create policy "Active admins can delete activities"
on public.activities
for delete
to authenticated
using ((select public.is_admin()));

drop policy if exists "Published activity assets are readable" on public.activity_assets;
create policy "Published activity assets are readable"
on public.activity_assets
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.activities
    where activities.id = activity_assets.activity_id
      and activities.status = 'published'
  )
);

drop policy if exists "Active admins can read all activity assets" on public.activity_assets;
create policy "Active admins can read all activity assets"
on public.activity_assets
for select
to authenticated
using ((select public.is_admin()));

drop policy if exists "Active admins can insert activity assets" on public.activity_assets;
create policy "Active admins can insert activity assets"
on public.activity_assets
for insert
to authenticated
with check ((select public.is_admin()));

drop policy if exists "Active admins can update activity assets" on public.activity_assets;
create policy "Active admins can update activity assets"
on public.activity_assets
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists "Active admins can delete activity assets" on public.activity_assets;
create policy "Active admins can delete activity assets"
on public.activity_assets
for delete
to authenticated
using ((select public.is_admin()));

drop policy if exists "Published activity videos are readable" on public.activity_videos;
create policy "Published activity videos are readable"
on public.activity_videos
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.activities
    where activities.id = activity_videos.activity_id
      and activities.status = 'published'
  )
);

drop policy if exists "Active admins can read all activity videos" on public.activity_videos;
create policy "Active admins can read all activity videos"
on public.activity_videos
for select
to authenticated
using ((select public.is_admin()));

drop policy if exists "Active admins can insert activity videos" on public.activity_videos;
create policy "Active admins can insert activity videos"
on public.activity_videos
for insert
to authenticated
with check ((select public.is_admin()));

drop policy if exists "Active admins can update activity videos" on public.activity_videos;
create policy "Active admins can update activity videos"
on public.activity_videos
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists "Active admins can delete activity videos" on public.activity_videos;
create policy "Active admins can delete activity videos"
on public.activity_videos
for delete
to authenticated
using ((select public.is_admin()));

revoke all on table public.activities from public, anon, authenticated;
revoke all on table public.activity_assets from public, anon, authenticated;
revoke all on table public.activity_videos from public, anon, authenticated;
grant select on table public.activities to anon;
grant select on table public.activity_assets to anon;
grant select on table public.activity_videos to anon;
grant select, insert, update, delete on table public.activities to authenticated;
grant select, insert, update, delete on table public.activity_assets to authenticated;
grant select, insert, update, delete on table public.activity_videos to authenticated;

revoke all on function public.set_phase6_updated_at() from public, anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'activity-assets',
  'activity-assets',
  false,
  20971520,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf', 'text/plain', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]::text[]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Published activity storage objects are readable" on storage.objects;
create policy "Published activity storage objects are readable"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'activity-assets'
  and (storage.foldername(name))[2] in ('image', 'attachment')
  and exists (
    select 1
    from public.activities
    where activities.id::text = (storage.foldername(name))[1]
      and activities.status = 'published'
  )
);

drop policy if exists "Active admins can read activity storage objects" on storage.objects;
create policy "Active admins can read activity storage objects"
on storage.objects
for select
to authenticated
using (bucket_id = 'activity-assets' and (select public.is_admin()));

drop policy if exists "Active admins can insert activity storage objects" on storage.objects;
create policy "Active admins can insert activity storage objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'activity-assets'
  and (select public.is_admin())
  and (storage.foldername(name))[2] in ('image', 'attachment')
  and lower(storage.extension(name)) in (
    'jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf', 'txt',
    'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'
  )
  and exists (
    select 1
    from public.activities
    where activities.id::text = (storage.foldername(name))[1]
  )
);

drop policy if exists "Active admins can delete activity storage objects" on storage.objects;
create policy "Active admins can delete activity storage objects"
on storage.objects
for delete
to authenticated
using (bucket_id = 'activity-assets' and (select public.is_admin()));

commit;
