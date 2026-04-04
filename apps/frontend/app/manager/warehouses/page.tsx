'use client';

import React, { useState, useEffect } from 'react';
import type { ManagerWarehouse } from '../../../types/manager';
import Link from 'next/link';
import { listWarehouses, createWarehouse } from '../../../lib/manager.api';
import { useToastHelpers } from '../../../lib/toast';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Modal } from '../../../components/ui/Modal';
import { Pagination } from '../../../components/ui/Pagination';

export default function ManagerWarehousesPage() {
  const toast = useToastHelpers();
  const PAGE_SIZE = 10;
  const [warehouses, setWarehouses] = useState<ManagerWarehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingWarehouse, setCreatingWarehouse] = useState(false);
  const [warehouseName, setWarehouseName] = useState('');
  const [warehouseAddress, setWarehouseAddress] = useState('');
  const [warehouseLength, setWarehouseLength] = useState('');
  const [warehouseWidth, setWarehouseWidth] = useState('');
  const [warehouseDescription, setWarehouseDescription] = useState('');
  const [createWarehouseModalOpen, setCreateWarehouseModalOpen] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const w = await listWarehouses().catch(() => [] as ManagerWarehouse[]);
      setWarehouses(w);
      setPage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(warehouses.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedWarehouses = warehouses.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouseName || !warehouseAddress || !warehouseLength || !warehouseWidth) {
      toast.warning('Please fill in all required warehouse fields');
      return;
    }

    const length = Number(warehouseLength);
    const width = Number(warehouseWidth);

    if (isNaN(length) || isNaN(width) || length <= 0 || width <= 0) {
      toast.warning('Length and width must be valid positive numbers');
      return;
    }

    try {
      setCreatingWarehouse(true);
      const newWarehouse = await createWarehouse({
        name: warehouseName,
        address: warehouseAddress,
        length,
        width,
        description: warehouseDescription || undefined,
      });
      toast.success('Warehouse created successfully');
      setWarehouses((prev) => [newWarehouse, ...prev]);
      setWarehouseName('');
      setWarehouseAddress('');
      setWarehouseLength('');
      setWarehouseWidth('');
      setWarehouseDescription('');
      setCreateWarehouseModalOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create warehouse');
    } finally {
      setCreatingWarehouse(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton className="h-64 w-full" />;
  }

  if (error) {
    return <ErrorState title="Failed to load" message={error} onRetry={load} />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Warehouses</h1>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900">Create warehouse</h2>
          <p className="text-sm text-slate-600 mt-1">
            Define a new warehouse with size and address. Then open <strong>Manage</strong> to add zones and shelves.
          </p>
        </div>
        <div className="sm:flex-shrink-0 sm:self-start">
          <Button
            onClick={() => setCreateWarehouseModalOpen(true)}
            className="inline-flex items-center gap-2 leading-none shadow-sm"
          >
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-white/20 text-xs font-black leading-none">
              +
            </span>
            <span className="leading-none">New warehouse</span>
          </Button>
        </div>
      </div>

      <Modal
        open={createWarehouseModalOpen}
        onOpenChange={setCreateWarehouseModalOpen}
        title="New warehouse"
        size="lg"
      >
        <form onSubmit={handleCreateWarehouse} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Name"
            value={warehouseName}
            onChange={(e) => setWarehouseName(e.target.value)}
            placeholder="Warehouse name"
            required
          />
          <Input
            label="Address"
            value={warehouseAddress}
            onChange={(e) => setWarehouseAddress(e.target.value)}
            placeholder="Warehouse address"
            required
          />
          <Input
            label="Length (m)"
            value={warehouseLength}
            onChange={(e) => setWarehouseLength(e.target.value)}
            placeholder="Length"
            required
          />
          <Input
            label="Width (m)"
            value={warehouseWidth}
            onChange={(e) => setWarehouseWidth(e.target.value)}
            placeholder="Width"
            required
          />
          <div className="md:col-span-2">
            <Input
              label="Description (optional)"
              value={warehouseDescription}
              onChange={(e) => setWarehouseDescription(e.target.value)}
              placeholder="Short description"
            />
          </div>
          <div className="md:col-span-2 flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCreateWarehouseModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={creatingWarehouse}>
              Create warehouse
            </Button>
          </div>
        </form>
      </Modal>

      {warehouses.length > 0 && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-black text-slate-900">Existing warehouses</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Address</th>
                    <th className="py-2 pr-4">Area (m²)</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedWarehouses.map((w) => (
                    <tr key={w.id} className="border-b border-slate-50">
                      <td className="py-2 pr-4 font-bold text-slate-900">{w.name}</td>
                      <td className="py-2 pr-4 text-slate-700">{w.address}</td>
                      <td className="py-2 pr-4 text-slate-700">{w.area}</td>
                      <td className="py-2 pr-4">
                        <Badge variant={w.status === 'ACTIVE' ? 'success' : 'warning'}>{w.status}</Badge>
                      </td>
                      <td className="py-2 pr-4 text-right">
                        <Link
                          href={`/manager/warehouses/${w.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-primary hover:bg-primary/5"
                        >
                          <span className="material-symbols-outlined text-sm">manage_accounts</span>
                          Manage
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {warehouses.length > 0 && (
        <div className="flex items-center justify-center flex-wrap gap-3 pb-4">
          <p className="text-sm text-slate-500 whitespace-nowrap">
            Showing{' '}
            <span className="font-bold text-slate-700">
              {Math.min((safePage - 1) * PAGE_SIZE + 1, warehouses.length)}
            </span>
            {' '}to{' '}
            <span className="font-bold text-slate-700">
              {Math.min(safePage * PAGE_SIZE, warehouses.length)}
            </span>
            {' '}of{' '}
            <span className="font-bold text-slate-700">{warehouses.length}</span>
          </p>
          <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
