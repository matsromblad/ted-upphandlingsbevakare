import { createClient, SupabaseClient } from '@supabase/supabase-js';

const initialUrl = import.meta.env.VITE_SUPABASE_URL || '';
const initialKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export let supabase: SupabaseClient | null = (initialUrl && initialKey)
  ? createClient(initialUrl, initialKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  : null;

export let isSupabaseConfigured = Boolean(supabase);

const configListeners = new Set<(configured: boolean) => void>();

export function subscribeSupabaseConfig(listener: (configured: boolean) => void) {
  configListeners.add(listener);
  listener(isSupabaseConfigured);
  return () => {
    configListeners.delete(listener);
  };
}

export async function ensureSupabaseClient(): Promise<SupabaseClient | null> {
  if (supabase) {
    return supabase;
  }

  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    if (data.supabaseUrl && data.supabaseAnonKey) {
      supabase = createClient(data.supabaseUrl, data.supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        }
      });
      isSupabaseConfigured = true;
      configListeners.forEach((fn) => fn(true));
      return supabase;
    }
  } catch (e) {
    console.warn('[Supabase Client] Failed to fetch config from backend:', e);
  }

  return null;
}

// Automatically attempt runtime init on load
if (!supabase) {
  ensureSupabaseClient();
}

/**
 * Get current user access token to attach to API requests
 */
export async function getAccessToken(): Promise<string | null> {
  const client = await ensureSupabaseClient();
  if (!client) return null;
  try {
    const { data: { session } } = await client.auth.getSession();
    return session?.access_token || null;
  } catch (e) {
    return null;
  }
}

/**
 * SSO Login with Google
 */
export async function signInWithGoogle() {
  const client = await ensureSupabaseClient();
  if (!client) throw new Error('Supabase är inte konfigurerat');
  return client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });
}

/**
 * SSO Login with GitHub
 */
export async function signInWithGithub() {
  const client = await ensureSupabaseClient();
  if (!client) throw new Error('Supabase är inte konfigurerat');
  return client.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: window.location.origin
    }
  });
}

/**
 * Email & Password sign in
 */
export async function signInWithPassword(email: string, password: string) {
  const client = await ensureSupabaseClient();
  if (!client) throw new Error('Supabase är inte konfigurerat');
  return client.auth.signInWithPassword({ email, password });
}

/**
 * Email & Password sign up
 * Creates/confirms user on backend (avoiding email rate limits) and logs in immediately
 */
export async function signUpWithPassword(email: string, password: string, fullName = '') {
  const client = await ensureSupabaseClient();
  if (!client) throw new Error('Supabase är inte konfigurerat');

  // Call backend registration endpoint
  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, fullName })
  });

  const result = await res.json();
  if (!result.success) {
    throw new Error(result.error || 'Kunde inte skapa konto');
  }

  // Automatically sign in to get active session
  return client.auth.signInWithPassword({ email, password });
}

/**
 * Sign out
 */
export async function signOut() {
  const client = await ensureSupabaseClient();
  if (!client) return;
  return client.auth.signOut();
}
