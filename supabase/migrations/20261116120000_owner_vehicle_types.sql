-- Owner-editable vehicle types. Size tiers remain stable to keep the existing
-- POS and server-validated online booking prices in sync.
create table if not exists public.business_vehicle_types (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 60),
  size_tier text not null check (size_tier in ('Small','Medium','Large','XL')),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists business_vehicle_types_name_unique
  on public.business_vehicle_types(business_id, lower(trim(name)));
create index if not exists business_vehicle_types_business_sort
  on public.business_vehicle_types(business_id,sort_order,name);
alter table public.business_vehicle_types enable row level security;

drop policy if exists vehicle_types_member_read on public.business_vehicle_types;
create policy vehicle_types_member_read on public.business_vehicle_types
  for select to authenticated using (
    public.is_business_member(business_id) or public.is_platform_admin()
  );
drop policy if exists vehicle_types_manager_insert on public.business_vehicle_types;
create policy vehicle_types_manager_insert on public.business_vehicle_types
  for insert to authenticated with check (public.can_manage_business(business_id));
drop policy if exists vehicle_types_manager_update on public.business_vehicle_types;
create policy vehicle_types_manager_update on public.business_vehicle_types
  for update to authenticated
  using (public.can_manage_business(business_id))
  with check (public.can_manage_business(business_id));
drop policy if exists vehicle_types_manager_delete on public.business_vehicle_types;
create policy vehicle_types_manager_delete on public.business_vehicle_types
  for delete to authenticated using (public.can_manage_business(business_id));

revoke all on public.business_vehicle_types from public, anon;
grant select,insert,update,delete on public.business_vehicle_types to authenticated;

-- Seed vehicle category names / size mapping, not prices. Owners set real rates.
create or replace function private.seed_vehicle_types_for_business(p_business_id uuid)
returns void language plpgsql security definer set search_path to ''
as $function$
begin
  if p_business_id is null then return; end if;
  insert into public.business_vehicle_types(business_id,name,size_tier,sort_order)
  select p_business_id,v.name,v.size_tier,v.pos
  from (values
    ('Sedan','Small',1),('Hatchback','Small',2),('Coupe','Small',3),
    ('Motorcycle','Small',4),('SUV','Medium',5),('Crossover','Medium',6),
    ('MPV','Medium',7),('Pickup','Large',8),('Van','Large',9),
    ('L300 / Utility Van','Large',10),('Truck / Bus','XL',11),
    ('Other','XL',12)
  ) as v(name,size_tier,pos)
  on conflict do nothing;
end;
$function$;

revoke all on function private.seed_vehicle_types_for_business(uuid) from public, anon, authenticated;

create or replace function private.seed_vehicle_types_after_business_insert()
returns trigger language plpgsql security definer set search_path to ''
as $function$
begin
  perform private.seed_vehicle_types_for_business(new.id);
  return new;
end;
$function$;
revoke all on function private.seed_vehicle_types_after_business_insert() from public,anon,authenticated;
drop trigger if exists trg_seed_business_vehicle_types on public.businesses;
create trigger trg_seed_business_vehicle_types
after insert on public.businesses for each row
execute function private.seed_vehicle_types_after_business_insert();

-- Existing owners get editable category names, but no fabricated service prices.
do $block$
declare v record;
begin
 for v in select id from public.businesses loop
   perform private.seed_vehicle_types_for_business(v.id);
 end loop;
end;
$block$;

-- Public display names are a narrowly scoped read-only projection. Never
-- expose business IDs or private customer records to anonymous visitors.
create or replace function public.get_public_vehicle_types(p_facility_slug text)
returns table (name text,size_tier text)
language sql stable security definer set search_path to ''
as $function$
 select vt.name,vt.size_tier
 from public.business_facilities f
 join public.businesses b on b.id=f.business_id
 join public.business_vehicle_types vt on vt.business_id=f.business_id
 where f.slug=lower(trim(p_facility_slug))
   and f.is_listed=true
   and b.status='active'
   and vt.is_active=true
 order by vt.sort_order,vt.name;
$function$;
revoke all on function public.get_public_vehicle_types(text) from public,anon,authenticated;
grant execute on function public.get_public_vehicle_types(text) to anon,authenticated;

comment on table public.business_vehicle_types is
  'Business-owned vehicle names mapped to Small/Medium/Large/XL server-side price tiers; never stores payment amounts.';
