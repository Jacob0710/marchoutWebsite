begin;

alter table public.admin_users
  add column if not exists granted_at timestamptz,
  add column if not exists granted_by uuid references auth.users(id),
  add column if not exists deactivated_at timestamptz,
  add column if not exists deactivated_by uuid references auth.users(id);

update public.admin_users
set granted_at = coalesce(granted_at, created_at, now())
where granted_at is null;

update public.admin_users
set deactivated_at = coalesce(deactivated_at, updated_at, now())
where is_active = false
  and deactivated_at is null;

alter table public.admin_users
  alter column granted_at set not null,
  alter column granted_at set default now(),
  drop constraint if exists admin_users_access_state_check,
  add constraint admin_users_access_state_check check (
    (is_active = true and deactivated_at is null and deactivated_by is null)
    or
    (is_active = false and deactivated_at is not null)
  );

create table public.admin_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token_hash bytea not null unique,
  expires_at timestamptz not null,
  invited_by uuid not null references auth.users(id),
  accepted_by uuid references auth.users(id),
  accepted_at timestamptz,
  revoked_by uuid references auth.users(id),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_invitations_email_check check (
    email = lower(btrim(email))
    and char_length(email) between 3 and 254
    and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  constraint admin_invitations_expiry_check check (expires_at > created_at),
  constraint admin_invitations_terminal_state_check check (
    not (accepted_at is not null and revoked_at is not null)
    and ((accepted_at is null) = (accepted_by is null))
    and ((revoked_at is null) = (revoked_by is null))
  )
);

create unique index admin_invitations_one_unconsumed_email_idx
  on public.admin_invitations (email)
  where accepted_at is null and revoked_at is null;

create index admin_invitations_status_created_idx
  on public.admin_invitations (accepted_at, revoked_at, expires_at, created_at desc, id desc);

create table public.admin_access_audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id),
  action text not null,
  target_user_id uuid references auth.users(id),
  target_email text,
  invitation_id uuid references public.admin_invitations(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_access_audit_action_check check (action in (
    'invitation_created',
    'invitation_revoked',
    'invitation_accepted',
    'admin_activated',
    'admin_deactivated'
  )),
  constraint admin_access_audit_target_email_check check (
    target_email is null or (
      target_email = lower(btrim(target_email))
      and char_length(target_email) <= 254
    )
  ),
  constraint admin_access_audit_metadata_object_check check (jsonb_typeof(metadata) = 'object')
);

create index admin_access_audit_logs_created_idx
  on public.admin_access_audit_logs (created_at desc, id desc);

create index admin_access_audit_logs_action_created_idx
  on public.admin_access_audit_logs (action, created_at desc, id desc);

create or replace function public.set_phase7_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_admin_users_phase7_updated_at on public.admin_users;
create trigger set_admin_users_phase7_updated_at
before update on public.admin_users
for each row execute function public.set_phase7_updated_at();

drop trigger if exists set_admin_invitations_updated_at on public.admin_invitations;
create trigger set_admin_invitations_updated_at
before update on public.admin_invitations
for each row execute function public.set_phase7_updated_at();

create or replace function public.prevent_admin_access_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'AUDIT_LOG_APPEND_ONLY' using errcode = '55000';
end;
$$;

create trigger prevent_admin_access_audit_mutation
before update or delete on public.admin_access_audit_logs
for each row execute function public.prevent_admin_access_audit_mutation();

alter table public.admin_users enable row level security;
alter table public.admin_invitations enable row level security;
alter table public.admin_access_audit_logs enable row level security;

revoke all on table public.admin_users from public, anon, authenticated;
revoke all on table public.admin_invitations from public, anon, authenticated;
revoke all on table public.admin_access_audit_logs from public, anon, authenticated;
revoke all on sequence public.admin_access_audit_logs_id_seq from public, anon, authenticated;

