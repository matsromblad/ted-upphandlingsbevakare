import React, { useState, useEffect } from 'react';
import {
  Kanban,
  Download,
  Building,
  Clock,
  AlertTriangle,
  Sparkles,
  Trash2,
  Tag,
  CheckCircle2,
  ChevronRight,
  User,
  Plus,
  Coins,
  Globe2,
  ExternalLink,
  GripVertical,
  ArrowRight
} from 'lucide-react';
import { SavedTender, TenderStatus, Notice } from '../types';
import { api } from '../api';
import { getDeadlineInfo } from '../utils/dateUtils';

interface PipelineViewProps {
  tenders: SavedTender[];
  onOpenNoticeDetail: (notice: Notice) => void;
  onTenderUpdated: () => void;
  onNavigateToSearch: () => void;
}

const COLUMNS: { id: TenderStatus; title: string; color: string; icon: string }[] = [
  { id: 'INBOX', title: 'Bevakad / Inkorg', color: 'bg-slate-500', icon: '📥' },
  { id: 'REVIEWING', title: 'Granskas', color: 'bg-blue-500', icon: '🔍' },
  { id: 'DECIDED_TO_BID', title: 'Beslut att anbud ska lämnas', color: 'bg-indigo-500', icon: '🎯' },
  { id: 'PREPARING_BID', title: 'Under utarbetande', color: 'bg-amber-500', icon: '✍️' },
  { id: 'SUBMITTED', title: 'Inlämnat anbud', color: 'bg-purple-500', icon: '🚀' },
  { id: 'WON', title: 'Vunnen upphandling', color: 'bg-emerald-500', icon: '🏆' },
  { id: 'LOST', title: 'Förlorad / Avbruten', color: 'bg-red-500', icon: '❌' }
];

