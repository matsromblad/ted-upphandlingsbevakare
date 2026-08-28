import { getCpvLabel } from './cpvData.js';

const TED_API_URL = process.env.TED_API_URL || 'https://api.ted.europa.eu/v3/notices/search';

const DEFAULT_FIELDS = [
  'publication-number',
  'notice-title',
  'organisation-name-buyer',
  'organisation-country-buyer',
  'organisation-city-buyer',
  'classification-cpv',
  'deadline-receipt-tender-date-lot',
  'publication-date',
  'notice-type',
  'form-type',
  'place-of-performance-country-proc',
  'description-proc',
  'description-lot',
  'submission-url-lot',
  'document-url-lot',
  'document-url-part',
  'buyer-profile',
  'estimated-value-proc',
  'estimated-value-cur-proc',
  'estimated-value-lot',
  'estimated-value-cur-lot',
  'framework-estimated-value',
  'framework-estimated-value-cur',
  'framework-maximum-value-lot',
  'framework-maximum-value-cur-lot',
  'framework-maximum-value-glo',
  'framework-maximum-value-cur-glo',
  'total-value',
  'total-value-cur',
  'tender-value',
  'tender-value-cur'
];

/**
 * Parses free text / keyword input into proper TED Expert Query clauses.
 * Handles:
 *  - "term1 OR term2 OR term3" -> (field ~ (term1) OR field ~ (term2) OR field ~ (term3))
 *  - "term1, term2, term3"     -> (field ~ (term1) OR field ~ (term2) OR field ~ (term3))
 *  - "term1 AND term2"         -> (field ~ (term1) AND field ~ (term2))
 *  - ["term1", "term2"]        -> (field ~ (term1) OR field ~ (term2))
 *  - "\"phrase\" OR term"      -> (field ~ (phrase) OR field ~ (term))
 */
