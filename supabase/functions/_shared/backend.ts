import { createClient } from 'jsr:@supabase/supabase-js@2';
import { SafeError } from './http.ts';

export async function authorizedBackend(request: Request) {
  const authorization = request.headers.get('Authorization');
  if (!authorization) throw new SafeError('Please sign in to continue.', 401);
  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anon || !secret) throw new SafeError('This service is temporarily unavailable.', 503);
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const client = createClient(url, anon, { ...options, global: { headers: { Authorization: authorization } } });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new SafeError('Please sign in again.', 401);
  if (!data.user.email_confirmed_at) throw new SafeError('Verify your email before continuing.', 403);
  // Administrative client is used ONLY for limits and public-provider cache.
  // All trip/conversation reads and writes continue to use the user's RLS client.
  const admin = createClient(url, secret, options);
  return { client, admin, user: data.user };
}
type ServiceClient = Awaited<ReturnType<typeof authorizedBackend>>['admin'];
export async function reserve(admin: ServiceClient, userId: string, service: string, units = 1) {
  const { data, error } = await admin.rpc('reserve_service_usage', { p_service: service, p_user_id: userId, p_units: units });
  if (error || !data) throw new SafeError('This service is temporarily unavailable. Manual planning still works.', 503);
  if (!data.allowed) {
    const message = data.reason === 'user_day' ? 'Your daily allowance is used. Please try again tomorrow.' : data.reason === 'minute' ? 'Please wait a minute before trying again.' : 'This service is taking a break. Please try again later.';
    throw new SafeError(message + ' Manual planning still works.', 429);
  }
  return data as { id: string; remainingRequests: number };
}
export async function finishUsage(admin: ServiceClient, id: string, outcome: string, started: number, actualUnits?: number) {
  const { error } = await admin.from('service_usage').update({ outcome, duration_ms: Math.max(0, Date.now() - started), ...(Number.isInteger(actualUnits) && actualUnits! >= 0 ? { actual_units: actualUnits } : {}) }).eq('id', id).eq('outcome', 'reserved');
  if (error) console.error(JSON.stringify({ event: 'usage_log_failed', requestId: id }));
}
