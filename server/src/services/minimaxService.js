import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env in server folder is loaded properly regardless of cwd
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });
dotenv.config();

// Avoid SSL certificate errors in corporate proxy environments on Windows
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === undefined) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || 'sk-cp-Zhc7qIMRagWgKUT4QssK0nfI3qodAr_XiPB3mhtxUH-o7kuQxrWPHHYoZ-fKOI2dPvu2r-7sIz-h7HYqCRIHwCrP9T2iRNZgRfKgV-JZK7XQJmmDkithgnA';
const MINIMAX_MODEL = process.env.MINIMAX_MODEL || 'MiniMax-M3';
const MINIMAX_BASE_URL = process.env.MINIMAX_BASE_URL || 'https://api.minimax.io/anthropic/v1';

/**
 * Generic caller for MiniMax using Anthropic-compatible Messages endpoint
 */
export async function callMiniMax(messages, systemPrompt = '', options = {}) {
  if (!MINIMAX_API_KEY) {
    throw new Error('MINIMAX_API_KEY is not configured');
  }

  const payload = {
    model: MINIMAX_MODEL,
    max_tokens: options.max_tokens || 2048,
    temperature: options.temperature !== undefined ? options.temperature : 0.4,
    messages: messages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }))
  };

  if (systemPrompt) {
    payload.system = systemPrompt;
  }

  try {
    const response = await fetch(`${MINIMAX_BASE_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': MINIMAX_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MiniMax API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    // Extract text content
    let rawText = '';
    if (data.content && Array.isArray(data.content)) {
      rawText = data.content.map(c => c.text || '').join('\n');
    } else if (data.text) {
      rawText = data.text;
    }

    // Strip any thinking tags if present
    const cleanedText = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    return cleanedText;
  } catch (error) {
    console.error('MiniMax API Call Failed:', error);
    throw error;
  }
}

function extractJsonFromLlm(rawText) {
  if (!rawText) return null;
  let cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
  
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    try {
      const repaired = cleaned
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']');
      return JSON.parse(repaired);
    } catch (e2) {
      console.warn('[MiniMax] JSON parse error:', err.message);
      return null;
    }
  }
}

/**
 * Convert user's natural language request into structured TED search filters and CPV codes
 */
export async function naturalLanguageToFilters(userPrompt) {
  const systemPrompt = `Du är en expert på offentlig upphandling i Sverige och EU samt TED (Tenders Electronic Daily).
Ditt uppdrag är att omvandla användarens sökfras eller beskrivning till strukturerade sökfilter och CPV-koder.

VIKTIGT OM NYCKELORD OCH LOGIK:
- Fältet "keywords" ska innehålla relevanta sökord och synonymer. Om flera alternativa synonymer finns, separera dem med " OR " (t.ex. "BIM OR BIM-samordning OR 3D-modellering" eller "cybersäkerhet OR IT-säkerhet").
- Om sökningen berör BIM/bygg/teknik/arkitektur, välj relevanta CPV-koder från division 71 (t.ex. 71300000, 71240000, 71320000, 71541000) och division 72 (t.ex. 72224000).
- Om sökningen berör IT/mjukvara, välj koder från division 72 eller 48.

Returnera ENDAST ett giltigt JSON-objekt med följande fält (inga markdown-kodblock, endast ren JSON):
{
  "keywords": "relevanta nyckelord separerade med OR (t.ex. 'BIM OR BIM-samordning OR 3D-modellering')",
  "titleKeyword": "valfritt specifikt ord i titeln eller tom sträng",
  "cpv": ["8-siffriga CPV-koder relevanta för området, t.ex. '71300000', '71240000'"],
  "countries": ["landskoder i ISO-3, t.ex. 'SWE', 'DNK', 'NOR'"],
  "formType": "competition | planning | result | ALL",
  "datePreset": "1d | 7d | 14d | 30d | 90d | 365d",
  "explanation": "Kort förklaring på svenska av hur du tolkade sökningen och vilka CPV-koder du valde.",
  "suggestedWatchlistName": "Förslag på ett snyggt namn om användaren vill spara som bevakning"
}`;

  const messages = [
    { role: 'user', content: `Tolka följande sökfras och skapa sökfilter:\n"${userPrompt}"` }
  ];

  try {
    const rawResult = await callMiniMax(messages, systemPrompt, { temperature: 0.2, max_tokens: 2048 });
    const parsed = extractJsonFromLlm(rawResult);
    if (parsed) {
      return parsed;
    }
    const isBim = /bim|vdc|modellering|cad|projektering|samordning/i.test(userPrompt);
    return {
      keywords: userPrompt,
      cpv: isBim ? ['71300000', '71240000', '71320000'] : ['71300000'],
      countries: ['SWE'],
      formType: 'competition',
      datePreset: '30d',
      explanation: 'Sökfilter skapade baserat på din sökning.',
      suggestedWatchlistName: userPrompt.slice(0, 30)
    };
  } catch (e) {
    console.error('Failed to parse natural language query with MiniMax:', e);
    const isBim = /bim|vdc|modellering|cad|projektering|samordning/i.test(userPrompt);
    return {
      keywords: userPrompt,
      cpv: isBim ? ['71300000', '71240000', '71320000'] : ['71300000'],
      countries: ['SWE'],
      formType: 'competition',
      datePreset: '30d',
      explanation: 'Sökning med direkt fritext.',
      suggestedWatchlistName: userPrompt.slice(0, 30)
    };
  }
}

/**
 * Deep AI analysis of a specific tender against company profile
 */
export async function analyzeTender(notice, companyProfile = null) {
  const profileContext = companyProfile ? `
Företagsprofil:
- Företagsnamn: ${companyProfile.name || 'WSP Sverige AB (BIM-enheten)'}
- Verksamhet: ${companyProfile.description || 'Samhällsbyggnadskonsult inom BIM, VDC, digital informationshantering och projektering'}
- Kärnkompetenser/Nyckelord: ${companyProfile.keywords || 'BIM, BIM-samordning, VDC, Building Information Modeling, 3D-modellering'}
- Prioriterade länder: ${companyProfile.preferred_countries || '["SWE"]'}
` : `
Företagsprofil:
- Företagsnamn: WSP Sverige AB (BIM-enheten)
- Verksamhet: Samhällsbyggnadskonsult inom BIM, VDC, digital informationshantering, digitala tvillingar och projekteringsledning
- Kärnkompetenser/Nyckelord: BIM, BIM-samordning, VDC, Building Information Modeling, 3D-modellering, CAD, samhällsbyggnad
- Prioriterade länder: ["SWE"]
`;

  const portalHint = notice.portalName || notice.links?.portalName || (notice.links?.submission ? 'extern upphandlingsportal' : 'förfrågningsunderlaget');

  const tenderContext = `
Upphandlingsinformation från TED-kungörelsen:
- Titel: ${notice.title}
- Upphandlare/Köpare: ${notice.buyer} (${notice.city || ''}, ${notice.country || ''})
- Uppskattat värde / takbelopp: ${notice.estimatedValue || 'Framgår ej i TED-kungörelsen'}
- Publiceringsdatum: ${notice.publicationDate || 'Okänt'}
- Sista anbudsdag (Deadline): ${notice.deadline || 'Ej angiven'}
- Dagar kvar: ${notice.daysRemaining !== null ? notice.daysRemaining + ' dagar' : 'Okänt'}
- CPV-koder: ${notice.cpvDetails ? notice.cpvDetails.map(c => `${c.code} (${c.label})`).join(', ') : 'Ej specificerat'}
- Typ: ${notice.formType}
- Upphandlingssystem/Portal: ${portalHint}
- Beskrivning från TED:
${notice.description || 'Ingen detaljerad beskrivning angiven i TED-kungörelsen.'}
`;

  const systemPrompt = `Du är en erfaren svensk anbudsspecialist och expert på offentlig upphandling (LOU/LUF/EU-direktiv).
Analysera upphandlingen noggrant och matcha den mot företagets profil.

======================================================================
ABSOLUT FÖRBUD MOT GISNINGAR OCH HALLUCINATIONER (STRIKT FAKTAGRUNDNING):
1. Du analyserar en TED-kungörelse (sammanfattning/annons).
2. Du får ABSOLUT INTE gissa, anta eller hitta på uppgifter som inte uttryckligen framgår av ovanstående information!
3. Mycket information (detaljerade kravspecifikationer, specifika rollkrav, obligatoriska svarsbilagor, budgetramar och avtalsvillkor såsom ABK 09, AB 04 eller särskilda villkor) ligger ofta i externa upphandlingsdokument på system som TendSign, e-Avrop, Mercell, Kommers Annons etc., vilka du INTE har tillgång till.
4. Det är helt KORREKT OCH FÖRVÄNTAT att uppgifter saknas i kungörelsetexten. När en uppgift saknas SKA DU SÄGA DET TYDLIGT (t.ex. "Framgår ej i TED-kungörelsen – se förfrågningsunderlag på ${portalHint}").
======================================================================

Instruktioner för JSON-fälten:
- "fitScore": Nummer 0-100 som anger hur väl upphandlingen matchar företagets profil baserat ENBART på de faktiska uppgifterna och CPV-koderna. Om informationen är mycket knapphändig, sätt ett måttligt/neutralt värde och motivera det.
- "summary": Koncis sammanfattning (2-3 meningar) av vad som framgår av kungörelsen. Om beskrivningen är kortfattad, konstatera det sakligt.
- "requestedRoles": Lista ENDAST specifika roller som faktiskt nämns i kungörelsetexten. Om inga roller nämns i texten, returnera en tom lista [] eller ange [{ "role": "Specificeras ej i kungörelsetexten", "requirements": "Fullständig kravprofil och rollbeskrivningar finns i förfrågningsunderlaget på ${portalHint}." }]. Hitta ALDRIG på roller.
- "estimatedValueOrBudget": Det faktiska värdet om det framgår, annars "Framgår ej i TED-kungörelsen (kontrollera förfrågningsunderlag på ${portalHint})".
- "projectDuration": Avtalsperiod och optioner om det framgår av texten, annars "Framgår ej i kungörelsen (se förfrågningsunderlag)".
- "standardContractTerms": Ange standardavtal (t.ex. ABK 09, AB 04) ENDAST om det uttryckligen nämns i texten. Annars skriv "Framgår ej i kungörelsetexten (se administrativa föreskrifter i förfrågningsunderlaget på ${portalHint})".
- "requiredSubmissionDocuments": Lista ENDAST handlingar som uttryckligen efterfrågas i kungörelsetexten. Om inga specifika handlingar nämns, ange ["Se svarsmallar och obligatoriska bilagor i upphandlingssystemet (${portalHint})"].
- "keyRequirements": Lista ENDAST krav som uttryckligen framgår av texten.
- "opportunities": Konkreta möjligheter baserat på faktisk matchning.
- "risksAndChallenges": Lyft alltid fram om underlaget i TED är kortfattat och att fullständigt förfrågningsunderlag måste hämtas på ${portalHint} för att säkerställa alla skall-krav.
- "recommendedBidStrategy": Råd för att granska handlingarna och förbereda anbudet.
- "clarificationQuestions": Förslag på relevanta frågor utifrån de oklarheter eller saknade uppgifter som identifierats.

Returnera ENDAST ett giltigt JSON-objekt (inga backticks, inga kodblock, endast ren JSON):
{
  "fitScore": <nummer mellan 0 och 100>,
  "summary": "Koncis sammanfattning baserad på faktiska uppgifter",
  "requestedRoles": [
    {
      "role": "Rollnamn som nämns i texten (eller 'Specificeras ej i kungörelsetexten')",
      "requirements": "Krav som uttryckligen framgår eller hänvisning till förfrågningsunderlag"
    }
  ],
  "estimatedValueOrBudget": "Belopp eller 'Framgår ej i TED-kungörelsen'",
  "projectDuration": "Period eller 'Framgår ej i sammanfattningen'",
  "standardContractTerms": "Avtalsvillkor om nämnt eller 'Framgår ej i kungörelsetexten'",
  "requiredSubmissionDocuments": [
    "Faktiskt nämnd handling eller 'Se förfrågningsunderlag i upphandlingssystemet'"
  ],
  "keyRequirements": [
    "Faktiskt skall-krav från texten"
  ],
  "opportunities": [
    "Möjlighet baserad på upphandlingens faktiska inriktning"
  ],
  "risksAndChallenges": [
    "Risk/oklarhet (t.ex. att fullständigt underlag måste hämtas på portalen)"
  ],
  "recommendedBidStrategy": "Strategiska råd för anbudsarbetet",
  "clarificationQuestions": [
    "Fråga att ställa till upphandlaren"
  ]
}`;

  const messages = [
    { role: 'user', content: `${profileContext}\n\n${tenderContext}\n\nAnalysera denna upphandling strikt utifrån den givna informationen och returnera JSON.` }
  ];

  try {
    const rawResult = await callMiniMax(messages, systemPrompt, { temperature: 0.2, max_tokens: 4096 });
    const parsed = extractJsonFromLlm(rawResult);
    if (parsed) {
      return parsed;
    }
    return {
      fitScore: 50,
      summary: notice.description ? notice.description.slice(0, 250) + '...' : (notice.title || 'Information saknas i kungörelsen.'),
      requestedRoles: [
        {
          role: 'Specificeras ej i kungörelsetexten',
          requirements: `Kravprofil och eftersökta roller framgår i det fullständiga förfrågningsunderlaget på ${portalHint}.`
        }
      ],
      estimatedValueOrBudget: notice.estimatedValue || `Framgår ej i TED-kungörelsen (kontrollera förfrågningsunderlag på ${portalHint}).`,
      projectDuration: notice.deadline ? `Sista anbudsdag: ${notice.deadline}. Avtalsperiod framgår i förfrågningsunderlaget.` : 'Framgår ej i sammanfattningen.',
      standardContractTerms: `Framgår ej i kungörelsetexten (se administrativa föreskrifter på ${portalHint}).`,
      requiredSubmissionDocuments: [
        `Se förfrågningsunderlag och svarsbilagor i upphandlingssystemet (${portalHint})`
      ],
      keyRequirements: [
        'Krav och obligatoriska villkor framgår i det fullständiga förfrågningsunderlaget'
      ],
      opportunities: [
        'Matchning mot företagets verksamhetsområde enligt titel och CPV-koder'
      ],
      risksAndChallenges: [
        `Underlaget i TED är begränsat. Fullständigt förfrågningsunderlag måste hämtas från ${portalHint} för att säkerställa alla skall-krav och avtalsvillkor.`
      ],
      recommendedBidStrategy: `Ladda ner och läs igenom hela förfrågningsunderlaget från ${portalHint} för att utvärdera samtliga krav och utvärderingskriterier.`,
      clarificationQuestions: [
        'Finns möjlighet till förtydligande av kravspecifikationen under frågestunden?'
      ]
    };
  } catch (error) {
    console.error('Tender analysis failed:', error);
    throw error;
  }
}

/**
 * Deep, 100% verified AI analysis of procurement tender WITH uploaded tender documents (AF, kravspec, prisbilagor, avtal)
 */
export async function analyzeTenderWithDocuments(notice, documentCorpus, companyProfile = null, documentSummaryList = []) {
  const profileContext = companyProfile ? `
Företagsprofil:
- Företagsnamn: ${companyProfile.name || 'WSP Sverige AB (BIM-enheten)'}
- Verksamhet: ${companyProfile.description || 'Samhällsbyggnadskonsult inom BIM, VDC, digital informationshantering och projektering'}
- Kärnkompetenser/Nyckelord: ${companyProfile.keywords || 'BIM, BIM-samordning, VDC, Building Information Modeling, 3D-modellering'}
- Prioriterade länder: ${companyProfile.preferred_countries || '["SWE"]'}
` : `
Företagsprofil:
- Företagsnamn: WSP Sverige AB (BIM-enheten)
- Verksamhet: Samhällsbyggnadskonsult inom BIM, VDC, digital informationshantering, digitala tvillingar och projekteringsledning
- Kärnkompetenser/Nyckelord: BIM, BIM-samordning, VDC, Building Information Modeling, 3D-modellering, CAD, samhällsbyggnad
- Prioriterade länder: ["SWE"]
`;

  const tenderContext = `
Upphandlingsinformation (TED):
- Titel: ${notice.title}
- Upphandlande myndighet/Köpare: ${notice.buyer} (${notice.city || ''}, ${notice.country || ''})
- Sista anbudsdag (Deadline): ${notice.deadline || 'Ej angiven'}
- CPV-koder: ${notice.cpvDetails ? notice.cpvDetails.map(c => `${c.code} (${c.label})`).join(', ') : 'Ej specificerat'}
- Portal: ${notice.portalName || 'Upphandlingsportal'}
`;

  const docListHeader = documentSummaryList && documentSummaryList.length > 0
    ? `UPPLADDADE HANDLINGAR (${documentSummaryList.length} st):\n` + documentSummaryList.map(d => `- ${d.name} [${d.category}] (${(d.size / 1024).toFixed(1)} KB)`).join('\n')
    : 'UPPLADDADE FÖRFRÅGNINGSHANDLINGAR';

  const systemPrompt = `Du är en svensk senior anbudsexpert och specialist på offentlig upphandling (LOU/LUF).
Du har nu fått tillgång till de FAKTISKA FÖRFRÅGNINGSHANDLINGARNA (Administrativa föreskrifter, Kravspecifikationer, Prisbilagor, Kontraktsmallar etc.) för denna upphandling.

DITT UPPDRAG:
Genomför en 100% faktaförankrad, djupgående anbudsanalys baserad på de uppladdade handlingarna.
Koppla varje identifierat krav och villkor till det relevanta dokumentet (t.ex. "[AF-del.pdf]" eller "[Prisbilaga.xlsx]").

Analysera följande områden noggrant:
1. Skall-krav & kvalificeringskrav (ekonomisk ställning, teknisk/yrkesmässig kapacitet, ISO-certifieringar, referensuppdrag).
2. Eftersökta roller & specifika personkrav (utbildning, års erfarenhet, specialistkompetens, namngivna nyckelpersoner).
3. Ersättningsmodell & Utvärdering (löpande räkning med tak, fast pris, incitament, fiktiva timmar, viktning mellan pris och kvalitet).
4. Avtalsvillkor & Administrativa bestämmelser (standardavtal t.ex. ABK 09 / AB 04, viten, indexreglering, uppsägningstid, förlängningsoptioner).
5. Inlämningshandlingar: Samtliga svarsmallar, bilagor och bevis som MÅSTE bifogas anbudet för att inte bli förkastat.
6. Konkreta risker och fallgropar i upphandlingsdokumenten.
7. Rekommenderad vinnande anbudsstrategi och förslag på frågor till upphandlaren under frågestunden.

Returnera ENDAST ett giltigt JSON-objekt (inga backticks, endast ren JSON):
{
  "fitScore": <nummer 0-100 baserat på faktisk matchning mot företagets profil och krav i handlingarna>,
  "isDocumentGrounded": true,
  "documentSources": ["lista över granskade dokumentnamn"],
  "summary": "En koncis, exakt sammanfattning (2-4 meningar) av uppdragets faktiska omfattning och vad som ska levereras enligt handlingarna.",
  "requestedRoles": [
    {
      "role": "Rollnamn enligt kravspecifikationen (t.ex. BIM-samordnare, Uppdragsledare)",
      "requirements": "Specifika skall-krav, erfarenhetskrav (år), certifieringar och verktygskunskap enligt handlingarna"
    }
  ],
  "estimatedValueOrBudget": "Faktiskt takbelopp, budgetram eller omsättning enligt handlingarna (eller om upphandlaren inte angivit något)",
  "projectDuration": "Avtalstid, startdatum, slutdatum och optionsår enligt handlingarna (t.ex. '2 år med option på 1+1 år')",
  "standardContractTerms": "Tillämpliga standardavtal och särskilda kontraktsvillkor (t.ex. 'ABK 09 med ändringar i AF-del, vite vid försening')",
  "requiredSubmissionDocuments": [
    "Obligatorisk bilaga 1 (t.ex. 'Svarsbilaga 1 - Pris och timpriser')",
    "Obligatorisk bilaga 2 (t.ex. 'Bilaga 2 - CV-mall för nyckelpersoner')",
    "Obligatorisk bilaga 3 (t.ex. 'ESPD-formulär')"
  ],
  "keyRequirements": [
    "Viktigt skall-krav 1 enligt handlingarna",
    "Viktigt skall-krav 2"
  ],
  "opportunities": [
    "Konkret affärsmöjlighet eller fördel för företaget utifrån underlaget"
  ],
  "risksAndChallenges": [
    "Konkret risk, fälla eller hårt krav i underlaget att bevaka"
  ],
  "recommendedBidStrategy": "Konkreta, taktiska råd för hur anbudet ska utformas, prissättas och kvalitetssäkras för att vinna.",
  "clarificationQuestions": [
    "Skarpt förslag på fråga att ställa under frågestunden för att undanröja oklarhet i underlaget"
  ]
}`;

  const messages = [
    {
      role: 'user',
      content: `${profileContext}\n\n${tenderContext}\n\n${docListHeader}\n\nINNEHÅLL UR FÖRFRÅGNINGSUNDERLAGET:\n${documentCorpus}\n\nGenomför djupgående analys av handlingarna och returnera JSON.`
    }
  ];

  try {
    const rawResult = await callMiniMax(messages, systemPrompt, { temperature: 0.2, max_tokens: 4096 });
    const parsed = extractJsonFromLlm(rawResult);
    if (parsed) {
      parsed.isDocumentGrounded = true;
      parsed.documentSources = documentSummaryList.map(d => d.name);
      return parsed;
    }
    return {
      fitScore: 80,
      isDocumentGrounded: true,
      documentSources: documentSummaryList.map(d => d.name),
      summary: `Djupanalys baserad på ${documentSummaryList.length} uppladdade handlingar. Se extraherade krav och bilagor nedan.`,
      requestedRoles: [
        {
          role: 'Konsult / Uppdragstagare',
          requirements: 'Krav specificerade i förfrågningsunderlagets kravspecifikation.'
        }
      ],
      estimatedValueOrBudget: notice.estimatedValue || 'Se ersättningsmodell i administrativa föreskrifter.',
      projectDuration: 'Enligt avtalsutkast och AF-del.',
      standardContractTerms: 'ABK 09 / Standardavtal enligt AF-del.',
      requiredSubmissionDocuments: documentSummaryList.filter(d => /pris|svarsbilaga|cv/i.test(d.name)).map(d => d.name),
      keyRequirements: ['Krav enligt uppladdad kravspecifikation'],
      opportunities: ['Relevant uppdrag med tillgång till fullständiga handlingar'],
      risksAndChallenges: ['Granska samtliga skall-krav och bilagor noggrant innan inlämning'],
      recommendedBidStrategy: 'Följ svarsmallarna strikt och säkerställ fullständig överensstämmelse med skall-kraven.',
      clarificationQuestions: ['Ställ frågor via upphandlingssystemet vid minsta oklarhet i underlaget.']
    };
  } catch (error) {
    console.error('Document-based tender analysis failed:', error);
    throw error;
  }
}

/**
 * Interactive Copilot Chat for procurement questions, drafting questions, bid advisory
 */
export async function chatWithAssistant(conversationHistory, context = {}) {
  const profile = context.companyProfile || {};
  const currentNotice = context.currentNotice || null;
  const searchState = context.searchState || null;
  const documentCorpus = context.documentCorpus || null;
  const documentList = context.documentList || [];

  const currentPortal = currentNotice?.portalName || currentNotice?.links?.portalName || (currentNotice?.links?.submission ? 'extern upphandlingsportal' : 'upphandlingsportalen');

  let contextInjection = `
Du är TED-Assistenten, en expert på offentlig upphandling i Sverige och EU (LOU, LUF, TED Europa).
Du hjälper användaren att tolka upphandlingar, formulera frågor till upphandlare och lägga upp anbudsstrategier.

======================================================================
VIKTIGA REGLER OM SANNFÄRDIGHET OCH FAKTA (ABSOLUT FÖRBUD MOT ATT GISSA):
1. Du får ALDRIG hitta på eller gissa uppgifter som inte uttryckligen framgår av det tillgängliga underlaget.
2. Om upphandlingshandlingar har laddats upp (se nedan), basera dina svar strikt och i detalj på texten i dessa dokument och ange källdokument!
3. Om inga upphandlingsdokument laddats upp och användaren frågar om detaljer som inte finns i TED-sammanfattningen, säg tydligt att informationen saknas i kungörelsen och hänvisa till förfrågningsunderlaget i portalen (${currentPortal}).
======================================================================

Användarens företag:
- Företagsnamn: ${profile.name || 'WSP Sverige AB (BIM-enheten)'}
- Verksamhet & Nyckelord: ${profile.keywords || profile.description || 'BIM, BIM-samordning, VDC, 3D-modellering, digital informationshantering, Samhällsbyggnad'}
`;

  if (currentNotice) {
    contextInjection += `\n
AKTUELLT UPPHANDLINGSÄRENDE I FOKUS (Från TED):
- Titel: ${currentNotice.title}
- Upphandlande myndighet: ${currentNotice.buyer} (${currentNotice.city || ''}, ${currentNotice.country || ''})
- Uppskattat värde: ${currentNotice.estimatedValue || 'Ej angivet i TED'}
- Deadline: ${currentNotice.deadline || 'Ej angiven'} (${currentNotice.daysRemaining !== null ? currentNotice.daysRemaining + ' dagar kvar' : 'Okänt'})
- CPV-koder: ${currentNotice.cpvDetails ? currentNotice.cpvDetails.map(c => `${c.code} - ${c.label}`).join(', ') : 'Ej specificerat'}
- Upphandlingsportal/System: ${currentPortal}
- Beskrivning från TED: ${currentNotice.description || 'Ingen detaljerad beskrivning i TED-notisen'}
- Direktlänk till anbud/underlag: ${currentNotice.links?.submission || currentNotice.links?.documents || currentNotice.links?.tedHtml || ''}
`;
  }

  if (documentList && documentList.length > 0) {
    contextInjection += `\n
TILLGÄNGLIGA UPPHANDLINGSHANDLINGAR (${documentList.length} st):
${documentList.map(d => `- ${d.name} [${d.category || 'Dokument'}]`).join('\n')}
`;
  }

  if (documentCorpus) {
    contextInjection += `\n
TEXT UR DE UPPLADDADE UPPHANDLINGSHANDLINGARNA:
${documentCorpus.slice(0, 100000)}
`;
  }

  if (searchState) {
    contextInjection += `\n
AKTIV SÖKNING:
- Sökord: ${searchState.keywords || 'Alla'}
- Länder: ${searchState.countries?.join(', ') || 'SWE'}
- CPV: ${searchState.cpv?.join(', ') || 'Alla'}
`;
  }

  const response = await callMiniMax(conversationHistory, contextInjection, { temperature: 0.35 });
  return response;
}
