import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });
dotenv.config();

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
  // If Supabase is not configured, use local default user
  if (!isSupabaseConfigured) {
    req.user = {
      id: '00000000-0000-0000-0000-000000000000',
      email: 'lokal@anvandare.se',
      user_metadata: { full_name: 'Lokal Användare' }
    };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Autentisering krävs (Bearer token saknas)' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ success: false, error: 'Ogiltig eller utgången session', details: error?.message });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Kunde inte verifiera autentisering', details: err.message });
  }
}
