import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { todayKey } from '@/utils/date';
function computedStatus(trip) {
  if (trip.archived_at) return 'archived';
  if (trip.status === 'draft') return 'draft';
  const today = todayKey();
  if (trip.end_date < today) return 'completed';
  if (trip.start_date <= today && trip.end_date >= today) return 'ongoing';
  return 'upcoming';
}
export async function listTrips() {
  const {
    data: auth,
    error: authError
  } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    // Local session identity is used ONLY for a read-only cached list during a
    // network failure, never to authorize a database operation.
    if (authError?.name === 'AuthRetryableFetchError') {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (session?.user.email_confirmed_at && (session.expires_at ?? 0) * 1000 > Date.now()) {
        const cached = await AsyncStorage.getItem(`safar.trips.cache.v3.${session.user.id}`);
        if (cached) return {
          trips: JSON.parse(cached).map(t => ({
            ...t,
            status: computedStatus(t)
          })),
          cached: true
        };
      }
    }
    throw authError ?? new Error('Please sign in again.');
  }
  const cacheKey = `safar.trips.cache.v3.${auth.user.id}`;
  const [{
    data,
    error
  }, memberships] = await Promise.all([supabase.from('trips').select('*').order('start_date', {
    ascending: true
  }), auth.user ? supabase.from('trip_members').select('trip_id,role').eq('user_id', auth.user.id) : Promise.resolve({
    data: [],
    error: null
  })]);
  if (error) {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) return {
      trips: JSON.parse(cached).map(t => ({
        ...t,
        status: computedStatus(t)
      })),
      cached: true
    };
    throw error;
  }
  if (memberships.error) throw memberships.error;
  const roleByTrip = new Map((memberships.data ?? []).map(row => [row.trip_id, row.role]));
  const trips = (data ?? []).map(t => ({
    ...t,
    status: computedStatus(t),
    member_role: t.user_id === auth.user?.id ? 'owner' : roleByTrip.get(t.id)
  }));
  await AsyncStorage.setItem(cacheKey, JSON.stringify(trips));
  return {
    trips,
    cached: false
  };
}
export async function getTrip(id) {
  const {
    data,
    error
  } = await supabase.from('trips').select('*').eq('id', id).single();
  if (error) throw error;
  return {
    ...data,
    status: computedStatus(data)
  };
}
export async function createTrip(draft) {
  const {
    data: auth,
    error: authError
  } = await supabase.auth.getUser();
  if (authError || !auth.user?.email_confirmed_at) throw authError ?? new Error('A verified account is required.');
  const base = {
    user_id: auth.user.id,
    title: draft.title.trim(),
    destination: draft.destination.displayName,
    start_date: draft.startDate,
    end_date: draft.endDate,
    travelers: draft.travelers,
    budget: draft.noBudgetLimit ? null : draft.budget,
    currency: draft.currency,
    status: 'upcoming'
  };
  const enriched = {
    ...base,
    destination_place_id: draft.destination.placeId,
    destination_lat: draft.destination.latitude ?? null,
    destination_lon: draft.destination.longitude ?? null,
    traveler_type: draft.travelerType,
    no_budget_limit: draft.noBudgetLimit,
    interests: draft.interests,
    cover_image_url: draft.destination.imageUrl ?? null
  };
  const {
    data,
    error
  } = await supabase.from('trips').insert(enriched).select('*').single();
  if (error) throw error;
  return data;
}
export async function updateTrip(id, updates) {
  const {
    data,
    error
  } = await supabase.from('trips').update(updates).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}
export async function deleteTrip(id) {
  const {
    data,
    error
  } = await supabase.from('trips').delete().eq('id', id).select('id').maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Trip was not deleted. It may already be removed or your access may have changed.');
}
export async function archiveTrip(id) {
  return updateTrip(id, {
    archived_at: new Date().toISOString()
  });
}
export async function restoreTrip(id) {
  return updateTrip(id, {
    archived_at: null
  });
}
export async function duplicateTrip(trip) {
  const {
    data: auth
  } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Sign in required.');
  const {
    id: _id,
    created_at: _created,
    updated_at: _updated,
    member_role: _role,
    ...copy
  } = trip;
  const {
    data,
    error
  } = await supabase.from('trips').insert({
    ...copy,
    user_id: auth.user.id,
    title: `${trip.title} (copy)`,
    status: 'draft',
    archived_at: null
  }).select('*').single();
  if (error) throw error;
  return data;
}