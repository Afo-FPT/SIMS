'use client';

import React, { useState, useEffect } from 'react';
import type { ManagerWarehouse } from '../../../types/manager';
import Link from 'next/link';
import { listWarehouses, createWarehouse } from '../../../lib/manager.api';
import { getWarehouseCreationTerms } from '../../../lib/system-settings.api';
import { useToastHelpers } from '../../../lib/toast';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Modal } from '../../../components/ui/Modal';
import { Pagination } from '../../../components/ui/Pagination';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../../../components/ui/Table';
import { PageHeader } from '../../../components/ui/PageHeader';

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
  const [warehouseCreationTerms, setWarehouseCreationTerms] = useState('');
  const [acceptedWarehouseTerms, setAcceptedWarehouseTerms] = useState(false);
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
      const terms = await getWarehouseCreationTerms().catch(() => ({ warehouse_creation_terms: '' }));
      setWarehouses(w);
      setWarehouseCreationTerms(String(terms.warehouse_creation_terms || ''));
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
    if (!acceptedWarehouseTerms) {
      toast.warning('Please accept the warehouse creation terms');
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
      toast.success('Warehouse created (inactive). Open Manage to activate when it is ready for customers.');
      setWarehouses((prev) => [newWarehouse, ...prev]);
      setWarehouseName('');
      setWarehouseAddress('');
      setWarehouseLength('');
      setWarehouseWidth('');
      setWarehouseDescription('');
      setAcceptedWarehouseTerms(false);
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
    <div className="space-y-6">
      <PageHeader
        title="Warehouses"
        description="Manage your warehouse locations and configurations. Open Manage to configure zones and shelves."
        actions={
          <Button
            onClick={() => {
              setAcceptedWarehouseTerms(false);
              setCreateWarehouseModalOpen(true);
            }}
            leftIcon={<span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>}
          >
            New Warehouse
          </Button>
        }
      />

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
          <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-bold text-slate-700 mb-2">Warehouse creation terms</p>
            <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 whitespace-pre-wrap">
              {warehouseCreationTerms || 'No terms configured by admin.'}
            </div>
            <label className="mt-3 inline-flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={acceptedWarehouseTerms}
                onChange={(e) => setAcceptedWarehouseTerms(e.target.checked)}
                className="mt-0.5"
              />
              I have read and agree to the warehouse creation terms.
            </label>
          </div>
          <div className="md:col-span-2 flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setAcceptedWarehouseTerms(false);
                setCreateWarehouseModalOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={creatingWarehouse} disabled={!acceptedWarehouseTerms}>
              Create warehouse
            </Button>
          </div>
        </form>
      </Modal>

      {warehouses.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-card">
          <Table>
            <TableHead>
              <TableHeader>Name</TableHeader>
              <TableHeader>Address</TableHeader>
              <TableHeader>Area (m²)</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader className="text-right">Action</TableHeader>
            </TableHead>
            <TableBody>
              {pagedWarehouses.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-semibold text-slate-900">{w.name}</TableCell>
                  <TableCell className="text-slate-600">{w.address}</TableCell>
                  <TableCell className="text-slate-600">{w.area}</TableCell>
                  <TableCell>
                    <Badge variant={w.status === 'ACTIVE' ? 'success' : 'warning'}>{w.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/manager/warehouses/${w.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-primary hover:bg-primary-light transition-colors"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 15 }}>manage_accounts</span>
                      Manage
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
