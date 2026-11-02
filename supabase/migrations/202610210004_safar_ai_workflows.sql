-- Safar AI conversations can begin before a trip exists. AI output is stored as a
-- pending proposal; only an explicit authenticated RPC call can apply it.
alter table public.ai_conversations alter column trip_id drop not null;
alter table public.ai_conversations add column if not exists capability text not null default 'create_trip_draft';
alter table public.ai_conversations add column if not exists state jsonb not null default '{}'::jsonb;
alter table public.ai_conversations add column if not exists status text not null default 'active';

alter table public.ai_messages alter column trip_id drop not null;

create table if not exists public.ai_proposals (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete cascade,
  capability text not null,
  proposal jsonb not null,
  status text not null default 'pending' check (status in ('pending','applied','rejected','expired')),
  resulting_trip_id uuid references public.trips(id) on delete set null,
  created_at timestamptz not null default now(),
  applied_at timestamptz
);

create index if not exists ai_conversations_user_updated_idx on public.ai_conversations(user_id, updated_at desc);
create index if not exists ai_messages_conversation_created_idx on public.ai_messages(conversation_id, created_at);
create index if not exists ai_proposals_user_status_idx on public.ai_proposals(user_id, status, created_at desc);
create index if not exists ai_proposals_conversation_idx on public.ai_proposals(conversation_id);
create index if not exists ai_proposals_trip_idx on public.ai_proposals(trip_id) where trip_id is not null;

alter table public.ai_proposals enable row level security;
revoke all on table public.ai_proposals from anon;
grant select, insert, update on table public.ai_proposals to authenticated;

drop policy if exists "safar ai_conversations select" on public.ai_conversations;
drop policy if exists "safar ai_conversations insert" on public.ai_conversations;
drop policy if exists "safar ai_conversations update" on public.ai_conversations;
drop policy if exists "safar ai_conversations delete" on public.ai_conversations;
create policy "safar ai_conversations select" on public.ai_conversations for select to authenticated
  using (user_id = (select auth.uid()) and (trip_id is null or private.can_view_trip(trip_id)));
create policy "safar ai_conversations insert" on public.ai_conversations for insert to authenticated
  with check (user_id = (select auth.uid()) and (trip_id is null or private.can_view_trip(trip_id)));
create policy "safar ai_conversations update" on public.ai_conversations for update to authenticated
  using (user_id = (select auth.uid()) and (trip_id is null or private.can_view_trip(trip_id)))
  with check (user_id = (select auth.uid()) and (trip_id is null or private.can_view_trip(trip_id)));
create policy "safar ai_conversations delete" on public.ai_conversations for delete to authenticated
  using (user_id = (select auth.uid()) and (trip_id is null or private.can_view_trip(trip_id)));

drop policy if exists "safar ai_messages select" on public.ai_messages;
drop policy if exists "safar ai_messages insert" on public.ai_messages;
drop policy if exists "safar ai_messages update" on public.ai_messages;
drop policy if exists "safar ai_messages delete" on public.ai_messages;
create policy "safar ai_messages select" on public.ai_messages for select to authenticated
  using (user_id = (select auth.uid()) and (trip_id is null or private.can_view_trip(trip_id)));
create policy "safar ai_messages insert" on public.ai_messages for insert to authenticated
  with check (user_id = (select auth.uid()) and (trip_id is null or private.can_view_trip(trip_id)));
create policy "safar ai_messages update" on public.ai_messages for update to authenticated
  using (user_id = (select auth.uid()) and (trip_id is null or private.can_view_trip(trip_id)))
  with check (user_id = (select auth.uid()) and (trip_id is null or private.can_view_trip(trip_id)));
create policy "safar ai_messages delete" on public.ai_messages for delete to authenticated
  using (user_id = (select auth.uid()) and (trip_id is null or private.can_view_trip(trip_id)));

create policy "safar ai_proposals select" on public.ai_proposals for select to authenticated
  using (user_id = (select auth.uid()) and (trip_id is null or private.can_view_trip(trip_id)));
