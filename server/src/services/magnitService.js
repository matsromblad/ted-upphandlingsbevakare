import { parseTedDate, formatEstimatedValue } from './tedService.js';

const MAGNIT_API_BASE = 'https://app-openmarketgateway-prod.azurewebsites.net/api';
const MAGNIT_PORTAL_BASE = 'https://magnit-source.magnitglobal.com/browse/job-details';

let cachedJobs = [];
// Map<jobId, { data, cachedAt }> — bounded and TTL'd below so it can't grow unbounded
// across the process lifetime as new job IDs are seen.
let cachedDetailsMap = new Map();
let lastFetchedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache
const DETAILS_CACHE_TTL_MS = 30 * 60 * 1000; // job details change rarely; cache longer than the list
const DETAILS_CACHE_MAX_SIZE = 500;

function pruneDetailsCache() {
  const now = Date.now();
  for (const [id, entry] of cachedDetailsMap) {
    if (now - entry.cachedAt > DETAILS_CACHE_TTL_MS) {
      cachedDetailsMap.delete(id);
    }
  }
  // Evict oldest entries (Map preserves insertion order) if still over the cap
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

export async function fetchMagnitJobDetails(jobId) {
  const cached = cachedDetailsMap.get(jobId);
  if (cached && (Date.now() - cached.cachedAt) < DETAILS_CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const res = await fetch(`${MAGNIT_API_BASE}/jobsearch/${jobId}/details`, {
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) return cached?.data || null;

    const data = await res.json();
    // Delete-then-set so re-fetched entries move to the end for the FIFO eviction order.
    cachedDetailsMap.delete(jobId);
    cachedDetailsMap.set(jobId, { data, cachedAt: Date.now() });
    pruneDetailsCache();
    return data;
  } catch (err) {
    console.error(`[Magnit Service] Failed to fetch details for ${jobId}:`, err.message);
    return cached?.data || null;
  }
}

async function refreshMagnitCache(force = false) {
  const now = Date.now();
  if (!force && cachedJobs.length > 0 && (now - lastFetchedAt) < CACHE_TTL_MS) {
    return cachedJobs;
  }

  try {
    const res = await fetch(`${MAGNIT_API_BASE}/jobsearch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        pageSize: 150,
        sortOption: { orderBy: 'PublishedDate', direction: 'Desc' }
      })
    });

    if (!res.ok) {
      console.warn(`[Magnit Service] API returned status ${res.status}`);
      return cachedJobs;
    }

    const data = await res.json();
    const rawJobs = data.jobs || [];

    cachedJobs = rawJobs;
    lastFetchedAt = now;

    // Prefetch top job details in background
    const prefetchSlice = rawJobs.slice(0, 40);
    Promise.all(prefetchSlice.map(j => fetchMagnitJobDetails(j.id))).catch(() => {});

    return cachedJobs;
  } catch (err) {
    console.error('[Magnit Service] Error fetching Magnit jobs:', err.message);
    return cachedJobs;
  }
}

export function normalizeMagnitJob(job, details = null) {
  if (!job) return null;

  const jobId = job.id;
  const requestId = job.technicalDetails?.requestId || details?.technicalDetails?.requestId || jobId.slice(0, 8).toUpperCase();
  const pubNum = `MAGNIT-${requestId}`;

  const title = job.title || details?.title || 'Konsultuppdrag';

  let buyerName = 'Magnit / Kund';
  const rawCompany = details?.company || job.company;
  if (rawCompany && rawCompany !== '-' && rawCompany.trim()) {
    buyerName = rawCompany.trim();
  } else if (details?.clientInfo?.name && details.clientInfo.name !== 'Public Transport sector') {
    buyerName = details.clientInfo.name;
  } else if (rawCompany === '-' && title.toLowerCase().includes('tunnelbanan')) {
    buyerName = 'Förvaltning för Utbyggd Tunnelbana (FUT)';
  } else if (rawCompany === '-' && (title.toLowerCase().includes('tvärbanan') || title.toLowerCase().includes('roslagsbanan') || title.toLowerCase().includes('spårväg'))) {
    buyerName = 'Trafikförvaltningen (SL)';
  }

  const locStr = details?.requestDetails?.location || job.location || 'Stockholm, SWE';
  const locParts = locStr.split(',');
  const city = locParts[0]?.trim() || 'Stockholm';
  const country = 'SWE';

  const rawHtmlDesc = details?.requiredSkillsAndEducation || details?.description || job.description || title;
  const description = stripHtml(rawHtmlDesc);

  const pubDateRaw = job.technicalDetails?.dateFirstPublished || details?.technicalDetails?.dateFirstPublished || '';
  let publicationDate = pubDateRaw ? pubDateRaw.slice(0, 10) : new Date().toISOString().slice(0, 10);

  const deadlineStr = details?.requestDetails?.submissionDeadline || job.requestDetails?.submissionDeadline || job.submissionDeadline || null;
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
        if (daysRemaining <= 7) {
          deadlineStatus = 'EXPIRING_SOON';
        } else {
          deadlineStatus = 'OPEN';
        }
      }
    }
  }

  const rateInfo = details?.requestDetails?.rate || job.rate || job.requestDetails?.rate;
  const rateAmount = rateInfo?.amount ? Number(rateInfo.amount) : null;
  const rateCurrency = rateInfo?.currencySymbol || 'kr';

  let estimatedValue = '';
  let estimatedValueAmount = null;
  let estimatedValueFormatted = '';
  let estimatedValueDisplay = '';

  if (rateAmount) {
    estimatedValue = `${rateAmount} ${rateCurrency}/tim`;
    estimatedValueFormatted = `${rateAmount} kr/h`;

    const startDate = details?.requestDetails?.startDate || job.requestDetails?.startDate;
    const endDate = details?.requestDetails?.endDate || job.requestDetails?.endDate;
    let weeks = 20;

    if (startDate && endDate) {
      const s = new Date(startDate).getTime();
      const e = new Date(endDate).getTime();
      if (!isNaN(s) && !isNaN(e) && e > s) {
        weeks = Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24 * 7)));
      }
    }

    const hours = Number(details?.requestDetails?.hoursPerWeek || 40);
    const totalEst = rateAmount * hours * weeks;
    estimatedValueAmount = totalEst;

    const valObj = formatEstimatedValue(totalEst, 'SEK');
    if (valObj) {
      estimatedValueDisplay = `${rateAmount} kr/tim (~${valObj.humanized})`;
    } else {
      estimatedValueDisplay = `${rateAmount} kr/tim`;
    }
  }

  const jobUrl = `${MAGNIT_PORTAL_BASE}/${jobId}`;

  return {
    id: `magnit-${jobId}`,
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
    estimatedValueCurrency: 'SEK',
    estimatedValueFormatted,
    estimatedValueDisplay,
    portalName: 'Magnit',
    links: {
      tedHtml: jobUrl,
      submission: jobUrl,
      documents: jobUrl,
      portalName: 'Magnit'
    },
    raw: { job, details }
  };
}

export async function searchMagnitNotices(filters = {}) {
  try {
    const rawJobs = await refreshMagnitCache();
    if (!rawJobs || rawJobs.length === 0) {
      return { success: true, notices: [], totalCount: 0 };
    }

    const normalized = [];
    for (const j of rawJobs) {
      const details = cachedDetailsMap.get(j.id)?.data || null;
      const notice = normalizeMagnitJob(j, details);
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
      const hasSwe = filters.countries.some(c => c.toUpperCase() === 'SWE');
      if (!hasSwe) {
        return { success: true, notices: [], totalCount: 0 };
      }
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
    console.error('[Magnit Service] Search failed:', err);
    return { success: false, notices: [], totalCount: 0, error: err.message };
  }
}

export async function getMagnitNoticeById(id) {
  const cleanId = id.replace(/^magnit-/i, '');
  const details = await fetchMagnitJobDetails(cleanId);
  if (!details) return null;

  return normalizeMagnitJob(details, details);
}