create or replace function public.create_admin_invitation(
  p_email text,
  p_expires_in_days integer default 7
)
returns table (
  invitation_id uuid,
  invitation_email text,
  invitation_expires_at timestamptz,
  raw_token text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_days integer := coalesce(p_expires_in_days, 7);
  v_existing_active boolean;
  v_expired public.admin_invitations%rowtype;
  v_invitation public.admin_invitations%rowtype;
  v_raw_token text;
begin
  if v_actor is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;
  if public.is_admin() is not true then
    raise exception 'ADMIN_REQUIRED' using errcode = 'P0001';
  end if;
  if char_length(v_email) < 3
    or char_length(v_email) > 254
    or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  then
    raise exception 'VALIDATION_ERROR' using errcode = 'P0001';
  end if;
  if v_days < 1 or v_days > 30 then
    raise exception 'VALIDATION_ERROR' using errcode = 'P0001';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('admin-invitation:' || v_email, 0));

  select a.is_active
  into v_existing_active
  from auth.users u
  join public.admin_users a on a.user_id = u.id
  where lower(btrim(u.email)) = v_email
  limit 1;

  if found then
    if v_existing_active then
      raise exception 'ADMIN_ALREADY_ACTIVE' using errcode = 'P0001';
    end if;
    raise exception 'ADMIN_INACTIVE' using errcode = 'P0001';
  end if;

  for v_expired in
    select i.*
    from public.admin_invitations i
    where i.email = v_email
      and i.accepted_at is null
      and i.revoked_at is null
      and i.expires_at <= now()
    for update
  loop
    update public.admin_invitations
    set revoked_at = now(), revoked_by = v_actor
    where id = v_expired.id;

    insert into public.admin_access_audit_logs (
      actor_user_id, action, target_email, invitation_id, metadata
    ) values (
      v_actor, 'invitation_revoked', v_email, v_expired.id,
      jsonb_build_object('reason', 'expired_replaced')
    );
  end loop;

  if exists (
    select 1
    from public.admin_invitations i
    where i.email = v_email
      and i.accepted_at is null
      and i.revoked_at is null
  ) then
    raise exception 'INVITATION_CONFLICT' using errcode = 'P0001';
  end if;

  v_raw_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.admin_invitations (
    email, token_hash, expires_at, invited_by
  ) values (
    v_email,
    extensions.digest(pg_catalog.convert_to(v_raw_token, 'UTF8'), 'sha256'),
    now() + pg_catalog.make_interval(days => v_days),
    v_actor
  )
  returning * into v_invitation;

  insert into public.admin_access_audit_logs (
    actor_user_id, action, target_email, invitation_id,
    metadata
  ) values (
    v_actor, 'invitation_created', v_email, v_invitation.id,
    jsonb_build_object('expires_in_days', v_days)
  );

  return query select v_invitation.id, v_email, v_invitation.expires_at, v_raw_token;
end;
$$;

