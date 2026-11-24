create table if not exists public.hub_site_maintenance (
  id boolean primary key default true check (id = true),
  is_active boolean not null default false,
  message text not null default 'ROBLOX HUB sedang menjalani perbaikan sementara. Silakan kembali beberapa saat lagi.',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

insert into public.hub_site_maintenance (id, is_active)
values (true, false)
on conflict (id) do nothing;

alter table public.hub_site_maintenance enable row level security;

grant select on public.hub_site_maintenance to anon, authenticated;
grant update (is_active, message, updated_at, updated_by)
on public.hub_site_maintenance to authenticated;

create policy "Maintenance status is publicly readable"
on public.hub_site_maintenance for select to anon, authenticated using (true);

create policy "Only owner can update maintenance status"
on public.hub_site_maintenance for update to authenticated
using ((select public.get_my_site_role()) = 'owner')
with check ((select public.get_my_site_role()) = 'owner');

alter publication supabase_realtime add table public.hub_site_maintenance;
