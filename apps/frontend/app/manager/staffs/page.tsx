'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/Table';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { PageHeader } from '../../../components/ui/PageHeader';
import { ErrorState } from '../../../components/ui/ErrorState';
import { useToastHelpers } from '../../../lib/toast';
import {
  listStaffWithWarehouse,
  listWarehousesWithAssignedStaff,
  transferStaffWarehouse,
  unassignStaffFromWarehouse,
  type StaffWithWarehouse,
  type WarehouseWithAssignedStaff,
} from '../../../lib/staff-warehouses.api';

type StaffOption = { id: string; name: string; email: string };

export default function ManagerStaffsPage() {
  const toast = useToastHelpers();
  const [rows, setRows] = useState<WarehouseWithAssignedStaff[]>([]);
  const [staffs, setStaffs] = useState<StaffOption[]>([]);
  const [searchDraft, setSearchDraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [nextStaffByWarehouse, setNextStaffByWarehouse] = useState<Record<string, string>>({});
  const [editingWarehouseId, setEditingWarehouseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingWarehouseId, setSavingWarehouseId] = useState<string | null>(null);

  const loadRows = async () => {
    try {
      setLoading(true);
      setError(null);
      const warehouseRows = await listWarehousesWithAssignedStaff({ search: searchQuery });
      setRows(warehouseRows);
      const draft: Record<string, string> = {};
      for (const row of warehouseRows) {
        draft[row.warehouse_id] = row.staff_id ?? '';
      }
      setNextStaffByWarehouse(draft);
      setEditingWarehouseId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load warehouse assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const staffRows = await listStaffWithWarehouse().catch(() => []);
      if (cancelled) return;
      setStaffs(
        (staffRows as StaffWithWarehouse[]).map((s) => ({
          id: s.user_id,
          name: s.name,
          email: s.email,
        }))
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
      void loadRows();
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const staffOptions = useMemo(
    () => [{ value: '', label: 'Select staff' }, ...staffs.map((s) => ({ value: s.id, label: `${s.name} (${s.email})` }))],
    [staffs]
  );

  if (loading) return <LoadingSkeleton className="h-64 w-full" />;
  if (error) return <ErrorState title="Failed to load assignments" message={error} onRetry={loadRows} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff Assignment"
        description="Assign exactly one staff per warehouse. A staff member can manage multiple warehouses."
      />

      <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-card">
        <div className="grid grid-cols-1 gap-4">
          <Input
            label="Search warehouse"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Warehouse name"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setSearchQuery(searchDraft.trim());
              }
            }}
          />
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
        <Table>
          <TableHead>
            <TableHeader>Warehouse</TableHeader>
            <TableHeader>Assigned staff</TableHeader>
            <TableHeader className="text-right">Action</TableHeader>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <td colSpan={3} className="px-6 py-4 text-slate-500">No warehouses found.</td>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.warehouse_id}>
                  <TableCell className="font-bold text-slate-900">{row.warehouse_name}</TableCell>
                  <TableCell>
                    {editingWarehouseId === row.warehouse_id ? (
                      <Select
                        value={nextStaffByWarehouse[row.warehouse_id] ?? ''}
                        onChange={(e) =>
                          setNextStaffByWarehouse((prev) => ({
                            ...prev,
                            [row.warehouse_id]: e.target.value,
                          }))
                        }
                        options={staffOptions}
                      />
                    ) : (
                      <span className="text-slate-700">
                        {row.staff_name ? `${row.staff_name} (${row.staff_email})` : '—'}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingWarehouseId === row.warehouse_id ? (
                      <div className="inline-flex gap-2">
                        <Button
                          size="sm"
                          isLoading={savingWarehouseId === row.warehouse_id}
                          disabled={
                            savingWarehouseId === row.warehouse_id ||
                            !nextStaffByWarehouse[row.warehouse_id] ||
                            nextStaffByWarehouse[row.warehouse_id] === row.staff_id
                          }
                          onClick={async () => {
                            const targetStaffId = nextStaffByWarehouse[row.warehouse_id];
                            if (!targetStaffId) {
                              toast.warning('Please select staff');
                              return;
                            }
                            try {
                              setSavingWarehouseId(row.warehouse_id);
                              const updated = await transferStaffWarehouse(row.warehouse_id, targetStaffId);
                              setRows((prev) =>
                                prev.map((row) =>
                                  row.warehouse_id === updated.warehouse_id
                                    ? {
                                        ...row,
                                        staff_id: updated.staff_id,
                                        staff_name: updated.staff_name,
                                        staff_email: updated.staff_email,
                                      }
                                    : row
                                )
                              );
                              setEditingWarehouseId(null);
                              toast.success('Warehouse assignment updated');
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : 'Failed to update assignment');
                            } finally {
                              setSavingWarehouseId(null);
                            }
                          }}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setNextStaffByWarehouse((prev) => ({
                              ...prev,
                              [row.warehouse_id]: row.staff_id ?? '',
                            }));
                            setEditingWarehouseId(null);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="inline-flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={!!editingWarehouseId}
                          onClick={() => setEditingWarehouseId(row.warehouse_id)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={!!editingWarehouseId || !row.staff_id || savingWarehouseId === row.warehouse_id}
                          isLoading={savingWarehouseId === row.warehouse_id}
                          onClick={async () => {
                            if (!row.staff_id) return;
                            try {
                              setSavingWarehouseId(row.warehouse_id);
                              await unassignStaffFromWarehouse(row.warehouse_id);
                              setRows((prev) =>
                                prev.map((it) =>
                                  it.warehouse_id === row.warehouse_id
                                    ? { ...it, staff_id: null, staff_name: null, staff_email: null }
                                    : it
                                )
                              );
                              setNextStaffByWarehouse((prev) => ({ ...prev, [row.warehouse_id]: '' }));
                              toast.success('Staff removed from warehouse');
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : 'Failed to remove assignment');
                            } finally {
                              setSavingWarehouseId(null);
                            }
                          }}
                        >
                          Unassign
                        </Button>
                      </div>
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
