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

export default function ManagerOutboundRequestsPage() {
  const toast = useToastHelpers();
  const [items, setItems] = useState<StorageRequestView[]>([]);
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
      const data = await listStorageRequests({ requestType: 'OUT', status: 'PENDING' });
      setItems(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load outbound requests';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const loadStaff = async () => {
    try {
      setStaffError(null);
      const users = await listStaffUsers();
      setStaffUsers(users);
    } catch (err) {
      setStaffError(err instanceof Error ? err.message : 'Failed to load staff');
      toast.error('Không tải được danh sách staff');
    }
  };

  useEffect(() => {
    load();
    loadStaff();
  }, []);

  const handleAssign = async () => {
    if (!assigning) return;
    if (assignStaffIds.length === 0) {
      toast.warning('Vui lòng chọn ít nhất một staff');
      return;
    }
    try {
      setActionLoadingId(assigning.request_id);
      await assignStorageRequest(assigning.request_id, assignStaffIds);
      toast.success('Đã gán staff cho yêu cầu xuất hàng');
      setAssigning(null);
      setAssignStaffIds([]);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gán staff thất bại');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Outbound Requests</h1>
        <p className="text-slate-500 mt-1">
          Yêu cầu xuất hàng chờ gán staff. Gán xong staff mới thấy task và thực hiện pick & dispatch.
        </p>
      </div>

      {loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : error ? (
        <ErrorState title="Failed to load" message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="inbox"
          title="Không có yêu cầu chờ gán"
          message="Chưa có yêu cầu xuất hàng PENDING nào."
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
              {items.map((r) => (
                <TableRow key={r.request_id}>
                  <TableCell className="font-bold text-slate-900">
                    {r.reference ?? r.request_id}
                  </TableCell>
                  <TableCell className="text-slate-700">{r.contract_code ?? r.contract_id}</TableCell>
                  <TableCell className="text-slate-700">{r.items.length}</TableCell>
                  <TableCell className="text-slate-600 text-sm">
                    {new Date(r.created_at).toLocaleString('vi-VN')}
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
                      Gán staff
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {assigning && (
        <Modal
          open={!!assigning}
          onOpenChange={(open) => {
            if (!open) setAssigning(null);
          }}
          title={`Gán staff – ${assigning.reference ?? assigning.request_id}`}
          size="md"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Chọn một hoặc nhiều staff để giao thực hiện pick & dispatch. Chỉ staff được chọn mới
              thấy task trong danh sách của họ.
            </p>
            <div className="space-y-2 relative">
              <p className="text-xs font-bold text-slate-600">Chọn staff</p>
              {staffError && <p className="text-xs text-red-500 mb-1">{staffError}</p>}
              <button
                type="button"
                onClick={() => setOpenStaffDropdown(!openStaffDropdown)}
                className="w-full px-3 py-2 rounded-2xl border border-slate-200 text-sm text-left bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                {assignStaffIds.length > 0
                  ? `Đã chọn ${assignStaffIds.length} staff`
                  : 'Chọn nhân viên'}
              </button>
              {openStaffDropdown && (
                <div className="absolute z-10 mt-1 w-full max-h-48 overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-md">
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
                            setAssignStaffIds([...assignStaffIds, s.user_id]);
                          } else {
                            setAssignStaffIds(assignStaffIds.filter((id) => id !== s.user_id));
                          }
                        }}
                      />
                      <span>
                        {s.name} <span className="text-xs text-slate-400">({s.email})</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="ghost" onClick={() => setAssigning(null)}>
                Hủy
              </Button>
              <Button onClick={handleAssign} disabled={assignStaffIds.length === 0}>
                Gán
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
