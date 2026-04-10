'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { listMyStoredProducts, type StoredProductOverview } from '../../../lib/stored-items.api';
import { useToast } from '../../../lib/toast';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { getCustomerContracts } from '../../../lib/customer.api';
import { Pagination } from '../../../components/ui/Pagination';

type ProductRow = StoredProductOverview & {
  warehouseName?: string;
  zoneCodes?: string[];
  contract_status?: string;
};

export default function CustomerInventoryPage() {
  const { showToast } = useToast();
  const PAGE_SIZE = 10;
  const [search, setSearch] = useState('');
  const [contracts, setContracts] = useState<Array<{ id: string; code: string; status: string }>>([]);
  const [contractFilter, setContractFilter] = useState<'ALL' | string>('ALL');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        // Load contracts once (for filter dropdown)
        const cs = await getCustomerContracts();
        const contractOptions = cs.map((c) => ({ id: c.id, code: c.code, status: c.status }));

        // Load grouped products (all contracts OR a specific contract)
        const list = contractFilter === 'ALL'
          ? await listMyStoredProducts()
          : await listMyStoredProducts(contractFilter);

        const mapped: ProductRow[] = list.map((p) => ({
          ...p,
          warehouseName: p.warehouse_name,
          zoneCodes: p.zone_codes ?? [],
          contract_status: p.contract_status,
        }));

        if (!cancelled) {
          setContracts(contractOptions);
          setProducts(mapped);
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
    let list = [...products];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.sku.toLowerCase().includes(q)
      );
    }
    if (lowStockOnly) {
      list = list.filter((i) => i.total_quantity < 100);
    }
    return list;
  }, [products, search, lowStockOnly]);

  useEffect(() => {
    setPage(1);
  }, [search, contractFilter, lowStockOnly]);

  const bannerContract = useMemo(
    () => (contractFilter === 'ALL' ? null : contracts.find((c) => c.id === contractFilter)),
    [contractFilter, contracts]
  );

  const inventoryRiskFlags = useMemo(() => {
    const exp = products.some((p) => p.contract_status === 'expired');
    const term = products.some((p) => p.contract_status === 'terminated');
    return { exp, term };
  }, [products]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = useMemo(() => {
    const p = Math.min(Math.max(1, page), totalPages);
    const start = (p - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page, totalPages]);

  if (loading) {
    return <LoadingSkeleton className="h-64 w-full" />;
  }

  if (error) {
    return <ErrorState title="Failed to load" message={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Inventory</h1>
        <p className="text-slate-500 mt-1">Product overview across your contracts</p>
      </div>

      {contractFilter === 'ALL' && inventoryRiskFlags.exp && (
        <div
          className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          <p className="font-bold">Some inventory is under an expired contract</p>
          <p className="mt-1 text-amber-900">
            Inbound is closed for those contracts. Use <strong>Service Requests → Outbound</strong> to remove stock, or renew the contract.
          </p>
        </div>
      )}

      {contractFilter === 'ALL' && inventoryRiskFlags.term && (
        <div
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950"
          role="status"
        >
          <p className="font-bold">Some inventory is under a terminated contract</p>
          <p className="mt-1 text-red-900">
            New warehouse operations are not allowed. Contact support or your warehouse manager if you need to resolve remaining stock.
          </p>
        </div>
      )}

      {bannerContract?.status === 'expired' && (
        <div
          className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          <p className="font-bold">
            Contract {bannerContract.code} is expired
          </p>
          <p className="mt-1 text-amber-900">
            Inbound is disabled. You can still create <strong>outbound</strong> requests to clear inventory.
          </p>
        </div>
      )}

      {bannerContract?.status === 'terminated' && (
        <div
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950"
          role="status"
        >
          <p className="font-bold">
            Contract {bannerContract.code} is terminated
          </p>
          <p className="mt-1 text-red-900">
            This contract no longer allows new service requests. Inventory shown is read-only for your records.
          </p>
        </div>
      )}

      {/* Filters */}
      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-3 items-end">
          <div className="space-y-1 xl:col-span-2">
            <p className="text-xs font-bold text-slate-500">Search</p>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                search
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search SKU..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div className="space-y-1 xl:col-span-2">
            <p className="text-xs font-bold text-slate-500">Contract</p>
            <select
              value={contractFilter}
              onChange={(e) => setContractFilter(e.target.value as any)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              title="Select contract"
            >
              <option value="ALL">All contracts</option>
              {contracts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code}
                  {c.status !== 'active' ? ` (${c.status})` : ''}
                </option>
              ))}
            </select>
          </div>
          <label className="h-11 px-3 rounded-xl border border-slate-200 bg-white inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="rounded border-slate-300"
            />
            <span className="text-sm font-medium">Low stock only</span>
          </label>
        </div>
      </section>

      {/* Table */}
      <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">SKU / Item</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Warehouse</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Zone</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Total Quantity</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">QTY / Unit</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Last Updated</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    {products.length === 0
                      ? 'No inventory yet. Items will appear after staff completes putaway (DONE_BY_STAFF).'
                      : 'No products match your filters.'}
                  </td>
                </tr>
              ) : (
                paged.map((i) => (
                  <tr
                    key={`${i.contract_id}-${i.product_id}`}
                    className="border-b border-slate-100 hover:bg-slate-50/50"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-slate-900">{i.sku}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      <span className="font-medium">{i.warehouseName || 'Unknown warehouse'}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      <span className="font-medium">
                        {i.zoneCodes && i.zoneCodes.length > 0 ? i.zoneCodes.join(', ') : 'Unknown zone'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      <span className="font-medium">{i.total_quantity}</span>{' '}
                      <span className="text-slate-400">{i.unit}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {i.quantity_per_unit != null ? (
                        <span className="font-medium">{i.quantity_per_unit}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}{' '}
                      <span className="text-slate-400">{i.unit}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-sm">
                      {new Date(i.last_updated).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/customer/inventory/${encodeURIComponent(i.product_id)}?contractId=${encodeURIComponent(i.contract_id)}`}
                        className="text-sm font-bold text-primary hover:underline inline-flex items-center gap-1"
                      >
                        View Details
                        <span className="material-symbols-outlined text-base">arrow_forward</span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {filtered.length > 0 && (
        <div className="flex items-center justify-center flex-wrap gap-3 pb-4">
          <p className="text-sm text-slate-500 whitespace-nowrap">
            Showing{' '}
            <span className="font-bold text-slate-700">
              {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}
            </span>
            {' '}to{' '}
            <span className="font-bold text-slate-700">
              {Math.min(page * PAGE_SIZE, filtered.length)}
            </span>
            {' '}of{' '}
            <span className="font-bold text-slate-700">{filtered.length}</span>
          </p>
          <Pagination
            currentPage={Math.min(page, totalPages)}
            totalPages={totalPages}
            onPageChange={(p) => setPage(Math.min(Math.max(1, p), totalPages))}
          />
        </div>
      )}
    </div>
  );
}
