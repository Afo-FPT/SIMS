'use client';

import React, { useState, useMemo } from 'react';
import type { CustomerInventoryItem } from '../../../lib/customer-types';
import { MOCK_INVENTORY } from '../../../lib/customer-mock';

export default function CustomerInventoryPage() {
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [detail, setDetail] = useState<CustomerInventoryItem | null>(null);

  const filtered = useMemo(() => {
    let list = [...MOCK_INVENTORY];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.sku.toLowerCase().includes(q) || (i.name && i.name.toLowerCase().includes(q))
      );
    }
    if (locationFilter) {
      list = list.filter((i) => i.shelf.toLowerCase().includes(locationFilter.toLowerCase()));
    }
    if (lowStockOnly) {
      list = list.filter((i) => i.quantity < 100);
    }
    return list;
  }, [search, locationFilter, lowStockOnly]);

  const locations = useMemo(() => {
    const set = new Set(MOCK_INVENTORY.map((i) => i.shelf));
    return Array.from(set).sort();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Inventory</h1>
        <p className="text-slate-500 mt-1">View stock by counting rule (contract unit)</p>
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
            placeholder="Search SKU or name"
            className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
        </div>
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
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">SKU</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Name</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">
                  Qty (unit)
                </th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Shelf</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">
                  Last updated
                </th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr
                  key={i.id}
                  className="border-b border-slate-100 hover:bg-slate-50/50"
                >
                  <td className="px-6 py-4 font-bold text-slate-900">{i.sku}</td>
                  <td className="px-6 py-4 text-slate-700">{i.name}</td>
                  <td className="px-6 py-4 text-slate-700">
                    {i.quantity} <span className="text-slate-400">{i.unit}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-700">{i.shelf}</td>
                  <td className="px-6 py-4 text-slate-500 text-sm">
                    {new Date(i.lastUpdated).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      onClick={() => setDetail(i)}
                      className="text-sm font-bold text-primary hover:underline"
                    >
                      View detail
                    </button>
                  </td>
                </tr>
              ))}
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
              History timeline
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
                      {h.date} • qty {h.qty}
                    </p>
                  </div>
                </li>
              ))}
              {(!detail.history || detail.history.length === 0) && (
                <li className="text-sm text-slate-500">No history yet.</li>
              )}
            </ul>
            <button
              type="button"
              onClick={() => setDetail(null)}
              className="mt-6 w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-200"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