create policy "safar ai_proposals insert" on public.ai_proposals for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending' and resulting_trip_id is null and (trip_id is null or private.can_edit_trip(trip_id)));
create policy "safar ai_proposals update" on public.ai_proposals for update to authenticated
  using (user_id = (select auth.uid()) and (trip_id is null or private.can_edit_trip(trip_id)))
  with check (user_id = (select auth.uid()) and (trip_id is null or private.can_edit_trip(trip_id)));

create or replace function public.apply_ai_trip_proposal(p_proposal_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := (select auth.uid());
  item public.ai_proposals;
  draft jsonb;
  created_trip uuid;
  destination_name text;
  trip_title text;
  start_on date;
  end_on date;
  people integer;
  budget_value numeric;
  currency_code text;
  activity jsonb;
  day_value integer;
  cost_value numeric;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  select * into item from public.ai_proposals where id = p_proposal_id and user_id = caller for update;
  if item.id is null then raise exception 'Proposal not found'; end if;
  if item.resulting_trip_id is not null then return item.resulting_trip_id; end if;
  if item.status <> 'pending' or item.capability <> 'create_trip_draft' then raise exception 'Proposal cannot be applied'; end if;

  draft := item.proposal -> 'trip';
  destination_name := trim(draft ->> 'destination');
  trip_title := trim(coalesce(draft ->> 'title', ''));
  start_on := (draft ->> 'startDate')::date;
  end_on := (draft ->> 'endDate')::date;
  people := (draft ->> 'travelers')::integer;
  currency_code := upper(coalesce(nullif(draft ->> 'currency', ''), 'INR'));
  budget_value := case when coalesce((draft ->> 'noBudgetLimit')::boolean, false) then null else nullif(draft ->> 'budget', '')::numeric end;

  if destination_name = '' or char_length(destination_name) > 500 then raise exception 'A valid destination is required'; end if;
  if trip_title = '' then trip_title := 'Trip to ' || split_part(destination_name, ',', 1); end if;
  if char_length(trip_title) > 200 then raise exception 'Trip name is too long'; end if;
  if end_on < start_on or end_on - start_on > 365 then raise exception 'Travel dates are invalid'; end if;
  if people < 1 or people > 100 then raise exception 'Traveler count is invalid'; end if;
  if currency_code not in ('INR','USD','EUR','GBP','JPY','AUD','CAD') then raise exception 'Currency is not supported'; end if;
  if budget_value is not null and budget_value < 0 then raise exception 'Budget is invalid'; end if;

  insert into public.trips(user_id,title,destination,start_date,end_date,travelers,traveler_type,budget,currency,no_budget_limit,interests,status,cover_image_url)
  values(caller,trip_title,destination_name,start_on,end_on,people,nullif(draft ->> 'travelerType',''),budget_value,currency_code,
    coalesce((draft ->> 'noBudgetLimit')::boolean, budget_value is null),
    coalesce(array(select jsonb_array_elements_text(coalesce(draft -> 'interests','[]'::jsonb))), '{}'::text[]),
    'upcoming', nullif(draft ->> 'coverImageUrl','')) returning id into created_trip;

  for activity in select value from jsonb_array_elements(coalesce(item.proposal -> 'activities','[]'::jsonb)) loop
    day_value := coalesce((activity ->> 'dayNumber')::integer, 1);
    cost_value := nullif(activity ->> 'estimatedCost','')::numeric;
    if day_value between 1 and (end_on - start_on + 1)
       and char_length(trim(coalesce(activity ->> 'title',''))) between 1 and 200
       and (cost_value is null or cost_value >= 0) then
      insert into public.activities(trip_id,day_number,title,location,starts_at,notes,estimated_cost,currency,sort_order,source,created_by)
      values(created_trip,day_value,trim(activity ->> 'title'),nullif(trim(activity ->> 'location'),''),nullif(trim(activity ->> 'startsAt'),''),
        nullif(trim(activity ->> 'notes'),''),cost_value,currency_code,coalesce((activity ->> 'sortOrder')::integer,0),'ai',caller);
    end if;
  end loop;

  update public.ai_proposals set status='applied', resulting_trip_id=created_trip, applied_at=now() where id=item.id;
  update public.ai_conversations set trip_id=created_trip, status='completed', updated_at=now() where id=item.conversation_id and user_id=caller;
  return created_trip;
exception
  when invalid_text_representation or datetime_field_overflow then raise exception 'Proposal contains invalid dates or numbers';
end $$;

create or replace function public.reject_ai_proposal(p_proposal_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  update public.ai_proposals set status='rejected'
  where id=p_proposal_id and user_id=(select auth.uid()) and status='pending';
  if not found then raise exception 'Pending proposal not found'; end if;
end $$;

create or replace function public.apply_ai_workspace_proposal(p_proposal_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := (select auth.uid());
  item public.ai_proposals;
  activity jsonb;
  packing jsonb;
  trip_currency text;
  trip_length integer;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  select * into item from public.ai_proposals where id=p_proposal_id and user_id=caller for update;
  if item.id is null then raise exception 'Proposal not found'; end if;
  if item.status='applied' and item.trip_id is not null then return item.trip_id; end if;
  if item.status <> 'pending' or item.trip_id is null or not private.can_edit_trip(item.trip_id) then raise exception 'Proposal cannot be applied'; end if;
  if item.capability not in ('suggest_itinerary','suggest_activities','modify_trip_day','add_activity','packing_suggestions') then raise exception 'This proposal is informational only'; end if;
  select currency, (end_date-start_date+1) into trip_currency, trip_length from public.trips where id=item.trip_id;

  if item.capability in ('suggest_itinerary','suggest_activities','modify_trip_day','add_activity') then
    for activity in select value from jsonb_array_elements(coalesce(item.proposal -> 'activities','[]'::jsonb)) loop
      if coalesce((activity ->> 'dayNumber')::integer,0) between 1 and trip_length
         and char_length(trim(coalesce(activity ->> 'title',''))) between 1 and 200
         and (nullif(activity ->> 'estimatedCost','') is null or (activity ->> 'estimatedCost')::numeric >= 0) then
        insert into public.activities(trip_id,day_number,title,location,starts_at,notes,estimated_cost,currency,sort_order,source,created_by)
        values(item.trip_id,(activity ->> 'dayNumber')::integer,trim(activity ->> 'title'),nullif(trim(activity ->> 'location'),''),
          nullif(trim(activity ->> 'startsAt'),''),nullif(trim(activity ->> 'notes'),''),nullif(activity ->> 'estimatedCost','')::numeric,
          trip_currency,coalesce((activity ->> 'sortOrder')::integer,0),'ai',caller);
      end if;
    end loop;
  else
    for packing in select value from jsonb_array_elements(coalesce(item.proposal -> 'packingItems','[]'::jsonb)) loop
      if char_length(trim(coalesce(packing ->> 'name',''))) between 1 and 200 then
        insert into public.packing_items(trip_id,name,category,quantity,created_by)
        values(item.trip_id,trim(packing ->> 'name'),coalesce(nullif(trim(packing ->> 'category'),''),'Essentials'),
          greatest(1,least(20,coalesce((packing ->> 'quantity')::integer,1))),caller);
      end if;
    end loop;
  end if;
  update public.ai_proposals set status='applied', applied_at=now() where id=item.id;
  return item.trip_id;
exception
  when invalid_text_representation then raise exception 'Proposal contains invalid activity data';
end $$;

revoke execute on function public.apply_ai_trip_proposal(uuid), public.apply_ai_workspace_proposal(uuid), public.reject_ai_proposal(uuid) from public, anon;
grant execute on function public.apply_ai_trip_proposal(uuid), public.apply_ai_workspace_proposal(uuid), public.reject_ai_proposal(uuid) to authenticated;

drop trigger if exists safar_updated_at on public.ai_conversations;
create trigger safar_updated_at before update on public.ai_conversations for each row execute function private.set_updated_at();

notify pgrst, 'reload schema';
