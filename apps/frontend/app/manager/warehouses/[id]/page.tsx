'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { ManagerWarehouse, Shelf } from '../../../../types/manager';
import {
  listWarehouses,
  listZonesByWarehouse,
  createZone,
  updateZoneByWarehouse,
  type ManagerZoneOption,
  createShelvesForWarehouse,
  listShelvesByWarehouse,
  updateWarehouse,
  updateShelfStatus,
} from '../../../../lib/mockApi/manager.api';
import { getShelfUtilization, type ShelfUtilization } from '../../../../lib/shelves.api';
import { useToastHelpers } from '../../../../lib/toast';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Select } from '../../../../components/ui/Select';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../../../../components/ui/Table';
import { LoadingSkeleton, TableSkeleton } from '../../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { EmptyState } from '../../../../components/ui/EmptyState';

function formatM3(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return `${n.toFixed(3)} m³`;
}

function utilizationHint(pct: number): { label: string; className: string } | null {
  if (pct >= 95) return { label: 'Gần đầy', className: 'bg-red-100 text-red-800' };
  if (pct >= 85) return { label: 'Sắp đầy', className: 'bg-amber-100 text-amber-900' };
  return null;
}

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
    tierCountStr: '',
    /** One row per tier: height × width × depth (m) */
    tierRows: [] as Array<{ height: string; width: string; depth: string }>,
  });
  const [utilByShelfId, setUtilByShelfId] = useState<Record<string, ShelfUtilization>>({});
  const [utilLoading, setUtilLoading] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingZone, setCreatingZone] = useState(false);
  const [zoneEditMode, setZoneEditMode] = useState(false);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [savingZoneId, setSavingZoneId] = useState<string | null>(null);
  const [zoneEditForm, setZoneEditForm] = useState({
    zoneCode: '',
    name: '',
    description: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });
  const [creatingShelf, setCreatingShelf] = useState(false);
  const [shelfEditMode, setShelfEditMode] = useState(false);
  const [updatingShelfId, setUpdatingShelfId] = useState<string | null>(null);
  const [editingShelfId, setEditingShelfId] = useState<string | null>(null);
  const [shelfStatusDraft, setShelfStatusDraft] = useState<Record<string, 'AVAILABLE' | 'RENTED' | 'MAINTENANCE'>>({});
  const [editingInfo, setEditingInfo] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoForm, setInfoForm] = useState({
    name: '',
    address: '',
    length: '',
    width: '',
    description: '',
  });

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

  useEffect(() => {
    let cancelled = false;
    const loadUtil = async () => {
      if (shelves.length === 0) {
        setUtilByShelfId({});
        setUtilLoading(false);
        return;
      }
      setUtilLoading(true);
      const entries = await Promise.all(
        shelves.map(async (s) => {
          try {
            const u = await getShelfUtilization(s.id);
            return [s.id, u] as const;
          } catch {
            return [s.id, null] as const;
          }
        })
      );
      if (cancelled) return;
      const map: Record<string, ShelfUtilization> = {};
      for (const [id, u] of entries) {
        if (u) map[id] = u;
      }
      setUtilByShelfId(map);
      setUtilLoading(false);
    };
    loadUtil();
    return () => {
      cancelled = true;
    };
  }, [shelves]);

  useEffect(() => {
    const next: Record<string, 'AVAILABLE' | 'RENTED' | 'MAINTENANCE'> = {};
    shelves.forEach((s) => {
      next[s.id] = s.status === 'Occupied' ? 'RENTED' : 'AVAILABLE';
    });
    setShelfStatusDraft(next);
  }, [shelves]);

  const previewMaxM3 = useMemo(() => {
    const n = shelfForm.tierRows.length;
    if (n === 0) return 0;
    let sum = 0;
    for (const row of shelfForm.tierRows) {
      const h = Number(row.height);
      const w = Number(row.width);
      const d = Number(row.depth);
      if (!isNaN(h) && !isNaN(w) && !isNaN(d) && h > 0 && w > 0 && d > 0) {
        sum += h * w * d;
      }
    }
    return Math.round(sum * 1_000_000) / 1_000_000;
  }, [shelfForm.tierRows]);

  useEffect(() => {
    if (warehouse && !editingInfo) {
      setInfoForm({
        name: warehouse.name,
        address: warehouse.address,
        length: String(warehouse.length),
        width: String(warehouse.width),
        description: warehouse.description ?? '',
      });
    }
  }, [warehouse, editingInfo]);

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

  const setTierCountFromInput = (raw: string) => {
    const n = parseInt(raw, 10);
    setShelfForm((prev) => {
      if (raw === '' || isNaN(n) || n < 1) {
        return { ...prev, tierCountStr: raw, tierRows: [] };
      }
      const next = [...prev.tierRows];
      while (next.length < n) next.push({ height: '', width: '', depth: '' });
      while (next.length > n) next.pop();
      return { ...prev, tierCountStr: raw, tierRows: next };
    });
  };

  const updateTierRow = (idx: number, patch: Partial<{ height: string; width: string; depth: string }>) => {
    setShelfForm((prev) => ({
      ...prev,
      tierRows: prev.tierRows.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    }));
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

    const { shelfCode, tierCountStr, tierRows } = shelfForm;
    const tierCountNum = parseInt(tierCountStr, 10);

    if (!shelfCode?.trim() || !tierCountStr || isNaN(tierCountNum) || tierCountNum < 1) {
      toast.warning('Nhập mã kệ và số tầng hợp lệ');
      return;
    }
    if (tierRows.length !== tierCountNum) {
      toast.warning('Số dòng kích thước phải khớp số tầng');
      return;
    }

    const tierDimensions: Array<{ height: number; width: number; depth: number }> = [];
    for (let i = 0; i < tierRows.length; i++) {
      const row = tierRows[i];
      const height = Number(row.height);
      const width = Number(row.width);
      const depth = Number(row.depth);
      if (isNaN(height) || height <= 0 || isNaN(width) || width <= 0 || isNaN(depth) || depth <= 0) {
        toast.warning(`Tầng ${i + 1}: cao / rộng / sâu phải là số dương (m)`);
        return;
      }
      tierDimensions.push({ height, width, depth });
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
            shelfCode: shelfCode.trim(),
            tierCount: tierCountNum,
            tierDimensions,
          },
        ],
        zoneDisplay,
      );
      toast.success('Shelf created successfully');
      setShelves((prev) => [...createdShelves, ...prev]);
      setShelfForm({
        shelfCode: '',
        tierCountStr: '',
        tierRows: [],
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create shelf');
    } finally {
      setCreatingShelf(false);
    }
  };

  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouse) return;

    const lengthNum = Number(infoForm.length);
    const widthNum = Number(infoForm.width);
    if (
      !infoForm.name.trim() ||
      !infoForm.address.trim() ||
      isNaN(lengthNum) || lengthNum <= 0 ||
      isNaN(widthNum) || widthNum <= 0
    ) {
      toast.warning('Please provide valid name, address, length and width');
      return;
    }

    try {
      setSavingInfo(true);
      const updated = await updateWarehouse(warehouse.id, {
        name: infoForm.name.trim(),
        address: infoForm.address.trim(),
        length: lengthNum,
        width: widthNum,
        description: infoForm.description.trim() || undefined,
      });
      setWarehouse(updated);
      toast.success('Warehouse information updated');
      setEditingInfo(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update warehouse');
    } finally {
      setSavingInfo(false);
    }
  };

  const handleStartEditZone = (zone: ManagerZoneOption) => {
    setEditingZoneId(zone.id);
    setZoneEditForm({
      zoneCode: zone.zoneCode ?? '',
      name: zone.name ?? '',
      description: zone.description ?? '',
      status: zone.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    });
  };

  const handleSaveZone = async (zoneId: string) => {
    if (!warehouse) return;
    if (!zoneEditForm.zoneCode.trim() || !zoneEditForm.name.trim()) {
      toast.warning('Zone code and name are required');
      return;
    }
    try {
      setSavingZoneId(zoneId);
      const updated = await updateZoneByWarehouse(warehouse.id, zoneId, {
        zoneCode: zoneEditForm.zoneCode.trim(),
        name: zoneEditForm.name.trim(),
        description: zoneEditForm.description.trim(),
        status: zoneEditForm.status,
      });
      setZones((prev) => prev.map((z) => (z.id === zoneId ? updated : z)));
      setEditingZoneId(null);
      toast.success('Zone updated successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update zone');
    } finally {
      setSavingZoneId(null);
    }
  };

  const handleSaveShelfStatus = async (shelf: Shelf) => {
    const selected = shelfStatusDraft[shelf.id];
    if (!selected) return;
    try {
      setUpdatingShelfId(shelf.id);
      await updateShelfStatus(shelf.id, selected);
      const refreshed = await listShelvesByWarehouse(id);
      setShelves(refreshed);
      setEditingShelfId(null);
      toast.success('Shelf status updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update shelf status');
    } finally {
      setUpdatingShelfId(null);
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
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-black text-slate-900">Warehouse information</h2>
          <Button
            variant={editingInfo ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setEditingInfo((v) => !v)}
          >
            {editingInfo ? 'Cancel edit' : 'Edit'}
          </Button>
        </div>

        {!editingInfo ? (
          <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-slate-500">Name</dt>
              <dd className="font-bold text-slate-900">{warehouse.name}</dd>
            </div>
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
            <div className="md:col-span-2 lg:col-span-3">
              <dt className="text-slate-500">Description</dt>
              <dd className="text-slate-700">
                {warehouse.description && warehouse.description.trim().length > 0
                  ? warehouse.description
                  : '—'}
              </dd>
            </div>
          </dl>
        ) : (
          <form onSubmit={handleUpdateInfo} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <Input
              label="Name"
              value={infoForm.name}
              onChange={(e) => setInfoForm((p) => ({ ...p, name: e.target.value }))}
              required
            />
            <Input
              label="Address"
              value={infoForm.address}
              onChange={(e) => setInfoForm((p) => ({ ...p, address: e.target.value }))}
              required
            />
            <Input
              label="Length (m)"
              value={infoForm.length}
              onChange={(e) => setInfoForm((p) => ({ ...p, length: e.target.value }))}
              required
            />
            <Input
              label="Width (m)"
              value={infoForm.width}
              onChange={(e) => setInfoForm((p) => ({ ...p, width: e.target.value }))}
              required
            />
            <div className="md:col-span-2 lg:col-span-3">
              <Input
                label="Description (optional)"
                value={infoForm.description}
                onChange={(e) => setInfoForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditingInfo(false);
                  setInfoForm({
                    name: warehouse.name,
                    address: warehouse.address,
                    length: String(warehouse.length),
                    width: String(warehouse.width),
                    description: warehouse.description ?? '',
                  });
                }}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={savingInfo}>
                Save changes
              </Button>
            </div>
          </form>
        )}
      </section>

      {/* Zones */}
      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-slate-900">Zones</h2>
          <Button
            variant={zoneEditMode ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => {
              setZoneEditMode((prev) => {
                const next = !prev;
                if (!next) setEditingZoneId(null);
                return next;
              });
            }}
          >
            {zoneEditMode ? 'Cancel edit' : 'Edit'}
          </Button>
        </div>
        <p className="text-sm text-slate-600">
          Zones group shelves for location tracking. Contracts are assigned to zones.
        </p>
        <form
          onSubmit={handleCreateZone}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 pb-4 border-b border-slate-100"
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
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="py-2 pr-4">Zone code</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Description</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {zones.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-slate-500">
                    No zones yet. Create one below.
                  </td>
                </tr>
              ) : (
                zones.map((z) => (
                  <tr key={z.id} className="border-b border-slate-50">
                    <td className="py-2 pr-4 font-bold text-slate-900">
                      {editingZoneId === z.id ? (
                        <input
                          value={zoneEditForm.zoneCode}
                          onChange={(e) => setZoneEditForm((prev) => ({ ...prev, zoneCode: e.target.value }))}
                          className="h-9 w-full rounded-lg border border-slate-200 px-2 text-sm"
                        />
                      ) : (
                        z.zoneCode
                      )}
                    </td>
                    <td className="py-2 pr-4 text-slate-700">
                      {editingZoneId === z.id ? (
                        <input
                          value={zoneEditForm.name}
                          onChange={(e) => setZoneEditForm((prev) => ({ ...prev, name: e.target.value }))}
                          className="h-9 w-full rounded-lg border border-slate-200 px-2 text-sm"
                        />
                      ) : (
                        z.name
                      )}
                    </td>
                    <td className="py-2 pr-4 text-slate-700">
                      {editingZoneId === z.id ? (
                        <input
                          value={zoneEditForm.description}
                          onChange={(e) => setZoneEditForm((prev) => ({ ...prev, description: e.target.value }))}
                          className="h-9 w-full rounded-lg border border-slate-200 px-2 text-sm"
                        />
                      ) : (
                        z.description || '—'
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {editingZoneId === z.id ? (
                        <select
                          value={zoneEditForm.status}
                          onChange={(e) =>
                            setZoneEditForm((prev) => ({
                              ...prev,
                              status: e.target.value as 'ACTIVE' | 'INACTIVE',
                            }))
                          }
                          className="h-9 rounded-lg border border-slate-200 px-2 text-sm"
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="INACTIVE">INACTIVE</option>
                        </select>
                      ) : (
                        <Badge variant={z.status === 'ACTIVE' ? 'success' : 'warning'}>
                          {z.status ?? '—'}
                        </Badge>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-right">
                      {!zoneEditMode ? (
                        <span className="text-slate-400 text-xs">—</span>
                      ) : editingZoneId === z.id ? (
                        <div className="inline-flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSaveZone(z.id)}
                            isLoading={savingZoneId === z.id}
                            disabled={savingZoneId === z.id}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingZoneId(null)}
                            disabled={savingZoneId === z.id}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => handleStartEditZone(z)}>
                          Edit
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Shelves */}
      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-slate-900">Shelves</h2>
          <Button
            variant={shelfEditMode ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => {
              setShelfEditMode((prev) => {
                const next = !prev;
                if (!next) setEditingShelfId(null);
                return next;
              });
            }}
          >
            {shelfEditMode ? 'Cancel edit' : 'Edit'}
          </Button>
        </div>
        <p className="text-sm text-slate-600">
          Create shelves inside zones and see their current status.
        </p>

        <form onSubmit={handleCreateShelf} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              onChange={(e) => setShelfForm((p) => ({ ...p, shelfCode: e.target.value }))}
              placeholder="A-01-01"
              required
            />
            <Input
              label="Số tầng"
              type="number"
              min={1}
              value={shelfForm.tierCountStr}
              onChange={(e) => setTierCountFromInput(e.target.value)}
              placeholder="VD: 3"
              required
            />
          </div>
          {shelfForm.tierRows.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
              <p className="text-sm font-bold text-slate-800">
                Kích thước từng tầng (m) — cao × rộng × sâu
              </p>
              <div className="space-y-3">
                {shelfForm.tierRows.map((row, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end bg-white rounded-xl border border-slate-100 p-3"
                  >
                    <p className="text-xs font-bold text-slate-500 sm:col-span-1 pt-2">Tầng {idx + 1}</p>
                    <Input
                      label="Cao (m)"
                      type="number"
                      step="0.01"
                      min={0}
                      value={row.height}
                      onChange={(e) => updateTierRow(idx, { height: e.target.value })}
                      placeholder="1.2"
                    />
                    <Input
                      label="Rộng (m)"
                      type="number"
                      step="0.01"
                      min={0}
                      value={row.width}
                      onChange={(e) => updateTierRow(idx, { width: e.target.value })}
                      placeholder="2.0"
                    />
                    <Input
                      label="Sâu (m)"
                      type="number"
                      step="0.01"
                      min={0}
                      value={row.depth}
                      onChange={(e) => updateTierRow(idx, { depth: e.target.value })}
                      placeholder="1.0"
                    />
                  </div>
                ))}
              </div>
              <p className="text-sm text-slate-700">
                <span className="font-bold">Dung tích tối đa ước tính:</span>{' '}
                <span className="font-mono font-bold text-primary">{formatM3(previewMaxM3)}</span>
                <span className="text-slate-500"> (tổng các tầng, lưu làm max capacity kệ)</span>
              </p>
            </div>
          )}
          <div className="flex justify-end">
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
              {utilLoading && (
                <p className="text-xs text-slate-500 px-4 py-2 border-b border-slate-100">
                  Đang tải dung tích kệ…
                </p>
              )}
              <Table>
                <TableHead>
                  <TableHeader>Shelf code</TableHeader>
                  <TableHeader>Zone</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader className="text-right">Action</TableHeader>
                  <TableHeader>Contract</TableHeader>
                  <TableHeader className="text-right">Đã dùng</TableHeader>
                  <TableHeader className="text-right">Max</TableHeader>
                  <TableHeader className="text-right">Còn lại</TableHeader>
                  <TableHeader className="text-right">%</TableHeader>
                  <TableHeader>Cảnh báo</TableHeader>
                </TableHead>
                <TableBody>
                  {shelves.map((s) => {
                    const u = utilByShelfId[s.id];
                    const used = u?.current_utilization ?? 0;
                    const max = u?.max_capacity ?? 0;
                    const remaining = max > 0 ? Math.max(0, max - used) : 0;
                    const pct = u?.utilization_percentage ?? 0;
                    const hint = utilizationHint(pct);
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-bold text-slate-900">{s.code}</TableCell>
                        <TableCell className="text-slate-700">{s.zone || '—'}</TableCell>
                        <TableCell>
                          <Badge variant={s.status === 'Occupied' ? 'warning' : 'success'}>
                            {s.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {!shelfEditMode ? (
                            <div className="flex justify-end">
                              <span className="text-slate-400 text-xs">—</span>
                            </div>
                          ) : editingShelfId === s.id ? (
                            <div className="flex items-center justify-end gap-2">
                              <select
                                value={shelfStatusDraft[s.id] ?? (s.status === 'Occupied' ? 'RENTED' : 'AVAILABLE')}
                                onChange={(e) =>
                                  setShelfStatusDraft((prev) => ({
                                    ...prev,
                                    [s.id]: e.target.value as 'AVAILABLE' | 'RENTED' | 'MAINTENANCE',
                                  }))
                                }
                                className="h-9 rounded-lg border border-slate-200 px-2 text-xs"
                              >
                                <option value="AVAILABLE">AVAILABLE</option>
                                <option value="MAINTENANCE">MAINTENANCE</option>
                                <option value="RENTED">RENTED</option>
                              </select>
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={updatingShelfId === s.id}
                                onClick={() => handleSaveShelfStatus(s)}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={updatingShelfId === s.id}
                                onClick={() => {
                                  setEditingShelfId(null);
                                  setShelfStatusDraft((prev) => ({
                                    ...prev,
                                    [s.id]: s.status === 'Occupied' ? 'RENTED' : 'AVAILABLE',
                                  }));
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex justify-end">
                              <Button size="sm" variant="ghost" onClick={() => setEditingShelfId(s.id)}>
                                Edit
                              </Button>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-700">{s.contractCode || '—'}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{u ? formatM3(used) : '—'}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{u ? formatM3(max) : '—'}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{u ? formatM3(remaining) : '—'}</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {u ? `${pct.toFixed(1)}%` : '—'}
                        </TableCell>
                        <TableCell>
                          {hint ? (
                            <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-bold ${hint.className}`}>
                              {hint.label}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

