import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import { supabase } from '@/lib/supabase';

/** Uses the signed-in client's RLS; never exports sessions, passwords or API keys. */
export async function exportAccountData() {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user?.email_confirmed_at) throw new Error('Please sign in to export your data.');
  const tables = ['profiles', 'trips', 'trip_days', 'activities', 'bookings', 'expenses', 'packing_items', 'trip_notes', 'trip_photos', 'trip_members', 'trip_invitations', 'saved_destinations', 'ai_conversations', 'ai_messages', 'ai_proposals'];
  const records: Record<string, unknown[]> = {};
  for (const table of tables) {
    const rows: unknown[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase.from(table).select('*').order('id').range(offset, offset + 499);
      if (error) throw new Error('Your export could not be completed. Please try again.');
      rows.push(...(data ?? []));
      if (!data || data.length < 500) break;
      if (rows.length >= 10000) throw new Error('Your account needs a larger export. Please contact Safar support.');
    }
    records[table] = rows;
  }
  const text = JSON.stringify({ format: 'safar-account-export-v1', exportedAt: new Date().toISOString(), account: { id: auth.user.id, email: auth.user.email }, note: 'Includes currently accessible shared trips. Photos are metadata only, not original image files. Protect this file: it includes private plans, notes and booking references.', records }, null, 2);
  const filename = 'safar-data-' + new Date().toISOString().slice(0,10) + '.json';
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000); return;
  }
  if (!await Sharing.isAvailableAsync()) throw new Error('File sharing is not available on this device.');
  const { File, Paths } = await import('expo-file-system');
  const file = new File(Paths.cache, Date.now() + '-' + filename);
  try {
    file.create(); file.write(text);
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Save your Safar data' });
  } finally { if (file.exists) file.delete(); }
}
