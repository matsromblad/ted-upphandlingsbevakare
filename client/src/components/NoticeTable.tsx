import React from 'react';
import { ExternalLink, Bookmark, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, Coins, EyeOff, Eye, Sparkles } from 'lucide-react';
import { Notice } from '../types';
import { getDeadlineInfo, getCountryInfo, isForeignCountry } from '../utils/dateUtils';
import { DeadlineBadge } from './DeadlineBadge';

type SortField = 'id' | 'title' | 'buyer' | 'value' | 'location' | 'publicationDate' | 'deadline';

interface NoticeTableProps {
  notices: Notice[];
  isTenderSaved: (noticeId: string) => boolean;
  onSave: (notice: Notice, e: React.MouseEvent) => void;
  onOpenDetail: (notice: Notice) => void;
  renderRowBadge?: (notice: Notice) => React.ReactNode;
  isRowUnread?: (notice: Notice) => boolean;
  isHidden?: (noticeId: string) => boolean;
  onToggleHide?: (notice: Notice, e: React.MouseEvent) => void;
}

export const NoticeTable: React.FC<NoticeTableProps> = ({
  notices,
  isTenderSaved,
  onSave,
  onOpenDetail,
  renderRowBadge,
  isRowUnread,
  isHidden,
  onToggleHide
}) => {
  const [sortField, setSortField] = React.useState<SortField>('publicationDate');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');

  const handleSortToggle = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'publicationDate' || field === 'deadline' || field === 'value' ? 'desc' : 'asc');
    }
  };

  const sortedNotices = React.useMemo(() => {
    if (!notices || notices.length === 0) return [];
    return [...notices].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      switch (sortField) {
        case 'id':
          valA = a.publicationNumber || a.id || '';
          valB = b.publicationNumber || b.id || '';
          break;
        case 'title':
          valA = (a.title || '').toLowerCase();
          valB = (b.title || '').toLowerCase();
          break;
        case 'buyer':
          valA = (a.buyer || '').toLowerCase();
          valB = (b.buyer || '').toLowerCase();
          break;
        case 'value':
          valA = a.estimatedValueAmount || 0;
          valB = b.estimatedValueAmount || 0;
          break;
        case 'location':
          valA = `${a.city || ''} ${a.country || ''}`.trim().toLowerCase();
          valB = `${b.city || ''} ${b.country || ''}`.trim().toLowerCase();
          break;
        case 'publicationDate':
          valA = a.publicationDate || '';
          valB = b.publicationDate || '';
          break;
        case 'deadline':
          valA = a.deadline || '';
          valB = b.deadline || '';
          break;
        default:
          valA = a.publicationDate || '';
          valB = b.publicationDate || '';
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [notices, sortField, sortDirection]);

  const SortIcon: React.FC<{ field: SortField }> = ({ field }) =>
    sortField === field ? (
      sortDirection === 'asc' ? (
        <ArrowUp className="w-3.5 h-3.5 text-ted-600" />
      ) : (
        <ArrowDown className="w-3.5 h-3.5 text-ted-600" />
      )
    ) : (
      <ArrowUpDown className="w-3 h-3 opacity-40 hover:opacity-100" />
    );

  const headers: { field: SortField; label: string; className?: string }[] = [
    { field: 'id', label: 'TED ID' },
    { field: 'title', label: 'Titel & Beskrivning' },
    { field: 'buyer', label: 'Upphandlare' },
    { field: 'value', label: 'Totalt arvode', className: 'whitespace-nowrap' },
    { field: 'location', label: 'Plats' },
    { field: 'publicationDate', label: 'Publicerat', className: 'whitespace-nowrap' },
    { field: 'deadline', label: 'Deadline', className: 'whitespace-nowrap' }
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider select-none">
            <tr>
              {headers.map(({ field, label, className }) => (
                <th
                  key={field}
                  onClick={() => handleSortToggle(field)}
                  className={`p-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${className || ''}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{label}</span>
                    <SortIcon field={field} />
                  </div>
                </th>
              ))}
              <th className="p-3.5 text-right whitespace-nowrap">Åtgärd</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {sortedNotices.map((notice) => {
              const isSaved = isTenderSaved(notice.id);
              const hidden = isHidden ? isHidden(notice.id) : false;
              const dlInfo = getDeadlineInfo(notice.deadline, notice.deadlineStatus, notice.daysRemaining);
              const tenderPortalUrl = notice.links?.submission || notice.links?.documents;
              const unread = isRowUnread ? isRowUnread(notice) : false;
              const countryInfo = getCountryInfo(notice.country);
              const isForeign = notice.isForeign || isForeignCountry(notice.country);

              return (
                <tr
                  key={notice.id}
                  onClick={() => onOpenDetail(notice)}
                  className={`transition-colors cursor-pointer ${
                    hidden
                      ? 'opacity-40 grayscale hover:opacity-85 bg-slate-100/70 dark:bg-slate-900/80 text-slate-400 dark:text-slate-500'
                      : dlInfo.isExpired
                      ? 'bg-red-50/30 dark:bg-red-950/20 hover:bg-red-50/60 dark:hover:bg-red-950/40'
                      : unread
                      ? 'bg-amber-50/40 dark:bg-amber-950/10 hover:bg-amber-50/70 dark:hover:bg-amber-950/20'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-850/60'
                  }`}
                >
                  <td className="p-3.5 font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {hidden ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase flex items-center gap-0.5">
                          <EyeOff className="w-2.5 h-2.5" /> Dold
                        </span>
                      ) : dlInfo.isExpired ? (
                        <span title="Deadline har passerat">
                          <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                        </span>
                      ) : null}
                      <span className={hidden ? 'line-through opacity-70 text-slate-400' : ''}>{notice.publicationNumber}</span>
                    </div>
                  </td>
                  <td className="p-3.5 max-w-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className={`font-bold line-clamp-1 ${hidden ? 'text-slate-500 dark:text-slate-400 font-normal italic' : 'text-slate-900 dark:text-white'}`}>
                        {notice.translation?.translatedTitle || notice.title}
                      </p>
                      {notice.translation?.translatedTitle && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center gap-0.5" title={`Original: ${notice.title}`}>
                          <Sparkles className="w-2.5 h-2.5" />
                          🇸🇪
                        </span>
                      )}
                      {renderRowBadge?.(notice)}
                    </div>
                    {!hidden && (
                      <p className="text-slate-500 dark:text-slate-400 line-clamp-1">
                        {notice.translation?.translatedDescription || notice.description}
                      </p>
                    )}
                  </td>
                  <td className="p-3.5 font-medium text-slate-800 dark:text-slate-200 max-w-[160px] truncate">
                    <span className={hidden ? 'text-slate-400' : ''}>{notice.buyer}</span>
                  </td>
                  <td className="p-3.5 whitespace-nowrap">
                    {notice.estimatedValueFormatted ? (
                      <span className={`font-bold flex items-center gap-1 ${hidden ? 'text-slate-400' : 'text-emerald-700 dark:text-emerald-400'}`} title={notice.estimatedValue}>
                        <Coins className="w-3.5 h-3.5" />
                        {notice.estimatedValueFormatted}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="p-3.5 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <span>{countryInfo.flag}</span>
                      <span>{notice.city ? `${notice.city}, ` : ''}{countryInfo.name}</span>
                    </div>
                    {notice.portalName && !hidden && (
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                        {notice.portalName}
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-slate-700 dark:text-slate-300 whitespace-nowrap font-medium">
                    {notice.publicationDate || '-'}
                  </td>
                  <td className="p-3.5 whitespace-nowrap">
                    {dlInfo.hasDeadline ? (
                      <DeadlineBadge
                        info={dlInfo}
                        icon={dlInfo.isExpired ? 'alert-circle' : 'none'}
                        label={dlInfo.isExpired ? undefined : dlInfo.formattedDeadline}
                      />
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="p-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      {onToggleHide && (
                        <button
                          onClick={(e) => onToggleHide(notice, e)}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            hidden
                              ? 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300'
                              : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                          }`}
                          title={hidden ? 'Gör synlig igen' : 'Dölj upphandling'}
                        >
                          {hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                      )}
                      {tenderPortalUrl && !hidden && (
                        <a
                          href={tenderPortalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-blue-600 dark:text-blue-400"
                          title={notice.portalName ? `Öppna ${notice.portalName}` : 'Öppna anbudslänk'}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        onClick={(e) => onSave(notice, e)}
                        className={`p-1.5 rounded-lg border text-xs font-semibold ${
                          isSaved
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300'
                        }`}
                        title={isSaved ? 'Sparad i pipeline' : 'Spara'}
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