create or replace function public.accept_admin_invitation(p_token text)
returns table (
  admin_user_id uuid,
  admin_email text,
  admin_is_active boolean,
  invitation_accepted_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_email text;
  v_invitation public.admin_invitations%rowtype;
  v_existing public.admin_users%rowtype;
  v_was_active boolean := false;
  v_accepted_at timestamptz := now();
begin
  if v_actor is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    raise exception 'INVITATION_NOT_FOUND' using errcode = 'P0001';
  end if;

  select lower(btrim(coalesce(u.email, '')))
  into v_actor_email
  from auth.users u
  where u.id = v_actor;

  if v_actor_email is null or v_actor_email = '' then
    raise exception 'INVITATION_EMAIL_MISMATCH' using errcode = 'P0001';
  end if;

  select i.*
  into v_invitation
  from public.admin_invitations i
  where i.token_hash = extensions.digest(pg_catalog.convert_to(p_token, 'UTF8'), 'sha256')
  for update;

  if not found then
    raise exception 'INVITATION_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_invitation.accepted_at is not null then
    raise exception 'INVITATION_ALREADY_USED' using errcode = 'P0001';
  end if;
  if v_invitation.revoked_at is not null then
    raise exception 'INVITATION_REVOKED' using errcode = 'P0001';
  end if;
  if v_invitation.expires_at <= now() then
    raise exception 'INVITATION_EXPIRED' using errcode = 'P0001';
  end if;
  if v_actor_email <> v_invitation.email then
    raise exception 'INVITATION_EMAIL_MISMATCH' using errcode = 'P0001';
  end if;

  select a.*
  into v_existing
  from public.admin_users a
  where a.user_id = v_actor
  for update;

  if found then
    v_was_active := v_existing.is_active;
    if not v_existing.is_active then
      update public.admin_users
      set is_active = true,
          granted_at = v_accepted_at,
          granted_by = v_invitation.invited_by,
          deactivated_at = null,
          deactivated_by = null
      where user_id = v_actor;
    end if;
  else
    insert into public.admin_users (
      user_id, is_active, granted_at, granted_by,
      deactivated_at, deactivated_by
    ) values (
      v_actor, true, v_accepted_at, v_invitation.invited_by,
      null, null
    );
  end if;

  update public.admin_invitations
  set accepted_by = v_actor, accepted_at = v_accepted_at
  where id = v_invitation.id;

  insert into public.admin_access_audit_logs (
    actor_user_id, action, target_user_id, target_email,
    invitation_id, metadata
  ) values (
    v_actor, 'invitation_accepted', v_actor, v_actor_email,
    v_invitation.id, '{}'::jsonb
  );

  if not v_was_active then
    insert into public.admin_access_audit_logs (
      actor_user_id, action, target_user_id, target_email,
      invitation_id, metadata
    ) values (
      v_invitation.invited_by, 'admin_activated', v_actor, v_actor_email,
      v_invitation.id, jsonb_build_object('source', 'invitation')
    );
  end if;

  return query select v_actor, v_actor_email, true, v_accepted_at;
end;
$$;

create or replace function public.revoke_admin_invitation(p_invitation_id uuid)
returns table (
  invitation_id uuid,
  invitation_email text,
  invitation_revoked_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_invitation public.admin_invitations%rowtype;
begin
  if v_actor is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;
  if public.is_admin() is not true then
    raise exception 'ADMIN_REQUIRED' using errcode = 'P0001';
  end if;

  select i.*
  into v_invitation
  from public.admin_invitations i
  where i.id = p_invitation_id
  for update;

  if not found then
    raise exception 'INVITATION_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_invitation.accepted_at is not null then
    raise exception 'INVITATION_ALREADY_USED' using errcode = 'P0001';
  end if;
  if v_invitation.revoked_at is not null then
    return query select v_invitation.id, v_invitation.email, v_invitation.revoked_at;
    return;
  end if;

  update public.admin_invitations
  set revoked_at = now(), revoked_by = v_actor
  where id = v_invitation.id
  returning * into v_invitation;

  insert into public.admin_access_audit_logs (
    actor_user_id, action, target_email, invitation_id, metadata
  ) values (
    v_actor, 'invitation_revoked', v_invitation.email, v_invitation.id,
    jsonb_build_object(
      'reason', case when v_invitation.expires_at <= now() then 'expired' else 'manual' end
    )
  );

  return query select v_invitation.id, v_invitation.email, v_invitation.revoked_at;
end;
$$;

create or replace function public.set_admin_active(
  p_target_user_id uuid,
  p_is_active boolean
)
returns table (
  admin_user_id uuid,
  admin_email text,
  admin_is_active boolean,
  admin_granted_at timestamptz,
  admin_deactivated_at timestamptz,
  admin_updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_target public.admin_users%rowtype;
  v_target_email text;
  v_active_count bigint;
begin
  if v_actor is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;
  if p_target_user_id is null or p_is_active is null then
    raise exception 'VALIDATION_ERROR' using errcode = 'P0001';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('admin-users-active-guard', 0));

  if public.is_admin() is not true then
    raise exception 'ADMIN_REQUIRED' using errcode = 'P0001';
  end if;
  if p_target_user_id = v_actor and p_is_active = false then
    raise exception 'SELF_DEACTIVATION_FORBIDDEN' using errcode = 'P0001';
  end if;

  select a.*
  into v_target
  from public.admin_users a
  where a.user_id = p_target_user_id
  for update;

  if not found then
    raise exception 'ADMIN_NOT_FOUND' using errcode = 'P0001';
  end if;

  select lower(btrim(coalesce(u.email, '')))
  into v_target_email
  from auth.users u
  where u.id = p_target_user_id;
  if v_target.is_active = p_is_active then
    return query
    select v_target.user_id, v_target_email, v_target.is_active,
      v_target.granted_at, v_target.deactivated_at, v_target.updated_at;
    return;
  end if;

  if p_is_active = false then
    select count(*) into v_active_count
    from public.admin_users a
    where a.is_active = true;
    if v_active_count <= 1 then
      raise exception 'LAST_ACTIVE_ADMIN' using errcode = 'P0001';
    end if;

    update public.admin_users
    set is_active = false,
        deactivated_at = now(),
        deactivated_by = v_actor
    where user_id = p_target_user_id
    returning * into v_target;

    insert into public.admin_access_audit_logs (
      actor_user_id, action, target_user_id, target_email, metadata
    ) values (
      v_actor, 'admin_deactivated', p_target_user_id, v_target_email, '{}'::jsonb
    );
  else
    update public.admin_users
    set is_active = true,
        granted_at = now(),
        granted_by = v_actor,
        deactivated_at = null,
        deactivated_by = null
    where user_id = p_target_user_id
    returning * into v_target;

    insert into public.admin_access_audit_logs (
      actor_user_id, action, target_user_id, target_email, metadata
    ) values (
      v_actor, 'admin_activated', p_target_user_id, v_target_email,
      jsonb_build_object('source', 'manual')
    );
  end if;

  return query
  select v_target.user_id, v_target_email, v_target.is_active,
    v_target.granted_at, v_target.deactivated_at, v_target.updated_at;
end;
$$;

create or replace function public.list_admin_accounts()
returns table (
  admin_user_id uuid,
  admin_email text,
  admin_is_active boolean,
  admin_granted_at timestamptz,
  admin_deactivated_at timestamptz,
  admin_created_at timestamptz,
  admin_updated_at timestamptz,
  admin_last_sign_in_at timestamptz,
  admin_email_confirmed boolean,
  admin_is_current boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;
  if public.is_admin() is not true then
    raise exception 'ADMIN_REQUIRED' using errcode = 'P0001';
  end if;

  return query
  select
    a.user_id,
    lower(btrim(coalesce(u.email, ''))),
    a.is_active,
    a.granted_at,
    a.deactivated_at,
    a.created_at,
    a.updated_at,
    u.last_sign_in_at,
    u.email_confirmed_at is not null,
    a.user_id = auth.uid()
  from public.admin_users a
  join auth.users u on u.id = a.user_id
  order by a.is_active desc, lower(btrim(coalesce(u.email, ''))) asc, a.user_id asc;
end;
$$;

create or replace function public.list_admin_invitations(p_status text default 'all')
returns table (
  invitation_id uuid,
  invitation_email text,
  invitation_status text,
  invitation_expires_at timestamptz,
  invitation_invited_by_email text,
  invitation_accepted_by_email text,
  invitation_created_at timestamptz,
  invitation_accepted_at timestamptz,
  invitation_revoked_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;
  if public.is_admin() is not true then
    raise exception 'ADMIN_REQUIRED' using errcode = 'P0001';
  end if;
  if coalesce(p_status, 'all') not in ('all', 'pending', 'accepted', 'revoked', 'expired') then
    raise exception 'VALIDATION_ERROR' using errcode = 'P0001';
  end if;

  return query
  with safe_invitations as (
    select
      i.*,
      case
        when i.accepted_at is not null then 'accepted'
        when i.revoked_at is not null then 'revoked'
        when i.expires_at <= now() then 'expired'
        else 'pending'
      end as derived_status
    from public.admin_invitations i
  )
  select
    i.id,
    i.email,
    i.derived_status,
    i.expires_at,
    lower(btrim(coalesce(inviter.email, ''))),
    case when accepter.id is null then null else lower(btrim(coalesce(accepter.email, ''))) end,
    i.created_at,
    i.accepted_at,
    i.revoked_at
  from safe_invitations i
  join auth.users inviter on inviter.id = i.invited_by
  left join auth.users accepter on accepter.id = i.accepted_by
  where coalesce(p_status, 'all') = 'all' or i.derived_status = p_status
  order by
    case when i.derived_status = 'pending' then 0 else 1 end,
    i.created_at desc,
    i.id desc;
end;
$$;

create or replace function public.list_admin_access_audit_logs(
  p_limit integer default 50,
  p_cursor_created_at timestamptz default null,
  p_cursor_id bigint default null,
  p_action text default null
)
returns table (
  audit_id bigint,
  audit_actor_user_id uuid,
  audit_actor_email text,
  audit_action text,
  audit_target_user_id uuid,
  audit_target_email text,
  audit_invitation_id uuid,
  audit_metadata jsonb,
  audit_created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit integer := coalesce(p_limit, 50);
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;
  if public.is_admin() is not true then
    raise exception 'ADMIN_REQUIRED' using errcode = 'P0001';
  end if;
  if v_limit < 1 or v_limit > 100 then
    raise exception 'VALIDATION_ERROR' using errcode = 'P0001';
  end if;
  if (p_cursor_created_at is null) <> (p_cursor_id is null) then
    raise exception 'VALIDATION_ERROR' using errcode = 'P0001';
  end if;
  if p_action is not null and p_action not in (
    'invitation_created', 'invitation_revoked', 'invitation_accepted',
    'admin_activated', 'admin_deactivated'
  ) then
    raise exception 'VALIDATION_ERROR' using errcode = 'P0001';
  end if;

  return query
  select
    l.id,
    l.actor_user_id,
    case when actor.id is null then null else lower(btrim(coalesce(actor.email, ''))) end,
    l.action,
    l.target_user_id,
    coalesce(
      l.target_email,
      case when target.id is null then null else lower(btrim(coalesce(target.email, ''))) end
    ),
    l.invitation_id,
    l.metadata,
    l.created_at
  from public.admin_access_audit_logs l
  left join auth.users actor on actor.id = l.actor_user_id
  left join auth.users target on target.id = l.target_user_id
  where (p_action is null or l.action = p_action)
    and (
      p_cursor_created_at is null
      or (l.created_at, l.id) < (p_cursor_created_at, p_cursor_id)
    )
  order by l.created_at desc, l.id desc
  limit v_limit;
end;
$$;

revoke all on function public.set_phase7_updated_at() from public, anon, authenticated;
revoke all on function public.prevent_admin_access_audit_mutation() from public, anon, authenticated;

revoke all on function public.create_admin_invitation(text, integer) from public, anon, authenticated;
revoke all on function public.accept_admin_invitation(text) from public, anon, authenticated;
revoke all on function public.revoke_admin_invitation(uuid) from public, anon, authenticated;
revoke all on function public.set_admin_active(uuid, boolean) from public, anon, authenticated;
revoke all on function public.list_admin_accounts() from public, anon, authenticated;
revoke all on function public.list_admin_invitations(text) from public, anon, authenticated;
revoke all on function public.list_admin_access_audit_logs(integer, timestamptz, bigint, text) from public, anon, authenticated;

grant execute on function public.create_admin_invitation(text, integer) to authenticated;
grant execute on function public.accept_admin_invitation(text) to authenticated;
grant execute on function public.revoke_admin_invitation(uuid) to authenticated;
grant execute on function public.set_admin_active(uuid, boolean) to authenticated;
grant execute on function public.list_admin_accounts() to authenticated;
grant execute on function public.list_admin_invitations(text) to authenticated;
grant execute on function public.list_admin_access_audit_logs(integer, timestamptz, bigint, text) to authenticated;

commit;
