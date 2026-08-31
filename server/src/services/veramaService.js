import { parseTedDate, formatEstimatedValue } from './tedService.js';

// Ework Group's consultant marketplace, formerly branded "Verama" and now merged into the
// Ework domain. app.verama.com still serves the public job-request browsing API used by its
// own (unauthenticated) "Find work" page — same open-JSON-API pattern as magnitService.js.
const VERAMA_API_BASE = 'https://app.verama.com/api/public';
const VERAMA_PORTAL_BASE = 'https://app.verama.com/job-requests';

let cachedJobs = [];
let cachedDetailsMap = new Map();
let lastFetchedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache
const DETAILS_CACHE_TTL_MS = 30 * 60 * 1000;
const DETAILS_CACHE_MAX_SIZE = 500;

function pruneDetailsCache() {
  const now = Date.now();
  for (const [id, entry] of cachedDetailsMap) {
    if (now - entry.cachedAt > DETAILS_CACHE_TTL_MS) {
      cachedDetailsMap.delete(id);
    }
  }
  while (cachedDetailsMap.size > DETAILS_CACHE_MAX_SIZE) {
    const oldestKey = cachedDetailsMap.keys().next().value;
    cachedDetailsMap.delete(oldestKey);
  }
}

function stripHtml(html = '') {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export async function fetchVeramaJobDetails(id) {
  const cached = cachedDetailsMap.get(id);
  if (cached && (Date.now() - cached.cachedAt) < DETAILS_CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const res = await fetch(`${VERAMA_API_BASE}/job-requests/${id}`, {
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) return cached?.data || null;

    const data = await res.json();
    cachedDetailsMap.delete(id);
    cachedDetailsMap.set(id, { data, cachedAt: Date.now() });
    pruneDetailsCache();
    return data;
  } catch (err) {
    console.error(`[Verama Service] Failed to fetch details for ${id}:`, err.message);
    return cached?.data || null;
  }
}

async function refreshVeramaCache(force = false) {
  const now = Date.now();
  if (!force && cachedJobs.length > 0 && (now - lastFetchedAt) < CACHE_TTL_MS) {
    return cachedJobs;
  }

  try {
    const params = new URLSearchParams({
      page: '0',
      size: '250',
      query: '',
      dedicated: 'false',
      favouritesOnly: 'false',
      recommendedOnly: 'false',
      sort: 'firstDayOfApplications,DESC'
    });
    const res = await fetch(`${VERAMA_API_BASE}/job-requests?${params.toString()}`, {
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) {
      console.warn(`[Verama Service] API returned status ${res.status}`);
      return cachedJobs;
    }

    const data = await res.json();
    const rawJobs = data.content || [];

    cachedJobs = rawJobs;
    lastFetchedAt = now;

    // Prefetch top job details (for full description text) in background
    const prefetchSlice = rawJobs.slice(0, 40);
    Promise.all(prefetchSlice.map(j => fetchVeramaJobDetails(j.id))).catch(() => {});

    return cachedJobs;
  } catch (err) {
    console.error('[Verama Service] Error fetching Verama jobs:', err.message);
    return cachedJobs;
  }
}

export function normalizeVeramaJob(job, details = null) {
  if (!job) return null;

  const jobId = job.id;
  const systemId = job.systemId || details?.systemId || String(jobId);
  const pubNum = `VERAMA-${systemId}`;

  const title = job.title || details?.title || 'Konsultuppdrag';

  const clientName = job.legalEntityClient?.name || details?.legalEntityClient?.name;
  const brokerName = job.administratorLegalEntityClient?.name || details?.administratorLegalEntityClient?.name;
  const buyerName = (clientName && clientName.trim()) || (brokerName && brokerName.trim()) || 'Ework/Verama-kund';

  const loc = (job.locations && job.locations[0]) || (details?.locations && details.locations[0]) || null;
  const city = loc?.city || '';
  const country = loc?.countryCode || 'SWE';

  const rawHtmlDesc = details?.description || job.description || title;
  const description = stripHtml(rawHtmlDesc);

  const pubDateRaw = job.firstDayOfApplications || details?.firstDayOfApplications || '';
  const publicationDate = pubDateRaw ? pubDateRaw.slice(0, 10) : new Date().toISOString().slice(0, 10);

  const deadlineStr = job.lastDayOfApplications || details?.lastDayOfApplications || null;
  let deadline = deadlineStr;
  let deadlineStatus = 'OPEN';
  let daysRemaining = null;

  if (deadlineStr) {
    const dlDate = parseTedDate(deadlineStr);
    if (dlDate) {
      const now = new Date();
      const diffMs = dlDate.getTime() - now.getTime();
      if (diffMs <= 0) {
        deadlineStatus = 'EXPIRED';
        const daysPassed = Math.max(1, Math.ceil(Math.abs(diffMs) / (1000 * 60 * 60 * 24)));
        daysRemaining = -daysPassed;
      } else {
        daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        deadlineStatus = daysRemaining <= 7 ? 'EXPIRING_SOON' : 'OPEN';
      }
    }
  }

  const rate = job.rate || details?.rate || null;
  const rateAmount = rate?.maxRate ? Number(rate.maxRate) : null;
  const rateCurrency = rate?.currency || 'SEK';

  let estimatedValue = '';
  let estimatedValueAmount = null;
  let estimatedValueFormatted = '';
  let estimatedValueDisplay = '';

  if (rateAmount) {
    estimatedValue = `${rateAmount} ${rateCurrency}/tim`;
    estimatedValueFormatted = `${rateAmount} kr/h`;

    const hoursPerWeek = Number(job.hoursPerWeek || details?.hoursPerWeek || 40);
    const start = job.startDate || details?.startDate;
    const end = job.endDate || details?.endDate;
    let weeks = 20;
    if (start && end) {
      const s = new Date(start).getTime();
      const e = new Date(end).getTime();
      if (!isNaN(s) && !isNaN(e) && e > s) {
        weeks = Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24 * 7)));
      }
    }

    const totalEst = rateAmount * hoursPerWeek * weeks;
    estimatedValueAmount = totalEst;
    const valObj = formatEstimatedValue(totalEst, rateCurrency);
    estimatedValueDisplay = valObj ? `${rateAmount} kr/tim (~${valObj.humanized})` : `${rateAmount} kr/tim`;
  }

  const jobUrl = `${VERAMA_PORTAL_BASE}/${systemId}`;

  return {
    id: `verama-${jobId}`,
    publicationNumber: pubNum,
    title,
    description,
    buyer: buyerName,
    city,
    country,
    cpvList: ['71300000', '72000000'],
    cpvDetails: [
      { code: '71300000', label: 'Tekniska konsulttjänster' },
      { code: '72000000', label: 'IT-tjänster: rådgivning, programvaruutveckling' }
    ],
    publicationDate,
    deadline,
    daysRemaining,
    deadlineStatus,
    formType: 'competition',
    estimatedValue,
    estimatedValueAmount,
    estimatedValueCurrency: rateCurrency,
    estimatedValueFormatted,
    estimatedValueDisplay,
    portalName: 'Verama',
    links: {
      tedHtml: jobUrl,
      submission: jobUrl,
      documents: jobUrl,
      portalName: 'Verama'
    },
    raw: { job, details }
  };
}

