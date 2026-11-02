import { defaultCurrency } from '@/utils/locale';
import { supabase } from '@/lib/supabase';
export async function getProfile() {
  const {
    data: auth,
    error: authError
  } = await supabase.auth.getUser();
  if (authError || !auth.user) throw authError ?? new Error('Sign in required.');
  const {
    data,
    error
  } = await supabase.from('profiles').select('*').eq('id', auth.user.id).maybeSingle();
  if (error) throw error;
  return data ?? {
    id: auth.user.id,
    full_name: auth.user.user_metadata.full_name ?? null,
    avatar_url: null,
    preferred_currency: defaultCurrency(),
    preferred_language: 'en',
    travel_preferences: [],
    notifications_enabled: true
  };
}
export async function saveProfile(profile) {
  const {
    data: auth
  } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Sign in required.');
  const {
    data,
    error
  } = await supabase.from('profiles').upsert({
    ...profile,
    id: auth.user.id
  }, {
    onConflict: 'id'
  }).select('*').single();
  if (error) throw error;
  return data;
}