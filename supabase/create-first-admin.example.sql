-- Replace the placeholder with the UUID from Supabase Authentication > Users.
-- Never commit a real UUID, email address, or password to this file.
insert into public.admin_users (user_id, is_active)
values ('00000000-0000-0000-0000-000000000000', true)
on conflict (user_id)
do update set
  is_active = excluded.is_active,
  updated_at = now();
