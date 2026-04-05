'use client';

import { useId } from 'react';
import { Input } from '../ui/Input';
import {
  PRESET_LABELS,
  formatReportRangeSummary,
  rollingPresetRange,
  toIsoDate,
  type QuickPreset,
} from '../../lib/report-date-range';

export type { QuickPreset };

export type ChartDateFilterBarProps = {
  startDate: string;
  endDate: string;
  activePreset: QuickPreset | null;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
  onClearPreset: () => void;
  onApplyPreset: (range: { start: string; end: string }, preset: QuickPreset) => void;
};

export function ChartDateFilterBar(props: ChartDateFilterBarProps) {
  const { startDate, endDate, activePreset, onStartChange, onEndChange, onClearPreset, onApplyPreset } = props;
  const idBase = useId();
  const presets: QuickPreset[] = ['7d', '2w', '1m', '1y'];
  return (
    <div className="mb-5 rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50/90 to-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">Date range</p>
          <p className="text-sm font-medium text-slate-600 tabular-nums sm:text-right">
            {formatReportRangeSummary(startDate, endDate)}
          </p>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:justify-between lg:gap-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[9.5rem] flex-1 space-y-1 sm:flex-none sm:min-w-[10.5rem]">
              <label htmlFor={`${idBase}-from`} className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                From
              </label>
              <Input
                id={`${idBase}-from`}
                type="date"
                value={startDate}
                onChange={(e) => {
                  onStartChange(e.target.value);
                  onClearPreset();
                }}
                className="w-full min-w-0 bg-white"
              />
            </div>
            <div className="min-w-[9.5rem] flex-1 space-y-1 sm:flex-none sm:min-w-[10.5rem]">
              <label htmlFor={`${idBase}-to`} className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                To
              </label>
              <Input
                id={`${idBase}-to`}
                type="date"
                value={endDate}
                onChange={(e) => {
                  onEndChange(e.target.value);
                  onClearPreset();
                }}
                className="w-full min-w-0 bg-white"
                max={toIsoDate(new Date())}
              />
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-2 lg:max-w-xl lg:flex-none">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Quick ranges</p>
            <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200/80 bg-white p-1.5">
              {presets.map((key) => (
                <button
                  key={key}
                  type="button"
                  title="Sets To forward from From (e.g. 7 days = From … From+6); To capped at today if needed"
                  onClick={() => onApplyPreset(rollingPresetRange(startDate, key), key)}
                  className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors sm:text-sm ${
                    activePreset === key
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {PRESET_LABELS[key]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-xs leading-relaxed text-slate-400">
          Quick ranges count forward from <span className="font-semibold text-slate-500">From</span> (Last 7 days = 7 calendar
          days starting on that date). If the window would end after today, <span className="font-semibold text-slate-500">To</span>{' '}
          stops at today. Chart bucket size (day / month / year) still follows the span length.
        </p>
      </div>
    </div>
  );
}
