import React, { useState, useEffect } from 'react';
import {
  X,
  Building,
  MapPin,
  Calendar,
  Clock,
  ExternalLink,
  Bookmark,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileText,
  MessageSquare,
  Tag,
  Kanban,
  Save,
  Loader2,
  HelpCircle,
  Coins,
  TrendingUp,
  ShieldAlert,
  Users,
  CalendarRange,
  Scale,
  CheckSquare,
  FileCheck2,
  FileDown,
  Copy,
  Check,
  Globe2,
  FolderOpen
} from 'lucide-react';
import { Notice, SavedTender, AIAnalysis, TenderStatus, Priority, RequestedRole } from '../types';
import { api } from '../api';
import { getDeadlineInfo, formatDeadline } from '../utils/dateUtils';
import { UserSelectDropdown } from './UserSelectDropdown';

interface TenderDetailModalProps {
  notice: Notice | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenChatWithNotice: (notice: Notice) => void;
  savedTenders: SavedTender[];
  onTenderUpdated: () => void;
}

export const TenderDetailModal: React.FC<TenderDetailModalProps> = ({
  notice,
  isOpen,
  onClose,
  onOpenChatWithNotice,
  savedTenders,
  onTenderUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'ai-analysis' | 'internal'>('overview');
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Internal state
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<TenderStatus>('INBOX');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [internalDeadline, setInternalDeadline] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  const savedItem = notice ? savedTenders.find(t => t.notice_id === notice.id) : null;

  // Deduplicate CPV codes for display
  const uniqueCpvDetails = React.useMemo(() => {
    if (!notice?.cpvDetails) return [];
    const seen = new Set<string>();
    return notice.cpvDetails.filter(cpv => {
      if (!cpv || !cpv.code) return false;
      if (seen.has(cpv.code)) return false;
      seen.add(cpv.code);
      return true;
    });
  }, [notice?.cpvDetails]);

  useEffect(() => {
    if (notice) {
      setAnalysisError(null);
      if (savedItem) {
        setNotes(savedItem.notes || '');
        setStatus(savedItem.status || 'INBOX');
        setPriority(savedItem.priority || 'MEDIUM');
        setInternalDeadline(savedItem.internal_deadline || '');
        setAssignedTo(savedItem.assigned_to || '');
        setAiAnalysis(savedItem.aiAnalysis || null);
      } else {
        setNotes('');
        setStatus('INBOX');
        setPriority('MEDIUM');
        setInternalDeadline('');
        setAssignedTo('');
        setAiAnalysis(null);
      }
    }
  }, [notice, savedItem]);

  if (!isOpen || !notice) return null;

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  const handleSaveToPipeline = async () => {
    setSaving(true);
    try {
      await api.saveToPipeline(notice, {
        status,
        priority,
        notes,
        internalDeadline: internalDeadline || null,
        assignedTo
      });
      onTenderUpdated();
    } catch (e) {
      console.error('Failed to save tender to pipeline:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleRunAiAnalysis = async () => {
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const res = await api.analyzeNotice(notice);
      if (res.success && res.analysis) {
        setAiAnalysis(res.analysis);
        onTenderUpdated();
      } else {
        setAnalysisError(res.error || 'Kunde inte genomföra AI-analys. Kontrollera anslutningen och försök igen.');
      }
    } catch (e: any) {
      console.error('Failed to run AI analysis:', e);
      setAnalysisError(e?.message || 'Ett oväntat fel inträffade vid analysen.');
    } finally {
      setAnalyzing(false);
    }
  };

  const deadlineInfo = getDeadlineInfo(
    notice.deadline,
    notice.deadlineStatus,
    notice.daysRemaining
  );

  const getDeadlineBadge = () => {
    if (!deadlineInfo.hasDeadline) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" /> Ingen deadline
        </span>
      );
    }

    if (deadlineInfo.isExpired) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-950/90 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700 flex items-center gap-1.5 shadow-sm">
          <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <span>Utgången ({deadlineInfo.formattedDeadline})</span>
        </span>
      );
    }

    if (deadlineInfo.status === 'EXPIRING_SOON') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1.5 animate-pulse">
          <Clock className="w-3.5 h-3.5" /> {deadlineInfo.daysRemaining} dagar kvar ({deadlineInfo.formattedDeadline})
        </span>
      );
    }

    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" /> {deadlineInfo.daysRemaining} dagar kvar ({deadlineInfo.formattedDeadline})
      </span>
    );
  };

  // Primary tender portal / submission link
  const tenderPortalUrl = notice.links?.submission || notice.links?.documents;
  const portalName = notice.portalName || notice.links?.portalName;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal Container */}
      <div className={`relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10 transition-all ${
        deadlineInfo.isExpired
          ? 'border-2 border-red-500 dark:border-red-500 ring-2 ring-red-500/20 shadow-red-500/10'
          : 'border border-slate-200 dark:border-slate-800'
      }`}>
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                  TED: {notice.publicationNumber}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase">
                  {notice.formType}
                </span>
                {portalName && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                    <Globe2 className="w-3 h-3" /> {portalName}
                  </span>
                )}
                {notice.estimatedValueFormatted && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1" title={notice.estimatedValue}>
                    <Coins className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    {notice.estimatedValueFormatted}
                  </span>
                )}
                {getDeadlineBadge()}
              </div>

              <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">
                {notice.title}
              </h2>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300 pt-1">
                <span className="flex items-center gap-1 font-semibold text-slate-900 dark:text-white">
                  <Building className="w-3.5 h-3.5 text-ted-600 dark:text-ted-400" />
                  {notice.buyer}
                </span>
                {notice.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    {notice.city}, {notice.country}
                  </span>
                )}
                {notice.publicationDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    Publicerad: {notice.publicationDate}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-200/80 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleSaveToPipeline}
                disabled={saving}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  savedItem
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                    : 'bg-ted-600 hover:bg-ted-700 text-white shadow-md shadow-ted-600/20'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                {savedItem ? 'Sparad i Pipeline' : 'Spara i Pipeline'}
              </button>

              <button
                onClick={() => {
                  onClose();
                  onOpenChatWithNotice(notice);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-100 dark:bg-purple-950/70 hover:bg-purple-200 dark:hover:bg-purple-900/80 text-purple-700 dark:text-purple-200 border border-purple-200 dark:border-purple-800 text-xs font-semibold transition-all"
              >
                <MessageSquare className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                Fråga MiniMax Copilot
              </button>
            </div>

            {/* External Links & Direct Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {tenderPortalUrl && (
                <a
                  href={tenderPortalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {portalName ? `Lämna anbud (${portalName})` : 'Lämna anbud / Portal'}
                </a>
              )}
              {notice.links?.documents && notice.links.documents !== tenderPortalUrl && (
                <a
                  href={notice.links.documents}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  <FileDown className="w-3.5 h-3.5 text-blue-600" />
                  Dokument
                </a>
              )}
              {notice.links?.tedHtml && (
                <a
                  href={notice.links.tedHtml}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Officiell TED (HTML)
                </a>
              )}
              {notice.links?.tedPdf && (
                <a
                  href={notice.links.tedPdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-sm"
                >
                  <FileText className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
                  PDF
                </a>
              )}
              {notice.links?.submission && (
                <a
                  href={notice.links.submission}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-ted-600 dark:hover:bg-ted-500 text-white text-xs font-semibold shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Lämna anbud
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-100/80 dark:bg-slate-850">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'border-ted-600 text-ted-600 dark:text-ted-400 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            Översikt & Beskrivning
          </button>

          <button
            onClick={() => setActiveTab('ai-analysis')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'ai-analysis'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-500 dark:text-purple-400" />
            MiniMax AI-Analys
            {aiAnalysis && (
              <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800">
                {aiAnalysis.fitScore}%
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('internal')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'internal'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            <Kanban className="w-4 h-4" />
            Pipeline & Anteckningar
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* External Links & Tender Access Hub */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Globe2 className="w-4 h-4 text-ted-600" />
                    Länkar till anbud, dokument & portaler
                  </h3>
                  {portalName && (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      Upphandlingssystem: <strong>{portalName}</strong>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Primary Tender Submission / Portal Link */}
                  {tenderPortalUrl ? (
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/80 to-indigo-50/80 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1">
                            <ExternalLink className="w-3.5 h-3.5" />
                            Anbudsinlämning & Förfrågan
                          </span>
                          {portalName && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                              {portalName}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                          {portalName ? `Lämna anbud i ${portalName}` : 'Gå till extern anbudsförfrågan'}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2 break-all font-mono text-[11px]">
                          {tenderPortalUrl}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-blue-200/60 dark:border-blue-800/60">
                        <a
                          href={tenderPortalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 text-center flex items-center justify-center gap-1.5 transition-all"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Öppna anbudsförfrågan
                        </a>
                        <button
                          type="button"
                          onClick={() => handleCopyLink(tenderPortalUrl)}
                          className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 text-xs font-semibold transition-all"
                          title="Kopiera länk"
                        >
                          {copiedUrl === tenderPortalUrl ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Anbudslänk</span>
                        <p className="text-xs text-slate-500 mt-1">
                          Ingen direkt extern inlämningslänk angiven i TED-index. Se officiell TED-kungörelse för instruktioner.
                        </p>
                      </div>
                      {notice.links?.tedHtml && (
                        <a
                          href={notice.links.tedHtml}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center justify-center gap-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Öppna TED-kungörelse
                        </a>
                      )}
                    </div>
                  )}

                  {/* Documents / Förfrågningsunderlag or Secondary Link */}
                  {notice.links?.documents ? (
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-teal-50/80 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200 dark:border-emerald-800 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                            <FileDown className="w-3.5 h-3.5" />
                            Förfrågningsunderlag
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                            Dokument
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                          Hämta upphandlingsdokument
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2 break-all font-mono text-[11px]">
                          {notice.links.documents}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60">
                        <a
                          href={notice.links.documents}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 text-center flex items-center justify-center gap-1.5 transition-all"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          Öppna dokumentlänk
                        </a>
                        <button
                          type="button"
                          onClick={() => handleCopyLink(notice.links!.documents!)}
                          className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-700 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-slate-700 text-xs font-semibold transition-all"
                          title="Kopiera länk"
                        >
                          {copiedUrl === notice.links.documents ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* TED Official Notice Box */
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <ExternalLink className="w-3.5 h-3.5" />
                            Officiell TED (EU)
                          </span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {notice.publicationNumber}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                          Officiellt kungörelsemeddelande
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">
                          Se den fullständiga officiella kungörelsen på svenska via TED Europa.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                        {notice.links?.tedHtml && (
                          <a
                            href={notice.links.tedHtml}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 px-3 py-2 rounded-xl bg-ted-600 hover:bg-ted-700 text-white text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-all shadow-sm"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Officiell TED (HTML)
                          </a>
                        )}
                        {notice.links?.tedPdf && (
                          <a
                            href={notice.links.tedPdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                          >
                            <FileText className="w-3.5 h-3.5 text-red-500" />
                            PDF
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Additional TED & Buyer Links Row */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-slate-500">Direktlänkar:</span>
                  {notice.links?.tedHtml && (
                    <a
                      href={notice.links.tedHtml}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3 text-ted-600" />
                      TED EU-portal (Svenska)
                    </a>
                  )}
                  {notice.links?.tedPdf && (
                    <a
                      href={notice.links.tedPdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1 transition-colors"
                    >
                      <FileText className="w-3 h-3 text-red-500" />
                      TED Kungörelse (PDF)
                    </a>
                  )}
                  {notice.links?.buyerProfile && (
                    <a
                      href={notice.links.buyerProfile}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1 transition-colors"
                    >
                      <Building className="w-3 h-3 text-slate-500" />
                      Köparprofil / Myndighet
                    </a>
                  )}
                </div>
              </div>

              {/* Three Stat Cards: Buyer, Contract Size, Dates */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Authority */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-ted-600" />
                    Upphandlande Myndighet
                  </h4>
                  <div className="text-sm space-y-1">
                    <p className="font-semibold text-slate-900 dark:text-white leading-snug">{notice.buyer}</p>
                    {notice.city && <p className="text-xs text-slate-600 dark:text-slate-400">{notice.city}, {notice.country}</p>}
                    {notice.links?.buyerProfile && (
                      <a
                        href={notice.links.buyerProfile}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-ted-600 hover:underline flex items-center gap-1 pt-1"
                      >
                        <ExternalLink className="w-3 h-3" /> Köparprofil
                      </a>
                    )}
                  </div>
                </div>

                {/* 2. Contract Size / Estimated Value */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-emerald-600" />
                    Storlek på uppdraget (Värde)
                  </h4>
                  <div className="text-sm space-y-1">
                    {notice.estimatedValue ? (
                      <>
                        <p className="text-base font-black text-emerald-700 dark:text-emerald-400">
                          {notice.estimatedValue}
                        </p>
                        {notice.estimatedValueFormatted && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                            Uppskattat takbelopp: <strong>{notice.estimatedValueFormatted}</strong>
                          </p>
                        )}
                        <p className="text-[11px] text-slate-400">
                          Uppskattat totalvärde / takbelopp
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 italic">
                          Ej specificerat i kungörelsen
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Belopp framgår eventuellt i det fullständiga förfrågningsunderlaget.
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* 3. Important Dates */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    Viktiga Datum & Status
                  </h4>
                  <div className="text-sm space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-xs">Publicerad:</span>
                      <span className="font-medium text-xs text-slate-900 dark:text-white">{notice.publicationDate || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-xs">Sista anbudsdag:</span>
                      <span className="font-bold text-xs text-slate-900 dark:text-white">{notice.deadline || 'Ej angiven'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-xs">Dagar kvar:</span>
                      <span className="font-medium text-xs text-slate-900 dark:text-white">
                        {notice.daysRemaining !== null ? `${notice.daysRemaining} dagar` : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description Section */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Beskrivning av upphandlingen</h3>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 whitespace-pre-wrap leading-relaxed shadow-sm">
                  {notice.description || 'Ingen fullständig beskrivningstext tillgänglig i TED:s indexfält för detta meddelande. Se officiella TED-länkar ovan för komplett förfrågningsunderlag.'}
                </div>
              </div>

              {/* CPV Codes */}
              {uniqueCpvDetails.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">CPV-koder (Klassificering)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {uniqueCpvDetails.map((cpv, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-start gap-2.5 shadow-sm"
                      >
                        <Tag className="w-4 h-4 text-ted-600 dark:text-ted-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-mono font-bold text-ted-700 dark:text-ted-400">{cpv.code}</span>
                          <p className="text-xs text-slate-900 dark:text-slate-200 font-medium leading-snug">{cpv.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Authority & Procurement Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2 shadow-sm">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Upphandlande Myndighet</h4>
                  <div className="text-sm space-y-1">
                    <p className="font-bold text-slate-900 dark:text-white">{notice.buyer}</p>
                    {notice.city && <p className="text-slate-600 dark:text-slate-300">{notice.city}, {notice.country}</p>}
                    {notice.links?.buyerProfile && (
                      <a
                        href={notice.links.buyerProfile}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-ted-600 dark:text-ted-400 hover:underline flex items-center gap-1 pt-1 font-medium"
                      >
                        <ExternalLink className="w-3 h-3" /> Köparprofil
                      </a>
                    )}
                  </div>
                </div>

                <div className={`p-4 rounded-xl border space-y-2 shadow-sm ${
                  deadlineInfo.isExpired
                    ? 'bg-red-50/70 dark:bg-red-950/40 border-red-300 dark:border-red-800'
                    : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                }`}>
                  <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    deadlineInfo.isExpired ? 'text-red-700 dark:text-red-300' : 'text-slate-600 dark:text-slate-400'
                  }`}>
                    {deadlineInfo.isExpired && <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />}
                    Viktiga Datum & Status
                  </h4>
                  <div className="text-sm space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Publicerad:</span>
                      <span className="font-medium text-slate-900 dark:text-white">{notice.publicationDate || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Sista anbudsdag:</span>
                      <span className={`font-bold ${deadlineInfo.isExpired ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
                        {deadlineInfo.formattedDeadline}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400">Dagar kvar:</span>
                      {deadlineInfo.isExpired ? (
                        <span className="font-bold text-xs px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400 flex-shrink-0" />
                          {deadlineInfo.daysPassed
                            ? `Utgick för ${deadlineInfo.daysPassed} ${deadlineInfo.daysPassed === 1 ? 'dag' : 'dagar'} sedan`
                            : 'Utgången (datum har passerat)'}
                        </span>
                      ) : (
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {deadlineInfo.daysRemaining !== null ? `${deadlineInfo.daysRemaining} dagar` : '-'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MINIMAX AI ANALYSIS */}
          {activeTab === 'ai-analysis' && (
            <div className="space-y-6">
              {!aiAnalysis ? (
                <div className="text-center py-10 space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-950/80 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400 mx-auto shadow-sm">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <div className="max-w-md mx-auto space-y-1.5">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Djupgående anbudsanalys med MiniMax-M3
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      MiniMax analyserar upphandlingen mot ert företags profil, beräknar matchningspoäng (0-100%), extraherar skall-krav och genererar konkreta anbudsstrategier.
                    </p>
                  </div>

                  {analysisError && (
                    <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 max-w-md mx-auto flex items-center gap-2 text-left">
                      <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                      <span>{analysisError}</span>
                    </div>
                  )}

                  <button
                    onClick={handleRunAiAnalysis}
                    disabled={analyzing}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold text-sm shadow-lg shadow-purple-500/25 inline-flex items-center gap-2 transition-all disabled:opacity-75"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        MiniMax analyserar upphandlingen...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Kör MiniMax AI-Analys nu
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Top Score Banner */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/50 dark:to-indigo-950/50 border border-purple-200 dark:border-purple-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex flex-col items-center justify-center shadow-lg shadow-purple-500/30 flex-shrink-0">
                        <span className="text-2xl font-black">{aiAnalysis.fitScore}%</span>
                        <span className="text-[9px] uppercase font-bold tracking-wider opacity-90">Matchning</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">MiniMax Relevansbedömning</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          Baserat på era registrerade kompetensnyckelord och upphandlingens kravprofil.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleRunAiAnalysis}
                      disabled={analyzing}
                      className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300 text-xs font-semibold hover:bg-purple-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 shadow-sm flex-shrink-0"
                    >
                      {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      Kör om analys
                    </button>
                  </div>

                  {analysisError && (
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                      <span>{analysisError}</span>
                    </div>
                  )}

                  {/* Summary */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Sammanfattning</h4>
                    <p className="text-sm text-slate-900 dark:text-slate-100 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 leading-relaxed shadow-sm">
                      {aiAnalysis.summary}
                    </p>
                  </div>

                  {/* 3 Key Tender Contract Metrics (Omsättning, Avtalstid, Avtalsvillkor/ABK) */}
                  {(aiAnalysis.estimatedValueOrBudget || aiAnalysis.projectDuration || aiAnalysis.standardContractTerms) && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Förväntad omsättning */}
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1 shadow-sm">
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          <Coins className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                          <span>Förväntad omsättning</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                          {aiAnalysis.estimatedValueOrBudget || 'Framgår ej i underlaget'}
                        </p>
                      </div>

                      {/* Arbetets början och slut */}
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1 shadow-sm">
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          <CalendarRange className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                          <span>Arbetets början & slut</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                          {aiAnalysis.projectDuration || 'Enligt förfrågningsunderlag'}
                        </p>
                      </div>

                      {/* Standardiserade avtal t.ex. ABK */}
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1 shadow-sm">
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          <Scale className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                          <span>Avtalsvillkor (t.ex. ABK)</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                          {aiAnalysis.standardContractTerms || 'Standardavtal / Enligt underlag'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Eftersökta roller och krav */}
                  {aiAnalysis.requestedRoles && aiAnalysis.requestedRoles.length > 0 && (
                    <div className="space-y-2.5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        Eftersökta roller & Kravspecifikation
                      </h4>
                      <div className="grid grid-cols-1 gap-2.5">
                        {aiAnalysis.requestedRoles.map((item, idx) => {
                          const isObj = typeof item === 'object' && item !== null;
                          const roleTitle = isObj ? (item as any).role : 'Roll ' + (idx + 1);
                          const requirements = isObj ? (item as any).requirements : String(item);

                          return (
                            <div
                              key={idx}
                              className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5 shadow-sm"
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-purple-600 dark:bg-purple-400 flex-shrink-0" />
                                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                                  {roleTitle}
                                </span>
                              </div>
                              {requirements && (
                                <p className="text-xs text-slate-800 dark:text-slate-200 pl-4 leading-relaxed whitespace-pre-line">
                                  {requirements}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Handlingar som ska lämnas in i anbudet */}
                  {aiAnalysis.requiredSubmissionDocuments && aiAnalysis.requiredSubmissionDocuments.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-ted-700 dark:text-ted-300 flex items-center gap-1.5">
                        <CheckSquare className="w-4 h-4 text-ted-600 dark:text-ted-400" />
                        Handlingar & Bilagor som ska lämnas in i anbudet
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {aiAnalysis.requiredSubmissionDocuments.map((doc, idx) => (
                          <div
                            key={idx}
                            className="text-xs p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 flex items-start gap-2.5 shadow-sm"
                          >
                            <FileCheck2 className="w-4 h-4 text-ted-600 dark:text-ted-400 flex-shrink-0 mt-0.5" />
                            <span className="font-medium leading-snug">{doc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Two Columns: Key Requirements & Opportunities */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Key Requirements */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        Viktiga krav & Kvalificering
                      </h4>
                      <ul className="space-y-2">
                        {aiAnalysis.keyRequirements?.map((req, idx) => (
                          <li key={idx} className="text-xs p-3 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/80 text-slate-900 dark:text-slate-100 flex items-start gap-2 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 mt-1.5 flex-shrink-0" />
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Opportunities */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        Möjligheter & Fördelar
                      </h4>
                      <ul className="space-y-2">
                        {aiAnalysis.opportunities?.map((opp, idx) => (
                          <li key={idx} className="text-xs p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/80 text-slate-900 dark:text-slate-100 flex items-start gap-2 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 mt-1.5 flex-shrink-0" />
                            <span>{opp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Risks & Red Flags */}
                  {aiAnalysis.risksAndChallenges && aiAnalysis.risksAndChallenges.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        Risker & Utmaningar att beakta
                      </h4>
                      <ul className="space-y-2">
                        {aiAnalysis.risksAndChallenges.map((risk, idx) => (
                          <li key={idx} className="text-xs p-3 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/80 text-slate-900 dark:text-slate-100 flex items-start gap-2 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400 mt-1.5 flex-shrink-0" />
                            <span>{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommended Bid Strategy */}
                  {aiAnalysis.recommendedBidStrategy && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        Rekommenderad Anbudsstrategi
                      </h4>
                      <div className="text-xs p-4 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-900/80 text-slate-900 dark:text-slate-100 leading-relaxed shadow-sm">
                        {aiAnalysis.recommendedBidStrategy}
                      </div>
                    </div>
                  )}

                  {/* Questions for Clarification */}
                  {aiAnalysis.clarificationQuestions && aiAnalysis.clarificationQuestions.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                        <HelpCircle className="w-4 h-4 text-ted-600 dark:text-ted-400" />
                        Förslag på frågor att ställa till upphandlaren
                      </h4>
                      <ul className="space-y-2">
                        {aiAnalysis.clarificationQuestions.map((q, idx) => (
                          <li key={idx} className="text-xs p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 flex items-start gap-2 shadow-sm">
                            <span className="font-bold text-ted-600 dark:text-ted-400">{idx + 1}.</span>
                            <span>{q}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PIPELINE & INTERNAL NOTES */}
          {activeTab === 'internal' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Status selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Pipeline Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TenderStatus)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-ted-500 shadow-sm"
                  >
                    <option value="INBOX">📥 Bevakad / Inbox</option>
                    <option value="REVIEWING">🔍 Granskas / Utvärdering</option>
                    <option value="DECIDED_TO_BID">🎯 Beslut: Vi ska lämna anbud</option>
                    <option value="PREPARING_BID">✍️ Under utarbetande</option>
                    <option value="SUBMITTED">🚀 Inlämnat anbud</option>
                    <option value="WON">🏆 Vunnen upphandling</option>
                    <option value="LOST">❌ Förlorad</option>
                    <option value="ARCHIVED">📦 Arkiverad</option>
                  </select>
                </div>

                {/* Priority selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Prioritet</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-ted-500 shadow-sm"
                  >
                    <option value="LOW">Låg</option>
                    <option value="MEDIUM">Medel</option>
                    <option value="HIGH">Hög</option>
                    <option value="URGENT">🔥 Brådskande / Kritisk</option>
                  </select>
                </div>

                {/* Internal Deadline */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Intern Deadline (Frågor/Utkast)</label>
                  <input
                    type="date"
                    value={internalDeadline}
                    onChange={(e) => setInternalDeadline(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-ted-500 shadow-sm"
                  />
                </div>

                {/* Assigned To (Searchable Dropdown of WSP users) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Ansvarig person (WSP)
                  </label>
                  <UserSelectDropdown
                    value={assignedTo}
                    onChange={setAssignedTo}
                    placeholder="Välj eller sök ansvarig kollega..."
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Interna anteckningar & Checklista</label>
                <textarea
                  rows={5}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Skriv interna kommentarer, datum för frågestund, underleverantörer, prisstrategi..."
                  className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-ted-500 shadow-sm"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveToPipeline}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-ted-600 hover:bg-ted-700 text-white text-sm font-semibold shadow-md shadow-ted-600/20 inline-flex items-center gap-2 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Sparar...' : 'Spara ändringar'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
