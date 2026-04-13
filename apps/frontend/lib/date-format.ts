/**
 * Centralized date formatting utilities.
 * All date/time display across the app uses en-GB locale for consistency.
 */

const LOCALE = 'en-GB';

/**
 * Format date only: DD/MM/YYYY
 * e.g. "25/12/2024"
 */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Format date and time: DD/MM/YYYY, HH:mm
 * e.g. "25/12/2024, 14:30"
 */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString(LOCALE, {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

/**
 * Format time only: HH:mm:ss (24-hour, no AM/PM)
 * e.g. "14:30:00"
 */
export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString(LOCALE, { hour12: false });
}

/**
 * Format month and year label: e.g. "December 2024"
 */
export function formatMonthYear(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' });
}

/**
 * Format date in medium style: e.g. "25 Dec 2024"
 */
export function formatDateMedium(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Format day/month label for chart axes: e.g. "25/12"
 */
export function formatDayMonth(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(LOCALE, { day: '2-digit', month: '2-digit' });
}
