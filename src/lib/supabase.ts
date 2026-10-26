import type { SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** False se il deploy non ha le chiavi (la chiave "anon" è pubblica per progetto; la sicurezza sta nelle regole RLS). */
export const supabaseConfigured = Boolean(url && key);

let client: Promise<SupabaseClient> | undefined;

/** Carica supabase-js solo quando serve: la home non lo scarica se non c'è una sessione. */
export function getSupabase(): Promise<SupabaseClient | null> {
  if (!supabaseConfigured) return Promise.resolve(null);
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(url!, key!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } }),
  );
  return client;
}

/** True se ha senso inizializzare subito il client (sessione salvata o ritorno da OAuth/conferma email). */
export function shouldBootstrapAuth(): boolean {
  if (!supabaseConfigured || typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  if (params.has('code') || window.location.hash.includes('access_token')) return true;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith('sb-') && k.endsWith('-auth-token')) return true;
  }
  return false;
}
