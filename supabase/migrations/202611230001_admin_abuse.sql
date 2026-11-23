-- ROBLOX HUB public IDs, role management, and realtime Admin Abuse.
create sequence if not exists public.roblox_hub_public_id_seq start 1;
alter table public.profiles add column if not exists public_id text;
alter table public.profiles alter column public_id set default ('RH-' || lpad(nextval('public.roblox_hub_public_id_seq')::text, 6, '0'));
update public.profiles set public_id = 'RH-' || lpad(nextval('public.roblox_hub_public_id_seq')::text, 6, '0') where public_id is null;
create unique index if not exists profiles_public_id_key on public.profiles(public_id);

create table if not exists public.site_user_roles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check (role in ('owner','admin')),
 created_at timestamptz not null default now(),
 created_by uuid references auth.users(id)
);
alter table public.site_user_roles enable row level security;
create policy "Users can read own site role" on public.site_user_roles for select to authenticated using (auth.uid() = user_id);

create table if not exists public.site_admin_abuse (
 id boolean primary key default true check (id = true),
 active boolean not null default false,
 started_at timestamptz,
 started_by uuid references auth.users(id),
 updated_at timestamptz not null default now()
);
insert into public.site_admin_abuse(id,active) values(true,false) on conflict(id) do nothing;
alter table public.site_admin_abuse enable row level security;
create policy "Anyone can read active site event" on public.site_admin_abuse for select to anon, authenticated using (true);

create table if not exists public.site_admin_abuse_log (
 id bigint generated always as identity primary key,
 actor_id uuid references auth.users(id),
 action text not null check (action in ('start','stop')),
 created_at timestamptz not null default now()
);
alter table public.site_admin_abuse_log enable row level security;
create policy "Owner and admins can read abuse log" on public.site_admin_abuse_log for select to authenticated using (
 exists(select 1 from public.site_user_roles r where r.user_id=auth.uid() and r.role in ('owner','admin'))
);

create or replace function public.get_my_site_role()
returns text language sql stable security definer set search_path=public
as $$ select role from public.site_user_roles where user_id=auth.uid() limit 1 $$;
revoke all on function public.get_my_site_role() from public;
grant execute on function public.get_my_site_role() to authenticated;

create or replace function public.manage_site_admin(target_identifier text, make_admin boolean default true)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare target_user uuid; caller_role text;
begin
 select role into caller_role from public.site_user_roles where user_id=auth.uid();
 if coalesce(caller_role,'') <> 'owner' then raise exception 'OWNER_ONLY'; end if;
 select p.id into target_user from public.profiles p where lower(p.username)=lower(trim(target_identifier)) or upper(p.public_id)=upper(trim(target_identifier)) limit 1;
 if target_user is null then raise exception 'USER_NOT_FOUND'; end if;
 if target_user=auth.uid() then raise exception 'CANNOT_CHANGE_SELF'; end if;
 if make_admin then
   insert into public.site_user_roles(user_id,role,created_by) values(target_user,'admin',auth.uid())
   on conflict(user_id) do update set role='admin',created_by=auth.uid(),created_at=now();
 else delete from public.site_user_roles where user_id=target_user and role='admin'; end if;
 return jsonb_build_object('success',true,'user_id',target_user,'role',case when make_admin then 'admin' else 'user' end);
end $$;
revoke all on function public.manage_site_admin(text,boolean) from public;
grant execute on function public.manage_site_admin(text,boolean) to authenticated;

create or replace function public.set_site_admin_abuse(is_active boolean)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare caller_role text;
begin
 select role into caller_role from public.site_user_roles where user_id=auth.uid();
 if coalesce(caller_role,'') not in ('owner','admin') then raise exception 'FORBIDDEN'; end if;
 update public.site_admin_abuse set active=is_active, started_at=case when is_active then now() else null end,
 started_by=case when is_active then auth.uid() else null end, updated_at=now() where id=true;
 insert into public.site_admin_abuse_log(actor_id,action) values(auth.uid(),case when is_active then 'start' else 'stop' end);
 return jsonb_build_object('success',true,'active',is_active);
end $$;
revoke all on function public.set_site_admin_abuse(boolean) from public;
grant execute on function public.set_site_admin_abuse(boolean) to authenticated;

do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='site_admin_abuse') then
 alter publication supabase_realtime add table public.site_admin_abuse;
 end if;
end $$;
