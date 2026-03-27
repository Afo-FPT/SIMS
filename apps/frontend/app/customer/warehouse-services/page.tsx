'use client';

import React, { useEffect, useState } from 'react';
import { listContractPackages } from '../../../lib/contract-packages.api';
import { getCustomerContracts } from '../../../lib/customer.api';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Badge } from '../../../components/ui/Badge';

export default function CustomerWarehouseServicesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [packages, setPackages] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setLoading(true);
        setError(null);
        const [packRows, contractRows] = await Promise.all([listContractPackages(), getCustomerContracts()]);
        if (cancelled) return;
        setPackages(packRows);
        setContracts(contractRows);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load warehouse services');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Warehouse & Services</h1>
        <LoadingSkeleton className="h-64 rounded-3xl" />
      </div>
    );
  }

  if (error) return <ErrorState title="Failed to load warehouse services" message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Warehouse & Services</h1>
        <p className="text-slate-500 mt-1">View available service packages, pricing, and your active contract allocations</p>
      </div>

      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-black text-slate-900 mb-4">Available Service Packages</h2>
        {packages.length === 0 ? (
          <EmptyState icon="inventory_2" title="No package available" message="Contract packages will appear here once configured by manager." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {packages.map((p) => (
              <div key={p._id} className="rounded-2xl border border-slate-200 p-4">
                <p className="font-black text-slate-900">{p.name}</p>
                <p className="text-sm text-slate-500 mt-1">{p.description || 'Warehouse service package'}</p>
                <div className="mt-3 flex items-center justify-between">
                  <Badge variant="info">{p.duration} {p.unit}</Badge>
                  <p className="font-black text-primary">${Number(p.price).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-black text-slate-900 mb-4">My Active Contracts</h2>
        {contracts.length === 0 ? (
          <EmptyState icon="description" title="No active contract" message="Your signed contracts will appear here." />
        ) : (
          <div className="space-y-3">
            {contracts.map((c) => (
              <div key={c.id} className="rounded-2xl border border-slate-200 p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-slate-900">{c.code}</p>
                  <p className="text-sm text-slate-500">{c.warehouseName || 'Warehouse'} · {c.rentedZones?.length || 0} zones</p>
                </div>
                <Badge variant={c.status === 'active' ? 'success' : 'warning'}>{c.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
