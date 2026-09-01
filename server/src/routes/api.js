import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import * as xlsx from 'xlsx';
import { searchTedNotices, getNoticeById, buildExpertQuery } from '../services/tedService.js';
import { searchMagnitNotices, getMagnitNoticeById } from '../services/magnitService.js';
import { searchVeramaNotices, getVeramaNoticeById } from '../services/veramaService.js';
import { naturalLanguageToFilters, analyzeCvAndGenerateSearchFilters, analyzeTender, analyzeTenderWithDocuments, chatWithAssistant, callMiniMax } from '../services/minimaxService.js';
import { parseUploadedProcurementFiles } from '../services/documentParserService.js';
import { runWatchlist, runAllActiveWatchlists } from '../services/schedulerService.js';
import { buildWatchlistManageUrl } from '../services/emailService.js';
import { CPV_CATEGORIES, searchCpv } from '../services/cpvData.js';
import { watchlistDao, hitsDao, pipelineDao, profileDao, chatDao, hiddenNoticeDao, teamMemberDao, adminDao } from '../db.js';
import { requireAuth, requireAdmin, isSupabaseConfigured, isPlaceholder, supabaseAdmin } from '../supabase.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 60 * 1024 * 1024 } // 60MB max file size
});

const router = express.Router();
const VALID_EMAIL_FREQUENCIES = new Set(['daily', 'weekly']);

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resolveEmailFrequency(rawFrequency, fallback = 'daily') {
  if (VALID_EMAIL_FREQUENCIES.has(rawFrequency)) {
    return rawFrequency;
  }

  return fallback;
}

function renderUnsubscribeHtml(title, message, manageUrl = '') {
  const manageLink = manageUrl
    ? `<a href="${escapeHtml(manageUrl)}" style="display:inline-block;margin-top:16px;padding:12px 18px;border-radius:999px;background:#0f172a;color:#fff;text-decoration:none;font-weight:700;">Oppna bevakning</a>`
    : '';

  return `
    <!doctype html>
    <html lang="sv">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(title)}</title>
      </head>
      <body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
        <div style="max-width:640px;margin:48px auto;background:#fff;border:1px solid #e2e8f0;border-radius:20px;padding:32px;">
          <div style="font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#F1503C;">WSP TED Bevakare</div>
          <h1 style="margin:12px 0 10px;font-size:28px;">${escapeHtml(title)}</h1>
          <p style="margin:0;font-size:16px;line-height:1.6;color:#475569;">${escapeHtml(message)}</p>
          ${manageLink}
        </div>
      </body>
    </html>
  `;
}

// ==========================================
// 1. TED Search & Exploration (Open / Public)
// ==========================================

router.get('/config', (req, res) => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  res.json({
    success: true,
    supabaseUrl: !isPlaceholder(supabaseUrl) ? supabaseUrl : '',
    supabaseAnonKey: !isPlaceholder(supabaseAnonKey) ? supabaseAnonKey : '',
    isSupabaseConfigured
  });
});

router.post('/auth/signup', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'E-post och lösenord krävs' });
    }

    if (!isSupabaseConfigured || !supabaseAdmin) {
      return res.json({ success: true, local: true });
    }

    // Try creating the user with auto-confirmed email (bypasses email rate limit)
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName || '' }
    });

    if (createError) {
      if (createError.code === 'email_exists' || createError.status === 422) {
        // User already registered - update password and ensure email is confirmed
        const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = userList?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
        if (existingUser) {
          await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName || existingUser.user_metadata?.full_name || '' }
          });
          return res.json({ success: true, user: existingUser, existing: true });
        }
      }
      throw createError;
    }

    const newUser = createData?.user;
    if (newUser?.id) {
      try {
        await watchlistDao.seedDefaults(newUser.id);
      } catch (e) {
        console.warn('Failed to seed default watchlists for new user:', e);
      }
    }

    res.json({ success: true, user: newUser });
  } catch (error) {
    console.error('[Auth Signup Error]:', error);
    res.status(400).json({ success: false, error: error.message || 'Kunde inte skapa konto' });
  }
});

