'use client';

import React, { useState, useEffect } from 'react';
import {
  listStorageRequests,
  assignStorageRequest,
  type StorageRequestView,
} from '../../../lib/storage-requests.api';
import { listStaffUsers, type StaffUserOption } from '../../../lib/staff-users.api';
import { useToastHelpers } from '../../../lib/toast';
import { Button } from '../../../components/ui/Button';
import {
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from '../../../components/ui/Table';
import { Modal } from '../../../components/ui/Modal';
import { TableSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Pagination } from '../../../components/ui/Pagination';

export default function ManagerOutboundRequestsPage() {
  const toast = useToastHelpers();
  const PAGE_SIZE = 10;
  const [items, setItems] = useState<StorageRequestView[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<StorageRequestView | null>(null);
  const [assignStaffIds, setAssignStaffIds] = useState<string[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUserOption[]>([]);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [openStaffDropdown, setOpenStaffDropdown] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      // Giữ lại cả PENDING và APPROVED để manager không mất danh sách sau khi assign
      const [pending, approved] = await Promise.all([
        listStorageRequests({ requestType: 'OUT', status: 'PENDING' }),
        listStorageRequests({ requestType: 'OUT', status: 'APPROVED' }),
      ]);
      setItems([...pending, ...approved]);
      setPage(1);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load outbound requests';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = items.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const loadStaff = async () => {
    try {
      setStaffError(null);
      const users = await listStaffUsers();
      setStaffUsers(users);
    } catch (err) {
      setStaffError(err instanceof Error ? err.message : 'Failed to load staff');
      toast.error('Failed to load staff list');
    }
  };

  useEffect(() => {
    load();
    loadStaff();
  }, []);

  const handleAssign = async () => {
    if (!assigning) return;
    if (assignStaffIds.length === 0) {
      toast.warning('Please select at least one staff member');
      return;
    }
    try {
      setActionLoadingId(assigning.request_id);
      await assignStorageRequest(assigning.request_id, assignStaffIds);
      toast.success('Staff assigned to outbound request');
      setAssigning(null);
      setAssignStaffIds([]);
      // Cập nhật trạng thái request trong danh sách hiện tại, thay vì load lại và mất view
      setItems((prev) =>
        prev.map((r) =>
          r.request_id === assigning.request_id
            ? { ...r, status: 'APPROVED' as any, assigned_staff_ids: assignStaffIds }
            : r,
        ),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to assign staff');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Outbound Requests</h1>
        <p className="text-slate-500 mt-1">
          Outbound requests waiting for staff assignment. Once assigned, staff will see the task and perform pick & dispatch.
        </p>
      </div>

      {loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : error ? (
        <ErrorState title="Failed to load" message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="inbox"
          title="No pending assignments"
          message="There are no PENDING outbound requests."
        />
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <Table>
            <TableHead>
              <TableHeader>Outbound reference</TableHeader>
              <TableHeader>Contract code</TableHeader>
              <TableHeader>Items</TableHeader>
              <TableHeader>Created</TableHeader>
              <TableHeader>Action</TableHeader>
            </TableHead>
            <TableBody>
              {paged.map((r) => (
                <TableRow key={r.request_id}>
                  <TableCell className="font-bold text-slate-900">
                    {r.reference ?? r.request_id}
                  </TableCell>
                  <TableCell className="text-slate-700">{r.contract_code ?? r.contract_id}</TableCell>
                  <TableCell className="text-slate-700">{r.items.length}</TableCell>
                  <TableCell className="text-slate-600 text-sm">
                    {new Date(r.created_at).toLocaleString('vi-VN', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      onClick={() => {
                        setAssigning(r);
                        setAssignStaffIds([]);
                        setOpenStaffDropdown(false);
                      }}
                      disabled={actionLoadingId === r.request_id}
                    >
                      Assign staff
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-slate-500">
            Showing{' '}
            <span className="font-bold text-slate-700">
              {Math.min((safePage - 1) * PAGE_SIZE + 1, items.length)}
            </span>
            {' '}to{' '}
            <span className="font-bold text-slate-700">
              {Math.min(safePage * PAGE_SIZE, items.length)}
            </span>
            {' '}of{' '}
            <span className="font-bold text-slate-700">{items.length}</span>
          </p>
          <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {assigning && (
        <Modal
          open={!!assigning}
          onOpenChange={(open) => {
            if (!open) setAssigning(null);
          }}
          title={`Assign staff – ${assigning.reference ?? assigning.request_id}`}
          size="xl"
        >
          <div className="space-y-6">
            <p className="text-sm text-slate-600">
              Review the outbound request details and assign one or more staff members to perform pick & dispatch.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Request summary */}
              <section className="bg-slate-50 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">
                  Request summary
                </h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-slate-500">Outbound reference</dt>
                    <dd className="font-bold text-slate-900 text-right">
                      {assigning.reference ?? assigning.request_id}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-slate-500">Contract</dt>
                    <dd className="font-medium text-slate-900 text-right">
                      {assigning.contract_code ?? assigning.contract_id}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-slate-500">Items</dt>
                    <dd className="font-medium text-slate-900 text-right">
                      {assigning.items.length}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-slate-500">Created at</dt>
                    <dd className="text-slate-800 text-right">
                      {new Date(assigning.created_at).toLocaleString('en-US', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </dd>
                  </div>
                </dl>
                {assigning.items.length > 0 && (
                  <div className="mt-3 border-t border-slate-200 pt-3">
                    <p className="text-xs font-bold text-slate-600 mb-2">
                      Item preview (first {Math.min(assigning.items.length, 3)})
                    </p>
                    <ul className="space-y-1.5 text-xs text-slate-700">
                      {assigning.items.slice(0, 3).map((it, idx) => (
                        <li key={idx} className="flex justify-between gap-3">
                          <span className="font-medium truncate">{it.item_name}</span>
                          <span className="text-slate-500">
                            {it.quantity_requested} {it.unit}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>

              {/* Staff selection */}
              <section className="space-y-3 relative">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">
                  Assign to staff
                </h3>
                {staffError && <p className="text-xs text-red-500 mb-1">{staffError}</p>}
                <button
                  type="button"
                  onClick={() => setOpenStaffDropdown(!openStaffDropdown)}
                  className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 text-sm text-left bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                >
                  {assignStaffIds.length > 0
                    ? `Selected ${assignStaffIds.length} staff`
                    : 'Choose staff'}
                </button>
                {assignStaffIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {assignStaffIds.map((id) => {
                      const staff = staffUsers.find((s) => s.user_id === id);
                      if (!staff) return null;
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-primary/5 text-primary border border-primary/20"
                        >
                          {staff.name}
                          <button
                            type="button"
                            onClick={() =>
                              setAssignStaffIds((prev) => prev.filter((x) => x !== id))
                            }
                            className="text-slate-400 hover:text-slate-600"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
                {openStaffDropdown && (
                  <div className="absolute z-10 mt-1 w-full max-h-56 overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-md">
                    {staffUsers.map((s) => (
                      <label
                        key={s.user_id}
                        className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-50 cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={assignStaffIds.includes(s.user_id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAssignStaffIds((prev) => [...prev, s.user_id]);
                            } else {
                              setAssignStaffIds((prev) =>
                                prev.filter((id) => id !== s.user_id),
                              );
                            }
                          }}
                        />
                        <span className="flex flex-col">
                          <span className="font-medium">{s.name}</span>
                          <span className="text-xs text-slate-400">{s.email}</span>
                        </span>
                      </label>
                    ))}
                    {staffUsers.length === 0 && (
                      <p className="text-xs text-slate-500 px-2 py-1">No staff available.</p>
                    )}
                  </div>
                )}
              </section>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Button variant="ghost" onClick={() => setAssigning(null)}>
                Cancel
              </Button>
              <Button onClick={handleAssign} disabled={assignStaffIds.length === 0}>
                Assign task
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
