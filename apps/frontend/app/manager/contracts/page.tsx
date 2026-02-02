'use client';

import React, { useState, useEffect } from 'react';
import type { Contract } from '../../../lib/customer-types';
import {
  listContracts,
  updateContractStatus,
  createContract,
  listWarehouses,
  listZonesByWarehouse,
  type ManagerZoneOption,
  type ManagerWarehouse,
} from '../../../lib/mockApi/manager.api';
import { useToastHelpers } from '../../../lib/toast';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../../../components/ui/Table';
import { Modal } from '../../../components/ui/Modal';
import { LoadingSkeleton, TableSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('vi-VN');
}

/**
 * Get status badge variant
 */
function getStatusVariant(status: Contract['status']): 'success' | 'warning' | 'error' | 'info' {
  switch (status) {
    case 'active':
      return 'success';
    case 'expired':
    case 'terminated':
      return 'error';
    case 'draft':
      return 'info';
    default:
      return 'info';
  }
}

/**
 * Get status display text
 */
function getStatusDisplay(status: Contract['status']): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'expired':
      return 'Expired';
    case 'terminated':
      return 'Terminated';
    case 'draft':
      return 'Draft';
    default:
      return status;
  }
}

/**
 * Get zones rented display text (or placeholder when draft, zone assigned on approval)
 */
function getZonesRentedDisplay(contract: Contract): string {
  const count = contract.rentedZones?.length ?? 0;
  if (count > 0) {
    const names = contract.rentedZones.map(rz => rz.zoneCode || rz.zoneId).filter(Boolean);
    return names.length ? names.join(', ') : `${count} zone${count !== 1 ? 's' : ''}`;
  }
  if (contract.status === 'draft') {
    return 'Zone will be assigned on approval';
  }
  return '—';
}

/**
 * Get date range display (from rented zones or requested period)
 */
function getDateRangeDisplay(contract: Contract): string {
  if (contract.rentedZones?.length) {
    const startDates = contract.rentedZones.map(rz => new Date(rz.startDate).getTime());
    const endDates = contract.rentedZones.map(rz => new Date(rz.endDate).getTime());
    const earliestStart = new Date(Math.min(...startDates));
    const latestEnd = new Date(Math.max(...endDates));
    return `${formatDate(earliestStart.toISOString())} → ${formatDate(latestEnd.toISOString())}`;
  }
  if (contract.requestedStartDate && contract.requestedEndDate) {
    return `${formatDate(contract.requestedStartDate)} → ${formatDate(contract.requestedEndDate)}`;
  }
  return '—';
}

type RentedZoneRow = { zoneId: string; startDate: string; endDate: string; price: string };

