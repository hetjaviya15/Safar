-- Safar policy and index hardening after the additive core rollout.
-- Removes only the legacy policies superseded by the collaboration-aware Safar policies.
drop policy if exists "Users can create own trips" on public.trips;
drop policy if exists "Users can delete own trips" on public.trips;
drop policy if exists "Users can read own trips" on public.trips;
drop policy if exists "Users can update own trips" on public.trips;

create index if not exists trips_user_idx on public.trips(user_id);
create index if not exists activities_created_by_idx on public.activities(created_by);
create index if not exists bookings_created_by_idx on public.bookings(created_by);
create index if not exists expenses_created_by_idx on public.expenses(created_by);
create index if not exists packing_items_created_by_idx on public.packing_items(created_by);
create index if not exists trip_notes_created_by_idx on public.trip_notes(created_by);
create index if not exists trip_photos_trip_idx on public.trip_photos(trip_id);
create index if not exists trip_photos_uploaded_by_idx on public.trip_photos(uploaded_by);
create index if not exists trip_invitations_trip_idx on public.trip_invitations(trip_id);
create index if not exists trip_invitations_invited_by_idx on public.trip_invitations(invited_by);
create index if not exists trip_invitations_accepted_by_idx on public.trip_invitations(accepted_by);
create index if not exists ai_conversations_trip_idx on public.ai_conversations(trip_id);
create index if not exists ai_conversations_user_idx on public.ai_conversations(user_id);
create index if not exists ai_messages_conversation_idx on public.ai_messages(conversation_id);
create index if not exists ai_messages_trip_idx on public.ai_messages(trip_id);

notify pgrst, 'reload schema';
