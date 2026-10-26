export function messageFromError(error: unknown, fallback = 'Something went wrong. Please try again.') {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') return error.message;
  return fallback;
}
export function isMissingRelation(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const record = error as { code?: string; message?: string };
  return record.code === '42P01' || Boolean(record.message?.includes('schema cache'));
}
