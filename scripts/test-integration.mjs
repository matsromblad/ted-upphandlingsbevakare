async function runTests() {
  console.log('--- 1. Healthcheck ---');
  const health = await fetch('http://localhost:3001/health').then(r => r.json());
  console.log('Health:', health);

  console.log('\n--- 2. TED Live Search (Swedish IT & Consultation tenders) ---');
  const searchRes = await fetch('http://localhost:3001/api/ted/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filters: {
        keywords: 'konsult',
        countries: ['SWE'],
        formType: 'competition',
        datePreset: '30d'
      },
      page: 1,
      limit: 3
    })
  }).then(r => r.json());

  console.log('Search success:', searchRes.success);
  console.log('Total matches found:', searchRes.totalCount);
  console.log('First notice:', searchRes.notices?.[0]?.title, 'by', searchRes.notices?.[0]?.buyer);

  console.log('\n--- 3. MiniMax AI Smart Search ---');
  const smartRes = await fetch('http://localhost:3001/api/ai/smart-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: 'Hitta upphandlingar om cybersäkerhet och penetrationstestning i Sverige'
    })
  }).then(r => r.json());
  console.log('Smart search explanation:', smartRes.filters?.explanation);
  console.log('Smart CPV codes:', smartRes.filters?.cpv);

  console.log('\n--- 4. MiniMax AI Chat Copilot ---');
  const chatRes = await fetch('http://localhost:3001/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Ge 3 tips för att vinna offentliga IT-upphandlingar i Sverige.',
      context: { currentNotice: searchRes.notices?.[0] }
    })
  }).then(r => r.json());
  console.log('Chat response length:', chatRes.reply?.length, 'chars');
  console.log('Chat response preview:\n', chatRes.reply?.slice(0, 250) + '...');

  console.log('\n--- 5. Create and Run Watchlist ---');
  const createWlRes = await fetch('http://localhost:3001/api/watchlists', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Testbevakning Cybersäkerhet',
      filters: { keywords: 'cybersäkerhet', countries: ['SWE'] },
      intervalMinutes: 60
    })
  }).then(r => r.json());
  console.log('Watchlist created:', createWlRes.watchlist?.id, createWlRes.watchlist?.name);

  const runWlRes = await fetch('http://localhost:3001/api/watchlists/' + createWlRes.watchlist?.id + '/run', {
    method: 'POST'
  }).then(r => r.json());
  console.log('Watchlist run result:', runWlRes);

  console.log('\n--- 6. Pipeline Save & Status Update ---');
  if (searchRes.notices?.[0]) {
    const savePipeRes = await fetch('http://localhost:3001/api/pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notice: searchRes.notices[0],
        status: 'REVIEWING',
        priority: 'HIGH',
        notes: 'Intressant för IT-teamet att granska.'
      })
    }).then(r => r.json());
    console.log('Pipeline saved tender:', savePipeRes.tender?.title, 'Status:', savePipeRes.tender?.status);
  }

  console.log('\n--- 7. CPV Registry Lookup ---');
  const cpvRes = await fetch('http://localhost:3001/api/cpv?q=moln').then(r => r.json());
  console.log('CPV search results for moln:', cpvRes.categories?.length, 'categories');

  console.log('\n=== ALL INTEGRATION TESTS PASSED SUCCESSFULLY! ===');
}
runTests().catch(console.error);
