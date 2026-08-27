import React, { useState, useEffect } from 'react';
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
  Loader2
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
    '72000000': true
  });

  // Profile Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [keywords, setKeywords] = useState('');
  const [preferredCountries, setPreferredCountries] = useState<string[]>(['SWE']);

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
        setPreferredCountries(profRes.profile.preferred_countries || ['SWE']);
      }

      if (cpvRes.success && cpvRes.categories) {
        setCategories(cpvRes.categories);
      }
    } catch (e) {
      console.error('Failed to load profile/CPV data:', e);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setSaveSuccess(false);

    try {
      const res = await api.updateProfile({
        name,
        description,
        keywords,
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
              Informationen nedan används av MiniMax-M3 för att beräkna matchningsgrad (0-100%) och identifiera fördelar/risker när du granskar upphandlingar.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4 max-w-3xl">
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
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Verksamhetsbeskrivning</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beskrivning av företagets och BIM-enhetens tjänster, t.ex. BIM-samordning, VDC, 3D/4D/5D-modellering, GIS och digital informationshantering..."
              className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Kärnkompetenser & Sökord (Kommaseparerade)</label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="t.ex. BIM, BIM-samordning, VDC, Building Information Modeling, 3D-modellering, CAD, digital tvilling, projektering..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-[11px] text-slate-400">
              MiniMax väger dessa nyckelord mot upphandlingens skall-krav och kravspecifikation.
            </p>
          </div>

          {/* Preferred Countries */}
          <div className="space-y-1.5 pt-2">
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

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={savingProfile}
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-md shadow-purple-500/20 transition-all inline-flex items-center gap-2"
            >
              {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Spara profil
            </button>

            {saveSuccess && (
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4" /> Profil sparad!
              </span>
            )}
          </div>
        </form>
      </div>

      {/* SECTION 2: CPV CATALOG EXPLORER */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ted-100 dark:bg-ted-950 text-ted-700 dark:text-ted-300 text-xs font-semibold">
              <Tag className="w-3.5 h-3.5" />
              <span>EU:s Upphandlingsnomenklatur</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              CPV-Katalog (Common Procurement Vocabulary)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Utforska och slå upp officiella koder för offentlig upphandling i EU.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={cpvSearch}
              onChange={(e) => handleCpvSearch(e.target.value)}
              placeholder="Sök bland CPV-koder..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-ted-500"
            />
          </div>
        </div>

        {/* Categories Tree */}
        <div className="space-y-3">
          {categories.map((cat) => {
            const isExpanded = expandedCats[cat.code] || Boolean(cpvSearch);

            return (
              <div
                key={cat.code}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50/60 dark:bg-slate-850/60"
              >
                <div
                  onClick={() => toggleExpand(cat.code)}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                    <span className="font-mono text-xs font-bold text-ted-700 dark:text-ted-400 bg-ted-100 dark:bg-ted-950 px-2 py-0.5 rounded-md border border-ted-200 dark:border-ted-900">
                      {cat.code}
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {cat.nameSwe}
                    </span>
                  </div>

                  <span className="text-xs text-slate-400 font-medium">
                    {cat.subcategories?.length || 0} underkategorier
                  </span>
                </div>

                {/* Subcategories list */}
                {isExpanded && cat.subcategories && (
                  <div className="p-4 pt-0 pl-11 space-y-2 border-t border-slate-200/50 dark:border-slate-800/50 bg-white dark:bg-slate-900">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-3">
                      {cat.subcategories.map((sub) => (
                        <div
                          key={sub.code}
                          className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex items-start gap-2.5 text-xs"
                        >
                          <Tag className="w-3.5 h-3.5 text-ted-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-mono font-bold text-slate-900 dark:text-white">{sub.code}</span>
                            <p className="text-slate-600 dark:text-slate-400">{sub.nameSwe}</p>
                          </div>
                        </div>
                      ))}
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
