import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Tag,
  Save,
  Search,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Info,
  Layers,
  Globe,
  Loader2,
  Check,
  Plus,
  X,
  CheckSquare,
  Square,
  RotateCcw,
  Sliders
} from 'lucide-react';
import { CompanyProfile, CpvCategory } from '../types';
import { api } from '../api';

export const CpvAndProfileView: React.FC = () => {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [categories, setCategories] = useState<CpvCategory[]>([]);
  const [cpvSearch, setCpvSearch] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({
    '71000000': true,
    '72000000': true
  });

  // Profile Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [keywords, setKeywords] = useState('');
  const [preferredCpv, setPreferredCpv] = useState<string[]>([]);
  const [preferredCountries, setPreferredCountries] = useState<string[]>(['SWE']);
  const [manualCpvInput, setManualCpvInput] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profRes, cpvRes] = await Promise.all([
        api.getProfile(),
        api.getCpvCategories()
      ]);

      if (profRes.success && profRes.profile) {
        setProfile(profRes.profile);
        setName(profRes.profile.name || '');
        setDescription(profRes.profile.description || '');
        setKeywords(profRes.profile.keywords || '');
        setPreferredCpv(profRes.profile.preferred_cpv || ['71300000', '71240000', '71320000', '71541000', '72224000']);
        setPreferredCountries(profRes.profile.preferred_countries || ['SWE']);
      }

      if (cpvRes.success && cpvRes.categories) {
        setCategories(cpvRes.categories);
      }
    } catch (e) {
      console.error('Failed to load profile/CPV data:', e);
    }
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingProfile(true);
    setSaveSuccess(false);

    try {
      const res = await api.updateProfile({
        name,
        description,
        keywords,
        preferred_cpv: preferredCpv,
        preferred_countries: preferredCountries
      });

      if (res.success && res.profile) {
        setProfile(res.profile);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (e) {
      console.error('Failed to save profile:', e);
    } finally {
      setSavingProfile(false);
    }
  };

  const toggleExpand = (code: string) => {
    setExpandedCats(prev => ({ ...prev, [code]: !prev[code] }));
  };

  const handleCpvSearch = async (val: string) => {
    setCpvSearch(val);
    const res = await api.getCpvCategories(val);
    if (res.success && res.categories) {
      setCategories(res.categories);
    }
  };

  // Toggle individual CPV code in profile
  const toggleCpv = (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;
    setPreferredCpv(prev =>
      prev.includes(cleanCode) ? prev.filter(c => c !== cleanCode) : [...prev, cleanCode]
    );
  };

  // Toggle all subcategories in a category
  const toggleAllInCategory = (cat: CpvCategory) => {
    const allCodes = [cat.code, ...(cat.subcategories?.map(s => s.code) || [])];
    const isAllSelected = allCodes.every(c => preferredCpv.includes(c));

    if (isAllSelected) {
      setPreferredCpv(prev => prev.filter(c => !allCodes.includes(c)));
    } else {
      setPreferredCpv(prev => [...new Set([...prev, ...allCodes])]);
    }
  };

  // Add manual CPV code
  const handleAddManualCpv = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualCpvInput.trim().replace(/[^0-9]/g, '');
    if (clean.length >= 2 && !preferredCpv.includes(clean)) {
      setPreferredCpv(prev => [...prev, clean]);
      setManualCpvInput('');
    }
  };

  // Apply common industry bundles
  const applyPresetBundle = (bundleName: string) => {
    if (bundleName === 'BIM') {
      const bimCodes = ['71300000', '71240000', '71320000', '71541000', '72224000'];
      setPreferredCpv(prev => [...new Set([...prev, ...bimCodes])]);
    } else if (bundleName === 'IT') {
      const itCodes = ['72000000', '72200000', '72220000', '72300000', '48000000', '48400000'];
      setPreferredCpv(prev => [...new Set([...prev, ...itCodes])]);
    } else if (bundleName === 'BYGG') {
      const byggCodes = ['45000000', '45100000', '45200000', '45300000'];
      setPreferredCpv(prev => [...new Set([...prev, ...byggCodes])]);
    } else if (bundleName === 'KONSULT') {
      const konsultCodes = ['71300000', '79400000', '79100000', '79200000'];
      setPreferredCpv(prev => [...new Set([...prev, ...konsultCodes])]);
    }
  };

  // Helper to get friendly name for a CPV code
  const getCpvName = (code: string) => {
    for (const cat of categories) {
      if (cat.code === code) return cat.nameSwe;
      if (cat.subcategories) {
        const sub = cat.subcategories.find(s => s.code === code);
        if (sub) return sub.nameSwe;
      }
    }
    return 'CPV-kod ' + code;
  };

  const availableCountries = [
    { code: 'SWE', label: 'Sverige' },
    { code: 'DNK', label: 'Danmark' },
    { code: 'NOR', label: 'Norge' },
    { code: 'FIN', label: 'Finland' },
    { code: 'DEU', label: 'Tyskland' },
    { code: 'FRA', label: 'Frankrike' },
    { code: 'NLD', label: 'Nederländerna' }
  ];

  return (
    <div className="space-y-8 pb-16">
      
      {/* SECTION 1: COMPANY PROFILE FOR MINIMAX MATCHING */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>MiniMax AI Matchningsprofil</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Företagsprofil & Relevansmotor
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
              Informationen och era valda CPV-koder nedan används av MiniMax-M3 för att beräkna matchningsgrad (0-100%) och filtrera relevanta upphandlingar.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-5 max-w-4xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Företagsnamn</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="t.ex. WSP Sverige AB (BIM-enheten)"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Kärnkompetenser & Nyckelord</label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="t.ex. BIM, BIM-samordning, VDC, 3D-modellering, CAD..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Verksamhetsbeskrivning</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beskrivning av företagets och enhetens tjänster inom samhällsbyggnad, teknik, IT, BIM och projektering..."
              className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* PREFERRED CPV CODES SECTION */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-50/60 to-indigo-50/60 dark:from-purple-950/30 dark:to-indigo-950/30 border border-purple-200 dark:border-purple-800/60 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Tag className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  Ert företags valda CPV-koder ({preferredCpv.length} st)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Dessa koder används för att matcha nya upphandlingar och styra MiniMax relevanspoäng.
                </p>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
                <span className="text-[11px] font-semibold text-slate-400">Snabbval:</span>
                <button
                  type="button"
                  onClick={() => applyPresetBundle('BIM')}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-xs font-semibold border border-purple-200 dark:border-purple-700 transition-colors"
                >
                  + BIM (71)
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetBundle('IT')}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-xs font-semibold border border-purple-200 dark:border-purple-700 transition-colors"
                >
                  + IT (72/48)
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetBundle('BYGG')}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-xs font-semibold border border-purple-200 dark:border-purple-700 transition-colors"
                >
                  + Bygg (45)
                </button>
                {preferredCpv.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setPreferredCpv([])}
                    className="px-2.5 py-1 rounded-lg text-slate-400 hover:text-red-600 text-xs font-medium transition-colors"
                  >
                    Rensa alla
                  </button>
                )}
              </div>
            </div>

            {/* Selected CPV Chips */}
            {preferredCpv.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {preferredCpv.map((code) => {
                  const label = getCpvName(code);
                  return (
                    <span
                      key={code}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-purple-200 dark:border-purple-800 text-xs shadow-sm"
                    >
                      <span className="font-mono font-bold text-purple-700 dark:text-purple-400">{code}</span>
                      <span className="font-medium truncate max-w-[200px] sm:max-w-xs">{label}</span>
                      <button
                        type="button"
                        onClick={() => toggleCpv(code)}
                        className="p-0.5 text-slate-400 hover:text-red-500 rounded transition-colors"
                        title="Ta bort CPV-kod"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-dashed border-purple-200 dark:border-purple-800/80 text-center text-xs text-slate-500 dark:text-slate-400">
                Inga CPV-koder valda ännu. Markera koder i CPV-katalogen nedan eller använd snabbvalen ovan.
              </div>
            )}

            {/* Manual Code Input Form */}
            <div className="flex items-center gap-2 pt-2 border-t border-purple-200/60 dark:border-purple-800/40">
              <input
                type="text"
                value={manualCpvInput}
                onChange={(e) => setManualCpvInput(e.target.value)}
                placeholder="Skriv in 8-siffrig CPV-kod manuellt (t.ex. 71320000)..."
                className="px-3.5 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white flex-1 max-w-sm"
              />
              <button
                type="button"
                onClick={handleAddManualCpv}
                disabled={!manualCpvInput.trim()}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs disabled:opacity-50 transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Lägg till
              </button>
            </div>
          </div>

          {/* Preferred Countries */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Prioriterade marknader / Länder</label>
            <div className="flex flex-wrap gap-2">
              {availableCountries.map((c) => {
                const isSelected = preferredCountries.includes(c.code);
                return (
                  <button
                    type="button"
                    key={c.code}
                    onClick={() => {
                      if (isSelected) {
                        setPreferredCountries(preferredCountries.filter(x => x !== c.code));
                      } else {
                        setPreferredCountries([...preferredCountries, c.code]);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {c.label} ({c.code})
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-3">
            <button
              type="submit"
              disabled={savingProfile}
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-md shadow-purple-500/20 transition-all inline-flex items-center gap-2"
            >
              {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Spara profil & CPV-koder
            </button>

            {saveSuccess && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4" /> Profil och CPV-koder sparade!
              </span>
            )}
          </div>
        </form>
      </div>

      {/* SECTION 2: CPV CATALOG EXPLORER (INTERACTIVE) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ted-100 dark:bg-ted-950 text-ted-700 dark:text-ted-300 text-xs font-semibold">
              <Tag className="w-3.5 h-3.5" />
              <span>Interaktiv CPV-Katalog</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Markera och välj CPV-koder
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Klicka på koder nedan för att markera dem som intressanta för ert företag. Klicka sedan på <strong>"Spara profil & CPV-koder"</strong>.
            </p>
          </div>

          {/* Search bar & save shortcut */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={cpvSearch}
                onChange={(e) => handleCpvSearch(e.target.value)}
                placeholder="Sök bland CPV-koder (t.ex. BIM, IT, konsult)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-ted-500"
              />
            </div>

            <button
              onClick={() => handleSaveProfile()}
              disabled={savingProfile}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-500/20 flex items-center gap-1.5 flex-shrink-0"
              title="Spara ändrade CPV-koder"
            >
              {savingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Spara val
            </button>
          </div>
        </div>

        {/* Categories Tree */}
        <div className="space-y-3">
          {categories.map((cat) => {
            const isCatSelected = preferredCpv.includes(cat.code);
            const subCount = cat.subcategories?.length || 0;
            const selectedSubCount = cat.subcategories?.filter(s => preferredCpv.includes(s.code)).length || 0;
            const isExpanded = expandedCats[cat.code] || Boolean(cpvSearch);

            return (
              <div
                key={cat.code}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  isCatSelected || selectedSubCount > 0
                    ? 'border-purple-300 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/60'
                }`}
              >
                {/* Category Header */}
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors">
                  <div
                    onClick={() => toggleExpand(cat.code)}
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                  >
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                    <span className="font-mono text-xs font-bold text-ted-700 dark:text-ted-400 bg-ted-100 dark:bg-ted-950 px-2 py-0.5 rounded-md border border-ted-200 dark:border-ted-900 flex-shrink-0">
                      {cat.code}
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {cat.nameSwe}
                    </span>
                  </div>

                  {/* Actions for this category */}
                  <div className="flex items-center gap-2 pl-7 sm:pl-0 flex-shrink-0">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mr-1">
                      {selectedSubCount > 0 ? (
                        <strong className="text-purple-600 dark:text-purple-400">{selectedSubCount} av {subCount} valda</strong>
                      ) : (
                        `${subCount} underkategorier`
                      )}
                    </span>

                    {/* Toggle Main Code Button */}
                    <button
                      type="button"
                      onClick={() => toggleCpv(cat.code)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                        isCatSelected
                          ? 'bg-purple-600 text-white shadow-purple-500/20'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      <Check className={`w-3.5 h-3.5 ${isCatSelected ? 'opacity-100' : 'opacity-40'}`} />
                      {isCatSelected ? 'Huvudkod vald' : 'Välj huvudkod'}
                    </button>

                    {/* Select All Subcategories in Category */}
                    {subCount > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleAllInCategory(cat)}
                        className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        {selectedSubCount === subCount && isCatSelected ? 'Avmarkera alla' : 'Välj alla'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Subcategories list */}
                {isExpanded && cat.subcategories && (
                  <div className="p-4 pt-0 pl-11 space-y-2 border-t border-slate-200/50 dark:border-slate-800/50 bg-white dark:bg-slate-900">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-3">
                      {cat.subcategories.map((sub) => {
                        const isSubSelected = preferredCpv.includes(sub.code);

                        return (
                          <div
                            key={sub.code}
                            onClick={() => toggleCpv(sub.code)}
                            className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between text-xs transition-all ${
                              isSubSelected
                                ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-200 font-semibold shadow-sm'
                                : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div className="flex items-start gap-2.5 pr-2">
                              <Tag className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${isSubSelected ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'}`} />
                              <div>
                                <span className="font-mono font-bold text-slate-900 dark:text-white block">{sub.code}</span>
                                <p className="leading-snug text-slate-600 dark:text-slate-300">{sub.nameSwe}</p>
                              </div>
                            </div>

                            <div
                              className={`w-5 h-5 rounded-lg flex items-center justify-center border flex-shrink-0 transition-colors ${
                                isSubSelected
                                  ? 'bg-purple-600 border-purple-600 text-white'
                                  : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                              }`}
                            >
                              {isSubSelected && <Check className="w-3.5 h-3.5" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

