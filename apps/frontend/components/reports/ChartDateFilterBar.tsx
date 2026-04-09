'use client';

import { useId, useState } from 'react';
import { Input } from '../ui/Input';
import {
  PRESET_LABELS,
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
  enableToggle?: boolean;
  initialCollapsed?: boolean;
};

export function ChartDateFilterBar(props: ChartDateFilterBarProps) {
  const {
    startDate,
    endDate,
    activePreset,
    onStartChange,
    onEndChange,
    onClearPreset,
    onApplyPreset,
    enableToggle = false,
    initialCollapsed = false,
  } = props;
  const idBase = useId();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const presets: QuickPreset[] = ['7d', '2w', '1m', '1y'];
  return (
    <div className="mb-5 rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50/90 to-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">Date range</p>
          {enableToggle && (
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
            >
              {collapsed ? 'Show filter' : 'Hide filter'}
            </button>
          )}
        </div>

        {!collapsed && (
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
                  title="Sets both dates; end is today (local)"
                  onClick={() => onApplyPreset(rollingPresetRange(key), key)}
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
        )}

      </div>
    </div>
  );
}
