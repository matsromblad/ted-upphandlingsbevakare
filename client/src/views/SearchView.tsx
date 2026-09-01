import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Sparkles,
  SlidersHorizontal,
  Bell,
  Clock,
  Building,
  Building2,
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
  AlertCircle,
  X,
  RotateCcw,
  Eye,
  EyeOff,
  FileText,
  Upload,
  Paperclip,
  UserCheck,
  Briefcase,
  Trash2,
  Plus
} from 'lucide-react';
import { Notice, NoticeFilters, FormType, DatePreset, SavedTender, CvSearchSummary } from '../types';
import { api } from '../api';
import { CpvSelectorModal } from '../components/CpvSelectorModal';
import { CreateWatchlistModal } from '../components/CreateWatchlistModal';
import { showToast } from '../components/Toast';
import { NoticeCard } from '../components/NoticeCard';
import { NoticeTable } from '../components/NoticeTable';

interface SearchViewProps {
  onOpenNoticeDetail: (notice: Notice) => void;
  savedTenders: SavedTender[];
  onTenderSaved: () => void;
  initialFilters?: NoticeFilters;
  onWatchlistCreated: () => void;
  hiddenNoticeIds?: Set<string>;
  onToggleHideNotice?: (notice: Notice | string, e?: React.MouseEvent) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({
  onOpenNoticeDetail,
  savedTenders,
  onTenderSaved,
  initialFilters,
  onWatchlistCreated,
  hiddenNoticeIds,
  onToggleHideNotice
}) => {
  // Search Filters state
  const [keywords, setKeywords] = useState(initialFilters?.keywords || '');
  const [excludeKeywords, setExcludeKeywords] = useState(initialFilters?.excludeKeywords || '');
  const [buyer, setBuyer] = useState(initialFilters?.buyer || '');
  const [countries, setCountries] = useState<string[]>(initialFilters?.countries || ['SWE']);
  const [allCountries, setAllCountries] = useState(Boolean(initialFilters?.allCountries));
  const [selectedCpvs, setSelectedCpvs] = useState<string[]>(initialFilters?.cpv || []);
  const [formType, setFormType] = useState<FormType>(initialFilters?.formType || 'competition');
  const [datePreset, setDatePreset] = useState<DatePreset>(initialFilters?.datePreset || 'all');
  const [onlyActive, setOnlyActive] = useState<boolean>(initialFilters?.onlyActive !== undefined ? initialFilters.onlyActive : true);
  const [rawQuery, setRawQuery] = useState(initialFilters?.rawQuery || '');
  const [showExpertMode, setShowExpertMode] = useState(false);

  // AI Smart Search & CV Search state
  const [aiSearchMode, setAiSearchMode] = useState<'text' | 'cv'>('text');
  const [smartPrompt, setSmartPrompt] = useState('');
  const [smartSearching, setSmartSearching] = useState(false);
  const [smartExplanation, setSmartExplanation] = useState('');
  const [cvFiles, setCvFiles] = useState<File[]>([]);
  const [cvPrompt, setCvPrompt] = useState('');
  const [cvSearching, setCvSearching] = useState(false);
  const [cvSummary, setCvSummary] = useState<CvSearchSummary | null>(null);
  const [isDraggingCv, setIsDraggingCv] = useState(false);
  const cvFileInputRef = useRef<HTMLInputElement | null>(null);

  // Results & Pagination state
  const [notices, setNotices] = useState<Notice[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [generatedQuery, setGeneratedQuery] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table');
  const [error, setError] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState<boolean>(true);

  // Modals
  const [isCpvModalOpen, setIsCpvModalOpen] = useState(false);
  const [isWatchlistModalOpen, setIsWatchlistModalOpen] = useState(false);

  // Tracks the in-flight search request so a fast filter change can cancel a slower,
  // now-stale request instead of letting it overwrite newer results when it resolves.
  const searchAbortRef = useRef<AbortController | null>(null);

  const countryOptions = [
    { code: 'SWE', label: 'Sverige' },
    { code: 'DNK', label: 'Danmark' },
    { code: 'NOR', label: 'Norge' },
    { code: 'FIN', label: 'Finland' },
    { code: 'DEU', label: 'Tyskland' },
    { code: 'FRA', label: 'Frankrike' },
    { code: 'NLD', label: 'Nederländerna' }
  ];

  const popularBuyers = [
    { label: 'Trafikverket', value: 'Trafikverket', badge: 'Populär' },
    { label: 'Region Stockholm', value: 'Region Stockholm' },
    { label: 'Västfastigheter', value: 'Västfastigheter' },
    { label: 'Svenska kraftnät', value: 'Svenska kraftnät' },
    { label: 'Göteborgs Stad', value: 'Göteborgs Stad' },
    { label: 'Försvarsmakten / FMV', value: 'Försvarsmakten' },
    { label: 'Stockholm Vatten', value: 'Stockholm Vatten' },
    { label: 'Specialfastigheter', value: 'Specialfastigheter' }
  ];

  // Initial load or when initialFilters change
  useEffect(() => {
    if (initialFilters) {
      if (initialFilters.keywords !== undefined) setKeywords(initialFilters.keywords);
      if (initialFilters.excludeKeywords !== undefined) setExcludeKeywords(initialFilters.excludeKeywords);
      if (initialFilters.buyer !== undefined) setBuyer(initialFilters.buyer);
      if (initialFilters.countries) setCountries(initialFilters.countries);
      if (initialFilters.allCountries !== undefined) setAllCountries(initialFilters.allCountries);
      if (initialFilters.cpv) setSelectedCpvs(initialFilters.cpv);
      if (initialFilters.formType) setFormType(initialFilters.formType);
      if (initialFilters.datePreset) setDatePreset(initialFilters.datePreset);
      if (initialFilters.onlyActive !== undefined) setOnlyActive(initialFilters.onlyActive);
      if (initialFilters.rawQuery) setRawQuery(initialFilters.rawQuery);
    }
    executeSearch(1);
  }, []);

  const getActiveFilters = (): NoticeFilters => {
    return {
      keywords: keywords.trim() || undefined,
      excludeKeywords: excludeKeywords.trim() || undefined,
      buyer: buyer.trim() || undefined,
      countries: allCountries ? undefined : countries,
      allCountries,
      cpv: selectedCpvs.length > 0 ? selectedCpvs : undefined,
      formType,
      datePreset,
      onlyActive,
      rawQuery: showExpertMode && rawQuery.trim() ? rawQuery.trim() : undefined
    };
  };

  const executeSearch = async (targetPage = 1, customFilters?: NoticeFilters) => {
    // Cancel any still-in-flight search so its (now stale) response can't land after this
    // newer one and overwrite fresher results.
    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const filters = customFilters || getActiveFilters();
      const res = await api.searchTed(filters, targetPage, 20, controller.signal);
      if (controller.signal.aborted) return;

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
      if (err?.name === 'AbortError') return;
      setError(err.message || 'Ett fel uppstod vid hämtning av upphandlingar.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
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
        if (f.buyer !== undefined) setBuyer(f.buyer || '');
        if (f.keywords !== undefined) setKeywords(f.keywords || '');
        if (f.cpv && f.cpv.length > 0) setSelectedCpvs(f.cpv);
        else if (f.cpv && f.cpv.length === 0) setSelectedCpvs([]);
        
        if (f.countries && f.countries.length > 0) {
          setCountries(f.countries);
          setAllCountries(false);
        }
        if (f.formType) setFormType(f.formType);
        if (f.datePreset) setDatePreset(f.datePreset);
        if (f.explanation) setSmartExplanation(f.explanation);

        // Perform search with newly applied filters
        const searchFilters: NoticeFilters = {
          buyer: f.buyer || undefined,
          keywords: f.keywords || undefined,
          cpv: f.cpv && f.cpv.length > 0 ? f.cpv : undefined,
          countries: f.countries,
          formType: f.formType,
          datePreset: f.datePreset,
          onlyActive
        };
        await executeSearch(1, searchFilters);
      }
    } catch (err: any) {
      setError(`MiniMax Smart Search fel: ${err.message}`);
    } finally {
      setSmartSearching(false);
    }
  };

  const handleCvFileSelect = (newFiles: FileList | File[] | null) => {
    if (!newFiles || newFiles.length === 0) return;
    const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt', '.rtf'];
    const validFiles: File[] = [];

    const fileListArray = Array.from(newFiles);
    for (const file of fileListArray) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (allowedExtensions.includes(ext)) {
        if (!cvFiles.some(f => f.name === file.name && f.size === file.size)) {
          validFiles.push(file);
        }
      } else {
        showToast('error', `Filen "${file.name}" stöds inte. Använd PDF, Word eller TXT.`);
      }
    }

    if (validFiles.length > 0) {
      setCvFiles(prev => [...prev, ...validFiles]);
      showToast('info', `${validFiles.length} CV-fil(er) tillagda för analys.`);
    }
  };

