import { searchTedNotices, buildExpertQuery } from '../server/src/services/tedService.js';

async function run() {
  const tests = [
    { label: 'Default: keyword "Specialfastigheter", onlyActive: true, formType: "competition"', filters: { keywords: 'Specialfastigheter', countries: ['SWE'], formType: 'competition', onlyActive: true } },
    { label: 'Buyer field "Specialfastigheter", onlyActive: true, formType: "competition"', filters: { buyer: 'Specialfastigheter', countries: ['SWE'], formType: 'competition', onlyActive: true } },
    { label: 'Buyer "Specialfastigheter", onlyActive: false, formType: "competition"', filters: { buyer: 'Specialfastigheter', countries: ['SWE'], formType: 'competition', onlyActive: false, includeExpired: true } },
    { label: 'Buyer "Specialfastigheter", onlyActive: false, formType: "ALL"', filters: { buyer: 'Specialfastigheter', countries: ['SWE'], formType: 'ALL', onlyActive: false, includeExpired: true } },
    { label: 'Keyword "Specialfastigheter", onlyActive: false, formType: "ALL"', filters: { keywords: 'Specialfastigheter', countries: ['SWE'], formType: 'ALL', onlyActive: false, includeExpired: true } },
  ];

  for (const t of tests) {
    console.log('\n======================================================');
    console.log(t.label);
    const q = buildExpertQuery(t.filters);
    console.log('Query:', q);
    try {
      const res = await searchTedNotices(t.filters, { page: 1, limit: 10 });
      console.log(`Total Count: ${res.totalCount}`);
      for (const n of res.notices.slice(0, 5)) {
        console.log(`  - [${n.publicationNumber}] ${n.title} (Pub: ${n.publicationDate}, Deadline: ${n.deadline}) [${n.formType}]`);
      }
    } catch (err) {
      console.error('Error:', err);
    }
  }
}

run();
