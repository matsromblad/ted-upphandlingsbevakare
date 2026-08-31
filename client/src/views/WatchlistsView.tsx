import React, { useState, useEffect } from 'react';
import {
  Bell,
  Play,
  Plus,
  Trash2,
  Download,
  Loader2,
  Eye,
  CheckCheck,
  AlertCircle,
  Coins,
  Globe2,
  ExternalLink,
  Bookmark,
  Check
} from 'lucide-react';
import { Watchlist, WatchlistHit, Notice, SavedTender } from '../types';
import { api } from '../api';
import { CreateWatchlistModal } from '../components/CreateWatchlistModal';
import { getDeadlineInfo } from '../utils/dateUtils';
import { DeadlineBadge } from '../components/DeadlineBadge';

interface WatchlistsViewProps {
  onOpenNoticeDetail: (notice: Notice) => void;
  savedTenders: SavedTender[];
  onTenderSaved: () => void;
  onWatchlistChanged: () => void;
  initialSelectedWatchlistId?: string | null;
  initialTab?: 'profiles' | 'feed';
}

export const WatchlistsView: React.FC<WatchlistsViewProps> = ({
  onOpenNoticeDetail,
  savedTenders,
  onTenderSaved,
  onWatchlistChanged,
  initialSelectedWatchlistId = null,
  initialTab = 'feed'
}) => {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [hits, setHits] = useState<WatchlistHit[]>([]);
  const [activeTab, setActiveTab] = useState<'profiles' | 'feed'>(initialTab);
  const [selectedWatchlistId, setSelectedWatchlistId] = useState<string | null>(initialSelectedWatchlistId);
  const [loading, setLoading] = useState(false);
  const [runningAll, setRunningAll] = useState(false);
  const [runningSingleId, setRunningSingleId] = useState<string | null>(null);
  const [updatingFrequencyId, setUpdatingFrequencyId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setSelectedWatchlistId(initialSelectedWatchlistId);
  }, [initialSelectedWatchlistId]);

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

  const handleEmailFrequencyChange = async (watchlist: Watchlist, emailFrequency: Watchlist['email_frequency']) => {
    setUpdatingFrequencyId(watchlist.id);
    try {
      await api.updateWatchlist(watchlist.id, {
        name: watchlist.name,
        filters: watchlist.filters || {},
        active: Boolean(watchlist.active),
        emailFrequency
      });
      await loadData();
      onWatchlistChanged();
    } catch (e) {
      console.error('Failed to update watchlist frequency:', e);
    } finally {
      setUpdatingFrequencyId(null);
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

  const isTenderSaved = (noticeId: string) => {
    return savedTenders.some(t => t.notice_id === noticeId);
  };

  const handleSaveToPipeline = async (notice: Notice, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.saveToPipeline(notice);
      onTenderSaved();
    } catch (err) {
      console.error('Failed to save to pipeline:', err);
    }
  };

  const unreadCount = hits.filter(h => !h.is_read).length;
  const filteredHits = selectedWatchlistId
    ? hits.filter(h => h.watchlist_id === selectedWatchlistId)
    : hits;
  const emailFrequencyLabels: Record<Watchlist['email_frequency'], string> = {
    daily: 'Dagligen',
    weekly: 'Veckovis'
  };

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
            Bakgrundsmotorn letar nya TED-upphandlingar lopande och skickar sammanfattningsmail dagligen eller veckovis.
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
                const isSaved = isTenderSaved(notice.id);
                const dlInfo = getDeadlineInfo(notice.deadline, notice.deadlineStatus, notice.daysRemaining);

                return (
                  <div
                    key={hit.id}
                    onClick={() => {
                      if (isUnread) handleMarkHitRead(hit.id);
                      onOpenNoticeDetail(notice);
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                      dlInfo.isExpired
                        ? 'border-red-300 dark:border-red-800/80 bg-red-50/20 dark:bg-red-950/15 hover:border-red-400 ring-1 ring-red-400/20'
                        : isUnread
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
                        {notice.portalName && (
                          <>
                            <span className="text-slate-400">•</span>
                            <span className="font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-0.5">
                              <Globe2 className="w-3 h-3" /> {notice.portalName}
                            </span>
                          </>
                        )}
                        {notice.estimatedValueFormatted && (
                          <>
                            <span className="text-slate-400">•</span>
                            <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5" title={notice.estimatedValue}>
                              <Coins className="w-3 h-3" /> {notice.estimatedValueFormatted}
                            </span>
                          </>
                        )}
                        {dlInfo.hasDeadline && (
                          <DeadlineBadge
                            info={dlInfo}
                            variant="text"
                            icon={dlInfo.isExpired ? 'alert-triangle' : 'none'}
                            label={dlInfo.isExpired ? undefined : `Deadline: ${dlInfo.formattedDeadline}`}
                            className="font-semibold"
                          />
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
                      {(notice.links?.submission || notice.links?.documents) && (
                        <a
                          href={notice.links?.submission || notice.links?.documents}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 text-xs font-semibold flex items-center gap-1"
                          title={notice.portalName ? `Öppna ${notice.portalName}` : 'Öppna anbudslänk'}
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>{notice.portalName || 'Anbud'}</span>
                        </a>
                      )}
                      <button
                        onClick={(e) => handleSaveToPipeline(notice, e)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          isSaved
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 shadow-sm'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-300 text-slate-700 dark:text-slate-300 hover:text-emerald-700'
                        }`}
                        title={isSaved ? 'Sparad i anbudspipelinen' : 'Spara till anbudspipelinen'}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-emerald-600 text-emerald-600' : ''}`} />
                        <span>{isSaved ? 'Sparad' : 'Spara'}</span>
                      </button>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {watchlists.map((wl) => {
            const isRunning = runningSingleId === wl.id;
            const isUpdatingFrequency = updatingFrequencyId === wl.id;
            const filters = wl.filters || {};

            return (
              <div
                key={wl.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border shadow-sm flex flex-col justify-between space-y-4 transition-all ${
                  selectedWatchlistId === wl.id
                    ? 'border-amber-500 dark:border-amber-500 ring-2 ring-amber-200 dark:ring-amber-900/60'
                    : 'border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-600'
                }`}
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
                    <p>• E-post: <span className="font-medium text-slate-900 dark:text-white">{emailFrequencyLabels[wl.email_frequency] || 'Dagligen'}</span></p>
                    {wl.last_run_at && (
                      <p className="text-[11px] text-slate-400 pt-1">Senast sokt: {new Date(wl.last_run_at).toLocaleString('sv-SE')}</p>
                    )}
                    {wl.last_email_sent_at && (
                      <p className="text-[11px] text-slate-400">Senaste mail: {new Date(wl.last_email_sent_at).toLocaleString('sv-SE')}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {(['daily', 'weekly'] as const).map((frequency) => (
                      <button
                        key={frequency}
                        type="button"
                        disabled={isUpdatingFrequency}
                        onClick={() => handleEmailFrequencyChange(wl, frequency)}
                        className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                          wl.email_frequency === frequency
                            ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                        } ${isUpdatingFrequency ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        {emailFrequencyLabels[frequency]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Träffar: {wl.last_hit_count || 0}</span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setSelectedWatchlistId(wl.id);
                        setActiveTab('feed');
                      }}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                      title="Visa traffar for denna bevakning"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

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
