-- Covers the remaining trip_notes foreign key reported by the database advisor.
create index if not exists trip_notes_trip_idx on public.trip_notes(trip_id);
