import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'ted_monitor.db');
const db = new DatabaseSync(dbPath);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS watchlists (
    id TEXT PRIMARY KEY,
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
    watchlist_id TEXT NOT NULL,
    notice_id TEXT NOT NULL,
    notice_data_json TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    is_saved INTEGER DEFAULT 0,
    discovered_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY(watchlist_id) REFERENCES watchlists(id) ON DELETE CASCADE,
    UNIQUE(watchlist_id, notice_id)
  );

  CREATE TABLE IF NOT EXISTS saved_tenders (
    id TEXT PRIMARY KEY,
    notice_id TEXT UNIQUE NOT NULL,
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
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS company_profile (
    id TEXT PRIMARY KEY,
    name TEXT DEFAULT 'Mitt Företag',
    description TEXT DEFAULT '',
    keywords TEXT DEFAULT '',
    preferred_cpv TEXT DEFAULT '[]',
    preferred_countries TEXT DEFAULT '["SWE"]',
    min_value INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT DEFAULT 'default',
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    context_notice_id TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Ensure default company profile exists
const existingProfile = db.prepare('SELECT id FROM company_profile WHERE id = ?').get('default');
if (!existingProfile) {
  db.prepare(`
    INSERT INTO company_profile (id, name, description, keywords, preferred_cpv, preferred_countries, min_value)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'default',
    'Vår Verksamhet AB',
    'Ledande leverantör av IT-lösningar, molntjänster, systemutveckling och teknisk rådgivning.',
    'IT-konsult, systemutveckling, molntjänster, IT-drift, cybersäkerhet, AI, agil utveckling',
    JSON.stringify(['72000000', '72200000', '72220000', '72240000']),
    JSON.stringify(['SWE', 'DNK', 'NOR']),
    0
  );
}

// Seed initial default watchlists if database is empty
const existingWatchlists = db.prepare('SELECT COUNT(*) as count FROM watchlists').get();
if (!existingWatchlists || existingWatchlists.count === 0) {
  db.prepare(`
    INSERT INTO watchlists (id, name, query, filters_json, active, interval_minutes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
  `).run(
    'wl-default-it',
    'IT-konsulttjänster & Utveckling (Sverige)',
    'place-of-performance IN (SWE) AND classification-cpv IN (72000000, 72200000) AND form-type = competition',
    JSON.stringify({
      keywords: '',
      countries: ['SWE'],
      cpv: ['72000000', '72200000'],
      formType: 'competition',
      datePreset: '30d'
    }),
    1,
    60
  );

  db.prepare(`
    INSERT INTO watchlists (id, name, query, filters_json, active, interval_minutes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
  `).run(
    'wl-default-cloud',
    'Cybersäkerhet & Molntjänster (Sverige)',
    'place-of-performance IN (SWE) AND FT ~ (cybersäkerhet OR molntjänster) AND form-type = competition',
    JSON.stringify({
      keywords: 'cybersäkerhet OR molntjänster',
      countries: ['SWE'],
      formType: 'competition',
      datePreset: '30d'
    }),
    1,
    60
  );
}

// Helper methods for watchlists
export const watchlistDao = {
  getAll: () => db.prepare('SELECT * FROM watchlists ORDER BY created_at DESC').all(),
  getById: (id) => db.prepare('SELECT * FROM watchlists WHERE id = ?').get(id),
  create: (item) => {
    db.prepare(`
      INSERT INTO watchlists (id, name, query, filters_json, active, interval_minutes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    `).run(item.id, item.name, item.query, item.filters_json, item.active, item.interval_minutes);
    return watchlistDao.getById(item.id);
  },
  update: (id, item) => {
    db.prepare(`
      UPDATE watchlists
      SET name = ?, query = ?, filters_json = ?, active = ?, interval_minutes = ?
      WHERE id = ?
    `).run(item.name, item.query, item.filters_json, item.active, item.interval_minutes, id);
    return watchlistDao.getById(id);
  },
  updateStats: (id, lastRunAt, hitCount, newCount) => {
    db.prepare(`
      UPDATE watchlists
      SET last_run_at = ?, last_hit_count = ?, new_count = new_count + ?
      WHERE id = ?
    `).run(lastRunAt, hitCount, newCount, id);
  },
  clearNewCount: (id) => {
    db.prepare('UPDATE watchlists SET new_count = 0 WHERE id = ?').run(id);
  },
  delete: (id) => {
    db.prepare('DELETE FROM watchlist_hits WHERE watchlist_id = ?').run(id);
    return db.prepare('DELETE FROM watchlists WHERE id = ?').run(id);
  }
};

// Helper methods for watchlist hits
export const hitsDao = {
  getByWatchlistId: (watchlistId, limit = 100) => {
    return db.prepare(`
      SELECT * FROM watchlist_hits
      WHERE watchlist_id = ?
      ORDER BY discovered_at DESC
      LIMIT ?
    `).all(watchlistId, limit);
  },
  getAllRecentHits: (limit = 100) => {
    return db.prepare(`
      SELECT h.*, w.name as watchlist_name
      FROM watchlist_hits h
      JOIN watchlists w ON h.watchlist_id = w.id
      ORDER BY h.discovered_at DESC
      LIMIT ?
    `).all(limit);
  },
  insertHit: (hit) => {
    try {
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO watchlist_hits (id, watchlist_id, notice_id, notice_data_json, is_read, discovered_at)
        VALUES (?, ?, ?, ?, 0, datetime('now', 'localtime'))
      `);
      const result = stmt.run(hit.id, hit.watchlist_id, hit.notice_id, hit.notice_data_json);
      return result.changes > 0;
    } catch (e) {
      return false;
    }
  },
  markAsRead: (id) => {
    const hit = db.prepare('SELECT watchlist_id, is_read FROM watchlist_hits WHERE id = ?').get(id);
    if (hit && !hit.is_read) {
      db.prepare('UPDATE watchlist_hits SET is_read = 1 WHERE id = ?').run(id);
      db.prepare('UPDATE watchlists SET new_count = MAX(0, new_count - 1) WHERE id = ?').run(hit.watchlist_id);
    }
  },
  markAllAsRead: (watchlistId) => {
    if (watchlistId) {
      db.prepare('UPDATE watchlist_hits SET is_read = 1 WHERE watchlist_id = ?').run(watchlistId);
      db.prepare('UPDATE watchlists SET new_count = 0 WHERE id = ?').run(watchlistId);
    } else {
      db.prepare('UPDATE watchlist_hits SET is_read = 1').run();
      db.prepare('UPDATE watchlists SET new_count = 0').run();
    }
  },
  getUnreadCount: () => {
    const row = db.prepare('SELECT COUNT(*) as count FROM watchlist_hits WHERE is_read = 0').get();
    return row ? row.count : 0;
  }
};

// Helper methods for saved pipeline tenders
export const pipelineDao = {
  getAll: () => db.prepare('SELECT * FROM saved_tenders ORDER BY updated_at DESC').all(),
  getByNoticeId: (noticeId) => db.prepare('SELECT * FROM saved_tenders WHERE notice_id = ?').get(noticeId),
  save: (item) => {
    const existing = pipelineDao.getByNoticeId(item.notice_id);
    if (existing) {
      db.prepare(`
        UPDATE saved_tenders
        SET title = ?, buyer = ?, country = ?, deadline = ?,
            estimated_value = ?, status = ?, priority = ?,
            notes = ?, internal_deadline = ?, assigned_to = ?,
            tags_json = ?, notice_data_json = ?,
            updated_at = datetime('now', 'localtime')
        WHERE notice_id = ?
      `).run(
        item.title, item.buyer, item.country, item.deadline,
        item.estimated_value, item.status, item.priority,
        item.notes, item.internal_deadline, item.assigned_to,
        item.tags_json, item.notice_data_json, item.notice_id
      );
      return pipelineDao.getByNoticeId(item.notice_id);
    } else {
      db.prepare(`
        INSERT INTO saved_tenders (
          id, notice_id, title, buyer, country, deadline, estimated_value,
          status, priority, notes, internal_deadline, assigned_to, tags_json,
          notice_data_json, saved_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, datetime('now', 'localtime'), datetime('now', 'localtime')
        )
      `).run(
        item.id, item.notice_id, item.title, item.buyer, item.country, item.deadline, item.estimated_value,
        item.status, item.priority, item.notes, item.internal_deadline, item.assigned_to, item.tags_json,
        item.notice_data_json
      );
      // Also update watchlist_hits flag if exists
      db.prepare('UPDATE watchlist_hits SET is_saved = 1 WHERE notice_id = ?').run(item.notice_id);
      return pipelineDao.getByNoticeId(item.notice_id);
    }
  },
  updateStatus: (id, status) => {
    db.prepare(`
      UPDATE saved_tenders
      SET status = ?, updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(status, id);
    return db.prepare('SELECT * FROM saved_tenders WHERE id = ?').get(id);
  },
  updateNotes: (id, notes, internalDeadline, priority, assignedTo, tagsJson) => {
    db.prepare(`
      UPDATE saved_tenders
      SET notes = ?, internal_deadline = ?, priority = ?, assigned_to = ?, tags_json = ?,
          updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(notes, internalDeadline, priority, assignedTo, tagsJson, id);
    return db.prepare('SELECT * FROM saved_tenders WHERE id = ?').get(id);
  },
  updateAiAnalysis: (noticeId, aiJson) => {
    db.prepare(`
      UPDATE saved_tenders
      SET ai_analysis_json = ?, updated_at = datetime('now', 'localtime')
      WHERE notice_id = ?
    `).run(aiJson, noticeId);
  },
  delete: (id) => {
    const item = db.prepare('SELECT notice_id FROM saved_tenders WHERE id = ?').get(id);
    if (item) {
      db.prepare('UPDATE watchlist_hits SET is_saved = 0 WHERE notice_id = ?').run(item.notice_id);
    }
    return db.prepare('DELETE FROM saved_tenders WHERE id = ?').run(id);
  }
};

// Helper methods for company profile
export const profileDao = {
  get: () => db.prepare('SELECT * FROM company_profile WHERE id = ?').get('default'),
  update: (data) => {
    db.prepare(`
      UPDATE company_profile
      SET name = ?, description = ?, keywords = ?,
          preferred_cpv = ?, preferred_countries = ?,
          min_value = ?, updated_at = datetime('now', 'localtime')
      WHERE id = 'default'
    `).run(data.name, data.description, data.keywords, data.preferred_cpv, data.preferred_countries, data.min_value);
    return profileDao.get();
  }
};

// Helper methods for chat history
export const chatDao = {
  getMessages: (sessionId = 'default', limit = 50) => {
    return db.prepare(`
      SELECT * FROM chat_messages
      WHERE session_id = ?
      ORDER BY created_at ASC
      LIMIT ?
    `).all(sessionId, limit);
  },
  addMessage: (message) => {
    db.prepare(`
      INSERT INTO chat_messages (id, session_id, role, content, context_notice_id, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))
    `).run(message.id, message.session_id, message.role, message.content, message.context_notice_id);
  },
  clearSession: (sessionId = 'default') => {
    db.prepare('DELETE FROM chat_messages WHERE session_id = ?').run(sessionId);
  }
};

export default db;
