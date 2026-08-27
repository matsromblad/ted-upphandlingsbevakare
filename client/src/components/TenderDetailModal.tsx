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
  TrendingUp,
  ShieldAlert,
  ListOrdered
} from 'lucide-react';
import { Notice, SavedTender, AIAnalysis, TenderStatus, Priority } from '../types';
import { api } from '../api';

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
  const [saving, setSaving] = useState(false);

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
    try {
      const res = await api.analyzeNotice(notice);
      if (res.success && res.analysis) {
        setAiAnalysis(res.analysis);
        onTenderUpdated();
      }
    } catch (e) {
      console.error('Failed to run AI analysis:', e);
    } finally {
      setAnalyzing(false);
    }
  };

  const getDeadlineBadge = () => {
    if (!notice.deadline) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" /> Ingen deadline
        </span>
      );
    }

    if (notice.deadlineStatus === 'EXPIRED') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" /> Utgången ({notice.deadline})
        </span>
      );
    }

    if (notice.deadlineStatus === 'EXPIRING_SOON') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1.5 animate-pulse">
          <Clock className="w-3.5 h-3.5" /> {notice.daysRemaining} dagar kvar ({notice.deadline})
        </span>
      );
    }

    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" /> {notice.daysRemaining} dagar kvar ({notice.deadline})
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] z-10">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  TED: {notice.publicationNumber}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 uppercase">
                  {notice.formType}
                </span>
                {getDeadlineBadge()}
              </div>

              <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">
                {notice.title}
              </h2>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400 pt-1">
                <span className="flex items-center gap-1 font-medium text-slate-900 dark:text-slate-200">
                  <Building className="w-3.5 h-3.5 text-ted-600" />
                  {notice.buyer}
                </span>
                {notice.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {notice.city}, {notice.country}
                  </span>
                )}
                {notice.publicationDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
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
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveToPipeline}
                disabled={saving}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  savedItem
                    ? 'bg-emerald-600 text-white shadow-sm'
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
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-100 dark:bg-purple-950/60 hover:bg-purple-200 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-xs font-semibold transition-all"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Fråga MiniMax Copilot
              </button>
            </div>

            {/* External Links */}
            <div className="flex items-center gap-2">
              {notice.links?.tedHtml && (
                <a
                  href={notice.links.tedHtml}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                  Officiell TED (HTML)
                </a>
              )}
              {notice.links?.tedPdf && (
                <a
                  href={notice.links.tedPdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  <FileText className="w-3.5 h-3.5 text-red-500" />
                  PDF
                </a>
              )}
              {notice.links?.submission && (
                <a
                  href={notice.links.submission}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 text-xs font-semibold"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Lämna anbud
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-100/50 dark:bg-slate-850">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'border-ted-600 text-ted-600 dark:text-ted-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            Översikt & Beskrivning
          </button>

          <button
            onClick={() => setActiveTab('ai-analysis')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'ai-analysis'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-500" />
            MiniMax AI-Analys
            {aiAnalysis && (
              <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold">
                {aiAnalysis.fitScore}%
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('internal')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'internal'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
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
              {/* Description Section */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Beskrivning av upphandlingen</h3>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed shadow-sm">
                  {notice.description || 'Ingen fullständig beskrivningstext tillgänglig i TED:s indexfält för detta meddelande. Se officiella TED-länkar ovan för komplett förfrågningsunderlag.'}
                </div>
              </div>

              {/* CPV Codes */}
              {uniqueCpvDetails.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">CPV-koder (Klassificering)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {uniqueCpvDetails.map((cpv, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 flex items-start gap-2.5 shadow-sm"
                      >
                        <Tag className="w-4 h-4 text-ted-600 dark:text-ted-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-mono font-bold text-ted-700 dark:text-ted-300">{cpv.code}</span>
                          <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-snug">{cpv.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Authority & Procurement Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 shadow-sm">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Upphandlande Myndighet</h4>
                  <div className="text-sm space-y-1">
                    <p className="font-semibold text-slate-900 dark:text-white">{notice.buyer}</p>
                    {notice.city && <p className="text-slate-600 dark:text-slate-300">{notice.city}, {notice.country}</p>}
                    {notice.links?.buyerProfile && (
                      <a
                        href={notice.links.buyerProfile}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-ted-600 dark:text-ted-400 hover:underline flex items-center gap-1 pt-1"
                      >
                        <ExternalLink className="w-3 h-3" /> Köparprofil
                      </a>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 shadow-sm">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Viktiga Datum & Status</h4>
                  <div className="text-sm space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Publicerad:</span>
                      <span className="font-medium text-slate-900 dark:text-white">{notice.publicationDate || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Sista anbudsdag:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{notice.deadline || 'Ej angiven'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Dagar kvar:</span>
                      <span className="font-medium text-slate-900 dark:text-white">
                        {notice.daysRemaining !== null ? `${notice.daysRemaining} dagar` : '-'}
                      </span>
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
                  <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400 mx-auto">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <div className="max-w-md mx-auto space-y-1">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Djupgående anbudsanalys med MiniMax-M3
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      MiniMax analyserar upphandlingen mot ert företags profil, beräknar matchningspoäng (0-100%), extraherar skall-krav och genererar konkreta anbudsstrategier.
                    </p>
                  </div>
                  <button
                    onClick={handleRunAiAnalysis}
                    disabled={analyzing}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold text-sm shadow-md shadow-purple-500/20 inline-flex items-center gap-2"
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
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40 border border-purple-200 dark:border-purple-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex flex-col items-center justify-center shadow-lg shadow-purple-500/30">
                        <span className="text-2xl font-black">{aiAnalysis.fitScore}%</span>
                        <span className="text-[9px] uppercase font-bold tracking-wider opacity-80">Matchning</span>
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
                      className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300 text-xs font-semibold hover:bg-purple-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
                    >
                      {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      Kör om analys
                    </button>
                  </div>

                  {/* Summary */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Sammanfattning</h4>
                    <p className="text-sm text-slate-800 dark:text-slate-100 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 leading-relaxed shadow-sm">
                      {aiAnalysis.summary}
                    </p>
                  </div>

                  {/* Two Columns: Key Requirements & Opportunities */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Key Requirements */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        Viktiga krav & Kvalificering
                      </h4>
                      <ul className="space-y-1.5">
                        {aiAnalysis.keyRequirements?.map((req, idx) => (
                          <li key={idx} className="text-xs p-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-slate-800 dark:text-slate-100 flex items-start gap-2 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 mt-1.5 flex-shrink-0" />
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Opportunities */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        Möjligheter & Fördelar
                      </h4>
                      <ul className="space-y-1.5">
                        {aiAnalysis.opportunities?.map((opp, idx) => (
                          <li key={idx} className="text-xs p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-slate-800 dark:text-slate-100 flex items-start gap-2 shadow-sm">
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
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4" />
                        Risker & Utmaningar att beakta
                      </h4>
                      <ul className="space-y-1.5">
                        {aiAnalysis.risksAndChallenges.map((risk, idx) => (
                          <li key={idx} className="text-xs p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-slate-800 dark:text-slate-100 flex items-start gap-2 shadow-sm">
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
                      <h4 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4" />
                        Rekommenderad Anbudsstrategi
                      </h4>
                      <div className="text-xs p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 text-slate-800 dark:text-slate-100 leading-relaxed shadow-sm">
                        {aiAnalysis.recommendedBidStrategy}
                      </div>
                    </div>
                  )}

                  {/* Questions for Clarification */}
                  {aiAnalysis.clarificationQuestions && aiAnalysis.clarificationQuestions.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <HelpCircle className="w-4 h-4 text-ted-600 dark:text-ted-400" />
                        Förslag på frågor att ställa till upphandlaren
                      </h4>
                      <ul className="space-y-1.5">
                        {aiAnalysis.clarificationQuestions.map((q, idx) => (
                          <li key={idx} className="text-xs p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 flex items-start gap-2 shadow-sm">
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
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pipeline Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TenderStatus)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-ted-500"
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
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Prioritet</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-ted-500"
                  >
                    <option value="LOW">Låg</option>
                    <option value="MEDIUM">Medel</option>
                    <option value="HIGH">Hög</option>
                    <option value="URGENT">🔥 Brådskande / Kritisk</option>
                  </select>
                </div>

                {/* Internal Deadline */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Intern Deadline (Frågor/Utkast)</label>
                  <input
                    type="date"
                    value={internalDeadline}
                    onChange={(e) => setInternalDeadline(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-ted-500"
                  />
                </div>

                {/* Assigned To */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Ansvarig person</label>
                  <input
                    type="text"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    placeholder="t.ex. Anna Svensson"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-ted-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Interna anteckningar & Checklista</label>
                <textarea
                  rows={5}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Skriv interna kommentarer, datum för frågestund, underleverantörer, prisstrategi..."
                  className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-ted-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveToPipeline}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-ted-600 hover:bg-ted-700 text-white text-sm font-semibold shadow-md shadow-ted-600/20 inline-flex items-center gap-2"
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