export const PipelineView: React.FC<PipelineViewProps> = ({
  tenders,
  onOpenNoticeDetail,
  onTenderUpdated,
  onNavigateToSearch
}) => {
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [filterAssigned, setFilterAssigned] = useState<string>('ALL');
  const [localTenders, setLocalTenders] = useState<SavedTender[]>(tenders);
  const [draggedTenderId, setDraggedTenderId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<TenderStatus | null>(null);

  useEffect(() => {
    setLocalTenders(tenders);
  }, [tenders]);

  const assignedOptions = React.useMemo(() => {
    const set = new Set<string>();
    localTenders.forEach(t => {
      if (t.assigned_to?.trim()) set.add(t.assigned_to.trim());
    });
    return Array.from(set);
  }, [localTenders]);

  const filteredTenders = localTenders.filter(t => {
    if (filterPriority !== 'ALL' && t.priority !== filterPriority) return false;
    if (filterAssigned !== 'ALL' && (t.assigned_to?.trim() || '') !== filterAssigned) return false;
    return true;
  });

  const handleStatusChange = async (id: string, newStatus: TenderStatus) => {
    // Optimistic update
    setLocalTenders(prev =>
      prev.map(t => (t.id === id ? { ...t, status: newStatus } : t))
    );
    try {
      await api.updatePipelineStatus(id, newStatus);
      onTenderUpdated();
    } catch (e) {
      console.error('Failed to change status:', e);
      setLocalTenders(tenders);
    }
  };

  const handleDragStart = (e: React.DragEvent, tenderId: string) => {
    e.dataTransfer.setData('text/plain', tenderId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTenderId(tenderId);
  };

  const handleDragEnd = () => {
    setDraggedTenderId(null);
    setDragOverColumnId(null);
  };

  const handleDragOver = (e: React.DragEvent, colId: TenderStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumnId !== colId) {
      setDragOverColumnId(colId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, colId: TenderStatus) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (dragOverColumnId === colId) {
      setDragOverColumnId(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TenderStatus) => {
    e.preventDefault();
    const tenderId = e.dataTransfer.getData('text/plain') || draggedTenderId;
    setDraggedTenderId(null);
    setDragOverColumnId(null);

    if (!tenderId) return;
    const currentTender = localTenders.find(t => t.id === tenderId);
    if (!currentTender || currentTender.status === targetStatus) return;

    await handleStatusChange(tenderId, targetStatus);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Vill du ta bort denna upphandling från din pipeline?')) {
      await api.deleteFromPipeline(id);
      onTenderUpdated();
    }
  };

  const handleExport = (format: 'xlsx' | 'csv') => {
    window.open(`/api/export/pipeline?format=${format}`, '_blank');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Anbudspipeline (Kanban)
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-ted-100 dark:bg-ted-950 text-ted-800 dark:text-ted-300">
              {localTenders.length} aktiva ärenden
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Dra och släpp upphandlingar mellan kolumner för att styra anbudsprocessen från granskning till tilldelning.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Priority filter */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
          >
            <option value="ALL">Alla prioriteringar</option>
            <option value="URGENT">🔥 Endast Brådskande</option>
            <option value="HIGH">Hög prioritet</option>
            <option value="MEDIUM">Medel</option>
            <option value="LOW">Låg</option>
          </select>

          {/* Assigned filter */}
          {assignedOptions.length > 0 && (
            <select
              value={filterAssigned}
              onChange={(e) => setFilterAssigned(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
            >
              <option value="ALL">Alla ansvariga ({assignedOptions.length})</option>
              {assignedOptions.map(name => (
                <option key={name} value={name}>👤 {name}</option>
              ))}
            </select>
          )}

          <button
            onClick={() => handleExport('xlsx')}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Exportera till Excel
          </button>

          <button
            onClick={onNavigateToSearch}
            className="px-4 py-2 rounded-xl bg-ted-600 hover:bg-ted-700 text-white text-xs font-bold shadow-md shadow-ted-600/20 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Lägg till från sök
          </button>
        </div>
      </div>

      {/* Kanban Board Container */}
      {localTenders.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-ted-50 dark:bg-ted-950/40 text-ted-600 flex items-center justify-center mx-auto">
            <Kanban className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white">Din pipeline är tom</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Sök fram intressanta upphandlingar från TED och klicka på "Spara till Pipeline" för att följa upp och strukturera anbudsarbetet.
          </p>
          <button
            onClick={onNavigateToSearch}
            className="mt-2 px-5 py-2 rounded-xl bg-ted-600 hover:bg-ted-700 text-white text-xs font-bold shadow-md shadow-ted-600/20 inline-flex items-center gap-1.5"
          >
            Gå till sökning
          </button>
        </div>
      ) : (
        <div className="flex gap-3 2xl:gap-4 overflow-x-auto pb-6 pt-1 items-start w-full">
          {COLUMNS.map((col) => {
            const colTenders = filteredTenders.filter(t => t.status === col.id);
            const isDragOver = dragOverColumnId === col.id;

            return (
              <div
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={(e) => handleDragLeave(e, col.id)}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`flex-1 min-w-[240px] max-w-[340px] rounded-2xl border transition-all flex flex-col max-h-[78vh] overflow-hidden ${
                  isDragOver
                    ? 'bg-ted-50/70 dark:bg-ted-950/40 border-ted-500 shadow-lg ring-2 ring-ted-500/40 scale-[1.01]'
                    : 'bg-slate-100/70 dark:bg-slate-850/70 border-slate-200/80 dark:border-slate-800'
                }`}
              >
                {/* Column Header */}
                <div className={`p-3 2xl:p-3.5 border-b flex items-center justify-between backdrop-blur-sm transition-colors ${
                  isDragOver
                    ? 'bg-ted-100/80 dark:bg-ted-900/60 border-ted-400 dark:border-ted-600'
                    : 'bg-white/70 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-base">{col.icon}</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {col.title}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    isDragOver
                      ? 'bg-ted-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}>
                    {colTenders.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[160px]">
                  {/* Drop hint when dragging over empty column */}
                  {isDragOver && colTenders.length === 0 && (
                    <div className="h-28 rounded-xl border-2 border-dashed border-ted-400 dark:border-ted-500/60 bg-ted-100/40 dark:bg-ted-950/40 flex flex-col items-center justify-center text-ted-700 dark:text-ted-300 text-xs font-semibold gap-1 animate-pulse">
                      <ArrowRight className="w-5 h-5 text-ted-500 transform rotate-90" />
                      <span>Släpp här för att flytta</span>
                    </div>
                  )}

                  {colTenders.map((tender) => {
                    const notice = tender.notice;
                    const dlInfo = getDeadlineInfo(
                      tender.deadline,
                      notice?.deadlineStatus,
                      notice?.daysRemaining
                    );
                    const isDraggingThis = draggedTenderId === tender.id;

                    return (
                      <div
                        key={tender.id}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, tender.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => notice && onOpenNoticeDetail(notice)}
                        className={`p-3.5 rounded-xl transition-all cursor-grab active:cursor-grabbing space-y-2.5 group shadow-sm hover:shadow-md select-none ${
                          isDraggingThis
                            ? 'opacity-40 scale-95 border-2 border-dashed border-ted-500 bg-ted-50/50 dark:bg-slate-800'
                            : dlInfo.isExpired
                            ? 'bg-white dark:bg-slate-900 border-2 border-red-400 dark:border-red-600 ring-1 ring-red-400/20 hover:border-red-500'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-ted-400 dark:hover:border-ted-600'
                        }`}
                      >
                        {/* Top tags */}
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 truncate">
                            <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-ted-500 flex-shrink-0 transition-colors" />
                            <span className="text-[10px] font-mono text-slate-500">
                              {tender.notice_id}
                            </span>
                            {notice?.portalName && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                                {notice.portalName}
                              </span>
                            )}
                          </div>

                          {/* Priority badge */}
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                              tender.priority === 'URGENT'
                                ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                                : tender.priority === 'HIGH'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {tender.priority === 'URGENT' ? '🔥 KRITISK' : tender.priority}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white leading-snug line-clamp-2 group-hover:text-ted-600 dark:group-hover:text-ted-400 transition-colors">
                          {tender.title}
                        </h4>

                        {/* Buyer & Value */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
                            <Building className="w-3 h-3 flex-shrink-0 text-ted-600" />
                            <span className="truncate">{tender.buyer}</span>
                          </div>

                          {(notice?.estimatedValueFormatted || tender.estimated_value) && (
                            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                              <Coins className="w-3 h-3 text-emerald-600" />
                              <span>{notice?.estimatedValueFormatted || tender.estimated_value}</span>
                            </div>
                          )}
                        </div>

                        {/* Deadline */}
                        {dlInfo.hasDeadline && (
                          <div className={`flex items-center justify-between text-[11px] pt-1 border-t ${
                            dlInfo.isExpired
                              ? 'border-red-100 dark:border-red-900/40 text-red-600 dark:text-red-400'
                              : 'border-slate-100 dark:border-slate-800 text-slate-500'
                          }`}>
                            <span className={`flex items-center gap-1 ${dlInfo.isExpired ? 'font-bold text-red-600 dark:text-red-400' : ''}`}>
                              {dlInfo.isExpired ? (
                                <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />
                              ) : (
                                <Clock className="w-3 h-3 text-slate-400 flex-shrink-0" />
                              )}
                              {dlInfo.isExpired
                                ? `Utgången (${dlInfo.formattedDeadline})`
                                : dlInfo.formattedDeadline}
                            </span>
                            {tender.assigned_to && (
                              <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
                                <User className="w-3 h-3 text-slate-400" />
                                {tender.assigned_to}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Notes preview */}
                        {tender.notes && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-850 p-2 rounded-lg italic line-clamp-2 border border-slate-100 dark:border-slate-800">
                            "{tender.notes}"
                          </p>
                        )}

                        {/* Status Mover Dropdown & Delete */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={tender.status}
                            onChange={(e) => handleStatusChange(tender.id, e.target.value as TenderStatus)}
                            className="text-[11px] font-semibold py-1 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer"
                          >
                            {COLUMNS.map(c => (
                              <option key={c.id} value={c.id}>{c.icon} {c.title}</option>
                            ))}
                          </select>

                          <button
                            onClick={(e) => handleDelete(tender.id, e)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                            title="Ta bort från pipeline"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

