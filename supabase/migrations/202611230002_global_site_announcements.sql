-- Global announcements for currently connected ROBLOX HUB visitors.
create table if not exists public.site_announcements (
  id bigint generated always as identity primary key,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_name text not null,
  message text not null check (char_length(message) between 1 and 280),
  created_at timestamptz not null default now()
);
alter table public.site_announcements enable row level security;
drop policy if exists "Anyone can read live announcements" on public.site_announcements;
create policy "Anyone can read live announcements" on public.site_announcements
  for select to anon, authenticated using (true);
grant select on public.site_announcements to anon, authenticated;
revoke all on sequence public.site_announcements_id_seq from anon, authenticated;

create or replace function public.send_site_announcement(announcement_text text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  caller_role text;
  profile_name text;
  clean_message text := btrim(coalesce(announcement_text, ''));
  new_id bigint;
begin
  if caller_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if char_length(clean_message) < 1 or char_length(clean_message) > 280 then
    raise exception 'MESSAGE_MUST_BE_1_TO_280_CHARACTERS';
  end if;

  select role into caller_role
  from public.site_user_roles
  where user_id = caller_id;

  if coalesce(caller_role, '') not in ('owner', 'admin') then
    raise exception 'FORBIDDEN';
  end if;

  if exists (
    select 1 from public.site_announcements
    where sender_id = caller_id and created_at > now() - interval '8 seconds'
  ) then
    raise exception 'PLEASE_WAIT_BEFORE_SENDING_ANOTHER_ANNOUNCEMENT';
  end if;

  select coalesce(nullif(btrim(display_name), ''), nullif(btrim(username), ''), 'Site Admin')
    into profile_name
  from public.profiles
  where id = caller_id;

  insert into public.site_announcements(sender_id, sender_name, message)
  values (caller_id, left(coalesce(profile_name, 'Site Admin'), 32), clean_message)
  returning id into new_id;

  return jsonb_build_object('success', true, 'id', new_id);
end;
$$;
revoke all on function public.send_site_announcement(text) from public, anon;
grant execute on function public.send_site_announcement(text) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'site_announcements'
  ) then
    alter publication supabase_realtime add table public.site_announcements;
  end if;
end $$;
