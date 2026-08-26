import React, { useState, useEffect } from 'react';
import { X, Search, Check, Tag, ChevronDown, ChevronRight } from 'lucide-react';
import { CpvCategory } from '../types';
import { api } from '../api';

interface CpvSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCpvs: string[];
  onApplyCpvs: (cpvs: string[]) => void;
}

export const CpvSelectorModal: React.FC<CpvSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedCpvs,
  onApplyCpvs
}) => {
  const [categories, setCategories] = useState<CpvCategory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<string[]>(selectedCpvs);
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({
    '72000000': true,
    '48000000': true
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      setSelected(selectedCpvs);
    }
  }, [isOpen, selectedCpvs]);

  const loadCategories = async (q = '') => {
    setLoading(true);
    try {
      const res = await api.getCpvCategories(q);
      if (res.success && res.categories) {
        setCategories(res.categories);
      }
    } catch (e) {
      console.error('Failed to load CPV categories:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadCategories(searchTerm);
  };

  const toggleCategoryExpand = (code: string) => {
    setExpandedCats(prev => ({ ...prev, [code]: !prev[code] }));
  };

  const toggleCpv = (code: string) => {
    setSelected(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const handleApply = () => {
    onApplyCpvs(selected);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] z-10">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-ted-100 dark:bg-ted-950/60 text-ted-600 dark:text-ted-400 flex items-center justify-center">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Välj CPV-koder (Branscher)</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Common Procurement Vocabulary</p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  loadCategories(e.target.value);
                }}
                placeholder="Sök på CPV-kod eller sökord (t.ex. programvara, bygg, konsult)..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-ted-500"
              />
            </div>
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  loadCategories('');
                }}
                className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-white"
              >
                Rensa
              </button>
            )}
          </form>
        </div>

        {/* List of CPV Categories */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {categories.map((cat) => {
            const isCatSelected = selected.includes(cat.code);
            const isExpanded = expandedCats[cat.code] || Boolean(searchTerm);

            return (
              <div
                key={cat.code}
                className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50/50 dark:bg-slate-850/50"
              >
                <div className="p-3 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-2 flex-1 cursor-pointer" onClick={() => toggleCategoryExpand(cat.code)}>
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                    <span className="text-xs font-mono font-bold text-ted-700 dark:text-ted-400 bg-ted-50 dark:bg-ted-950 px-1.5 py-0.5 rounded border border-ted-200 dark:border-ted-900">
                      {cat.code}
                    </span>
                    <span className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">
                      {cat.nameSwe}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleCpv(cat.code)}
                    className={`ml-2 p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
                      isCatSelected
                        ? 'bg-ted-600 border-ted-600 text-white'
                        : 'border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Check className={`w-3.5 h-3.5 ${isCatSelected ? 'opacity-100' : 'opacity-0'}`} />
                    <span>Huvudkod</span>
                  </button>
                </div>

                {/* Subcategories */}
                {isExpanded && cat.subcategories && cat.subcategories.length > 0 && (
                  <div className="p-2.5 pt-0 pl-8 space-y-1.5 border-t border-slate-200/50 dark:border-slate-800/50 bg-white dark:bg-slate-900">
                    {cat.subcategories.map((sub) => {
                      const isSubSelected = selected.includes(sub.code);
                      return (
                        <div
                          key={sub.code}
                          onClick={() => toggleCpv(sub.code)}
                          className={`p-2 rounded-lg cursor-pointer flex items-center justify-between text-xs transition-colors ${
                            isSubSelected
                              ? 'bg-ted-50 dark:bg-ted-950/60 text-ted-900 dark:text-ted-200 font-semibold'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] text-slate-500">{sub.code}</span>
                            <span>{sub.nameSwe}</span>
                          </div>
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center border ${
                              isSubSelected
                                ? 'bg-ted-600 border-ted-600 text-white'
                                : 'border-slate-300 dark:border-slate-600'
                            }`}
                          >
                            {isSubSelected && <Check className="w-3 h-3" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            <span className="font-bold text-slate-900 dark:text-white">{selected.length}</span> CPV-koder valda
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setSelected([])}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
            >
              Rensa alla
            </button>
            <button
              onClick={handleApply}
              className="px-5 py-2 rounded-xl bg-ted-600 hover:bg-ted-700 text-white text-xs font-semibold shadow-md shadow-ted-600/20"
            >
              Tillämpa val
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
