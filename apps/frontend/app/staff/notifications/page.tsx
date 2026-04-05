'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { listStorageRequests } from '../../../lib/storage-requests.api';
import { getCycleCounts } from '../../../lib/cycle-count.api';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Badge } from '../../../components/ui/Badge';

type NotificationRow = {
  id: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  detail: string;
  time: string;
};

export default function StaffNotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<NotificationRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setLoading(true);
        setError(null);
        const [requests, cycles] = await Promise.all([listStorageRequests(), getCycleCounts()]);
        if (cancelled) return;

        const fromRequests = requests.slice(0, 10).map((r) => ({
          id: r.request_id,
          priority: r.status === 'PENDING' ? 'HIGH' : r.status === 'APPROVED' ? 'MEDIUM' : 'LOW',
          title: `${r.request_type === 'IN' ? 'Inbound' : 'Outbound'} request ${r.reference || r.request_id.slice(-8)}`,
          detail: `Status: ${r.status} · Contract: ${r.contract_code || r.contract_id}`,
          time: r.updated_at || r.created_at,
        })) as NotificationRow[];

        const fromCycles = cycles.slice(0, 10).map((c) => ({
          id: c.cycle_count_id,
          priority: c.status === 'STAFF_SUBMITTED' ? 'HIGH' : c.status === 'APPROVED' ? 'MEDIUM' : 'LOW',
          title: `Cycle count ${c.cycle_count_id.slice(-8).toUpperCase()}`,
          detail: `Status: ${c.status} · Contract: ${c.contract_code}`,
          time: c.updated_at || c.created_at,
        })) as NotificationRow[];

        setRows([...fromRequests, ...fromCycles].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load notifications');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(
    () => ({
      high: rows.filter((r) => r.priority === 'HIGH').length,
      medium: rows.filter((r) => r.priority === 'MEDIUM').length,
      low: rows.filter((r) => r.priority === 'LOW').length,
    }),
    [rows],
  );

  if (loading) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Notifications & Assigned Tasks</h1>
        <LoadingSkeleton className="h-64 rounded-3xl" />
      </div>
    );
  }

  if (error) return <ErrorState title="Failed to load notifications" message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Notifications & Assigned Tasks</h1>
        <p className="text-slate-500 mt-1">Priority alerts and recently assigned operations for staff execution</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Tile title="High priority" value={counts.high} />
        <Tile title="Medium priority" value={counts.medium} />
        <Tile title="Low priority" value={counts.low} />
      </div>

      <section className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm">
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-bold text-slate-900">{r.title}</p>
                  <p className="text-sm text-slate-600 mt-1">{r.detail}</p>
                  <p className="text-xs text-slate-500 mt-1">{new Date(r.time).toLocaleString('en-GB')}</p>
                </div>
                <Badge variant={r.priority === 'HIGH' ? 'error' : r.priority === 'MEDIUM' ? 'warning' : 'success'}>{r.priority}</Badge>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Tile({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wider font-black text-slate-500">{title}</p>
      <p className="text-2xl font-black text-slate-900 mt-1">{value}</p>
    </div>
  );
}
