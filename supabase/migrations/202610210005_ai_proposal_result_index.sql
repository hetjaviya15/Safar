-- Covers the proposal result foreign key reported by the database advisor.
create index if not exists ai_proposals_resulting_trip_idx on public.ai_proposals(resulting_trip_id) where resulting_trip_id is not null;
