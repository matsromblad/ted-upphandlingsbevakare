import React, { useState, useEffect } from 'react';
import {
  Bell,
  Play,
  CheckCircle,
  Clock,
  Plus,
  Trash2,
  Bookmark,
  ExternalLink,
  Download,
  Building,
  MapPin,
  Calendar,
  Sparkles,
  Loader2,
  RefreshCw,
  Eye,
  CheckCheck
} from 'lucide-react';
import { Watchlist, WatchlistHit, Notice, SavedTender } from '../types';
import { api } from '../api';
import { CreateWatchlistModal } from '../components/CreateWatchlistModal';

interface WatchlistsViewProps {
  onOpenNoticeDetail: (notice: Notice) => void;
  savedTenders: SavedTender[];
  onTenderSaved: () => void;
  onWatchlistChanged: () => void;
}

export const WatchlistsView: React.FC<WatchlistsViewProps> = ({
  onOpenNoticeDetail,
  savedTenders,
  onTenderSaved,
  onWatchlistChanged
}) => {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [hits, setHits] = useState<WatchlistHit[]>([]);
  const [activeTab, setActiveTab] = useState<'profiles' | 'feed'>('feed');
  const [selectedWatchlistId, setSelectedWatchlistId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [runningAll, setRunningAll] = useState(false);
  const [runningSingleId, setRunningSingleId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [wlRes, hitsRes] = await Promise.all([
        api.getWatchlists(),
        api.getRecentHits(200)
      ]);

      if (wlRes.success && wlRes.watchlists) {
        setWatchlists(wlRes.watchlists);
      }
      if (hitsRes.success && hitsRes.hits) {
        setHits(hitsRes.hits);
      }
    } catch (e) {
      console.error('Failed to load watchlist data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRunAll = async () => {
    setRunningAll(true);
    try {
      await api.runAllWatchlists();
      await loadData();
      onWatchlistChanged();
    } catch (e) {
      console.error('Failed to run all watchlists:', e);
    } finally {
      setRunningAll(false);
    }
  };

  const handleRunSingle = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRunningSingleId(id);
    try {
      await api.runWatchlist(id);
      await loadData();
      onWatchlistChanged();
    } catch (e) {
      console.error('Failed to run watchlist:', e);
    } finally {
      setRunningSingleId(null);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Är du säker på att du vill ta bort denna bevakningsprofil?')) {
      await api.deleteWatchlist(id);
      await loadData();
      onWatchlistChanged();
    }
  };

  const handleMarkHitRead = async (hitId: string) => {
    try {
      await api.markHitRead(hitId);
      setHits(prev =>
        prev.map(h => (h.id === hitId ? { ...h, is_read: 1 } : h))
      );
      onWatchlistChanged();
    } catch (e) {
      console.error('Failed to mark read:', e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllHitsRead(selectedWatchlistId || undefined);
      setHits(prev =>
        prev.map(h =>
          !selectedWatchlistId || h.watchlist_id === selectedWatchlistId
            ? { ...h, is_read: 1 }
            : h
        )
      );
      onWatchlistChanged();
    } catch (e) {
      console.error('Failed to mark all read:', e);
    }
  };

  const handleExport = (format: 'xlsx' | 'csv') => {
    window.open(`/api/export/hits?format=${format}`, '_blank');
  };

  const unreadCount = hits.filter(h => !h.is_read).length;
  const filteredHits = selectedWatchlistId
    ? hits.filter(h => h.watchlist_id === selectedWatchlistId)
    : hits;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Mina TED Bevakningar
            </h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white animate-pulse">
                {unreadCount} nya träffar
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Bakgrundsmotorn pollar EU:s TED-databas automatiskt och larmar vid nya relevanta upphandlingar.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleExport('xlsx')}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Exportera (Excel)
          </button>

          <button
            onClick={handleRunAll}
            disabled={runningAll || watchlists.length === 0}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 disabled:opacity-50 text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
          >
            {runningAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Kör alla bevakningar nu
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Skapa bevakning
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-4">
        <button
          onClick={() => setActiveTab('feed')}
          className={`pb-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'feed'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Bell className="w-4 h-4" />
          Senaste Träffar / Notisflöde
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
              {unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('profiles')}
          className={`pb-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'profiles'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <span>Bevakningsprofiler ({watchlists.length})</span>
        </button>
      </div>

      {/* TAB: FEED */}
      {activeTab === 'feed' && (
        <div className="space-y-4">
          {/* Feed Filter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Filtrera på bevakning:</span>
              <select
                value={selectedWatchlistId || ''}
                onChange={(e) => setSelectedWatchlistId(e.target.value || null)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
              >
                <option value="">Alla bevakningar</option>
                {watchlists.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-semibold text-ted-600 hover:text-ted-700 dark:text-ted-400 flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Markera alla som lästa
              </button>
            )}
          </div>

          {/* Hits Feed List */}
          {filteredHits.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center mx-auto">
                <Bell className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">Inga bevakningsträffar ännu</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                När dina bevakningsprofiler körs och hittar nya upphandlingar från TED kommer de att visas här.
              </p>
              <button
                onClick={handleRunAll}
                disabled={runningAll || watchlists.length === 0}
                className="mt-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/20 inline-flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" /> Kör bevakningar nu
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHits.map((hit) => {
                const notice = hit.notice;
                if (!notice) return null;
                const isUnread = !hit.is_read;

                return (
                  <div
                    key={hit.id}
                    onClick={() => {
                      if (isUnread) handleMarkHitRead(hit.id);
                      onOpenNoticeDetail(notice);
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                      isUnread
                        ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 shadow-sm'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        {isUnread && (
                          <span className="px-2 py-0.5 rounded-md font-extrabold bg-amber-500 text-white uppercase text-[10px] tracking-wider">
                            NY
                          </span>
                        )}
                        <span className="font-semibold text-amber-700 dark:text-amber-400">
                          {hit.watchlist_name}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="font-mono text-slate-500">{notice.publicationNumber}</span>
                        {notice.deadline && (
                          <span className="text-slate-600 dark:text-slate-400 font-medium">
                            Deadline: {notice.deadline}
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {notice.title}
                      </h4>

                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="truncate">{notice.buyer}</span>
                        {notice.city && <span>({notice.city})</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onOpenNoticeDetail(notice)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold"
                      >
                        Granska
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: PROFILES */}
      {activeTab === 'profiles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {watchlists.map((wl) => {
            const isRunning = runningSingleId === wl.id;
            const filters = wl.filters || {};

            return (
              <div
                key={wl.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4 hover:border-amber-400 dark:hover:border-amber-600 transition-all"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${wl.active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      <span className="text-xs font-semibold text-slate-500">
                        {wl.active ? 'Aktiv' : 'Pausad'}
                      </span>
                    </div>

                    {wl.new_count > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white">
                        {wl.new_count} nya
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-base text-slate-900 dark:text-white leading-snug">
                    {wl.name}
                  </h3>

                  {/* Filter criteria summary */}
                  <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-850 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p>• Sökord: <span className="font-medium text-slate-900 dark:text-white">{filters.keywords || 'Alla'}</span></p>
                    <p>• Länder: <span className="font-medium text-slate-900 dark:text-white">{filters.countries?.join(', ') || 'SWE'}</span></p>
                    <p>• Intervall: <span className="font-medium text-slate-900 dark:text-white">Var {wl.interval_minutes} min</span></p>
                    {wl.last_run_at && (
                      <p className="text-[11px] text-slate-400 pt-1">Senast körd: {new Date(wl.last_run_at).toLocaleTimeString('sv-SE')}</p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Träffar: {wl.last_hit_count || 0}</span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => handleRunSingle(wl.id, e)}
                      disabled={isRunning}
                      className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-800 dark:text-amber-300 transition-colors"
                      title="Kör denna bevakning nu"
                    >
                      {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      onClick={(e) => handleDelete(wl.id, e)}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      title="Ta bort bevakning"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <CreateWatchlistModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        filters={{ countries: ['SWE'], formType: 'competition', datePreset: '30d' }}
        onWatchlistCreated={() => {
          loadData();
          onWatchlistChanged();
        }}
      />
    </div>
  );
};