  const handleRemoveCvFile = (index: number) => {
    setCvFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleCvSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (cvFiles.length === 0 || cvSearching) return;

    setCvSearching(true);
    setError(null);
    setSmartExplanation('');

    try {
      const res = await api.cvSearch(cvFiles, cvPrompt.trim(), countries);
      if (res.success && res.filters) {
        const f = res.filters;
        if (f.buyer !== undefined) setBuyer(f.buyer || '');
        if (f.keywords !== undefined) setKeywords(f.keywords || '');
        if (f.excludeKeywords !== undefined) setExcludeKeywords(f.excludeKeywords || '');
        if (f.cpv && f.cpv.length > 0) setSelectedCpvs(f.cpv);
        else if (f.cpv && f.cpv.length === 0) setSelectedCpvs([]);

        if (f.countries && f.countries.length > 0) {
          setCountries(f.countries);
          setAllCountries(false);
        }
        if (f.formType) setFormType(f.formType);
        if (f.datePreset) setDatePreset(f.datePreset);
        if (f.explanation) setSmartExplanation(f.explanation);

        if (res.cvSummary) {
          setCvSummary(res.cvSummary);
        }

        // Execute search with extracted filters
        const searchFilters: NoticeFilters = {
          buyer: f.buyer || undefined,
          keywords: f.keywords || undefined,
          excludeKeywords: f.excludeKeywords || undefined,
          cpv: f.cpv && f.cpv.length > 0 ? f.cpv : undefined,
          countries: f.countries,
          formType: f.formType,
          datePreset: f.datePreset,
          onlyActive
        };

        await executeSearch(1, searchFilters);
        showToast('success', `CV-matchning klar! ${cvFiles.length} CV:n analyserades.`);
      } else {
        setError(res.error || 'CV-sökningen misslyckades.');
      }
    } catch (err: any) {
      setError(`CV-sökningsfel: ${err.message}`);
    } finally {
      setCvSearching(false);
    }
  };

