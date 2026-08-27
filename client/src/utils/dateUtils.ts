/**
 * Utility functions for parsing and formatting TED deadlines and dates
 */

export function parseTedDate(str?: string | null): Date | null {
  if (!str) return null;
  const s = String(str).trim();
  if (!s) return null;

  // 1. Direct standard parse
  let d = new Date(s);
  if (!isNaN(d.getTime())) return d;

  // 2. Pattern: YYYY-MM-DD+HH:MM or YYYY-MM-DD-HH:MM or YYYY-MM-DDZ
  const tzMatch = s.match(/^(\d{4}-\d{2}-\d{2})([+-]\d{2}(?::?\d{2})?|Z)$/);
  if (tzMatch) {
    const isoWithTime = `${tzMatch[1]}T23:59:59${tzMatch[2]}`;
    d = new Date(isoWithTime);
    if (!isNaN(d.getTime())) return d;
  }

  // 3. Pattern: YYYY-MM-DD
  const plainMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (plainMatch) {
    d = new Date(`${plainMatch[1]}-${plainMatch[2]}-${plainMatch[3]}T23:59:59`);
    if (!isNaN(d.getTime())) return d;
  }

  // 4. Pattern: YYYYMMDD
  const compactMatch = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compactMatch) {
    d = new Date(`${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}T23:59:59`);
    if (!isNaN(d.getTime())) return d;
  }

  // 5. Replace space with T
  d = new Date(s.replace(' ', 'T'));
  if (!isNaN(d.getTime())) return d;

  return null;
}

export function formatDeadline(str?: string | null): string {
  if (!str) return 'Ej angiven';
  const s = String(str).trim();
  
  // Clean timezone suffix if it's just date + tz (e.g. 2026-08-25+02:00 -> 2026-08-25)
  const dateTzMatch = s.match(/^(\d{4}-\d{2}-\d{2})[+-]\d{2}(?::?\d{2})?$/);
  if (dateTzMatch) {
    return dateTzMatch[1];
  }

  // If ISO datetime e.g. 2026-08-25T17:00:00+02:00 -> 2026-08-25 17:00
  const dateTimeMatch = s.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2})?(?:[+-]\d{2}:?\d{2}|Z)?$/);
  if (dateTimeMatch) {
    return `${dateTimeMatch[1]} ${dateTimeMatch[2]}`;
  }

  return s;
}

export interface DeadlineInfo {
  hasDeadline: boolean;
  formattedDeadline: string;
  status: 'EXPIRED' | 'EXPIRING_SOON' | 'OPEN' | 'UNKNOWN';
  isExpired: boolean;
  daysRemaining: number | null;
  daysPassed: number | null;
  label: string;
}

export function getDeadlineInfo(
  deadlineStr?: string | null,
  serverStatus?: 'EXPIRED' | 'EXPIRING_SOON' | 'OPEN' | 'UNKNOWN',
  serverDays?: number | null
): DeadlineInfo {
  if (!deadlineStr) {
    return {
      hasDeadline: false,
      formattedDeadline: 'Ej angiven',
      status: 'UNKNOWN',
      isExpired: false,
      daysRemaining: null,
      daysPassed: null,
      label: 'Ingen deadline'
    };
  }

  const formatted = formatDeadline(deadlineStr);
  const dlDate = parseTedDate(deadlineStr);

  if (!dlDate) {
    const isServerExpired = serverStatus === 'EXPIRED' || (serverDays !== undefined && serverDays !== null && serverDays <= 0);
    return {
      hasDeadline: true,
      formattedDeadline: formatted,
      status: isServerExpired ? 'EXPIRED' : (serverStatus || 'OPEN'),
      isExpired: isServerExpired,
      daysRemaining: serverDays ?? null,
      daysPassed: isServerExpired && serverDays !== null && serverDays !== undefined ? Math.abs(serverDays) : null,
      label: isServerExpired ? `Utgången (${formatted})` : formatted
    };
  }

  const now = new Date();
  const diffMs = dlDate.getTime() - now.getTime();
  const isExpired = diffMs <= 0 || serverStatus === 'EXPIRED';

  if (isExpired) {
    const daysPassed = Math.max(1, Math.ceil(Math.abs(diffMs) / (1000 * 60 * 60 * 24)));
    const daysText = daysPassed === 1 ? '1 dag sedan' : `${daysPassed} dagar sedan`;
    return {
      hasDeadline: true,
      formattedDeadline: formatted,
      status: 'EXPIRED',
      isExpired: true,
      daysRemaining: -daysPassed,
      daysPassed,
      label: `Utgången (${daysText})`
    };
  }

  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const status = daysRemaining <= 7 ? 'EXPIRING_SOON' : 'OPEN';
  const label = `${daysRemaining} ${daysRemaining === 1 ? 'dag' : 'dagar'} kvar (${formatted})`;

  return {
    hasDeadline: true,
    formattedDeadline: formatted,
    status,
    isExpired: false,
    daysRemaining,
    daysPassed: null,
    label
  };
}
