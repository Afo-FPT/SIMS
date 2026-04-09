'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useToastHelpers } from '../../../lib/toast';
import { listStorageRequests, type StorageRequestView } from '../../../lib/storage-requests.api';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../../../components/ui/Table';
import { TableSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';

function formatStatusLabel(status: string): string {
  const s = String(status || '').toLowerCase().replace(/_/g, ' ').trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '—';
}

export default function StaffOutboundRequestsPage() {
  const toast = useToastHelpers();
  const [items, setItems] = useState<StorageRequestView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listStorageRequests({ requestType: 'OUT', status: 'APPROVED' });
      setItems(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load outbound requests';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Outbound Picking</h1>
        <p className="text-slate-500 mt-1">Approved outbound requests ready for picking</p>
      </div>

      {loading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : error ? (
        <ErrorState title="Failed to load" message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState icon="inbox" title="No outbound requests" message="No approved outbound requests" />
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <Table>
            <TableHead>
              <TableHeader>Outbound reference</TableHeader>
              <TableHeader>Contract code</TableHeader>
              <TableHeader>Items</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Action</TableHeader>
            </TableHead>
            <TableBody>
              {items.map((r) => (
                <TableRow key={r.request_id}>
                  <TableCell className="font-bold text-slate-900">{r.reference ?? r.request_id}</TableCell>
                  <TableCell className="text-slate-700">{r.contract_code ?? r.contract_id}</TableCell>
                  <TableCell className="text-slate-700">{r.items.length}</TableCell>
                  <TableCell><Badge variant="info">{formatStatusLabel(r.status)}</Badge></TableCell>
                  <TableCell>
                    <Link href={`/staff/outbound-requests/${r.request_id}`} className="text-sm font-bold text-primary hover:underline">
                      Pick & dispatch
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

