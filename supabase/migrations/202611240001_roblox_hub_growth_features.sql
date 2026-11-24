-- ROBLOX HUB growth layer: saves, reviews, news, notifications, trends and owner analytics.
create table if not exists public.roblox_game_saves (
  user_id uuid not null references auth.users(id) on delete cascade,
  place_id bigint not null check (place_id > 0),
  game_name text not null check (char_length(btrim(game_name)) between 1 and 120),
  game_url text not null check (game_url like 'https://www.roblox.com/games/%'),
  thumbnail_url text,
  created_at timestamptz not null default now(),
  primary key (user_id, place_id)
);
alter table public.roblox_game_saves enable row level security;
drop policy if exists "Players read own Roblox saves" on public.roblox_game_saves;
create policy "Players read own Roblox saves" on public.roblox_game_saves for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Players save Roblox games" on public.roblox_game_saves;
create policy "Players save Roblox games" on public.roblox_game_saves for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Players remove own Roblox saves" on public.roblox_game_saves;
create policy "Players remove own Roblox saves" on public.roblox_game_saves for delete to authenticated using ((select auth.uid()) = user_id);
grant select, insert, delete on public.roblox_game_saves to authenticated;
create index if not exists roblox_game_saves_place_idx on public.roblox_game_saves(place_id);

create table if not exists public.roblox_game_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  place_id bigint not null check (place_id > 0),
  game_name text not null check (char_length(btrim(game_name)) between 1 and 120),
  rating smallint not null check (rating between 1 and 5),
  review text not null check (char_length(btrim(review)) between 2 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, place_id)
);
alter table public.roblox_game_reviews enable row level security;
drop policy if exists "Public can read game reviews" on public.roblox_game_reviews;
create policy "Public can read game reviews" on public.roblox_game_reviews for select to anon, authenticated using (true);
drop policy if exists "Players write own game reviews" on public.roblox_game_reviews;
create policy "Players write own game reviews" on public.roblox_game_reviews for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Players update own game reviews" on public.roblox_game_reviews;
create policy "Players update own game reviews" on public.roblox_game_reviews for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Players delete own game reviews" on public.roblox_game_reviews;
create policy "Players delete own game reviews" on public.roblox_game_reviews for delete to authenticated using ((select auth.uid()) = user_id);
grant select on public.roblox_game_reviews to anon, authenticated;
grant insert, update, delete on public.roblox_game_reviews to authenticated;
create index if not exists roblox_game_reviews_place_idx on public.roblox_game_reviews(place_id, created_at desc);

create table if not exists public.hub_game_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  place_id bigint not null check (place_id > 0),
  game_name text not null check (char_length(btrim(game_name)) between 1 and 120),
  event_type text not null default 'open' check (event_type in ('open')),
  created_at timestamptz not null default now()
);
alter table public.hub_game_events enable row level security;
drop policy if exists "Players record own game opens" on public.hub_game_events;
create policy "Players record own game opens" on public.hub_game_events for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Owners read hub game analytics" on public.hub_game_events;
create policy "Owners read hub game analytics" on public.hub_game_events for select to authenticated using (exists(select 1 from public.site_user_roles r where r.user_id=(select auth.uid()) and r.role in ('owner','admin')));
grant insert, select on public.hub_game_events to authenticated;
create index if not exists hub_game_events_created_idx on public.hub_game_events(created_at desc);
create index if not exists hub_game_events_place_idx on public.hub_game_events(place_id, created_at desc);

create table if not exists public.hub_news (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 4 and 100),
  summary text not null check (char_length(btrim(summary)) between 10 and 240),
  body text not null check (char_length(btrim(body)) between 10 and 5000),
  category text not null default 'UPDATE' check (category in ('UPDATE','ROBLOX','COMMUNITY','EVENT')),
  published_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.hub_news enable row level security;
drop policy if exists "Public can read published hub news" on public.hub_news;
create policy "Public can read published hub news" on public.hub_news for select to anon, authenticated using (published_at is not null and published_at <= now());
drop policy if exists "Site staff publish hub news" on public.hub_news;
create policy "Site staff publish hub news" on public.hub_news for insert to authenticated with check (author_id = (select auth.uid()) and exists(select 1 from public.site_user_roles r where r.user_id=(select auth.uid()) and r.role in ('owner','admin')));
drop policy if exists "Site staff edit hub news" on public.hub_news;
create policy "Site staff edit hub news" on public.hub_news for update to authenticated using (exists(select 1 from public.site_user_roles r where r.user_id=(select auth.uid()) and r.role in ('owner','admin'))) with check (exists(select 1 from public.site_user_roles r where r.user_id=(select auth.uid()) and r.role in ('owner','admin')));
drop policy if exists "Site staff delete hub news" on public.hub_news;
create policy "Site staff delete hub news" on public.hub_news for delete to authenticated using (exists(select 1 from public.site_user_roles r where r.user_id=(select auth.uid()) and r.role in ('owner','admin')));
grant select on public.hub_news to anon, authenticated;
grant insert, update, delete on public.hub_news to authenticated;
create index if not exists hub_news_published_idx on public.hub_news(published_at desc) where published_at is not null;

