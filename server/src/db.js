import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabaseAdmin, isSupabaseConfigured } from './supabase.js';
import { buildExpertQuery } from './services/tedService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default profile for WSP Sverige / BIM unit
export const DEFAULT_COMPANY_PROFILE = {
  name: 'WSP Sverige AB (BIM-enheten)',
  description: 'WSP Sverige AB är ett ledande analys- och teknikkonsultföretag. BIM-enheten arbetar med BIM-samordning, digital informationshantering, 3D/4D/5D-modellering, VDC, GIS-integration, digitala tvillingar och projekteringsledning inom husbyggnad, anläggning och infrastruktur.',
  keywords: 'BIM, BIM-samordning, VDC, Building Information Modeling, digital informationshantering, 3D-modellering, CAD, digital tvilling, projektering, samhällsbyggnad',
  preferred_cpv: ['71300000', '71240000', '71320000', '71541000', '72224000'],
  preferred_countries: ['SWE'],
  min_value: 0
};

// Default watchlists tailored for BIM / WSP unit
export const DEFAULT_WATCHLISTS = [
  {
    name: 'BIM & Digital Informationshantering (Sverige)',
    filters: {
      keywords: 'BIM OR VDC OR "Building Information Modeling" OR "digital tvilling"',
      countries: ['SWE'],
      formType: 'competition',
      datePreset: '30d'
    },
    interval_minutes: 60,
    email_frequency: 'daily'
  },
  {
    name: 'BIM-samordning & Projekteringsstöd (Sverige)',
    filters: {
      keywords: 'BIM-samordnare OR BIM-ledare OR CAD-samordning',
      cpv: ['71300000', '71240000', '71320000'],
      countries: ['SWE'],
      formType: 'competition',
      datePreset: '30d'
    },
    interval_minutes: 60,
    email_frequency: 'daily'
  }
];

// Local SQLite fallback instance
const dbPath = path.join(__dirname, '..', 'ted_monitor.db');
const localDb = new DatabaseSync(dbPath);

// Initialize local SQLite tables with user_id
localDb.exec(`
  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    company_name TEXT DEFAULT 'WSP Sverige AB (BIM-enheten)',
    description TEXT DEFAULT 'WSP Sverige AB är ett ledande analys- och teknikkonsultföretag. BIM-enheten arbetar med BIM-samordning, digital informationshantering, 3D/4D/5D-modellering, VDC, GIS-integration, digitala tvillingar och projekteringsledning inom husbyggnad, anläggning och infrastruktur.',
    keywords TEXT DEFAULT 'BIM, BIM-samordning, VDC, Building Information Modeling, digital informationshantering, 3D-modellering, CAD, digital tvilling, projektering, samhällsbyggnad',
    preferred_cpv TEXT DEFAULT '["71300000", "71240000", "71320000", "71541000", "72224000"]',
    preferred_countries TEXT DEFAULT '["SWE"]',
    min_value INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS watchlists (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    name TEXT NOT NULL,
    query TEXT,
    filters_json TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    interval_minutes INTEGER DEFAULT 60,
    email_frequency TEXT NOT NULL DEFAULT 'daily',
    last_email_sent_at TEXT,
    unsubscribe_token TEXT,
    last_run_at TEXT,
    last_hit_count INTEGER DEFAULT 0,
    new_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS watchlist_hits (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    watchlist_id TEXT NOT NULL,
    notice_id TEXT NOT NULL,
    notice_data_json TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    is_saved INTEGER DEFAULT 0,
    emailed_at TEXT,
    discovered_at TEXT DEFAULT (datetime('now', 'localtime')),
    UNIQUE(user_id, watchlist_id, notice_id)
  );

  CREATE TABLE IF NOT EXISTS saved_tenders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    notice_id TEXT NOT NULL,
    title TEXT NOT NULL,
    buyer TEXT,
    country TEXT,
    deadline TEXT,
    estimated_value TEXT,
    status TEXT DEFAULT 'INBOX',
    priority TEXT DEFAULT 'MEDIUM',
    notes TEXT DEFAULT '',
    internal_deadline TEXT,
    assigned_to TEXT DEFAULT '',
    tags_json TEXT DEFAULT '[]',
    notice_data_json TEXT NOT NULL,
    ai_analysis_json TEXT,
    saved_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime')),
    UNIQUE(user_id, notice_id)
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    session_id TEXT DEFAULT 'default',
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    context_notice_id TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
`);

// Safe column migrations for existing SQLite databases
function ensureColumn(table, column, definition) {
  try {
    localDb.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } catch (e) {
    // Column already exists, ignore error
  }
}

