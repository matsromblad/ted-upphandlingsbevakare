import React, { useState, useEffect } from 'react';
import { X, Bell, Check, AlertCircle, Loader2 } from 'lucide-react';
import { NoticeFilters, Watchlist, WatchlistEmailFrequency } from '../types';
import { api } from '../api';

interface CreateWatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: NoticeFilters;
  defaultName?: string;
  onWatchlistCreated: (watchlist: Watchlist) => void;
}

export const CreateWatchlistModal: React.FC<CreateWatchlistModalProps> = ({
  isOpen,
  onClose,
  filters,
  defaultName = '',
  onWatchlistCreated
}) => {
  const [name, setName] = useState(defaultName || 'Ny Bevakningsprofil');
  const [emailFrequency, setEmailFrequency] = useState<WatchlistEmailFrequency>('daily');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(defaultName || 'Ny Bevakningsprofil');
      setError(null);
    }
  }, [isOpen, defaultName]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || loading) return;

    setLoading(true);
    setError(null);
    try {
      const res = await api.createWatchlist({
        name: name.trim(),
        filters,
        emailFrequency
      });

      if (res.success && res.watchlist) {
        onWatchlistCreated(res.watchlist);
        onClose();
      } else {
        setError(res.error || 'Kunde inte spara bevakningsprofilen.');
      }
    } catch (e: any) {
      console.error('Failed to create watchlist:', e);
      setError(e.message || 'Ett oväntat fel uppstod vid sparande av bevakning.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 z-10 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Skapa Bevakningsprofil</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Automatisk övervakning av nya TED-upphandlingar</p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Kunde inte spara bevakning</p>
              <p className="text-[11px] mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Namn på bevakning</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="t.ex. BIM & Digital Informationshantering Sverige"
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">E-postutskick</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { val: 'daily', label: 'Dagligen', description: 'Sammanfattning varje dag' },
                { val: 'weekly', label: 'Veckovis', description: 'Sammanfattning en gång per vecka' }
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.val}
                  onClick={() => setEmailFrequency(opt.val as WatchlistEmailFrequency)}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                    emailFrequency === opt.val
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="block">{opt.label}</span>
                  <span className="mt-1 block text-[11px] font-normal opacity-80">{opt.description}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Bevakningen fortsätter att leta nya upphandlingar i bakgrunden, men mail skickas bara enligt valt schema.
            </p>
          </div>

          {/* Active filter summary preview */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-1 text-xs text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-slate-900 dark:text-slate-200">Aktiva filterkriterier:</span>
            {filters.buyer && (
              <p>• Upphandlare / Organisation: <span className="text-[#F1503C] dark:text-red-400 font-bold">{filters.buyer}</span></p>
            )}
            <p>• Sökord: <span className="text-slate-900 dark:text-white font-medium">{filters.keywords || 'Alla'}</span></p>
            {filters.excludeKeywords && (
              <p>• Exkluderar: <span className="text-red-600 dark:text-red-400 font-medium">{filters.excludeKeywords}</span></p>
            )}
            <p>• Länder: <span className="text-slate-900 dark:text-white font-medium">{filters.countries?.join(', ') || 'SWE'}</span></p>
            <p>• CPV: <span className="text-slate-900 dark:text-white font-medium">{filters.cpv?.length ? `${filters.cpv.length} koder valda` : 'Alla koder'}</span></p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm shadow-md shadow-amber-500/20 flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {loading ? 'Sparar bevakning...' : 'Aktivera bevakning'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
