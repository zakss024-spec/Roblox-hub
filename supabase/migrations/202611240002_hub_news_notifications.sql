create or replace function public.mirror_hub_news_notification()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.published_at is not null and (tg_op = 'INSERT' or old.published_at is distinct from new.published_at) then
    insert into public.hub_notifications(user_id,title,body,kind,href)
    values (null, 'Berita baru: ' || new.title, new.summary, 'news', '/news');
  end if;
  return new;
end;
$$;
drop trigger if exists hub_news_to_notification on public.hub_news;
create trigger hub_news_to_notification after insert or update of published_at on public.hub_news
for each row execute function public.mirror_hub_news_notification();