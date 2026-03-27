'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/Table';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { useToastHelpers } from '../../../lib/toast';
import { listWarehouses } from '../../../lib/mockApi/manager.api';
import { listStaffWithWarehouse, transferStaffWarehouse, type StaffWithWarehouse } from '../../../lib/staff-warehouses.api';

type WarehouseOption = { id: string; name: string; status?: string };

export default function ManagerStaffsPage() {
  const toast = useToastHelpers();
  const [staffs, setStaffs] = useState<StaffWithWarehouse[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [searchDraft, setSearchDraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [nextWarehouseByStaff, setNextWarehouseByStaff] = useState<Record<string, string>>({});
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingStaffId, setSavingStaffId] = useState<string | null>(null);

  const loadStaffs = async () => {
    try {
      setLoading(true);
      setError(null);
      const staffRows = await listStaffWithWarehouse({ search: searchQuery, warehouseId: warehouseFilter || undefined });
      setStaffs(staffRows);
      const draft: Record<string, string> = {};
      for (const row of staffRows) {
        draft[row.user_id] = row.warehouse_id ?? '';
      }
      setNextWarehouseByStaff(draft);
      setEditingStaffId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load staffs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const warehouseRows = await listWarehouses().catch(() => []);
      if (cancelled) return;
      setWarehouses(
        (warehouseRows as any[])
          .filter((w) => (w.status ?? 'ACTIVE') === 'ACTIVE')
          .map((w) => ({ id: w.id, name: w.name, status: w.status }))
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      if (cancelled) return;
      void loadStaffs();
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, warehouseFilter]);

  const warehouseOptions = useMemo(
    () => [{ value: '', label: 'All warehouses' }, ...warehouses.map((w) => ({ value: w.id, label: w.name }))],
    [warehouses]
  );

  if (loading) return <LoadingSkeleton className="h-64 w-full" />;
  if (error) return <ErrorState title="Failed to load staffs" message={error} onRetry={loadStaffs} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Staffs</h1>
        <p className="text-slate-500 mt-1">
          Quản lý warehouse cho staff. Một staff chỉ thuộc một warehouse, một warehouse có thể có nhiều staff.
        </p>
      </div>

      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Search staff"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Name or email"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setSearchQuery(searchDraft.trim());
              }
            }}
          />
          <Select
            label="Filter warehouse"
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            options={warehouseOptions}
          />
        </div>
      </section>

      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm overflow-hidden">
        <Table>
          <TableHead>
            <TableHeader>Staff</TableHeader>
            <TableHeader>Email</TableHeader>
            <TableHeader>Warehouse</TableHeader>
            <TableHeader className="text-right">Action</TableHeader>
          </TableHead>
          <TableBody>
            {staffs.length === 0 ? (
              <TableRow>
                <td colSpan={4} className="px-6 py-4 text-slate-500">No active staff found.</td>
              </TableRow>
            ) : (
              staffs.map((s) => (
                <TableRow key={s.user_id}>
                  <TableCell className="font-bold text-slate-900">{s.name}</TableCell>
                  <TableCell className="text-slate-600">{s.email}</TableCell>
                  <TableCell>
                    {editingStaffId === s.user_id ? (
                      <Select
                        value={nextWarehouseByStaff[s.user_id] ?? ''}
                        onChange={(e) =>
                          setNextWarehouseByStaff((prev) => ({
                            ...prev,
                            [s.user_id]: e.target.value,
                          }))
                        }
                        options={[
                          { value: '', label: 'Select warehouse' },
                          ...warehouses.map((w) => ({ value: w.id, label: w.name })),
                        ]}
                      />
                    ) : (
                      <span className="text-slate-700">{s.warehouse_name ?? '—'}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingStaffId === s.user_id ? (
                      <div className="inline-flex gap-2">
                        <Button
                          size="sm"
                          isLoading={savingStaffId === s.user_id}
                          disabled={
                            savingStaffId === s.user_id ||
                            !nextWarehouseByStaff[s.user_id] ||
                            nextWarehouseByStaff[s.user_id] === s.warehouse_id
                          }
                          onClick={async () => {
                            const targetWarehouseId = nextWarehouseByStaff[s.user_id];
                            if (!targetWarehouseId) {
                              toast.warning('Please select warehouse');
                              return;
                            }
                            try {
                              setSavingStaffId(s.user_id);
                              const updated = await transferStaffWarehouse(s.user_id, targetWarehouseId);
                              setStaffs((prev) =>
                                prev.map((row) =>
                                  row.user_id === s.user_id
                                    ? {
                                        ...row,
                                        warehouse_id: updated.warehouse_id,
                                        warehouse_name: updated.warehouse_name,
                                      }
                                    : row
                                )
                              );
                              setEditingStaffId(null);
                              toast.success('Staff warehouse updated');
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : 'Failed to update staff warehouse');
                            } finally {
                              setSavingStaffId(null);
                            }
                          }}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setNextWarehouseByStaff((prev) => ({ ...prev, [s.user_id]: s.warehouse_id ?? '' }));
                            setEditingStaffId(null);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!!editingStaffId}
                        onClick={() => setEditingStaffId(s.user_id)}
                      >
                        Edit
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
