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
  
  // 1. Strip thinking tags if any remain
  let cleaned = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // 2. Remove markdown code blocks (```json ... ``` or ``` ...)
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  
  // 3. Find outer JSON object boundaries
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  // Attempt 1: Direct JSON.parse
  try {
    return JSON.parse(cleaned);
  } catch (e1) {
    // Attempt 2: Clean trailing commas and control characters
    try {
      let repaired = cleaned
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // strip ASCII control chars
      return JSON.parse(repaired);
    } catch (e2) {
      // Attempt 3: Fix unescaped newlines inside strings
      try {
        let fixedNewlines = cleaned
          .replace(/:\s*"([^"]*)"/g, (match, p1) => {
            return ': "' + p1.replace(/\n/g, '\\n').replace(/\r/g, '') + '"';
          })
          .replace(/,\s*}/g, '}')
          .replace(/,\s*]/g, ']');
        return JSON.parse(fixedNewlines);
      } catch (e3) {
        // Attempt 4: If JSON is truncated (unclosed brackets), attempt to close open structures
        try {
          let balanced = cleaned.trim();
          const openBraces = (balanced.match(/\{/g) || []).length;
          const closeBraces = (balanced.match(/\}/g) || []).length;
          const openBrackets = (balanced.match(/\[/g) || []).length;
          const closeBrackets = (balanced.match(/\]/g) || []).length;

          if (balanced.endsWith(',')) balanced = balanced.slice(0, -1);
          if (openBrackets > closeBrackets) balanced += ']'.repeat(openBrackets - closeBrackets);
          if (openBraces > closeBraces) balanced += '}'.repeat(openBraces - closeBraces);

          return JSON.parse(balanced);
        } catch (e4) {
          console.warn('[MiniMax] JSON parse and repair failed. Raw output preview:', cleaned.slice(0, 300));
          return null;
        }
      }
    }
  }
}

/**
 * Convert user's natural language request into structured TED search filters and CPV codes
 */
