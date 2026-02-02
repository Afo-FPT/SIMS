'use client';

import React, { useState, useEffect } from 'react';
import type {
  ServiceRequest,
  ServiceRequestType,
  ServiceRequestItem,
  PickupDelivery,
  Contract,
} from '../../../lib/customer-types';
import { createInboundStorageRequest, createOutboundStorageRequest } from '../../../lib/storage-requests.api';
import { getCustomerContracts } from '../../../lib/mockApi/customer.api';
import { MOCK_SERVICE_REQUESTS, MOCK_INVENTORY } from '../../../lib/customer-mock';
import { useToastHelpers } from '../../../lib/toast';
import { listMyStoredItems, type StoredItemOption } from '../../../lib/stored-items.api';

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
  const [inboundItems, setInboundItems] = useState<(ServiceRequestItem & { quantityPerUnit?: number })[]>([]);
  const [expectedArrival, setExpectedArrival] = useState('');
  const [outboundRef, setOutboundRef] = useState('');
  const [outboundItems, setOutboundItems] = useState<{ storedItemId: string; sku: string; quantity: number }[]>([]);
  const [storedItemOptions, setStoredItemOptions] = useState<StoredItemOption[]>([]);
  const [pickupDelivery, setPickupDelivery] = useState<PickupDelivery>('Pickup');
  const [destination, setDestination] = useState('');
  const [checkScope, setCheckScope] = useState<'Full inventory' | 'By SKU list'>('Full inventory');
  const [checkSkuList, setCheckSkuList] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load stored items for outbound when contract or type changes
  useEffect(() => {
    if (type !== 'Outbound' || !contractId) return;
    let cancelled = false;
    listMyStoredItems(contractId)
      .then((data) => {
        if (!cancelled) setStoredItemOptions(data);
      })
      .catch((err) => {
        if (!cancelled) toast.error(err instanceof Error ? err.message : 'Failed to load stored items for outbound');
      });
    return () => {
      cancelled = true;
    };
  }, [type, contractId, toast]);

  const addInboundRow = () => {
    setInboundItems((prev) => [...prev, { sku: '', name: '', quantity: 0, note: '', quantityPerUnit: undefined }]);
  };
  const removeInboundRow = (i: number) => {
    setInboundItems((prev) => prev.filter((_, j) => j !== i));
  };
  const updateInboundRow = (i: number, f: Partial<ServiceRequestItem>) => {
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

  const toggleCheckSku = (sku: string) => {
    setCheckSkuList((prev) =>
      prev.includes(sku) ? prev.filter((s) => s !== sku) : [...prev, sku]
    );
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!contractId) e.contract = 'Select a contract';
    if (!preferredDate) e.preferredDate = 'Preferred date is required';
    if (type === 'Inbound') {
      const withQty = inboundItems.filter((r) => r.sku && r.quantity > 0);
      if (withQty.length === 0) e.items = 'Add at least one item';
    }
    if (type === 'Outbound') {
      const withQty = outboundItems.filter((r) => r.storedItemId && r.quantity > 0);
      if (withQty.length === 0) e.items = 'Add at least one item (select stored item + quantity)';
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
        items: items.map((it) => ({
          itemName: it.name || it.sku,
          quantity: Number(it.quantity),
          unit: 'pcs',
          quantityPerUnit: (it as any).quantityPerUnit != null ? Number((it as any).quantityPerUnit) : undefined,
        })),
      })
        .then(() => {
          toast.success('Inbound request submitted. Manager will approve, then staff will putaway into shelves in your rented zone.');
          // keep local list for UI
          setRequests((prev) => [
            ...prev,
            {
              ...base,
              inboundRef: inboundRef || undefined,
              items,
              expectedArrival: expectedArrival || undefined,
            } as ServiceRequest,
          ]);
          setInboundItems([]);
          setInboundRef('');
          setExpectedArrival('');
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
        items,
      })
        .then(() => {
          toast.success('Outbound request submitted. Staff will pick from shelves and dispatch.');
          setRequests((prev) => [
            ...prev,
            {
              ...base,
              outboundRef: outboundRef || undefined,
              items: outboundItems,
              pickupDelivery,
              destination: pickupDelivery === 'Delivery' ? destination : undefined,
            } as ServiceRequest,
          ]);
          setOutboundItems([]);
          setOutboundRef('');
        })
        .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to submit outbound request'));
    } else {
      setRequests((prev) => [
        ...prev,
        {
          ...base,
          scope: checkScope,
          skuList: checkScope === 'By SKU list' ? checkSkuList : undefined,
        } as ServiceRequest,
      ]);
      toast.success(`${type} request ${base.id} submitted successfully`);
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
                      <th className="px-4 py-3 font-bold text-slate-700">Note</th>
                      <th className="px-4 py-3 w-12" />
                    </tr>
                  </thead>
                  <tbody>
                    {inboundItems.map((r, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="px-4 py-2">
                          <input
                            value={r.sku}
                            onChange={(e) => updateInboundRow(i, { sku: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            value={r.name ?? ''}
                            onChange={(e) => updateInboundRow(i, { name: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-primary/20"
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
                                { quantityPerUnit: e.target.value === '' ? undefined : Number(e.target.value) } as any
                              )
                            }
                            className="w-28 px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-primary/20"
                            placeholder="optional"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            value={r.note ?? ''}
                            onChange={(e) => updateInboundRow(i, { note: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-primary/20"
                          />
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
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Expected arrival (date/time)
              </label>
              <input
                type="datetime-local"
                value={expectedArrival}
                onChange={(e) => setExpectedArrival(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
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
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Pickup / Delivery
              </label>
              <select
                value={pickupDelivery}
                onChange={(e) => setPickupDelivery(e.target.value as PickupDelivery)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                <option value="Pickup">Pickup</option>
                <option value="Delivery">Delivery</option>
              </select>
            </div>
            {pickupDelivery === 'Delivery' && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Destination
                </label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Address"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
            )}
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
                  Select SKUs
                </label>
                <div className="flex flex-wrap gap-2">
                  {MOCK_INVENTORY.map((i) => (
                    <button
                      key={i.sku}
                      type="button"
                      onClick={() => toggleCheckSku(i.sku)}
                      className={`px-3 py-1.5 rounded-xl text-sm font-bold ${checkSkuList.includes(i.sku)
                          ? 'bg-primary text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                      {i.sku}
                    </button>
                  ))}
                </div>
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

      {/* Request list */}
      <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <h2 className="text-lg font-black text-slate-900 p-6 pb-0">Request list</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">
                  ID
                </th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">
                  Type
                </th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">
                  Preferred
                </th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-bold text-slate-900">{r.id}</td>
                  <td className="px-6 py-4 text-slate-700">{r.type}</td>
                  <td className="px-6 py-4 text-slate-700">
                    {r.preferredDate} {r.preferredTime ?? ''}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${r.status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : r.status === 'Processing'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                    >
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