export default function ManagerContractsPage() {
  const toast = useToastHelpers();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Contract | null>(null);
  const [updating, setUpdating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [warehouses, setWarehouses] = useState<ManagerWarehouse[]>([]);
  const [zones, setZones] = useState<ManagerZoneOption[]>([]);
  const [createForm, setCreateForm] = useState({
    customerId: '',
    warehouseId: '',
    rentedZones: [{ zoneId: '', startDate: '', endDate: '', price: '' }] as RentedZoneRow[],
  });

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (createOpen) {
      listWarehouses().then(setWarehouses).catch(() => setWarehouses([]));
    }
  }, [createOpen]);

  useEffect(() => {
    if (!createForm.warehouseId) {
      setZones([]);
      return;
    }
    listZonesByWarehouse(createForm.warehouseId).then(setZones).catch(() => setZones([]));
  }, [createForm.warehouseId]);

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
      toast.success(`Contract ${status === 'active' ? 'activated' : status === 'terminated' ? 'terminated' : 'updated'}`);
      setDetail(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setUpdating(false);
    }
  };

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.customerId?.trim() || !createForm.warehouseId) {
      toast.warning('Customer ID and warehouse are required');
      return;
    }
    const validZones = createForm.rentedZones.filter((r) => r.zoneId && r.startDate && r.endDate && r.price);
    if (validZones.length === 0) {
      toast.warning('Add at least one zone with start date, end date and price');
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    for (const r of validZones) {
      if (r.startDate < today) {
        toast.warning('Start date cannot be in the past');
        return;
      }
      if (r.endDate <= r.startDate) {
        toast.warning('End date must be after start date');
        return;
      }
      const p = Number(r.price);
      if (isNaN(p) || p < 0) {
        toast.warning('Price must be a non-negative number');
        return;
      }
    }
    try {
      setCreating(true);
      await createContract({
        customerId: createForm.customerId.trim(),
        warehouseId: createForm.warehouseId,
        rentedZones: validZones.map((r) => ({
          zoneId: r.zoneId,
          startDate: r.startDate,
          endDate: r.endDate,
          price: Number(r.price),
        })),
      });
      toast.success('Contract created successfully');
      setCreateOpen(false);
      setCreateForm({
        customerId: '',
        warehouseId: '',
        rentedZones: [{ zoneId: '', startDate: '', endDate: '', price: '' }],
      });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create contract');
    } finally {
      setCreating(false);
    }
  };

  const addRentedZoneRow = () => {
    setCreateForm((p) => ({
      ...p,
      rentedZones: [...p.rentedZones, { zoneId: '', startDate: '', endDate: '', price: '' }],
    }));
  };

  const updateRentedZoneRow = (index: number, field: keyof RentedZoneRow, value: string) => {
    setCreateForm((p) => ({
      ...p,
      rentedZones: p.rentedZones.map((r, i) => (i === index ? { ...r, [field]: value } : r)),
    }));
  };

  const removeRentedZoneRow = (index: number) => {
    setCreateForm((p) => ({
      ...p,
      rentedZones: p.rentedZones.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Contracts</h1>
          <p className="text-slate-500 mt-1">Manage zone rental contracts</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>Create contract</Button>
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
              <TableHeader>Zones</TableHeader>
              <TableHeader>Start / End</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Actions</TableHeader>
            </TableHead>
            <TableBody>
              {contracts.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-bold text-slate-900">{c.code}</TableCell>
                  <TableCell className="text-slate-700">{c.customerName || '—'}</TableCell>
                  <TableCell className="text-slate-700">{getZonesRentedDisplay(c)}</TableCell>
                  <TableCell className="text-slate-700">{getDateRangeDisplay(c)}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(c.status)}>
                      {getStatusDisplay(c.status)}
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
              <div><dt className="text-slate-500">Zones</dt><dd className="font-bold">{getZonesRentedDisplay(detail)}</dd></div>
              <div><dt className="text-slate-500">Start</dt><dd className="font-bold">{getDateRangeDisplay(detail)}</dd></div>
              <div><dt className="text-slate-500">Status</dt><dd className="font-bold"><Badge variant={getStatusVariant(detail.status)}>{getStatusDisplay(detail.status)}</Badge></dd></div>
            </dl>
            <div>
              <h4 className="text-sm font-bold text-slate-700 mb-2">Actions</h4>
              <div className="flex flex-wrap gap-2">
                {detail.status === 'draft' && (
                  <>
                    <p className="text-sm text-slate-600 mb-2">
                      Approving will automatically assign a zone to this contract (first available zone in the warehouse for the requested period, no overlap with other active contracts).
                    </p>
                    <Button onClick={() => handleStatusChange(detail.id, 'active')} disabled={updating}>
                      Approve &amp; activate
                    </Button>
                  </>
                )}
                {detail.status === 'active' && (
                  <Button variant="secondary" onClick={() => handleStatusChange(detail.id, 'terminated')} disabled={updating}>
                    Terminate
                  </Button>
                )}
                {detail.status === 'active' && (
                  <Button variant="danger" onClick={() => handleStatusChange(detail.id, 'expired')} disabled={updating}>
                    Mark Expired
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {createOpen && (
        <Modal open={createOpen} onOpenChange={setCreateOpen} title="Create contract (assign zones)" size="lg">
          <form onSubmit={handleCreateContract} className="space-y-4">
            <Input
              label="Customer ID"
              value={createForm.customerId}
              onChange={(e) => setCreateForm((p) => ({ ...p, customerId: e.target.value }))}
              placeholder="Customer user ID"
              required
            />
            <Select
              label="Warehouse"
              value={createForm.warehouseId}
              onChange={(e) => setCreateForm((p) => ({ ...p, warehouseId: e.target.value }))}
              options={[{ value: '', label: 'Select warehouse' }, ...warehouses.map((w) => ({ value: w.id, label: w.name }))]}
            />
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-slate-700">Zones (start, end, price)</label>
                <Button type="button" variant="ghost" size="sm" onClick={addRentedZoneRow}>+ Add zone</Button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {createForm.rentedZones.map((r, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end text-sm">
                    <div className="col-span-4">
                      <Select
                        label=""
                        value={r.zoneId}
                        onChange={(e) => updateRentedZoneRow(i, 'zoneId', e.target.value)}
                        options={[{ value: '', label: 'Zone' }, ...zones.map((z) => ({ value: z.id, label: `${z.zoneCode} — ${z.name}` }))]}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        label=""
                        type="date"
                        value={r.startDate}
                        onChange={(e) => updateRentedZoneRow(i, 'startDate', e.target.value)}
                        placeholder="Start"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        label=""
                        type="date"
                        value={r.endDate}
                        onChange={(e) => updateRentedZoneRow(i, 'endDate', e.target.value)}
                        placeholder="End"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        label=""
                        type="number"
                        min="0"
                        step="0.01"
                        value={r.price}
                        onChange={(e) => updateRentedZoneRow(i, 'price', e.target.value)}
                        placeholder="Price"
                      />
                    </div>
                    <div className="col-span-2">
                      {createForm.rentedZones.length > 1 ? (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeRentedZoneRow(i)}>Remove</Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" isLoading={creating}>Create contract</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