ensureColumn('watchlists', 'user_id', "TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'");
ensureColumn('watchlists', 'email_frequency', "TEXT NOT NULL DEFAULT 'daily'");
ensureColumn('watchlists', 'last_email_sent_at', 'TEXT');
ensureColumn('watchlists', 'unsubscribe_token', 'TEXT');
ensureColumn('watchlist_hits', 'user_id', "TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'");
ensureColumn('watchlist_hits', 'emailed_at', 'TEXT');
ensureColumn('saved_tenders', 'user_id', "TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'");
ensureColumn('chat_messages', 'user_id', "TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'");

// Update legacy placeholder profiles to WSP Sverige AB (BIM-enheten)
try {
  localDb.exec(`
    UPDATE profiles
    SET company_name = '${DEFAULT_COMPANY_PROFILE.name}',
        description = '${DEFAULT_COMPANY_PROFILE.description}',
        keywords = '${DEFAULT_COMPANY_PROFILE.keywords}',
        preferred_cpv = '${JSON.stringify(DEFAULT_COMPANY_PROFILE.preferred_cpv)}',
        preferred_countries = '${JSON.stringify(DEFAULT_COMPANY_PROFILE.preferred_countries)}'
    WHERE company_name = 'Mitt Företag AB' OR company_name IS NULL OR company_name = '';
  `);
} catch (e) {
  // Ignore migration error
}

const WATCHLIST_EMAIL_FREQUENCIES = new Set(['daily', 'weekly']);

function deriveWatchlistEmailFrequency(watchlist) {
  if (WATCHLIST_EMAIL_FREQUENCIES.has(watchlist?.email_frequency)) {
    return watchlist.email_frequency;
  }

  return Number(watchlist?.interval_minutes) >= 7 * 24 * 60 ? 'weekly' : 'daily';
}

async function persistWatchlistMetadata(id, userId, patch) {
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabaseAdmin
        .from('watchlists')
        .update(patch)
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        console.warn('[Supabase Migration Notice] Kunde inte uppdatera watchlists metadata:', error.message);
      }
    } catch (e) {
      console.warn('[Supabase Migration Notice] Undantag vid uppdatering av watchlists metadata:', e.message);
    }
    return;
  }

  const existing = localDb.prepare('SELECT email_frequency, last_email_sent_at, unsubscribe_token FROM watchlists WHERE id = ? AND user_id = ?').get(id, userId);
  if (!existing) {
    return;
  }

  localDb.prepare(`
    UPDATE watchlists
    SET email_frequency = ?, last_email_sent_at = ?, unsubscribe_token = ?
    WHERE id = ? AND user_id = ?
  `).run(
    patch.email_frequency ?? existing.email_frequency,
    patch.last_email_sent_at ?? existing.last_email_sent_at ?? null,
    patch.unsubscribe_token ?? existing.unsubscribe_token ?? null,
    id,
    userId
  );
}

async function normalizeWatchlistRecord(watchlist) {
  if (!watchlist) {
    return null;
  }

  const patch = {};
  const emailFrequency = deriveWatchlistEmailFrequency(watchlist);
  if (watchlist.email_frequency !== emailFrequency) {
    patch.email_frequency = emailFrequency;
  }

  if (!watchlist.unsubscribe_token) {
    patch.unsubscribe_token = randomUUID();
  }

  if (Object.keys(patch).length > 0) {
    await persistWatchlistMetadata(watchlist.id, watchlist.user_id, patch);
  }

  return {
    ...watchlist,
    ...patch,
    filters_json: typeof watchlist.filters_json === 'object' ? JSON.stringify(watchlist.filters_json) : watchlist.filters_json,
    email_frequency: patch.email_frequency || emailFrequency
  };
}

async function normalizeWatchlistCollection(watchlists) {
  return Promise.all((watchlists || []).map(normalizeWatchlistRecord));
}

export const isCloudUser = (userId) => Boolean(isSupabaseConfigured && userId && userId !== '00000000-0000-0000-0000-000000000000');

