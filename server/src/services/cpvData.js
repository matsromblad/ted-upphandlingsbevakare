// Common Procurement Vocabulary (CPV) lookup dictionary with Swedish and English labels

export const CPV_CATEGORIES = [
  {
    code: '72000000',
    division: '72',
    nameSwe: 'IT-tjänster: konsultverksamhet, programvaruutveckling, Internet och stöd',
    nameEng: 'IT services: consulting, software development, Internet and support',
    icon: 'Terminal',
    keywords: ['moln', 'molntjänster', 'cloud', 'saas', 'konsult', 'utveckling', 'programmering', 'it', 'cyber', 'säkerhet', 'ai'],
    subcategories: [
      { code: '72200000', nameSwe: 'Programvaruprogrammering och konsulttjänster' },
      { code: '72220000', nameSwe: 'System- och teknikkonsulttjänster' },
      { code: '72240000', nameSwe: 'Systemanalys och programmeringstjänster' },
      { code: '72260000', nameSwe: 'Programvarurelaterade tjänster' },
      { code: '72300000', nameSwe: 'Datatjänster (drift, hosting, databas, molndrift)' },
      { code: '72400000', nameSwe: 'Internettjänster, webb och molntjänster' },
      { code: '72500000', nameSwe: 'Datortjänster (underhåll, support)' },
      { code: '72600000', nameSwe: 'Datorstödtjänster och konsultation' },
      { code: '72800000', nameSwe: 'Datarevision och testning' }
    ]
  },
  {
    code: '48000000',
    division: '48',
    nameSwe: 'Programvaror och informationssystem',
    nameEng: 'Software package and information systems',
    icon: 'Cpu',
    keywords: ['programvara', 'system', 'applikation', 'licens', 'erp', 'crm', 'moln', 'molnprogramvara'],
    subcategories: [
      { code: '48100000', nameSwe: 'Branschspecifik programvara' },
      { code: '48200000', nameSwe: 'Nätverksprogramvara' },
      { code: '48300000', nameSwe: 'Dokumenthantering och skapande av innehåll' },
      { code: '48400000', nameSwe: 'Programvara för affärstransaktioner och personell administration (ERP, CRM)' },
      { code: '48600000', nameSwe: 'Databas- och operativsystem' },
      { code: '48700000', nameSwe: 'Verktygsprogram och säkerhetsprogramvara' }
    ]
  },
  {
    code: '79000000',
    division: '79',
    nameSwe: 'Företagstjänster: lagstiftning, marknadsföring, rådgivning, rekrytering, tryckning och säkerhet',
    nameEng: 'Business services: law, marketing, consulting, recruitment, printing and security',
    icon: 'Briefcase',
    keywords: ['rådgivning', 'juridik', 'ekonomi', 'rekrytering', 'bemanning', 'revision', 'marknadsföring', 'säkerhet', 'konsult'],
    subcategories: [
      { code: '79100000', nameSwe: 'Juridiska tjänster' },
      { code: '79200000', nameSwe: 'Redovisnings-, revisions- och skattetjänster' },
      { code: '79300000', nameSwe: 'Marknadsundersökningar och opinionsmätningar' },
      { code: '79400000', nameSwe: 'Företags- och organisationsrådgivning samt närliggande tjänster' },
      { code: '79500000', nameSwe: 'Kontorsstödstjänster' },
      { code: '79600000', nameSwe: 'Rekrytering och förmedling av personal' },
      { code: '79700000', nameSwe: 'Undersöknings- och säkerhetstjänster' }
    ]
  },
  {
    code: '45000000',
    division: '45',
    nameSwe: 'Bygg- och anläggningsarbeten',
    nameEng: 'Construction work',
    icon: 'Hammer',
    keywords: ['bygg', 'entreprenad', 'anläggning', 'markarbete', 'renovering', 'vvs', 'elinstallation', 'ventilation'],
    subcategories: [
      { code: '45100000', nameSwe: 'Mark- och grundarbeten' },
      { code: '45200000', nameSwe: 'Byggnads- och anläggningsarbeten' },
      { code: '45300000', nameSwe: 'Installationsarbeten i byggnader (el, VVS, ventilation)' },
      { code: '45400000', nameSwe: 'Färdigställande av byggnader' },
      { code: '45500000', nameSwe: 'Uthyrning av bygg- och anläggningsmaskiner med förare' }
    ]
  },
  {
    code: '71000000',
    division: '71',
    nameSwe: 'Arkitekt-, bygg-, ingenjörs- och besiktningstjänster',
    nameEng: 'Architectural, construction, engineering and inspection services',
    icon: 'Compass',
    keywords: ['arkitekt', 'ingenjör', 'konstruktör', 'projektledning', 'besiktning', 'provning'],
    subcategories: [
      { code: '71200000', nameSwe: 'Arkitekttjänster' },
      { code: '71300000', nameSwe: 'Ingenjörstjänster' },
      { code: '71500000', nameSwe: 'Byggrelaterade tjänster (projektledning, kontroll)' },
      { code: '71600000', nameSwe: 'Teknisk provning, analys och konsultation' }
    ]
  },
  {
    code: '33000000',
    division: '33',
    nameSwe: 'Medicinsk utrustning, läkemedel och hygienartiklar',
    nameEng: 'Medical equipments, pharmaceuticals and personal care products',
    icon: 'Stethoscope',
    keywords: ['vård', 'sjukvård', 'medicin', 'medicinteknik', 'läkemedel', 'hygien', 'sjukhus'],
    subcategories: [
      { code: '33100000', nameSwe: 'Medicinsk utrustning och hjälpmedel' },
      { code: '33600000', nameSwe: 'Läkemedel' },
      { code: '33700000', nameSwe: 'Hygien- och kroppsvårdsartiklar' }
    ]
  },
  {
    code: '85000000',
    division: '85',
    nameSwe: 'Hälsovård och socialtjänst',
    nameEng: 'Health and social work services',
    icon: 'HeartPulse',
    keywords: ['hälsa', 'sjukvård', 'tandvård', 'hemtjänst', 'omsorg', 'äldreboende', 'socialtjänst'],
    subcategories: [
      { code: '85100000', nameSwe: 'Hälsovårdstjänster (läkartjänster, tandvård, sjukhus)' },
      { code: '85300000', nameSwe: 'Social omsorg, äldreboende, hemtjänst' }
    ]
  },
  {
    code: '80000000',
    division: '80',
    nameSwe: 'Utbildning och undervisning',
    nameEng: 'Education and training services',
    icon: 'GraduationCap',
    keywords: ['utbildning', 'kurs', 'skola', 'undervisning', 'kompetensutveckling', 'fortbildning'],
    subcategories: [
      { code: '80500000', nameSwe: 'Personalutbildning och fortbildning' },
      { code: '80400000', nameSwe: 'Vuxenutbildning' }
    ]
  },
  {
    code: '60000000',
    division: '60',
    nameSwe: 'Transporttjänster (utom avfallstransport)',
    nameEng: 'Transport services (excl. Waste transport)',
    icon: 'Truck',
    keywords: ['transport', 'buss', 'taxi', 'skolskjuts', 'frakt', 'logistik', 'flyg', 'färdtjänst'],
    subcategories: [
      { code: '60100000', nameSwe: 'Vägtransporter och persontransporter (taxi, buss, skolskjuts)' },
      { code: '60400000', nameSwe: 'Flygtransporttjänster' },
      { code: '60600000', nameSwe: 'Sjötransporttjänster' }
    ]
  },
  {
    code: '90000000',
    division: '90',
    nameSwe: 'Avlopps- och avfallshantering, renhållnings- och miljövårdstjänster',
    nameEng: 'Sewage, refuse, cleaning and environmental services',
    icon: 'Recycle',
    keywords: ['avfall', 'renhållning', 'städning', 'sanering', 'miljö', 'återvinning', 'avlopp'],
    subcategories: [
      { code: '90500000', nameSwe: 'Avfallshantering och återvinning' },
      { code: '90900000', nameSwe: 'Renhållnings- och städtjänster' }
    ]
  },
  {
    code: '30000000',
    division: '30',
    nameSwe: 'Kontorsmaskiner och datorutrustning',
    nameEng: 'Office and computing machinery, equipment and supplies',
    icon: 'Monitor',
    keywords: ['dator', 'hårdvara', 'server', 'skrivare', 'it-utrustning', 'kontorsmaterial'],
    subcategories: [
      { code: '30200000', nameSwe: 'Datorutrustning och tillbehör' },
      { code: '30100000', nameSwe: 'Kontorsmaskiner, utrustning och tillbehör' }
    ]
  },
  {
    code: '50000000',
    division: '50',
    nameSwe: 'Reparation och underhåll',
    nameEng: 'Repair and maintenance services',
    icon: 'Wrench',
    keywords: ['reparation', 'underhåll', 'service', 'fastighetsservice', 'drift'],
    subcategories: [
      { code: '50300000', nameSwe: 'Reparation och underhåll av persondatorer, kontorsutrustning' },
      { code: '50400000', nameSwe: 'Reparation och underhåll av medicinsk och precisionsutrustning' },
      { code: '50700000', nameSwe: 'Reparation och underhåll av fastighetsinstallationer' }
    ]
  }
];

