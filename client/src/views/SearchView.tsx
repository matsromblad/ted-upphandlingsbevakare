import React, { useState, useEffect } from 'react';
import {
  Search,
  Sparkles,
  SlidersHorizontal,
  Bell,
  Bookmark,
  ExternalLink,
  Clock,
  Building,
  MapPin,
  Calendar,
  Tag,
  Grid,
  List,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Code2,
  CheckCircle,
  CheckCircle2,
  Layers,
  HelpCircle,
  RefreshCw,
  AlertCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { Notice, NoticeFilters, FormType, DatePreset, SavedTender } from '../types';
import { api } from '../api';
import { CpvSelectorModal } from '../components/CpvSelectorModal';
import { CreateWatchlistModal } from '../components/CreateWatchlistModal';
import { getDeadlineInfo } from '../utils/dateUtils';

interface SearchViewProps {
  onOpenNoticeDetail: (notice: Notice) => void;
  savedTenders: SavedTender[];
  onTenderSaved: () => void;
  initialFilters?: NoticeFilters;
  onWatchlistCreated: () => void;
}

export const SearchView: React.FC<SearchViewProps> = ({
  onOpenNoticeDetail,
  savedTenders,
  onTenderSaved,
  initialFilters,
  onWatchlistCreated
}) => {
  // Search Filters state
  const [keywords, setKeywords] = useState('');
  const [countries, setCountries] = useState<string[]>(['SWE']);
  const [allCountries, setAllCountries] = useState(false);
  const [selectedCpvs, setSelectedCpvs] = useState<string[]>([]);
  const [formType, setFormType] = useState<FormType>('competition');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [onlyActive, setOnlyActive] = useState<boolean>(true);
  const [rawQuery, setRawQuery] = useState('');
  const [showExpertMode, setShowExpertMode] = useState(false);

  // AI Smart Search state
  const [smartPrompt, setSmartPrompt] = useState('');
  const [smartSearching, setSmartSearching] = useState(false);
  const [smartExplanation, setSmartExplanation] = useState('');

  // Results & Pagination state
  const [notices, setNotices] = useState<Notice[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [generatedQuery, setGeneratedQuery] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [error, setError] = useState<string | null>(null);

  // Table Sorting state
  const [sortField, setSortField] = useState<'id' | 'title' | 'buyer' | 'location' | 'publicationDate' | 'deadline'>('publicationDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Modals
  const [isCpvModalOpen, setIsCpvModalOpen] = useState(false);
  const [isWatchlistModalOpen, setIsWatchlistModalOpen] = useState(false);

  const countryOptions = [
    { code: 'SWE', label: 'Sverige' },
    { code: 'DNK', label: 'Danmark' },
    { code: 'NOR', label: 'Norge' },
    { code: 'FIN', label: 'Finland' },
    { code: 'DEU', label: 'Tyskland' },
    { code: 'FRA', label: 'Frankrike' },
    { code: 'NLD', label: 'Nederländerna' }
  ];

  // Initial load
  useEffect(() => {
    executeSearch(1);
  }, []);

  const getActiveFilters = (): NoticeFilters => {
    return {
      keywords: keywords.trim() || undefined,
      countries: allCountries ? undefined : countries,
      allCountries,
      cpv: selectedCpvs.length > 0 ? selectedCpvs : undefined,
      formType,
      datePreset,
      onlyActive,
      rawQuery: showExpertMode && rawQuery.trim() ? rawQuery.trim() : undefined
    };
  };

  const executeSearch = async (targetPage = 1) => {
    setLoading(true);
    setError(null);
    try {
      const filters = getActiveFilters();
      const res = await api.searchTed(filters, targetPage, 20);

      if (res.success) {
        setNotices(res.notices || []);
        setTotalCount(res.totalCount || 0);
        setPage(res.page || 1);
        setTotalPages(res.totalPages || 1);
        setGeneratedQuery(res.query || '');
      } else {
        setError(res.error || 'Sökningen misslyckades.');
      }
    } catch (err: any) {
      setError(err.message || 'Ett fel uppstod vid hämtning av upphandlingar.');
    } finally {
      setLoading(false);
    }
  };

  const handleSmartSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smartPrompt.trim() || smartSearching) return;

    setSmartSearching(true);
    setSmartExplanation('');
    setError(null);

    try {
      const res = await api.smartSearch(smartPrompt);
      if (res.success && res.filters) {
        const f = res.filters;
        if (f.keywords) setKeywords(f.keywords);
        if (f.cpv && f.cpv.length > 0) setSelectedCpvs(f.cpv);
        if (f.countries && f.countries.length > 0) {
          setCountries(f.countries);
          setAllCountries(false);
        }
        if (f.formType) setFormType(f.formType);
        if (f.datePreset) setDatePreset(f.datePreset);
        if (f.explanation) setSmartExplanation(f.explanation);

        // Perform search with newly applied filters
        const searchFilters: NoticeFilters = {
          keywords: f.keywords,
          cpv: f.cpv,
          countries: f.countries,
          formType: f.formType,
          datePreset: f.datePreset,
          onlyActive
        };
        const searchRes = await api.searchTed(searchFilters, 1, 20);
        if (searchRes.success) {
          setNotices(searchRes.notices || []);
          setTotalCount(searchRes.totalCount || 0);
          setPage(1);
          setTotalPages(searchRes.totalPages || 1);
          setGeneratedQuery(searchRes.query || '');
        }
      }
    } catch (err: any) {
      setError(`MiniMax Smart Search fel: ${err.message}`);
    } finally {
      setSmartSearching(false);
    }
  };

  const handleCountryToggle = (code: string) => {
    if (countries.includes(code)) {
      if (countries.length > 1) {
        setCountries(countries.filter(c => c !== code));
      }
    } else {
      setCountries([...countries, code]);
    }
    setAllCountries(false);
  };

  const handleSaveToPipeline = async (notice: Notice, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.saveToPipeline(notice);
      onTenderSaved();
    } catch (err) {
      console.error('Failed to save:', err);
    }
  };

  const isTenderSaved = (noticeId: string) => {
    return savedTenders.some(t => t.notice_id === noticeId);
  };

  const handleSortToggle = (field: 'id' | 'title' | 'buyer' | 'location' | 'publicationDate' | 'deadline') => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'publicationDate' || field === 'deadline' ? 'desc' : 'asc');
    }
  };

  const sortedNotices = React.useMemo(() => {
    if (!notices || notices.length === 0) return [];
    return [...notices].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      switch (sortField) {
        case 'id':
          valA = a.publicationNumber || a.id || '';
          valB = b.publicationNumber || b.id || '';
          break;
        case 'title':
          valA = (a.title || '').toLowerCase();
          valB = (b.title || '').toLowerCase();
          break;
        case 'buyer':
          valA = (a.buyer || '').toLowerCase();
          valB = (b.buyer || '').toLowerCase();
          break;
        case 'location':
          valA = `${a.city || ''} ${a.country || ''}`.trim().toLowerCase();
          valB = `${b.city || ''} ${b.country || ''}`.trim().toLowerCase();
          break;
        case 'publicationDate':
          valA = a.publicationDate || '';
          valB = b.publicationDate || '';
          break;
        case 'deadline':
          valA = a.deadline || '';
          valB = b.deadline || '';
          break;
        default:
          valA = a.publicationDate || '';
          valB = b.publicationDate || '';
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [notices, sortField, sortDirection]);

  return (
    <div className="space-y-6 pb-12">
      
      {/* MiniMax Natural Language Search Hero Card */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 text-white p-6 sm:p-8 shadow-xl border border-indigo-800/40 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -top-20 w-80 h-80 bg-ted-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left Column: Smart Search */}
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-200 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              <span>MiniMax-M3 Smart Sökassistent</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              Hitta rätt upphandlingar i EU & Sverige
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Beskriv vad ditt företag säljer med egna ord, så genererar MiniMax optimala CPV-koder och TED-sökfilter automatiskt.
            </p>

            <form onSubmit={handleSmartSearch} className="flex flex-col sm:flex-row gap-2 pt-1">
              <div className="relative flex-1">
                <Sparkles className="w-4 h-4 text-purple-400 absolute left-4 top-3.5" />
                <input
                  type="text"
                  value={smartPrompt}
                  onChange={(e) => setSmartPrompt(e.target.value)}
                  placeholder="t.ex. Hitta upphandlingar för BIM-samordning och digital informationshantering i Sverige..."
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/10 dark:bg-slate-900/60 border border-white/20 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 backdrop-blur-md"
                />
              </div>
              <button
                type="submit"
                disabled={!smartPrompt.trim() || smartSearching}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-purple-600/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2 flex-shrink-0"
              >
                {smartSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    MiniMax tolkar...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Smart Sök
                  </>
                )}
              </button>
            </form>

            {/* AI Explanation Pill */}
            {smartExplanation && (
              <div className="p-3.5 rounded-xl bg-purple-900/40 border border-purple-500/30 text-xs text-purple-200 flex items-start gap-2 animate-fadeIn">
                <CheckCircle className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white">AI-tolkning:</span> {smartExplanation}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Replaced Systems & Coverage Card */}
          <div className="lg:col-span-5 bg-white/10 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl p-5 border border-white/15 dark:border-purple-500/30 shadow-inner flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-300" />
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-200">
                    Ersätter & Konsoliderar
                  </span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Allt-i-ett
                </span>
              </div>

              <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
                Samlar direktdata från officiella källor och ersätter separata dyra bevaknings- och anbudsverktyg:
              </p>

              {/* System Badges Grid */}
              <div className="grid grid-cols-2 gap-2 mt-3.5">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 dark:bg-slate-800/80 border border-white/10 dark:border-slate-700/60 text-xs font-semibold text-white shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0" />
                  <span className="truncate">Tendium</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 dark:bg-slate-800/80 border border-white/10 dark:border-slate-700/60 text-xs font-semibold text-white shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                  <span className="truncate">Kommers Annons</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 dark:bg-slate-800/80 border border-white/10 dark:border-slate-700/60 text-xs font-semibold text-white shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                  <span className="truncate">e-Avrop</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 dark:bg-slate-800/80 border border-white/10 dark:border-slate-700/60 text-xs font-semibold text-white shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                  <span className="truncate">Mercell / Opic</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 dark:bg-slate-800/80 border border-white/10 dark:border-slate-700/60 text-xs font-semibold text-white shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0" />
                  <span className="truncate">Visma TendSign</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 dark:bg-slate-800/80 border border-white/10 dark:border-slate-700/60 text-xs font-semibold text-white shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-teal-400 flex-shrink-0" />
                  <span className="truncate">TED (EU Live Feed)</span>
                </div>
              </div>
            </div>

            {/* TED Official Link & Description */}
            <div className="p-3 rounded-xl bg-white/5 dark:bg-slate-850/80 border border-white/10 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-1.5 text-xs">
                  <ExternalLink className="w-3.5 h-3.5 text-ted-400" />
                  Vad är TED?
                </span>
                <a
                  href="https://ted.europa.eu/sv/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-purple-300 hover:text-purple-200 hover:underline font-semibold inline-flex items-center gap-1"
                >
                  ted.europa.eu/sv
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                <strong>TED (Tenders Electronic Daily)</strong> är EU:s officiella databas där alla svenska och europeiska offentliga upphandlingar över tröskelvärdena måste publiceras enligt lag.
              </p>
            </div>

            {/* Bottom Benefit Footer */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                Officiellt TED API
              </span>
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-300 flex-shrink-0" />
                MiniMax AI-analys
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Classical Search & Filter Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-ted-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Sökfilter & Avgränsningar</h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowExpertMode(!showExpertMode)}
              className="text-xs font-semibold text-slate-500 hover:text-ted-600 dark:hover:text-ted-400 flex items-center gap-1"
            >
              <Code2 className="w-3.5 h-3.5" />
              {showExpertMode ? 'Dölj TED Expert Query' : 'Visa TED Expert Query'}
            </button>
          </div>
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Keyword Search */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Fritext / Sökord / ID</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && executeSearch(1)}
                placeholder="t.ex. CAD/BIM, 489981-2026, konsult..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-ted-500"
              />
            </div>
          </div>

          {/* CPV Code Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">CPV-koder (Bransch)</label>
            <button
              type="button"
              onClick={() => setIsCpvModalOpen(true)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 text-left flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors"
            >
              <span className="truncate">
                {selectedCpvs.length === 0 ? 'Alla branscher (CPV)' : `${selectedCpvs.length} CPV-koder valda`}
              </span>
              <Tag className="w-3.5 h-3.5 text-ted-600 flex-shrink-0" />
            </button>
          </div>

          {/* Notice Form Type */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Upphandlingstyp</label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value as FormType)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium"
            >
              <option value="competition">🎯 Anbudsinfordran / Tävling (Aktiv)</option>
              <option value="planning">📅 Förhandsmeddelande / Planering</option>
              <option value="result">🏆 Tilldelningsbeslut / Resultat</option>
              <option value="ALL">🌐 Alla typer</option>
            </select>
          </div>

          {/* Date Presets */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Publiceringsdatum</label>
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value as DatePreset)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium"
            >
              <option value="all">Alla datum (endast aktiva)</option>
              <option value="1d">Senaste 24 timmarna</option>
              <option value="7d">Senaste 7 dagarna</option>
              <option value="14d">Senaste 14 dagarna</option>
              <option value="30d">Senaste 30 dagarna</option>
              <option value="90d">Senaste 90 dagarna</option>
              <option value="365d">Senaste året</option>
            </select>
          </div>
        </div>

        {/* Country Selector Pills & Active Only Toggle */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 mr-1">Geografi:</span>
            {countryOptions.map((c) => {
              const isSelected = !allCountries && countries.includes(c.code);
              return (
                <button
                  type="button"
                  key={c.code}
                  onClick={() => handleCountryToggle(c.code)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-ted-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {c.label} ({c.code})
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setAllCountries(!allCountries)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                allCountries
                  ? 'bg-ted-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Hela EU / EES
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300 select-none">
              <input
                type="checkbox"
                checked={onlyActive}
                onChange={(e) => setOnlyActive(e.target.checked)}
                className="w-4 h-4 rounded text-ted-600 focus:ring-ted-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer"
              />
              <span>Endast aktiva (dölj utgångna)</span>
            </label>

            <button
              onClick={() => setIsWatchlistModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              <Bell className="w-3.5 h-3.5 text-amber-600" />
              Spara som bevakning
            </button>

            <button
              onClick={() => executeSearch(1)}
              disabled={loading}
              className="px-5 py-1.5 rounded-xl bg-ted-600 hover:bg-ted-700 text-white text-xs font-bold shadow-md shadow-ted-600/20 transition-all flex items-center gap-1.5"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              Sök i TED
            </button>
          </div>
        </div>

        {/* Optional Expert Query Bar */}
        {showExpertMode && (
          <div className="p-3 rounded-xl bg-slate-950 text-slate-200 space-y-1.5 font-mono text-xs border border-slate-800 animate-fadeIn">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>TED Expert Query Syntax</span>
              <span>Genererad automatiskt</span>
            </div>
            <textarea
              rows={2}
              value={rawQuery || generatedQuery}
              onChange={(e) => setRawQuery(e.target.value)}
              className="w-full bg-transparent border-none text-emerald-400 focus:outline-none resize-none font-mono text-xs"
            />
          </div>
        )}
      </div>

      {/* Results Header & View Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Sökresultat {totalCount > 0 && <span className="text-ted-600 font-extrabold">({totalCount.toLocaleString('sv-SE')} upphandlingar)</span>}
          </h2>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-ted-600" />}
        </div>

        <div className="flex items-center gap-2">
          {/* View mode switcher */}
          <div className="flex items-center bg-slate-200 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('card')}
              className={`p-1.5 rounded-lg text-xs transition-all ${
                viewMode === 'card' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'
              }`}
              title="Kortvy"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs transition-all ${
                viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'
              }`}
              title="Tabellvy"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Kunde inte slutföra sökningen</p>
            <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* Results Content */}
      {notices.length === 0 && !loading && !error ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white">Inga upphandlingar matchade dina sökkriterier</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Prova att bredda sökningen, ta bort specifika sökord eller ändra datumintervall för att få fler träffar.
          </p>
        </div>
      ) : viewMode === 'card' ? (
        /* CARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notices.map((notice) => {
            const isSaved = isTenderSaved(notice.id);
            const dlInfo = getDeadlineInfo(notice.deadline, notice.deadlineStatus, notice.daysRemaining);

            return (
              <div
                key={notice.id}
                onClick={() => onOpenNoticeDetail(notice)}
                className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group space-y-4 ${
                  dlInfo.isExpired
                    ? 'border-red-300 dark:border-red-800/80 hover:border-red-500 dark:hover:border-red-500 ring-1 ring-red-400/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-ted-400 dark:hover:border-ted-600'
                }`}
              >
                <div className="space-y-2.5">
                  {/* Top metadata tags */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {notice.publicationNumber}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 uppercase">
                        {notice.formType}
                      </span>
                    </div>

                    {/* Deadline Badge */}
                    {dlInfo.hasDeadline && (
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          dlInfo.isExpired
                            ? 'bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300 border border-red-300 dark:border-red-700 font-bold'
                            : dlInfo.status === 'EXPIRING_SOON'
                            ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-bold border border-amber-300'
                            : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        }`}
                      >
                        {dlInfo.isExpired ? (
                          <AlertCircle className="w-3 h-3 text-red-600 dark:text-red-400" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        {dlInfo.isExpired
                          ? `Utgången (${dlInfo.formattedDeadline})`
                          : `${dlInfo.daysRemaining}d kvar`}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-base text-slate-900 dark:text-white leading-snug group-hover:text-ted-600 dark:group-hover:text-ted-400 transition-colors line-clamp-2">
                    {notice.title}
                  </h3>

                  {/* Buyer & Location */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1 font-medium text-slate-900 dark:text-slate-200 truncate max-w-[240px]">
                      <Building className="w-3.5 h-3.5 text-ted-600 flex-shrink-0" />
                      <span className="truncate">{notice.buyer}</span>
                    </span>
                    {notice.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        {notice.city}, {notice.country}
                      </span>
                    )}
                  </div>

                  {/* Description snippet */}
                  {notice.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {notice.description}
                    </p>
                  )}

                  {/* CPV preview pills */}
                  {notice.cpvDetails && notice.cpvDetails.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {notice.cpvDetails.slice(0, 2).map((cpv, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 truncate max-w-[200px]"
                          title={`${cpv.code} - ${cpv.label}`}
                        >
                          {cpv.label}
                        </span>
                      ))}
                      {notice.cpvDetails.length > 2 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                          +{notice.cpvDetails.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Publ: {notice.publicationDate}</span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleSaveToPipeline(notice, e)}
                      className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
                        isSaved
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                      title={isSaved ? 'Sparad i pipeline' : 'Spara till pipeline'}
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>{isSaved ? 'Sparad' : 'Spara'}</span>
                    </button>

                    <button
                      onClick={() => onOpenNoticeDetail(notice)}
                      className="px-3 py-1.5 rounded-lg bg-ted-50 hover:bg-ted-100 dark:bg-ted-950/60 dark:hover:bg-ted-900/60 text-ted-700 dark:text-ted-300 font-semibold flex items-center gap-1"
                    >
                      <span>Detaljer & AI</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider select-none">
                <tr>
                  <th
                    onClick={() => handleSortToggle('id')}
                    className="p-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>TED ID</span>
                      {sortField === 'id' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-ted-600" /> : <ArrowDown className="w-3.5 h-3.5 text-ted-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40 hover:opacity-100" />
                      )}
                    </div>
                  </th>

                  <th
                    onClick={() => handleSortToggle('title')}
                    className="p-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Titel & Beskrivning</span>
                      {sortField === 'title' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-ted-600" /> : <ArrowDown className="w-3.5 h-3.5 text-ted-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40 hover:opacity-100" />
                      )}
                    </div>
                  </th>

                  <th
                    onClick={() => handleSortToggle('buyer')}
                    className="p-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Upphandlare</span>
                      {sortField === 'buyer' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-ted-600" /> : <ArrowDown className="w-3.5 h-3.5 text-ted-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40 hover:opacity-100" />
                      )}
                    </div>
                  </th>

                  <th
                    onClick={() => handleSortToggle('location')}
                    className="p-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Plats</span>
                      {sortField === 'location' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-ted-600" /> : <ArrowDown className="w-3.5 h-3.5 text-ted-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40 hover:opacity-100" />
                      )}
                    </div>
                  </th>

                  <th
                    onClick={() => handleSortToggle('publicationDate')}
                    className="p-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Publicerat</span>
                      {sortField === 'publicationDate' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-ted-600" /> : <ArrowDown className="w-3.5 h-3.5 text-ted-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40 hover:opacity-100" />
                      )}
                    </div>
                  </th>

                  <th
                    onClick={() => handleSortToggle('deadline')}
                    className="p-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Deadline</span>
                      {sortField === 'deadline' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-ted-600" /> : <ArrowDown className="w-3.5 h-3.5 text-ted-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40 hover:opacity-100" />
                      )}
                    </div>
                  </th>

                  <th className="p-3.5 text-right whitespace-nowrap">Åtgärd</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sortedNotices.map((notice) => {
                  const isSaved = isTenderSaved(notice.id);
                  const dlInfo = getDeadlineInfo(notice.deadline, notice.deadlineStatus, notice.daysRemaining);

                  return (
                    <tr
                      key={notice.id}
                      onClick={() => onOpenNoticeDetail(notice)}
                      className={`transition-colors cursor-pointer ${
                        dlInfo.isExpired
                          ? 'bg-red-50/30 dark:bg-red-950/20 hover:bg-red-50/60 dark:hover:bg-red-950/40'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-850/60'
                      }`}
                    >
                      <td className="p-3.5 font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {dlInfo.isExpired && (
                            <span title="Deadline har passerat">
                              <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                            </span>
                          )}
                          <span>{notice.publicationNumber}</span>
                        </div>
                      </td>
                      <td className="p-3.5 max-w-xs">
                        <p className="font-bold text-slate-900 dark:text-white line-clamp-1">{notice.title}</p>
                        <p className="text-slate-500 dark:text-slate-400 line-clamp-1">{notice.description}</p>
                      </td>
                      <td className="p-3.5 font-medium text-slate-800 dark:text-slate-200 max-w-[180px] truncate">
                        {notice.buyer}
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {notice.city || notice.country}
                      </td>
                      <td className="p-3.5 text-slate-700 dark:text-slate-300 whitespace-nowrap font-medium">
                        {notice.publicationDate || '-'}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        {dlInfo.hasDeadline ? (
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${
                              dlInfo.isExpired
                                ? 'bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700 font-bold'
                                : dlInfo.status === 'EXPIRING_SOON'
                                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 font-bold'
                                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                            }`}
                          >
                            {dlInfo.isExpired && <AlertCircle className="w-3 h-3 text-red-600 dark:text-red-400" />}
                            {dlInfo.isExpired ? `Utgången (${dlInfo.formattedDeadline})` : dlInfo.formattedDeadline}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleSaveToPipeline(notice, e)}
                          className={`p-1.5 rounded-lg border text-xs font-semibold ${
                            isSaved
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                              : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <Bookmark className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500">
            Sida <span className="font-bold text-slate-900 dark:text-white">{page}</span> av{' '}
            <span className="font-bold text-slate-900 dark:text-white">{totalPages}</span>
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => executeSearch(page - 1)}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 text-xs font-semibold flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Föregående
            </button>
            <button
              onClick={() => executeSearch(page + 1)}
              disabled={page >= totalPages || loading}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 text-xs font-semibold flex items-center gap-1"
            >
              Nästa <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <CpvSelectorModal
        isOpen={isCpvModalOpen}
        onClose={() => setIsCpvModalOpen(false)}
        selectedCpvs={selectedCpvs}
        onApplyCpvs={(cpvs) => setSelectedCpvs(cpvs)}
      />

      <CreateWatchlistModal
        isOpen={isWatchlistModalOpen}
        onClose={() => setIsWatchlistModalOpen(false)}
        filters={getActiveFilters()}
        defaultName={keywords ? `Bevakning: ${keywords}` : 'Ny Bevakning'}
        onWatchlistCreated={() => {
          onWatchlistCreated();
        }}
      />
    </div>
  );
};
