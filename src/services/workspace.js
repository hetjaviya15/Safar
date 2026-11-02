import { supabase } from '@/lib/supabase';
export async function listRows(table, tripId, order = 'created_at') {
  const {
    data,
    error
  } = await supabase.from(table).select('*').eq('trip_id', tripId).order(order, {
    ascending: true
  });
  if (error) throw error;
  return data ?? [];
}
export async function addRow(table, row) {
  const {
    data,
    error
  } = await supabase.from(table).insert(row).select('*').single();
  if (error) throw error;
  return data;
}
export async function editRow(table, id, changes) {
  const {
    data,
    error
  } = await supabase.from(table).update(changes).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}
export async function removeRow(table, id) {
  const {
    data,
    error
  } = await supabase.from(table).delete().eq('id', id).select('id').maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Nothing was deleted. This item may already be removed or your access may have changed.');
}
export const workspace = {
  activities: id => listRows('activities', id, 'sort_order'),
  bookings: id => listRows('bookings', id, 'starts_at'),
  packing: id => listRows('packing_items', id, 'created_at'),
  expenses: id => listRows('expenses', id, 'spent_on'),
  notes: id => listRows('trip_notes', id, 'updated_at'),
  photos: id => listRows('trip_photos', id),
  members: id => listRows('trip_members', id, 'joined_at'),
  invitations: id => listRows('trip_invitations', id)
};
export async function acceptInvitation(code) {
  const {
    data,
    error
  } = await supabase.rpc('accept_trip_invitation', {
    p_code: code.trim().toUpperCase()
  });
  if (error) throw error;
  return data;
}
export async function rejectInvitation(code) {
  const {
    error
  } = await supabase.rpc('reject_trip_invitation', {
    p_code: code.trim().toUpperCase()
  });
  if (error) throw error;
}