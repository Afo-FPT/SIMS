'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type {
  ServiceRequest,
  ServiceRequestType,
  ServiceRequestItem,
  PickupDelivery,
  Contract,
} from '../../../lib/customer-types';
import {
  createInboundStorageRequest,
  createOutboundStorageRequest,
  listStorageRequests,
  getStorageRequestById,
  type StorageRequestView,
} from '../../../lib/storage-requests.api';
import { getCustomerContracts } from '../../../lib/mockApi/customer.api';
import { MOCK_SERVICE_REQUESTS } from '../../../lib/customer-mock';
import { useToastHelpers } from '../../../lib/toast';
import { listMyStoredItems, type StoredItemOption } from '../../../lib/stored-items.api';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import {
  type CycleCountResponse,
  createCycleCount,
  getCycleCounts as getCycleCountsApi,
} from '../../../lib/cycle-count.api';

const REQUEST_TYPES: { id: ServiceRequestType; label: string }[] = [
  { id: 'Inbound', label: 'Inbound' },
  { id: 'Outbound', label: 'Outbound' },
  { id: 'Inventory Checking', label: 'Inventory Checking' },
];

export default function ServiceRequestsPage() {
  const toast = useToastHelpers();
  const [activeContracts, setActiveContracts] = useState<Contract[]>([]);
  const [contractsLoading, setContractsLoading] = useState(true);
  const [contractsError, setContractsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCustomerContracts()
      .then((contracts) => {
        if (!cancelled) {
          const active = contracts.filter((c) => c.status === 'active');
          setActiveContracts(active);
        }
      })
      .catch((err) => {
        if (!cancelled) setContractsError(err instanceof Error ? err.message : 'Failed to load contracts');
      })
      .finally(() => {
        if (!cancelled) setContractsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const [requests, setRequests] = useState<ServiceRequest[]>(MOCK_SERVICE_REQUESTS);
  const [contractId, setContractId] = useState('');

  useEffect(() => {
    if (activeContracts.length > 0 && !contractId) {
      setContractId(activeContracts[0].id);
    }
  }, [activeContracts, contractId]);

  const hasActive = activeContracts.length > 0;
  const [type, setType] = useState<ServiceRequestType>('Inbound');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [notes, setNotes] = useState('');
  const [inboundRef, setInboundRef] = useState('');
  const [inboundItems, setInboundItems] = useState<(ServiceRequestItem & { quantityPerUnit?: number; useNewSku?: boolean; unit?: string })[]>([]);
  const [outboundRef, setOutboundRef] = useState('');
  const [outboundItems, setOutboundItems] = useState<{ storedItemId: string; sku: string; quantity: number }[]>([]);
  const [storedItemOptions, setStoredItemOptions] = useState<StoredItemOption[]>([]);
  const [checkScope, setCheckScope] = useState<'Full inventory' | 'By SKU list'>('Full inventory');
  /** When "By SKU list": list of stored_item_id selected for cycle count */
  const [checkSkuList, setCheckSkuList] = useState<string[]>([]);
  /** Stored items of current contract for Inventory Checking "By SKU list" (from BE) */
  const [cycleCountStoredItems, setCycleCountStoredItems] = useState<StoredItemOption[]>([]);
  const [cycleCountStoredItemsLoading, setCycleCountStoredItemsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mainTab, setMainTab] = useState<'new' | 'list'>('new');

  // Theo dõi đơn: danh sách từ API
  const [trackingRequests, setTrackingRequests] = useState<StorageRequestView[]>([]);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [detailRequestId, setDetailRequestId] = useState<string | null>(null);
  const [detailRequest, setDetailRequest] = useState<StorageRequestView | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Theo dõi cycle count (Inventory Checking thực tế)
  const [cycleCounts, setCycleCounts] = useState<CycleCountResponse[]>([]);
  const [cycleLoading, setCycleLoading] = useState(false);
  const [cycleError, setCycleError] = useState<string | null>(null);

  // Load stored items for outbound (dropdown) and inbound (existing SKU list) when contract/type changes
  useEffect(() => {
    if ((type !== 'Outbound' && type !== 'Inbound') || !contractId) return;
    let cancelled = false;
    listMyStoredItems(contractId)
      .then((data) => {
        if (!cancelled) setStoredItemOptions(data);
      })
      .catch((err) => {
        if (!cancelled) toast.error(err instanceof Error ? err.message : 'Failed to load stored items');
      });
    return () => {
      cancelled = true;
    };
  }, [type, contractId]);

  // Load stored items for Inventory Checking "By SKU list" (SKUs của contract từ BE)
  useEffect(() => {
    if (type !== 'Inventory Checking' || !contractId) {
      setCycleCountStoredItems([]);
      return;
    }
    let cancelled = false;
    setCycleCountStoredItemsLoading(true);
    listMyStoredItems(contractId)
      .then((data) => {
        if (!cancelled) setCycleCountStoredItems(data);
      })
      .catch((err) => {
        if (!cancelled) toast.error(err instanceof Error ? err.message : 'Failed to load stored items');
      })
      .finally(() => {
        if (!cancelled) setCycleCountStoredItemsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [type, contractId]);

  const loadTrackingRequests = async () => {
    try {
      setTrackingLoading(true);
      setTrackingError(null);
      const data = await listStorageRequests();
      setTrackingRequests(data);
    } catch (err) {
      setTrackingError(err instanceof Error ? err.message : 'Failed to load request list');
      toast.error('Failed to load request list');
    } finally {
      setTrackingLoading(false);
    }
  };

  const loadCycleCounts = async () => {
    try {
      setCycleLoading(true);
      setCycleError(null);
      const data = await getCycleCountsApi();
      setCycleCounts(data);
    } catch (err) {
      setCycleError(err instanceof Error ? err.message : 'Failed to load cycle counts');
      toast.error('Failed to load cycle counts');
    } finally {
      setCycleLoading(false);
    }
  };

  useEffect(() => {
    if (mainTab === 'list' && hasActive) {
      loadTrackingRequests();
      loadCycleCounts();
    }
  }, [mainTab, hasActive]);

  useEffect(() => {
    if (!detailRequestId) {
      setDetailRequest(null);
      setDetailLoading(false);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailRequest(null);
    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        setDetailLoading(false);
        setDetailRequest(null);
        toast.error('Request detail took too long. Please try again.');
      }
    }, 12000);
    getStorageRequestById(detailRequestId)
      .then((data) => {
        if (!cancelled) setDetailRequest(data ?? null);
      })
      .catch((err) => {
        if (!cancelled) {
          setDetailRequest(null);
          toast.error(err instanceof Error ? err.message : 'Failed to load request details');
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
        clearTimeout(timeoutId);
      });
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [detailRequestId]);

  const statusLabel: Record<string, string> = {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    DONE_BY_STAFF: 'In progress',
    COMPLETED: 'Completed',
    REJECTED: 'Rejected',
  };
  const formatDate = (s: string) => {
    try {
      return new Date(s).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return s;
    }
  };

  const addInboundRow = () => {
    setInboundItems((prev) => [...prev, { sku: '', name: '', quantity: 0, note: '', quantityPerUnit: undefined, useNewSku: false, unit: 'pcs' }]);
  };

  // Unique existing SKU names from stored items (for Inbound dropdown)
  // Existing SKU templates (name -> default unit + qty/unit)
  const existingInboundSkuTemplates = useMemo(() => {
    const map = new Map<
      string,
      {
        unit: string;
        quantityPerUnit?: number;
      }
    >();
    for (const s of storedItemOptions) {
      if (!s.item_name) continue;
      if (!map.has(s.item_name)) {
        map.set(s.item_name, {
          unit: s.unit,
          quantityPerUnit: (s as any).quantity_per_unit,
        });
      }
    }
    return map;
  }, [storedItemOptions]);

  const existingInboundSkus = useMemo(() => {
    const names = [...existingInboundSkuTemplates.keys()];
    return names.sort((a, b) => a.localeCompare(b));
  }, [existingInboundSkuTemplates]);
  const removeInboundRow = (i: number) => {
    setInboundItems((prev) => prev.filter((_, j) => j !== i));
  };
  const updateInboundRow = (
    i: number,
    f: Partial<ServiceRequestItem & { quantityPerUnit?: number; useNewSku?: boolean; unit?: string }>
  ) => {
    setInboundItems((prev) => prev.map((r, j) => (j === i ? { ...r, ...f } : r)));
  };

  const addOutboundRow = () => {
    setOutboundItems((prev) => [...prev, { storedItemId: '', sku: '', quantity: 0 }]);
  };
  const removeOutboundRow = (i: number) => {
    setOutboundItems((prev) => prev.filter((_, j) => j !== i));
  };
  const updateOutboundRow = (
    i: number,
    f: Partial<{ storedItemId: string; sku: string; quantity: number }>
  ) => {
    setOutboundItems((prev) => prev.map((r, j) => (j === i ? { ...r, ...f } : r)));
  };

  const toggleCheckStoredItem = (storedItemId: string) => {
    setCheckSkuList((prev) =>
      prev.includes(storedItemId) ? prev.filter((id) => id !== storedItemId) : [...prev, storedItemId]
    );
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!contractId) e.contract = 'Select a contract';
    if (!preferredDate) e.preferredDate = 'Preferred date is required';
    if (type === 'Inbound') {
      if (!inboundRef.trim()) {
        e.inboundRef = 'Inbound reference is required';
      }
      const withQty = inboundItems.filter((r) => r.sku && r.quantity > 0);
      if (withQty.length === 0) e.items = 'Add at least one item';
    }
    if (type === 'Outbound') {
      if (!outboundRef.trim()) {
        e.outboundRef = 'Outbound reference is required';
      }
      const withQty = outboundItems.filter((r) => r.storedItemId && r.quantity > 0);
      if (withQty.length === 0) {
        e.items = 'Add at least one item (select stored item + quantity)';
      } else {
        // Validate each outbound row does not exceed available quantity in stock
        for (const row of withQty) {
          const stored = storedItemOptions.find((s) => s.stored_item_id === row.storedItemId);
          if (!stored) continue;
          if (row.quantity > stored.quantity) {
            e.items = `Requested quantity for '${stored.item_name}' exceeds available stock (${stored.quantity} ${stored.unit}).`;
            break;
          }
        }
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.warning('Please fix validation errors before submitting');
      return;
    }
    const base = {
      id: `SR-${String(requests.length + 1).padStart(3, '0')}`,
      contractId,
      type,
      preferredDate,
      preferredTime: preferredTime || undefined,
      notes: notes || undefined,
      status: 'Pending' as const,
      createdAt: new Date().toISOString(),
    };
    if (type === 'Inbound') {
      const items = inboundItems.filter((r) => r.sku && r.quantity > 0);
        createInboundStorageRequest({
        contractId,
        reference: inboundRef.trim() || undefined,
        items: items.map((it) => ({
          itemName: it.name || it.sku,
          quantity: Number(it.quantity),
          unit: it.unit || 'pcs',
          quantityPerUnit: (it as any).quantityPerUnit != null ? Number((it as any).quantityPerUnit) : undefined,
        })),
      })
        .then(() => {
          toast.success('Inbound request submitted successfully!', 5000);
          setRequests((prev) => [
            ...prev,
            {
              ...base,
              inboundRef: inboundRef || undefined,
            items,
            } as ServiceRequest,
          ]);
          setInboundItems([]);
          setInboundRef('');
          loadTrackingRequests();
        })
        .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to submit inbound request'));
    } else if (type === 'Outbound') {
      const items = outboundItems
        .filter((r) => r.storedItemId && r.quantity > 0)
        .map((r) => {
          const stored = storedItemOptions.find((s) => s.stored_item_id === r.storedItemId);
          if (!stored) return null;
          return {
            shelfId: stored.shelf_id,
            itemName: stored.item_name,
            quantity: r.quantity,
            unit: stored.unit || 'pcs',
          } as const;
        })
        .filter((x): x is { shelfId: string; itemName: string; quantity: number; unit: string } => !!x);

      createOutboundStorageRequest({
        contractId,
        reference: outboundRef.trim() || undefined,
        items,
      })
        .then(() => {
          toast.success('Outbound request submitted successfully!', 5000);
          setRequests((prev) => [
            ...prev,
            {
              ...base,
              outboundRef: outboundRef || undefined,
            items: outboundItems,
            } as ServiceRequest,
          ]);
          setOutboundItems([]);
          setOutboundRef('');
          loadTrackingRequests();
        })
        .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to submit outbound request'));
    } else {
      // Inventory Checking → tạo Cycle Count thực tế cho hợp đồng
      const storedItemIds =
        checkScope === 'By SKU list' && checkSkuList.length > 0 ? checkSkuList : undefined;
      createCycleCount({
        contractId,
        storedItemIds,
        note: notes || undefined,
        preferredDate: preferredDate ? new Date(preferredDate).toISOString() : undefined,
      })
        .then(() => {
          toast.success('Cycle count request submitted successfully!', 5000);
          // Reset chỉ các field chung
          setNotes('');
          setCheckScope('Full inventory');
          setCheckSkuList([]);
          loadCycleCounts();
        })
        .catch((err) =>
          toast.error(
            err instanceof Error ? err.message : 'Failed to submit inventory checking request'
          )
        );
    }
  };

  if (contractsLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-black text-slate-900">Service Requests</h1>
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 text-center">
          <span className="material-symbols-outlined text-4xl text-slate-400 mb-4 animate-pulse">hourglass_empty</span>
          <p className="text-lg font-bold text-slate-600">Loading contracts…</p>
        </div>
      </div>
    );
  }

  if (contractsError) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-black text-slate-900">Service Requests</h1>
        <div className="bg-red-50 border border-red-200 rounded-3xl p-8 text-center">
          <span className="material-symbols-outlined text-4xl text-red-500 mb-4">error</span>
          <p className="text-lg font-bold text-red-800">Failed to load contracts</p>
          <p className="text-sm text-red-700 mt-2">{contractsError}</p>
          <a
            href="/customer/contracts"
            className="inline-flex items-center gap-2 mt-4 px-6 py-3 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600"
          >
            Go to Contracts
            <span className="material-symbols-outlined">arrow_forward</span>
          </a>
        </div>
      </div>
    );
  }

  if (!hasActive) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-black text-slate-900">Service Requests</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 text-center">
          <span className="material-symbols-outlined text-4xl text-amber-500 mb-4">info</span>
          <p className="text-lg font-bold text-amber-800">Need active contract</p>
          <p className="text-sm text-amber-700 mt-2">
            Confirm an active contract first to create Inbound, Outbound, or Inventory Checking
            requests.
          </p>
          <a
            href="/customer/contracts"
            className="inline-flex items-center gap-2 mt-4 px-6 py-3 bg-amber-500 text-white font-bold rounded-2xl hover:bg-amber-600"
          >
            Go to Contracts
            <span className="material-symbols-outlined">arrow_forward</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900">Service Requests</h1>
        <p className="text-slate-500 mt-1">Inbound, Outbound & Inventory Checking</p>
      </div>

      {/* Main tabs: New request | Request list (theo dõi) */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setMainTab('new')}
          className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${
            mainTab === 'new'
              ? 'bg-primary/10 text-primary border border-primary/30'
              : 'bg-slate-100 text-slate-600 border border-transparent hover:bg-slate-200'
          }`}
        >
          New request
        </button>
        <button
          type="button"
          onClick={() => setMainTab('list')}
          className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${
            mainTab === 'list'
              ? 'bg-primary/10 text-primary border border-primary/30'
              : 'bg-slate-100 text-slate-600 border border-transparent hover:bg-slate-200'
          }`}
        >
          Track requests
        </button>
      </div>

      {mainTab === 'list' ? (
        <>
          <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <h2 className="text-lg font-black text-slate-900 p-6 pb-2">Inbound / Outbound requests</h2>
            <p className="text-sm text-slate-500 px-6 pb-4">Track status of inbound/outbound requests</p>
            {trackingLoading ? (
              <div className="p-12 text-center text-slate-500">Loading…</div>
            ) : trackingError ? (
              <div className="p-12 text-center">
                <p className="text-red-600 mb-4">{trackingError}</p>
                <Button variant="outline" onClick={loadTrackingRequests}>Retry</Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Request ID</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Type</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Created</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Status</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trackingRequests.map((r) => (
                      <tr key={r.request_id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="px-6 py-4 font-bold text-slate-900">{r.request_id}</td>
                        <td className="px-6 py-4 text-slate-700">
                          {r.request_type === 'IN' ? 'Inbound' : 'Outbound'}
                        </td>
                        <td className="px-6 py-4 text-slate-700">{formatDate(r.created_at)}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${
                              r.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-700'
                                : r.status === 'DONE_BY_STAFF' || r.status === 'APPROVED'
                                  ? 'bg-blue-100 text-blue-700'
                                  : r.status === 'REJECTED'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {statusLabel[r.status] ?? r.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            type="button"
                            onClick={() => setDetailRequestId(r.request_id)}
                            className="text-sm font-bold text-primary hover:underline"
                          >
                            View details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!trackingLoading && !trackingError && trackingRequests.length === 0 && (
              <div className="p-12 text-center text-slate-500">
                No requests yet. Switch to &quot;New request&quot; to submit.
              </div>
            )}
          </section>

          <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <h2 className="text-lg font-black text-slate-900 p-6 pb-2">Cycle Count (Inventory Checking)</h2>
            <p className="text-sm text-slate-500 px-6 pb-4">
              Track requested inventory cycle counts
            </p>
            {cycleLoading ? (
              <div className="p-12 text-center text-slate-500">Loading…</div>
            ) : cycleError ? (
              <div className="p-12 text-center">
                <p className="text-red-600 mb-4">{cycleError}</p>
                <Button variant="outline" onClick={loadCycleCounts}>Retry</Button>
              </div>
            ) : cycleCounts.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                No cycle counts yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Contract</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Warehouse</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Status</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Deadline</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cycleCounts.map((cc) => (
                      <tr key={cc.cycle_count_id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="px-6 py-4 font-bold text-slate-900">{cc.contract_code}</td>
                        <td className="px-6 py-4 text-slate-700">{cc.warehouse_name || '—'}</td>
                        <td className="px-6 py-4 text-slate-700">{cc.status}</td>
                        <td className="px-6 py-4 text-slate-700">
                          {cc.counting_deadline
                            ? formatDate(cc.counting_deadline)
                            : '—'}
                        </td>
                        <td className="px-6 py-4">
                          <a
                            href={`/customer/cycle-count/${cc.cycle_count_id}`}
                            className="text-sm font-bold text-primary hover:underline"
                          >
                            View details
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : (
        <form
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Contract</label>
            <select
              value={contractId}
              onChange={(e) => setContractId(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            >
              {activeContracts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code}
                </option>
              ))}
            </select>
            {errors.contract && (
              <p className="text-xs text-red-500 mt-1">{errors.contract}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Preferred date / time
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
              <input
                type="time"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="w-32 px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            {errors.preferredDate && (
              <p className="text-xs text-red-500 mt-1">{errors.preferredDate}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Request type</label>
          <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
            {REQUEST_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setType(t.id)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${type === t.id ? 'bg-white shadow text-primary' : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {type === 'Inbound' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-700 uppercase">Inbound</h3>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Inbound reference
              </label>
              <input
                type="text"
                value={inboundRef}
                onChange={(e) => setInboundRef(e.target.value)}
                placeholder="e.g. IN-2025-0025"
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
              {errors.inboundRef && (
                <p className="text-xs text-red-500 mt-1">{errors.inboundRef}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Items</label>
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3 font-bold text-slate-700">SKU</th>
                      <th className="px-4 py-3 font-bold text-slate-700">Name</th>
                      <th className="px-4 py-3 font-bold text-slate-700">Qty</th>
                      <th className="px-4 py-3 font-bold text-slate-700">Qty / unit</th>
                      <th className="px-4 py-3 font-bold text-slate-700">Unit</th>
                      <th className="px-4 py-3 w-12" />
                    </tr>
                  </thead>
                  <tbody>
                    {inboundItems.map((r, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="px-4 py-2">
                          {r.useNewSku ? (
                            <div className="flex flex-col gap-1">
                              <input
                                value={r.sku}
                                onChange={(e) => updateInboundRow(i, { sku: e.target.value })}
                                placeholder="Enter new SKU / item name"
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-primary/20"
                              />
                              <button
                                type="button"
                                onClick={() => updateInboundRow(i, { useNewSku: false, sku: '', name: '' })}
                                className="text-xs text-primary hover:underline text-left"
                              >
                                Choose from existing list
                              </button>
                            </div>
                          ) : (
                            <select
                              value={r.sku || ''}
                              onChange={(e) => {
                                const v = e.target.value;
                                if (v === '__new__') {
                                  updateInboundRow(i, {
                                    useNewSku: true,
                                    sku: '',
                                    name: '',
                                    quantityPerUnit: undefined,
                                    unit: 'pcs',
                                  } as any);
                                } else {
                                  const tpl = existingInboundSkuTemplates.get(v);
                                  updateInboundRow(i, {
                                    sku: v,
                                    name: v,
                                    quantityPerUnit: tpl?.quantityPerUnit,
                                    unit: tpl?.unit ?? 'pcs',
                                  } as any);
                                }
                              }}
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                            >
                              <option value="">— Select existing SKU or create new —</option>
                              {existingInboundSkus.map((name) => (
                                <option key={name} value={name}>
                                  {name}
                                </option>
                              ))}
                              <option value="__new__">➕ Add new SKU</option>
                            </select>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <input
                            value={r.name ?? ''}
                            onChange={(e) => updateInboundRow(i, { name: e.target.value })}
                            disabled={!r.useNewSku}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-slate-50 disabled:text-slate-500"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min={0}
                            value={r.quantity || ''}
                            onChange={(e) =>
                              updateInboundRow(i, { quantity: Number(e.target.value) || 0 })
                            }
                            className="w-24 px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min={0}
                            value={(r as any).quantityPerUnit ?? ''}
                            onChange={(e) =>
                              updateInboundRow(
                                i,
                                {
                                  quantityPerUnit:
                                    e.target.value === '' ? undefined : Number(e.target.value),
                                } as any,
                              )
                            }
                            disabled={!r.useNewSku}
                            className="w-28 px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-slate-50 disabled:text-slate-500"
                            placeholder="optional"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <select
                            value={r.unit ?? 'pcs'}
                            onChange={(e) => updateInboundRow(i, { unit: e.target.value })}
                            disabled={!r.useNewSku}
                            className="w-full min-w-[6rem] px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-primary/20 bg-white disabled:bg-slate-50 disabled:text-slate-500"
                          >
                            <option value="pcs">pcs</option>
                            <option value="box">box</option>
                            <option value="carton">carton</option>
                            <option value="pallet">pallet</option>
                            <option value="kg">kg</option>
                            <option value="g">g</option>
                            <option value="liter">liter</option>
                            <option value="meter">meter</option>
                            <option value="set">set</option>
                            <option value="pack">pack</option>
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <button
                            type="button"
                            onClick={() => removeInboundRow(i)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <span className="material-symbols-outlined text-lg">close</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={addInboundRow}
                    className="text-sm font-bold text-primary hover:underline"
                  >
                    + Add row
                  </button>
                </div>
              </div>
              {errors.items && (
                <p className="text-xs text-red-500 mt-1">{errors.items}</p>
              )}
            </div>
          </div>
        )}

        {type === 'Outbound' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-700 uppercase">Outbound</h3>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Outbound reference
              </label>
              <input
                type="text"
                value={outboundRef}
                onChange={(e) => setOutboundRef(e.target.value)}
                placeholder="e.g. OUT-2025-0012"
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
              {errors.outboundRef && (
                <p className="text-xs text-red-500 mt-1">{errors.outboundRef}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Items</label>
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3 font-bold text-slate-700">Stored item</th>
                      <th className="px-4 py-3 font-bold text-slate-700">Qty</th>
                      <th className="px-4 py-3 w-12" />
                    </tr>
                  </thead>
                  <tbody>
                    {outboundItems.map((r, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="px-4 py-2">
                          <select
                            value={r.storedItemId}
                            onChange={(e) => {
                              const storedId = e.target.value;
                              const stored = storedItemOptions.find((s) => s.stored_item_id === storedId);
                              updateOutboundRow(i, {
                                storedItemId: storedId,
                                sku: stored ? stored.item_name : '',
                              });
                            }}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="">Select stored item</option>
                            {storedItemOptions.map((s) => (
                              <option key={s.stored_item_id} value={s.stored_item_id}>
                                {s.item_name}
                                {s.shelf_code ? ` @ ${s.shelf_code}` : ''}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min={0}
                            value={r.quantity || ''}
                            onChange={(e) =>
                              updateOutboundRow(i, { quantity: Number(e.target.value) || 0 })
                            }
                            className="w-24 px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <button
                            type="button"
                            onClick={() => removeOutboundRow(i)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <span className="material-symbols-outlined text-lg">close</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={addOutboundRow}
                    className="text-sm font-bold text-primary hover:underline"
                  >
                    + Add row
                  </button>
                </div>
              </div>
              {errors.items && (
                <p className="text-xs text-red-500 mt-1">{errors.items}</p>
              )}
            </div>
          </div>
        )}

        {type === 'Inventory Checking' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-700 uppercase">Scope</h3>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={checkScope === 'Full inventory'}
                  onChange={() => setCheckScope('Full inventory')}
                />
                <span className="font-medium">Full inventory (recommended)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={checkScope === 'By SKU list'}
                  onChange={() => setCheckScope('By SKU list')}
                />
                <span className="font-medium">By SKU list</span>
              </label>
            </div>
            {checkScope === 'By SKU list' && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Select items (contract stored items)
                </label>
                {cycleCountStoredItemsLoading ? (
                  <p className="text-sm text-slate-500">Loading list from warehouse…</p>
                ) : cycleCountStoredItems.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    This contract has no stored items. Choose Full inventory or add items to warehouse first.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {cycleCountStoredItems.map((item) => (
                      <button
                        key={item.stored_item_id}
                        type="button"
                        onClick={() => toggleCheckStoredItem(item.stored_item_id)}
                        className={`px-3 py-1.5 rounded-xl text-sm font-bold ${checkSkuList.includes(item.stored_item_id)
                            ? 'bg-primary text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                      >
                        {item.item_name}
                        {item.shelf_code ? ` (${item.shelf_code})` : ''}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
          />
        </div>

        <button
          type="submit"
          className="px-6 py-3 bg-primary text-white font-black rounded-2xl hover:bg-primary-dark"
        >
          Submit request
        </button>
      </form>
      )}

      {/* Modal xem chi tiết đơn – enlarged and structured */}
      <Modal
        open={!!detailRequestId}
        onOpenChange={(open) => { if (!open) setDetailRequestId(null); }}
        title="Request details"
        size="xl"
      >
        {detailLoading ? (
          <div className="py-12 text-center text-slate-500">
            <span className="material-symbols-outlined text-4xl animate-pulse text-slate-400">hourglass_empty</span>
            <p className="mt-2">Loading request details…</p>
          </div>
        ) : detailRequest ? (
          <div className="space-y-8">
            {/* Summary */}
            <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                <span className="text-slate-500">Request ID:</span>
                <span className="font-bold text-slate-900">{detailRequest.request_id}</span>
                <span className="text-slate-400">|</span>
                <span className="text-slate-500">Type:</span>
                <span className="font-medium text-slate-800">
                  {detailRequest.request_type === 'IN' ? 'Inbound' : 'Outbound'}
                </span>
                <span className="text-slate-400">|</span>
                <span className="text-slate-500">Contract:</span>
                <span className="font-medium text-slate-800">{detailRequest.contract_id}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                <span className="text-slate-500">Status:</span>
                <span
                  className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${
                    detailRequest.status === 'COMPLETED'
                      ? 'bg-emerald-100 text-emerald-700'
                      : detailRequest.status === 'DONE_BY_STAFF' || detailRequest.status === 'APPROVED'
                        ? 'bg-blue-100 text-blue-700'
                        : detailRequest.status === 'REJECTED'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {statusLabel[detailRequest.status] ?? detailRequest.status}
                </span>
                <span className="text-slate-400">|</span>
                <span className="text-slate-500">Created:</span>
                <span>{formatDate(detailRequest.created_at)}</span>
                {detailRequest.updated_at && (
                  <>
                    <span className="text-slate-400">|</span>
                    <span className="text-slate-500">Updated:</span>
                    <span>{formatDate(detailRequest.updated_at)}</span>
                  </>
                )}
              </div>
            </div>

            {/* Items table */}
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-2">Items ({detailRequest.items.length})</h3>
              {detailRequest.items.length === 0 ? (
                <p className="text-slate-500 py-4 text-sm">No items in this request.</p>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="px-4 py-3 text-left font-bold text-slate-600">#</th>
                        <th className="px-4 py-3 text-left font-bold text-slate-600">Item</th>
                        <th className="px-4 py-3 text-left font-bold text-slate-600">Unit</th>
                        {detailRequest.request_type === 'IN' && (
                          <th className="px-4 py-3 text-right font-bold text-slate-600">Qty/unit</th>
                        )}
                        <th className="px-4 py-3 text-right font-bold text-slate-600">Requested</th>
                        <th className="px-4 py-3 text-right font-bold text-slate-600">Actual</th>
                        <th className="px-4 py-3 text-left font-bold text-slate-600">Shelf</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailRequest.items.map((it, idx) => (
                        <tr key={it.request_detail_id} className="border-t border-slate-100 hover:bg-slate-50/50">
                          <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                          <td className="px-4 py-3 font-medium text-slate-900">{it.item_name}</td>
                          <td className="px-4 py-3 text-slate-700">{it.unit}</td>
                          {detailRequest.request_type === 'IN' && (
                            <td className="px-4 py-3 text-right text-slate-600">
                              {it.quantity_per_unit != null ? it.quantity_per_unit : '—'}
                            </td>
                          )}
                          <td className="px-4 py-3 text-right font-medium">{it.quantity_requested}</td>
                          <td className="px-4 py-3 text-right">
                            {it.quantity_actual != null ? it.quantity_actual : '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{it.shelf_code ?? it.shelf_id ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Loss / shortage information */}
            {(() => {
              const lossItems = detailRequest.items.filter((it) => {
                const req = it.quantity_requested;
                const actual = it.quantity_actual ?? 0;
                const damage = it.damage_quantity ?? 0;
                return actual < req || damage > 0;
              });
              if (lossItems.length === 0) return null;
              const lossReasonLabel: Record<string, string> = {
                damage: 'Damage in transit',
                damage_storage: 'Storage damage',
                shortage: 'Shortage on receipt',
                quality: 'Quality not met',
                expired: 'Expired',
                damage_picking: 'Damage during picking',
                location_error: 'Location not found',
                other: 'Other',
              };
              return (
                <div className="border border-amber-200 rounded-2xl bg-amber-50/50 p-4">
                  <h3 className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">warning</span>
                    Loss / shortage notice
                  </h3>
                  <ul className="space-y-3">
                    {lossItems.map((it) => {
                      const req = it.quantity_requested;
                      const actual = it.quantity_actual ?? 0;
                      const damage = it.damage_quantity ?? 0;
                      const short = Math.max(0, req - actual);
                      const reasonText = it.loss_reason ? (lossReasonLabel[it.loss_reason] ?? it.loss_reason) : null;
                      return (
                        <li key={it.request_detail_id} className="text-sm border-b border-amber-100 pb-3 last:border-0 last:pb-0">
                          <p className="font-bold text-slate-900">{it.item_name}</p>
                          <div className="mt-1 space-y-0.5 text-slate-700">
                            {short > 0 && (
                              <p><span className="text-amber-700 font-medium">Short:</span> {short} {it.unit} (requested {req}, actual {actual})</p>
                            )}
                            {damage > 0 && (
                              <p><span className="text-amber-700 font-medium">Damaged / short:</span> {damage} {it.unit}</p>
                            )}
                            {reasonText && (
                              <p><span className="text-slate-600 font-medium">Reason:</span> {reasonText}</p>
                            )}
                            {it.loss_notes && (
                              <p><span className="text-slate-600 font-medium">Note:</span> {it.loss_notes}</p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500">
            <span className="material-symbols-outlined text-4xl text-slate-300">inbox</span>
            <p className="mt-2">No request data.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
