'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { CustomerInventoryItem } from '../../../lib/customer-types';
import { listMyStoredItems } from '../../../lib/stored-items.api';
import { useToast } from '../../../lib/toast';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { getCustomerContracts } from '../../../lib/mockApi/customer.api';
import { getStockInHistory, getStockOutHistory } from '../../../lib/stock-history.api';

type InventoryRow = CustomerInventoryItem & {
  contractId: string;
  contractCode?: string;
  quantityPerUnit?: number;
};

export default function CustomerInventoryPage() {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [contracts, setContracts] = useState<Array<{ id: string; code: string; status: string }>>([]);
  const [contractFilter, setContractFilter] = useState<'ALL' | string>('ALL');
  const [locationFilter, setLocationFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [detail, setDetail] = useState<CustomerInventoryItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        // Load contracts once (for filter + showing contract code)
        const cs = await getCustomerContracts();
        const active = cs.filter((c) => c.status === 'active').map((c) => ({ id: c.id, code: c.code, status: c.status }));
        const contractCodeById = new Map(active.map((c) => [c.id, c.code]));

        // Load stored items (all contracts OR a specific contract)
        const allItems = contractFilter === 'ALL'
          ? await listMyStoredItems()
          : await listMyStoredItems(contractFilter);

        // Map to rows
        const mapped: InventoryRow[] = allItems.map((item) => ({
          id: item.stored_item_id,
          sku: item.item_name,
          name: item.item_name,
          quantity: item.quantity,
          unit: item.unit as any,
          shelf: item.shelf_code || item.shelf_id || '',
          lastUpdated: item.updated_at,
          history: [], // Can be loaded separately if needed
          contractId: item.contract_id,
          contractCode: contractCodeById.get(item.contract_id),
          quantityPerUnit: (item as any).quantity_per_unit,
        }));

        if (!cancelled) {
          setContracts(active);
          setInventory(mapped);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load inventory');
          showToast('error', 'Failed to load inventory', 5000);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => { cancelled = true; };
  }, [showToast, contractFilter]);

  const filtered = useMemo(() => {
    let list = [...inventory];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.sku.toLowerCase().includes(q) || (i.name && i.name.toLowerCase().includes(q))
      );
    }
    if (locationFilter) {
      const q = locationFilter.toLowerCase();
      list = list.filter((i) => (i.shelf || '').toLowerCase().includes(q));
    }
    if (lowStockOnly) {
      list = list.filter((i) => i.quantity < 100);
    }
    return list;
  }, [inventory, search, locationFilter, lowStockOnly]);

  const locations = useMemo(() => {
    const set = new Set(inventory.map((i) => i.shelf).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [inventory]);

  const showContractColumn = contractFilter === 'ALL';

  const openDetail = async (row: InventoryRow) => {
    setDetail({
      id: row.id,
      sku: row.sku,
      name: row.name,
      quantity: row.quantity,
      unit: row.unit,
      shelf: row.shelf,
      lastUpdated: row.lastUpdated,
      history: row.history,
    });
    try {
      setDetailLoading(true);
      // Lấy lịch sử inbound/outbound theo hợp đồng của mặt hàng này
      const [inbound, outbound] = await Promise.all([
        getStockInHistory({
          contractId: row.contractId,
          page: 1,
          limit: 100,
        }),
        getStockOutHistory({
          contractId: row.contractId,
          page: 1,
          limit: 100,
        }),
      ]);

      const toEvents = (type: 'Inbound' | 'Outbound', data: typeof inbound) => {
        const events: { date: string; action: string; qty: number; note?: string }[] = [];
        data.history.forEach((h) => {
          h.items.forEach((it) => {
            // Lọc theo SKU/tên (bỏ lọc theo kệ để tránh bỏ sót lịch sử)
            const sameItem =
              it.item_name === row.sku ||
              it.item_name === row.name;
            if (!sameItem) return;
            const qty = it.quantity_actual ?? it.quantity_requested;
            events.push({
              date: new Date(h.created_at).toLocaleString('vi-VN', {
                dateStyle: 'short',
                timeStyle: 'short',
              }),
              action: type === 'Inbound' ? 'Nhập kho' : 'Xuất kho',
              qty,
              note: it.shelf_code ? `Kệ: ${it.shelf_code}` : undefined,
            });
          });
        });
        return events;
      };

      const inboundEvents = toEvents('Inbound', inbound);
      const outboundEvents = toEvents('Outbound', outbound);
      const allEvents = [...inboundEvents, ...outboundEvents].sort((a, b) =>
        a.date.localeCompare(b.date),
      );

      setDetail((prev) =>
        prev && prev.id === row.id
          ? {
            ...prev,
            history: allEvents,
          }
          : prev,
      );
    } catch (e) {
      console.error(e);
      showToast('error', 'Không tải được lịch sử nhập/xuất cho mặt hàng này', 5000);
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton className="h-64 w-full" />;
  }

  if (error) {
    return <ErrorState title="Failed to load data" message={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Inventory</h1>
        <p className="text-slate-500 mt-1">View inventory by contract</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search SKU or item name"
            className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
        </div>
        <select
          value={contractFilter}
          onChange={(e) => setContractFilter(e.target.value as any)}
          className="px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          title="Select contract"
        >
          <option value="ALL">All contracts</option>
          {contracts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code}
            </option>
          ))}
        </select>
        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
        >
          <option value="">All locations</option>
          {locations.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
            className="rounded border-slate-300"
          />
          <span className="text-sm font-medium">Low stock only</span>
        </label>
      </div>

      {/* Table */}
      <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">SKU / Item</th>
                {showContractColumn && (
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Contract</th>
                )}
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Quantity</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Qty / unit</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Shelf</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">
                  Last updated
                </th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={showContractColumn ? 7 : 6} className="px-6 py-12 text-center text-slate-500">
                    {inventory.length === 0
                      ? 'No inventory yet. Items appear after staff completes putaway (DONE_BY_STAFF).'
                      : 'No items match the current filters.'}
                  </td>
                </tr>
              ) : (
                filtered.map((i) => (
                  <tr
                    key={i.id}
                    className="border-b border-slate-100 hover:bg-slate-50/50"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-slate-900">{i.sku}</p>
                        {i.name !== i.sku && (
                          <p className="text-xs text-slate-500 mt-0.5">{i.name}</p>
                        )}
                      </div>
                    </td>
                    {showContractColumn && (
                      <td className="px-6 py-4 text-slate-700">
                        <span className="font-medium">{i.contractCode || i.contractId}</span>
                      </td>
                    )}
                    <td className="px-6 py-4 text-slate-700">
                      <span className="font-medium">{i.quantity}</span>{' '}
                      <span className="text-slate-400">{i.unit}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {i.quantityPerUnit != null ? (
                        <>
                          <span className="font-medium">{i.quantityPerUnit}</span>{' '}
                          <span className="text-slate-400">{i.unit}/unit</span>
                        </>
                      ) : (
                        <span className="text-slate-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-700">{i.shelf || '—'}</td>
                    <td className="px-6 py-4 text-slate-500 text-sm">
                      {new Date(i.lastUpdated).toLocaleString('vi-VN', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => openDetail(i)}
                        className="text-sm font-bold text-primary hover:underline"
                      >
                        View details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Detail modal — enlarged, with clearer summary and history */}
      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setDetail(null)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur">
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  {detail.sku} — {detail.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Shelf {detail.shelf || '—'} • {detail.quantity} {detail.unit}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="size-9 flex items-center justify-center rounded-2xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Summary metrics */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Quantity
                  </p>
                  <p className="mt-1 text-lg font-black text-slate-900">
                    {detail.quantity}{' '}
                    <span className="text-xs font-semibold text-slate-500">{detail.unit}</span>
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Shelf
                  </p>
                  <p className="mt-1 text-lg font-black text-slate-900">
                    {detail.shelf || '—'}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    History entries
                  </p>
                  <p className="mt-1 text-lg font-black text-slate-900">
                    {(detail.history ?? []).length}
                  </p>
                </div>
              </section>

              {/* History timeline */}
              <section>
                <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-3">
                  Movement history
                </h4>
                <ul className="space-y-3">
                  {(detail.history ?? []).map((h, i) => (
                    <li key={i} className="flex gap-3">
                      <div className="mt-2 flex flex-col items-center gap-2">
                        <div className="size-2.5 rounded-full bg-primary shrink-0" />
                        {i < (detail.history?.length ?? 0) - 1 && (
                          <div className="w-px flex-1 bg-slate-200" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-900">{h.action}</p>
                        {h.note && (
                          <p className="text-xs text-slate-500 mt-0.5">{h.note}</p>
                        )}
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {h.date} • Qty: {h.qty}
                        </p>
                      </div>
                    </li>
                  ))}
                  {(!detail.history || detail.history.length === 0) && (
                    <li className="text-sm text-slate-500">No history yet.</li>
                  )}
                </ul>
              </section>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setDetail(null)}
                  className="px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-2xl hover:bg-slate-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
