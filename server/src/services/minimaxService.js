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
    const rawResult = await callMiniMax(messages, systemPrompt, { temperature: 0.2 });
    
    // Extract JSON from output
    const jsonMatch = rawResult.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
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

  const tenderContext = `
Upphandlingsinformation:
- Titel: ${notice.title}
- Upphandlare/Köpare: ${notice.buyer} (${notice.city || ''}, ${notice.country || ''})
- Publiceringsdatum: ${notice.publicationDate || 'Okänt'}
- Sista anbudsdag (Deadline): ${notice.deadline || 'Ej angiven'}
- Dagar kvar: ${notice.daysRemaining !== null ? notice.daysRemaining + ' dagar' : 'Okänt'}
- CPV-koder: ${notice.cpvDetails ? notice.cpvDetails.map(c => `${c.code} (${c.label})`).join(', ') : 'Ej specificerat'}
- Typ: ${notice.formType}
- Beskrivning:
${notice.description || 'Ingen detaljerad beskrivning tillgänglig.'}
`;

  const systemPrompt = `Du är en erfaren svensk anbudskonsult och specialist på offentlig upphandling (LOU/LUF/EU-direktiv).
Analysera upphandlingen noggrant och matcha den mot företagets profil.

Returnera ENDAST ett giltigt JSON-objekt (inga backticks, endast ren JSON):
{
  "fitScore": <nummer mellan 0 och 100 som anger hur väl upphandlingen matchar företagets profil>,
  "summary": "En koncis sammanfattning (2-3 meningar) av vad upphandlingen egentligen handlar om och vad som ska levereras.",
  "keyRequirements": [
    "Viktigt krav eller skall-krav 1",
    "Viktigt krav 2",
    "Viktigt krav 3"
  ],
  "opportunities": [
    "Möjlighet eller fördel för anbudsgivaren 1",
    "Möjlighet 2"
  ],
  "risksAndChallenges": [
    "Risk, oklarhet eller utmaning 1",
    "Risk 2"
  ],
  "recommendedBidStrategy": "Konkreta råd för hur ett vinnande anbud bör utformas och vad som bör betonas.",
  "clarificationQuestions": [
    "Förslag på fråga att ställa till upphandlaren under frågeperioden 1",
    "Förslag på fråga 2"
  ]
}`;

  const messages = [
    { role: 'user', content: `${profileContext}\n\n${tenderContext}\n\nAnalysera denna upphandling och ge dina rekommendationer i JSON-format.` }
  ];

  try {
    const rawResult = await callMiniMax(messages, systemPrompt, { temperature: 0.3 });
    const jsonMatch = rawResult.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return {
      fitScore: 75,
      summary: notice.description ? notice.description.slice(0, 200) + '...' : notice.title,
      keyRequirements: ['Krav enligt förfrågningsunderlag'],
      opportunities: ['Relevant upphandling inom ert område'],
      risksAndChallenges: ['Kontrollera tidsfrister och skall-krav noggrant'],
      recommendedBidStrategy: 'Läs igenom hela upphandlingsdokumentet och säkerställ alla skall-krav.',
      clarificationQuestions: ['Finns möjlighet till förtydligande av kravprofilen?']
    };
  } catch (error) {
    console.error('Tender analysis failed:', error);
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

  let contextInjection = `
Du är TED-Assistenten, en expert på offentlig upphandling i Sverige och EU (LOU, LUF, TED Europa).
Du hjälper användaren att:
1. Hitta och filtrera relevanta upphandlingar
2. Tolka krav, förfrågningsunderlag och CPV-koder
3. Skriva skarpa frågor till upphandlaren
4. Formulera vinnande anbudsförslag och dispositionsutkast
5. Skapa optimerade bevakningsprofiler

Användarens företag:
- Företagsnamn: ${profile.name || 'WSP Sverige AB (BIM-enheten)'}
- Verksamhet & Nyckelord: ${profile.keywords || profile.description || 'BIM, BIM-samordning, VDC, 3D-modellering, digital informationshantering, Samhällsbyggnad'}
`;

  if (currentNotice) {
    contextInjection += `\n
AKTUELLT UPPHANDLINGSÄRENDE I FOKUS:
- Titel: ${currentNotice.title}
- Upphandlande myndighet: ${currentNotice.buyer} (${currentNotice.city || ''}, ${currentNotice.country || ''})
- Deadline: ${currentNotice.deadline || 'Ej angiven'} (${currentNotice.daysRemaining} dagar kvar)
- CPV: ${currentNotice.cpvDetails ? currentNotice.cpvDetails.map(c => `${c.code} - ${c.label}`).join(', ') : ''}
- Beskrivning: ${currentNotice.description || 'Se underlag'}
- TED Länk: ${currentNotice.links?.tedHtml || ''}
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

  const response = await callMiniMax(conversationHistory, contextInjection, { temperature: 0.5 });
  return response;
}