export async function searchVeramaNotices(filters = {}) {
  try {
    const rawJobs = await refreshVeramaCache();
    if (!rawJobs || rawJobs.length === 0) {
      return { success: true, notices: [], totalCount: 0 };
    }

    const normalized = [];
    for (const j of rawJobs) {
      const details = cachedDetailsMap.get(j.id)?.data || null;
      const notice = normalizeVeramaJob(j, details);
      if (notice) normalized.push(notice);
    }

    let filtered = normalized;

    if (filters.keywords && filters.keywords.trim()) {
      const kwTerms = filters.keywords
        .toLowerCase()
        .split(/\s+(?:or|eller|\|\|)\s+|,\s*/i)
        .map(s => s.trim())
        .filter(Boolean);

      if (kwTerms.length > 0) {
        filtered = filtered.filter(n => {
          const haystack = `${n.title} ${n.description} ${n.buyer} ${n.city} ${n.publicationNumber} ${n.portalName}`.toLowerCase();
          return kwTerms.some(term => haystack.includes(term));
        });
      }
    }

    if (filters.excludeKeywords && filters.excludeKeywords.trim()) {
      const exTerms = filters.excludeKeywords
        .toLowerCase()
        .split(/\s+(?:or|eller|\|\|)\s+|,\s*/i)
        .map(s => s.trim())
        .filter(Boolean);

      if (exTerms.length > 0) {
        filtered = filtered.filter(n => {
          const haystack = `${n.title} ${n.description} ${n.buyer} ${n.city} ${n.publicationNumber} ${n.portalName}`.toLowerCase();
          return !exTerms.some(term => haystack.includes(term));
        });
      }
    }

    if (filters.buyer && filters.buyer.trim()) {
      const bTerms = filters.buyer
        .toLowerCase()
        .split(/\s+(?:or|eller|\|\|)\s+|,\s*/i)
        .map(s => s.trim())
        .filter(Boolean);

      if (bTerms.length > 0) {
        filtered = filtered.filter(n => {
          const buyerText = n.buyer.toLowerCase();
          return bTerms.some(term => buyerText.includes(term));
        });
      }
    }

    if (filters.formType && filters.formType !== 'ALL' && filters.formType !== 'competition') {
      return { success: true, notices: [], totalCount: 0 };
    }

    if (filters.countries && filters.countries.length > 0 && !filters.allCountries) {
      const wantedCountries = filters.countries.map(c => c.toUpperCase());
      filtered = filtered.filter(n => wantedCountries.includes((n.country || '').toUpperCase()));
    }

    const shouldFilterOnlyActive = filters.onlyActive === true || (filters.onlyActive !== false && filters.includeExpired !== true);
    if (shouldFilterOnlyActive) {
      filtered = filtered.filter(n => n.deadlineStatus !== 'EXPIRED');
    }

    filtered.sort((a, b) => {
      const dateA = a.publicationDate || '';
      const dateB = b.publicationDate || '';
      return dateB.localeCompare(dateA);
    });

    return {
      success: true,
      notices: filtered,
      totalCount: filtered.length
    };
  } catch (err) {
    console.error('[Verama Service] Search failed:', err);
    return { success: false, notices: [], totalCount: 0, error: err.message };
  }
}

export async function getVeramaNoticeById(id) {
  const cleanId = id.replace(/^verama-/i, '');
  const details = await fetchVeramaJobDetails(cleanId);
  if (!details) return null;

  return normalizeVeramaJob(details, details);
}
