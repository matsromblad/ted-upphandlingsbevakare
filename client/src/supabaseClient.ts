import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  : null;

/**
 * Get current user access token to attach to API requests
 */
export async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (e) {
    return null;
  }
}

/**
 * SSO Login with Google
 */
export async function signInWithGoogle() {
  if (!supabase) throw new Error('Supabase är inte konfigurerat');
  return supabase.auth.signInWithOAuth({
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
  if (!supabase) throw new Error('Supabase är inte konfigurerat');
  return supabase.auth.signInWithOAuth({
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
  if (!supabase) throw new Error('Supabase är inte konfigurerat');
  return supabase.auth.signInWithPassword({ email, password });
}

/**
 * Email & Password sign up
 */
export async function signUpWithPassword(email: string, password: string, fullName = '') {
  if (!supabase) throw new Error('Supabase är inte konfigurerat');
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName }
    }
  });
}

/**
 * Sign out
 */
export async function signOut() {
  if (!supabase) return;
  return supabase.auth.signOut();
}