export async function naturalLanguageToFilters(userPrompt) {
  const systemPrompt = `Du är en expert på offentlig upphandling i Sverige och EU samt TED (Tenders Electronic Daily).
Ditt uppdrag är att omvandla användarens sökfras eller beskrivning till strukturerade sökfilter och CPV-koder.

VIKTIGT OM NYCKELORD, KÖPARE OCH LOGIK:
- Om användaren nämner en specifik upphandlande organisation eller myndighet (t.ex. "Trafikverket", "Region Stockholm", "Västfastigheter", "Svenska kraftnät", "Försvarsmakten", "FMV", "Göteborgs stad", "Stockholm Vatten", "Specialfastigheter"), ska du ALLTID sätta fältet "buyer" till detta organisationsnamn (t.ex. "Trafikverket" eller "Region Stockholm").
- Sätt ALDRIG en upphandlares namn i "titleKeyword"! I TED eForms-standard inleds titlar ofta med "Sverige – Konsulttjänster..." och upphandlarens namn finns i fältet för organisation/köpare, inte i titeln. Att sätta organisationen i titleKeyword resulterar i 0 träffar!
- "titleKeyword" ska ENDAST användas om användaren uttryckligen ber om ett ord som MÅSTE stå i titeln (t.ex. "upphandlingar med 'ramavtal' i rubriken"). Lämna annars "titleKeyword" tomt ("").
- Om användaren nämner andra länder eller regioner (t.ex. "Danmark", "Norge", "Finland", "Tyskland", "Frankrike", "Norden", "EU"), sätt fältet "countries" till motsvarande ISO-3 koder (t.ex. ["DNK"], ["NOR"], ["FIN"], ["DEU"], ["FRA"], eller för Norden ["SWE", "DNK", "NOR", "FIN"]).
- Vid sökning i utländska länder är CPV-koder avgörande eftersom de är universella i hela EU/EES oavsett språk. Välj alltid relevanta 8-siffriga CPV-koder så att upphandlingar på lokalt språk (t.ex. tyska, danska, finska) hittas.
- Om sökningen berör BIM/bygg/teknik/arkitektur/samhällsbyggnad, välj relevanta CPV-koder från division 71 (t.ex. 71300000, 71240000, 71320000, 71541000) och/eller 45. Om användaren enbart söker efter en myndighet utan specifik bransch, lämna "cpv" som tom array [].
- Om sökningen berör IT/mjukvara, välj koder från division 72 eller 48.

Returnera ENDAST ett giltigt JSON-objekt med följande fält (inga markdown-kodblock, endast ren JSON):
{
  "buyer": "namn på upphandlande myndighet eller organisation, t.ex. 'Trafikverket' eller tom sträng om inte specificerad",
  "keywords": "relevanta verksamhetssökord separerade med OR (eller tom sträng '')",
  "titleKeyword": "valfritt specifikt ord i titeln eller tom sträng ''",
  "cpv": ["8-siffriga CPV-koder relevanta för området, t.ex. '71300000', '71240000' eller tom array []"],
  "countries": ["landskoder i ISO-3, t.ex. 'SWE', 'DNK', 'NOR', 'FIN', 'DEU'"],
  "formType": "competition | planning | result | ALL",
  "datePreset": "1d | 7d | 14d | 30d | 90d | 365d | all",
  "explanation": "Kort förklaring på svenska av hur du tolkade sökningen och vilka filter/köpare du valde.",
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
    const isTrafikverket = /trafikverket/i.test(userPrompt);
    const isBim = /bim|vdc|modellering|cad|projektering|samordning/i.test(userPrompt);
    return {
      buyer: isTrafikverket ? 'Trafikverket' : '',
      keywords: isTrafikverket && !isBim ? '' : userPrompt,
      cpv: isBim ? ['71300000', '71240000', '71320000'] : [],
      countries: ['SWE'],
      formType: 'competition',
      datePreset: 'all',
      explanation: isTrafikverket ? 'Filtrerar på upphandlingar från Trafikverket.' : 'Sökfilter skapade baserat på din sökning.',
      suggestedWatchlistName: userPrompt.slice(0, 30)
    };
  } catch (e) {
    console.error('Failed to parse natural language query with MiniMax:', e);
    const isTrafikverket = /trafikverket/i.test(userPrompt);
    const isBim = /bim|vdc|modellering|cad|projektering|samordning/i.test(userPrompt);
    return {
      buyer: isTrafikverket ? 'Trafikverket' : '',
      keywords: isTrafikverket && !isBim ? '' : userPrompt,
      cpv: isBim ? ['71300000', '71240000', '71320000'] : [],
      countries: ['SWE'],
      formType: 'competition',
      datePreset: 'all',
      explanation: 'Sökning med direkt filter.',
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
Koppla varje identifierat krav och villkor till det relevanta dokumentet (t.ex. "[Kravspecifikation.docx]" eller "[Prisbilaga.xlsx]").

======================================================================
ABSOLUT FÖRBUD MOT METATEXT OCH PLATSHÅLLARE:
- Du får ALDRIG svara med generella hänvisningar som:
  * "Information finns i dokumentet"
  * "Krav specificerade i förfrågningsunderlagets kravspecifikation"
  * "Se ersättningsmodell i administrativa föreskrifter"
  * "Enligt avtalsutkast och AF-del"
- Du MÅSTE extrahera och skriva ut den FAKTISKA informationen:
  * För roller: Vilken specifik yrkesroll eftersöks, hur många års erfarenhet krävs, vilka certifieringar/programvaror (t.ex. "BIM-samordnare med minst 5 års erfarenhet av Trafikverksprojekt och god kunskap i Navisworks/Civil 3D").
  * För avtalsvillkor: Vilket specifikt standardavtal (t.ex. "ABK 09"), vilket vitesbelopp (t.ex. "10 000 kr/vecka"), vilka optionsår.
  * För ersättning/pris: Vilket takpris, fast pris eller timpriser som anges i prisbilagan.
  * För inlämningshandlingar: De exakta namnen på de bilagor och mallar som ska fyllas i och skickas in.
- Om en uppgift faktiskt saknas i samtliga uppladdade handlingar ska du skriva "Framgår ej i de uppladdade handlingarna".
======================================================================

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
      "role": "Specifikt rollnamn ur handlingarna (t.ex. BIM-samordnare)",
      "requirements": "Exakta skall-krav på erfarenhet, utbildning och verktyg hämtade ur kravspecifikationen"
    }
  ],
  "estimatedValueOrBudget": "Faktiskt takbelopp, budgetram eller omsättning ur handlingarna (eller 'Framgår ej i underlaget')",
  "projectDuration": "Exakt avtalstid, start/slut och optionsår ur handlingarna",
  "standardContractTerms": "Exakta avtalsvillkor (t.ex. 'ABK 09 med ändringar enligt AF, vite 10 000 kr/vecka')",
  "requiredSubmissionDocuments": [
    "Exakt namn på obligatorisk inlämningsbilaga ur handlingarna"
  ],
  "keyRequirements": [
    "Exakt skall-krav 1 ur handlingarna",
    "Exakt skall-krav 2 ur handlingarna"
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
      content: `${profileContext}\n\n${tenderContext}\n\n${docListHeader}\n\nINNEHÅLL UR FÖRFRÅGNINGSUNDERLAGET:\n${documentCorpus}\n\nGenomför djupgående analys av handlingarna och returnera ren JSON med FAKTISKA data.`
    }
  ];

  try {
    const rawResult = await callMiniMax(messages, systemPrompt, { temperature: 0.1, max_tokens: 8192 });
    const parsed = extractJsonFromLlm(rawResult);
    if (parsed && parsed.fitScore !== undefined) {
      parsed.isDocumentGrounded = true;
      parsed.documentSources = documentSummaryList.map(d => d.name);
      return parsed;
    }

    // Secondary fallback: Extract fields from rawResult using regex if strict JSON parsing failed
    console.warn('[MiniMax] Using regex field extraction fallback on raw LLM output...');
    const extractStringField = (fieldName) => {
      const match = rawResult.match(new RegExp(`"${fieldName}"\\s*:\\s*"([^"]+)"`, 'i'));
      return match ? match[1].replace(/\\n/g, ' ').trim() : null;
    };
    const extractArrayField = (fieldName) => {
      const match = rawResult.match(new RegExp(`"${fieldName}"\\s*:\\s*\\[([^\\]]+)\\]`, 'i'));
      if (!match) return [];
      return match[1]
        .split(/",\s*"|",\s*\n\s*"/)
        .map(s => s.replace(/^[\s"]+|[\s"]+$/g, '').replace(/\\n/g, ' ').trim())
        .filter(Boolean);
    };

    const fitScoreMatch = rawResult.match(/"fitScore"\s*:\s*(\d+)/i);
    const fitScore = fitScoreMatch ? parseInt(fitScoreMatch[1]) : 75;

    return {
      fitScore,
      isDocumentGrounded: true,
      documentSources: documentSummaryList.map(d => d.name),
      summary: extractStringField('summary') || `Djupanalys baserad på granskning av ${documentSummaryList.length} upphandlingshandlingar.`,
      requestedRoles: parsed?.requestedRoles || [
        {
          role: 'Uppdragstagare enligt kravspecifikationen',
          requirements: 'Se extraherade skall-krav nedan.'
        }
      ],
      estimatedValueOrBudget: extractStringField('estimatedValueOrBudget') || notice.estimatedValue || 'Framgår ej i underlaget',
      projectDuration: extractStringField('projectDuration') || 'Enligt administrativa föreskrifter och avtalsutkast',
      standardContractTerms: extractStringField('standardContractTerms') || 'Standardavtal enligt uppladdade handlingar',
      requiredSubmissionDocuments: extractArrayField('requiredSubmissionDocuments').length > 0
        ? extractArrayField('requiredSubmissionDocuments')
        : documentSummaryList.filter(d => /pris|svarsbilaga|cv|krav|espd/i.test(d.name)).map(d => d.name),
      keyRequirements: extractArrayField('keyRequirements').length > 0
        ? extractArrayField('keyRequirements')
        : ['Skall-krav enligt uppladdade förfrågningshandlingar'],
      opportunities: extractArrayField('opportunities').length > 0
        ? extractArrayField('opportunities')
        : ['God matchning mot företagets kompetensprofil utifrån underlaget'],
      risksAndChallenges: extractArrayField('risksAndChallenges').length > 0
        ? extractArrayField('risksAndChallenges')
        : ['Säkerställ fullständig uppfyllelse av samtliga skall-krav innan anbudsinlämning'],
      recommendedBidStrategy: extractStringField('recommendedBidStrategy') || 'Följ svarsmallarna noggrant och besvara samtliga skall-krav med tydliga bevis.',
      clarificationQuestions: extractArrayField('clarificationQuestions').length > 0
        ? extractArrayField('clarificationQuestions')
        : ['Ställ frågor till upphandlaren under frågestunden vid eventuella oklarheter i handlingarna.']
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

/**
 * Analyze one or more CV documents and generate high-relevance search filters for TED & consulting portals
 * @param {Array<{ name: string, text: string, charCount?: number }>} cvList
 * @param {string} userNote - Optional user guidance/focus
 * @param {Object} companyProfile - Optional company background
 */
export async function analyzeCvAndGenerateSearchFilters(cvList = [], userNote = '', companyProfile = null) {
  let cvCorpus = '';
  for (const cv of cvList) {
    const textSample = (cv.text || '').slice(0, 20000);
    cvCorpus += `\n\n======================================================================\nCV DOKUMENT: ${cv.name}\n======================================================================\n${textSample}\n`;
  }

  const systemPrompt = `Du är en svensk anbuds- och rekryteringsexpert inom offentlig upphandling och konsultmäkleri (TED, Magnit Source, Verama/Ework).
Ditt uppdrag är att analysera ett eller flera uppladdade CV:n (konsultprofiler) och skapa optimala, träffsäkra sökfilter, CPV-koder och sökord för att hitta passande upphandlingar och konsultuppdrag.

Instruktioner:
1. Identifiera de viktigaste rollerna och kompetenserna från CV:na (t.ex. BIM-samordnare, projektledare, miljökonsult, GIS-specialist, konstruktör, IT-arkitekt).
2. Plocka ut kärnkompetenser, verktyg och metoder (t.ex. Revit, Navisworks, VDC, Civil 3D, IFC, ABK 09, Trafikverket TDOK, Miljöbalken, ArcGIS).
3. Välj ut de 8-siffriga CPV-koder som bäst matchar dessa konsultområden (t.ex. 71300000 Tekniska konsulttjänster, 71240000 Arkitekt- och ingenjörstjänster, 71320000 Projektering, 72000000 IT-tjänster, 71313000 Miljörådgivning, etc.).
4. Skapa en fokuserad söksträng för "keywords" där centrala termer och synonymer sammanfogas med " OR " (t.ex. "BIM OR Informationsmodellering OR VDC OR Digital tvilling").
5. Om användaren angett ett extra önskemål i userNote, prioritera detta.

Returnera ENDAST ett giltigt JSON-objekt med exakt denna struktur (inga markdown-kodblock, endast ren JSON):
{
  "buyer": "namn på specifik beställare om relevant utifrån CV eller userNote, annars tom sträng ''",
  "keywords": "fokuserade sökord och synonymer separerade med OR (t.ex. 'BIM OR Informationsmodellering OR VDC')",
  "excludeKeywords": "eventuella negativa ord för att rensa bort irrelevanta branscher eller tom sträng ''",
  "cpv": ["8-siffriga CPV-koder"],
  "countries": ["SWE"],
  "formType": "competition",
  "datePreset": "all",
  "profilesIdentified": ["Identifierad roll 1", "Roll 2"],
  "skills": ["Kompetens 1", "Verktyg 2", "Metod 3", "System 4"],
  "experienceHighlights": ["Erfarenhet 1", "Branschområde 2"],
  "suggestedRoles": ["Roll 1", "Roll 2"],
  "explanation": "En pedagogisk förklaring på svenska som sammanfattar CV-profilerna och varför dessa sökkriterier valts.",
  "suggestedWatchlistName": "Förslag på namn om man vill spara som bevakning (t.ex. 'BIM-specialist Uppdrag')"
}`;

  const userContent = `Här är ${cvList.length} uppladdade CV-dokument att analysera:${userNote ? `\n\nAnvändarens kompletterande instruktion:\n"${userNote}"` : ''}\n\n${cvCorpus}`;

  const messages = [
    { role: 'user', content: userContent }
  ];

  try {
    const rawResult = await callMiniMax(messages, systemPrompt, { temperature: 0.2, max_tokens: 3000 });
    const parsed = extractJsonFromLlm(rawResult);
    if (parsed) {
      return parsed;
    }
  } catch (e) {
    console.error('[MiniMax] Failed to parse CV with LLM:', e);
  }

  // Heuristic Fallback if LLM fails or is unavailable
  const allText = cvList.map(c => c.text).join(' ').toLowerCase();
  const isBim = /bim|vdc|revit|navisworks|ifc|informationsmodell/i.test(allText);
  const isMiljo = /miljö|mkb|hållbarhet|klimat|föroren/i.test(allText);
  const isIt = /utveckl|system|arkitekt|python|java|cloud|data/i.test(allText);
  const isProj = /projektled|byggled|projekteringsled/i.test(allText);

  const fallbackKeywords = [];
  const fallbackCpvs = ['71300000'];
  const fallbackRoles = [];
  const fallbackSkills = [];

  if (isBim) {
    fallbackKeywords.push('BIM', 'Informationsmodellering', 'VDC');
    fallbackCpvs.push('71240000', '71320000', '48000000');
    fallbackRoles.push('BIM-samordnare / Specialist');
    fallbackSkills.push('BIM', 'Revit', 'Navisworks', 'VDC');
  }
  if (isMiljo) {
    fallbackKeywords.push('Miljö', 'MKB', 'Hållbarhet');
    fallbackCpvs.push('71313000');
    fallbackRoles.push('Miljökonsult');
    fallbackSkills.push('MKB', 'Miljöbalken', 'Klimatberäkningar');
  }
  if (isIt) {
    fallbackKeywords.push('IT-konsult', 'Systemutveckling');
    fallbackCpvs.push('72000000');
    fallbackRoles.push('IT-konsult / Arkitekt');
    fallbackSkills.push('Systemutveckling', 'IT-arkitektur');
  }
  if (isProj) {
    fallbackKeywords.push('Projektledning', 'Byggledning');
    fallbackCpvs.push('71541000');
    fallbackRoles.push('Projektledare Samhällsbyggnad');
    fallbackSkills.push('Projektstyrning', 'ABK 09');
  }

  return {
    buyer: '',
    keywords: fallbackKeywords.join(' OR ') || 'Teknisk konsult',
    excludeKeywords: '',
    cpv: fallbackCpvs,
    countries: ['SWE'],
    formType: 'competition',
    datePreset: 'all',
    profilesIdentified: fallbackRoles.length > 0 ? fallbackRoles : ['Konsult / Specialist'],
    skills: fallbackSkills.length > 0 ? fallbackSkills : ['Teknisk rådgivning'],
    experienceHighlights: ['Teknisk konsultverksamhet inom offentlig sektor'],
    suggestedRoles: fallbackRoles.length > 0 ? fallbackRoles : ['Teknisk rådgivare'],
    explanation: `Sökkriterier genererade från ${cvList.length} uppladdade CV:n baserat på identifierade nyckelkompetenser.`,
    suggestedWatchlistName: `CV-matchning: ${fallbackRoles[0] || 'Konsultuppdrag'}`
  };
}

/**
 * Translate and summarize a foreign procurement notice into clear Swedish with key terminology explanation
 * and submission language requirement analysis.
 * @param {Object} notice - Normalized notice object
 * @param {string} targetLanguage - Target language code ('sv')
 */
export async function translateNotice(notice, targetLanguage = 'sv') {
  const noticeTitle = notice.title || 'Utan titel';
  const noticeDesc = notice.description || 'Beskrivning saknas i kungörelsen';
  const buyer = notice.buyer || 'Okänd upphandlare';
  const country = notice.country || 'SWE';
  const city = notice.city || '';
  const cpvs = notice.cpvDetails?.map(c => `${c.code} (${c.label})`).join(', ') || notice.cpvList?.join(', ') || 'Ej specificerat';
  const estimatedValue = notice.estimatedValue || 'Ej angivet';
  const deadline = notice.deadline || 'Ej angiven';
  const portal = notice.portalName || notice.links?.portalName || 'Upphandlingsportal';

  const systemPrompt = `Du är en certifierad nordisk och europeisk anbudsspecialist och auktoriserad facköversättare med spetskompetens inom offentlig upphandling (LOU/LUF/EU-direktiv) och tekniska konsulttjänster (samhällsbyggnad, teknik, IT, arkitektur och anläggning).

DITT UPPDRAG:
Översätt och analysera denna utländska upphandlingskungörelse till professionell, flytande och precis svenska.

Instruktioner för översättning och analys:
1. "translatedTitle": Översätt titeln till naturlig svensk branschterminologi (t.ex. "Byggherrerådgivning och teknisk konsultation för...", "Projektering av järnvägsanläggning...", etc.).
2. "translatedDescription": Översätt beskrivningen till tydlig och korrekt svenska. Behåll alla tekniska parametrar, mått och datum exakt.
3. "executiveSummary": En punktlista (3-5 punkter) på ren svenska som ger en snabb "Executive Summary":
   - Vad upphandlingen avser (kärnuppdrag och omfattning)
   - Eftersökta kompetenser, roller eller leveranser
   - Kontraktstyp, uppskattat värde och löptid (om det framgår)
   - Geografisk placering och beställare
4. "detectedLanguage": Språknamn på svenska med passande flaggemoji (t.ex. "Danska 🇩🇰", "Tyska 🇩🇪", "Finska 🇫🇮", "Norska 🇳🇴", "Franska 🇫🇷", "Engelska 🇬🇧", "Nederländska 🇳🇱", "Polska 🇵🇱", etc.).
5. "languageCode": 2-3 bokstävers språkkod (t.ex. "da", "de", "fi", "no", "fr", "en", "nl", "pl").
6. "submissionLanguageNote": En praktisk anvisning om anbudsspråk. Identifiera vilket språk förfrågningsunderlag och anbudsinlämning normalt kräver i det aktuella landet (t.ex. "OBS! Förfrågningsunderlag och anbud krävs normalt på tyska enligt tysk upphandlingslagstiftning (VgV/VOB). Kontrollera i underlaget om internationella anbud på engelska godkänns.").
7. "keyTerms": En lista med 2-6 facktermer eller förkortningar från originaltexten (t.ex. HOAI, ABR 18, Bygherrerådgivning, Leistungsphase, NS 8401, ESPD/ESAP, KSE 2013) med svensk översättning och en kort pedagogisk förklaring.

Returnera ENDAST ett giltigt JSON-objekt med följande format (inga markdown-kodblock, endast ren JSON):
{
  "translatedTitle": "Svensk översatt titel",
  "translatedDescription": "Svensk översatt beskrivning",
  "executiveSummary": [
    "Punkt 1: Uppdragets syfte och omfattning",
    "Punkt 2: Nyckelkrav och efterfrågad kompetens",
    "Punkt 3: Omfattning, tidslinje och plats"
  ],
  "detectedLanguage": "Tyska 🇩🇪",
  "languageCode": "de",
  "submissionLanguageNote": "Viktig information om anbudsspråk...",
  "keyTerms": [
    {
      "term": "Term på originalspråk",
      "translation": "Svensk motsvarighet",
      "explanation": "Kort förklaring av vad begreppet innebär i det landets upphandlingspraxis"
    }
  ]
}`;

  const userContent = `Upphandlingsinformation att översätta och sammanfatta:
- Ursprungligt land: ${country} (${city})
- Beställare: ${buyer}
- Upphandlingsportal: ${portal}
- Originaltitel: ${noticeTitle}
- Originalbeskrivning: ${noticeDesc}
- CPV-koder: ${cpvs}
- Uppskattat värde: ${estimatedValue}
- Deadline: ${deadline}`;

  const messages = [{ role: 'user', content: userContent }];

  try {
    const rawResult = await callMiniMax(messages, systemPrompt, { temperature: 0.2, max_tokens: 3000 });
    const parsed = extractJsonFromLlm(rawResult);
    if (parsed && parsed.translatedTitle) {
      parsed.translatedAt = new Date().toISOString();
      return parsed;
    }
    return {
      translatedTitle: parsed?.translatedTitle || noticeTitle,
      translatedDescription: parsed?.translatedDescription || noticeDesc,
      executiveSummary: parsed?.executiveSummary || [
        `Upphandling från ${buyer} i ${country}.`,
        `Branschområde: ${cpvs}.`,
        `Sista anbudsdag: ${deadline}.`
      ],
      detectedLanguage: parsed?.detectedLanguage || `${country}`,
      languageCode: parsed?.languageCode || 'unknown',
      submissionLanguageNote: parsed?.submissionLanguageNote || `Kontrollera språkkrav för anbudsinlämning i förfrågningsunderlaget.`,
      keyTerms: parsed?.keyTerms || [],
      translatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('[MiniMax] Translation failed:', error);
    throw error;
  }
}


