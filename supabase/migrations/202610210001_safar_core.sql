-- Safar core schema. Additive and safe for the existing trips table/data.
create extension if not exists pgcrypto;
create schema if not exists private;

alter table public.trips add column if not exists title text;
alter table public.trips add column if not exists destination text;
alter table public.trips add column if not exists start_date date;
alter table public.trips add column if not exists end_date date;
alter table public.trips add column if not exists travelers integer default 1;
alter table public.trips add column if not exists budget numeric(14,2);
alter table public.trips add column if not exists currency text default 'INR';
alter table public.trips add column if not exists status text default 'draft';
alter table public.trips add column if not exists destination_place_id text;
alter table public.trips add column if not exists destination_lat double precision;
alter table public.trips add column if not exists destination_lon double precision;
alter table public.trips add column if not exists traveler_type text;
alter table public.trips add column if not exists no_budget_limit boolean not null default false;
alter table public.trips add column if not exists interests text[] not null default '{}';
alter table public.trips add column if not exists cover_image_url text;
alter table public.trips add column if not exists archived_at timestamptz;
alter table public.trips add column if not exists created_at timestamptz not null default now();
alter table public.trips add column if not exists updated_at timestamptz not null default now();
create index if not exists trips_user_start_idx on public.trips(user_id, start_date);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  preferred_currency text not null default 'INR' check (char_length(preferred_currency) = 3),
  preferred_language text not null default 'en',
  travel_preferences text[] not null default '{}',
  notifications_enabled boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.trip_days (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade,
  day_number integer not null check (day_number > 0), day_date date, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(trip_id, day_number)
);
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade,
  day_number integer not null check (day_number > 0), title text not null check (char_length(title) between 1 and 200),
  location text, starts_at text, ends_at text, notes text, estimated_cost numeric(14,2) check (estimated_cost >= 0),
  currency text check (currency is null or char_length(currency) = 3), sort_order integer not null default 0,
  is_completed boolean not null default false, source text not null default 'manual' check (source in ('manual','ai')),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade,
  booking_type text not null check (booking_type in ('flight','train','hotel','rental_car','bus','activity','other')),
  provider text not null, reference text, departure text, arrival text, starts_at timestamptz, ends_at timestamptz,
  cost numeric(14,2) check (cost >= 0), currency text, status text not null default 'planned', notes text,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.packing_items (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade,
  name text not null, category text not null default 'Essentials', quantity integer not null default 1 check (quantity > 0),
  is_packed boolean not null default false, created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade,
  title text not null, category text not null default 'Miscellaneous', amount numeric(14,2) not null check (amount >= 0),
  currency text not null check (char_length(currency) = 3), spent_on date not null default current_date, notes text,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.trip_notes (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade,
  title text not null, body text not null, is_pinned boolean not null default false,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.trip_photos (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade,
  storage_path text not null unique, caption text, uploaded_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.trip_members (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, role text not null check (role in ('editor','viewer')),
  joined_at timestamptz not null default now(), unique(trip_id, user_id)
);
create table if not exists public.trip_invitations (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade,
  code text not null unique default ('SAFAR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))),
  invitee_email text, role text not null check (role in ('editor','viewer')), invited_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected','revoked','expired')),
  expires_at timestamptz not null default (now() + interval '14 days'), accepted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.saved_destinations (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  place_id text not null, name text not null, display_name text not null, latitude double precision, longitude double precision,
  image_url text, created_at timestamptz not null default now(), unique(user_id, place_id)
);
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade, title text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(), conversation_id uuid references public.ai_conversations(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade, user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')), content jsonb not null, created_at timestamptz not null default now()
);

create index if not exists activities_trip_day_idx on public.activities(trip_id, day_number, sort_order);
create index if not exists bookings_trip_idx on public.bookings(trip_id, starts_at);
create index if not exists packing_trip_idx on public.packing_items(trip_id);
create index if not exists expenses_trip_date_idx on public.expenses(trip_id, spent_on);
create index if not exists trip_members_user_idx on public.trip_members(user_id, trip_id);
create index if not exists invitations_code_idx on public.trip_invitations(code) where status = 'pending';
create index if not exists ai_messages_rate_idx on public.ai_messages(user_id, created_at);

create or replace function private.is_trip_owner(p_trip_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.trips t where t.id = p_trip_id and t.user_id = (select auth.uid())) $$;
create or replace function private.can_view_trip(p_trip_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select private.is_trip_owner(p_trip_id) or exists(select 1 from public.trip_members m where m.trip_id = p_trip_id and m.user_id = (select auth.uid())) $$;
create or replace function private.can_edit_trip(p_trip_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select private.is_trip_owner(p_trip_id) or exists(select 1 from public.trip_members m where m.trip_id = p_trip_id and m.user_id = (select auth.uid()) and m.role = 'editor') $$;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
revoke execute on all functions in schema private from public, anon;
grant execute on function private.is_trip_owner(uuid), private.can_view_trip(uuid), private.can_edit_trip(uuid) to authenticated;

create or replace function private.protect_trip_owner() returns trigger language plpgsql set search_path='' as $$
begin if new.user_id is distinct from old.user_id then raise exception 'Trip ownership cannot be reassigned'; end if; return new; end $$;
drop trigger if exists safar_protect_trip_owner on public.trips;
create trigger safar_protect_trip_owner before update on public.trips for each row execute function private.protect_trip_owner();

create or replace function public.accept_trip_invitation(p_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare inv public.trip_invitations; caller_email text; begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  select lower(email) into caller_email from auth.users where id = (select auth.uid());
  select * into inv from public.trip_invitations where code = upper(trim(p_code)) and status = 'pending' and expires_at > now() for update;
  if inv.id is null then raise exception 'Invitation is invalid or expired'; end if;
  if inv.invitee_email is not null and lower(inv.invitee_email) <> caller_email then raise exception 'This invitation belongs to another email address'; end if;
  if inv.invited_by = (select auth.uid()) then raise exception 'Owners cannot join their own trip'; end if;
  insert into public.trip_members(trip_id,user_id,role) values(inv.trip_id,(select auth.uid()),inv.role) on conflict(trip_id,user_id) do update set role = excluded.role;
  update public.trip_invitations set status='accepted', accepted_by=(select auth.uid()) where id=inv.id;
  return inv.trip_id;
end $$;
create or replace function public.reject_trip_invitation(p_code text)
returns void language plpgsql security definer set search_path = '' as $$
declare inv public.trip_invitations; caller_email text; begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  select lower(email) into caller_email from auth.users where id=(select auth.uid());
  select * into inv from public.trip_invitations where code=upper(trim(p_code)) and status='pending' for update;
  if inv.id is null then raise exception 'Invitation is invalid'; end if;
  if inv.invitee_email is not null and lower(inv.invitee_email) <> caller_email then raise exception 'This invitation belongs to another email address'; end if;
  update public.trip_invitations set status='rejected' where id=inv.id;
end $$;
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = '' as $$
declare caller uuid := (select auth.uid()); begin
  if caller is null then raise exception 'Authentication required'; end if;
  delete from public.trips where user_id=caller;
  delete from auth.users where id=caller;
end $$;
revoke execute on function public.accept_trip_invitation(text), public.reject_trip_invitation(text), public.delete_my_account() from public, anon;
grant execute on function public.accept_trip_invitation(text), public.reject_trip_invitation(text), public.delete_my_account() to authenticated;

create or replace function private.set_updated_at() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now(); return new; end $$;
do $$ declare name text; begin foreach name in array array['trips','profiles','trip_days','activities','bookings','packing_items','expenses','trip_notes','ai_conversations'] loop execute format('drop trigger if exists safar_updated_at on public.%I',name); execute format('create trigger safar_updated_at before update on public.%I for each row execute function private.set_updated_at()',name); end loop; end $$;
create or replace function private.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$ begin insert into public.profiles(id,full_name) values(new.id,new.raw_user_meta_data->>'full_name') on conflict(id) do nothing; return new; end $$;
drop trigger if exists safar_profile_on_signup on auth.users;
create trigger safar_profile_on_signup after insert on auth.users for each row execute function private.handle_new_user();
insert into public.profiles(id,full_name) select id,raw_user_meta_data->>'full_name' from auth.users on conflict(id) do nothing;

do $$ declare t text; begin foreach t in array array['profiles','trips','trip_days','activities','bookings','packing_items','expenses','trip_notes','trip_photos','trip_members','trip_invitations','saved_destinations','ai_conversations','ai_messages'] loop execute format('alter table public.%I enable row level security',t); execute format('revoke all on table public.%I from anon',t); execute format('grant select,insert,update,delete on table public.%I to authenticated',t); end loop; end $$;

drop policy if exists "safar profiles own select" on public.profiles; create policy "safar profiles own select" on public.profiles for select to authenticated using (id=(select auth.uid()));
drop policy if exists "safar profiles own insert" on public.profiles; create policy "safar profiles own insert" on public.profiles for insert to authenticated with check (id=(select auth.uid()));
drop policy if exists "safar profiles own update" on public.profiles; create policy "safar profiles own update" on public.profiles for update to authenticated using (id=(select auth.uid())) with check (id=(select auth.uid()));
drop policy if exists "safar trips select" on public.trips; create policy "safar trips select" on public.trips for select to authenticated using (private.can_view_trip(id));
drop policy if exists "safar trips insert" on public.trips; create policy "safar trips insert" on public.trips for insert to authenticated with check (user_id=(select auth.uid()));
drop policy if exists "safar trips update" on public.trips; create policy "safar trips update" on public.trips for update to authenticated using (private.can_edit_trip(id)) with check (private.can_edit_trip(id));
drop policy if exists "safar trips delete" on public.trips; create policy "safar trips delete" on public.trips for delete to authenticated using (private.is_trip_owner(id));

do $$ declare t text; begin foreach t in array array['trip_days','activities','bookings','packing_items','expenses','trip_notes','trip_photos','ai_conversations','ai_messages'] loop
  execute format('drop policy if exists "safar %s select" on public.%I',t,t); execute format('create policy "safar %s select" on public.%I for select to authenticated using (private.can_view_trip(trip_id))',t,t);
  execute format('drop policy if exists "safar %s insert" on public.%I',t,t); execute format('create policy "safar %s insert" on public.%I for insert to authenticated with check (private.can_edit_trip(trip_id))',t,t);
  execute format('drop policy if exists "safar %s update" on public.%I',t,t); execute format('create policy "safar %s update" on public.%I for update to authenticated using (private.can_edit_trip(trip_id)) with check (private.can_edit_trip(trip_id))',t,t);
  execute format('drop policy if exists "safar %s delete" on public.%I',t,t); execute format('create policy "safar %s delete" on public.%I for delete to authenticated using (private.can_edit_trip(trip_id))',t,t);
end loop; end $$;
drop policy if exists "safar members select" on public.trip_members; create policy "safar members select" on public.trip_members for select to authenticated using (private.can_view_trip(trip_id));
drop policy if exists "safar members insert" on public.trip_members; create policy "safar members insert" on public.trip_members for insert to authenticated with check (private.is_trip_owner(trip_id));
drop policy if exists "safar members update" on public.trip_members; create policy "safar members update" on public.trip_members for update to authenticated using (private.is_trip_owner(trip_id)) with check (private.is_trip_owner(trip_id));
drop policy if exists "safar members delete" on public.trip_members; create policy "safar members delete" on public.trip_members for delete to authenticated using (private.is_trip_owner(trip_id) or user_id=(select auth.uid()));
drop policy if exists "safar invitations select" on public.trip_invitations; create policy "safar invitations select" on public.trip_invitations for select to authenticated using (private.is_trip_owner(trip_id));
drop policy if exists "safar invitations insert" on public.trip_invitations; create policy "safar invitations insert" on public.trip_invitations for insert to authenticated with check (private.is_trip_owner(trip_id) and invited_by=(select auth.uid()));
drop policy if exists "safar invitations update" on public.trip_invitations; create policy "safar invitations update" on public.trip_invitations for update to authenticated using (private.is_trip_owner(trip_id)) with check (private.is_trip_owner(trip_id));
drop policy if exists "safar invitations delete" on public.trip_invitations; create policy "safar invitations delete" on public.trip_invitations for delete to authenticated using (private.is_trip_owner(trip_id));
drop policy if exists "safar saved destinations own" on public.saved_destinations; create policy "safar saved destinations own" on public.saved_destinations for all to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));

create or replace function private.object_trip_id(object_name text) returns uuid language plpgsql immutable set search_path='' as $$
declare part text; begin part := split_part(object_name,'/',2); return part::uuid; exception when invalid_text_representation then return null; end $$;
revoke execute on all functions in schema private from public, anon;
grant execute on function private.is_trip_owner(uuid), private.can_view_trip(uuid), private.can_edit_trip(uuid), private.object_trip_id(text) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('trip-photos','trip-photos',false,10485760,array['image/jpeg','image/png','image/webp']) on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "safar photo upload" on storage.objects; create policy "safar photo upload" on storage.objects for insert to authenticated with check (bucket_id='trip-photos' and (storage.foldername(name))[1]=(select auth.uid())::text and private.can_edit_trip(private.object_trip_id(name)));
drop policy if exists "safar photo read" on storage.objects; create policy "safar photo read" on storage.objects for select to authenticated using (bucket_id='trip-photos' and private.can_view_trip(private.object_trip_id(name)));
drop policy if exists "safar photo delete" on storage.objects; create policy "safar photo delete" on storage.objects for delete to authenticated using (bucket_id='trip-photos' and private.can_edit_trip(private.object_trip_id(name)));