  const handleSelectBuyerChip = (bVal: string) => {
    const newBuyer = buyer === bVal ? '' : bVal;
    setBuyer(newBuyer);
    const updatedFilters = {
      ...getActiveFilters(),
      buyer: newBuyer || undefined
    };
    executeSearch(1, updatedFilters);
  };

  const handleResetFilters = () => {
    setKeywords('');
    setExcludeKeywords('');
    setBuyer('');
    setCountries(['SWE']);
    setAllCountries(false);
    setSelectedCpvs([]);
    setFormType('competition');
    setDatePreset('all');
    setOnlyActive(true);
    setRawQuery('');
    setSmartExplanation('');
    setCvFiles([]);
    setCvPrompt('');
    setCvSummary(null);
    executeSearch(1, {
      countries: ['SWE'],
      formType: 'competition',
      datePreset: 'all',
      onlyActive: true
    });
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
      const res = await api.saveToPipeline(notice);
      if (res.success) {
        onTenderSaved();
      } else {
        showToast('error', res.error || 'Kunde inte spara upphandlingen till pipeline.');
      }
    } catch (err: any) {
      console.error('Failed to save:', err);
      showToast('error', err?.message || 'Kunde inte spara upphandlingen till pipeline.');
    }
  };

  const isTenderSaved = (noticeId: string) => {
    return savedTenders.some(t => t.notice_id === noticeId);
  };

  const hiddenCountInResults = notices.filter(n => hiddenNoticeIds?.has(n.id)).length;
  const displayedNotices = React.useMemo(() => {
    if (showHidden) return notices;
    return notices.filter(n => !hiddenNoticeIds?.has(n.id));
  }, [notices, showHidden, hiddenNoticeIds]);

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Coverage & Overview Card */}
      <div className="rounded-3xl bg-white dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6 sm:p-7 shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden">
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-red-500/5 dark:bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -top-20 w-80 h-80 bg-slate-500/5 dark:bg-slate-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-6 space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
              Hitta rätt upphandlingar i EU & Sverige
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Direktåtkomst till EU:s officiella databas TED (Tenders Electronic Daily). Bevaka, analysera och vinn offentliga kontrakt.
            </p>
          </div>

          <div className="lg:col-span-6 bg-slate-50 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-700 dark:text-purple-300" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-purple-200">
                  Ersätter & Konsoliderar
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Allt-i-ett
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-center">
              {['Magnit', 'Verama', 'TendSign', 'Kommers', 'e-Avrop', 'Mercell/Opic', 'TED Feed'].map((name) => (
                <div key={name} className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate shadow-2xs">
                  {name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MiniMax Natural Language & CV Smart Search Box */}
      <div className="rounded-3xl bg-gradient-to-r from-red-50/60 via-purple-50/50 to-white dark:from-slate-900 dark:via-slate-900 dark:to-purple-950/60 p-5 sm:p-6 shadow-sm border border-red-100 dark:border-purple-900/40 relative overflow-hidden space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/40 border border-purple-200 dark:border-purple-800/60 text-purple-800 dark:text-purple-200 text-xs font-bold backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-300" />
              <span>MiniMax-M3 AI Matchning</span>
            </div>

            {/* Mode Switcher */}
            <div className="inline-flex rounded-xl bg-slate-200/80 dark:bg-slate-800 p-0.5 border border-slate-300/60 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setAiSearchMode('text')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  aiSearchMode === 'text'
                    ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Fritext (NLP)
              </button>
              <button
                type="button"
                onClick={() => setAiSearchMode('cv')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  aiSearchMode === 'cv'
                    ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Ladda upp CV:n
                {cvFiles.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-purple-600 text-white text-[10px] font-bold">
                    {cvFiles.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
            {aiSearchMode === 'text'
              ? 'Beskriv vad du söker med egna ord – MiniMax matchar automatiskt CPV-koder och TED-sökfilter'
              : 'Ladda upp 1 eller flera CV:n (PDF, Word, TXT) för att hitta skräddarsydda upphandlingar & konsultuppdrag'}
          </span>
        </div>

        {aiSearchMode === 'text' ? (
          <form onSubmit={handleSmartSearch} className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 absolute left-4 top-3.5" />
              <input
                type="text"
                value={smartPrompt}
                onChange={(e) => setSmartPrompt(e.target.value)}
                placeholder="t.ex. Hitta upphandlingar för BIM-samordning och digital informationshantering i Sverige..."
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 shadow-xs"
              />
            </div>
            <button
              type="submit"
              disabled={!smartPrompt.trim() || smartSearching}
              className="px-7 py-3 rounded-2xl bg-[#F1503C] hover:bg-[#dc2626] text-white font-bold text-sm shadow-md shadow-[#F1503C]/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 flex-shrink-0"
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
        ) : (
          /* CV Upload & Matching Mode */
          <div className="space-y-3.5">
            {/* Dropzone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingCv(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDraggingCv(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingCv(false);
                handleCvFileSelect(e.dataTransfer.files);
              }}
              onClick={() => cvFileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
                isDraggingCv
                  ? 'border-purple-500 bg-purple-100/60 dark:bg-purple-950/60 scale-[1.01]'
                  : 'border-purple-300 dark:border-purple-800/80 bg-white/70 dark:bg-slate-850/60 hover:bg-purple-50/50 dark:hover:bg-purple-950/30'
              }`}
            >
              <input
                ref={cvFileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.doc,.txt,.rtf"
                className="hidden"
                onChange={(e) => handleCvFileSelect(e.target.files)}
              />
              <div className="flex flex-col items-center justify-center gap-2 text-xs">
                <div className="w-11 h-11 rounded-2xl bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-300 flex items-center justify-center shadow-xs">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    Klicka för att välja eller dra och släpp CV-filer här
                  </span>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                    Stödjer flera filer samtidigt (.pdf, .docx, .doc, .txt, .rtf)
                  </p>
                </div>
              </div>
            </div>

            {/* Selected CV files pill list */}
            {cvFiles.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Valda CV-dokument ({cvFiles.length} st):
                  </span>
                  <button
                    type="button"
                    onClick={() => setCvFiles([])}
                    className="text-red-500 hover:text-red-600 font-medium text-[11px] flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Rensa alla
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {cvFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 shadow-xs"
                    >
                      <FileText className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                      <span className="font-semibold truncate max-w-[200px]">{file.name}</span>
                      <span className="text-[10px] text-slate-400">({(file.size / 1024).toFixed(0)} KB)</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveCvFile(idx);
                        }}
                        className="p-0.5 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Optional CV Prompt & Search Action */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Paperclip className="w-4 h-4 text-purple-500 absolute left-4 top-3.5" />
                <input
                  type="text"
                  value={cvPrompt}
                  onChange={(e) => setCvPrompt(e.target.value)}
                  placeholder="Valfri kompletterande instruktion (t.ex. 'Prioritera Trafikverket eller SL', 'Sök endast ramavtal')..."
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 shadow-xs"
                />
              </div>
              <button
                type="button"
                onClick={() => handleCvSearch()}
                disabled={cvFiles.length === 0 || cvSearching}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-[#F1503C] hover:from-purple-700 hover:to-[#dc2626] text-white font-bold text-sm shadow-md shadow-purple-600/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 flex-shrink-0"
              >
                {cvSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyserar CV:n...</span>
                  </>
                ) : (
                  <>
                    <Briefcase className="w-4 h-4" />
                    <span>Matcha mot upphandlingar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* CV Profile Match Result Card */}
        {cvSummary && (
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800/80 shadow-md space-y-3 animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-300 flex items-center justify-center font-bold">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    Identifierad CV-profil & Sökkriterier
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Baserat på: {cvSummary.fileNames.join(', ')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsWatchlistModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <Bell className="w-3.5 h-3.5" />
                  Skapa bevakning för dessa CV:n
                </button>

                <button
                  type="button"
                  onClick={() => setCvSummary(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                  title="Stäng matchningsöversikt"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              {cvSummary.profilesIdentified && cvSummary.profilesIdentified.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Identifierade roller:</span>
                  {cvSummary.profilesIdentified.map((role, idx) => (
                    <span key={idx} className="px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-semibold text-[11px]">
                      {role}
                    </span>
                  ))}
                </div>
              )}

              {cvSummary.skills && cvSummary.skills.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Kärnkompetenser:</span>
                  {cvSummary.skills.map((skill, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              {cvSummary.explanation && (
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed pt-1 text-[11px] sm:text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">AI-motivering: </span>
                  {cvSummary.explanation}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Standard AI Explanation Pill (if not cvSummary) */}
        {!cvSummary && smartExplanation && (
          <div className="p-3.5 rounded-xl bg-purple-100/70 dark:bg-purple-900/50 border border-purple-200 dark:border-purple-700/50 text-xs text-purple-900 dark:text-purple-200 flex items-start gap-2 animate-fadeIn">
            <CheckCircle className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900 dark:text-white">AI-tolkning:</span> {smartExplanation}
            </div>
          </div>
        )}
      </div>

      {/* Classical Search & Filter Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
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
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-ted-500"
              />
            </div>
          </div>

          {/* Exclude Keywords */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Exkludera sökord</label>
            <div className="relative">
              <X className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={excludeKeywords}
                onChange={(e) => setExcludeKeywords(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && executeSearch(1)}
                placeholder="t.ex. arkitektur, design..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-ted-500"
              />
            </div>
          </div>

          {/* Buyer / Contracting Authority Search */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Upphandlande organisation</label>
              {buyer && (
                <button
                  type="button"
                  onClick={() => {
                    setBuyer('');
                    const updatedFilters = { ...getActiveFilters(), buyer: undefined };
                    executeSearch(1, updatedFilters);
                  }}
                  className="text-[10px] text-red-500 hover:text-red-600 font-semibold"
                >
                  Rensa
                </button>
              )}
            </div>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={buyer}
                onChange={(e) => setBuyer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && executeSearch(1)}
                placeholder="t.ex. Trafikverket, Region Stockholm..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-ted-500 font-medium"
              />
            </div>
          </div>

          {/* CPV Code Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">CPV-koder (Bransch)</label>
            <button
              type="button"
              onClick={() => setIsCpvModalOpen(true)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 text-left flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors"
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
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium"
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
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium"
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

        {/* Popular Buyers Shortcut Bar */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
            <Building className="w-3 h-3 text-slate-400" />
            Populära beställare:
          </span>
          {popularBuyers.map((pb) => {
            const isSelected = buyer.toLowerCase() === pb.value.toLowerCase();
            return (
              <button
                type="button"
                key={pb.value}
                onClick={() => handleSelectBuyerChip(pb.value)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#F1503C] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60'
                }`}
              >
                <span>{pb.label}</span>
                {pb.badge && !isSelected && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-red-100 text-[#F1503C] dark:bg-red-950/60 dark:text-red-300 font-bold uppercase">
                    {pb.badge}
                  </span>
                )}
                {isSelected && (
                  <span className="text-[10px] ml-0.5 opacity-80">✕</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Country Selector Pills & Action Bar */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 mr-1">Geografi:</span>
            {countryOptions.map((c) => {
              const isSelected = !allCountries && countries.includes(c.code);
              return (
                <button
                  type="button"
                  key={c.code}
                  onClick={() => handleCountryToggle(c.code)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
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
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                allCountries
                  ? 'bg-ted-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Hela EU / EES
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 ml-auto">
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300 select-none mr-2">
              <input
                type="checkbox"
                checked={onlyActive}
                onChange={(e) => setOnlyActive(e.target.checked)}
                className="w-4 h-4 rounded text-ted-600 focus:ring-ted-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer"
              />
              <span>Endast aktiva (dölj utgångna)</span>
            </label>

            <button
              onClick={handleResetFilters}
              className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold transition-all flex items-center gap-2"
              title="Återställ alla sökfilter"
            >
              <RotateCcw className="w-4 h-4" />
              Rensa filter
            </button>

            <button
              onClick={() => setIsWatchlistModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-xs font-bold transition-all flex items-center gap-2"
            >
              <Bell className="w-4 h-4 text-amber-600" />
              Spara som bevakning
            </button>

            {/* Prominent Large Sök Button */}
            <button
              onClick={() => executeSearch(1)}
              disabled={loading}
              className="px-8 py-3 rounded-2xl bg-ted-600 hover:bg-ted-700 text-white text-base font-extrabold shadow-lg shadow-ted-600/25 transition-all flex items-center gap-2.5 flex-shrink-0 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              Sök
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
          {hiddenNoticeIds && hiddenNoticeIds.size > 0 && (
            <button
              onClick={() => setShowHidden(prev => !prev)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                showHidden
                  ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
              title={showHidden ? 'Klicka för att helt filtrera bort dolda upphandlingar från listan' : 'Klicka för att visa dolda upphandlingar som gråmarkerade'}
            >
              {showHidden ? <Eye className="w-3.5 h-3.5 text-slate-500" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
              <span>{showHidden ? `Visar dolda (${hiddenCountInResults})` : `Dölj dolda (${hiddenCountInResults})`}</span>
            </button>
          )}

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
      {displayedNotices.length === 0 && !loading && !error ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white">Inga upphandlingar matchade dina sökkriterier</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {notices.length > 0 && !showHidden
              ? 'Alla upphandlingar på denna sida är dolda av dig. Klicka på knappen "Dölj dolda" ovan för att visa dem igen.'
              : 'Prova att bredda sökningen, ta bort specifika sökord eller ändra datumintervall för att få fler träffar.'}
          </p>
        </div>
      ) : viewMode === 'card' ? (
        /* CARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5">
          {displayedNotices.map((notice) => (
            <NoticeCard
              key={notice.id}
              notice={notice}
              isSaved={isTenderSaved(notice.id)}
              onSave={handleSaveToPipeline}
              onOpenDetail={onOpenNoticeDetail}
              isHidden={Boolean(hiddenNoticeIds?.has(notice.id))}
              onToggleHide={onToggleHideNotice}
            />
          ))}
        </div>
      ) : (
        /* TABLE VIEW */
        <NoticeTable
          notices={displayedNotices}
          isTenderSaved={isTenderSaved}
          onSave={handleSaveToPipeline}
          onOpenDetail={onOpenNoticeDetail}
          isHidden={(id) => Boolean(hiddenNoticeIds?.has(id))}
          onToggleHide={onToggleHideNotice}
        />
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
