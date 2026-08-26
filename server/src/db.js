import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabaseAdmin, isSupabaseConfigured } from './supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Local SQLite fallback instance
const dbPath = path.join(__dirname, '..', 'ted_monitor.db');
const localDb = new DatabaseSync(dbPath);

// Initialize local SQLite tables with user_id
localDb.exec(`
  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    company_name TEXT DEFAULT 'Mitt Företag AB',
    description TEXT DEFAULT '',
    keywords TEXT DEFAULT 'IT-konsult, systemutveckling, molntjänster, cybersäkerhet',
    preferred_cpv TEXT DEFAULT '["72000000", "72200000"]',
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
ensureColumn('watchlist_hits', 'user_id', "TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'");
ensureColumn('saved_tenders', 'user_id', "TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'");
ensureColumn('chat_messages', 'user_id', "TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'");

// ==============================================================================
// WATCHLISTS DAO (Supabase + Local SQLite)
// ==============================================================================
export const watchlistDao = {
  getAll: async (userId) => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('watchlists')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(w => ({
        ...w,
        filters_json: typeof w.filters_json === 'object' ? JSON.stringify(w.filters_json) : w.filters_json
      }));
    }
    return localDb.prepare('SELECT * FROM watchlists WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  },

  getAllActiveSystem: async () => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('watchlists')
        .select('*')
        .eq('active', true);
      if (error) throw error;
      return (data || []).map(w => ({
        ...w,
        filters_json: typeof w.filters_json === 'object' ? JSON.stringify(w.filters_json) : w.filters_json
      }));
    }
    return localDb.prepare('SELECT * FROM watchlists WHERE active = 1').all();
  },

  getById: async (id, userId) => {
    if (isSupabaseConfigured) {
      let query = supabaseAdmin.from('watchlists').select('*').eq('id', id);
      if (userId) query = query.eq('user_id', userId);
      const { data } = await query.single();
      if (!data) return null;
      return {
        ...data,
        filters_json: typeof data.filters_json === 'object' ? JSON.stringify(data.filters_json) : data.filters_json
      };
    }
    if (userId) {
      return localDb.prepare('SELECT * FROM watchlists WHERE id = ? AND user_id = ?').get(id, userId);
    }
    return localDb.prepare('SELECT * FROM watchlists WHERE id = ?').get(id);
  },

  create: async (item) => {
    if (isSupabaseConfigured) {
      const payload = {
        id: item.id,
        user_id: item.user_id,
        name: item.name,
        query: item.query,
        filters_json: typeof item.filters_json === 'string' ? JSON.parse(item.filters_json) : item.filters_json,
        active: Boolean(item.active),
        interval_minutes: item.interval_minutes || 60
      };
      const { data, error } = await supabaseAdmin.from('watchlists').insert(payload).select().single();
      if (error) throw error;
      return {
        ...data,
        filters_json: JSON.stringify(data.filters_json)
      };
    }

    localDb.prepare(`
      INSERT INTO watchlists (id, user_id, name, query, filters_json, active, interval_minutes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    `).run(item.id, item.user_id, item.name, item.query, item.filters_json, item.active ? 1 : 0, item.interval_minutes);
    return watchlistDao.getById(item.id, item.user_id);
  },

  update: async (id, userId, item) => {
    if (isSupabaseConfigured) {
      const payload = {
        name: item.name,
        query: item.query,
        filters_json: typeof item.filters_json === 'string' ? JSON.parse(item.filters_json) : item.filters_json,
        active: Boolean(item.active),
        interval_minutes: item.interval_minutes
      };
      const { data, error } = await supabaseAdmin
        .from('watchlists')
        .update(payload)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      return {
        ...data,
        filters_json: JSON.stringify(data.filters_json)
      };
    }

    localDb.prepare(`
      UPDATE watchlists
      SET name = ?, query = ?, filters_json = ?, active = ?, interval_minutes = ?
      WHERE id = ? AND user_id = ?
    `).run(item.name, item.query, item.filters_json, item.active ? 1 : 0, item.interval_minutes, id, userId);
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

  delete: async (id, userId) => {
    if (isSupabaseConfigured) {
      await supabaseAdmin.from('watchlist_hits').delete().eq('watchlist_id', id).eq('user_id', userId);
      await supabaseAdmin.from('watchlists').delete().eq('id', id).eq('user_id', userId);
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
  getByWatchlistId: async (watchlistId, userId, limit = 100) => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
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

  getAllRecentHits: async (userId, limit = 100) => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
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

  insertHit: async (hit) => {
    if (isSupabaseConfigured) {
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

  markAsRead: async (id, userId) => {
    if (isSupabaseConfigured) {
      const { data: hit } = await supabaseAdmin
        .from('watchlist_hits')
        .select('watchlist_id, is_read')
        .eq('id', id)
        .eq('user_id', userId)
        .single();
      
      if (hit && !hit.is_read) {
        await supabaseAdmin.from('watchlist_hits').update({ is_read: true }).eq('id', id).eq('user_id', userId);
        const { data: wl } = await supabaseAdmin.from('watchlists').select('new_count').eq('id', hit.watchlist_id).single();
        if (wl) {
          await supabaseAdmin.from('watchlists').update({ new_count: Math.max(0, (wl.new_count || 1) - 1) }).eq('id', hit.watchlist_id);
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

  markAllAsRead: async (userId, watchlistId) => {
    if (isSupabaseConfigured) {
      let query = supabaseAdmin.from('watchlist_hits').update({ is_read: true }).eq('user_id', userId);
      if (watchlistId) {
        query = query.eq('watchlist_id', watchlistId);
        await supabaseAdmin.from('watchlists').update({ new_count: 0 }).eq('id', watchlistId).eq('user_id', userId);
      } else {
        await supabaseAdmin.from('watchlists').update({ new_count: 0 }).eq('user_id', userId);
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

  getUnreadCount: async (userId) => {
    if (isSupabaseConfigured) {
      const { count } = await supabaseAdmin
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
  getAll: async (userId) => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
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

  getByNoticeId: async (noticeId, userId) => {
    if (isSupabaseConfigured) {
      const { data } = await supabaseAdmin
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

  save: async (item) => {
    const userId = item.user_id;

    if (isSupabaseConfigured) {
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

      const { data, error } = await supabaseAdmin
        .from('saved_tenders')
        .upsert(payload, { onConflict: 'user_id, notice_id' })
        .select()
        .single();

      if (error) throw error;
      await supabaseAdmin.from('watchlist_hits').update({ is_saved: true }).eq('notice_id', item.notice_id).eq('user_id', userId);
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

  updateStatus: async (id, userId, status) => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
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

  updateNotes: async (id, userId, notes, internalDeadline, priority, assignedTo, tagsJson) => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
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

  updateAiAnalysis: async (noticeId, userId, aiJson) => {
    if (isSupabaseConfigured) {
      await supabaseAdmin
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

  delete: async (id, userId) => {
    if (isSupabaseConfigured) {
      const { data: item } = await supabaseAdmin.from('saved_tenders').select('notice_id').eq('id', id).eq('user_id', userId).single();
      if (item) {
        await supabaseAdmin.from('watchlist_hits').update({ is_saved: false }).eq('notice_id', item.notice_id).eq('user_id', userId);
      }
      await supabaseAdmin.from('saved_tenders').delete().eq('id', id).eq('user_id', userId);
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
  get: async (userId) => {
    if (isSupabaseConfigured) {
      const { data } = await supabaseAdmin.from('profiles').select('*').eq('id', userId).single();
      if (!data) {
        return {
          id: userId,
          name: 'Mitt Företag AB',
          description: '',
          keywords: 'IT-konsult, systemutveckling, molntjänster',
          preferred_cpv: ['72000000', '72200000'],
          preferred_countries: ['SWE'],
          min_value: 0
        };
      }
      return {
        id: data.id,
        name: data.company_name || 'Mitt Företag AB',
        description: data.description || '',
        keywords: data.keywords || '',
        preferred_cpv: data.preferred_cpv || ['72000000', '72200000'],
        preferred_countries: data.preferred_countries || ['SWE'],
        min_value: data.min_value || 0
      };
    }

    const row = localDb.prepare('SELECT * FROM profiles WHERE id = ?').get(userId);
    if (!row) {
      return {
        id: userId,
        name: 'Mitt Företag AB',
        description: '',
        keywords: 'IT-konsult, systemutveckling, molntjänster',
        preferred_cpv: ['72000000', '72200000'],
        preferred_countries: ['SWE'],
        min_value: 0
      };
    }
    return {
      ...row,
      name: row.company_name || 'Mitt Företag AB',
      preferred_cpv: JSON.parse(row.preferred_cpv || '[]'),
      preferred_countries: JSON.parse(row.preferred_countries || '["SWE"]')
    };
  },

  update: async (userId, data) => {
    if (isSupabaseConfigured) {
      const payload = {
        company_name: data.name,
        description: data.description,
        keywords: data.keywords,
        preferred_cpv: data.preferred_cpv || [],
        preferred_countries: data.preferred_countries || ['SWE'],
        min_value: data.min_value || 0,
        updated_at: new Date().toISOString()
      };
      const { data: updated, error } = await supabaseAdmin
        .from('profiles')
        .upsert({ id: userId, ...payload })
        .select()
        .single();
      if (error) throw error;
      return profileDao.get(userId);
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
  }
};

// ==============================================================================
// CHAT MESSAGES DAO
// ==============================================================================
export const chatDao = {
  getMessages: async (userId, sessionId = 'default', limit = 50) => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
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

  addMessage: async (item) => {
    if (isSupabaseConfigured) {
      await supabaseAdmin.from('chat_messages').insert({
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

  clearSession: async (userId, sessionId = 'default') => {
    if (isSupabaseConfigured) {
      await supabaseAdmin.from('chat_messages').delete().eq('user_id', userId).eq('session_id', sessionId);
      return;
    }

    localDb.prepare('DELETE FROM chat_messages WHERE user_id = ? AND session_id = ?').run(userId, sessionId);
  }
};

export default localDb;
