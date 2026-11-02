-- Additive, service-role-only controls. No user/trip rows are changed.
create table public.service_limits (
  service text primary key,
  enabled boolean not null default true,
  user_minute integer not null check (user_minute > 0),
  user_day integer not null check (user_day > 0),
  global_minute integer not null check (global_minute > 0),
  global_day integer not null check (global_day > 0),
  user_units_day bigint not null check (user_units_day > 0),
  global_units_day bigint not null check (global_units_day > 0)
);
create table public.service_usage (
  id uuid primary key default gen_random_uuid(),
  service text not null references public.service_limits(service),
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  reserved_units integer not null check (reserved_units > 0),
  actual_units integer check (actual_units >= 0),
  outcome text not null default 'reserved' check (outcome in ('reserved','success','provider_error','timeout','invalid_output','internal_error','cache_hit')),
  duration_ms integer check (duration_ms >= 0)
);
create index service_usage_service_created on public.service_usage(service,created_at);
create index service_usage_user_created on public.service_usage(user_id,service,created_at);
create table public.destination_cache (
  cache_key text primary key check (length(cache_key) <= 200),
  payload jsonb not null check (octet_length(payload::text) <= 250000),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);
alter table public.service_limits enable row level security;
alter table public.service_usage enable row level security;
alter table public.destination_cache enable row level security;
revoke all on public.service_limits, public.service_usage, public.destination_cache from public,anon,authenticated;
grant select,insert,update,delete on public.service_limits, public.service_usage, public.destination_cache to service_role;
-- Safar defaults, NOT a claim about the developer's Groq plan. Conservative units
-- reserve UTF-8 input bytes + output token cap, and are never refunded on failure.
insert into public.service_limits values
 ('ai',true,3,20,20,100,100000,200000),
 ('destination',true,12,100,60,1000,100,1000),
 ('autocomplete',true,30,300,120,3000,300,3000);

create function public.reserve_service_usage(p_service text,p_user_id uuid,p_units integer default 1)
returns jsonb language plpgsql security definer set search_path='' as $$
declare lim public.service_limits%rowtype; uday bigint; umin bigint; gday bigint; gmin bigint; uu bigint; gu bigint; reservation uuid;
begin
  if p_units is null or p_units < 1 or p_units > 50000 or p_user_id is null then
    raise exception 'Invalid usage reservation' using errcode='22023';
  end if;
  -- Serialize all reservations for a service, including across Edge instances.
  -- The following aggregate runs AFTER the lock, so concurrent reservations count.
  select * into lim from public.service_limits where service=p_service for update;
  if not found or not lim.enabled then return jsonb_build_object('allowed',false,'reason','unavailable','retryAfter',60); end if;
  if not exists(select 1 from auth.users where id=p_user_id and email_confirmed_at is not null) then
    return jsonb_build_object('allowed',false,'reason','verification','retryAfter',60);
  end if;
  select count(*),count(*) filter(where created_at > now()-interval '1 minute'),
    count(*) filter(where user_id=p_user_id),count(*) filter(where user_id=p_user_id and created_at > now()-interval '1 minute'),
    coalesce(sum(reserved_units),0),coalesce(sum(reserved_units) filter(where user_id=p_user_id),0)
    into gday,gmin,uday,umin,gu,uu from public.service_usage
    where service=p_service and created_at > now()-interval '24 hours';
  if umin>=lim.user_minute or gmin>=lim.global_minute then
    return jsonb_build_object('allowed',false,'reason','minute','retryAfter',60);
  end if;
  if uday>=lim.user_day or uu+p_units>lim.user_units_day then
    return jsonb_build_object('allowed',false,'reason','user_day','retryAfter',86400);
  end if;
  if gday>=lim.global_day or gu+p_units>lim.global_units_day then
    return jsonb_build_object('allowed',false,'reason','global_day','retryAfter',86400);
  end if;
  insert into public.service_usage(service,user_id,reserved_units) values(p_service,p_user_id,p_units) returning id into reservation;
  return jsonb_build_object('allowed',true,'id',reservation,'remainingRequests',lim.user_day-uday-1);
end $$;
revoke all on function public.reserve_service_usage(text,uuid,integer) from public,anon,authenticated;
grant execute on function public.reserve_service_usage(text,uuid,integer) to service_role;
notify pgrst,'reload schema';
