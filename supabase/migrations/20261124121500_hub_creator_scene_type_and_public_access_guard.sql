create or replace function public.hub_creator_scene_is_valid(p_scene jsonb)
returns boolean language plpgsql immutable set search_path = ''
as $$
declare item jsonb;
begin
 if jsonb_typeof(p_scene) is distinct from 'object'
    or p_scene->>'schemaVersion' is distinct from '1'
    or jsonb_typeof(p_scene->'objects') is distinct from 'array'
    or jsonb_array_length(p_scene->'objects') > 200 then return false; end if;
 for item in select value from jsonb_array_elements(p_scene->'objects') loop
  if jsonb_typeof(item) is distinct from 'object'
   or jsonb_typeof(item->'id') is distinct from 'string'
   or char_length(item->>'id') > 50
   or item->>'type' is null
   or item->>'type' not in ('block','platform','coin','checkpoint')
   or jsonb_typeof(item->'x') is distinct from 'number'
   or jsonb_typeof(item->'y') is distinct from 'number'
   or jsonb_typeof(item->'z') is distinct from 'number'
   or jsonb_typeof(item->'w') is distinct from 'number'
   or jsonb_typeof(item->'h') is distinct from 'number'
   or jsonb_typeof(item->'d') is distinct from 'number'
   or jsonb_typeof(item->'color') is distinct from 'string'
   or (item->>'x')::numeric not between -50 and 50
   or (item->>'y')::numeric not between -20 and 50
   or (item->>'z')::numeric not between -50 and 50
   or (item->>'w')::numeric not between 0.25 and 10
   or (item->>'h')::numeric not between 0.25 and 10
   or (item->>'d')::numeric not between 0.25 and 10
   or (item->>'color') !~ '^#[0-9A-Fa-f]{6}$' then return false; end if;
 end loop;
 return true;
exception when others then return false;
end;
$$;
revoke all on function public.hub_creator_scene_is_valid(jsonb) from public;
grant execute on function public.hub_creator_scene_is_valid(jsonb) to authenticated;
revoke select on public.hub_creator_publications from anon;
grant select (id,project_id,title,description,engine,template,scene,published_at,updated_at) on public.hub_creator_publications to anon;