-- Owner-triggered global confetti and fireworks with realtime delivery.
create table if not exists public.site_effect_triggers (
  id uuid primary key default gen_random_uuid(),
  effect_type text not null check (effect_type in ('confetti','firework')),
  triggered_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.site_effect_triggers enable row level security;
drop policy if exists "Anyone can read global effect triggers" on public.site_effect_triggers;
create policy "Anyone can read global effect triggers" on public.site_effect_triggers
  for select to anon, authenticated using (true);
revoke all on public.site_effect_triggers from anon, authenticated;
grant select on public.site_effect_triggers to anon, authenticated;

create or replace function public.trigger_site_effect(effect_name text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare caller_role text; new_trigger_id uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select role into caller_role from public.site_user_roles where user_id = auth.uid();
  if coalesce(caller_role, '') <> 'owner' then raise exception 'OWNER_ONLY'; end if;
  if effect_name not in ('confetti','firework') then raise exception 'INVALID_EFFECT'; end if;
  insert into public.site_effect_triggers(effect_type, triggered_by)
    values (effect_name, auth.uid()) returning id into new_trigger_id;
  return jsonb_build_object('success', true, 'id', new_trigger_id, 'effect_type', effect_name);
end;
$$;
revoke all on function public.trigger_site_effect(text) from public, anon;
grant execute on function public.trigger_site_effect(text) to authenticated;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='site_effect_triggers') then
    alter publication supabase_realtime add table public.site_effect_triggers;
  end if;
end $$;
