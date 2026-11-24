create table if not exists public.hub_user_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Player',
  is_online boolean not null default true,
  last_seen timestamptz not null default now()
);
alter table public.hub_user_presence enable row level security;
grant select, insert, update on public.hub_user_presence to authenticated;
drop policy if exists "Users can publish own presence" on public.hub_user_presence;
create policy "Users can publish own presence" on public.hub_user_presence
for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users can update own presence" on public.hub_user_presence;
create policy "Users can update own presence" on public.hub_user_presence
for update to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
drop policy if exists "Only owner can read presence" on public.hub_user_presence;
drop policy if exists "Users can read own presence or owner reads all" on public.hub_user_presence;
create policy "Users can read own presence or owner reads all" on public.hub_user_presence
for select to authenticated using (
  (select auth.uid()) = user_id
  or exists (select 1 from public.site_user_roles r
    where r.user_id = (select auth.uid()) and r.role = 'owner')
);
create or replace function public.set_hub_presence_display_name()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select coalesce(nullif(trim(p.display_name), ''), nullif(trim(p.username), ''), 'Player')
    into new.display_name from public.profiles p where p.id = new.user_id;
  if new.display_name is null or trim(new.display_name) = '' then new.display_name := 'Player'; end if;
  return new;
end;
$$;
revoke all on function public.set_hub_presence_display_name() from public, anon, authenticated;
drop trigger if exists hub_presence_set_display_name on public.hub_user_presence;
create trigger hub_presence_set_display_name before insert or update of user_id, display_name
on public.hub_user_presence for each row execute function public.set_hub_presence_display_name();
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime'
    and schemaname='public' and tablename='hub_user_presence') then
    alter publication supabase_realtime add table public.hub_user_presence;
  end if;
end $$;
