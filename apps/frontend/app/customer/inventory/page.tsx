'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { CustomerInventoryItem } from '../../../lib/customer-types';
import { listMyStoredItems } from '../../../lib/stored-items.api';
import { useToast } from '../../../lib/toast';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { getCustomerContracts } from '../../../lib/mockApi/customer.api';

type InventoryRow = CustomerInventoryItem & {
  contractId: string;
  contractCode?: string;
};

export default function CustomerInventoryPage() {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [contracts, setContracts] = useState<Array<{ id: string; code: string; status: string }>>([]);
  const [contractFilter, setContractFilter] = useState<'ALL' | string>('ALL');
  const [locationFilter, setLocationFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [detail, setDetail] = useState<CustomerInventoryItem | null>(null);
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
        }));

        if (!cancelled) {
          setContracts(active);
          setInventory(mapped);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load inventory');
          showToast('error', 'Không tải được danh sách hàng tồn kho', 5000);
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

  if (loading) {
    return <LoadingSkeleton className="h-64 w-full" />;
  }

  if (error) {
    return <ErrorState title="Lỗi tải dữ liệu" message={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Tồn kho</h1>
        <p className="text-slate-500 mt-1">Xem hàng tồn kho theo hợp đồng</p>
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
            placeholder="Tìm kiếm SKU hoặc tên hàng"
            className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
        </div>
        <select
          value={contractFilter}
          onChange={(e) => setContractFilter(e.target.value as any)}
          className="px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          title="Chọn hợp đồng"
        >
          <option value="ALL">Tất cả hợp đồng</option>
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
          <option value="">Tất cả vị trí</option>
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
          <span className="text-sm font-medium">Chỉ hiển thị hàng sắp hết</span>
        </label>
      </div>

      {/* Table */}
      <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">SKU/Tên hàng</th>
                {showContractColumn && (
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Hợp đồng</th>
                )}
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Số lượng</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Kệ</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">
                  Cập nhật lần cuối
                </th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={showContractColumn ? 6 : 5} className="px-6 py-12 text-center text-slate-500">
                    {inventory.length === 0
                      ? 'Chưa có hàng tồn kho. Hàng sẽ hiển thị sau khi staff hoàn tất putaway (DONE_BY_STAFF).'
                      : 'Không tìm thấy hàng phù hợp với bộ lọc.'}
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
                    <td className="px-6 py-4 text-slate-700">{i.shelf || '—'}</td>
                    <td className="px-6 py-4 text-slate-500 text-sm">
                      {new Date(i.lastUpdated).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => setDetail(i)}
                        className="text-sm font-bold text-primary hover:underline"
                      >
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Detail modal — history timeline */}
      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setDetail(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-black text-slate-900 mb-2">
              {detail.sku} — {detail.name}
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              {detail.quantity} {detail.unit} • {detail.shelf}
            </p>
            <h4 className="text-sm font-bold text-slate-700 uppercase mb-3">
              Lịch sử
            </h4>
            <ul className="space-y-3">
              {(detail.history ?? []).map((h, i) => (
                <li key={i} className="flex gap-3">
                  <div className="size-2 rounded-full bg-primary mt-2 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-slate-900">{h.action}</p>
                    {h.note && (
                      <p className="text-xs text-slate-500">{h.note}</p>
                    )}
                    <p className="text-[10px] text-slate-400">
                      {h.date} • SL: {h.qty}
                    </p>
                  </div>
                </li>
              ))}
              {(!detail.history || detail.history.length === 0) && (
                <li className="text-sm text-slate-500">Chưa có lịch sử.</li>
              )}
            </ul>
            <button
              type="button"
              onClick={() => setDetail(null)}
              className="mt-6 w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-200"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
