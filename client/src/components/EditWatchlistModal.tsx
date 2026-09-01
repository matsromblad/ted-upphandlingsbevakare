import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  Check,
  AlertCircle,
  Loader2,
  Search,
  Tag,
  Plus,
  Play,
  CheckCircle2,
  Globe,
  Building2,
  Layers,
  Mail,
  Shield,
  HelpCircle
} from 'lucide-react';
import {
  NoticeFilters,
  Watchlist,
  WatchlistEmailFrequency,
  FormType,
  Notice
} from '../types';
import { api } from '../api';
import { CpvSelectorModal } from './CpvSelectorModal';
import { showToast } from './Toast';

interface EditWatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  watchlist: Watchlist | null;
  onWatchlistUpdated: (watchlist: Watchlist) => void;
}

export const EditWatchlistModal: React.FC<EditWatchlistModalProps> = ({
  isOpen,
  onClose,
  watchlist,
  onWatchlistUpdated
}) => {
  // Form State
  const [name, setName] = useState('');
  const [keywords, setKeywords] = useState('');
  const [excludeKeywords, setExcludeKeywords] = useState('');
  const [buyer, setBuyer] = useState('');
  const [countries, setCountries] = useState<string[]>(['SWE']);
  const [allCountries, setAllCountries] = useState(false);
  const [selectedCpvs, setSelectedCpvs] = useState<string[]>([]);
  const [formType, setFormType] = useState<FormType>('competition');
  const [emailFrequency, setEmailFrequency] = useState<WatchlistEmailFrequency>('daily');
  const [active, setActive] = useState(true);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCpvModalOpen, setIsCpvModalOpen] = useState(false);

  // Live Test Search state
  const [testingSearch, setTestingSearch] = useState(false);
  const [testResult, setTestResult] = useState<{ totalCount: number; notices: Notice[] } | null>(null);

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
    'Trafikverket',
    'Region Stockholm',
    'Västfastigheter',
    'Svenska kraftnät',
    'Göteborgs Stad',
    'Försvarsmakten',
    'Stockholm Vatten'
  ];

  const commonCpvs = [
    { code: '71300000', label: 'Tekniska konsulttjänster' },
    { code: '71240000', label: 'Arkitekt- & ingenjörstjänster' },
    { code: '71320000', label: 'Projektering & konstruktion' },
    { code: '72000000', label: 'IT-tjänster' },
    { code: '48000000', label: 'Programvara / BIM' }
  ];

  useEffect(() => {
    if (isOpen && watchlist) {
      const filters = watchlist.filters || {};
      setName(watchlist.name || '');
      setKeywords(filters.keywords || '');
      setExcludeKeywords(filters.excludeKeywords || '');
      setBuyer(filters.buyer || '');
      setCountries(filters.countries && filters.countries.length > 0 ? filters.countries : ['SWE']);
      setAllCountries(Boolean(filters.allCountries));
      setSelectedCpvs(filters.cpv || []);
      setFormType(filters.formType || 'competition');
      setEmailFrequency(watchlist.email_frequency || 'daily');
      setActive(Boolean(watchlist.active));
      setError(null);
      setTestResult(null);
    }
  }, [isOpen, watchlist]);

  if (!isOpen || !watchlist) return null;

  const toggleCountry = (code: string) => {
    if (allCountries) return;
    setCountries(prev =>
      prev.includes(code)
        ? prev.length > 1
          ? prev.filter(c => c !== code)
          : prev
        : [...prev, code]
    );
  };

  const addCpv = (code: string) => {
    if (!selectedCpvs.includes(code)) {
      setSelectedCpvs(prev => [...prev, code]);
    }
  };

  const removeCpv = (code: string) => {
    setSelectedCpvs(prev => prev.filter(c => c !== code));
  };

  const buildCurrentFilters = (): NoticeFilters => {
    return {
      keywords: keywords.trim() || undefined,
      excludeKeywords: excludeKeywords.trim() || undefined,
      buyer: buyer.trim() || undefined,
      countries: allCountries ? undefined : countries,
      allCountries,
      cpv: selectedCpvs.length > 0 ? selectedCpvs : undefined,
      formType,
      datePreset: watchlist.filters?.datePreset || 'all',
      onlyActive: true
    };
  };

  const handleTestSearch = async () => {
    setTestingSearch(true);
    setError(null);
    try {
      const filters = buildCurrentFilters();
      const res = await api.searchTed(filters, 1, 3);
      if (res.success) {
        setTestResult({
          totalCount: res.totalCount || 0,
          notices: res.notices || []
        });
        showToast('info', `Test-sökning: ${res.totalCount || 0} upphandlingar matchar dessa kriterier på TED just nu.`);
      } else {
        setError(res.error || 'Test-sökningen misslyckades.');
      }
    } catch (e: any) {
      setError(e.message || 'Fel vid test-sökning.');
    } finally {
      setTestingSearch(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || loading) return;

    setLoading(true);
    setError(null);
    try {
      const filters = buildCurrentFilters();
      const res = await api.updateWatchlist(watchlist.id, {
        name: name.trim(),
        filters,
        active,
        emailFrequency
      });

      if (res.success && res.watchlist) {
        showToast('success', `Bevakningsprofilen "${name.trim()}" har uppdaterats!`);
        onWatchlistUpdated(res.watchlist);
        onClose();
      } else {
        setError(res.error || 'Kunde inte spara ändringarna.');
      }
    } catch (e: any) {
      console.error('Failed to update watchlist:', e);
      setError(e.message || 'Ett oväntat fel uppstod vid sparande.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 z-10 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                Redigera Bevakningsprofil
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Uppdatera söksträng, organisation, CPV-koder och utskicksfrekvens
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Kunde inte uppdatera bevakning</p>
              <p className="text-[11px] mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          {/* Watchlist Name & Active Toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Bevakningens namn *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="t.ex. BIM & Digital Tvilling Trafikverket"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Status
              </label>
              <button
                type="button"
                onClick={() => setActive(!active)}
                className={`w-full py-2.5 px-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition-all ${
                  active
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                {active ? 'Aktiv bevakning' : 'Pausad'}
              </button>
            </div>
          </div>

          {/* Sökord / Nyckelord */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-amber-500" />
                Sökord & Frasmatchning (Inkludera)
              </label>
              <span className="text-[11px] text-slate-400">
                Använd komma eller OR för synonymer
              </span>
            </div>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="t.ex. BIM, Informationsmodellering, Digital tvilling, VDC"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          {/* Exkludera sökord */}
          <div className="space-y-1.5">
            <label className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <X className="w-3.5 h-3.5 text-red-500" />
              Exkludera sökord (Negativa sökord)
            </label>
            <input
              type="text"
              value={excludeKeywords}
              onChange={(e) => setExcludeKeywords(e.target.value)}
              placeholder="t.ex. lokalvård, städning, bemanning, hårdvara"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>

          {/* Upphandlande organisation / Köpare */}
          <div className="space-y-1.5">
            <label className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-500" />
              Upphandlande organisation / Köpare
            </label>
            <input
              type="text"
              value={buyer}
              onChange={(e) => setBuyer(e.target.value)}
              placeholder="t.ex. Trafikverket, Göteborgs Stad, Svenska kraftnät"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-400">Snabbval:</span>
              {popularBuyers.map((pBuyer) => (
                <button
                  key={pBuyer}
                  type="button"
                  onClick={() => setBuyer(pBuyer)}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-medium border transition-colors ${
                    buyer === pBuyer
                      ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {pBuyer}
                </button>
              ))}
            </div>
          </div>

          {/* Länder & Regioner */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-500" />
                Länder & Geografiskt område
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allCountries}
                  onChange={(e) => setAllCountries(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Alla EU/EES-länder</span>
              </label>
            </div>

            {!allCountries && (
              <div className="flex flex-wrap gap-1.5">
                {countryOptions.map((c) => {
                  const isSelected = countries.includes(c.code);
                  return (
                    <button
                      type="button"
                      key={c.code}
                      onClick={() => toggleCountry(c.code)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      {c.label} ({c.code})
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* CPV Koder */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-purple-500" />
                CPV-Koder (Klassificering)
              </label>
              <button
                type="button"
                onClick={() => setIsCpvModalOpen(true)}
                className="text-[11px] font-bold text-wsp-600 hover:text-wsp-700 dark:text-wsp-400 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Bläddra bland alla CPV-koder
              </button>
            </div>

            {/* Selected CPV Badges */}
            {selectedCpvs.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 max-h-32 overflow-y-auto">
                {selectedCpvs.map((code) => {
                  const label = commonCpvs.find(c => c.code === code)?.label;
                  return (
                    <span
                      key={code}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-mono text-[11px] font-bold"
                    >
                      {code} {label ? `(${label})` : ''}
                      <button
                        type="button"
                        onClick={() => removeCpv(code)}
                        className="hover:text-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">
                Inga specifika CPV-koder valda (sökningen omfattar alla upphandlingsområden).
              </p>
            )}

            {/* Common CPV quick add */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-400">Vanliga inom WSP:</span>
              {commonCpvs.map((c) => {
                const isSelected = selectedCpvs.includes(c.code);
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => (isSelected ? removeCpv(c.code) : addCpv(c.code))}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-medium border transition-colors ${
                      isSelected
                        ? 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-300 font-bold'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}{c.label} ({c.code.slice(0, 5)})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Upphandlingstyp & E-postfrekvens */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Upphandlingstyp (Formulär)
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as FormType)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="all">Alla typer av meddelanden</option>
                <option value="competition">Endast anbudsinfordran / tävling</option>
                <option value="planning">Förhandsmeddelanden / Planering</option>
                <option value="result">Tilldelade kontrakt (Resultat)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-rose-500" />
                E-postutskick schema
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { val: 'daily', label: 'Dagligen' },
                  { val: 'weekly', label: 'Veckovis' }
                ].map((opt) => (
                  <button
                    type="button"
                    key={opt.val}
                    onClick={() => setEmailFrequency(opt.val as WatchlistEmailFrequency)}
                    className={`py-2 px-3 rounded-xl border font-bold text-center transition-all ${
                      emailFrequency === opt.val
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live Test Search Button & Preview */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 text-amber-500" />
                Provkör kriterier mot TED
              </div>
              <button
                type="button"
                onClick={handleTestSearch}
                disabled={testingSearch}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {testingSearch ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                {testingSearch ? 'Söker...' : 'Testa sökning nu'}
              </button>
            </div>

            {testResult && (
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Hittade {testResult.totalCount} träffar just nu på TED
                  </span>
                </div>
                {testResult.notices.length > 0 && (
                  <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                    <div className="font-semibold text-slate-700 dark:text-slate-300">Exempel på träffar:</div>
                    {testResult.notices.slice(0, 2).map((n) => (
                      <div key={n.id} className="truncate">• {n.title} ({n.buyer || 'Okänd'})</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition-colors"
            >
              Avbryt
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-lg shadow-amber-600/20 flex items-center gap-2 transition-all disabled:opacity-50 hover:scale-[1.01]"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {loading ? 'Sparar...' : 'Spara ändringar'}
            </button>
          </div>
        </form>
      </div>

      {/* CPV Selector Modal */}
      <CpvSelectorModal
        isOpen={isCpvModalOpen}
        onClose={() => setIsCpvModalOpen(false)}
        selectedCpvs={selectedCpvs}
        onApplyCpvs={(cpvs) => setSelectedCpvs(cpvs)}
      />
    </div>
  );
};