router.post('/ted/search', async (req, res) => {
  try {
    const { filters = {}, page = 1, limit = 20 } = req.body;
    const targetPage = Math.max(1, parseInt(page) || 1);
    const targetLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));
    
    // Check if query is a direct publication number search for one of the directly-integrated portals
    const kw = (typeof filters.keywords === 'string' ? filters.keywords : '').trim();
    const isDirectMagnit = kw.toLowerCase().startsWith('magnit-') || (filters.rawQuery && filters.rawQuery.toLowerCase().includes('magnit'));
    const isDirectVerama = kw.toLowerCase().startsWith('verama-') || (filters.rawQuery && filters.rawQuery.toLowerCase().includes('verama'));

    if (isDirectMagnit) {
      const cleanId = kw.replace(/^magnit-/i, '');
      const magnitNotice = await getMagnitNoticeById(cleanId);
      return res.json({
        success: true,
        query: `publication-number = ${kw}`,
        totalCount: magnitNotice ? 1 : 0,
        page: 1,
        limit: 20,
        totalPages: 1,
        notices: magnitNotice ? [magnitNotice] : []
      });
    }

    if (isDirectVerama) {
      const cleanId = kw.replace(/^verama-/i, '');
      const veramaNotice = await getVeramaNoticeById(cleanId);
      return res.json({
        success: true,
        query: `publication-number = ${kw}`,
        totalCount: veramaNotice ? 1 : 0,
        page: 1,
        limit: 20,
        totalPages: 1,
        notices: veramaNotice ? [veramaNotice] : []
      });
    }

    // Execute TED search plus the open-API portal integrations (Magnit, Verama/Ework) in parallel
    const [tedResult, magnitResult, veramaResult] = await Promise.allSettled([
      searchTedNotices(filters, { page: targetPage, limit: targetLimit }),
      searchMagnitNotices(filters),
      searchVeramaNotices(filters)
    ]);

    const tedSuccess = tedResult.status === 'fulfilled' && tedResult.value.success;
    const magnitSuccess = magnitResult.status === 'fulfilled' && magnitResult.value.success;
    const veramaSuccess = veramaResult.status === 'fulfilled' && veramaResult.value.success;

    const tedNotices = tedSuccess ? (tedResult.value.notices || []) : [];
    const tedTotal = tedSuccess ? (tedResult.value.totalCount || 0) : 0;

    const magnitNotices = magnitSuccess ? (magnitResult.value.notices || []) : [];
    const veramaNotices = veramaSuccess ? (veramaResult.value.notices || []) : [];

    // Merge the two directly-queried portal sources (unpaginated at the source) into one
    // newest-first list, then paginate it locally the same way the TED results are paginated.
    const portalNotices = [...magnitNotices, ...veramaNotices].sort((a, b) => {
      const dateA = a.publicationDate || '';
      const dateB = b.publicationDate || '';
      return dateB.localeCompare(dateA);
    });
    const portalTotal = portalNotices.length;

    const totalCount = tedTotal + portalTotal;
    const totalPages = Math.max(1, Math.ceil(totalCount / targetLimit));

    let finalNotices = [];

    if (portalTotal === 0) {
      finalNotices = tedNotices;
    } else if (tedTotal === 0) {
      const pageStart = (targetPage - 1) * targetLimit;
      finalNotices = portalNotices.slice(pageStart, pageStart + targetLimit);
    } else {
      const pageStart = (targetPage - 1) * targetLimit;
      const pageEnd = targetPage * targetLimit;
      const portalInPage = portalNotices.slice(pageStart, pageEnd);

      if (portalInPage.length === targetLimit) {
        finalNotices = portalInPage;
      } else {
        const remainingSlots = targetLimit - portalInPage.length;
        finalNotices = [...portalInPage, ...tedNotices.slice(0, remainingSlots)];
      }
    }

    res.json({
      success: true,
      query: tedSuccess ? tedResult.value.query : '',
      totalCount,
      page: targetPage,
      limit: targetLimit,
      totalPages,
      notices: finalNotices
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/ted/notice/:id', async (req, res) => {
  try {
    const id = req.params.id;
    let notice = null;

    if (id.toLowerCase().startsWith('magnit-')) {
      notice = await getMagnitNoticeById(id);
    } else if (id.toLowerCase().startsWith('verama-')) {
      notice = await getVeramaNoticeById(id);
    } else {
      notice = await getNoticeById(id);
      if (!notice) {
        notice = await getMagnitNoticeById(id);
      }
      if (!notice) {
        notice = await getVeramaNoticeById(id);
      }
    }

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

router.post('/ai/cv-search', upload.array('files', 15), async (req, res) => {
  try {
    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ success: false, error: 'Minst en CV-fil (PDF, DOCX, DOC, TXT) krävs för CV-sökning' });
    }

    const { prompt = '', countries } = req.body;
    let preferredCountries = ['SWE'];
    if (countries) {
      try {
        preferredCountries = typeof countries === 'string' ? JSON.parse(countries) : countries;
      } catch (_) {}
    }

    // Parse uploaded CV files
    const { documents, documentCount } = await parseUploadedProcurementFiles(files);
    if (documentCount === 0 || !documents || documents.length === 0) {
      return res.status(400).json({ success: false, error: 'Kunde inte extrahera text från de uppladdade CV-filerna' });
    }

    const cvAnalysis = await analyzeCvAndGenerateSearchFilters(documents, prompt);

    // Apply country preference if specified
    if (preferredCountries && preferredCountries.length > 0) {
      cvAnalysis.countries = preferredCountries;
    }

    const tedQuery = buildExpertQuery(cvAnalysis);

    res.json({
      success: true,
      filters: {
        buyer: cvAnalysis.buyer,
        keywords: cvAnalysis.keywords,
        excludeKeywords: cvAnalysis.excludeKeywords,
        cpv: cvAnalysis.cpv,
        countries: cvAnalysis.countries,
        formType: cvAnalysis.formType || 'competition',
        datePreset: cvAnalysis.datePreset || 'all',
        onlyActive: true,
        explanation: cvAnalysis.explanation,
        suggestedWatchlistName: cvAnalysis.suggestedWatchlistName
      },
      tedQuery,
      cvSummary: {
        fileNames: documents.map(d => d.name),
        profilesIdentified: cvAnalysis.profilesIdentified || [],
        skills: cvAnalysis.skills || [],
        experienceHighlights: cvAnalysis.experienceHighlights || [],
        suggestedRoles: cvAnalysis.suggestedRoles || [],
        explanation: cvAnalysis.explanation,
        suggestedWatchlistName: cvAnalysis.suggestedWatchlistName
      },
      parsedDocuments: documents.map(d => ({
        name: d.name,
        size: d.size,
        charCount: d.charCount
      }))
    });
  } catch (error) {
    console.error('[AI CV Search] Error:', error);
    res.status(500).json({ success: false, error: error.message || 'CV-sökningen misslyckades' });
  }
});

router.post('/ai/analyze', requireAuth, async (req, res) => {
  try {
    const { notice } = req.body;
    if (!notice) {
      return res.status(400).json({ success: false, error: 'Notice-objekt krävs för analys' });
    }
    const userId = req.user?.id || '00000000-0000-0000-0000-000000000000';
    let companyProfile = null;
    try {
      companyProfile = await profileDao.get(userId, req.db);
    } catch (e) {
      console.warn('[AI Analyze] Failed to load company profile, using default:', e.message);
    }

    const analysis = await analyzeTender(notice, companyProfile);

    // If notice is already in pipeline, save analysis
    const noticeId = notice.id || notice.publicationNumber;
    if (noticeId) {
      try {
        await pipelineDao.updateAiAnalysis(noticeId, userId, JSON.stringify(analysis), req.db);
      } catch (e) {
        console.warn('[AI Analyze] Failed to update pipeline with analysis:', e.message);
      }
    }

    res.json({ success: true, analysis });
  } catch (error) {
    console.error('[AI Analyze] Error during tender analysis:', error);
    res.status(500).json({ success: false, error: error.message || 'Analysen misslyckades' });
  }
});

router.post('/ai/analyze-documents', requireAuth, upload.array('files', 30), async (req, res) => {
  try {
    const rawNotice = req.body.notice;
    if (!rawNotice) {
      return res.status(400).json({ success: false, error: 'Notice-data krävs' });
    }
    const notice = typeof rawNotice === 'string' ? JSON.parse(rawNotice) : rawNotice;
    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ success: false, error: 'Minst en fil (ZIP, PDF, DOCX, XLSX) krävs för dokumentanalys' });
    }

    const userId = req.user?.id || '00000000-0000-0000-0000-000000000000';
    let companyProfile = null;
    try {
      companyProfile = await profileDao.get(userId, req.db);
    } catch (e) {
      console.warn('[AI Analyze Documents] Failed to load company profile:', e.message);
    }

    // Parse uploaded files or ZIP archive
    const { documents, documentCount, combinedCorpus } = await parseUploadedProcurementFiles(files);
    if (documentCount === 0 || !combinedCorpus) {
      return res.status(400).json({ success: false, error: 'Kunde inte extrahera läsbar text från de uppladdade filerna' });
    }

    // Run deep analysis grounded in actual tender documents
    const analysis = await analyzeTenderWithDocuments(notice, combinedCorpus, companyProfile, documents);

    // Save to pipeline if notice is in pipeline
    const noticeId = notice.id || notice.publicationNumber;
    if (noticeId) {
      try {
        await pipelineDao.updateAiAnalysis(noticeId, userId, JSON.stringify(analysis), req.db);
      } catch (e) {
        console.warn('[AI Analyze Documents] Failed to update pipeline with analysis:', e.message);
      }
    }

    res.json({
      success: true,
      analysis,
      parsedDocuments: documents,
      documentCount
    });
  } catch (error) {
    console.error('[AI Analyze Documents] Error:', error);
    res.status(500).json({ success: false, error: error.message || 'Dokumentanalysen misslyckades' });
  }
});

