export const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
export const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
export class SafeError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
/** Enforces the byte limit while streaming (Content-Length is not trusted). */
export async function readTextLimited(response: Request | Response, maxBytes: number) {
  const reader = response.body?.getReader(); if (!reader) return '';
  const decoder = new TextDecoder(); let total = 0; let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      total += value.byteLength;
      if (total > maxBytes) { await reader.cancel(); throw new SafeError('The request or response is too large.', 413); }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally { reader.releaseLock(); }
}
export async function readBody(request: Request, maxBytes = 8192) {
  let body: unknown;
  try { body = JSON.parse(await readTextLimited(request, maxBytes)); }
  catch (error) { if (error instanceof SafeError) throw error; throw new SafeError('Send a valid JSON request.'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new SafeError('Send a valid request.');
  return body as Record<string, unknown>;
}
export const uuid = (value: unknown) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
