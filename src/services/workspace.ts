import { supabase } from '@/lib/supabase';
import type { Activity, Booking, Expense, PackingItem, TripInvitation, TripMember, TripNote, TripPhoto } from '@/types/models';

type TableName = 'activities' | 'bookings' | 'packing_items' | 'expenses' | 'trip_notes' | 'trip_photos' | 'trip_members' | 'trip_invitations';
export async function listRows<T>(table: TableName, tripId: string, order = 'created_at') { const { data, error } = await supabase.from(table).select('*').eq('trip_id', tripId).order(order, { ascending: true }); if (error) throw error; return (data ?? []) as T[]; }
export async function addRow<T>(table: TableName, row: Record<string, unknown>) { const { data, error } = await supabase.from(table).insert(row).select('*').single(); if (error) throw error; return data as T; }
export async function editRow<T>(table: TableName, id: string, changes: Record<string, unknown>) { const { data, error } = await supabase.from(table).update(changes).eq('id', id).select('*').single(); if (error) throw error; return data as T; }
export async function removeRow(table: TableName, id: string) { const { data, error } = await supabase.from(table).delete().eq('id', id).select('id').maybeSingle(); if (error) throw error; if (!data) throw new Error('Nothing was deleted. This item may already be removed or your access may have changed.'); }
export const workspace = {
  activities: (id: string) => listRows<Activity>('activities', id, 'sort_order'), bookings: (id: string) => listRows<Booking>('bookings', id, 'starts_at'), packing: (id: string) => listRows<PackingItem>('packing_items', id, 'created_at'), expenses: (id: string) => listRows<Expense>('expenses', id, 'spent_on'), notes: (id: string) => listRows<TripNote>('trip_notes', id, 'updated_at'), photos: (id: string) => listRows<TripPhoto>('trip_photos', id), members: (id: string) => listRows<TripMember>('trip_members', id, 'joined_at'), invitations: (id: string) => listRows<TripInvitation>('trip_invitations', id),
};
export async function acceptInvitation(code: string) { const { data, error } = await supabase.rpc('accept_trip_invitation', { p_code: code.trim().toUpperCase() }); if (error) throw error; return data as string; }
export async function rejectInvitation(code: string) { const { error } = await supabase.rpc('reject_trip_invitation', { p_code: code.trim().toUpperCase() }); if (error) throw error; }
