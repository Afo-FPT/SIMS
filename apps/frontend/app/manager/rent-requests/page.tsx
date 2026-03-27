'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { Contract } from '../../../lib/customer-types';
import { listContracts, listShelvesByWarehouse, updateContractStatus } from '../../../lib/mockApi/manager.api';
import { useToastHelpers } from '../../../lib/toast';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../../../components/ui/Table';
import { Modal } from '../../../components/ui/Modal';
import { LoadingSkeleton, TableSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';
import type { Shelf } from '../../../types/manager';

function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('vi-VN');
  } catch {
    return dateStr;
  }
}

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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Rent Requests</h1>
        <p className="text-slate-500 mt-1">
          Review draft contracts created from customer rental requests. Processing will move them to Contracts with
          status <span className="font-bold">pending payment</span>.
        </p>
      </div>

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
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
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
          title={`Draft contract ${detail.code}`}
          size="md"
        >
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <dt className="text-slate-500">Customer</dt>
              <dd className="font-bold">{detail.customerName || '—'}</dd>
              <dt className="text-slate-500">Warehouse</dt>
              <dd className="font-bold">{detail.warehouseName || detail.warehouseId}</dd>
              <dt className="text-slate-500">Rental period</dt>
              <dd className="font-bold">
                {detail.requestedStartDate && detail.requestedEndDate
                  ? `${formatDate(detail.requestedStartDate)} → ${formatDate(detail.requestedEndDate)}`
                  : '—'}
              </dd>
              <dt className="text-slate-500">Contract price</dt>
              <dd className="font-bold">
                {getContractPrice(detail) > 0 ? `${getContractPrice(detail).toLocaleString('en-GB')} VND` : '—'}
              </dd>
              <dt className="text-slate-500">Status</dt>
              <dd className="font-bold">draft</dd>
            </dl>

            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-sm font-black text-slate-900 mb-3">Zones in this draft</h3>
              {zonesForDisplay.length === 0 ? (
                <p className="text-xs text-amber-600">No zone information on this draft.</p>
              ) : (
                <div className="space-y-3">
                  {zoneAvailability?.perZone.map((z) => (
                    <div
                      key={z.zone.zoneId}
                      className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">
                            {z.zone.zoneCode || z.zone.zoneName || z.zone.zoneId}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {z.zone.startDate && z.zone.endDate
                              ? `${formatDate(z.zone.startDate)} → ${formatDate(z.zone.endDate)}`
                              : '—'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Zone price
                          </p>
                          <p className="text-lg font-black text-primary">
                            {z.zone.price ? Number(z.zone.price).toLocaleString('vi-VN') : '—'} VND
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 px-3 py-2">
                          <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Available</p>
                          {loadingShelves ? (
                            <LoadingSkeleton className="h-6 w-10 mt-2 rounded-xl" />
                          ) : (
                            <p className="text-xl font-black text-emerald-700">{z.available}</p>
                          )}
                          {!loadingShelves && z.sampleAvailableShelves.length > 0 && (
                            <p className="text-[11px] text-emerald-800 mt-1 truncate" title={z.sampleAvailableShelves.join(', ')}>
                              {z.sampleAvailableShelves.join(', ')}
                            </p>
                          )}
                        </div>
                        <div className="rounded-2xl border border-amber-100 bg-amber-50/40 px-3 py-2">
                          <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Occupied</p>
                          {loadingShelves ? (
                            <LoadingSkeleton className="h-6 w-10 mt-2 rounded-xl" />
                          ) : (
                            <p className="text-xl font-black text-amber-700">{z.occupied}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-sm font-black text-slate-900 mb-3">Inventory status (by selected zones)</h3>
              {loadingShelves ? (
                <LoadingSkeleton className="h-28 rounded-2xl w-full" />
              ) : shelvesError ? (
                <p className="text-xs text-red-500">{shelvesError}</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
                    <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Total available shelves</p>
                    <p className="text-3xl font-black text-emerald-700 mt-2">{zoneAvailability?.totalAvailable ?? 0}</p>
                  </div>
                  <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4">
                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Total occupied shelves</p>
                    <p className="text-3xl font-black text-amber-700 mt-2">{zoneAvailability?.totalOccupied ?? 0}</p>
                  </div>
                </div>
              )}
              <p className="text-xs text-slate-500 mt-3">
                Inventory status is based on the current shelf availability in the warehouse.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => {
                  doApprove(detail.id);
                  setDetail(null);
                }}
                isLoading={approvingId === detail.id}
                disabled={loadingShelves}
              >
                Process
              </Button>
              <Button variant="ghost" onClick={() => setDetail(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
