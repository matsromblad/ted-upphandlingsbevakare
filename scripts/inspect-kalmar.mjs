async function checkCorrigenda() {
  const queries = [
    'FT ~ (558307-2026)',
    'FT ~ (SPF2026-060)',
    'notice-type = change AND organisation-name-buyer ~ (Specialfastigheter)',
    'notice-type = change AND FT ~ (Kalmar)',
    'organisation-name-buyer ~ (Specialfastigheter) AND publication-date >= 20260801'
  ];

  for (const q of queries) {
    console.log('\n----------------------------------------');
    console.log('Query:', q);
    const res = await fetch('https://api.ted.europa.eu/v3/notices/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: q,
        fields: ['publication-number', 'notice-title', 'publication-date', 'deadline-receipt-tender-date-lot', 'form-type', 'notice-type'],
        limit: 10,
        scope: 'ALL'
      })
    });
    const data = await res.json();
    console.log('Hits:', data.totalNoticeCount);
    for (const n of data.notices || []) {
      console.log(`- [${n['publication-number']}] (${n['publication-date']}) [Type: ${n['notice-type']}] [Form: ${n['form-type']}] [Deadline: ${JSON.stringify(n['deadline-receipt-tender-date-lot'])}] ${n['notice-title']?.swe || JSON.stringify(n['notice-title'])}`);
    }
  }
}

checkCorrigenda();
