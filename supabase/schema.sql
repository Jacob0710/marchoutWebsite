create extension if not exists pgcrypto;

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  academic_year int not null,
  activity_type text not null check (activity_type in ('regular', 'project', 'exploration')),
  event_date date,
  location text,
  participants_count int default 0,
  result_summary text,
  content text,
  cover_image_url text,
  video_url text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  is_featured boolean not null default false,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists activity_images (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid references activities(id) on delete cascade,
  image_url text not null,
  caption text,
  sort_order int default 0,
  created_at timestamptz not null default now()
);

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  excerpt text,
  content text,
  cover_image_url text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists files (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  file_url text not null,
  file_type text,
  academic_year int,
  activity_id uuid references activities(id) on delete set null,
  category text,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  type text not null check (type in ('activity', 'post', 'file')),
  created_at timestamptz not null default now()
);

create table if not exists faq (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  sort_order int default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists site_settings (
  id uuid primary key default gen_random_uuid(),
  site_name text default 'March Out For Love',
  club_name_zh text default '愛潮關懷社',
  club_name_en text default 'March Out For Love',
  slogan text default '讓陪伴走進日常，讓關懷成為行動。',
  logo_url text,
  facebook_url text,
  instagram_url text,
  contact_text text,
  email text,
  phone text,
  map_locations jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists activities_slug_idx on activities(slug);
create index if not exists activities_status_idx on activities(status);
create index if not exists activities_year_idx on activities(academic_year);
create index if not exists posts_slug_idx on posts(slug);
create index if not exists posts_status_idx on posts(status);
create index if not exists files_year_idx on files(academic_year);
create index if not exists faq_sort_order_idx on faq(sort_order);

alter table activities enable row level security;
alter table activity_images enable row level security;
alter table posts enable row level security;
alter table files enable row level security;
alter table categories enable row level security;
alter table faq enable row level security;
alter table site_settings enable row level security;

drop policy if exists "Public can read published activities" on activities;
create policy "Public can read published activities"
on activities for select
using (status = 'published');

drop policy if exists "Authenticated admins manage activities" on activities;
create policy "Authenticated admins manage activities"
on activities for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "Public can read activity images" on activity_images;
create policy "Public can read activity images"
on activity_images for select
using (
  exists (
    select 1 from activities
    where activities.id = activity_images.activity_id
    and activities.status = 'published'
  )
);

drop policy if exists "Authenticated admins manage activity images" on activity_images;
create policy "Authenticated admins manage activity images"
on activity_images for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "Public can read published posts" on posts;
create policy "Public can read published posts"
on posts for select
using (status = 'published');

drop policy if exists "Authenticated admins manage posts" on posts;
create policy "Authenticated admins manage posts"
on posts for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "Public can read files" on files;
create policy "Public can read files"
on files for select
using (true);

drop policy if exists "Authenticated admins manage files" on files;
create policy "Authenticated admins manage files"
on files for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "Public can read categories" on categories;
create policy "Public can read categories"
on categories for select
using (true);

drop policy if exists "Authenticated admins manage categories" on categories;
create policy "Authenticated admins manage categories"
on categories for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "Public can read visible faq" on faq;
create policy "Public can read visible faq"
on faq for select
using (is_visible = true);

drop policy if exists "Authenticated admins manage faq" on faq;
create policy "Authenticated admins manage faq"
on faq for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "Public can read site settings" on site_settings;
create policy "Public can read site settings"
on site_settings for select
using (true);

drop policy if exists "Authenticated admins manage site settings" on site_settings;
create policy "Authenticated admins manage site settings"
on site_settings for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

insert into storage.buckets (id, name, public)
values
  ('activity-images', 'activity-images', true),
  ('public-files', 'public-files', true)
on conflict (id) do nothing;

drop policy if exists "Public can read public storage" on storage.objects;
create policy "Public can read public storage"
on storage.objects for select
using (bucket_id in ('activity-images', 'public-files'));

drop policy if exists "Authenticated admins manage public storage" on storage.objects;
create policy "Authenticated admins manage public storage"
on storage.objects for all
using (auth.role() = 'authenticated' and bucket_id in ('activity-images', 'public-files'))
with check (auth.role() = 'authenticated' and bucket_id in ('activity-images', 'public-files'));
