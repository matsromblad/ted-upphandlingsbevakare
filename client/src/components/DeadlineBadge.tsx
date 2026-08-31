import React from 'react';
import { Clock, AlertTriangle, AlertCircle } from 'lucide-react';
import { DeadlineInfo } from '../utils/dateUtils';

type IconName = 'clock' | 'alert-triangle' | 'alert-circle' | 'none';

interface DeadlineBadgeProps {
  info: DeadlineInfo;
  /** 'pill' = rounded badge with background (cards, table cells, modal header). 'text' = plain inline text with an icon (compact list rows). */
  variant?: 'pill' | 'text';
  /** Overrides the default label text (e.g. a shorter "Xd kvar" form). */
  label?: string;
  /** Overrides the default icon choice for the current status. */
  icon?: IconName;
  /** When there is no deadline at all: render nothing (default) or a neutral placeholder. */
  hideWhenNoDeadline?: boolean;
  className?: string;
}

const ICONS: Record<Exclude<IconName, 'none'>, React.ComponentType<{ className?: string }>> = {
  clock: Clock,
  'alert-triangle': AlertTriangle,
  'alert-circle': AlertCircle
};

const PILL_TONE_CLASSES: Record<'expired' | 'soon' | 'open', string> = {
  expired: 'bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700 font-bold',
  soon: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-bold',
  open: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold'
};

const TEXT_TONE_CLASSES: Record<'expired' | 'soon' | 'open', string> = {
  expired: 'text-red-600 dark:text-red-400 font-bold',
  soon: 'text-amber-700 dark:text-amber-400 font-semibold',
  open: 'text-slate-600 dark:text-slate-400 font-semibold'
};

/**
 * Renders the deadline status (expired / expiring soon / open) with a consistent color and
 * icon scheme, wherever a notice's deadline is shown (search results, watchlist hits,
 * pipeline cards, the detail modal). Centralizes the status -> color/icon mapping so it only
 * needs to change in one place; callers still control exact label text and container style.
 */
export const DeadlineBadge: React.FC<DeadlineBadgeProps> = ({
  info,
  variant = 'pill',
  label,
  icon,
  hideWhenNoDeadline = true,
  className = ''
}) => {
  if (!info.hasDeadline) {
    if (hideWhenNoDeadline) return null;
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-1.5 ${className}`}>
        <Clock className="w-3.5 h-3.5" /> Ingen deadline
      </span>
    );
  }

  const tone: 'expired' | 'soon' | 'open' = info.isExpired ? 'expired' : info.status === 'EXPIRING_SOON' ? 'soon' : 'open';
  const iconName: IconName = icon ?? (tone === 'expired' ? 'alert-triangle' : 'clock');
  const Icon = iconName === 'none' ? null : ICONS[iconName];

  const defaultLabel = tone === 'expired'
    ? `Utgången (${info.formattedDeadline})`
    : `${info.daysRemaining} ${info.daysRemaining === 1 ? 'dag' : 'dagar'} kvar (${info.formattedDeadline})`;
  const text = label ?? defaultLabel;

  if (variant === 'text') {
    return (
      <span className={`flex items-center gap-1 ${TEXT_TONE_CLASSES[tone]} ${className}`}>
        {Icon && <Icon className="w-3 h-3 flex-shrink-0" />}
        {text}
      </span>
    );
  }

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs flex items-center gap-1.5 ${PILL_TONE_CLASSES[tone]} ${className}`}>
      {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
      <span>{text}</span>
    </span>
  );
};
