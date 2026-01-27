'use client';

import React, { useState, useEffect } from 'react';
import { getManagerDashboardStats, listTasks, listServiceRequests } from '../../../lib/mockApi/manager.api';
import { useToastHelpers } from '../../../lib/toast';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';

const mockInboundVolume = 1240;
const mockOutboundVolume = 890;
const mockTaskCompletionRate = 94;
const mockDiscrepancyCount = 3;

export default function ManagerReportsPage() {
  const toast = useToastHelpers();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('2025-01-01');
  const [endDate, setEndDate] = useState('2025-01-31');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        await Promise.all([getManagerDashboardStats(), listTasks(), listServiceRequests()]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load reports');
        toast.error('Failed to load reports');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleExport = () => {
    toast.info('Export (mock): Report would download as CSV.');
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div><h1 className="text-3xl font-black text-slate-900">Reports</h1><p className="text-slate-500 mt-1">Operations analytics</p></div>
        <LoadingSkeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div><h1 className="text-3xl font-black text-slate-900">Reports</h1><p className="text-slate-500 mt-1">Operations analytics</p></div>
        <ErrorState title="Failed to load reports" message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Reports</h1>
          <p className="text-slate-500 mt-1">Operations analytics</p>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-auto" />
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-auto" />
          <Button variant="secondary" onClick={handleExport}>Export (mock)</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Inbound volume</h3>
          <p className="text-3xl font-black text-slate-900">{mockInboundVolume}</p>
          <p className="text-xs text-slate-500 mt-1">units (period)</p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Outbound volume</h3>
          <p className="text-3xl font-black text-slate-900">{mockOutboundVolume}</p>
          <p className="text-xs text-slate-500 mt-1">units (period)</p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Task completion rate</h3>
          <p className="text-3xl font-black text-slate-900">{mockTaskCompletionRate}%</p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Discrepancies</h3>
          <p className="text-3xl font-black text-slate-900">{mockDiscrepancyCount}</p>
          <p className="text-xs text-slate-500 mt-1">in period</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <h2 className="text-lg font-black text-slate-900 mb-4">Charts (mock)</h2>
        <div className="h-64 flex items-center justify-center rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 text-slate-400 font-bold">
          Simple charts placeholder — {startDate} to {endDate}
        </div>
      </div>
    </div>
  );
}
