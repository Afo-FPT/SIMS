'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { getMyStoredProductShelves, type StoredProductShelfRow } from '../../../../lib/stored-items.api';
import { getStockInHistory, getStockOutHistory, type StockHistoryItem } from '../../../../lib/stock-history.api';
import { LoadingSkeleton } from '../../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { Badge } from '../../../../components/ui/Badge';

type HistoryRow = {
  time: string;
  type: 'Import' | 'Export';
  quantity: number;
  unit: string;
  shelf?: string;
  source?: string;
  contractId: string;
};

export default function CustomerInventoryProductPage() {
  const params = useParams<{ productId: string }>();
  const searchParams = useSearchParams();
  const sku = useMemo(() => {
    const raw = params.productId || '';
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }, [params.productId]);
  const contractId = searchParams.get('contractId') || undefined;

  const [shelves, setShelves] = useState<StoredProductShelfRow[]>([]);
  const [loadingShelves, setLoadingShelves] = useState(true);
  const [errorShelves, setErrorShelves] = useState<string | null>(null);

  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [errorHistory, setErrorHistory] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoadingShelves(true);
        setErrorShelves(null);
        const rows = await getMyStoredProductShelves(sku, contractId);
        if (!cancelled) setShelves(rows);
      } catch (e) {
        if (!cancelled) setErrorShelves(e instanceof Error ? e.message : 'Failed to load shelf distribution');
      } finally {
        if (!cancelled) setLoadingShelves(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [sku, contractId]);

  const contractIdsForHistory = useMemo(() => {
    const set = new Set<string>();
    shelves.forEach((s) => set.add(s.contract_id));
    if (contractId) set.add(contractId);
    return Array.from(set);
  }, [shelves, contractId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoadingHistory(true);
        setErrorHistory(null);

        if (contractIdsForHistory.length === 0) {
          if (!cancelled) setHistory([]);
          return;
        }

        // Fetch a reasonable window; UI can be extended to paginate later.
        const limit = 50;
        const inboundResults = await Promise.all(
          contractIdsForHistory.map(async (cid) => ({
            contractId: cid,
            data: await getStockInHistory({ contractId: cid, limit }),
          }))
        );
        const outboundResults = await Promise.all(
          contractIdsForHistory.map(async (cid) => ({
            contractId: cid,
            data: await getStockOutHistory({ contractId: cid, limit }),
          }))
        );

        const rows: HistoryRow[] = [];

        function pushFromHistoryItem(h: StockHistoryItem, type: 'Import' | 'Export') {
          const time = h.created_at || h.updated_at;
          const source = h.approved_by || h.customer_name || undefined;
          for (const it of h.items) {
            if ((it.item_name || '').trim().toLowerCase() !== sku.trim().toLowerCase()) continue;
            const qty = it.quantity_actual ?? it.quantity_requested;
            rows.push({
              time,
              type,
              quantity: qty,
              unit: it.unit,
              shelf: it.shelf_code || it.shelf_id,
              source,
              contractId: h.contract_id,
            });
          }
        }

        for (const r of inboundResults) {
          for (const h of r.data.history) pushFromHistoryItem(h, 'Import');
        }
        for (const r of outboundResults) {
          for (const h of r.data.history) pushFromHistoryItem(h, 'Export');
        }

        rows.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        if (!cancelled) setHistory(rows);
      } catch (e) {
        if (!cancelled) setErrorHistory(e instanceof Error ? e.message : 'Failed to load inventory history');
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [contractIdsForHistory, sku]);

  const totalQty = useMemo(() => shelves.reduce((sum, s) => sum + (s.quantity || 0), 0), [shelves]);
  const unit = shelves[0]?.unit;
  const contractCodes = useMemo(() => {
    const set = new Set<string>();
    for (const s of shelves) {
      if (s.contract_code) set.add(s.contract_code);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [shelves]);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Link href="/customer/inventory" className="hover:underline">Inventory</Link>
            <span className="material-symbols-outlined text-base">chevron_right</span>
            <span className="text-slate-700 font-semibold">Details</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-2">{sku}</h1>
          <p className="text-slate-500 mt-1">
            Shelf distribution and import/export history{contractId ? ' for the selected contract' : ''}.
          </p>
          <p className="text-slate-600 mt-2 text-sm">
            <span className="font-bold">Contract</span>:{' '}
            {contractCodes.length > 0 ? contractCodes.join(', ') : 'Unknown Contract'}
          </p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm px-5 py-4 min-w-[220px]">
          <p className="text-xs font-black text-slate-500 uppercase">Total Quantity</p>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {totalQty}{unit ? <span className="text-slate-400 text-base font-bold ml-2">{unit}</span> : null}
          </p>
        </div>
      </div>

      {/* Shelf distribution */}
      <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-slate-200">
          <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest">Shelf Distribution</h2>
        </div>
        {loadingShelves ? (
          <div className="p-6">
            <LoadingSkeleton className="h-40 w-full" />
          </div>
        ) : errorShelves ? (
          <div className="p-6">
            <ErrorState title="Failed to load" message={errorShelves} onRetry={() => window.location.reload()} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Shelf</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Zone</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Quantity</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">QTY / Unit</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {shelves.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      No shelf records found for this product.
                    </td>
                  </tr>
                ) : (
                  shelves.map((s, idx) => (
                    <tr key={`${s.contract_id}-${s.shelf}-${idx}`} className="border-b border-slate-100">
                      <td className="px-6 py-4 text-slate-700 font-medium">{s.shelf || '—'}</td>
                      <td className="px-6 py-4 text-slate-700">{s.zone_code || '—'}</td>
                      <td className="px-6 py-4 text-slate-700">
                        <span className="font-medium">{s.quantity}</span>{' '}
                        <span className="text-slate-400">{s.unit}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {s.quantity_per_unit != null ? (
                          <span className="font-medium">{s.quantity_per_unit}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}{' '}
                        <span className="text-slate-400">{s.unit}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm">
                        {new Date(s.last_updated).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Inventory history */}
      <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-slate-200">
          <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest">Inventory History</h2>
        </div>
        {loadingHistory ? (
          <div className="p-6">
            <LoadingSkeleton className="h-40 w-full" />
          </div>
        ) : errorHistory ? (
          <div className="p-6">
            <ErrorState title="Failed to load" message={errorHistory} onRetry={() => window.location.reload()} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Time</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Type</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Quantity</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Shelf</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">User / Source</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      No history found for this product.
                    </td>
                  </tr>
                ) : (
                  history.map((h, idx) => (
                    <tr key={`${h.contractId}-${h.time}-${idx}`} className="border-b border-slate-100">
                      <td className="px-6 py-4 text-slate-500 text-sm">
                        {new Date(h.time).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={h.type === 'Import' ? 'success' : 'error'} size="sm">
                          {h.type}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        <span className="font-medium">{h.quantity}</span>{' '}
                        <span className="text-slate-400">{h.unit}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-700">{h.shelf || '—'}</td>
                      <td className="px-6 py-4 text-slate-500 text-sm">{h.source || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