// ==============================================================================
// WATCHLISTS DAO (Supabase + Local SQLite)
// ==============================================================================
export const watchlistDao = {
  // client defaults to supabaseAdmin for system callers (e.g. signup, before a user session
  // exists); routes pass req.db so inserts run under the caller's own RLS-checked identity.
  seedDefaults: async (userId, client = supabaseAdmin) => {
    const createdList = [];
    for (const def of DEFAULT_WATCHLISTS) {
      const id = 'wl-' + randomUUID().substring(0, 8);
      const query = buildExpertQuery(def.filters);
      const item = {
        id,
        user_id: userId,
        name: def.name,
        query,
        filters_json: JSON.stringify(def.filters),
        active: 1,
        interval_minutes: def.interval_minutes || 60,
        email_frequency: def.email_frequency || 'daily'
      };
      const created = await watchlistDao.create(item, client);
      createdList.push(created);
    }
    return createdList;
  },

  getAll: async (userId, client = supabaseAdmin) => {
    if (isCloudUser(userId)) {
      const { data, error } = await client
        .from('watchlists')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) {
        return watchlistDao.seedDefaults(userId, client);
      }
      return normalizeWatchlistCollection(data || []);
    }

    const rows = localDb.prepare('SELECT * FROM watchlists WHERE user_id = ? ORDER BY created_at DESC').all(userId);
    if (!rows || rows.length === 0) {
      return watchlistDao.seedDefaults(userId);
    }
    return normalizeWatchlistCollection(rows);
  },

  getAllActiveSystem: async () => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('watchlists')
        .select('*')
        .eq('active', true);
      if (error) throw error;
      return normalizeWatchlistCollection(data || []);
    }

    const rows = localDb.prepare('SELECT * FROM watchlists WHERE active = 1').all();
    return normalizeWatchlistCollection(rows);
  },

  getById: async (id, userId, client = supabaseAdmin) => {
    if (isCloudUser(userId)) {
      const { data } = await client.from('watchlists').select('*').eq('id', id).eq('user_id', userId).single();
      return normalizeWatchlistRecord(data);
    }
    if (userId) {
      const row = localDb.prepare('SELECT * FROM watchlists WHERE id = ? AND user_id = ?').get(id, userId);
      return normalizeWatchlistRecord(row);
    }
    const row = localDb.prepare('SELECT * FROM watchlists WHERE id = ?').get(id);
    return normalizeWatchlistRecord(row);
  },

  getByUnsubscribeToken: async (token) => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('watchlists')
        .select('*')
        .eq('unsubscribe_token', token)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return normalizeWatchlistRecord(data);
    }

    const row = localDb.prepare('SELECT * FROM watchlists WHERE unsubscribe_token = ?').get(token);
    return normalizeWatchlistRecord(row);
  },

  create: async (item, client = supabaseAdmin) => {
    if (isCloudUser(item.user_id)) {
      const payload = {
        id: item.id,
        user_id: item.user_id,
        name: item.name,
        query: item.query,
        filters_json: typeof item.filters_json === 'string' ? JSON.parse(item.filters_json) : item.filters_json,
        active: Boolean(item.active),
        interval_minutes: item.interval_minutes || 60,
        email_frequency: deriveWatchlistEmailFrequency(item),
        unsubscribe_token: item.unsubscribe_token || randomUUID(),
        last_email_sent_at: item.last_email_sent_at || null
      };
      const { data, error } = await client.from('watchlists').insert(payload).select().single();
      if (error) throw error;
      return normalizeWatchlistRecord(data);
    }

    localDb.prepare(`
      INSERT INTO watchlists (
        id, user_id, name, query, filters_json, active, interval_minutes,
        email_frequency, last_email_sent_at, unsubscribe_token, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    `).run(
      item.id,
      item.user_id,
      item.name,
      item.query,
      item.filters_json,
      item.active ? 1 : 0,
      item.interval_minutes,
      deriveWatchlistEmailFrequency(item),
      item.last_email_sent_at || null,
      item.unsubscribe_token || randomUUID()
    );
    return watchlistDao.getById(item.id, item.user_id);
  },

  update: async (id, userId, item, client = supabaseAdmin) => {
    if (isCloudUser(userId)) {
      const payload = {
        name: item.name,
        query: item.query,
        filters_json: typeof item.filters_json === 'string' ? JSON.parse(item.filters_json) : item.filters_json,
        active: Boolean(item.active),
        interval_minutes: item.interval_minutes,
        email_frequency: deriveWatchlistEmailFrequency(item)
      };
      const { data, error } = await client
        .from('watchlists')
        .update(payload)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      return normalizeWatchlistRecord(data);
    }

    localDb.prepare(`
      UPDATE watchlists
      SET name = ?, query = ?, filters_json = ?, active = ?, interval_minutes = ?, email_frequency = ?
      WHERE id = ? AND user_id = ?
    `).run(
      item.name,
      item.query,
      item.filters_json,
      item.active ? 1 : 0,
      item.interval_minutes,
      deriveWatchlistEmailFrequency(item),
      id,
      userId
    );
    return watchlistDao.getById(id, userId);
  },

  updateStats: async (id, lastRunAt, hitCount, newCount) => {
    if (isSupabaseConfigured) {
      const { data: current } = await supabaseAdmin.from('watchlists').select('new_count').eq('id', id).single();
      const nextNewCount = (current?.new_count || 0) + (newCount || 0);

      await supabaseAdmin.from('watchlists').update({
        last_run_at: lastRunAt,
        last_hit_count: hitCount,
        new_count: nextNewCount
      }).eq('id', id);
      return;
    }

    localDb.prepare(`
      UPDATE watchlists
      SET last_run_at = ?, last_hit_count = ?, new_count = new_count + ?
      WHERE id = ?
    `).run(lastRunAt, hitCount, newCount, id);
  },

  updateEmailSentAt: async (id, userId, sentAt) => {
    if (isCloudUser(userId)) {
      const { error } = await supabaseAdmin
        .from('watchlists')
        .update({ last_email_sent_at: sentAt })
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      return;
    }

    localDb.prepare(`
      UPDATE watchlists
      SET last_email_sent_at = ?
      WHERE id = ? AND user_id = ?
    `).run(sentAt, id, userId);
  },

  unsubscribeByToken: async (token) => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('watchlists')
        .update({ active: false })
        .eq('unsubscribe_token', token)
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return normalizeWatchlistRecord(data);
    }

    localDb.prepare('UPDATE watchlists SET active = 0 WHERE unsubscribe_token = ?').run(token);
    const row = localDb.prepare('SELECT * FROM watchlists WHERE unsubscribe_token = ?').get(token);
    return normalizeWatchlistRecord(row);
  },

  delete: async (id, userId, client = supabaseAdmin) => {
    if (isCloudUser(userId)) {
      await client.from('watchlist_hits').delete().eq('watchlist_id', id).eq('user_id', userId);
      await client.from('watchlists').delete().eq('id', id).eq('user_id', userId);
      return;
    }

    localDb.prepare('DELETE FROM watchlist_hits WHERE watchlist_id = ? AND user_id = ?').run(id, userId);
    return localDb.prepare('DELETE FROM watchlists WHERE id = ? AND user_id = ?').run(id, userId);
  }
};

