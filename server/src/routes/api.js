import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as xlsx from 'xlsx';
import { searchTedNotices, getNoticeById, buildExpertQuery } from '../services/tedService.js';
import { naturalLanguageToFilters, analyzeTender, chatWithAssistant } from '../services/minimaxService.js';
import { runWatchlist, runAllActiveWatchlists } from '../services/schedulerService.js';
import { CPV_CATEGORIES, searchCpv } from '../services/cpvData.js';
import { watchlistDao, hitsDao, pipelineDao, profileDao, chatDao } from '../db.js';

const router = express.Router();

// ==========================================
// 1. TED Search & Exploration Endpoints
// ==========================================

router.post('/ted/search', async (req, res) => {
  try {
    const { filters = {}, page = 1, limit = 20 } = req.body;
    const results = await searchTedNotices(filters, { page, limit });
    res.json(results);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/ted/notice/:id', async (req, res) => {
  try {
    const notice = await getNoticeById(req.params.id);
    if (!notice) {
      return res.status(404).json({ success: false, error: 'Upphandlingen hittades inte' });
    }
    res.json({ success: true, notice });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 2. MiniMax AI Endpoints
// ==========================================

router.post('/ai/smart-search', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt krävs' });
    }
    const filterConfig = await naturalLanguageToFilters(prompt);
    const tedQuery = buildExpertQuery(filterConfig);
    res.json({ success: true, filters: filterConfig, tedQuery });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/ai/analyze', async (req, res) => {
  try {
    const { notice } = req.body;
    if (!notice) {
      return res.status(400).json({ error: 'Notice-objekt krävs för analys' });
    }
    const companyProfile = profileDao.get();
    const analysis = await analyzeTender(notice, companyProfile);
    
    // If notice is already in pipeline, save analysis
    const noticeId = notice.id || notice.publicationNumber;
    if (noticeId) {
      pipelineDao.updateAiAnalysis(noticeId, JSON.stringify(analysis));
    }

    res.json({ success: true, analysis });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/ai/chat', async (req, res) => {
  try {
    const { message, sessionId = 'default', context = {} } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Meddelande krävs' });
    }

    // Save user message
    const userMsgId = uuidv4();
    chatDao.addMessage({
      id: userMsgId,
      session_id: sessionId,
      role: 'user',
      content: message,
      context_notice_id: context.currentNotice?.id || null
    });

    // Get conversation history
    const history = chatDao.getMessages(sessionId, 20);
    const companyProfile = profileDao.get();

    // Call MiniMax
    const responseText = await chatWithAssistant(history, {
      ...context,
      companyProfile
    });

    // Save assistant message
    const assistantMsgId = uuidv4();
    chatDao.addMessage({
      id: assistantMsgId,
      session_id: sessionId,
      role: 'assistant',
      content: responseText,
      context_notice_id: context.currentNotice?.id || null
    });

    res.json({
      success: true,
      reply: responseText,
      messageId: assistantMsgId
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/ai/chat/history', (req, res) => {
  const { sessionId = 'default' } = req.query;
  const messages = chatDao.getMessages(sessionId, 50);
  res.json({ success: true, messages });
});

router.delete('/ai/chat/history', (req, res) => {
  const { sessionId = 'default' } = req.query;
  chatDao.clearSession(sessionId);
  res.json({ success: true });
});

// ==========================================
// 3. Watchlists & Background Engine Endpoints
// ==========================================

router.get('/watchlists', (req, res) => {
  const watchlists = watchlistDao.getAll().map(w => ({
    ...w,
    filters: JSON.parse(w.filters_json || '{}')
  }));
  const unreadCount = hitsDao.getUnreadCount();
  res.json({ success: true, watchlists, unreadCount });
});

router.post('/watchlists', async (req, res) => {
  try {
    const { name, filters = {}, intervalMinutes = 60 } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Namn på bevakning krävs' });
    }

    const query = buildExpertQuery(filters);
    const id = uuidv4();

    const created = watchlistDao.create({
      id,
      name,
      query,
      filters_json: JSON.stringify(filters),
      active: 1,
      interval_minutes: parseInt(intervalMinutes) || 60
    });

    // Trigger initial run immediately in background
    runWatchlist(created).catch(console.error);

    res.json({ success: true, watchlist: { ...created, filters } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/watchlists/:id', (req, res) => {
  try {
    const { name, filters = {}, active, intervalMinutes } = req.body;
    const existing = watchlistDao.getById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Bevakning hittades inte' });
    }

    const query = buildExpertQuery(filters);
    const updated = watchlistDao.update(req.params.id, {
      name: name || existing.name,
      query,
      filters_json: JSON.stringify(filters),
      active: active !== undefined ? (active ? 1 : 0) : existing.active,
      interval_minutes: intervalMinutes !== undefined ? parseInt(intervalMinutes) : existing.interval_minutes
    });

    res.json({ success: true, watchlist: { ...updated, filters } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/watchlists/:id', (req, res) => {
  watchlistDao.delete(req.params.id);
  res.json({ success: true });
});

router.post('/watchlists/:id/run', async (req, res) => {
  try {
    const watchlist = watchlistDao.getById(req.params.id);
    if (!watchlist) {
      return res.status(404).json({ error: 'Bevakning hittades inte' });
    }
    const result = await runWatchlist(watchlist);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/watchlists/run-all', async (req, res) => {
  try {
    const results = await runAllActiveWatchlists();
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/watchlists/:id/hits', (req, res) => {
  const hits = hitsDao.getByWatchlistId(req.params.id).map(h => ({
    ...h,
    notice: JSON.parse(h.notice_data_json || '{}')
  }));
  res.json({ success: true, hits });
});

router.get('/watchlists-hits/recent', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const hits = hitsDao.getAllRecentHits(limit).map(h => ({
    ...h,
    notice: JSON.parse(h.notice_data_json || '{}')
  }));
  res.json({ success: true, hits });
});

router.put('/watchlists/hits/:id/read', (req, res) => {
  hitsDao.markAsRead(req.params.id);
  res.json({ success: true });
});

router.put('/watchlists/hits/mark-all-read', (req, res) => {
  const { watchlistId } = req.body;
  hitsDao.markAllAsRead(watchlistId);
  res.json({ success: true });
});

// ==========================================
// 4. Pipeline (Kanban & Ärendehantering)
// ==========================================

router.get('/pipeline', (req, res) => {
  const tenders = pipelineDao.getAll().map(t => ({
    ...t,
    tags: JSON.parse(t.tags_json || '[]'),
    notice: JSON.parse(t.notice_data_json || '{}'),
    aiAnalysis: t.ai_analysis_json ? JSON.parse(t.ai_analysis_json) : null
  }));
  res.json({ success: true, tenders });
});

router.post('/pipeline', (req, res) => {
  try {
    const { notice, status = 'INBOX', priority = 'MEDIUM', notes = '', internalDeadline = null, assignedTo = '', tags = [] } = req.body;
    if (!notice) {
      return res.status(400).json({ error: 'Notice-data krävs' });
    }

    const noticeId = notice.id || notice.publicationNumber;
    const id = uuidv4();

    const saved = pipelineDao.save({
      id,
      notice_id: noticeId,
      title: notice.title || 'Upphandling',
      buyer: notice.buyer || '',
      country: notice.country || 'SWE',
      deadline: notice.deadline || null,
      estimated_value: notice.estimatedValue || '',
      status,
      priority,
      notes,
      internal_deadline: internalDeadline,
      assigned_to: assignedTo,
      tags_json: JSON.stringify(tags),
      notice_data_json: JSON.stringify(notice)
    });

    res.json({
      success: true,
      tender: {
        ...saved,
        tags,
        notice,
        aiAnalysis: saved.ai_analysis_json ? JSON.parse(saved.ai_analysis_json) : null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/pipeline/:id/status', (req, res) => {
  const { status } = req.body;
  const updated = pipelineDao.updateStatus(req.params.id, status);
  res.json({ success: true, tender: updated });
});

router.put('/pipeline/:id/details', (req, res) => {
  const { notes = '', internalDeadline = null, priority = 'MEDIUM', assignedTo = '', tags = [] } = req.body;
  const updated = pipelineDao.updateNotes(
    req.params.id,
    notes,
    internalDeadline,
    priority,
    assignedTo,
    JSON.stringify(tags)
  );
  res.json({ success: true, tender: updated });
});

router.delete('/pipeline/:id', (req, res) => {
  pipelineDao.delete(req.params.id);
  res.json({ success: true });
});

// ==========================================
// 5. CPV & Company Profile Endpoints
// ==========================================

router.get('/cpv', (req, res) => {
  const { q } = req.query;
  const results = searchCpv(q);
  res.json({ success: true, categories: results });
});

router.get('/profile', (req, res) => {
  const profile = profileDao.get();
  res.json({
    success: true,
    profile: {
      ...profile,
      preferred_cpv: JSON.parse(profile.preferred_cpv || '[]'),
      preferred_countries: JSON.parse(profile.preferred_countries || '["SWE"]')
    }
  });
});

router.put('/profile', (req, res) => {
  const { name, description, keywords, preferred_cpv, preferred_countries, min_value } = req.body;
  const updated = profileDao.update({
    name,
    description,
    keywords,
    preferred_cpv: JSON.stringify(preferred_cpv || []),
    preferred_countries: JSON.stringify(preferred_countries || ['SWE']),
    min_value: parseInt(min_value) || 0
  });
  res.json({
    success: true,
    profile: {
      ...updated,
      preferred_cpv: JSON.parse(updated.preferred_cpv),
      preferred_countries: JSON.parse(updated.preferred_countries)
    }
  });
});

// ==========================================
// 6. Export Endpoints (Excel & CSV)
// ==========================================

router.get('/export/:type', (req, res) => {
  const { type } = req.params; // pipeline, watchlists
  const format = req.query.format || 'xlsx'; // xlsx, csv, json

  let data = [];
  if (type === 'pipeline') {
    data = pipelineDao.getAll().map(t => {
      const notice = JSON.parse(t.notice_data_json || '{}');
      return {
        'TED ID': t.notice_id,
        'Titel': t.title,
        'Upphandlare': t.buyer,
        'Land': t.country,
        'Status': t.status,
        'Prioritet': t.priority,
        'Sista anbudsdag': t.deadline || '',
        'Intern deadline': t.internal_deadline || '',
        'Ansvarig': t.assigned_to || '',
        'Anteckningar': t.notes || '',
        'TED Länk': notice.links?.tedHtml || ''
      };
    });
  } else if (type === 'hits') {
    data = hitsDao.getAllRecentHits(500).map(h => {
      const notice = JSON.parse(h.notice_data_json || '{}');
      return {
        'Bevakning': h.watchlist_name,
        'TED ID': h.notice_id,
        'Titel': notice.title,
        'Upphandlare': notice.buyer,
        'Sista anbudsdag': notice.deadline || '',
        'Upptäckt datum': h.discovered_at,
        'TED Länk': notice.links?.tedHtml || ''
      };
    });
  }

  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=ted_${type}_export.json`);
    return res.json(data);
  }

  const worksheet = xlsx.utils.json_to_sheet(data);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'TED Export');

  if (format === 'csv') {
    const csv = xlsx.utils.sheet_to_csv(worksheet);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=ted_${type}_export.csv`);
    return res.send(csv);
  }

  // XLSX default
  const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=ted_${type}_export.xlsx`);
  res.send(buffer);
});

export default router;
