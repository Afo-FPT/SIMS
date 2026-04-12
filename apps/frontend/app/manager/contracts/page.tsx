'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { Contract } from '../../../lib/customer-types';
import {
  listContracts,
  updateContractStatus,
  createContract,
  listWarehouses,
  listZonesByWarehouse,
  type ManagerZoneOption,
  type ManagerWarehouse,
} from '../../../lib/manager.api';
import { useToastHelpers } from '../../../lib/toast';
import {
  listManagerPayments,
  type ManagerContractPayment,
  type ManagerServicePayment,
} from '../../../lib/payment.api';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../../../components/ui/Table';
import { Modal } from '../../../components/ui/Modal';
import { LoadingSkeleton, TableSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Pagination } from '../../../components/ui/Pagination';
import { PageHeader } from '../../../components/ui/PageHeader';

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
    case 'pending_payment':
    case 'scheduled':
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
    case 'pending_payment':
      return 'Pending payment';
    case 'scheduled':
      return 'Scheduled (paid, before start)';
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
  const PAGE_SIZE = 10;
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [page, setPage] = useState(1);
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
  const [paymentsOpen, setPaymentsOpen] = useState(false);
  const [paymentTab, setPaymentTab] = useState<'contract' | 'service'>('contract');
  const [contractPayments, setContractPayments] = useState<ManagerContractPayment[]>([]);
  const [servicePayments, setServicePayments] = useState<ManagerServicePayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsRefreshing, setPaymentsRefreshing] = useState(false);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Contract['status']>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<'all' | string>('all');
  const [detailPayments, setDetailPayments] = useState<ManagerContractPayment[]>([]);
  const [detailPaymentsLoading, setDetailPaymentsLoading] = useState(false);

  const loadPayments = useCallback(async (silent = false) => {
    try {
      if (silent) setPaymentsRefreshing(true);
      else setPaymentsLoading(true);
      setPaymentsError(null);
      const data = await listManagerPayments();
      setContractPayments(data.contractPayments);
      setServicePayments(data.servicePayments);
    } catch (err) {
      setPaymentsError(err instanceof Error ? err.message : 'Failed to load payments');
    } finally {
      if (silent) setPaymentsRefreshing(false);
      else setPaymentsLoading(false);
    }
  }, []);

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

  useEffect(() => {
    if (paymentsOpen) {
      loadPayments(false);
      setPaymentTab('contract');
    }
  }, [paymentsOpen, loadPayments]);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listContracts();
      setContracts(data);
      setPage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contracts');
      toast.error('Failed to load contracts');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(contracts.length / PAGE_SIZE));
  const filteredContracts = contracts.filter((c) => {
    const q = searchTerm.trim().toLowerCase();
    const bySearch =
      !q ||
      String(c.code || '').toLowerCase().includes(q) ||
      String(c.customerName || '').toLowerCase().includes(q);
    const byStatus = statusFilter === 'all' || c.status === statusFilter;
    const byWarehouse = warehouseFilter === 'all' || c.warehouseId === warehouseFilter;
    return bySearch && byStatus && byWarehouse;
  });
  const filteredTotalPages = Math.max(1, Math.ceil(filteredContracts.length / PAGE_SIZE));
  const safePage = Math.min(page, filteredTotalPages);
  const paged = filteredContracts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const warehouseOptions = Array.from(
    new Map(
      contracts
        .filter((c) => c.warehouseId)
        .map((c) => [c.warehouseId, { id: c.warehouseId, name: c.warehouseName || c.warehouseId }])
    ).values()
  );

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, warehouseFilter]);

  useEffect(() => {
    async function loadDetailPayments() {
      if (!detail) {
        setDetailPayments([]);
        return;
      }
      try {
        setDetailPaymentsLoading(true);
        const all = await listManagerPayments();
        const rows = all.contractPayments
          .filter((p) => p.contractId === detail.id)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setDetailPayments(rows);
      } catch {
        setDetailPayments([]);
      } finally {
        setDetailPaymentsLoading(false);
      }
    }
    loadDetailPayments();
  }, [detail]);

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
    <div className="space-y-6">
      <PageHeader
        title="Contracts"
        description="Manage zone rental contracts"
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => setPaymentsOpen(true)}>
              View payments
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}
              leftIcon={<span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>}
            >
              Create contract
            </Button>
          </>
        }
      />

      {loading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : error ? (
        <ErrorState title="Failed to load" message={error} onRetry={load} />
      ) : contracts.length === 0 ? (
        <EmptyState icon="description" title="No contracts" message="No contracts yet" />
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-card">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input
                label="Search contract"
                placeholder="By contract code or customer"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Select
                label="Warehouse"
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All warehouses' },
                  ...warehouseOptions.map((w) => ({ value: w.id, label: w.name })),
                ]}
              />
              <Select
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | Contract['status'])}
                options={[
                  { value: 'all', label: 'All statuses' },
                  { value: 'draft', label: 'Draft' },
                  { value: 'pending_payment', label: 'Pending payment' },
                  { value: 'scheduled', label: 'Scheduled (paid)' },
                  { value: 'active', label: 'Active' },
                  { value: 'expired', label: 'Expired' },
                  { value: 'terminated', label: 'Terminated' },
                ]}
              />
            </div>
          </div>

          {filteredContracts.length === 0 ? (
            <EmptyState icon="search_off" title="No matching contracts" message="Try changing search keywords or filters." />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-card">
              <Table>
                <TableHead>
                  <TableHeader>Contract code</TableHeader>
                  <TableHeader>Customer</TableHeader>
                  <TableHeader>Zones</TableHeader>
                  <TableHeader>Warehouse</TableHeader>
                  <TableHeader>Start / End</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Actions</TableHeader>
                </TableHead>
                <TableBody>
                  {paged.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-bold text-slate-900">{c.code}</TableCell>
                      <TableCell className="text-slate-700">{c.customerName || '—'}</TableCell>
                      <TableCell className="text-slate-700">{getZonesRentedDisplay(c)}</TableCell>
                      <TableCell className="text-slate-700">
                        {c.warehouseName || '—'}
                        {c.warehouseAddress ? ` — ${c.warehouseAddress}` : ''}
                      </TableCell>
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
        </div>
      )}

      {!loading && !error && filteredContracts.length > 0 && (
        <div className="flex items-center justify-center flex-wrap gap-3 pb-4">
          <p className="text-sm text-slate-500 whitespace-nowrap">
            Showing{' '}
            <span className="font-bold text-slate-700">
              {Math.min((safePage - 1) * PAGE_SIZE + 1, filteredContracts.length)}
            </span>
            {' '}to{' '}
            <span className="font-bold text-slate-700">
              {Math.min(safePage * PAGE_SIZE, filteredContracts.length)}
            </span>
            {' '}of{' '}
            <span className="font-bold text-slate-700">{filteredContracts.length}</span>
          </p>
          <Pagination currentPage={safePage} totalPages={filteredTotalPages} onPageChange={setPage} />
        </div>
      )}

      {detail && (
        <Modal
          open={!!detail}
          onOpenChange={(o) => !o && setDetail(null)}
          title={detail.code}
          description={`Contract · ${getStatusDisplay(detail.status)}`}
          size="lg"
          footer={
            <div className="space-y-3">
              {detail.status === 'draft' && (
                <p className="text-xs text-slate-500 leading-relaxed">
                  Approving auto-assigns the first available zone for the requested period and moves this contract to pending payment.
                </p>
              )}
              {detail.status === 'scheduled' && (
                <p className="text-xs text-slate-500 leading-relaxed">
                  Customer has paid. The contract activates automatically on the start date — or activate it early below.
                </p>
              )}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex gap-2 flex-wrap">
                  {detail.status === 'draft' && (
                    <Button onClick={() => handleStatusChange(detail.id, 'pending_payment')} disabled={updating} isLoading={updating}>
                      Approve &amp; set pending payment
                    </Button>
                  )}
                  {detail.status === 'scheduled' && (
                    <>
                      <Button onClick={() => handleStatusChange(detail.id, 'active')} disabled={updating} isLoading={updating}>
                        Activate now
                      </Button>
                      <Button variant="secondary" onClick={() => handleStatusChange(detail.id, 'terminated')} disabled={updating}>
                        Terminate
                      </Button>
                    </>
                  )}
                  {detail.status === 'active' && (
                    <>
                      <Button variant="secondary" onClick={() => handleStatusChange(detail.id, 'terminated')} disabled={updating}>
                        Terminate
                      </Button>
                      <Button variant="danger" onClick={() => handleStatusChange(detail.id, 'expired')} disabled={updating}>
                        Mark expired
                      </Button>
                    </>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setDetail(null)}>Close</Button>
              </div>
            </div>
          }
        >
          <div className="space-y-5">
            {/* Contract overview */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Customer</p>
                <p className="font-semibold text-slate-900">{detail.customerName || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Zones</p>
                <p className="font-semibold text-slate-900">{getZonesRentedDisplay(detail)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Warehouse</p>
                <p className="font-semibold text-slate-900">
                  {detail.warehouseName || '—'}{detail.warehouseAddress ? ` — ${detail.warehouseAddress}` : ''}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Start / End</p>
                <p className="font-semibold text-slate-900">{getDateRangeDisplay(detail)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Status</p>
                <Badge variant={getStatusVariant(detail.status)} size="sm">{getStatusDisplay(detail.status)}</Badge>
              </div>
            </div>

            {/* Payment history */}
            <div className="border-t border-slate-100 pt-5">
              <h4 className="text-sm font-bold text-slate-800 mb-3">Payment History</h4>
              {detailPaymentsLoading ? (
                <LoadingSkeleton className="h-16 rounded-2xl" />
              ) : detailPayments.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No payment records for this contract.</p>
              ) : (
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Time</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">VNPay ref</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailPayments.slice(0, 5).map((p) => (
                        <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors">
                          <td className="px-3 py-2.5 text-xs text-slate-500">
                            {new Date(p.createdAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td className="px-3 py-2.5 font-bold text-slate-900">{p.amount.toLocaleString('vi-VN')} đ</td>
                          <td className="px-3 py-2.5">
                            <Badge size="sm" variant={p.status === 'paid' ? 'success' : p.status === 'pending' ? 'info' : 'error'}>
                              {p.status === 'paid' ? 'Paid' : p.status === 'pending' ? 'Pending' : p.status === 'expired' ? 'Expired' : 'Failed'}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-xs text-slate-400 break-all">{p.vnpTxnRef}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {createOpen && (
        <Modal
          open={createOpen}
          onOpenChange={setCreateOpen}
          title="Create contract"
          description="Assign zones directly to a customer with custom pricing."
          size="lg"
          footer={
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" form="create-contract-form" isLoading={creating}>Create contract</Button>
            </div>
          }
        >
          <form id="create-contract-form" onSubmit={handleCreateContract} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label="Customer ID"
                  value={createForm.customerId}
                  onChange={(e) => setCreateForm((p) => ({ ...p, customerId: e.target.value }))}
                  placeholder="Customer user ID"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <Select
                  label="Warehouse"
                  value={createForm.warehouseId}
                  onChange={(e) => setCreateForm((p) => ({ ...p, warehouseId: e.target.value }))}
                  options={[{ value: '', label: 'Select warehouse' }, ...warehouses.map((w) => ({ value: w.id, label: w.name }))]}
                />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-slate-700">Zone assignments</p>
                <Button type="button" variant="ghost" size="sm" onClick={addRentedZoneRow}
                  leftIcon={<span className="material-symbols-outlined" style={{ fontSize: 15 }}>add</span>}
                >
                  Add zone
                </Button>
              </div>
              <div className="space-y-2">
                {createForm.rentedZones.map((r, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="col-span-4">
                      <Select
                        label="Zone"
                        value={r.zoneId}
                        onChange={(e) => updateRentedZoneRow(i, 'zoneId', e.target.value)}
                        options={[{ value: '', label: 'Select zone' }, ...zones.map((z) => ({ value: z.id, label: `${z.zoneCode} — ${z.name}` }))]}
                      />
                    </div>
                    <div className="col-span-3">
                      <Input label="Start date" type="date" value={r.startDate}
                        onChange={(e) => updateRentedZoneRow(i, 'startDate', e.target.value)} />
                    </div>
                    <div className="col-span-3">
                      <Input label="End date" type="date" value={r.endDate}
                        onChange={(e) => updateRentedZoneRow(i, 'endDate', e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <Input label="Price (VND)" type="number" min="0" step="0.01" value={r.price}
                        onChange={(e) => updateRentedZoneRow(i, 'price', e.target.value)} placeholder="0" />
                    </div>
                    {createForm.rentedZones.length > 1 && (
                      <div className="col-span-12 flex justify-end">
                        <button type="button" onClick={() => removeRentedZoneRow(i)}
                          className="text-xs text-red-500 hover:text-red-700 font-semibold transition-colors">
                          Remove zone
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </form>
        </Modal>
      )}

      {paymentsOpen && (
        <Modal
          open={paymentsOpen}
          onOpenChange={setPaymentsOpen}
          title="Payment Records"
          description="VNPay transaction history across all contracts."
          size="xl"
          footer={
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">Showing all records. Use Refresh to sync with backend.</p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => loadPayments(true)}
                isLoading={paymentsRefreshing}
                disabled={paymentsLoading}
                leftIcon={<span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>}
              >
                Refresh
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {paymentsLoading ? (
              <LoadingSkeleton className="h-48 rounded-2xl" />
            ) : paymentsError ? (
              <ErrorState title="Failed to load payments" message={paymentsError} onRetry={() => loadPayments(false)} />
            ) : contractPayments.length === 0 && servicePayments.length === 0 ? (
              <EmptyState icon="payments" title="No payments" message="No payments found yet." />
            ) : (
              <>
                <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    className={`rounded-lg px-3 py-1.5 text-sm font-bold transition-colors ${
                      paymentTab === 'contract' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                    onClick={() => setPaymentTab('contract')}
                  >
                    Contract <span className="ml-1 text-xs text-slate-400">({contractPayments.length})</span>
                  </button>
                  <button
                    type="button"
                    className={`rounded-lg px-3 py-1.5 text-sm font-bold transition-colors ${
                      paymentTab === 'service' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                    onClick={() => setPaymentTab('service')}
                  >
                    Service <span className="ml-1 text-xs text-slate-400">({servicePayments.length})</span>
                  </button>
                </div>

                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Time</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Contract</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</th>
                        {paymentTab === 'service' && (
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Credits</th>
                        )}
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">VNPay ref</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(paymentTab === 'contract' ? contractPayments : servicePayments).map((p) => (
                        <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                            {new Date(p.createdAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td className="px-4 py-2.5">
                            <p className="font-semibold text-slate-900">{p.contractCode || p.contractId}</p>
                            {p.warehouseName && <p className="text-xs text-slate-400 mt-0.5">{p.warehouseName}</p>}
                          </td>
                          <td className="px-4 py-2.5 text-slate-600">{p.customerName || '—'}</td>
                          {paymentTab === 'service' && (
                            <td className="px-4 py-2.5 font-semibold text-slate-700">
                              {(p as ManagerServicePayment).creditsGranted} cr
                            </td>
                          )}
                          <td className="px-4 py-2.5 font-bold text-slate-900 whitespace-nowrap">
                            {p.amount.toLocaleString('vi-VN')} đ
                          </td>
                          <td className="px-4 py-2.5">
                            <Badge size="sm" variant={p.status === 'paid' ? 'success' : p.status === 'pending' ? 'info' : 'error'}>
                              {p.status === 'paid' ? 'Paid' : p.status === 'pending' ? 'Pending' : p.status === 'expired' ? 'Expired' : 'Failed'}
                            </Badge>
                            {p.paidAt && (
                              <p className="text-[11px] text-slate-400 mt-0.5 whitespace-nowrap">
                                {new Date(p.paidAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <p className="font-mono text-xs text-slate-500 break-all">{p.vnpTxnRef}</p>
                            {p.vnpResponseCode && (
                              <p className="text-[11px] text-slate-400 mt-0.5">Code: {p.vnpResponseCode}</p>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
