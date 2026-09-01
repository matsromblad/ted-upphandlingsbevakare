import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });
dotenv.config();

// Avoid SSL certificate errors in corporate proxy environments on Windows
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === undefined) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

export const isPlaceholder = (val) => !val || val.includes('ditt-projekt') || val.includes('din_supabase') || val.includes('your_');

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
  SUPABASE_SERVICE_ROLE_KEY &&
  !isPlaceholder(SUPABASE_URL) &&
  !isPlaceholder(SUPABASE_SERVICE_ROLE_KEY)
);

const hasAnonKey = Boolean(SUPABASE_ANON_KEY && !isPlaceholder(SUPABASE_ANON_KEY));

export const supabaseAdmin = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

if (isSupabaseConfigured) {
  console.log('[Supabase] Initialized cloud database & auth client.');
  if (!hasAnonKey) {
    console.warn('[Supabase] SUPABASE_ANON_KEY is not set – per-user requests will fall back to the service-role client, which bypasses Row Level Security. Set SUPABASE_ANON_KEY to enforce RLS.');
  }
} else {
  console.log('[Supabase] No credentials found – running in local/offline fallback mode.');
}

/**
 * Builds a Supabase client scoped to a single user's JWT. PostgREST requests made through
 * this client run as that user (auth.uid() resolves to their id), so Row Level Security
 * policies in supabase/schema.sql are the actual enforcement boundary for user-initiated
 * data access — not just the manual .eq('user_id', ...) filters in db.js.
 *
 * Returns null if the anon key isn't configured; callers should fall back to supabaseAdmin
 * in that case (functional, but RLS is bypassed).
 */
export function getUserScopedClient(jwtToken) {
  if (!isSupabaseConfigured || !hasAnonKey) return null;
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: { Authorization: `Bearer ${jwtToken}` }
    }
  });
}

/**
 * Authentication Middleware
 * - Local/offline mode (no Supabase configured): attaches a fixed local single-user identity.
 * - Cloud mode (Supabase configured): requires a valid Supabase JWT Bearer token. Missing or
 *   invalid tokens are rejected with 401 rather than silently falling back to a shared guest
 *   user, since that would let unauthenticated requests read/write other users' private data.
 *   Also attaches req.db: a client scoped to the caller's JWT so downstream DAO calls run
 *   under Row Level Security instead of the all-access service-role client.
 */
export async function requireAuth(req, res, next) {
  if (!isSupabaseConfigured || !supabaseAdmin) {
    req.user = {
      id: '00000000-0000-0000-0000-000000000000',
      email: 'lokal@anvandare.se',
      user_metadata: { full_name: 'Lokal Användare' }
    };
    req.db = null;
    return next();
  }

  const authHeader = req.headers.authorization;
  const jwtToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!jwtToken || jwtToken === 'null' || jwtToken === 'undefined') {
    return res.status(401).json({ success: false, error: 'Inloggning krävs' });
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(jwtToken);
    if (error || !user) {
      return res.status(401).json({ success: false, error: 'Ogiltig eller utgången session' });
    }

    req.user = user;
    // Falls back to supabaseAdmin only if SUPABASE_ANON_KEY isn't configured (see warning at startup).
    req.db = getUserScopedClient(jwtToken) || supabaseAdmin;

    // Asynchronously update last_active_at on profiles
    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || '';
    const email = user.email || '';
    supabaseAdmin
      .from('profiles')
      .upsert({
        id: user.id,
        email,
        full_name: fullName,
        last_active_at: new Date().toISOString()
      }, { onConflict: 'id' })
      .then(() => {})
      .catch(() => {});

    return next();
  } catch (err) {
    console.warn('[Supabase Auth] Failed to verify auth header:', err.message);
    return res.status(401).json({ success: false, error: 'Autentisering misslyckades' });
  }
}

/**
 * Admin Authorization Middleware
 * Allows access if:
 * 1. Running in local/offline mode
 * 2. User email is 'mats.romblad@wsp.com'
 * 3. User metadata has role: 'admin'
 * 4. User profile has role: 'admin'
 */
export async function requireAdmin(req, res, next) {
  return requireAuth(req, res, async () => {
    if (!isSupabaseConfigured || !supabaseAdmin) {
      req.isAdmin = true;
      return next();
    }

    const email = (req.user?.email || '').toLowerCase();
    if (email === 'mats.romblad@wsp.com' || req.user?.user_metadata?.role === 'admin') {
      req.isAdmin = true;
      return next();
    }

    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', req.user.id)
        .single();

      if (profile && profile.role === 'admin') {
        req.isAdmin = true;
        return next();
      }
    } catch (e) {
      console.warn('[Admin Auth] Error checking profile role:', e.message);
    }

    return res.status(403).json({
      success: false,
      error: 'Behörighet saknas. Endast administratörer har tillgång till denna funktion.'
    });
  });
}

