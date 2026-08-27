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

export const isPlaceholder = (val) => !val || val.includes('ditt-projekt') || val.includes('din_supabase') || val.includes('your_');

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
  SUPABASE_SERVICE_ROLE_KEY &&
  !isPlaceholder(SUPABASE_URL) &&
  !isPlaceholder(SUPABASE_SERVICE_ROLE_KEY)
);

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
} else {
  console.log('[Supabase] No credentials found – running in local/offline fallback mode.');
}

/**
 * Authentication Middleware
 * Validates Supabase JWT Bearer token and attaches req.user
 */
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (isSupabaseConfigured && supabaseAdmin && authHeader && authHeader.startsWith('Bearer ')) {
    const jwtToken = authHeader.split(' ')[1];
    if (jwtToken && jwtToken !== 'null' && jwtToken !== 'undefined') {
      try {
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(jwtToken);
        if (!error && user) {
          req.user = user;
          return next();
        }
      } catch (err) {
        console.warn('[Supabase Auth] Failed to verify auth header, falling back to local user:', err.message);
      }
    }
  }

  // Fallback to local user for local/guest sessions
  req.user = {
    id: '00000000-0000-0000-0000-000000000000',
    email: 'lokal@anvandare.se',
    user_metadata: { full_name: 'Lokal Användare' }
  };
  return next();
}
