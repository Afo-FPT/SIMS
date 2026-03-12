'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { listMyStoredProducts, type StoredProductOverview } from '../../../lib/stored-items.api';
import { useToast } from '../../../lib/toast';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { getCustomerContracts } from '../../../lib/mockApi/customer.api';

type ProductRow = StoredProductOverview & {
  contractCode?: string;
};

export default function CustomerInventoryPage() {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [contracts, setContracts] = useState<Array<{ id: string; code: string; status: string }>>([]);
  const [contractFilter, setContractFilter] = useState<'ALL' | string>('ALL');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [products, setProducts] = useState<ProductRow[]>([]);
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
        const active = cs.filter((c) => c.status === 'active').map((c) => ({ id: c.id, code: c.code, status: c.status }));

        // Load grouped products (all contracts OR a specific contract)
        const list = contractFilter === 'ALL'
          ? await listMyStoredProducts()
          : await listMyStoredProducts(contractFilter);

        const mapped: ProductRow[] = list.map((p) => ({
          ...p,
          contractCode: p.contract_code,
        }));

        if (!cancelled) {
          setContracts(active);
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

  const showContractColumn = contractFilter === 'ALL';

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
            placeholder="Search by SKU / item"
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
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Total Quantity</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">QTY / Unit</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Last Updated</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={showContractColumn ? 6 : 5} className="px-6 py-12 text-center text-slate-500">
                    {products.length === 0
                      ? 'No inventory yet. Items will appear after staff completes putaway (DONE_BY_STAFF).'
                      : 'No products match your filters.'}
                  </td>
                </tr>
              ) : (
                filtered.map((i) => (
                  <tr
                    key={`${i.contract_id}-${i.product_id}`}
                    className="border-b border-slate-100 hover:bg-slate-50/50"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-slate-900">{i.sku}</p>
                      </div>
                    </td>
                    {showContractColumn && (
                      <td className="px-6 py-4 text-slate-700">
                        <span className="font-medium">{i.contractCode || 'Unknown Contract'}</span>
                      </td>
                    )}
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
    </div>
  );
}
