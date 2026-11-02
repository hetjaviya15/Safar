import { supabase } from '@/lib/supabase';
export async function invokeBackend(name, body, signal) {
  const {
    data,
    error
  } = await supabase.functions.invoke(name, {
    body,
    signal
  });
  if (error) {
    let message = 'The service could not be reached. Please try again.';
    const context = error.context;
    if (context) {
      try {
        const cloned = typeof context.clone === 'function' ? context.clone() : context;
        if (typeof cloned.json === 'function') {
          const payload = await cloned.json();
          if (typeof payload?.error === 'string' && payload.error.length < 300) {
            message = payload.error;
          }
        } else if (typeof cloned.text === 'function') {
          const text = await cloned.text();
          try {
            const payload = JSON.parse(text);
            if (typeof payload?.error === 'string' && payload.error.length < 300) message = payload.error;
          } catch {
            if (text && text.length < 300) message = text;
          }
        }
      } catch {
        // Fall back to message
      }
    }
    throw new Error(message);
  }
  if (!data || data.error) throw new Error(typeof data?.error === 'string' ? data.error : 'The service could not complete this request.');
  return data;
}