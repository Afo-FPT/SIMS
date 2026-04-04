/**
 * Quick ranges extend forward from the current From date (inclusive).
 * Example: From 20 Jan + Last 7 days → 20 Jan … 26 Jan (7 calendar days).
 * To is capped at today when the forward window would pass today.
 */
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

/**
 * From stays as `anchorStartIso`. To moves forward by the preset length (inclusive days for 7d/2w).
 * If that To is after today (local), To is set to today. If that would make To before From, To = From.
 */
export function rollingPresetRange(anchorStartIso: string, preset: QuickPreset): { start: string; end: string } {
  const parts = anchorStartIso.split('-').map((x) => parseInt(x, 10));
  const y = parts[0];
  const mo = parts[1];
  const d = parts[2];
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) {
    return defaultReportDateRange();
  }
  const start = new Date(y, mo - 1, d, 12, 0, 0, 0);
  const end = new Date(start);
  switch (preset) {
    case '7d':
      end.setDate(end.getDate() + 6);
      break;
    case '2w':
      end.setDate(end.getDate() + 13);
      break;
    case '1m':
      end.setMonth(end.getMonth() + 1);
      break;
    case '1y':
      end.setFullYear(end.getFullYear() + 1);
      break;
    default:
      break;
  }
  const startIso = toIsoDate(start);
  let endIso = toIsoDate(end);
  const todayIso = toIsoDate(new Date());
  if (endIso > todayIso) {
    endIso = todayIso;
  }
  if (startIso > endIso) {
    endIso = startIso;
  }
  return { start: startIso, end: endIso };
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
