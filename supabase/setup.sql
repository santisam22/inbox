-- Inbox: user log.
-- Paste into Supabase → SQL Editor → New query, then click Run. Safe to run more than once.
--
-- The app only holds the public (publishable) key, which anyone could extract from it.
-- So the app can't read, list or delete rows directly: it can only call the two
-- functions below, which record or remove its own install. You see the full list in
-- the dashboard (Table Editor → inbox_users).

create table if not exists public.inbox_users (
  install_id    uuid primary key,          -- random ID created on each Mac at first launch
  email         text,                      -- the iCloud address the user signed in with
  app_version   text,
  macos_version text,
  first_seen    timestamptz not null default now(),
  last_seen     timestamptz not null default now()
);

-- Row Level Security on, with no policies: the public key gets no direct access at all.
alter table public.inbox_users enable row level security;
revoke all on public.inbox_users from anon, authenticated;

-- Record (or refresh) this install. Called when someone signs in and once a day after.
create or replace function public.inbox_checkin(
  p_install_id uuid, p_email text, p_app_version text, p_macos_version text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_email is not null and (length(p_email) > 254 or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
    raise exception 'invalid email';
  end if;
  insert into inbox_users (install_id, email, app_version, macos_version)
  values (p_install_id, lower(p_email), left(p_app_version, 20), left(p_macos_version, 20))
  on conflict (install_id) do update set
    email         = coalesce(excluded.email, inbox_users.email),
    app_version   = excluded.app_version,
    macos_version = excluded.macos_version,
    last_seen     = now();
end $$;

-- Remove this install. Called when someone signs out of Inbox.
create or replace function public.inbox_forget(p_install_id uuid) returns void
language sql security definer set search_path = public as $$
  delete from inbox_users where install_id = p_install_id;
$$;

revoke all on function public.inbox_checkin(uuid, text, text, text) from public;
revoke all on function public.inbox_forget(uuid) from public;
grant execute on function public.inbox_checkin(uuid, text, text, text) to anon;
grant execute on function public.inbox_forget(uuid) to anon;
