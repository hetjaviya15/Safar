-- Synthetic users exist ONLY inside this rolled-back transaction; no emails or
-- credentials are created. These are database role tests, not sign-in tests.
begin;
create temp table fixtures(kind text primary key,id uuid not null default gen_random_uuid());
insert into fixtures(kind) values('owner'),('editor'),('viewer'),('outsider'),('trip');
grant select on fixtures to authenticated,service_role;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)
select id,'safar-'||id||'@example.invalid',now(),'{"full_name":"Rollback fixture","preferred_currency":"JPY"}'::jsonb
from fixtures where kind<>'trip';
create function pg_temp.assert(ok boolean, message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %',message; end if; end $$;
select pg_temp.assert((select preferred_currency='JPY' from public.profiles where id=(select id from fixtures where kind='owner')),'new profile locale');
select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from fixtures where kind='owner'),'role','authenticated')::text,true);
set local role authenticated;
insert into public.trips(id,user_id,title,destination,start_date,end_date,travelers,currency,status)
values((select id from fixtures where kind='trip'),auth.uid(),'Rollback collaboration','Hyderabad, India','2026-12-10','2026-12-12',2,'INR','upcoming');
insert into public.trip_invitations(trip_id,role,code,invitee_email)
values((select id from fixtures where kind='trip'),'editor','SAFAR-ROLLBACK-EDITOR','safar-'||(select id from fixtures where kind='editor')||'@example.invalid');
insert into public.trip_members(trip_id,user_id,role) values((select id from fixtures where kind='trip'),(select id from fixtures where kind='viewer'),'viewer');
select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from fixtures where kind='outsider'),'role','authenticated')::text,true);
select pg_temp.assert(not exists(select 1 from public.trips where id=(select id from fixtures where kind='trip')),'outsider cannot read trip');
do $$ begin
  begin perform public.accept_trip_invitation('SAFAR-ROLLBACK-EDITOR'); raise exception 'FAIL: wrong email accepted';
  exception when raise_exception then if sqlerrm='FAIL: wrong email accepted' then raise; end if; end;
  begin perform public.reserve_service_usage('ai',auth.uid(),1); raise exception 'FAIL: user reserved usage';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.service_usage; raise exception 'FAIL: user read usage';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from fixtures where kind='editor'),'role','authenticated')::text,true);
select public.accept_trip_invitation('SAFAR-ROLLBACK-EDITOR');
select pg_temp.assert(exists(select 1 from public.trips where id=(select id from fixtures where kind='trip')),'accepted editor can read');
insert into public.activities(trip_id,day_number,title) values((select id from fixtures where kind='trip'),1,'Editor activity');
update public.activities set title='Editor updated' where trip_id=(select id from fixtures where kind='trip');
select pg_temp.assert(exists(select 1 from public.activities where title='Editor updated' and trip_id=(select id from fixtures where kind='trip')),'editor can write');
do $$ declare affected integer; begin
  delete from public.trips where id=(select id from fixtures where kind='trip'); get diagnostics affected=row_count;
  if affected<>0 then raise exception 'FAIL: editor deleted trip'; end if;
  begin insert into public.trip_members(trip_id,user_id,role) values((select id from fixtures where kind='trip'),(select id from fixtures where kind='outsider'),'editor'); raise exception 'FAIL: editor invited outsider';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from fixtures where kind='viewer'),'role','authenticated')::text,true);
select pg_temp.assert(exists(select 1 from public.activities where trip_id=(select id from fixtures where kind='trip')),'viewer reads activities');
do $$ declare affected integer; begin
  update public.activities set title='Forbidden' where trip_id=(select id from fixtures where kind='trip'); get diagnostics affected=row_count;
  if affected<>0 then raise exception 'FAIL: viewer updated activity'; end if;
  begin insert into public.activities(trip_id,day_number,title) values((select id from fixtures where kind='trip'),1,'Forbidden'); raise exception 'FAIL: viewer inserted activity';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from fixtures where kind='owner'),'role','authenticated')::text,true);
delete from public.trip_members where trip_id=(select id from fixtures where kind='trip') and user_id=(select id from fixtures where kind='editor');
select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from fixtures where kind='editor'),'role','authenticated')::text,true);
select pg_temp.assert(not exists(select 1 from public.trips where id=(select id from fixtures where kind='trip')),'revocation takes effect');
reset role;
-- Isolated quota service; avoids consuming anyone's real allowance.
insert into public.service_limits values('rollback-test',true,2,3,3,4,100,150);
set local role service_role;
select pg_temp.assert((public.reserve_service_usage('rollback-test',(select id from fixtures where kind='owner'),40)->>'allowed')::boolean,'first reservation');
select pg_temp.assert((public.reserve_service_usage('rollback-test',(select id from fixtures where kind='owner'),40)->>'allowed')::boolean,'second reservation');
select pg_temp.assert(public.reserve_service_usage('rollback-test',(select id from fixtures where kind='owner'),1)->>'reason'='minute','user minute limit');
select pg_temp.assert((public.reserve_service_usage('rollback-test',(select id from fixtures where kind='editor'),60)->>'allowed')::boolean,'other user reservation');
select pg_temp.assert(public.reserve_service_usage('rollback-test',(select id from fixtures where kind='viewer'),1)->>'reason'='minute','global minute limit');
update public.service_usage set created_at=now()-interval '2 minutes' where service='rollback-test';
select pg_temp.assert(public.reserve_service_usage('rollback-test',(select id from fixtures where kind='owner'),21)->>'reason'='user_day','user token reservation limit');
select pg_temp.assert(public.reserve_service_usage('rollback-test',(select id from fixtures where kind='viewer'),11)->>'reason'='global_day','global token reservation limit');
reset role;
rollback;
select 'PASS: new-profile currency, owner/editor/viewer/outsider, email-bound invitation, revocation, service-only grants, user/global request and unit limits; all fixtures rolled back' as result;
