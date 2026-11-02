-- INSERT ... RETURNING also evaluates SELECT RLS. STABLE ownership helpers
-- cannot see a row inserted by the current statement. Read the new row's owner
-- directly, keeping the existing membership helper for collaborators.
alter policy "safar trips select" on public.trips
  using (user_id = (select auth.uid()) or private.can_view_trip(id));
