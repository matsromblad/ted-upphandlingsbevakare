import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Mail,
  MessageSquare,
  FileCode,
  Globe2,
  CheckCircle2,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { Notice, AIAnalysis } from '../types';

interface ShareAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  notice: Notice;
  analysis: AIAnalysis;
}

export const ShareAnalysisModal: React.FC<ShareAnalysisModalProps> = ({
  isOpen,
  onClose,
  notice,
  analysis
}) => {
  const [copiedType, setCopiedType] = useState<string | null>(null);

  if (!isOpen) return null;

  const tenderUrl = notice.links?.submission || notice.links?.tedHtml || notice.links?.documents || window.location.href;

  const showCopyFeedback = (type: string) => {
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  // 1. Teams / Slack summary
  const getTeamsSummary = () => {
    const rolesText = (analysis.requestedRoles || [])
      .map(item => {
        const isObj = typeof item === 'object' && item !== null;
        return `• ${isObj ? (item as any).role : item}`;
      })
      .join('\n');

    return `🎯 *AI-Anbudsanalys: ${notice.title}*
🏢 *Upphandlande myndighet:* ${notice.buyer || 'Ej angiven'}
📍 *Ort/Land:* ${notice.city || 'Ej angiven'}, ${notice.country || 'Sverige'}
📅 *Sista anbudsdag:* ${notice.deadline || 'Ej angiven'}
⭐ *Matchningsgrad:* ${analysis.fitScore}%
💰 *Värde/Takbelopp:* ${analysis.estimatedValueOrBudget || notice.estimatedValueFormatted || 'Enligt underlag'}

📝 *Sammanfattning:*
${analysis.summary || 'Se bifogad information.'}

${rolesText ? `👥 *Eftersökta roller:*\n${rolesText}\n` : ''}
${analysis.recommendedBidStrategy ? `🚀 *Anbudsstrategi:* ${analysis.recommendedBidStrategy}\n` : ''}
🔗 *Länk:* ${tenderUrl}
`;
  };

  // 2. Full Markdown
  const getMarkdownContent = () => {
    let md = `# Anbudsanalys: ${notice.title}\n\n`;
    md += `- **Upphandlande myndighet:** ${notice.buyer || '-'}\n`;
    md += `- **TED-nummer:** ${notice.publicationNumber || '-'}\n`;
    md += `- **Sista anbudsdag:** ${notice.deadline || '-'}\n`;
    md += `- **Matchningsgrad:** ${analysis.fitScore}%\n`;
    md += `- **Förväntat värde:** ${analysis.estimatedValueOrBudget || notice.estimatedValueFormatted || '-'}\n`;
    md += `- **Avtalsvillkor:** ${analysis.standardContractTerms || 'ABK 09'}\n\n`;

    md += `## Sammanfattning\n${analysis.summary}\n\n`;

    if (analysis.requestedRoles?.length) {
      md += `## Eftersökta roller & krav\n`;
      analysis.requestedRoles.forEach(r => {
        const isObj = typeof r === 'object' && r !== null;
        md += `### ${isObj ? (r as any).role : r}\n${isObj ? (r as any).requirements : ''}\n\n`;
      });
    }

    if (analysis.requiredSubmissionDocuments?.length) {
      md += `## Handlingar som ska lämnas in\n`;
      analysis.requiredSubmissionDocuments.forEach(d => {
        md += `- [ ] ${d}\n`;
      });
      md += `\n`;
    }

    if (analysis.keyRequirements?.length) {
      md += `## Viktiga krav\n`;
      analysis.keyRequirements.forEach(k => {
        md += `- ${k}\n`;
      });
      md += `\n`;
    }

    if (analysis.opportunities?.length) {
      md += `## Möjligheter\n`;
      analysis.opportunities.forEach(o => {
        md += `- ${o}\n`;
      });
      md += `\n`;
    }

    if (analysis.risksAndChallenges?.length) {
      md += `## Risker & Utmaningar\n`;
      analysis.risksAndChallenges.forEach(risk => {
        md += `- ⚠ ${risk}\n`;
      });
      md += `\n`;
    }

    if (analysis.recommendedBidStrategy) {
      md += `## Rekommenderad anbudsstrategi\n${analysis.recommendedBidStrategy}\n\n`;
    }

    if (analysis.clarificationQuestions?.length) {
      md += `## Frågor till upphandlaren\n`;
      analysis.clarificationQuestions.forEach((q, idx) => {
        md += `${idx + 1}. ${q}\n`;
      });
      md += `\n`;
    }

    md += `## Källor\n- ${tenderUrl}\n`;
    return md;
  };

  // 3. Email link (mailto)
  const getMailtoLink = () => {
    const subject = encodeURIComponent(`Anbudsanalys: ${notice.title.slice(0, 60)} (${analysis.fitScore}% matchning)`);
    const body = encodeURIComponent(getTeamsSummary());
    return `mailto:?subject=${subject}&body=${body}`;
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Anbudsanalys: ${notice.title}`,
          text: `Anbudsanalys (${analysis.fitScore}% matchning) för ${notice.buyer}: ${analysis.summary.slice(0, 140)}...`,
          url: tenderUrl
        });
      } catch (err) {
        // User cancelled or share failed
      }
    }
  };

  const handleCopyTeams = () => {
    navigator.clipboard.writeText(getTeamsSummary());
    showCopyFeedback('teams');
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(getMarkdownContent());
    showCopyFeedback('markdown');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(tenderUrl);
    showCopyFeedback('link');
  };

  const supportsNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <div className="fixed inset-0 z-60 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Dela AI-Anbudsanalys</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Dela direkt med kollegor, projektteam eller i samarbetsytor</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          
          {/* Project Mini Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
            <div className="space-y-0.5 truncate">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {notice.title}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {notice.buyer} • Deadline: {notice.deadline || 'Ej angiven'}
              </p>
            </div>
            <span className="text-xs font-bold px-2 py-1 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex-shrink-0">
              {analysis.fitScore}% match
            </span>
          </div>

          {/* Action List */}
          <div className="space-y-2.5">

            {/* Native Share button if supported */}
            {supportsNativeShare && (
              <button
                onClick={handleNativeShare}
                className="w-full p-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold text-xs flex items-center justify-between shadow-md shadow-purple-500/20 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <Share2 className="w-4 h-4" />
                  <span>Dela via enhetens delningsmeny (AirDrop, appar, meddelande)</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}

            {/* 1. Teams / Slack Copy */}
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 hover:border-purple-300 dark:hover:border-purple-700 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Kopiera för Teams / Slack</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Snyggt formaterad snabbsammanfattning med punkter</p>
                </div>
              </div>
              <button
                onClick={handleCopyTeams}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  copiedType === 'teams'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-750 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                {copiedType === 'teams' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedType === 'teams' ? 'Kopierat!' : 'Kopiera'}
              </button>
            </div>

            {/* 2. Email (Outlook / Mail) */}
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 hover:border-purple-300 dark:hover:border-purple-700 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Skicka via E-post</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Öppnar nytt mejlutkast med förifylld anbudsanalys</p>
                </div>
              </div>
              <a
                href={getMailtoLink()}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-750 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <Mail className="w-3.5 h-3.5" />
                Öppna mejl
              </a>
            </div>

            {/* 3. Markdown Copy */}
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 hover:border-purple-300 dark:hover:border-purple-700 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <FileCode className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Kopiera som Markdown</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Fullständig analys för OneNote, Notion eller Obsidian</p>
                </div>
              </div>
              <button
                onClick={handleCopyMarkdown}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  copiedType === 'markdown'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-750 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                {copiedType === 'markdown' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedType === 'markdown' ? 'Kopierat!' : 'Kopiera'}
              </button>
            </div>

            {/* 4. Tender Link */}
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 hover:border-purple-300 dark:hover:border-purple-700 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                  <Globe2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Kopiera direktlänk</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Länk till anbudsförfrågan eller TED-kungörelsen</p>
                </div>
              </div>
              <button
                onClick={handleCopyLink}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  copiedType === 'link'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-750 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                {copiedType === 'link' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedType === 'link' ? 'Kopierat!' : 'Kopiera'}
              </button>
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors"
          >
            Stäng
          </button>
        </div>

      </div>
    </div>
  );
};
