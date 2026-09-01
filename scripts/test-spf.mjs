async function test() {
  const queries = [
    'organisation-name-buyer ~ (Specialfastigheter)',
    'FT ~ (Specialfastigheter)',
    'organisation-name-buyer ~ (Specialfastigheter Sverige)'
  ];

  for (const q of queries) {
    console.log('\n=============================================');
    console.log('Query:', q);
    for (const scope of ['ACTIVE', 'ALL']) {
      const res = await fetch('https://api.ted.europa.eu/v3/notices/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          fields: ['publication-number', 'notice-title', 'publication-date', 'deadline-receipt-tender-date-lot', 'form-type', 'notice-type', 'organisation-name-buyer'],
          limit: 15,
          scope: scope
        })
      });
      const data = await res.json();
      console.log(`\n--- SCOPE: ${scope} --- Total notice count: ${data.totalNoticeCount}`);
      for (const n of data.notices || []) {
        const title = n['notice-title']?.swe || n['notice-title']?.eng || JSON.stringify(n['notice-title']);
        const formType = n['form-type'];
        const pubDate = n['publication-date'];
        const deadline = n['deadline-receipt-tender-date-lot'];
        const num = n['publication-number'];
        const buyer = n['organisation-name-buyer'];
        console.log(`- [${num}] [${pubDate}] [${formType}] [Deadline: ${JSON.stringify(deadline)}] Buyer: ${JSON.stringify(buyer)} -> ${title}`);
      }
    }
  }
}

test();
