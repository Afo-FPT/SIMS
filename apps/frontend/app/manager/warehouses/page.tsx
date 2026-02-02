'use client';

import React, { useState, useEffect } from 'react';
import type { Shelf, ManagerWarehouse } from '../../../types/manager';
import {
  listWarehouses,
  createWarehouse,
  createShelvesForWarehouse,
  listShelvesByWarehouse,
  listZonesByWarehouse,
  createZone,
  type ManagerZoneOption,
} from '../../../lib/mockApi/manager.api';
import { useToastHelpers } from '../../../lib/toast';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { Input } from '../../../components/ui/Input';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../../../components/ui/Table';
import { LoadingSkeleton, TableSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';

export default function ManagerWarehousesPage() {
  const toast = useToastHelpers();
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [warehouses, setWarehouses] = useState<ManagerWarehouse[]>([]);
  const [zones, setZones] = useState<ManagerZoneOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingWarehouse, setCreatingWarehouse] = useState(false);
  const [warehouseName, setWarehouseName] = useState('');
  const [warehouseAddress, setWarehouseAddress] = useState('');
  const [warehouseLength, setWarehouseLength] = useState('');
  const [warehouseWidth, setWarehouseWidth] = useState('');
  const [warehouseDescription, setWarehouseDescription] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [zoneForm, setZoneForm] = useState({ zoneCode: '', name: '', description: '' });
  const [creatingZone, setCreatingZone] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [shelfForm, setShelfForm] = useState({
    shelfCode: '',
    tierCount: '',
    width: '',
    depth: '',
    maxCapacity: '',
  });
  const [creatingShelf, setCreatingShelf] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const w = await listWarehouses().catch(() => [] as ManagerWarehouse[]);
      setWarehouses(w);
      if (w.length > 0) {
        const defaultWarehouseId = w[0].id;
        setSelectedWarehouseId(defaultWarehouseId);
        const [shelvesForWarehouse, zonesForWarehouse] = await Promise.all([
          listShelvesByWarehouse(defaultWarehouseId),
          listZonesByWarehouse(defaultWarehouseId).catch(() => []),
        ]);
        setShelves(shelvesForWarehouse);
        setZones(zonesForWarehouse);
      } else {
        setShelves([]);
        setZones([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadZonesForWarehouse = async (warehouseId: string) => {
    try {
      const zonesForWarehouse = await listZonesByWarehouse(warehouseId);
      setZones(zonesForWarehouse);
    } catch {
      setZones([]);
    }
  };

  const handleWarehouseChange = async (warehouseId: string) => {
    setSelectedWarehouseId(warehouseId);
    setSelectedZoneId('');
    try {
      setLoading(true);
      const [shelvesForWarehouse, zonesForWarehouse] = await Promise.all([
        listShelvesByWarehouse(warehouseId),
        listZonesByWarehouse(warehouseId).catch(() => []),
      ]);
      setShelves(shelvesForWarehouse);
      setZones(zonesForWarehouse);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

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
      if (!selectedWarehouseId) {
        setSelectedWarehouseId(newWarehouse.id);
        loadZonesForWarehouse(newWarehouse.id);
      }
      setWarehouseName('');
      setWarehouseAddress('');
      setWarehouseLength('');
      setWarehouseWidth('');
      setWarehouseDescription('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create warehouse');
    } finally {
      setCreatingWarehouse(false);
    }
  };

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarehouseId) {
      toast.warning('Please select a warehouse first');
      return;
    }
    const { zoneCode, name, description } = zoneForm;
    if (!zoneCode?.trim() || !name?.trim()) {
      toast.warning('Zone code and name are required');
      return;
    }
    try {
      setCreatingZone(true);
      const newZone = await createZone(selectedWarehouseId, {
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
    if (!selectedWarehouseId) {
      toast.warning('Please select a warehouse first');
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

    const zoneDisplay = zones.find((z) => z.id === selectedZoneId)?.zoneCode ?? zones.find((z) => z.id === selectedZoneId)?.name ?? '';

    try {
      setCreatingShelf(true);
      const createdShelves = await createShelvesForWarehouse(
        selectedWarehouseId,
        selectedZoneId,
        [{
          shelfCode,
          tierCount: tierCountNum,
          width: widthNum,
          depth: depthNum,
          maxCapacity: maxCapacityNum,
        }],
        zoneDisplay
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Warehouses</h1>
        <p className="text-slate-500 mt-1">Warehouse creation and shelf management</p>
      </div>

      {/* Create warehouse form */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-black text-slate-900">Create warehouse</h2>
        <form onSubmit={handleCreateWarehouse} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          <div className="md:col-span-2 lg:col-span-3">
            <Input
              label="Description (optional)"
              value={warehouseDescription}
              onChange={(e) => setWarehouseDescription(e.target.value)}
              placeholder="Short description"
            />
          </div>
          <div className="md:col-span-2 lg:col-span-3 flex justify-end">
            <Button type="submit" isLoading={creatingWarehouse}>
              Create warehouse
            </Button>
          </div>
        </form>
      </div>

      {/* Existing warehouses & shelf creation */}
      {warehouses.length > 0 && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-black text-slate-900">Existing warehouses</h2>
            <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
              <span className="text-sm font-bold text-slate-700">Selected warehouse:</span>
              <Select
                value={selectedWarehouseId}
                onChange={(e) => handleWarehouseChange(e.target.value)}
                options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Address</th>
                    <th className="py-2 pr-4">Area (m²)</th>
                    <th className="py-2 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {warehouses.map((w) => (
                    <tr key={w.id} className="border-b border-slate-50">
                      <td className="py-2 pr-4 font-bold text-slate-900">{w.name}</td>
                      <td className="py-2 pr-4 text-slate-700">{w.address}</td>
                      <td className="py-2 pr-4 text-slate-700">{w.area}</td>
                      <td className="py-2 pr-4">
                        <Badge variant={w.status === 'ACTIVE' ? 'success' : 'warning'}>{w.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Zones: list + create */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-black text-slate-900">Zones in selected warehouse</h2>
            <p className="text-sm text-slate-600">Zones group shelves for location tracking. Contracts are assigned to zones.</p>
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
                    <tr><td colSpan={3} className="py-4 text-slate-500">No zones yet. Create one below.</td></tr>
                  ) : (
                    zones.map((z) => (
                      <tr key={z.id} className="border-b border-slate-50">
                        <td className="py-2 pr-4 font-bold text-slate-900">{z.zoneCode}</td>
                        <td className="py-2 pr-4 text-slate-700">{z.name}</td>
                        <td className="py-2 pr-4">
                          <Badge variant={z.status === 'ACTIVE' ? 'success' : 'warning'}>{z.status ?? '—'}</Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <form onSubmit={handleCreateZone} className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
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
          </div>

          {/* Create shelf form: requires zone */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-black text-slate-900">Create shelf in a zone</h2>
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
          </div>
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : error ? (
        <ErrorState title="Failed to load" message={error} onRetry={load} />
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
                    <Badge variant={s.status === 'Occupied' ? 'warning' : 'success'}>{s.status}</Badge>
                  </TableCell>
                  <TableCell className="text-slate-700">{s.contractCode || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
