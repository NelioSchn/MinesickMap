-- Chunk Atlas v2: neue UND bestehende v1-Projekte, bestehende Daten bleiben erhalten.
begin;
create table if not exists public.worlds(id text primary key,name text not null,seed text not null,version text not null,example boolean not null default false);
insert into public.worlds values('main','Unsere Welt','42','1.21.11',true) on conflict(id) do nothing;
alter table public.worlds enable row level security;
drop policy if exists worlds_read on public.worlds;
create policy worlds_read on public.worlds for select to anon,authenticated using(true);
revoke all on public.worlds from anon,authenticated;
grant select on public.worlds to anon,authenticated;
create table if not exists public.atlas_admins(world_id text not null references public.worlds(id),user_id uuid not null references auth.users(id) on delete cascade,primary key(world_id,user_id));
create table if not exists public.atlas_players(
 id uuid primary key default gen_random_uuid(),world_id text not null references public.worlds(id),
 name text not null check(length(trim(name)) between 1 and 40),color text not null check(color ~ '^#[0-9a-f]{6}$'),unique(id,world_id),unique(world_id,color));
create unique index if not exists atlas_player_names on public.atlas_players(world_id,lower(trim(name)));
create table if not exists public.atlas_plots(
 id uuid primary key default gen_random_uuid(),world_id text not null references public.worlds(id),
 x integer not null check(x%2=0 and abs(x::bigint*16)<=29999000 and abs((x::bigint+2)*16)<=29999000),
 z integer not null check(z%2=0 and abs(z::bigint*16)<=29999000 and abs((z::bigint+2)*16)<=29999000),
 requested_by text not null check(length(trim(requested_by)) between 1 and 40),
 status text not null default 'reserved' check(status in ('reserved','assigned')),player_id uuid,
 created_at timestamptz not null default now(),unique(world_id,x,z),
 foreign key(player_id,world_id) references public.atlas_players(id,world_id),
 check((status='reserved' and player_id is null) or (status='assigned' and player_id is not null)));
alter table public.atlas_admins enable row level security;
alter table public.atlas_players enable row level security;
alter table public.atlas_plots enable row level security;
revoke all on public.atlas_admins,public.atlas_players,public.atlas_plots from anon,authenticated;
grant select on public.atlas_players,public.atlas_plots to anon,authenticated;
drop policy if exists atlas_players_read on public.atlas_players;
create policy atlas_players_read on public.atlas_players for select to anon,authenticated using(true);
drop policy if exists atlas_plots_read on public.atlas_plots;
create policy atlas_plots_read on public.atlas_plots for select to anon,authenticated using(true);
create or replace function public.atlas_is_admin(p_world text) returns boolean
language sql stable security definer set search_path='' as $$ select exists(select 1 from public.atlas_admins where world_id=p_world and user_id=auth.uid()); $$;
create or replace function public.atlas_snapshot(p_world text) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object('schema',2,'name',w.name,'seed',w.seed,'version',w.version,'example',w.example,
 'players',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'color',p.color) order by lower(p.name)) from public.atlas_players p where p.world_id=w.id),'[]'::jsonb),
 'claims',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'x',c.x,'z',c.z,'requested_by',c.requested_by,'status',c.status,'player_id',c.player_id) order by c.created_at,c.id) from public.atlas_plots c where c.world_id=w.id),'[]'::jsonb))
 from public.worlds w where w.id=p_world;
$$;
create or replace function public.atlas_reserve(p_world text,p_name text,p_x integer,p_z integer) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 perform 1 from public.worlds where id=p_world for update;
 if not found then raise exception 'Welt nicht gefunden.'; end if;
 if p_name is null or length(trim(p_name)) not between 1 and 40 then raise exception 'Bitte deinen Namen eingeben (max. 40 Zeichen).'; end if;
 if p_x is null or p_z is null or p_x%2<>0 or p_z%2<>0 or abs(p_x::bigint*16)>29998968 or abs(p_z::bigint*16)>29998968 then raise exception 'Ein Plot muss auf dem 2 × 2-Chunk-Raster liegen.'; end if;
 if (select count(*) from public.atlas_plots where world_id=p_world)>=2000 then raise exception 'Maximal 2000 Plots pro Welt.'; end if;
 if exists(select 1 from public.atlas_plots where world_id=p_world and x=p_x and z=p_z) then raise exception 'Dieses Grundstück ist bereits reserviert oder zugewiesen.'; end if;
 insert into public.atlas_plots(world_id,x,z,requested_by) values(p_world,p_x,p_z,trim(p_name)) returning id into result;
 return result;
end $$;
create or replace function public.atlas_save_player(p_world text,p_id uuid,p_name text,p_color text) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not public.atlas_is_admin(p_world) then raise exception 'Nur der Admin darf Spieler bearbeiten.'; end if;
 perform 1 from public.worlds where id=p_world for update;
 if p_id is null then
  if (select count(*) from public.atlas_players where world_id=p_world)>=500 then raise exception 'Maximal 500 Spieler pro Welt.'; end if;
  insert into public.atlas_players(world_id,name,color) values(p_world,trim(p_name),lower(p_color)) returning id into result;
 else
  update public.atlas_players set name=trim(p_name),color=lower(p_color) where id=p_id and world_id=p_world returning id into result;
  if not found then raise exception 'Spieler nicht gefunden.'; end if;
 end if;
 return result;
exception when unique_violation then raise exception 'Name oder Farbe ist bereits vergeben.';
end $$;
create or replace function public.atlas_assign(p_world text,p_plot uuid,p_player uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.atlas_is_admin(p_world) then raise exception 'Nur der Admin darf Grundstücke zuweisen.'; end if;
 perform 1 from public.worlds where id=p_world for update;
 if p_player is not null and not exists(select 1 from public.atlas_players where world_id=p_world and id=p_player) then raise exception 'Spieler gehört nicht zu dieser Welt.'; end if;
 update public.atlas_plots set player_id=p_player,status=case when p_player is null then 'reserved' else 'assigned' end where id=p_plot and world_id=p_world;
 if not found then raise exception 'Grundstück nicht gefunden.'; end if;
end $$;
create or replace function public.atlas_release(p_world text,p_plot uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.atlas_is_admin(p_world) then raise exception 'Nur der Admin darf Grundstücke freigeben.'; end if;
 perform 1 from public.worlds where id=p_world for update;
 delete from public.atlas_plots where id=p_plot and world_id=p_world;
 if not found then raise exception 'Grundstück nicht gefunden.'; end if;
end $$;
revoke all on function public.atlas_is_admin(text),public.atlas_snapshot(text),public.atlas_reserve(text,text,integer,integer),public.atlas_save_player(text,uuid,text,text),public.atlas_assign(text,uuid,uuid),public.atlas_release(text,uuid) from public,anon,authenticated;
grant execute on function public.atlas_snapshot(text),public.atlas_reserve(text,text,integer,integer) to anon,authenticated;
grant execute on function public.atlas_is_admin(text),public.atlas_save_player(text,uuid,text,text),public.atlas_assign(text,uuid,uuid),public.atlas_release(text,uuid) to authenticated;
-- V1-Daten behalten; alte Schreibwege nach Upgrade schliessen.
do $$begin
 if to_regclass('public.claims') is not null then execute 'revoke insert,update,delete on public.claims from anon,authenticated'; end if;
 if to_regprocedure('public.create_claim(text,text,text,text,text,integer,integer,integer,integer)') is not null then execute 'revoke execute on function public.create_claim(text,text,text,text,text,integer,integer,integer,integer) from public,anon,authenticated'; end if;
end $$;
commit;
