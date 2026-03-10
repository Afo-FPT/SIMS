'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { ManagerWarehouse, Shelf } from '../../../../types/manager';
import {
  listWarehouses,
  listZonesByWarehouse,
  createZone,
  type ManagerZoneOption,
  createShelvesForWarehouse,
  listShelvesByWarehouse,
} from '../../../../lib/mockApi/manager.api';
import { useToastHelpers } from '../../../../lib/toast';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Select } from '../../../../components/ui/Select';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../../../../components/ui/Table';
import { LoadingSkeleton, TableSkeleton } from '../../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { EmptyState } from '../../../../components/ui/EmptyState';

export default function ManagerWarehouseDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const toast = useToastHelpers();

  const [warehouse, setWarehouse] = useState<ManagerWarehouse | null>(null);
  const [zones, setZones] = useState<ManagerZoneOption[]>([]);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [zoneForm, setZoneForm] = useState({ zoneCode: '', name: '', description: '' });
  const [shelfForm, setShelfForm] = useState({
    shelfCode: '',
    tierCount: '',
    width: '',
    depth: '',
    maxCapacity: '',
  });
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingZone, setCreatingZone] = useState(false);
  const [creatingShelf, setCreatingShelf] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const warehouses = await listWarehouses();
        if (cancelled) return;
        const current = warehouses.find((w) => w.id === id) ?? null;
        if (!current) {
          setError('Warehouse not found');
          return;
        }
        setWarehouse(current);

        const [zonesForWarehouse, shelvesForWarehouse] = await Promise.all([
          listZonesByWarehouse(id).catch(() => []),
          listShelvesByWarehouse(id).catch(() => [] as Shelf[]),
        ]);
        if (cancelled) return;
        setZones(zonesForWarehouse);
        setShelves(shelvesForWarehouse);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load warehouse');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouse) return;
    const { zoneCode, name, description } = zoneForm;
    if (!zoneCode?.trim() || !name?.trim()) {
      toast.warning('Zone code and name are required');
      return;
    }
    try {
      setCreatingZone(true);
      const newZone = await createZone(warehouse.id, {
        zoneCode: zoneCode.trim(),
        name: name.trim(),
        description: description?.trim() || undefined,
      });
      toast.success('Zone created successfully');
      setZones((prev) => [newZone, ...prev]);
      setZoneForm({ zoneCode: '', name: '', description: '' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create zone');
    } finally {
      setCreatingZone(false);
    }
  };

  const handleShelfFormChange = (field: keyof typeof shelfForm, value: string) => {
    setShelfForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateShelf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouse) {
      toast.warning('Warehouse not found');
      return;
    }
    if (!selectedZoneId) {
      toast.warning('Please select a zone for the shelf');
      return;
    }

    const { shelfCode, tierCount, width, depth, maxCapacity } = shelfForm;

    if (!shelfCode || !tierCount || !width || !depth || !maxCapacity) {
      toast.warning('Please fill in all shelf fields');
      return;
    }

    const tierCountNum = Number(tierCount);
    const widthNum = Number(width);
    const depthNum = Number(depth);
    const maxCapacityNum = Number(maxCapacity);

    if (
      isNaN(tierCountNum) || tierCountNum <= 0 ||
      isNaN(widthNum) || widthNum <= 0 ||
      isNaN(depthNum) || depthNum <= 0 ||
      isNaN(maxCapacityNum) || maxCapacityNum <= 0
    ) {
      toast.warning('Tier count, width, depth and max capacity must be valid positive numbers');
      return;
    }

    const zoneDisplay =
      zones.find((z) => z.id === selectedZoneId)?.zoneCode ??
      zones.find((z) => z.id === selectedZoneId)?.name ??
      '';

    try {
      setCreatingShelf(true);
      const createdShelves = await createShelvesForWarehouse(
        warehouse.id,
        selectedZoneId,
        [
          {
            shelfCode,
            tierCount: tierCountNum,
            width: widthNum,
            depth: depthNum,
            maxCapacity: maxCapacityNum,
          },
        ],
        zoneDisplay,
      );
      toast.success('Shelf created successfully');
      setShelves((prev) => [...createdShelves, ...prev]);
      setShelfForm({
        shelfCode: '',
        tierCount: '',
        width: '',
        depth: '',
        maxCapacity: '',
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create shelf');
    } finally {
      setCreatingShelf(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton className="h-64 w-full" />;
  }

  if (error || !warehouse) {
    return (
      <ErrorState
        title="Failed to load warehouse"
        message={error || 'Warehouse not found'}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => history.back()}
            className="text-slate-500 hover:text-primary font-bold flex items-center gap-1 mb-2"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Back to warehouses
          </button>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{warehouse.name}</h1>
          <p className="text-slate-500 mt-1">
            Detailed management for this warehouse: zones and shelves.
          </p>
        </div>
        <Badge variant={warehouse.status === 'ACTIVE' ? 'success' : 'warning'}>{warehouse.status}</Badge>
      </div>

      {/* Warehouse info */}
      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-black text-slate-900 mb-4">Warehouse information</h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-slate-500">Address</dt>
            <dd className="font-bold text-slate-900">{warehouse.address}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Length × Width</dt>
            <dd className="font-bold text-slate-900">
              {warehouse.length}m × {warehouse.width}m
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Area</dt>
            <dd className="font-bold text-slate-900">{warehouse.area} m²</dd>
          </div>
          {warehouse.description && (
            <div className="md:col-span-2 lg:col-span-3">
              <dt className="text-slate-500">Description</dt>
              <dd className="text-slate-700">{warehouse.description}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* Zones */}
      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-black text-slate-900">Zones</h2>
        <p className="text-sm text-slate-600">
          Zones group shelves for location tracking. Contracts are assigned to zones.
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="py-2 pr-4">Zone code</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {zones.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-4 text-slate-500">
                    No zones yet. Create one below.
                  </td>
                </tr>
              ) : (
                zones.map((z) => (
                  <tr key={z.id} className="border-b border-slate-50">
                    <td className="py-2 pr-4 font-bold text-slate-900">{z.zoneCode}</td>
                    <td className="py-2 pr-4 text-slate-700">{z.name}</td>
                    <td className="py-2 pr-4">
                      <Badge variant={z.status === 'ACTIVE' ? 'success' : 'warning'}>
                        {z.status ?? '—'}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <form
          onSubmit={handleCreateZone}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100"
        >
          <Input
            label="Zone code"
            value={zoneForm.zoneCode}
            onChange={(e) => setZoneForm((p) => ({ ...p, zoneCode: e.target.value }))}
            placeholder="A"
            required
          />
          <Input
            label="Zone name"
            value={zoneForm.name}
            onChange={(e) => setZoneForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="Zone A"
            required
          />
          <Input
            label="Description (optional)"
            value={zoneForm.description}
            onChange={(e) => setZoneForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="Short description"
          />
          <div className="md:col-span-3 flex justify-end">
            <Button type="submit" isLoading={creatingZone}>
              Create zone
            </Button>
          </div>
        </form>
      </section>

      {/* Shelves */}
      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-black text-slate-900">Shelves</h2>
        <p className="text-sm text-slate-600">
          Create shelves inside zones and see their current status.
        </p>

        <form onSubmit={handleCreateShelf} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Select
            label="Zone"
            value={selectedZoneId}
            onChange={(e) => setSelectedZoneId(e.target.value)}
            options={[
              { value: '', label: 'Select zone' },
              ...zones.map((z) => ({ value: z.id, label: `${z.zoneCode} — ${z.name}` })),
            ]}
          />
          <Input
            label="Shelf code"
            value={shelfForm.shelfCode}
            onChange={(e) => handleShelfFormChange('shelfCode', e.target.value)}
            placeholder="A-01-01"
            required
          />
          <Input
            label="Tier count"
            value={shelfForm.tierCount}
            onChange={(e) => handleShelfFormChange('tierCount', e.target.value)}
            placeholder="Number of tiers"
            required
          />
          <Input
            label="Width (m)"
            value={shelfForm.width}
            onChange={(e) => handleShelfFormChange('width', e.target.value)}
            placeholder="Width"
            required
          />
          <Input
            label="Depth (m)"
            value={shelfForm.depth}
            onChange={(e) => handleShelfFormChange('depth', e.target.value)}
            placeholder="Depth"
            required
          />
          <Input
            label="Max capacity"
            value={shelfForm.maxCapacity}
            onChange={(e) => handleShelfFormChange('maxCapacity', e.target.value)}
            placeholder="Max capacity"
            required
          />
          <div className="md:col-span-2 lg:col-span-3 flex justify-end">
            <Button type="submit" isLoading={creatingShelf} disabled={!selectedZoneId}>
              Create shelf
            </Button>
          </div>
        </form>

        <div className="mt-6">
          {loading ? (
            <TableSkeleton rows={5} cols={4} />
          ) : shelves.length === 0 ? (
            <EmptyState icon="warehouse" title="No shelves" message="No shelf data" />
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <Table>
                <TableHead>
                  <TableHeader>Shelf code</TableHeader>
                  <TableHeader>Zone</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Contract</TableHeader>
                </TableHead>
                <TableBody>
                  {shelves.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-bold text-slate-900">{s.code}</TableCell>
                      <TableCell className="text-slate-700">{s.zone || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={s.status === 'Occupied' ? 'warning' : 'success'}>
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-700">{s.contractCode || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

