'use client';

import React, { useState, useEffect } from 'react';
import type { Shelf, ManagerWarehouse } from '../../../types/manager';
import Link from 'next/link';
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
import { Modal } from '../../../components/ui/Modal';

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
  const [createWarehouseModalOpen, setCreateWarehouseModalOpen] = useState(false);

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
      setCreateWarehouseModalOpen(false);
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

      {/* Create warehouse entry point */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900">Create warehouse</h2>
          <p className="text-sm text-slate-600 mt-1">
            Define a new warehouse with size and address. You can then add zones and shelves.
          </p>
        </div>
        <div className="sm:flex-shrink-0 sm:self-start">
          <Button onClick={() => setCreateWarehouseModalOpen(true)}>
            <span className="material-symbols-outlined text-base mr-1">add</span>
            New warehouse
          </Button>
        </div>
      </div>

      {/* Create warehouse modal */}
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

          {/* Existing warehouses */}
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
                  {warehouses.map((w) => (
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

      {/* Shelf overview was moved into per-warehouse manage page (/manager/warehouses/[id]) */}
    </div>
  );
}