// ==============================================================================
// WATCHLIST HITS DAO
// ==============================================================================
export const hitsDao = {
  getByWatchlistId: async (watchlistId, userId, limit = 100, client = supabaseAdmin) => {
    if (isCloudUser(userId)) {
      const { data, error } = await client
        .from('watchlist_hits')
        .select('*')
        .eq('watchlist_id', watchlistId)
        .eq('user_id', userId)
        .order('discovered_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []).map(h => ({
        ...h,
        notice_data_json: typeof h.notice_data_json === 'object' ? JSON.stringify(h.notice_data_json) : h.notice_data_json
      }));
    }

    return localDb.prepare(`
      SELECT * FROM watchlist_hits
      WHERE watchlist_id = ? AND user_id = ?
      ORDER BY discovered_at DESC
      LIMIT ?
    `).all(watchlistId, userId, limit);
  },

  getAllRecentHits: async (userId, limit = 100, client = supabaseAdmin) => {
    if (isCloudUser(userId)) {
      const { data, error } = await client
        .from('watchlist_hits')
        .select('*, watchlists(name)')
        .eq('user_id', userId)
        .order('discovered_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []).map(h => ({
        ...h,
        watchlist_name: h.watchlists?.name || 'Bevakning',
        notice_data_json: typeof h.notice_data_json === 'object' ? JSON.stringify(h.notice_data_json) : h.notice_data_json
      }));
    }

    return localDb.prepare(`
      SELECT h.*, w.name as watchlist_name
      FROM watchlist_hits h
      JOIN watchlists w ON h.watchlist_id = w.id
      WHERE h.user_id = ?
      ORDER BY h.discovered_at DESC
      LIMIT ?
    `).all(userId, limit);
  },

  getPendingEmailHits: async (watchlistId, userId, limit = 250) => {
    if (isCloudUser(userId)) {
      const { data, error } = await supabaseAdmin
        .from('watchlist_hits')
        .select('*')
        .eq('watchlist_id', watchlistId)
        .eq('user_id', userId)
        .is('emailed_at', null)
        .order('discovered_at', { ascending: true })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(h => ({
        ...h,
        notice_data_json: typeof h.notice_data_json === 'object' ? JSON.stringify(h.notice_data_json) : h.notice_data_json
      }));
    }

    return localDb.prepare(`
      SELECT *
      FROM watchlist_hits
      WHERE watchlist_id = ? AND user_id = ? AND emailed_at IS NULL
      ORDER BY discovered_at ASC
      LIMIT ?
    `).all(watchlistId, userId, limit);
  },

  insertHit: async (hit) => {
    if (isCloudUser(hit.user_id)) {
      try {
        const payload = {
          id: hit.id,
          user_id: hit.user_id,
          watchlist_id: hit.watchlist_id,
          notice_id: hit.notice_id,
          notice_data_json: typeof hit.notice_data_json === 'string' ? JSON.parse(hit.notice_data_json) : hit.notice_data_json,
          is_read: false
        };
        const { error } = await supabaseAdmin.from('watchlist_hits').insert(payload);
        return !error;
      } catch (e) {
        return false;
      }
    }

    try {
      const stmt = localDb.prepare(`
        INSERT OR IGNORE INTO watchlist_hits (id, user_id, watchlist_id, notice_id, notice_data_json, is_read, discovered_at)
        VALUES (?, ?, ?, ?, ?, 0, datetime('now', 'localtime'))
      `);
      const result = stmt.run(hit.id, hit.user_id, hit.watchlist_id, hit.notice_id, hit.notice_data_json);
      return result.changes > 0;
    } catch (e) {
      return false;
    }
  },

  markAsRead: async (id, userId, client = supabaseAdmin) => {
    if (isCloudUser(userId)) {
      const { data: hit } = await client
        .from('watchlist_hits')
        .select('watchlist_id, is_read')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (hit && !hit.is_read) {
        await client.from('watchlist_hits').update({ is_read: true }).eq('id', id).eq('user_id', userId);
        const { data: wl } = await client.from('watchlists').select('new_count').eq('id', hit.watchlist_id).single();
        if (wl) {
          await client.from('watchlists').update({ new_count: Math.max(0, (wl.new_count || 1) - 1) }).eq('id', hit.watchlist_id);
        }
      }
      return;
    }

    const hit = localDb.prepare('SELECT watchlist_id, is_read FROM watchlist_hits WHERE id = ? AND user_id = ?').get(id, userId);
    if (hit && !hit.is_read) {
      localDb.prepare('UPDATE watchlist_hits SET is_read = 1 WHERE id = ? AND user_id = ?').run(id, userId);
      localDb.prepare('UPDATE watchlists SET new_count = MAX(0, new_count - 1) WHERE id = ?').run(hit.watchlist_id);
    }
  },

  markAllAsRead: async (userId, watchlistId, client = supabaseAdmin) => {
    if (isCloudUser(userId)) {
      let query = client.from('watchlist_hits').update({ is_read: true }).eq('user_id', userId);
      if (watchlistId) {
        query = query.eq('watchlist_id', watchlistId);
        await client.from('watchlists').update({ new_count: 0 }).eq('id', watchlistId).eq('user_id', userId);
      } else {
        await client.from('watchlists').update({ new_count: 0 }).eq('user_id', userId);
      }
      await query;
      return;
    }

    if (watchlistId) {
      localDb.prepare('UPDATE watchlist_hits SET is_read = 1 WHERE watchlist_id = ? AND user_id = ?').run(watchlistId, userId);
      localDb.prepare('UPDATE watchlists SET new_count = 0 WHERE id = ? AND user_id = ?').run(watchlistId, userId);
    } else {
      localDb.prepare('UPDATE watchlist_hits SET is_read = 1 WHERE user_id = ?').run(userId);
      localDb.prepare('UPDATE watchlists SET new_count = 0 WHERE user_id = ?').run(userId);
    }
  },

  markAsEmailed: async (hitIds, userId, emailedAt) => {
    if (!hitIds.length) {
      return;
    }

    if (isCloudUser(userId)) {
      const { error } = await supabaseAdmin
        .from('watchlist_hits')
        .update({ emailed_at: emailedAt })
        .eq('user_id', userId)
        .in('id', hitIds);

      if (error) {
        throw error;
      }

      return;
    }

    const placeholders = hitIds.map(() => '?').join(', ');
    localDb.prepare(`
      UPDATE watchlist_hits
      SET emailed_at = ?
      WHERE user_id = ? AND id IN (${placeholders})
    `).run(emailedAt, userId, ...hitIds);
  },

  getUnreadCount: async (userId, client = supabaseAdmin) => {
    if (isCloudUser(userId)) {
      const { count } = await client
        .from('watchlist_hits')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      return count || 0;
    }

    const row = localDb.prepare('SELECT COUNT(*) as count FROM watchlist_hits WHERE user_id = ? AND is_read = 0').get(userId);
    return row ? row.count : 0;
  }
};

