import React, { useState } from 'react';
import {
  Info,
  Database,
  Building2,
  Mail,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Zap,
  Layers,
  Globe,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Search,
  Bell,
  Kanban,
  FileText,
  Lock,
  Cpu,
  RefreshCw,
  HelpCircle,
  Award
} from 'lucide-react';
import { WspLogo } from '../components/WspLogo';

interface AboutViewProps {
  onNavigate?: (view: 'search' | 'watchlists' | 'pipeline' | 'cpv-profile') => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ onNavigate }) => {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('mats.romblad@wsp.com');
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(prev => (prev === index ? null : index));
  };

  const replacedServices = [
    {
      name: 'Kommers Annons / Visma',
      description: 'Traditionell svensk anbudstjänst med låsta licenser och höga årsabonnemang.',
      replacementReason: 'Direkt realtidskoppling mot TED API utan abonnemangskostnader och med inbyggd AI-analys.'
    },
    {
      name: 'Tendium',
      description: 'AI-inriktad anbudsplattform med fokus på sammanfattning och skall-krav.',
      replacementReason: 'MiniMax-M3 Copilot, smart NLP-sökning, CPV-katalog och skräddarsydd anbudspipeline helt integrerat.'
    },
    {
      name: 'Opic / Mercell',
      description: 'Nordisk upphandlingsportal och bevakningssystem med separat licensiering.',
      replacementReason: 'Full EU- och Norden-täckning i realtid med obegränsade bevakningsprofiler och bakgrundspollning.'
    },
    {
      name: 'e-Avrop',
      description: 'Svensk databas för upphandlingar och avtal.',
      replacementReason: 'Samtliga direktivstyrda upphandlingar (LOU/LUF) publiceras i TED och fångas automatiskt i appen.'
    },
    {
      name: 'TendSign / Visma Commerce',
      description: 'Upphandlingsverktyg och bevakningstjänst.',
      replacementReason: 'Enkelt modernt gränssnitt, direkt export till Excel/JSON och integrerad Kanban-pipeline.'
    },
    {
      name: 'Magnit Source / VMS-mäklare',
      description: 'Slutet VMS- och konsultmäklarsystem för direktavrop och resursförfrågningar.',
      replacementReason: 'Integrerad realtidssökning och bevakning som fångar uppdrag från Trafikförvaltningen (SL), Vattenfall, Swedavia, Stockholm Exergi m.fl.'
    },
    {
      name: 'Verama / Ework Group',
      description: 'Mäklarportal för konsultuppdrag och specialistroller.',
      replacementReason: 'Direkt realtidsbevakning som scannar Verama/Eworks öppna konsultuppdrag och matchar specialistkompetens utan separat inloggning.'
    },
    {
      name: 'Upphandling24 (U24)',
      description: 'Nyhets- och bevakningstjänst för offentlig sektor.',
      replacementReason: 'Djupare sökbarhet med TED Expert Query, CPV-hierarkier och AI-driven skall-kravsanalys.'
    }
  ];

  const keyAdvantages = [
    {
      icon: <Database className="w-5 h-5 text-ted-600 dark:text-ted-400" />,
      title: 'Trippla källor: TED, Magnit & Verama',
      description: 'Hämtar data omedelbart från EU TED API v3, Magnit Source VMS och Verama / Ework för maximal täckning av både upphandlingar och konsultuppdrag.'
    },
    {
      icon: <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
      title: 'MiniMax AI Copilot & NLP',
      description: 'Skriv sökfraser på vanligt språk. AI översätter till CPV-koder och filter, analyserar skall-krav och formulerar frågor till upphandlaren.'
    },
    {
      icon: <Kanban className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      title: 'Komplett Anbudspipeline',
      description: 'Följ affären från bevakning och granskning till inlämnat och vunnet anbud i en visuell Kanban-tavla med interna deadlines och ansvariga.'
    },
    {
      icon: <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      title: 'Automatisk Bakgrundspollning',
      description: 'Skapa skräddarsydda bevakningslistor som regelbundet scannar TED, Magnit och Verama efter nya affärsmöjligheter och skickar e-postnotiser.'
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      title: 'Fleranvändarstöd & Säkerhet',
      description: 'Inloggning via SSO (Google, GitHub) eller e-post med isolerad användardata och Row Level Security (RLS) i Supabase Postgres.'
    },
    {
      icon: <Zap className="w-5 h-5 text-rose-600 dark:text-rose-400" />,
      title: 'Noll Licenskostnader',
      description: 'Inga dyra licensavgifter per användare eller inlåsningar i proprietära system – full tillgång för hela organisationen.'
    }
  ];

  const faqs = [
    {
      question: 'Vilka upphandlingar och källor syns i appen?',
      answer: 'Appen samlar och övervakar tre ledande källor i realtid:\n\n1. TED (Tenders Electronic Daily): Samtliga offentliga upphandlingar över EU:s tröskelvärden i enlighet med LOU, LUF, LUFS och LUK i Sverige, Norden och övriga EU/EES.\n2. Magnit Source: Resursförfrågningar och konsultavrop från stora uppdragsgivare som Trafikförvaltningen (SL), Vattenfall, Swedavia, Stockholm Exergi m.fl.\n3. Verama / Ework Group: Öppna konsultuppdrag, specialistroller och förfrågningar inom teknik, IT, infrastruktur och management.'
    },
    {
      question: 'Hur fungerar integrationen med Magnit Source och Verama / Ework?',
      answer: 'Appen söker och pollar Magnit Source och Verama/Ework parallellt med TED Search API v3. Alla träffar förses med tydliga källbrickor (TED, Magnit, Verama), direktlänkar till källsystemet och fullt stöd för MiniMax AI-sammanfattning och anbudspipeline.'
    },
    {
      question: 'Hur ofta uppdateras datan?',
      answer: 'Live-sökningar görs i realtid direkt mot TED API v3 samt konsultportalerna. Dina sparade bevakningsprofiler pollas automatiskt i bakgrunden enligt schemat (var 10:e minut i bakgrunden), och samlade notiser skickas dagligen eller veckovis via e-post samt flaggas med badges i gränssnittet.'
    },
    {
      question: 'Hur fungerar AI-analysen och MiniMax Copilot?',
      answer: 'MiniMax-M3 modellen är integrerad för att tolka förfrågningsunderlag, sammanfatta projektet på svenska, lyfta fram skall-krav och risker samt matcha upphandlingen mot företagets fördefinierade profil och kompetensområden.'
    },
    {
      question: 'Kan jag exportera träffar och bevakningar?',
      answer: 'Ja! Du kan exportera både sökresultat och träffar från bevakningslistor till Microsoft Excel (.xlsx), CSV eller JSON för vidare analys och presentation.'
    },
    {
      question: 'Finns upphandlingar från Trafikverket och andra statliga myndigheter i appen?',
      answer: 'Ja! Trafikverket (registrerat som "Trafikverket Myndighet" i TED), Svenska kraftnät, Region Stockholm, Trafikförvaltningen (SL), Västfastigheter m.fl. kungör alla sina upphandlingar över tröskelvärdena i TED. Därtill fångas konsultuppdrag från Trafikförvaltningen, Vattenfall, Swedavia m.fl. automatiskt in via den integrerade Magnit Source- och Verama-kopplingen.'
    },
    {
      question: 'Hur kontaktar jag skaparen eller rapporterar önskemål?',
      answer: 'Appen är utvecklad av Mats Romblad på WSP. Vid frågor, feedback eller förslag på nya funktioner, skicka gärna ett mail till mats.romblad@wsp.com.'
    }
  ];

  return (
    <div className="space-y-8 pb-12 animate-fadeIn">
      {/* Top Banner / Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-[#2c1212] p-8 md:p-10 shadow-sm border border-slate-200 dark:border-[#F1503C]/30">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-[#F1503C]/5 dark:bg-[#F1503C]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/3 -mb-12 w-48 h-48 bg-red-600/5 dark:bg-red-600/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 dark:bg-white/10 backdrop-blur-md border border-red-200 dark:border-white/20 text-xs font-bold text-[#F1503C] dark:text-red-200">
            <WspLogo variant="icon" size="sm" />
            <span>Om WSP TED Bevakare</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
            Offentliga upphandlingar – smartare, snabbare och AI-förstärkt för <span className="text-[#F1503C]">WSP</span>
          </h1>

          <p className="text-slate-600 dark:text-slate-200 text-sm md:text-base leading-relaxed">
            <strong>WSP TED Bevakare</strong> är ett modernt och kraftfullt verktyg för att söka, bevaka och analysera
            offentliga upphandlingar från <strong>EU:s officiella databas TED (Tenders Electronic Daily)</strong>.
            Verktyget ersätter dyra kommersiella bevakningstjänster och ger WSP direkt tillgång till aktuella affärsmöjligheter med stöd av generativ AI.
          </p>

          {onNavigate && (
            <div className="pt-2 flex flex-wrap gap-3">
              <button
                onClick={() => onNavigate('search')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F1503C] hover:bg-[#dc2626] text-white font-bold text-xs transition-all shadow-md hover:scale-105 active:scale-95"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Börja söka upphandlingar</span>
              </button>
              <button
                onClick={() => onNavigate('watchlists')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-white font-semibold text-xs border border-slate-200 dark:border-white/20 transition-all"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Mina bevakningar</span>
              </button>
              <button
                onClick={() => onNavigate('pipeline')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-white font-semibold text-xs border border-slate-200 dark:border-white/20 transition-all"
              >
                <Kanban className="w-3.5 h-3.5" />
                <span>Anbudspipeline</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Creator Card: Mats Romblad @ WSP */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-8 shadow-sm transition-all">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#F1503C] to-[#dc2626] text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-[#F1503C]/30 flex-shrink-0">
              MR
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Framtagen av Mats Romblad</h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 dark:bg-red-950/80 text-[#F1503C] border border-red-200 dark:border-red-900/60">
                  <Building2 className="w-3 h-3" />
                  WSP Sverige
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <Award className="w-3 h-3" />
                  Utvecklare & Initiativtagare
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
                Framtagen på <strong>WSP Sverige</strong> för att ge medarbetare, konsulter, rådgivare och anbudsteam ett modernt, kostnadsfritt och intelligent verktyg för omvärldsbevakning och anbudsarbete inom samhällsbyggnad, teknik, IT och miljö.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:self-center border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 dark:border-slate-800">
            <a
              href="mailto:mats.romblad@wsp.com"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F1503C] hover:bg-[#dc2626] text-white text-xs font-bold shadow-md shadow-[#F1503C]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Mail className="w-4 h-4" />
              <span>mats.romblad@wsp.com</span>
            </a>
            <button
              onClick={handleCopyEmail}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
              title="Kopiera e-postadress"
            >
              {copiedEmail ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">Kopierad!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-400" />
                  <span>Kopiera e-post</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Data Source & Replaced Services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Data Sources & Scope */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-ted-100 dark:bg-ted-950 text-ted-600 dark:text-ted-400 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Var hämtas datan ifrån?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Officiella förstahandskällor inom EU och Sverige</p>
            </div>
          </div>

          <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-ted-500" />
                  TED (Tenders Electronic Daily)
                </span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  Officiell EU-källa
                </span>
              </div>
              <p>
                TED är EU:s officiella databas för offentlig upphandling och publiceras dagligen av <strong>Europeiska unionens publikationskontor</strong> (Publications Office of the European Union).
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  TED Search API v3 (Realtid)
                </span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  api.ted.europa.eu
                </span>
              </div>
              <p>
                Applikationen anropar direkt TED:s moderna <strong>Search API v3</strong> med stöd för eForms-standarden. Detta ger omedelbar tillgång till nya annonser utan fördröjning.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-orange-500" />
                  Magnit Source Portal (VMS)
                </span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300">
                  Konsultmäklarflöde
                </span>
              </div>
              <p>
                Direkt integration som kontinuerligt fångar resursförfrågningar och avrop från beställare som <strong>Trafikförvaltningen (SL)</strong>, <strong>Vattenfall</strong>, <strong>Swedavia</strong> och <strong>Stockholm Exergi</strong>.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-teal-500" />
                  Verama / Ework Group
                </span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                  Öppen konsultportal
                </span>
              </div>
              <p>
                Övervakar öppna konsultuppdrag, specialistroller och RFI-förfrågningar från <strong>Ework-nätverket</strong> inom IT, teknik, infrastruktur och förvaltning.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-purple-500" />
                  Svenska & Europeiska lagar (LOU, LUF m.fl.)
                </span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                  Tröskelvärden
                </span>
              </div>
              <p>
                Alla svenska upphandlingar över tröskelvärdena i <strong>LOU</strong>, <strong>LUF</strong>, <strong>LUFS</strong> och <strong>LUK</strong> måste enligt lag kungöras i TED. Därmed täcks samtliga större kommunala, regionala och statliga upphandlingar i Sverige samt i Norden och hela EU/EES.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <a
              href="https://ted.europa.eu"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-ted-600 dark:text-ted-400 hover:underline"
            >
              <span>Besök officiella TED-portalen</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a
              href="https://www.upphandlingsmyndigheten.se"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:underline"
            >
              <span>Upphandlingsmyndigheten</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Right Column: Replaces commercial monitoring tools */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Vilka tjänster ersätter appen?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Alternativ till kommersiella bevakningstjänster</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {replacedServices.map((service, index) => (
              <div
                key={index}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 flex flex-col gap-1 transition-colors hover:border-ted-300 dark:hover:border-ted-700"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 dark:text-white">
                    {service.name}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Ersätts av WSP TED Bevakare
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  {service.description}
                </p>
                <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium pt-0.5">
                  <span className="text-wsp-500 font-semibold">Fördel för WSP: </span>
                  {service.replacementReason}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Key Advantages Grid */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-8 shadow-sm space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Varför använda <span className="text-[#F1503C]">WSP</span> TED Bevakare?</h3>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
            Kombinationen av direkt API-access, MiniMax-M3 LLM och integrerad Kanban-pipeline skapar ett komplett anbudsflöde.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {keyAdvantages.map((adv, index) => (
            <div
              key={index}
              className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 transition-all hover:shadow-sm space-y-2.5"
            >
              <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-xs">
                {adv.icon}
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">{adv.title}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{adv.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Technical Stack & Architecture */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Teknisk Arkitektur</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Modern och pålitlig fullstack-lösning</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
            <span className="font-bold text-slate-900 dark:text-white block text-sm">Frontend</span>
            <p className="text-slate-600 dark:text-slate-300">React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Date-fns, React-Markdown.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
            <span className="font-bold text-slate-900 dark:text-white block text-sm">Backend & Motor</span>
            <p className="text-slate-600 dark:text-slate-300">Node.js, Express, REST API, Node-Cron schemaläggare för bakgrundspollning, XLSX export.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
            <span className="font-bold text-slate-900 dark:text-white block text-sm">AI / LLM</span>
            <p className="text-slate-600 dark:text-slate-300">MiniMax-M3 LLM (Anthropic-kompatibel API) för semantisk sökning, skall-kravsanalys och Copilot-chatt.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
            <span className="font-bold text-slate-900 dark:text-white block text-sm">Databas & SSO</span>
            <p className="text-slate-600 dark:text-slate-300">Supabase PostgreSQL med Row Level Security (RLS), Google/GitHub SSO samt lokal SQLite fallback.</p>
          </div>
        </div>
      </div>

      {/* FAQ Accordion */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Vanliga frågor & svar</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Allt du behöver veta om datakällor, regelverk och funktioner</p>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {faqs.map((faq, index) => (
            <div key={index} className="py-3.5">
              <button
                onClick={() => toggleFaq(index)}
                className="w-full flex items-center justify-between text-left gap-4 group"
              >
                <span className="font-semibold text-xs md:text-sm text-slate-800 dark:text-slate-200 group-hover:text-ted-600 dark:group-hover:text-ted-400 transition-colors">
                  {faq.question}
                </span>
                <span className="text-slate-400 text-sm font-bold flex-shrink-0">
                  {openFaq === index ? '−' : '+'}
                </span>
              </button>
              {openFaq === index && (
                <div className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed animate-fadeIn">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer Contact Info */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-100 to-ted-50 dark:from-slate-900 dark:to-ted-950/40 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div>
          <h4 className="font-bold text-sm text-slate-900 dark:text-white">Vill du veta mer eller bidra till utvecklingen?</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">Kontakta Mats Romblad på WSP för frågor, idéer eller anpassningar.</p>
        </div>
        <a
          href="mailto:mats.romblad@wsp.com"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ted-600 hover:bg-ted-700 text-white text-xs font-bold shadow-md shadow-ted-600/20 transition-all hover:scale-105"
        >
          <Mail className="w-4 h-4" />
          <span>mats.romblad@wsp.com</span>
        </a>
      </div>
    </div>
  );
};
