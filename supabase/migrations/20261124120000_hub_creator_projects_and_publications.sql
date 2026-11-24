create table if not exists public.hub_creator_projects (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 title text not null default 'Untitled World' check(char_length(btrim(title)) between 2 and 60),
 description text not null default '' check(char_length(description)<=500),
 engine text not null check(engine in ('2d','3d')),
 template text not null default 'blank' check(template in ('blank','obby','adventure','platformer','puzzle','runner')),
 scene jsonb not null default '{"schemaVersion":1,"objects":[]}'::jsonb check(jsonb_typeof(scene)='object'),
 status text not null default 'draft' check(status in ('draft','archived')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.hub_creator_projects enable row level security;
drop policy if exists "Creators read own projects" on public.hub_creator_projects;
create policy "Creators read own projects" on public.hub_creator_projects for select to authenticated using((select auth.uid())=owner_id);
drop policy if exists "Creators create own projects" on public.hub_creator_projects;
create policy "Creators create own projects" on public.hub_creator_projects for insert to authenticated with check((select auth.uid())=owner_id);
drop policy if exists "Creators update own projects" on public.hub_creator_projects;
create policy "Creators update own projects" on public.hub_creator_projects for update to authenticated using((select auth.uid())=owner_id) with check((select auth.uid())=owner_id);
drop policy if exists "Creators delete own projects" on public.hub_creator_projects;
create policy "Creators delete own projects" on public.hub_creator_projects for delete to authenticated using((select auth.uid())=owner_id);
grant select,insert,update,delete on public.hub_creator_projects to authenticated;
create index if not exists hub_creator_projects_owner_updated_idx on public.hub_creator_projects(owner_id,updated_at desc);

create table if not exists public.hub_creator_publications (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null unique references public.hub_creator_projects(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(char_length(btrim(title)) between 2 and 60),
 description text not null default '' check(char_length(description)<=500),
 engine text not null check(engine in ('2d','3d')),
 template text not null default 'blank',
 scene jsonb not null check(jsonb_typeof(scene)='object'),
 published_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.hub_creator_publications enable row level security;
drop policy if exists "Anyone can discover published creator worlds" on public.hub_creator_publications;
create policy "Anyone can discover published creator worlds" on public.hub_creator_publications for select to anon,authenticated using(true);
drop policy if exists "Creators publish own projects" on public.hub_creator_publications;
create policy "Creators publish own projects" on public.hub_creator_publications for insert to authenticated with check(
 (select auth.uid())=owner_id and exists(select 1 from public.hub_creator_projects p where p.id=project_id and p.owner_id=(select auth.uid()))
);
drop policy if exists "Creators update own publications" on public.hub_creator_publications;
create policy "Creators update own publications" on public.hub_creator_publications for update to authenticated using((select auth.uid())=owner_id) with check(
 (select auth.uid())=owner_id and exists(select 1 from public.hub_creator_projects p where p.id=project_id and p.owner_id=(select auth.uid()))
);
drop policy if exists "Creators unpublish own worlds" on public.hub_creator_publications;
create policy "Creators unpublish own worlds" on public.hub_creator_publications for delete to authenticated using((select auth.uid())=owner_id);
grant select on public.hub_creator_publications to anon,authenticated;
grant insert,update,delete on public.hub_creator_publications to authenticated;
create index if not exists hub_creator_publications_recent_idx on public.hub_creator_publications(published_at desc);
create index if not exists hub_creator_publications_owner_idx on public.hub_creator_publications(owner_id,published_at desc);