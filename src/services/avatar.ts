import { supabase } from '@/lib/supabase';
import { saveProfile } from './profile';

const bucket = 'safar-avatars';
const prefix = 'avatar://';

export async function resolveAvatarUrl(value?: string | null): Promise<string | null> {
  if (!value) return null;
  if (!value.startsWith(prefix)) return /^https:\/\//.test(value) ? value : null;
  try {
    const path = value.slice(prefix.length);
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

export async function uploadAvatar(bytes: ArrayBuffer | Uint8Array, contentType: string) {
  if (!bytes.byteLength || bytes.byteLength < 50) throw new Error('Could not read image file. Please choose another photo.');
  if (bytes.byteLength > 5 * 1024 * 1024) throw new Error('Choose an image smaller than 5 MB.');

  let normalizedType = (contentType || 'image/jpeg').toLowerCase();
  if (normalizedType === 'image/jpg') normalizedType = 'image/jpeg';

  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  const extension = extensions[normalizedType];
  if (!extension) throw new Error('Choose a JPEG, PNG or WebP image.');

  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw authError ?? new Error('Sign in required.');

  const path = `${auth.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType: normalizedType,
    upsert: false,
    cacheControl: '3600',
  });
  if (error) throw error;

  try {
    const profile = await saveProfile({ avatar_url: prefix + path });
    const displayUrl = await resolveAvatarUrl(profile.avatar_url);
    return { profile, displayUrl };
  } catch (error) {
    const { data } = await supabase.from('profiles').select('avatar_url').eq('id', auth.user.id).maybeSingle();
    if (data && data.avatar_url !== prefix + path) await supabase.storage.from(bucket).remove([path]);
    throw error;
  }
}

export async function removeAvatar() {
  return saveProfile({ avatar_url: null });
}