router.post('/ai/chat', requireAuth, async (req, res) => {
  try {
    const { message, sessionId = 'default', context = {} } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Meddelande krävs' });
    }
    const userId = req.user.id;

    // Save user message
    const userMsgId = uuidv4();
    await chatDao.addMessage({
      id: userMsgId,
      user_id: userId,
      session_id: sessionId,
      role: 'user',
      content: message,
      context_notice_id: context.currentNotice?.id || null
    }, req.db);

    // Get conversation history for this user
    const history = await chatDao.getMessages(userId, sessionId, 20, req.db);
    const companyProfile = await profileDao.get(userId, req.db);

    // Call MiniMax
    const responseText = await chatWithAssistant(history, {
      ...context,
      companyProfile
    });

    // Save assistant message
    const assistantMsgId = uuidv4();
    await chatDao.addMessage({
      id: assistantMsgId,
      user_id: userId,
      session_id: sessionId,
      role: 'assistant',
      content: responseText,
      context_notice_id: context.currentNotice?.id || null
    }, req.db);

    res.json({
      success: true,
      reply: responseText,
      messageId: assistantMsgId
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/ai/chat/history', requireAuth, async (req, res) => {
  const { sessionId = 'default' } = req.query;
  const messages = await chatDao.getMessages(req.user.id, sessionId, 50, req.db);
  res.json({ success: true, messages });
});

router.delete('/ai/chat/history', requireAuth, async (req, res) => {
  const { sessionId = 'default' } = req.query;
  await chatDao.clearSession(req.user.id, sessionId, req.db);
  res.json({ success: true });
});

// ==========================================
// 3. Watchlists Endpoints (User Scoped)
// ==========================================

router.get('/watchlists/unsubscribe/:token', async (req, res) => {
  try {
    const watchlist = await watchlistDao.unsubscribeByToken(req.params.token);
    if (!watchlist) {
      return res.status(404).type('html').send(renderUnsubscribeHtml(
        'Lanken ar inte giltig',
        'Vi kunde inte hitta nagon bevakning for den har avregistreringslanken.'
      ));
    }

    return res.type('html').send(renderUnsubscribeHtml(
      'Bevakningen ar avregistrerad',
      `Du kommer inte att fa fler mail fran bevakningen "${watchlist.name}".`,
      buildWatchlistManageUrl(watchlist)
    ));
  } catch (error) {
    return res.status(500).type('html').send(renderUnsubscribeHtml(
      'Nagot gick fel',
      `Det gick inte att avregistrera bevakningen just nu: ${error.message}`
    ));
  }
});

router.get('/watchlists', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const rawWatchlists = await watchlistDao.getAll(userId, req.db);
    const watchlists = rawWatchlists.map(w => ({
      ...w,
      filters: JSON.parse(w.filters_json || '{}')
    }));
    const unreadCount = await hitsDao.getUnreadCount(userId, req.db);
    res.json({ success: true, watchlists, unreadCount });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/watchlists', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, filters = {}, emailFrequency } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Namn på bevakning krävs' });
    }
    const resolvedEmailFrequency = resolveEmailFrequency(emailFrequency, 'daily');

    const query = buildExpertQuery(filters);
    const id = uuidv4();

    const created = await watchlistDao.create({
      id,
      user_id: userId,
      name,
      query,
      filters_json: JSON.stringify(filters),
      active: 1,
      interval_minutes: 60,
      email_frequency: resolvedEmailFrequency,
      unsubscribe_token: uuidv4()
    }, req.db);

    // Trigger initial run immediately in background
    runWatchlist(created).catch(console.error);

    res.json({ success: true, watchlist: { ...created, filters } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/watchlists/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, filters = {}, active, emailFrequency } = req.body;
    const existing = await watchlistDao.getById(req.params.id, userId, req.db);
    if (!existing) {
      return res.status(404).json({ error: 'Bevakning hittades inte' });
    }
    if (emailFrequency !== undefined && !VALID_EMAIL_FREQUENCIES.has(emailFrequency)) {
      return res.status(400).json({ error: 'E-postutskick måste vara daily eller weekly' });
    }

    const query = buildExpertQuery(filters);
    const updated = await watchlistDao.update(req.params.id, userId, {
      name: name || existing.name,
      query,
      filters_json: JSON.stringify(filters),
      active: active !== undefined ? (active ? 1 : 0) : existing.active,
      interval_minutes: existing.interval_minutes,
      email_frequency: resolveEmailFrequency(emailFrequency, existing.email_frequency)
    }, req.db);

    res.json({ success: true, watchlist: { ...updated, filters } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/watchlists/:id', requireAuth, async (req, res) => {
  try {
    await watchlistDao.delete(req.params.id, req.user.id, req.db);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/watchlists/:id/run', requireAuth, async (req, res) => {
  try {
    const watchlist = await watchlistDao.getById(req.params.id, req.user.id, req.db);
    if (!watchlist) {
      return res.status(404).json({ error: 'Bevakning hittades inte' });
    }
    const result = await runWatchlist(watchlist);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/watchlists/run-all', requireAuth, async (req, res) => {
  try {
    const results = await runAllActiveWatchlists(req.user.id);
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/watchlists/:id/hits', requireAuth, async (req, res) => {
  try {
    const rawHits = await hitsDao.getByWatchlistId(req.params.id, req.user.id, 100, req.db);
    const hits = rawHits.map(h => ({
      ...h,
      notice: JSON.parse(h.notice_data_json || '{}')
    }));
    res.json({ success: true, hits });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/watchlists-hits/recent', requireAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const rawHits = await hitsDao.getAllRecentHits(req.user.id, limit, req.db);
    const hits = rawHits.map(h => ({
      ...h,
      notice: JSON.parse(h.notice_data_json || '{}')
    }));
    res.json({ success: true, hits });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/watchlists/hits/:id/read', requireAuth, async (req, res) => {
  try {
    await hitsDao.markAsRead(req.params.id, req.user.id, req.db);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/watchlists/hits/mark-all-read', requireAuth, async (req, res) => {
  try {
    const { watchlistId } = req.body;
    await hitsDao.markAllAsRead(req.user.id, watchlistId, req.db);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 4. Pipeline Endpoints (User Scoped)
// ==========================================

router.get('/pipeline', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const rawTenders = await pipelineDao.getAll(userId, req.db);
    const tenders = rawTenders.map(t => ({
      ...t,
      tags: JSON.parse(t.tags_json || '[]'),
      notice: JSON.parse(t.notice_data_json || '{}'),
      aiAnalysis: t.ai_analysis_json ? JSON.parse(t.ai_analysis_json) : null
    }));
    res.json({ success: true, tenders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/pipeline', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { notice, status = 'INBOX', priority = 'MEDIUM', notes = '', internalDeadline = null, assignedTo = '', tags = [] } = req.body;
    if (!notice) {
      return res.status(400).json({ error: 'Notice-data krävs' });
    }

    const noticeId = notice.id || notice.publicationNumber;
    const id = uuidv4();

    const saved = await pipelineDao.save({
      id,
      user_id: userId,
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
    }, req.db);

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

router.put('/pipeline/:id/status', requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await pipelineDao.updateStatus(req.params.id, req.user.id, status, req.db);
    res.json({ success: true, tender: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/pipeline/:id/details', requireAuth, async (req, res) => {
  try {
    const { notes = '', internalDeadline = null, priority = 'MEDIUM', assignedTo = '', tags = [] } = req.body;
    const updated = await pipelineDao.updateNotes(
      req.params.id,
      req.user.id,
      notes,
      internalDeadline,
      priority,
      assignedTo,
      JSON.stringify(tags),
      req.db
    );
    res.json({ success: true, tender: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/pipeline/:id', requireAuth, async (req, res) => {
  try {
    await pipelineDao.delete(req.params.id, req.user.id, req.db);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 4b. Hidden Notices (User-Dismissed Tenders)
// ==========================================

router.get('/hidden-notices', requireAuth, async (req, res) => {
  try {
    const hiddenNotices = await hiddenNoticeDao.getAll(req.user.id, req.db);
    res.json({ success: true, hiddenNotices });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/hidden-notices', requireAuth, async (req, res) => {
  try {
    const { noticeId, reason } = req.body;
    if (!noticeId) {
      return res.status(400).json({ success: false, error: 'noticeId krävs' });
    }
    await hiddenNoticeDao.hide(req.user.id, noticeId, reason, req.db);
    res.json({ success: true, noticeId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/hidden-notices/:noticeId', requireAuth, async (req, res) => {
  try {
    await hiddenNoticeDao.unhide(req.user.id, req.params.noticeId, req.db);
    res.json({ success: true, noticeId: req.params.noticeId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 5. CPV & Company Profile Endpoints
// ==========================================

router.get('/cpv', (req, res) => {
  const { q } = req.query;
  const results = searchCpv(q);
  res.json({ success: true, categories: results });
});

router.get('/users/active', requireAuth, async (req, res) => {
  try {
    const users = await profileDao.getActiveUsers();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/team-members', requireAuth, async (req, res) => {
  try {
    const members = await teamMemberDao.getAll(req.db);
    res.json({ success: true, members });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/team-members', requireAuth, async (req, res) => {
  try {
    const { name, email, role } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Namn på kollegan krävs.' });
    }
    const member = await teamMemberDao.add({
      name: name.trim(),
      email: email ? email.trim() : '',
      role: role ? role.trim() : 'Kollega',
      userId: req.user.id
    }, req.db);
    res.json({ success: true, member });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/team-members/:id', requireAuth, async (req, res) => {
  try {
    await teamMemberDao.delete(req.params.id, req.db);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/profile', requireAuth, async (req, res) => {
  try {
    const profile = await profileDao.get(req.user.id, req.db);
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { name, description, keywords, preferred_cpv, preferred_countries, min_value } = req.body;
    const updated = await profileDao.update(req.user.id, {
      name,
      description,
      keywords,
      preferred_cpv,
      preferred_countries,
      min_value: parseInt(min_value) || 0
    }, req.db);
    res.json({ success: true, profile: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 6. Export Endpoints (Excel & CSV)
// ==========================================

router.get('/export/:type', requireAuth, async (req, res) => {
  const { type } = req.params; // pipeline, hits
  const format = req.query.format || 'xlsx';
  const userId = req.user.id;

  let data = [];
  if (type === 'pipeline') {
    const raw = await pipelineDao.getAll(userId, req.db);
    data = raw.map(t => {
      const notice = JSON.parse(t.notice_data_json || '{}');
      return {
        'TED ID': t.notice_id,
        'Titel': t.title,
        'Upphandlare': t.buyer,
        'Land': t.country,
        'Uppskattat värde': t.estimated_value || notice.estimatedValue || '',
        'Portal': notice.portalName || notice.links?.portalName || '',
        'Status': t.status,
        'Prioritet': t.priority,
        'Sista anbudsdag': t.deadline || '',
        'Intern deadline': t.internal_deadline || '',
        'Ansvarig': t.assigned_to || '',
        'Anteckningar': t.notes || '',
        'Anbudslänk (Portal)': notice.links?.submission || '',
        'Dokumentlänk': notice.links?.documents || '',
        'Officiell TED Länk': notice.links?.tedHtml || ''
      };
    });
  } else if (type === 'hits') {
    const raw = await hitsDao.getAllRecentHits(userId, 500, req.db);
    data = raw.map(h => {
      const notice = JSON.parse(h.notice_data_json || '{}');
      return {
        'Bevakning': h.watchlist_name,
        'TED ID': h.notice_id,
        'Titel': notice.title,
        'Upphandlare': notice.buyer,
        'Uppskattat värde': notice.estimatedValue || '',
        'Portal': notice.portalName || notice.links?.portalName || '',
        'Sista anbudsdag': notice.deadline || '',
        'Upptäckt datum': h.discovered_at,
        'Anbudslänk': notice.links?.submission || '',
        'Dokumentlänk': notice.links?.documents || '',
        'Officiell TED Länk': notice.links?.tedHtml || ''
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

  const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=ted_${type}_export.xlsx`);
  res.send(buffer);
});

// ==========================================
// 7. Admin Endpoints
// ==========================================

router.get('/admin/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await adminDao.getStats();
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/admin/health', requireAdmin, async (req, res) => {
  try {
    const health = {};

    // 1. TED API v3
    const tedStart = Date.now();
    try {
      const tedRes = await searchTedNotices({ keywords: 'BIM' }, { page: 1, limit: 1 });
      health.ted = {
        status: tedRes.success ? 'online' : 'degraded',
        latencyMs: Date.now() - tedStart,
        totalAvailable: tedRes.totalCount || 0,
        endpoint: process.env.TED_API_URL || 'https://api.ted.europa.eu/v3/notices/search',
        error: tedRes.error || null
      };
    } catch (e) {
      health.ted = {
        status: 'offline',
        latencyMs: Date.now() - tedStart,
        endpoint: process.env.TED_API_URL || 'https://api.ted.europa.eu/v3/notices/search',
        error: e.message
      };
    }

    // 2. Magnit Source
    const magnitStart = Date.now();
    try {
      const magnitRes = await searchMagnitNotices({ keywords: '' });
      health.magnit = {
        status: magnitRes.success ? 'online' : 'degraded',
        latencyMs: Date.now() - magnitStart,
        activeCount: (magnitRes.notices || []).length,
        error: magnitRes.error || null
      };
    } catch (e) {
      health.magnit = {
        status: 'offline',
        latencyMs: Date.now() - magnitStart,
        error: e.message
      };
    }

    // 3. Verama / Ework
    const veramaStart = Date.now();
    try {
      const veramaRes = await searchVeramaNotices({ keywords: '' });
      health.verama = {
        status: veramaRes.success ? 'online' : 'degraded',
        latencyMs: Date.now() - veramaStart,
        activeCount: (veramaRes.notices || []).length,
        error: veramaRes.error || null
      };
    } catch (e) {
      health.verama = {
        status: 'offline',
        latencyMs: Date.now() - veramaStart,
        error: e.message
      };
    }

    // 4. MiniMax LLM
    const aiStart = Date.now();
    try {
      const apiKey = process.env.MINIMAX_API_KEY || '';
      const hasKey = Boolean(apiKey && !apiKey.includes('din_minimax'));
      health.minimax = {
        status: hasKey ? 'online' : 'not_configured',
        model: process.env.MINIMAX_MODEL || 'MiniMax-M3',
        endpoint: process.env.MINIMAX_BASE_URL || 'https://api.minimax.io/anthropic/v1',
        latencyMs: Date.now() - aiStart
      };
    } catch (e) {
      health.minimax = {
        status: 'error',
        error: e.message
      };
    }

    // 5. Database
    const dbStart = Date.now();
    try {
      const stats = await adminDao.getStats();
      health.database = {
        status: 'online',
        mode: stats.dbMode,
        latencyMs: Date.now() - dbStart,
        counts: stats
      };
    } catch (e) {
      health.database = {
        status: 'offline',
        latencyMs: Date.now() - dbStart,
        error: e.message
      };
    }

    // 6. Mailtrap Email
    const mailtrapToken = process.env.MAILTRAP_API_TOKEN || '';
    const mailtrapFrom = process.env.MAILTRAP_FROM_EMAIL || '';
    const isMailConfigured = Boolean(mailtrapToken && !mailtrapToken.includes('<YOUR_') && mailtrapFrom);
    health.mailtrap = {
      status: isMailConfigured ? 'configured' : 'unconfigured',
      apiUrl: process.env.MAILTRAP_API_URL || 'https://send.api.mailtrap.io/api/send',
      fromEmail: mailtrapFrom || 'Ej angiven',
      fromName: process.env.MAILTRAP_FROM_NAME || 'WSP TED Bevakare',
      category: process.env.MAILTRAP_CATEGORY || 'Watchlist Digest'
    };

    res.json({
      success: true,
      services: health,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/admin/users', requireAdmin, async (req, res) => {
  try {
    const users = await adminDao.getAllUsers();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/admin/users', requireAdmin, async (req, res) => {
  try {
    const { email, password, fullName, companyName, role } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'E-postadress krävs' });
    }

    const userId = uuidv4();
    if (isSupabaseConfigured && supabaseAdmin) {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: password || 'WspDefaultPass123!',
        email_confirm: true,
        user_metadata: { full_name: fullName || '', role: role || 'user' }
      });

      if (authError) {
        return res.status(400).json({ success: false, error: authError.message });
      }

      const createdUserId = authData?.user?.id || userId;
      await supabaseAdmin.from('profiles').upsert({
        id: createdUserId,
        email,
        full_name: fullName || '',
        company_name: companyName || 'WSP Sverige AB',
        role: role || 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      try {
        await watchlistDao.seedDefaults(createdUserId);
      } catch (e) {}

      return res.json({ success: true, userId: createdUserId });
    }

    await adminDao.updateUserProfileAdmin(userId, {
      fullName: fullName || 'Ny Användare',
      companyName: companyName || 'WSP Sverige AB',
      email,
      role: role || 'user'
    });

    res.json({ success: true, userId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/admin/users/:id/role', requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!role || !['admin', 'user'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Rollen måste vara "admin" eller "user"' });
    }
    const result = await adminDao.updateUserRole(req.params.id, role);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/admin/users/:id/profile', requireAdmin, async (req, res) => {
  try {
    const result = await adminDao.updateUserProfileAdmin(req.params.id, req.body);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/admin/users/:id', requireAdmin, async (req, res) => {
  try {
    const result = await adminDao.deleteUser(req.params.id);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/admin/watchlists', requireAdmin, async (req, res) => {
  try {
    const watchlists = await adminDao.getAllWatchlists();
    res.json({ success: true, watchlists });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/admin/watchlists/:id/run', requireAdmin, async (req, res) => {
  try {
    const allWls = await adminDao.getAllWatchlists();
    const wl = allWls.find(w => w.id === req.params.id);
    if (!wl) {
      return res.status(404).json({ success: false, error: 'Bevakningen hittades inte' });
    }

    const runObj = {
      id: wl.id,
      name: wl.name,
      query: wl.query,
      user_id: wl.userId,
      filters_json: JSON.stringify(wl.filters || {})
    };

    const result = await runWatchlist(runObj);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/admin/watchlists/:id/toggle', requireAdmin, async (req, res) => {
  try {
    const { active } = req.body;
    const result = await adminDao.toggleWatchlist(req.params.id, active);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/admin/watchlists/:id', requireAdmin, async (req, res) => {
  try {
    const result = await adminDao.deleteWatchlist(req.params.id);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/admin/cron/run', requireAdmin, async (req, res) => {
  try {
    const results = await runAllActiveWatchlists();
    res.json({ success: true, count: results.length, results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/admin/email/status', requireAdmin, async (req, res) => {
  try {
    const mailtrapToken = process.env.MAILTRAP_API_TOKEN || '';
    const mailtrapFrom = process.env.MAILTRAP_FROM_EMAIL || '';
    const isConfigured = Boolean(mailtrapToken && !mailtrapToken.includes('<YOUR_') && mailtrapFrom);

    const stats = await adminDao.getStats();

    res.json({
      success: true,
      configured: isConfigured,
      apiUrl: process.env.MAILTRAP_API_URL || 'https://send.api.mailtrap.io/api/send',
      fromEmail: mailtrapFrom || '',
      fromName: process.env.MAILTRAP_FROM_NAME || 'WSP TED Bevakare',
      category: process.env.MAILTRAP_CATEGORY || 'Watchlist Digest',
      totalUnreadHits: stats.unreadHits || 0,
      activeWatchlistsCount: stats.activeWatchlists || 0
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/admin/email/test', requireAdmin, async (req, res) => {
  try {
    const { targetEmail } = req.body;
    if (!targetEmail) {
      return res.status(400).json({ success: false, error: 'Mottagaradress krävs för testutskick' });
    }

    const MAILTRAP_API_URL = process.env.MAILTRAP_API_URL || 'https://send.api.mailtrap.io/api/send';
    const MAILTRAP_API_TOKEN = process.env.MAILTRAP_API_TOKEN || '';
    const MAILTRAP_FROM_EMAIL = process.env.MAILTRAP_FROM_EMAIL || '';
    const MAILTRAP_FROM_NAME = process.env.MAILTRAP_FROM_NAME || 'WSP TED Bevakare';

    if (!MAILTRAP_API_TOKEN || !MAILTRAP_FROM_EMAIL) {
      return res.status(400).json({
        success: false,
        error: 'Mailtrap är inte fullständigt konfigurerat. Kontrollera MAILTRAP_API_TOKEN och MAILTRAP_FROM_EMAIL i .env.'
      });
    }

    const testHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
        <div style="color: #F1503C; font-weight: bold; font-size: 14px; text-transform: uppercase;">WSP TED Bevakare • Testutskick</div>
        <h2 style="color: #0f172a; margin-top: 12px;">Verifiering av e-postintegration</h2>
        <p style="color: #475569; line-height: 1.6;">
          Detta är ett administrativt testmeddelande från <strong>WSP TED Bevakare</strong> för att verifiera att anslutningen till Mailtrap och leverans av automatiska bevakningssammanfattningar fungerar som avsett.
        </p>
        <div style="background: #f8fafc; border-left: 4px solid #F1503C; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
          <div style="font-size: 13px; color: #64748b;"><strong>Tidstämpel:</strong> ${new Date().toLocaleString('sv-SE')}</div>
          <div style="font-size: 13px; color: #64748b;"><strong>Mottagare:</strong> ${escapeHtml(targetEmail)}</div>
          <div style="font-size: 13px; color: #64748b;"><strong>Status:</strong> Konfiguration OK</div>
        </div>
        <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">Skickat via WSP TED Bevakare Admin-panel.</p>
      </div>
    `;

    const response = await fetch(MAILTRAP_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MAILTRAP_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: { email: MAILTRAP_FROM_EMAIL, name: MAILTRAP_FROM_NAME },
        to: [{ email: targetEmail }],
        subject: 'WSP TED Bevakare: Test av e-postintegration',
        text: `Detta är ett administrativt testmeddelande från WSP TED Bevakare skickat till ${targetEmail} vid ${new Date().toLocaleString('sv-SE')}.`,
        html: testHtml,
        category: 'Admin Test'
      })
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.message || data?.error || `Mailtrap API fel (${response.status})`);
    }

    res.json({
      success: true,
      message: `Testmail skickat till ${targetEmail}`,
      messageId: data?.message_ids?.[0] || data?.message_id || 'OK'
    });
  } catch (err) {
    console.error('[Admin Email Test Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/admin/test/ted', requireAdmin, async (req, res) => {
  const startTime = Date.now();
  try {
    const { query, filters = {}, page = 1, limit = 10 } = req.body;
    const searchFilter = query ? { ...filters, rawQuery: query } : filters;

    const result = await searchTedNotices(searchFilter, { page: parseInt(page) || 1, limit: parseInt(limit) || 10 });
    const latencyMs = Date.now() - startTime;

    res.json({
      success: true,
      latencyMs,
      ...result
    });
  } catch (err) {
    res.status(500).json({ success: false, latencyMs: Date.now() - startTime, error: err.message });
  }
});

router.post('/admin/test/minimax', requireAdmin, async (req, res) => {
  const startTime = Date.now();
  try {
    const { prompt = 'Svara kort på svenska i två meningar: Vad är WSP och hur hjälper TED upphandlingsbevakare konsultorganisationer?' } = req.body;
    const reply = await callMiniMax([
      { role: 'user', content: prompt }
    ], 'Du är en hjälpsam AI-expert inom upphandling och WSP.');
    const latencyMs = Date.now() - startTime;

    res.json({
      success: true,
      reply,
      latencyMs,
      model: process.env.MINIMAX_MODEL || 'MiniMax-M3'
    });
  } catch (err) {
    res.status(500).json({ success: false, latencyMs: Date.now() - startTime, error: err.message });
  }
});

router.post('/admin/maintenance/cleanup-hits', requireAdmin, async (req, res) => {
  try {
    const { days = 30 } = req.body;
    const result = await adminDao.cleanupHits(parseInt(days) || 30);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/admin/maintenance/cleanup-chats', requireAdmin, async (req, res) => {
  try {
    const { days = 30 } = req.body;
    const result = await adminDao.cleanupChats(parseInt(days) || 30);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/admin/maintenance/release-lock', requireAdmin, async (req, res) => {
  try {
    const result = await adminDao.releaseCronLock();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/admin/export/all', requireAdmin, async (req, res) => {
  try {
    const dump = await adminDao.exportAll();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=ted_monitor_backup_${new Date().toISOString().slice(0, 10)}.json`);
    res.json(dump);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
