/** Quick ranges: both dates set, end anchored to today (local). */
export type QuickPreset = '7d' | '2w' | '1m' | '1y';

export const PRESET_LABELS: Record<QuickPreset, string> = {
  '7d': 'Last 7 days',
  '2w': 'Last 14 days',
  '1m': 'Last ~1 month',
  '1y': 'Last ~1 year',
};

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}-${m}-${d}`;
}

export function parseLocalDateEndOfDay(iso: string): number {
  const [y, mo, d] = iso.split('-').map((x) => parseInt(x, 10));
  const end = new Date(y, mo - 1, d, 23, 59, 59, 999);
  return end.getTime();
}

export function parseLocalDateStart(iso: string): number {
  const [y, mo, d] = iso.split('-').map((x) => parseInt(x, 10));
  return new Date(y, mo - 1, d, 0, 0, 0, 0).getTime();
}

/** Default window: ~1 calendar month (shared by staff and manager reports). */
export function defaultReportDateRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 1);
  return { start: toIsoDate(start), end: toIsoDate(end) };
}

/** Rolling window ending today (local calendar). */
export function rollingPresetRange(preset: QuickPreset): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 12, 0, 0, 0);
  switch (preset) {
    case '7d':
      start.setDate(start.getDate() - 6);
      break;
    case '2w':
      start.setDate(start.getDate() - 13);
      break;
    case '1m':
      start.setMonth(start.getMonth() - 1);
      break;
    case '1y':
      start.setFullYear(start.getFullYear() - 1);
      break;
    default:
      break;
  }
  return { start: toIsoDate(start), end: toIsoDate(end) };
}

export function formatReportRangeSummary(startIso: string, endIso: string): string {
  const startMs = parseLocalDateStart(startIso);
  const endMs = parseLocalDateEndOfDay(endIso);
  if (endMs < startMs) return 'Invalid range (start after end)';
  const inclusiveDays = Math.floor((endMs - startMs) / 86400000) + 1;
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  const a = new Date(startMs).toLocaleDateString('en-GB', opts);
  const b = new Date(endMs).toLocaleDateString('en-GB', opts);
  return `${a} → ${b} · ${inclusiveDays} day${inclusiveDays === 1 ? '' : 's'}`;
}
