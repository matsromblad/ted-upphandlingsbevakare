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
  'submission-url-lot',
  'document-url-lot',
  'buyer-profile'
];

/**
 * Builds TED Expert Query string from structured filter parameters
 */
export function buildExpertQuery(filters = {}) {
  const parts = [];

  // Direct raw query overrides all
  if (filters.rawQuery && filters.rawQuery.trim()) {
    return filters.rawQuery.trim();
  }

  // Country filter
  if (filters.countries && filters.countries.length > 0) {
    const validCountries = filters.countries.filter(c => c && c.trim()).map(c => c.trim().toUpperCase());
    if (validCountries.length > 0) {
      parts.push(`place-of-performance IN (${validCountries.join(', ')})`);
    }
  } else if (!filters.allCountries) {
    // Default to Sweden if not specified
    parts.push('place-of-performance IN (SWE)');
  }

  // Keywords (Free text search)
  if (filters.keywords && filters.keywords.trim()) {
    const cleanKw = filters.keywords.trim().replace(/[()]/g, '');
    parts.push(`FT ~ (${cleanKw})`);
  }

  // Title keyword
  if (filters.titleKeyword && filters.titleKeyword.trim()) {
    const cleanTitle = filters.titleKeyword.trim().replace(/[()]/g, '');
    parts.push(`notice-title ~ (${cleanTitle})`);
  }

  // Buyer name
  if (filters.buyer && filters.buyer.trim()) {
    const cleanBuyer = filters.buyer.trim().replace(/[()]/g, '');
    parts.push(`organisation-name-buyer ~ (${cleanBuyer})`);
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
  } else if (filters.datePreset) {
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

  if (parts.length === 0) {
    return 'place-of-performance IN (SWE)';
  }

  return parts.join(' AND ');
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
  const rawDesc = notice['description-proc'];
  if (typeof rawDesc === 'string') {
    description = rawDesc;
  } else if (rawDesc && typeof rawDesc === 'object') {
    description = rawDesc.swe || rawDesc.eng || Object.values(rawDesc)[0] || '';
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

  // CPV codes
  const rawCpvs = notice['classification-cpv'] || [];
  const cpvList = Array.isArray(rawCpvs) ? rawCpvs : [rawCpvs];
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
      const dlDate = new Date(dlStr);
      if (!isNaN(dlDate.getTime())) {
        const now = new Date();
        const diffMs = dlDate.getTime() - now.getTime();
        daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (daysRemaining < 0) {
          deadlineStatus = 'EXPIRED';
        } else if (daysRemaining <= 7) {
          deadlineStatus = 'EXPIRING_SOON';
        } else {
          deadlineStatus = 'OPEN';
        }
      }
    }
  }

  // External Links
  const links = notice.links || {};
  const htmlLinks = links.html || {};
  const pdfLinks = links.pdf || {};

  const tedHtmlUrl = htmlLinks.SWE || htmlLinks.ENG || (htmlLinks && Object.values(htmlLinks)[0]) || `https://ted.europa.eu/sv/notice/-/detail/${pubNum}`;
  const tedPdfUrl = pdfLinks.SWE || pdfLinks.ENG || (pdfLinks && Object.values(pdfLinks)[0]) || `https://ted.europa.eu/sv/notice/${pubNum}/pdf`;
  
  const submissionUrl = notice['submission-url-lot'] || null;
  const documentUrl = notice['document-url-lot'] || null;
  const buyerProfile = notice['buyer-profile'] || null;

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
    links: {
      tedHtml: tedHtmlUrl,
      tedPdf: tedPdfUrl,
      submission: submissionUrl,
      documents: documentUrl,
      buyerProfile
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

  const payload = {
    query,
    fields: DEFAULT_FIELDS,
    limit,
    page,
    scope: 'ACTIVE',
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
    const normalized = rawNotices.map(normalizeNotice).filter(Boolean);

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
