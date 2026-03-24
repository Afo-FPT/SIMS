'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { listStorageRequests } from '../../../lib/storage-requests.api';
import { getCycleCounts } from '../../../lib/cycle-count.api';
import { getStockInHistory, getStockOutHistory } from '../../../lib/stock-history.api';
import { getCustomerContracts } from '../../../lib/mockApi/customer.api';
import { useToastHelpers } from '../../../lib/toast';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../../../components/ui/Table';
import { TableSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';

export default function ManagerDashboard() {
  const toast = useToastHelpers();
  const [contracts, setContracts] = useState<any[]>([]);
  const [storageRequests, setStorageRequests] = useState<any[]>([]);
  const [cycleCounts, setCycleCounts] = useState<any[]>([]);
  const [inboundVolume, setInboundVolume] = useState(0);
  const [outboundVolume, setOutboundVolume] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [contractRows, requestRows, cycleRows, stockIn, stockOut] = await Promise.all([
        getCustomerContracts(),
        listStorageRequests(),
        getCycleCounts(),
        getStockInHistory({ limit: 300 }),
        getStockOutHistory({ limit: 300 }),
      ]);

      setContracts(contractRows);
      setStorageRequests(requestRows);
      setCycleCounts(cycleRows);
      setInboundVolume(
        stockIn.history.reduce(
          (sum, h) => sum + h.items.reduce((s, i) => s + (i.quantity_actual ?? i.quantity_requested ?? 0), 0),
          0,
        ),
      );
      setOutboundVolume(
        stockOut.history.reduce(
          (sum, h) => sum + h.items.reduce((s, i) => s + (i.quantity_actual ?? i.quantity_requested ?? 0), 0),
          0,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const contractsActive = contracts.filter((c) => c.status === 'active').length;
    const pendingApprovals = storageRequests.filter((r) => r.status === 'PENDING').length;
    const assignedToStaff = storageRequests.filter((r) => r.status === 'APPROVED').length;
    const discrepancyFlags =
      cycleCounts.filter((c) => c.status === 'ADJUSTMENT_REQUESTED').length +
      storageRequests.filter((r) => r.status === 'REJECTED').length;

    const zonesRented = contracts.reduce((sum, c) => sum + (c.rentedZones?.length || 0), 0);
    const estimatedZoneCapacity = Math.max(zonesRented * 10000, 10000);
    const utilizationRate = Math.min(
      100,
      Math.round(((inboundVolume - outboundVolume > 0 ? inboundVolume - outboundVolume : inboundVolume) / estimatedZoneCapacity) * 100),
    );

    return {
      contractsActive,
      pendingApprovals,
      assignedToStaff,
      discrepancyFlags,
      utilizationRate,
    };
  }, [contracts, storageRequests, cycleCounts, inboundVolume, outboundVolume]);

  const recentService = [...storageRequests]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);
  const recentTasks = [...cycleCounts]
    .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
    .slice(0, 5);

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Manager Dashboard</h1>
          <p className="text-slate-500 mt-1">Operations overview, approvals, capacity risk, and team execution</p>
        </div>
        <TableSkeleton rows={4} cols={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Manager Dashboard</h1>
          <p className="text-slate-500 mt-1">Operations overview, approvals, capacity risk, and team execution</p>
        </div>
        <ErrorState title="Failed to load dashboard" message={error || 'Unknown error'} onRetry={loadData} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Manager Dashboard</h1>
        <p className="text-slate-500 mt-1">Operations overview, approvals, capacity risk, and team execution</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-2xl">description</span>
            </div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Contracts active</h3>
          </div>
          <p className="text-3xl font-black text-slate-900">{stats.contractsActive}</p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <span className="material-symbols-outlined text-2xl">approval</span>
            </div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Pending approvals</h3>
          </div>
          <p className="text-3xl font-black text-slate-900">{stats.pendingApprovals}</p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <span className="material-symbols-outlined text-2xl">pending_actions</span>
            </div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Assigned to staff</h3>
          </div>
          <p className="text-3xl font-black text-slate-900">{stats.assignedToStaff}</p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600">
              <span className="material-symbols-outlined text-2xl">inventory</span>
            </div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Utilization rate</h3>
          </div>
          <p className="text-3xl font-black text-slate-900">{stats.utilizationRate}%</p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-600">
              <span className="material-symbols-outlined text-2xl">warning</span>
            </div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Alerts</h3>
          </div>
          <p className="text-3xl font-black text-slate-900">{stats.discrepancyFlags}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between p-6">
            <h2 className="text-lg font-black text-slate-900">Recent Service Requests</h2>
            <Link href="/manager/inbound-requests" className="text-sm font-bold text-primary hover:underline">
              Inbound tasks
            </Link>
          </div>
          {recentService.length === 0 ? (
            <EmptyState icon="local_shipping" title="No service requests" message="No recent requests" />
          ) : (
            <Table>
              <TableHead>
                <TableHeader>Request</TableHeader>
                <TableHeader>Contract</TableHeader>
                <TableHeader>Type</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Updated</TableHeader>
              </TableHead>
              <TableBody>
                {recentService.map((r) => (
                  <TableRow key={r.request_id}>
                    <TableCell className="font-bold text-slate-900">{r.reference || r.request_id.slice(-8)}</TableCell>
                    <TableCell className="text-slate-700">{r.contract_code || r.contract_id.slice(-6)}</TableCell>
                    <TableCell><Badge variant="neutral">{r.request_type === 'IN' ? 'Inbound' : 'Outbound'}</Badge></TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          r.status === 'COMPLETED' ? 'success' : r.status === 'APPROVED' ? 'info' : r.status === 'REJECTED' ? 'error' : 'warning'
                        }
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">{new Date(r.updated_at || r.created_at).toLocaleString('en-GB')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>

        <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between p-6">
            <h2 className="text-lg font-black text-slate-900">Recent Tasks</h2>
            <Link href="/manager/tasks" className="text-sm font-bold text-primary hover:underline">
              View all
            </Link>
          </div>
          {recentTasks.length === 0 ? (
            <EmptyState icon="assignment" title="No tasks" message="No recent tasks" />
          ) : (
            <Table>
              <TableHead>
                <TableHeader>Task</TableHeader>
                <TableHeader>Contract</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Updated</TableHeader>
              </TableHead>
              <TableBody>
                {recentTasks.map((t) => (
                  <TableRow key={t.cycle_count_id}>
                    <TableCell className="font-bold text-slate-900">{t.cycle_count_id.slice(-8).toUpperCase()}</TableCell>
                    <TableCell><Badge variant="neutral">{t.contract_code}</Badge></TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          t.status === 'CONFIRMED' ? 'success' : t.status === 'STAFF_SUBMITTED' ? 'info' : 'warning'
                        }
                      >
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {new Date(t.updated_at || t.created_at).toLocaleString('en-GB')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      </div>
    </div>
  );
}