export function parseTextFieldQuery(field, input) {
  if (!input) return null;
  const rawArray = Array.isArray(input) ? input : [input];

  const allClauses = [];

  for (const raw of rawArray) {
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;

    // Check if expression uses explicit AND / och / && without OR / comma
    const hasOrOrComma = /\s+(?:OR|eller|\|\|)\s+|,/i.test(trimmed);
    const hasAnd = /\s+(?:AND|och|&&)\s+/i.test(trimmed);

    if (hasAnd && !hasOrOrComma) {
      const andParts = trimmed
        .split(/\s+(?:AND|och|&&)\s+/i)
        .map(s => s.trim().replace(/^['"]|['"]$/g, '').replace(/[()]/g, '').trim())
        .filter(Boolean);

      if (andParts.length === 1) {
        allClauses.push(`${field} ~ (${andParts[0]})`);
      } else if (andParts.length > 1) {
        const inner = andParts.map(v => `${field} ~ (${v})`).join(' AND ');
        allClauses.push(`(${inner})`);
      }
      continue;
    }

    // Default: split by OR / eller / || / comma / newline
    const orParts = trimmed
      .split(/\s+(?:OR|eller|\|\|)\s+|,\s*|\n/i)
      .map(s => s.trim().replace(/^['"]|['"]$/g, '').replace(/[()]/g, '').trim())
      .filter(Boolean);

    if (orParts.length === 1) {
      allClauses.push(`${field} ~ (${orParts[0]})`);
    } else if (orParts.length > 1) {
      const inner = orParts.map(v => `${field} ~ (${v})`).join(' OR ');
      allClauses.push(`(${inner})`);
    }
  }

  if (allClauses.length === 0) return null;
  if (allClauses.length === 1) {
    return allClauses[0];
  }
  return `(${allClauses.join(' OR ')})`;
}

/**
 * Helper to clean and extract first valid string URL
 */
function cleanUrl(val) {
  if (!val) return null;
  if (Array.isArray(val)) {
    const found = val.find(v => typeof v === 'string' && v.trim().length > 0);
    return found ? found.trim() : null;
  }
  if (typeof val === 'string' && val.trim().length > 0) {
    return val.trim();
  }
  return null;
}

/**
 * Identifies public procurement portal name from URL
 */
export function detectPortalName(url) {
  if (!url) return null;
  const u = url.toLowerCase();
  if (u.includes('tendsign.com')) return 'TendSign';
  if (u.includes('e-avrop.com')) return 'e-Avrop';
  if (u.includes('kommersannons.se') || u.includes('kommers')) return 'Kommers Annons';
  if (u.includes('clira.io') || u.includes('clira')) return 'Clira';
  if (u.includes('mercell.com')) return 'Mercell';
  if (u.includes('trafikverket.se')) return 'Trafikverket';
  if (u.includes('opic.com') || u.includes('visma')) return 'Visma / Opic';
  if (u.includes('upphandling24')) return 'Upphandling24';
  if (u.includes('magnit-source') || u.includes('magnitglobal') || u.includes('magnit')) return 'Magnit';
  if (u.includes('cloudia.fi')) return 'Cloudia';
  if (u.includes('doffin.no')) return 'Doffin';
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch (e) {
    return 'Extern portal';
  }
}

/**
 * Extracts number from value field (string, number, array)
 */
function extractNumber(val) {
  if (val === undefined || val === null || val === '') return null;
  if (Array.isArray(val)) {
    for (const item of val) {
      const num = extractNumber(item);
      if (num !== null) return num;
    }
    return null;
  }
  if (typeof val === 'number') return isNaN(val) ? null : val;
  if (typeof val === 'string') {
    const clean = val.replace(/[\s,]/g, '');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

/**
 * Extracts currency string
 */
function extractCurrency(val, defaultCur = 'SEK') {
  if (!val) return defaultCur;
  if (Array.isArray(val) && val.length > 0) return String(val[0]).trim();
  if (typeof val === 'string' && val.trim()) return val.trim();
  return defaultCur;
}

/**
 * Formats estimated value into readable Swedish currency representations
 */
export function formatEstimatedValue(amount, currency = 'SEK') {
  if (amount === null || amount === undefined || isNaN(amount)) return null;
  
  const numStr = Math.round(amount).toLocaleString('sv-SE');
  const full = `${numStr} ${currency}`;

  let humanized = '';
  if (amount >= 1_000_000) {
    const msek = amount / 1_000_000;
    const formattedMsek = msek % 1 === 0 ? msek.toFixed(0) : msek.toFixed(1).replace('.', ',');
    humanized = currency === 'SEK' ? `${formattedMsek} MSEK` : `${formattedMsek} M${currency}`;
  } else if (amount >= 1_000) {
    const ksek = amount / 1_000;
    const formattedKsek = ksek % 1 === 0 ? ksek.toFixed(0) : ksek.toFixed(0);
    humanized = currency === 'SEK' ? `${formattedKsek} kSEK` : `${formattedKsek} k${currency}`;
  }

  return {
    amount,
    currency,
    full,
    humanized: humanized || full,
    display: humanized ? `${full} (~${humanized})` : full
  };
}

/**
 * Builds TED Expert Query string from structured filter parameters
 */
export function buildExpertQuery(filters = {}) {
  const parts = [];

  // Direct raw query overrides all
  if (filters.rawQuery && filters.rawQuery.trim()) {
    return filters.rawQuery.trim();
  }

  // Automatic TED publication number detection (e.g., '489981-2026' or TED URLs)
  const rawKw = (typeof filters.keywords === 'string' ? filters.keywords : '').trim();
  const urlPubNumMatch = rawKw.match(/notice\/(?:-\/detail\/)?(\d{5,8})[-/](\d{4})/i);
  const directPubNumMatch = rawKw.match(/^(\d{5,8})[-/](\d{4})$/);
  const detectedPubNum = directPubNumMatch ? `${directPubNumMatch[1]}-${directPubNumMatch[2]}` : (urlPubNumMatch ? `${urlPubNumMatch[1]}-${urlPubNumMatch[2]}` : null);

  if (detectedPubNum) {
    return `publication-number = ${detectedPubNum}`;
  }

  // Country filter: Match either buyer-country or place-of-performance
  // Notice: eForms often set place-of-performance to 'anyw' or NUTS codes, so buyer-country is crucial!
  if (filters.countries && filters.countries.length > 0) {
    const validCountries = filters.countries.filter(c => c && c.trim()).map(c => c.trim().toUpperCase());
    if (validCountries.length > 0) {
      const countryList = validCountries.join(', ');
      parts.push(`(buyer-country IN (${countryList}) OR place-of-performance IN (${countryList}))`);
    }
  } else if (!filters.allCountries) {
    // Default to Sweden if not specified
    parts.push('(buyer-country IN (SWE) OR place-of-performance IN (SWE))');
  }

  // Keywords (Free text search)
  if (filters.keywords) {
    const kwClause = parseTextFieldQuery('FT', filters.keywords);
    if (kwClause) {
      parts.push(kwClause);
    }
  }

  // Title keyword
  if (filters.titleKeyword) {
    const titleClause = parseTextFieldQuery('notice-title', filters.titleKeyword);
    if (titleClause) {
      parts.push(titleClause);
    }
  }

  // Buyer name
  if (filters.buyer) {
    const buyerClause = parseTextFieldQuery('organisation-name-buyer', filters.buyer);
    if (buyerClause) {
      parts.push(buyerClause);
    }
  }

  // CPV codes
  if (filters.cpv && filters.cpv.length > 0) {
    const cleanCpvs = filters.cpv.filter(c => c && c.trim()).map(c => c.trim());
    if (cleanCpvs.length > 0) {
      parts.push(`classification-cpv IN (${cleanCpvs.join(', ')})`);
    }
  }

  // Form type (e.g. competition, planning, result)
  if (filters.formType && filters.formType !== 'ALL') {
    parts.push(`form-type = ${filters.formType}`);
  }

  // Publication date range
  if (filters.dateFrom) {
    // Format YYYYMMDD
    const dateStr = filters.dateFrom.replace(/[-]/g, '').substring(0, 8);
    parts.push(`publication-date >= ${dateStr}`);
  } else if (filters.datePreset && filters.datePreset !== 'all') {
    const now = new Date();
    let daysAgo = 30;
    if (filters.datePreset === '1d') daysAgo = 1;
    else if (filters.datePreset === '7d') daysAgo = 7;
    else if (filters.datePreset === '14d') daysAgo = 14;
    else if (filters.datePreset === '30d') daysAgo = 30;
    else if (filters.datePreset === '90d') daysAgo = 90;
    else if (filters.datePreset === '365d') daysAgo = 365;

    const targetDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const dateStr = targetDate.toISOString().slice(0, 10).replace(/-/g, '');
    parts.push(`publication-date >= ${dateStr}`);
  }

  // Active deadline filter: ensure only non-expired notices are returned when onlyActive is requested or when searching competitions
  const isCompetition = !filters.formType || filters.formType === 'competition';
  const shouldFilterOnlyActive = filters.onlyActive === true || (filters.onlyActive !== false && filters.includeExpired !== true && isCompetition);

  if (shouldFilterOnlyActive) {
    parts.push('deadline-receipt-tender-date-lot >= today(0)');
  }

  let finalQuery = parts.length > 0 ? parts.join(' AND ') : '(buyer-country IN (SWE) OR place-of-performance IN (SWE))';

  // Automatically add sort by publication-date DESC if not already present
  if (!finalQuery.includes('SORT BY') && !finalQuery.includes('publication-number =')) {
    finalQuery += ' SORT BY publication-date DESC';
  }

  return finalQuery;
}

export function parseTedDate(str) {
  if (!str) return null;
  const s = String(str).trim();
  if (!s) return null;

  // 1. Direct standard parse
  let d = new Date(s);
  if (!isNaN(d.getTime())) return d;

  // 2. Pattern: YYYY-MM-DD+HH:MM or YYYY-MM-DD-HH:MM or YYYY-MM-DDZ
  const tzMatch = s.match(/^(\d{4}-\d{2}-\d{2})([+-]\d{2}(?::?\d{2})?|Z)$/);
  if (tzMatch) {
    const isoWithTime = `${tzMatch[1]}T23:59:59${tzMatch[2]}`;
    d = new Date(isoWithTime);
    if (!isNaN(d.getTime())) return d;
  }

  // 3. Pattern: YYYY-MM-DD
  const plainMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (plainMatch) {
    d = new Date(`${plainMatch[1]}-${plainMatch[2]}-${plainMatch[3]}T23:59:59`);
    if (!isNaN(d.getTime())) return d;
  }

  // 4. Pattern: YYYYMMDD
  const compactMatch = s.match(/^(\d{4})(\d{2})(\d{2})/);
  if (compactMatch) {
    d = new Date(`${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}T23:59:59`);
    if (!isNaN(d.getTime())) return d;
  }

  // 5. Replace space with T
  d = new Date(s.replace(' ', 'T'));
  if (!isNaN(d.getTime())) return d;

  return null;
}

/**
 * Normalizes notice object from TED API response to clean structured format
 */
export function normalizeNotice(notice) {
  if (!notice) return null;

  const pubNum = notice['publication-number'] || '';

  // Extract multilingual title (SWE > ENG > First available)
  let title = 'Upphandling utan titel';
  const rawTitle = notice['notice-title'];
  if (typeof rawTitle === 'string') {
    title = rawTitle;
  } else if (rawTitle && typeof rawTitle === 'object') {
    title = rawTitle.swe || rawTitle.eng || Object.values(rawTitle)[0] || title;
  }

  // Extract description
  let description = '';
  const rawDesc = notice['description-proc'] || notice['description-lot'];
  if (typeof rawDesc === 'string') {
    description = rawDesc;
  } else if (rawDesc && typeof rawDesc === 'object') {
    const dVal = rawDesc.swe || rawDesc.eng || Object.values(rawDesc)[0] || '';
    if (Array.isArray(dVal)) {
      description = dVal.join('\n\n');
    } else if (typeof dVal === 'string') {
      description = dVal;
    }
  }

  // Extract buyer
  let buyerName = 'Okänd upphandlare';
  const rawBuyer = notice['organisation-name-buyer'];
  if (typeof rawBuyer === 'string') {
    buyerName = rawBuyer;
  } else if (rawBuyer && typeof rawBuyer === 'object') {
    const list = rawBuyer.swe || rawBuyer.eng || Object.values(rawBuyer)[0];
    if (Array.isArray(list) && list.length > 0) {
      buyerName = list.join(', ');
    } else if (typeof list === 'string') {
      buyerName = list;
    }
  }

  // City & Country
  let city = '';
  const rawCity = notice['organisation-city-buyer'];
  if (Array.isArray(rawCity)) city = rawCity.join(', ');
  else if (typeof rawCity === 'string') city = rawCity;

  let country = 'SWE';
  const rawCountry = notice['organisation-country-buyer'] || notice['place-of-performance-country-proc'];
  if (Array.isArray(rawCountry)) country = rawCountry[0];
  else if (typeof rawCountry === 'string') country = rawCountry;

  // CPV codes (deduplicated)
  const rawCpvs = notice['classification-cpv'] || [];
  const rawCpvArray = Array.isArray(rawCpvs) ? rawCpvs : [rawCpvs];
  const cpvList = [...new Set(rawCpvArray.map(c => typeof c === 'string' ? c.trim() : String(c)).filter(Boolean))];
  const cpvDetails = cpvList.map(code => ({
    code,
    label: getCpvLabel(code)
  }));

  // Dates
  const pubDateRaw = notice['publication-date'] || '';
  let publicationDate = pubDateRaw;
  if (pubDateRaw && pubDateRaw.length >= 8 && !pubDateRaw.includes('-')) {
    publicationDate = `${pubDateRaw.slice(0,4)}-${pubDateRaw.slice(4,6)}-${pubDateRaw.slice(6,8)}`;
  }

  // Deadline calculation
  const rawDeadline = notice['deadline-receipt-tender-date-lot'];
  let deadline = null;
  let deadlineStatus = 'UNKNOWN'; // OPEN, EXPIRING_SOON, EXPIRED
  let daysRemaining = null;

  if (rawDeadline) {
    const dlStr = Array.isArray(rawDeadline) ? rawDeadline[0] : rawDeadline;
    if (dlStr) {
      deadline = dlStr;
      const dlDate = parseTedDate(dlStr);
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
  }

  // Estimated Value & Contract Size
  const rawAmount = extractNumber(notice['estimated-value-proc']) ??
                    extractNumber(notice['estimated-value-lot']) ??
                    extractNumber(notice['total-value']) ??
                    extractNumber(notice['framework-maximum-value-lot']) ??
                    extractNumber(notice['framework-maximum-value-glo']) ??
                    extractNumber(notice['framework-estimated-value']) ??
                    extractNumber(notice['tender-value']);

  const rawCurrency = extractCurrency(notice['estimated-value-cur-proc']) ||
                      extractCurrency(notice['estimated-value-cur-lot']) ||
                      extractCurrency(notice['total-value-cur']) ||
                      extractCurrency(notice['framework-maximum-value-cur-lot']) ||
                      extractCurrency(notice['framework-maximum-value-cur-glo']) ||
                      (country === 'SWE' ? 'SEK' : 'EUR');

  const valueFormattedObj = formatEstimatedValue(rawAmount, rawCurrency);
  const estimatedValue = valueFormattedObj ? valueFormattedObj.full : '';
  const estimatedValueAmount = valueFormattedObj ? valueFormattedObj.amount : null;
  const estimatedValueCurrency = valueFormattedObj ? valueFormattedObj.currency : rawCurrency;
  const estimatedValueFormatted = valueFormattedObj ? valueFormattedObj.humanized : '';
  const estimatedValueDisplay = valueFormattedObj ? valueFormattedObj.display : '';

  // External URLs & Portal Detection
  const submissionUrl = cleanUrl(notice['submission-url-lot']);
  const documentUrl = cleanUrl(notice['document-url-lot']) || cleanUrl(notice['document-url-part']);
  const buyerProfile = cleanUrl(notice['buyer-profile']);

  const portalName = detectPortalName(submissionUrl) || detectPortalName(documentUrl) || (buyerProfile ? detectPortalName(buyerProfile) : null);

  // TED Official URLs (HTML and PDF)
  const links = notice.links || {};
  const htmlLinks = links.html || {};
  const pdfLinks = links.pdf || {};

  const tedHtmlUrl = htmlLinks.SWE || htmlLinks.ENG || (htmlLinks && Object.values(htmlLinks)[0]) || `https://ted.europa.eu/sv/notice/-/detail/${pubNum}`;
  const tedPdfUrl = pdfLinks.SWE || pdfLinks.ENG || (pdfLinks && Object.values(pdfLinks)[0]) || `https://ted.europa.eu/sv/notice/${pubNum}/pdf`;

  const formType = notice['form-type'] || notice['notice-type'] || 'competition';

  return {
    id: pubNum,
    publicationNumber: pubNum,
    title,
    description,
    buyer: buyerName,
    city,
    country,
    cpvList,
    cpvDetails,
    publicationDate,
    deadline,
    daysRemaining,
    deadlineStatus,
    formType,
    estimatedValue,
    estimatedValueAmount,
    estimatedValueCurrency,
    estimatedValueFormatted,
    estimatedValueDisplay,
    portalName,
    links: {
      tedHtml: tedHtmlUrl,
      tedPdf: tedPdfUrl,
      submission: submissionUrl,
      documents: documentUrl,
      buyerProfile,
      portalName
    },
    raw: notice
  };
}

/**
 * Searches TED Notices using Expert Search API v3
 */
export async function searchTedNotices(filters = {}, pagination = { page: 1, limit: 20 }) {
  const query = buildExpertQuery(filters);
  const page = Math.max(1, parseInt(pagination.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(pagination.limit) || 20));

  // If query is a direct publication number search, default scope to ALL so historical notices are found
  const isDirectIdSearch = query.startsWith('publication-number =');
  const scope = filters.scope || (isDirectIdSearch ? 'ALL' : 'ACTIVE');

  const payload = {
    query,
    fields: DEFAULT_FIELDS,
    limit,
    page,
    scope,
    paginationMode: 'PAGE_NUMBER'
  };

  try {
    const response = await fetch(TED_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TED API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.message || JSON.stringify(data.error));
    }

    const rawNotices = data.notices || [];
    let normalized = rawNotices.map(normalizeNotice).filter(Boolean);

    const isCompetition = !filters.formType || filters.formType === 'competition';
    const shouldFilterOnlyActive = filters.onlyActive === true || (filters.onlyActive !== false && filters.includeExpired !== true && isCompetition);

    if (shouldFilterOnlyActive) {
      normalized = normalized.filter(n => n.deadlineStatus !== 'EXPIRED');
    }

    return {
      success: true,
      query,
      totalCount: data.totalNoticeCount || 0,
      page,
      limit,
      totalPages: Math.ceil((data.totalNoticeCount || 0) / limit),
      notices: normalized
    };
  } catch (error) {
    console.error('Error searching TED API:', error);
    return {
      success: false,
      query,
      totalCount: 0,
      page,
      limit,
      totalPages: 0,
      notices: [],
      error: error.message
    };
  }
}

/**
 * Fetch a single notice by publication number
 */
export async function getNoticeById(publicationNumber) {
  const query = `publication-number = ${publicationNumber}`;
  const payload = {
    query,
    fields: DEFAULT_FIELDS,
    limit: 1,
    scope: 'ALL',
    paginationMode: 'PAGE_NUMBER'
  };

  try {
    const response = await fetch(TED_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (data.notices && data.notices.length > 0) {
      return normalizeNotice(data.notices[0]);
    }
    return null;
  } catch (e) {
    console.error(`Error fetching notice ${publicationNumber}:`, e);
    return null;
  }
}
