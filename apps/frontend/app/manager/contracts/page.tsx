'use client';

import React, { useState, useEffect } from 'react';
import type { Contract } from '../../../lib/customer-types';
import { listContracts, updateContractStatus } from '../../../lib/mockApi/manager.api';
import { useToastHelpers } from '../../../lib/toast';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../../../components/ui/Table';
import { Modal } from '../../../components/ui/Modal';
import { LoadingSkeleton, TableSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';

export default function ManagerContractsPage() {
  const toast = useToastHelpers();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Contract | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listContracts();
      setContracts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contracts');
      toast.error('Failed to load contracts');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, status: Contract['status']) => {
    try {
      setUpdating(true);
      await updateContractStatus(id, status);
      toast.success(`Contract ${status === 'Active' ? 'activated' : status === 'Suspended' ? 'suspended' : 'terminated'}`);
      setDetail(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Contracts</h1>
        <p className="text-slate-500 mt-1">Manage shelf rental contracts</p>
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : error ? (
        <ErrorState title="Failed to load" message={error} onRetry={load} />
      ) : contracts.length === 0 ? (
        <EmptyState icon="description" title="No contracts" message="No contracts yet" />
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <Table>
            <TableHead>
              <TableHeader>Contract code</TableHeader>
              <TableHeader>Customer</TableHeader>
              <TableHeader>Shelves</TableHeader>
              <TableHeader>Start / End</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Actions</TableHeader>
            </TableHead>
            <TableBody>
              {contracts.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-bold text-slate-900">{c.code}</TableCell>
                  <TableCell className="text-slate-700">{c.customerName || '—'}</TableCell>
                  <TableCell className="text-slate-700">{c.shelvesRented}</TableCell>
                  <TableCell className="text-slate-700">{c.startDate} → {c.endDate}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        c.status === 'Active' ? 'success' : c.status === 'Suspended' ? 'warning' : c.status === 'Expired' ? 'error' : 'info'
                      }
                    >
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => setDetail(c)}
                      className="text-sm font-bold text-primary hover:underline"
                    >
                      View
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {detail && (
        <Modal open={!!detail} onOpenChange={(o) => !o && setDetail(null)} title={detail.code} size="lg">
          <div className="space-y-6">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-slate-500">Customer</dt><dd className="font-bold">{detail.customerName || '—'}</dd></div>
              <div><dt className="text-slate-500">Shelves</dt><dd className="font-bold">{detail.shelvesRented}</dd></div>
              <div><dt className="text-slate-500">Start</dt><dd className="font-bold">{detail.startDate}</dd></div>
              <div><dt className="text-slate-500">End</dt><dd className="font-bold">{detail.endDate}</dd></div>
              <div><dt className="text-slate-500">Counting unit</dt><dd className="font-bold">{detail.countingUnit}</dd></div>
            </dl>
            <div>
              <h4 className="text-sm font-bold text-slate-700 mb-2">Actions</h4>
              <div className="flex flex-wrap gap-2">
                {detail.status === 'Pending confirmation' && (
                  <Button onClick={() => handleStatusChange(detail.id, 'Active')} disabled={updating}>
                    Activate
                  </Button>
                )}
                {detail.status === 'Active' && (
                  <Button variant="secondary" onClick={() => handleStatusChange(detail.id, 'Suspended')} disabled={updating}>
                    Suspend
                  </Button>
                )}
                {(detail.status === 'Active' || detail.status === 'Suspended') && (
                  <Button variant="danger" onClick={() => handleStatusChange(detail.id, 'Expired')} disabled={updating}>
                    Terminate
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
