function parseFieldTerms(field, input) {
  if (!input) return null;
  const rawArray = Array.isArray(input) ? input : [input];
  
  const allTerms = [];
  for (const raw of rawArray) {
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    
    // Check if expression contains AND / och / &&
    if (/\s+(?:AND|och|&&)\s+/i.test(trimmed) && !/\s+(?:OR|eller|\|\|)\s+|,/i.test(trimmed)) {
      const andParts = trimmed
        .split(/\s+(?:AND|och|&&)\s+/i)
        .map(s => s.trim().replace(/^['"]|['"]$/g, '').replace(/[()]/g, '').trim())
        .filter(Boolean);
      if (andParts.length === 1) {
        allTerms.push({ type: 'single', value: andParts[0] });
      } else if (andParts.length > 1) {
        allTerms.push({ type: 'and', values: andParts });
      }
      continue;
    }

    // Default: split by OR / eller / || / comma / newline
    const orParts = trimmed
      .split(/\s+(?:OR|eller|\|\|)\s+|,\s*|\n/i)
      .map(s => s.trim().replace(/^['"]|['"]$/g, '').replace(/[()]/g, '').trim())
      .filter(Boolean);

    if (orParts.length === 1) {
      allTerms.push({ type: 'single', value: orParts[0] });
    } else if (orParts.length > 1) {
      allTerms.push({ type: 'or', values: orParts });
    }
  }

  if (allTerms.length === 0) return null;

  const clauses = [];
  for (const item of allTerms) {
    if (item.type === 'single') {
      clauses.push(`${field} ~ (${item.value})`);
    } else if (item.type === 'and') {
      const inner = item.values.map(v => `${field} ~ (${v})`).join(' AND ');
      clauses.push(`(${inner})`);
    } else if (item.type === 'or') {
      const inner = item.values.map(v => `${field} ~ (${v})`).join(' OR ');
      clauses.push(`(${inner})`);
    }
  }

  if (clauses.length === 1) {
    return clauses[0];
  }
  return `(${clauses.join(' OR ')})`;
}

async function runLiveTest() {
  const tests = [
    { name: 'AI Search sample 1 (OR)', input: 'cybersäkerhet OR IT-säkerhet', field: 'FT' },
    { name: 'AI Search sample 2 (BIM keywords)', input: 'BIM OR BIM-samordning OR 3D-modellering', field: 'FT' },
    { name: 'Comma list', input: 'BIM, VDC, GIS', field: 'FT' },
    { name: 'Quotes with OR', input: '"Building Information Modeling" OR BIM', field: 'FT' },
    { name: 'AND keywords', input: 'BIM AND projektering', field: 'FT' },
    { name: 'Title keywords (OR)', input: 'BIM OR CAD', field: 'notice-title' }
  ];

  for (const t of tests) {
    const clause = parseFieldTerms(t.field, t.input);
    const fullQuery = `(buyer-country IN (SWE) OR place-of-performance IN (SWE)) AND ${clause} AND form-type = competition`;
    const res = await fetch('https://api.ted.europa.eu/v3/notices/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: fullQuery,
        fields: ['publication-number', 'notice-title'],
        limit: 3,
        scope: 'ACTIVE'
      })
    });
    const data = await res.json();
    console.log(`[${t.name}]`);
    console.log('  Clause:', clause);
    console.log('  Full Query:', fullQuery);
    console.log('  HTTP Status:', res.status, '| Total Active Notices:', data.totalNoticeCount, '| Error:', data.error || data.message || 'none');
    if (data.notices?.length) {
      console.log('  Sample hit:', data.notices[0]['notice-title']?.swe || data.notices[0]['notice-title']?.eng || JSON.stringify(data.notices[0]['notice-title']));
    }
    console.log('');
  }

  console.log('=== Testing MiniMax AI Smart Search + TED Search ===');
  const { naturalLanguageToFilters } = await import('../server/src/services/minimaxService.js');
  const { searchTedNotices, buildExpertQuery } = await import('../server/src/services/tedService.js');
  
  const aiResult = await naturalLanguageToFilters('Hitta upphandlingar om BIM och 3D-modellering i Sverige');
  console.log('AI Keywords generated:', aiResult.keywords);
  console.log('AI CPV generated:', aiResult.cpv);
  const tedQuery = buildExpertQuery(aiResult);
  console.log('Built TED Query:', tedQuery);
  const searchRes = await searchTedNotices(aiResult, { page: 1, limit: 5 });
  console.log('Total matches found by TED API:', searchRes.totalCount);
  for (const n of searchRes.notices || []) {
    console.log(`  - [${n.publicationNumber}] ${n.title} (Köpare: ${n.buyer})`);
  }
}

runLiveTest();
