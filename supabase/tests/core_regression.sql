-- Safe regression probe: all writes roll back, including profile changes.
-- Run as the SQL editor/MCP database role; requires one confirmed auth user.
begin;
select set_config('safar.test_owner', (select id::text from auth.users where email_confirmed_at is not null order by created_at limit 1), true);
select set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('safar.test_owner'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
declare first_id uuid; second_id uuid; activity_id uuid; row_id uuid; conversation_id uuid; proposal_id uuid; applied_id uuid; affected integer;
begin
  if auth.uid() is null then raise exception 'A confirmed test user is required'; end if;
  insert into public.trips(user_id,title,destination,start_date,end_date,travelers,currency,status)
  values(auth.uid(),'Rollback test 1','Delhi, India','2026-12-10','2026-12-12',2,'INR','upcoming') returning id into first_id;
  insert into public.trips(user_id,title,destination,start_date,end_date,travelers,currency,status)
  values(auth.uid(),'Rollback test 2','Delhi, India','2026-12-10','2026-12-12',2,'INR','upcoming') returning id into second_id;
  if first_id is null or second_id is null then raise exception 'INSERT RETURNING failed'; end if;
  insert into public.profiles(id,full_name) values(auth.uid(),'Rollback profile') on conflict(id) do update set full_name=excluded.full_name;
  if not exists(select 1 from public.profiles where id=auth.uid() and full_name='Rollback profile') then raise exception 'Profile read/write failed'; end if;
  update public.trips set title='Updated test', archived_at=now() where id=first_id;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Trip update failed'; end if;
  update public.trips set archived_at=null where id=first_id;
  insert into public.activities(trip_id,day_number,title,latitude,longitude)
  values(first_id,1,'Test stop',28.6139,77.209) returning id into activity_id;
  update public.activities set title='Edited stop',sort_order=1,is_completed=true where id=activity_id;
  if not exists(select 1 from public.activities where id=activity_id and is_completed and title='Edited stop') then raise exception 'Activity CRUD failed'; end if;
  begin
    insert into public.activities(trip_id,day_number,title,latitude,longitude) values(first_id,1,'Bad pin',95,0);
    raise exception 'Invalid coordinates were accepted';
  exception when check_violation then null; end;
  insert into public.bookings(trip_id,booking_type,provider,status) values(first_id,'hotel','Test hotel','planned') returning id into row_id;
  update public.bookings set status='confirmed' where id=row_id;
  if not exists(select 1 from public.bookings where id=row_id and status='confirmed') then raise exception 'Booking update failed'; end if;
  delete from public.bookings where id=row_id;
  insert into public.packing_items(trip_id,name) values(first_id,'Passport') returning id into row_id;
  update public.packing_items set is_packed=true where id=row_id;
  if not exists(select 1 from public.packing_items where id=row_id and is_packed) then raise exception 'Packing update failed'; end if;
  delete from public.packing_items where id=row_id;
  insert into public.expenses(trip_id,title,amount,currency) values(first_id,'Lunch',250,'INR') returning id into row_id;
  update public.expenses set amount=300 where id=row_id;
  if not exists(select 1 from public.expenses where id=row_id and amount=300) then raise exception 'Expense update failed'; end if;
  delete from public.expenses where id=row_id;
  insert into public.trip_notes(trip_id,title,body) values(first_id,'Note','Test') returning id into row_id;
  update public.trip_notes set body='Edited' where id=row_id;
  if not exists(select 1 from public.trip_notes where id=row_id and body='Edited') then raise exception 'Note update failed'; end if;
  delete from public.trip_notes where id=row_id;
  insert into public.ai_conversations(user_id,title) values(auth.uid(),'Rollback AI') returning id into conversation_id;
  insert into public.ai_proposals(conversation_id,user_id,capability,proposal)
  values(conversation_id,auth.uid(),'create_trip_draft','{"trip":{"title":"Preview","destination":"Delhi, India","startDate":"2026-12-10","endDate":"2026-12-12","travelers":2,"currency":"INR","budget":1000,"noBudgetLimit":false,"interests":[]},"activities":[{"dayNumber":1,"title":"Walk","location":"Delhi","sortOrder":0}],"assumptions":[]}'::jsonb) returning id into proposal_id;
  update public.ai_proposals set proposal=jsonb_set(proposal,'{trip,title}','"Edited preview"') where id=proposal_id and status='pending';
  if exists(select 1 from public.trips where title='Edited preview') then raise exception 'Unapproved preview changed trips'; end if;
  select public.apply_ai_trip_proposal(proposal_id) into applied_id;
  if not exists(select 1 from public.trips where id=applied_id and title='Edited preview') then raise exception 'Approval failed'; end if;
  if public.apply_ai_trip_proposal(proposal_id) <> applied_id then raise exception 'Approval not idempotent'; end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
  if exists(select 1 from public.trips where id=first_id) then raise exception 'Unrelated user read a trip'; end if;
  if exists(select 1 from public.profiles where id=current_setting('safar.test_owner')::uuid) then raise exception 'Unrelated user read a profile'; end if;
  begin
    insert into public.activities(trip_id,day_number,title) values(first_id,1,'Forbidden');
    raise exception 'Unrelated user wrote an activity';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('safar.test_owner'),'role','authenticated')::text,true);
  delete from public.activities where id=activity_id;
  delete from public.trips where id=second_id;
  if exists(select 1 from public.trips where id=second_id) then raise exception 'Trip delete failed'; end if;
end $$;
rollback;
select 'PASS: repeated trip creation, profile, workspace CRUD, map constraints, AI preview edit/approval/idempotence, unrelated-user RLS; all writes rolled back' as result;
