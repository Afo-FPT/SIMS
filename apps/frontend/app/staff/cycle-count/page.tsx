'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getCycleCounts,
  type CycleCountResponse,
} from '../../../lib/cycle-count.api';
import { useToastHelpers } from '../../../lib/toast';
import { Badge } from '../../../components/ui/Badge';
import {
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from '../../../components/ui/Table';
import { LoadingSkeleton, TableSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';

const STATUS_LABEL: Record<string, string> = {
  PENDING_MANAGER_APPROVAL: 'Chờ duyệt',
  ASSIGNED_TO_STAFF: 'Cần kiểm kê',
  STAFF_SUBMITTED: 'Đã nộp',
  CONFIRMED: 'Đã xác nhận',
  REJECTED: 'Từ chối',
  ADJUSTMENT_REQUESTED: 'Yêu cầu điều chỉnh',
  RECOUNT_REQUIRED: 'Yêu cầu kiểm lại',
};

export default function StaffCycleCountPage() {
  const toast = useToastHelpers();
  const [list, setList] = useState<CycleCountResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCycleCounts();
      setList(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      toast.error('Không tải được danh sách kiểm kê');
    } finally {
      setLoading(false);
    }
  };

  const pending = list.filter((cc) => cc.status === 'ASSIGNED_TO_STAFF');
  const others = list.filter((cc) => cc.status !== 'ASSIGNED_TO_STAFF');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Cycle Count
        </h1>
        <p className="text-slate-500 mt-1">
          Kiểm kê hàng theo yêu cầu đã được manager giao
        </p>
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : error ? (
        <ErrorState title="Lỗi tải dữ liệu" message={error} onRetry={load} />
      ) : list.length === 0 ? (
        <EmptyState
          icon="fact_check"
          title="Chưa có phiên kiểm kê"
          message="Các yêu cầu kiểm kê được manager giao sẽ hiển thị tại đây"
        />
      ) : (
        <>
          <Table>
            <TableHead>
              <TableHeader>Mã / Contract</TableHeader>
              <TableHeader>Khách hàng</TableHeader>
              <TableHeader>Kho</TableHeader>
              <TableHeader>Trạng thái</TableHeader>
              <TableHeader>Hạn kiểm</TableHeader>
              <TableHeader>Thao tác</TableHeader>
            </TableHead>
            <TableBody>
              {[...pending, ...others].map((cc) => (
                <TableRow key={cc.cycle_count_id}>
                  <TableCell className="font-bold text-slate-900">
                    {cc.contract_code}
                  </TableCell>
                  <TableCell className="text-slate-700">
                    {cc.customer_name}
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm">
                    {cc.warehouse_name || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        cc.status === 'ASSIGNED_TO_STAFF'
                          ? 'warning'
                          : cc.status === 'STAFF_SUBMITTED' || cc.status === 'CONFIRMED'
                            ? 'success'
                            : 'neutral'
                      }
                    >
                      {STATUS_LABEL[cc.status] || cc.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm">
                    {cc.counting_deadline
                      ? new Date(cc.counting_deadline).toLocaleString('vi-VN')
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/staff/cycle-count/${cc.cycle_count_id}`}
                      className="text-sm font-bold text-primary hover:underline"
                    >
                      {cc.status === 'ASSIGNED_TO_STAFF' ? 'Thực hiện' : 'Xem'}
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  );
}