// ==============================================================================
// SAVED PIPELINE TENDERS DAO
// ==============================================================================
export const pipelineDao = {
  getAll: async (userId, client = supabaseAdmin) => {
    if (isCloudUser(userId)) {
      const { data, error } = await client
        .from('saved_tenders')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(t => ({
        ...t,
        tags_json: typeof t.tags_json === 'object' ? JSON.stringify(t.tags_json) : t.tags_json,
        notice_data_json: typeof t.notice_data_json === 'object' ? JSON.stringify(t.notice_data_json) : t.notice_data_json,
        ai_analysis_json: typeof t.ai_analysis_json === 'object' ? JSON.stringify(t.ai_analysis_json) : t.ai_analysis_json
      }));
    }

    return localDb.prepare('SELECT * FROM saved_tenders WHERE user_id = ? ORDER BY updated_at DESC').all(userId);
  },

  getByNoticeId: async (noticeId, userId, client = supabaseAdmin) => {
    if (isCloudUser(userId)) {
      const { data } = await client
        .from('saved_tenders')
        .select('*')
        .eq('notice_id', noticeId)
        .eq('user_id', userId)
        .single();
      if (!data) return null;
      return {
        ...data,
        tags_json: typeof data.tags_json === 'object' ? JSON.stringify(data.tags_json) : data.tags_json,
        notice_data_json: typeof data.notice_data_json === 'object' ? JSON.stringify(data.notice_data_json) : data.notice_data_json,
        ai_analysis_json: typeof data.ai_analysis_json === 'object' ? JSON.stringify(data.ai_analysis_json) : data.ai_analysis_json
      };
    }

    return localDb.prepare('SELECT * FROM saved_tenders WHERE notice_id = ? AND user_id = ?').get(noticeId, userId);
  },

  save: async (item, client = supabaseAdmin) => {
    const userId = item.user_id;

    if (isCloudUser(userId)) {
      const payload = {
        id: item.id,
        user_id: userId,
        notice_id: item.notice_id,
        title: item.title,
        buyer: item.buyer,
        country: item.country,
        deadline: item.deadline,
        estimated_value: item.estimated_value,
        status: item.status || 'INBOX',
        priority: item.priority || 'MEDIUM',
        notes: item.notes || '',
        internal_deadline: item.internal_deadline,
        assigned_to: item.assigned_to || '',
        tags_json: typeof item.tags_json === 'string' ? JSON.parse(item.tags_json) : item.tags_json,
        notice_data_json: typeof item.notice_data_json === 'string' ? JSON.parse(item.notice_data_json) : item.notice_data_json,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await client
        .from('saved_tenders')
        .upsert(payload, { onConflict: 'user_id, notice_id' })
        .select()
        .single();

      if (error) throw error;
      await client.from('watchlist_hits').update({ is_saved: true }).eq('notice_id', item.notice_id).eq('user_id', userId);
      return {
        ...data,
        tags_json: JSON.stringify(data.tags_json),
        notice_data_json: JSON.stringify(data.notice_data_json),
        ai_analysis_json: data.ai_analysis_json ? JSON.stringify(data.ai_analysis_json) : null
      };
    }

    const existing = await pipelineDao.getByNoticeId(item.notice_id, userId);
    if (existing) {
      localDb.prepare(`
        UPDATE saved_tenders
        SET title = ?, buyer = ?, country = ?, deadline = ?,
            estimated_value = ?, status = ?, priority = ?,
            notes = ?, internal_deadline = ?, assigned_to = ?,
            tags_json = ?, notice_data_json = ?,
            updated_at = datetime('now', 'localtime')
        WHERE notice_id = ? AND user_id = ?
      `).run(
        item.title, item.buyer, item.country, item.deadline,
        item.estimated_value, item.status, item.priority,
        item.notes, item.internal_deadline, item.assigned_to,
        item.tags_json, item.notice_data_json, item.notice_id, userId
      );
      return pipelineDao.getByNoticeId(item.notice_id, userId);
    } else {
      localDb.prepare(`
        INSERT INTO saved_tenders (
          id, user_id, notice_id, title, buyer, country, deadline, estimated_value,
          status, priority, notes, internal_deadline, assigned_to, tags_json,
          notice_data_json, saved_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, datetime('now', 'localtime'), datetime('now', 'localtime')
        )
      `).run(
        item.id, userId, item.notice_id, item.title, item.buyer, item.country, item.deadline, item.estimated_value,
        item.status, item.priority, item.notes, item.internal_deadline, item.assigned_to, item.tags_json,
        item.notice_data_json
      );
      localDb.prepare('UPDATE watchlist_hits SET is_saved = 1 WHERE notice_id = ? AND user_id = ?').run(item.notice_id, userId);
      return pipelineDao.getByNoticeId(item.notice_id, userId);
    }
  },

  updateStatus: async (id, userId, status, client = supabaseAdmin) => {
    if (isCloudUser(userId)) {
      const { data, error } = await client
        .from('saved_tenders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    localDb.prepare(`
      UPDATE saved_tenders
      SET status = ?, updated_at = datetime('now', 'localtime')
      WHERE id = ? AND user_id = ?
    `).run(status, id, userId);
    return localDb.prepare('SELECT * FROM saved_tenders WHERE id = ? AND user_id = ?').get(id, userId);
  },

  updateNotes: async (id, userId, notes, internalDeadline, priority, assignedTo, tagsJson, client = supabaseAdmin) => {
    if (isCloudUser(userId)) {
      const { data, error } = await client
        .from('saved_tenders')
        .update({
          notes,
          internal_deadline: internalDeadline,
          priority,
          assigned_to: assignedTo,
          tags_json: typeof tagsJson === 'string' ? JSON.parse(tagsJson) : tagsJson,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    localDb.prepare(`
      UPDATE saved_tenders
      SET notes = ?, internal_deadline = ?, priority = ?, assigned_to = ?, tags_json = ?,
          updated_at = datetime('now', 'localtime')
      WHERE id = ? AND user_id = ?
    `).run(notes, internalDeadline, priority, assignedTo, tagsJson, id, userId);
    return localDb.prepare('SELECT * FROM saved_tenders WHERE id = ? AND user_id = ?').get(id, userId);
  },

  updateAiAnalysis: async (noticeId, userId, aiJson, client = supabaseAdmin) => {
    if (isCloudUser(userId)) {
      await client
        .from('saved_tenders')
        .update({
          ai_analysis_json: typeof aiJson === 'string' ? JSON.parse(aiJson) : aiJson,
          updated_at: new Date().toISOString()
        })
        .eq('notice_id', noticeId)
        .eq('user_id', userId);
      return;
    }

    localDb.prepare(`
      UPDATE saved_tenders
      SET ai_analysis_json = ?, updated_at = datetime('now', 'localtime')
      WHERE notice_id = ? AND user_id = ?
    `).run(aiJson, noticeId, userId);
  },

  delete: async (id, userId, client = supabaseAdmin) => {
    if (isCloudUser(userId)) {
      const { data: item } = await client.from('saved_tenders').select('notice_id').eq('id', id).eq('user_id', userId).single();
      if (item) {
        await client.from('watchlist_hits').update({ is_saved: false }).eq('notice_id', item.notice_id).eq('user_id', userId);
      }
      await client.from('saved_tenders').delete().eq('id', id).eq('user_id', userId);
      return;
    }

    const item = localDb.prepare('SELECT notice_id FROM saved_tenders WHERE id = ? AND user_id = ?').get(id, userId);
    if (item) {
      localDb.prepare('UPDATE watchlist_hits SET is_saved = 0 WHERE notice_id = ? AND user_id = ?').run(item.notice_id, userId);
    }
    return localDb.prepare('DELETE FROM saved_tenders WHERE id = ? AND user_id = ?').run(id, userId);
  }
};

// ==============================================================================
// COMPANY PROFILE DAO
// ==============================================================================
export const profileDao = {
  get: async (userId, client = supabaseAdmin) => {
    if (isCloudUser(userId)) {
      const { data } = await client.from('profiles').select('*').eq('id', userId).single();
      if (!data || !data.company_name || data.company_name === 'Mitt Företag AB') {
        return {
          id: userId,
          ...DEFAULT_COMPANY_PROFILE
        };
      }
      return {
        id: data.id,
        name: data.company_name || DEFAULT_COMPANY_PROFILE.name,
        description: data.description || DEFAULT_COMPANY_PROFILE.description,
        keywords: data.keywords || DEFAULT_COMPANY_PROFILE.keywords,
        preferred_cpv: data.preferred_cpv || DEFAULT_COMPANY_PROFILE.preferred_cpv,
        preferred_countries: data.preferred_countries || DEFAULT_COMPANY_PROFILE.preferred_countries,
        min_value: data.min_value || 0
      };
    }

    const row = localDb.prepare('SELECT * FROM profiles WHERE id = ?').get(userId);
    if (!row || !row.company_name || row.company_name === 'Mitt Företag AB') {
      return {
        id: userId,
        ...DEFAULT_COMPANY_PROFILE
      };
    }
    return {
      ...row,
      name: row.company_name || DEFAULT_COMPANY_PROFILE.name,
      description: row.description || DEFAULT_COMPANY_PROFILE.description,
      keywords: row.keywords || DEFAULT_COMPANY_PROFILE.keywords,
      preferred_cpv: JSON.parse(row.preferred_cpv || JSON.stringify(DEFAULT_COMPANY_PROFILE.preferred_cpv)),
      preferred_countries: JSON.parse(row.preferred_countries || '["SWE"]')
    };
  },

  update: async (userId, data, client = supabaseAdmin) => {
    if (isCloudUser(userId)) {
      const payload = {
        company_name: data.name,
        description: data.description,
        keywords: data.keywords,
        preferred_cpv: data.preferred_cpv || [],
        preferred_countries: data.preferred_countries || ['SWE'],
        min_value: data.min_value || 0,
        updated_at: new Date().toISOString()
      };
      const { data: updated, error } = await client
        .from('profiles')
        .upsert({ id: userId, ...payload })
        .select()
        .single();
      if (error) throw error;
      return profileDao.get(userId, client);
    }

    localDb.prepare(`
      INSERT INTO profiles (id, company_name, description, keywords, preferred_cpv, preferred_countries, min_value, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
      ON CONFLICT(id) DO UPDATE SET
        company_name = excluded.company_name,
        description = excluded.description,
        keywords = excluded.keywords,
        preferred_cpv = excluded.preferred_cpv,
        preferred_countries = excluded.preferred_countries,
        min_value = excluded.min_value,
        updated_at = datetime('now', 'localtime')
    `).run(
      userId, data.name, data.description, data.keywords,
      JSON.stringify(data.preferred_cpv || []),
      JSON.stringify(data.preferred_countries || ['SWE']),
      data.min_value || 0
    );
    return profileDao.get(userId);
  },

  getNotificationRecipient: async (userId) => {
    if (isCloudUser(userId)) {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('email, full_name, company_name')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return {
        email: data?.email || null,
        fullName: data?.full_name || '',
        companyName: data?.company_name || 'Mitt Företag AB'
      };
    }

    const row = localDb.prepare('SELECT email, full_name, company_name FROM profiles WHERE id = ?').get(userId);
    return {
      email: row?.email || 'lokal@anvandare.se',
      fullName: row?.full_name || 'Lokal Användare',
      companyName: row?.company_name || 'Mitt Företag AB'
    };
  },

  getActiveUsers: async () => {
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabaseAdmin
          .from('profiles')
          .select('id, email, full_name, last_active_at, updated_at, created_at')
          .order('full_name', { ascending: true });

        if (!error && data && data.length > 0) {
          return data.map(p => ({
            id: p.id,
            name: p.full_name || p.email?.split('@')[0] || 'Användare',
            email: p.email || '',
            lastActiveAt: p.last_active_at || p.updated_at || p.created_at
          }));
        }
      } catch (e) {
        console.warn('[Profile DAO] Error loading active users from Supabase:', e.message);
      }
    }

    try {
      const rows = localDb.prepare(`
        SELECT id, email, full_name, last_active_at, updated_at
        FROM profiles
        ORDER BY full_name ASC
      `).all();

      if (rows && rows.length > 0) {
        return rows.map(r => ({
          id: r.id,
          name: r.full_name || r.email?.split('@')[0] || 'Lokal Användare',
          email: r.email || '',
          lastActiveAt: r.last_active_at || r.updated_at
        }));
      }
    } catch (e) {
      // Local fallback
    }

    return [
      { id: '1c041146-f711-4dc3-bf0c-3c30a7c0625a', name: 'Mats Romblad', email: 'mats.romblad@wsp.com', lastActiveAt: new Date().toISOString() }
    ];
  }
};

// ==============================================================================
// CHAT MESSAGES DAO
// ==============================================================================
export const chatDao = {
  getMessages: async (userId, sessionId = 'default', limit = 50, client = supabaseAdmin) => {
    if (isCloudUser(userId)) {
      const { data, error } = await client
        .from('chat_messages')
        .select('*')
        .eq('user_id', userId)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(limit);
      if (error) throw error;
      return data || [];
    }

    return localDb.prepare(`
      SELECT * FROM chat_messages
      WHERE user_id = ? AND session_id = ?
      ORDER BY created_at ASC
      LIMIT ?
    `).all(userId, sessionId, limit);
  },

  addMessage: async (item, client = supabaseAdmin) => {
    if (isCloudUser(item.user_id)) {
      await client.from('chat_messages').insert({
        id: item.id,
        user_id: item.user_id,
        session_id: item.session_id,
        role: item.role,
        content: item.content,
        context_notice_id: item.context_notice_id
      });
      return;
    }

    localDb.prepare(`
      INSERT INTO chat_messages (id, user_id, session_id, role, content, context_notice_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    `).run(item.id, item.user_id, item.session_id, item.role, item.content, item.context_notice_id);
  },

  clearSession: async (userId, sessionId = 'default', client = supabaseAdmin) => {
    if (isCloudUser(userId)) {
      await client.from('chat_messages').delete().eq('user_id', userId).eq('session_id', sessionId);
      return;
    }

    localDb.prepare('DELETE FROM chat_messages WHERE user_id = ? AND session_id = ?').run(userId, sessionId);
  }
};

export default localDb;
