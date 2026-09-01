import React from 'react';
import { ExternalLink, Bookmark, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, Coins } from 'lucide-react';
import { Notice } from '../types';
import { getDeadlineInfo } from '../utils/dateUtils';
import { DeadlineBadge } from './DeadlineBadge';

type SortField = 'id' | 'title' | 'buyer' | 'value' | 'location' | 'publicationDate' | 'deadline';

interface NoticeTableProps {
  notices: Notice[];
  isTenderSaved: (noticeId: string) => boolean;
  onSave: (notice: Notice, e: React.MouseEvent) => void;
  onOpenDetail: (notice: Notice) => void;
  renderRowBadge?: (notice: Notice) => React.ReactNode;
  isRowUnread?: (notice: Notice) => boolean;
}

export const NoticeTable: React.FC<NoticeTableProps> = ({
  notices,
  isTenderSaved,
  onSave,
  onOpenDetail,
  renderRowBadge,
  isRowUnread
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
              const dlInfo = getDeadlineInfo(notice.deadline, notice.deadlineStatus, notice.daysRemaining);
              const tenderPortalUrl = notice.links?.submission || notice.links?.documents;
              const unread = isRowUnread ? isRowUnread(notice) : false;

              return (
                <tr
                  key={notice.id}
                  onClick={() => onOpenDetail(notice)}
                  className={`transition-colors cursor-pointer ${
                    dlInfo.isExpired
                      ? 'bg-red-50/30 dark:bg-red-950/20 hover:bg-red-50/60 dark:hover:bg-red-950/40'
                      : unread
                      ? 'bg-amber-50/40 dark:bg-amber-950/10 hover:bg-amber-50/70 dark:hover:bg-amber-950/20'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-850/60'
                  }`}
                >
                  <td className="p-3.5 font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {dlInfo.isExpired && (
                        <span title="Deadline har passerat">
                          <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                        </span>
                      )}
                      <span>{notice.publicationNumber}</span>
                    </div>
                  </td>
                  <td className="p-3.5 max-w-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-bold text-slate-900 dark:text-white line-clamp-1">{notice.title}</p>
                      {renderRowBadge?.(notice)}
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 line-clamp-1">{notice.description}</p>
                  </td>
                  <td className="p-3.5 font-medium text-slate-800 dark:text-slate-200 max-w-[160px] truncate">
                    {notice.buyer}
                  </td>
                  <td className="p-3.5 whitespace-nowrap">
                    {notice.estimatedValueFormatted ? (
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1" title={notice.estimatedValue}>
                        <Coins className="w-3.5 h-3.5 text-emerald-600" />
                        {notice.estimatedValueFormatted}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="p-3.5 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    <div>{notice.city || notice.country}</div>
                    {notice.portalName && (
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
                      {tenderPortalUrl && (
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