create table if not exists public.hub_notifications (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 2 and 100),
  body text not null check (char_length(btrim(body)) between 2 and 500),
  kind text not null default 'announcement' check (kind in ('announcement','news','community','system')),
  href text,
  created_at timestamptz not null default now()
);
alter table public.hub_notifications enable row level security;
drop policy if exists "Players read broadcast or own notifications" on public.hub_notifications;
create policy "Players read broadcast or own notifications" on public.hub_notifications for select to authenticated using (user_id is null or user_id = (select auth.uid()));
drop policy if exists "Site staff create notifications" on public.hub_notifications;
create policy "Site staff create notifications" on public.hub_notifications for insert to authenticated with check (exists(select 1 from public.site_user_roles r where r.user_id=(select auth.uid()) and r.role in ('owner','admin')));
grant select, insert on public.hub_notifications to authenticated;
create index if not exists hub_notifications_user_idx on public.hub_notifications(user_id, created_at desc);

create or replace function public.mirror_site_announcement_notification()
returns trigger language plpgsql set search_path = ''
as $$
begin
  insert into public.hub_notifications(user_id,title,body,kind,href)
  values (null, 'Pengumuman ROBLOX HUB', new.sender_name || ': ' || new.message, 'announcement', '/notifications');
  return new;
end;
$$;
drop trigger if exists site_announcement_to_hub_notification on public.site_announcements;
create trigger site_announcement_to_hub_notification after insert on public.site_announcements
for each row execute function public.mirror_site_announcement_notification();

create or replace function public.get_hub_leaderboard()
returns table(display_name text, username text, public_id text, score bigint, review_count bigint, saved_count bigint)
language sql stable security definer set search_path = ''
as $$
  select p.display_name, p.username, p.public_id,
    ((select count(*) from public.roblox_game_saves s where s.user_id=p.id)
    + (select count(*) from public.roblox_game_reviews v where v.user_id=p.id)*3) as score,
    (select count(*) from public.roblox_game_reviews v where v.user_id=p.id) as review_count,
    (select count(*) from public.roblox_game_saves s where s.user_id=p.id) as saved_count
  from public.profiles p
  where exists(select 1 from public.roblox_game_saves s where s.user_id=p.id)
     or exists(select 1 from public.roblox_game_reviews v where v.user_id=p.id)
  order by score desc, p.display_name asc
  limit 25;
$$;
revoke all on function public.get_hub_leaderboard() from public;
grant execute on function public.get_hub_leaderboard() to anon, authenticated;

create or replace function public.get_hub_trending_games()
returns table(place_id bigint, game_name text, opens bigint, saves bigint, average_rating numeric, review_count bigint)
language sql stable security definer set search_path = ''
as $$
  with all_games as (
    select e.place_id, max(e.game_name) as game_name,
      count(*) filter (where e.created_at >= now()-interval '7 days') as opens
    from public.hub_game_events e group by e.place_id
    union
    select s.place_id, max(s.game_name), 0::bigint from public.roblox_game_saves s group by s.place_id
    union
    select r.place_id, max(r.game_name), 0::bigint from public.roblox_game_reviews r group by r.place_id
  ), combined as (
    select g.place_id, max(g.game_name) as game_name, max(g.opens) as opens,
      (select count(*) from public.roblox_game_saves s where s.place_id=g.place_id) as saves,
      (select round(avg(r.rating)::numeric,1) from public.roblox_game_reviews r where r.place_id=g.place_id) as average_rating,
      (select count(*) from public.roblox_game_reviews r where r.place_id=g.place_id) as review_count
    from all_games g group by g.place_id
  )
  select * from combined order by opens desc, saves desc, average_rating desc nulls last limit 30;
$$;
revoke all on function public.get_hub_trending_games() from public;
grant execute on function public.get_hub_trending_games() to anon, authenticated;

create or replace function public.get_hub_owner_analytics()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare caller_role text; result jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select r.role into caller_role from public.site_user_roles r where r.user_id=auth.uid();
  if coalesce(caller_role,'') not in ('owner','admin') then raise exception 'FORBIDDEN'; end if;
  select jsonb_build_object(
    'opens_7d',(select count(*) from public.hub_game_events e where e.created_at >= now()-interval '7 days'),
    'unique_players_7d',(select count(distinct e.user_id) from public.hub_game_events e where e.created_at >= now()-interval '7 days'),
    'saves_total',(select count(*) from public.roblox_game_saves),
    'reviews_total',(select count(*) from public.roblox_game_reviews),
    'news_total',(select count(*) from public.hub_news where published_at is not null),
    'top_games',coalesce((select jsonb_agg(to_jsonb(t)) from (select e.place_id,max(e.game_name) as game_name,count(*) as opens from public.hub_game_events e where e.created_at >= now()-interval '7 days' group by e.place_id order by count(*) desc limit 5) t),'[]'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke all on function public.get_hub_owner_analytics() from public;
grant execute on function public.get_hub_owner_analytics() to authenticated;