// Helper to find CPV by code or keyword
export function searchCpv(query) {
  if (!query || typeof query !== 'string') return CPV_CATEGORIES;
  const q = query.toLowerCase().trim();

  const results = [];
  for (const cat of CPV_CATEGORIES) {
    const catMatch = cat.code.includes(q) ||
      cat.nameSwe.toLowerCase().includes(q) ||
      cat.nameEng.toLowerCase().includes(q) ||
      (cat.keywords && cat.keywords.some(k => k.toLowerCase().includes(q) || q.includes(k.toLowerCase())));

    const matchingSubs = cat.subcategories.filter(sub =>
      sub.code.includes(q) || sub.nameSwe.toLowerCase().includes(q)
    );

    if (catMatch || matchingSubs.length > 0) {
      results.push({
        ...cat,
        subcategories: matchingSubs.length > 0 ? matchingSubs : cat.subcategories
      });
    }
  }
  return results;
}

export function getCpvLabel(code) {
  if (!code) return '';
  const cleanCode = code.toString().padEnd(8, '0');
  
  for (const cat of CPV_CATEGORIES) {
    if (cat.code === cleanCode || cat.code.substring(0, 2) === cleanCode.substring(0, 2)) {
      const sub = cat.subcategories.find(s => s.code === cleanCode);
      if (sub) return sub.nameSwe;
      return cat.nameSwe;
    }
  }
  return `CPV: ${code}`;
}
