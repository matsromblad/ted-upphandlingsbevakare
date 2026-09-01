import React from 'react';
import { Bookmark, ExternalLink, Building, MapPin, Coins, Globe2, EyeOff, Eye } from 'lucide-react';
import { Notice } from '../types';
import { getDeadlineInfo } from '../utils/dateUtils';
import { DeadlineBadge } from './DeadlineBadge';

interface NoticeCardProps {
  notice: Notice;
  isSaved: boolean;
  onSave: (notice: Notice, e: React.MouseEvent) => void;
  onOpenDetail: (notice: Notice) => void;
  /** Extra badges rendered before the standard publication-number / form-type tags (e.g. watchlist name, "NY") */
  extraBadges?: React.ReactNode;
  /** Highlights the card border/background as an unread watchlist hit */
  isUnread?: boolean;
  /** True if the tender has been dismissed / hidden by the user */
  isHidden?: boolean;
  /** Callback to toggle hidden status */
  onToggleHide?: (notice: Notice, e: React.MouseEvent) => void;
}

export const NoticeCard: React.FC<NoticeCardProps> = ({
  notice,
  isSaved,
  onSave,
  onOpenDetail,
  extraBadges,
  isUnread = false,
  isHidden = false,
  onToggleHide
}) => {
  const dlInfo = getDeadlineInfo(notice.deadline, notice.deadlineStatus, notice.daysRemaining);
  const tenderPortalUrl = notice.links?.submission || notice.links?.documents;

  if (isHidden) {
    return (
      <div
        onClick={() => onOpenDetail(notice)}
        className="bg-slate-100/70 dark:bg-slate-900/60 rounded-2xl p-3 sm:p-3.5 border border-dashed border-slate-300 dark:border-slate-800 opacity-40 hover:opacity-85 transition-all cursor-pointer flex items-center justify-between gap-3 group select-none"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center gap-1 flex-shrink-0">
            <EyeOff className="w-2.5 h-2.5" /> Dold
          </span>
          <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 flex-shrink-0">
            {notice.publicationNumber}
          </span>
          <span className="text-xs text-slate-600 dark:text-slate-400 truncate italic">
            {notice.title}
          </span>
          {notice.buyer && (
            <span className="text-xs text-slate-400 truncate hidden md:inline">
              • {notice.buyer}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {onToggleHide && (
            <button
              onClick={(e) => onToggleHide(notice, e)}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 shadow-sm"
              title="Gör denna upphandling synlig igen"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Gör synlig</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => onOpenDetail(notice)}
      className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group space-y-4 ${
        dlInfo.isExpired
          ? 'border-red-300 dark:border-red-800/80 hover:border-red-500 dark:hover:border-red-500 ring-1 ring-red-400/20'
          : isUnread
          ? 'border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 hover:border-amber-400'
          : 'border-slate-200 dark:border-slate-800 hover:border-ted-400 dark:hover:border-ted-600'
      }`}
    >
      <div className="space-y-2.5">
        {/* Top metadata tags */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {extraBadges}
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {notice.publicationNumber}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 uppercase">
              {notice.formType}
            </span>
            {notice.portalName && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                <Globe2 className="w-2.5 h-2.5" />
                {notice.portalName}
              </span>
            )}
          </div>

          {/* Value Badge & Deadline Badge */}
          <div className="flex items-center gap-1.5">
            {notice.estimatedValueFormatted && (
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1"
                title={`Uppskattat värde: ${notice.estimatedValue}`}
              >
                <Coins className="w-3 h-3 text-emerald-600" />
                {notice.estimatedValueFormatted}
              </span>
            )}
            <DeadlineBadge
              info={dlInfo}
              icon={dlInfo.isExpired ? 'alert-circle' : 'clock'}
              label={dlInfo.isExpired ? undefined : `${dlInfo.daysRemaining}d kvar`}
              className="text-[11px]"
            />
          </div>
        </div>

        {/* Title */}
        <h3 className="font-bold text-base text-slate-900 dark:text-white leading-snug group-hover:text-ted-600 dark:group-hover:text-ted-400 transition-colors line-clamp-2">
          {notice.title}
        </h3>

        {/* Buyer & Location */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
          <span className="flex items-center gap-1 font-medium text-slate-900 dark:text-slate-200 truncate max-w-[240px]">
            <Building className="w-3.5 h-3.5 text-ted-600 flex-shrink-0" />
            <span className="truncate">{notice.buyer}</span>
          </span>
          {notice.city && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              {notice.city}, {notice.country}
            </span>
          )}
        </div>

        {/* Description snippet */}
        {notice.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {notice.description}
          </p>
        )}

        {/* CPV preview pills */}
        {notice.cpvDetails && notice.cpvDetails.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {notice.cpvDetails.slice(0, 2).map((cpv, idx) => (
              <span
                key={idx}
                className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 truncate max-w-[200px]"
                title={`${cpv.code} - ${cpv.label}`}
              >
                {cpv.label}
              </span>
            ))}
            {notice.cpvDetails.length > 2 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                +{notice.cpvDetails.length - 2}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Card Footer Actions */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
        <span className="text-slate-400">Publ: {notice.publicationDate}</span>

        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {onToggleHide && (
            <button
              onClick={(e) => onToggleHide(notice, e)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              title="Dölj upphandling"
            >
              <EyeOff className="w-3.5 h-3.5" />
            </button>
          )}

          {tenderPortalUrl && (
            <a
              href={tenderPortalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-semibold flex items-center gap-1 transition-colors text-xs"
              title={notice.portalName ? `Öppna anbud i ${notice.portalName}` : 'Öppna anbudsförfrågan'}
            >
              <ExternalLink className="w-3 h-3" />
              <span>{notice.portalName || 'Anbud'}</span>
            </a>
          )}

          <button
            onClick={(e) => onSave(notice, e)}
            className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
              isSaved
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
            title={isSaved ? 'Sparad i pipeline' : 'Spara till pipeline'}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>{isSaved ? 'Sparad' : 'Spara'}</span>
          </button>

          <button
            onClick={() => onOpenDetail(notice)}
            className="px-3 py-1.5 rounded-lg bg-ted-50 hover:bg-ted-100 dark:bg-ted-950/60 dark:hover:bg-ted-900/60 text-ted-700 dark:text-ted-300 font-semibold flex items-center gap-1"
          >
            <span>Detaljer & AI</span>
          </button>
        </div>
      </div>
    </div>
  );
};
