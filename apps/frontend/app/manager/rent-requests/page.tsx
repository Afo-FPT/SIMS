'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { Contract } from '../../../lib/customer-types';
import { deleteDraftContract, listContracts, listShelvesByWarehouse, updateContractStatus } from '../../../lib/manager.api';
import { useToastHelpers } from '../../../lib/toast';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../../../components/ui/Table';
import { Modal } from '../../../components/ui/Modal';
import { LoadingSkeleton, TableSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';
import { PageHeader } from '../../../components/ui/PageHeader';
import type { Shelf } from '../../../types/manager';
import { formatDate } from '../../../lib/date-format';

function getContractPrice(c: Contract): number {
  return (c.rentedZones || []).reduce((sum, z) => sum + (Number(z.price) || 0), 0);
}

export default function ManagerRentRequestsPage() {
  const toast = useToastHelpers();
  const [draftContracts, setDraftContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Contract | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [loadingShelves, setLoadingShelves] = useState(false);
  const [shelvesError, setShelvesError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contract | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listContracts();
      // Chỉ hiển thị các hợp đồng ở trạng thái draft như là "rent requests"
      const drafts = data.filter((c) => c.status === 'draft');
      setDraftContracts(drafts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rent requests');
      toast.error('Failed to load rent requests');
    } finally {
      setLoading(false);
    }
  };

  const doApprove = async (id: string) => {
    try {
      setApprovingId(id);
      await updateContractStatus(id, 'pending_payment');
      toast.success('Draft contract processed. Status changed to pending payment and moved to Contracts.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve draft contract');
    } finally {
      setApprovingId(null);
    }
  };

  const doDeleteDraft = async (c: Contract) => {
    const reason = deleteReason.trim();
    if (!reason) {
      toast.warning('Please enter a reason before deleting this draft contract');
      return;
    }
    try {
      setDeletingId(c.id);
      await deleteDraftContract(c.id, reason);
      toast.success(`Draft contract ${c.code} was deleted. Customer has been notified.`);
      if (detail?.id === c.id) setDetail(null);
      setDeleteTarget(null);
      setDeleteReason('');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete draft contract');
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function loadShelves() {
      if (!detail) return;
      if (!detail.warehouseId || !String(detail.warehouseId).trim()) {
        setShelvesError('Missing warehouseId for this draft contract');
        setShelves([]);
        setLoadingShelves(false);
        return;
      }
      setLoadingShelves(true);
      setShelvesError(null);
      setShelves([]);
      try {
        const list = await listShelvesByWarehouse(String(detail.warehouseId));
        if (cancelled) return;
        setShelves(list);
      } catch (err) {
        if (cancelled) return;
        setShelvesError(err instanceof Error ? err.message : 'Failed to load inventory status');
      } finally {
        if (!cancelled) setLoadingShelves(false);
      }
    }
    loadShelves();
    return () => {
      cancelled = true;
    };
  }, [detail]);

  const zonesForDisplay = detail?.rentedZones?.length
    ? detail.rentedZones
    : detail?.requestedZoneId
      ? [
          {
            zoneId: detail.requestedZoneId,
            zoneCode: undefined,
            zoneName: undefined,
            startDate: detail.requestedStartDate ?? '',
            endDate: detail.requestedEndDate ?? '',
            price: 0,
          },
        ]
      : [];

  const zoneAvailability = useMemo(() => {
    if (!detail) return null;

    const normalize = (v?: string) => (v ? v.toLowerCase().trim() : '');
    const matchesZone = (shelfZone: string, zoneCode?: string, zoneId?: string) => {
      const shelf = normalize(shelfZone);
      const zCode = normalize(zoneCode);
      const zId = normalize(zoneId);
      return (
        (zCode && (shelf === zCode || shelf.includes(zCode))) ||
        (zId && (shelf === zId || shelf.includes(zId)))
      );
    };

    const zones = zonesForDisplay;
    const matchedShelves = shelves.filter((s) =>
      zones.some((z) => matchesZone(s.zone, z.zoneCode, z.zoneId)),
    );

    const totalAvailable = matchedShelves.filter((s) => s.status === 'Available').length;
    const totalOccupied = matchedShelves.filter((s) => s.status === 'Occupied').length;

    const perZone = zones.map((z) => {
      const zoneMatched = shelves.filter((s) => matchesZone(s.zone, z.zoneCode, z.zoneId));
      const available = zoneMatched.filter((s) => s.status === 'Available').length;
      const occupied = zoneMatched.filter((s) => s.status === 'Occupied').length;
      const sampleAvailableShelves = zoneMatched
        .filter((s) => s.status === 'Available')
        .slice(0, 6)
        .map((s) => s.code);
      return { zone: z, available, occupied, sampleAvailableShelves };
    });

    return { totalAvailable, totalOccupied, perZone };
  }, [detail, shelves, zonesForDisplay]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rent Requests"
        description="Review draft contracts from customer rental requests. Processing moves them to Contracts with status pending payment."
      />

      {loading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : error ? (
        <ErrorState title="Failed to load" message={error} onRetry={load} />
      ) : draftContracts.length === 0 ? (
        <EmptyState
          icon="request_quote"
          title="No rent requests"
          message="No draft contracts from rental requests to review."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-card">
          <Table>
            <TableHead>
              <TableHeader>Contract code</TableHeader>
              <TableHeader>Customer</TableHeader>
              <TableHeader>Warehouse</TableHeader>
              <TableHeader>Contract price</TableHeader>
              <TableHeader>Rental period</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Actions</TableHeader>
            </TableHead>
            <TableBody>
              {draftContracts.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-bold text-slate-900">{c.code}</TableCell>
                  <TableCell className="text-slate-700">{c.customerName || '—'}</TableCell>
                  <TableCell className="text-slate-700">{c.warehouseName || c.warehouseId}</TableCell>
                  <TableCell className="text-slate-700 font-semibold">
                    {getContractPrice(c) > 0 ? `${getContractPrice(c).toLocaleString('en-GB')} VND` : '—'}
                  </TableCell>
                  <TableCell className="text-slate-700">
                    {c.requestedStartDate && c.requestedEndDate
                      ? `${formatDate(c.requestedStartDate)} → ${formatDate(c.requestedEndDate)}`
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="info">draft</Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      onClick={() => setDetail(c)}
                    >
                      Process
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail modal */}
      {detail && (
        <Modal
          open={!!detail}
          onOpenChange={(o) => !o && setDetail(null)}
          title={detail.code}
          description="Review this rental request before processing."
          size="lg"
          footer={
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Button
                variant="danger"
                size="sm"
                onClick={() => { setDeleteTarget(detail); setDeleteReason(''); }}
                disabled={approvingId === detail.id}
              >
                Delete draft
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setDetail(null)}>Close</Button>
                <Button
                  onClick={() => { doApprove(detail.id); setDetail(null); }}
                  isLoading={approvingId === detail.id}
                  disabled={loadingShelves}
                >
                  Process request
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-5">
            {/* Contract info */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Customer</p>
                <p className="font-semibold text-slate-900">{detail.customerName || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Status</p>
                <Badge variant="info" size="sm">Draft</Badge>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Warehouse</p>
                <p className="font-semibold text-slate-900">{detail.warehouseName || detail.warehouseId}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Rental period</p>
                <p className="font-semibold text-slate-900">
                  {detail.requestedStartDate && detail.requestedEndDate
                    ? `${formatDate(detail.requestedStartDate)} → ${formatDate(detail.requestedEndDate)}`
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Contract price</p>
                <p className="font-bold text-primary">
                  {getContractPrice(detail) > 0 ? `${getContractPrice(detail).toLocaleString('en-GB')} VND` : '—'}
                </p>
              </div>
            </div>

            {/* Zone availability */}
            <div className="border-t border-slate-100 pt-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-800">Zone Availability</h3>
                {!loadingShelves && zoneAvailability && (zonesForDisplay.length > 1) && (
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className="size-2 rounded-full bg-emerald-500 inline-block" />
                      {zoneAvailability.totalAvailable} available
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="size-2 rounded-full bg-amber-500 inline-block" />
                      {zoneAvailability.totalOccupied} occupied
                    </span>
                  </div>
                )}
              </div>

              {zonesForDisplay.length === 0 ? (
                <div className="rounded-2xl border border-amber-100 bg-amber-50/50 px-4 py-3 text-sm text-amber-700">
                  No zone information available on this draft.
                </div>
              ) : loadingShelves ? (
                <div className="space-y-2">
                  <LoadingSkeleton className="h-20 rounded-2xl" />
                  <LoadingSkeleton className="h-20 rounded-2xl" />
                </div>
              ) : shelvesError ? (
                <p className="text-xs text-red-500">{shelvesError}</p>
              ) : (
                <div className="space-y-2">
                  {zoneAvailability?.perZone.map((z) => (
                    <div key={z.zone.zoneId} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-sm">
                            {z.zone.zoneCode || z.zone.zoneName || z.zone.zoneId}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {z.zone.startDate && z.zone.endDate
                              ? `${formatDate(z.zone.startDate)} → ${formatDate(z.zone.endDate)}`
                              : '—'}
                            {z.zone.price ? ` · ${Number(z.zone.price).toLocaleString('vi-VN')} VND` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-center">
                            <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">Available</p>
                            <p className="text-xl font-black text-emerald-600">{z.available}</p>
                          </div>
                          <div className="w-px h-8 bg-slate-200" />
                          <div className="text-center">
                            <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide">Occupied</p>
                            <p className="text-xl font-black text-amber-600">{z.occupied}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          open={!!deleteTarget}
          onOpenChange={(o) => {
            if (!o) {
              setDeleteTarget(null);
              setDeleteReason('');
            }
          }}
          title="Delete draft contract?"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-700">
              This will permanently delete draft contract <span className="font-bold">{deleteTarget.code}</span>.
            </p>
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              The customer will receive a notification that this draft was removed.
            </p>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Reason to customer</label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Enter reason for deleting this draft..."
                className="w-full min-h-[88px] rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-y"
              />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => doDeleteDraft(deleteTarget)}
                isLoading={deletingId === deleteTarget.id}
              >
                Confirm delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
