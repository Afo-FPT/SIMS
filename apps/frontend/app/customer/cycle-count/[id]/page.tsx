'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getCycleCountById,
  confirmCycleCount,
  requestInventoryAdjustment,
  type CycleCountResponse,
} from '../../../../lib/cycle-count.api';
import { useToastHelpers } from '../../../../lib/toast';
import { Button } from '../../../../components/ui/Button';
import { Badge } from '../../../../components/ui/Badge';
import {
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from '../../../../components/ui/Table';
import { LoadingSkeleton } from '../../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { Modal } from '../../../../components/ui/Modal';

const STATUS_LABEL: Record<string, string> = {
  PENDING_MANAGER_APPROVAL: 'Chờ manager duyệt',
  ASSIGNED_TO_STAFF: 'Đang chờ nhân viên kiểm kê',
  STAFF_SUBMITTED: 'Nhân viên đã nộp kết quả',
  ADJUSTMENT_REQUESTED: 'Đã yêu cầu điều chỉnh tồn kho',
  CONFIRMED: 'Đã xác nhận',
  RECOUNT_REQUIRED: 'Yêu cầu kiểm lại',
  REJECTED: 'Bị từ chối',
};

export default function CustomerCycleCountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToastHelpers();
  const id = params.id as string;

  const [data, setData] = useState<CycleCountResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustReason, setAdjustReason] = useState('');

  useEffect(() => {
    load();
  }, [id]);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getCycleCountById(id);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      toast.error('Không tải được chi tiết kiểm kê');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!data) return;
    try {
      setConfirming(true);
      await confirmCycleCount(id);
      toast.success('Đã xác nhận kết quả kiểm kê (không điều chỉnh tồn kho)');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xác nhận thất bại');
    } finally {
      setConfirming(false);
    }
  };

  const handleRequestAdjustment = async () => {
    if (!data) return;
    try {
      setAdjusting(true);
      await requestInventoryAdjustment(id, adjustReason);
      toast.success('Đã gửi yêu cầu điều chỉnh tồn kho');
      setAdjustModalOpen(false);
      setAdjustReason('');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gửi yêu cầu điều chỉnh thất bại');
    } finally {
      setAdjusting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <LoadingSkeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-8">
        <ErrorState
          title="Không tải được phiên kiểm kê"
          message={error || 'Not found'}
          onRetry={load}
        />
      </div>
    );
  }

  const hasItems = data.items && data.items.length > 0;
  const canCustomerAct = data.status === 'STAFF_SUBMITTED';
  const hasDiscrepancy =
    !!data.items && data.items.some((i) => (i.discrepancy ?? 0) !== 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/customer/service-requests"
          className="text-slate-500 hover:text-primary font-bold flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Quay lại Service Requests
        </Link>
      </div>

      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              Cycle Count – {data.contract_code}
            </h1>
            <p className="text-slate-500 mt-1">
              Kho: <span className="font-bold">{data.warehouse_name || '—'}</span>
            </p>
          </div>
          <Badge
            variant={
              data.status === 'PENDING_MANAGER_APPROVAL'
                ? 'warning'
                : data.status === 'ASSIGNED_TO_STAFF'
                  ? 'info'
                  : data.status === 'STAFF_SUBMITTED'
                    ? 'warning'
                    : data.status === 'ADJUSTMENT_REQUESTED'
                      ? 'info'
                      : data.status === 'CONFIRMED'
                        ? 'success'
                        : data.status === 'REJECTED'
                          ? 'error'
                          : 'neutral'
            }
          >
            {STATUS_LABEL[data.status] || data.status}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-500 mb-1">Ngày yêu cầu</p>
            <p className="font-bold text-slate-900">
              {new Date(data.requested_at).toLocaleString('vi-VN')}
            </p>
          </div>
          <div>
            <p className="text-slate-500 mb-1">Hạn kiểm kê (deadline cho staff)</p>
            <p className="font-bold text-slate-900">
              {data.counting_deadline
                ? new Date(data.counting_deadline).toLocaleString('vi-VN')
                : '—'}
            </p>
          </div>
          {data.preferred_date && (
            <div>
              <p className="text-slate-500 mb-1">Thời gian mong muốn</p>
              <p className="font-bold text-slate-900">
                {new Date(data.preferred_date).toLocaleString('vi-VN')}
              </p>
            </div>
          )}
          {data.confirmed_at && (
            <div>
              <p className="text-slate-500 mb-1">Thời gian xác nhận</p>
              <p className="font-bold text-slate-900">
                {new Date(data.confirmed_at).toLocaleString('vi-VN')}
              </p>
            </div>
          )}
          {data.note && (
            <div className="md:col-span-2">
              <p className="text-slate-500 mb-1">Ghi chú yêu cầu</p>
              <p className="text-slate-700">{data.note}</p>
            </div>
          )}
        </div>

        {canCustomerAct && (
          <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap gap-3">
            <Button onClick={handleConfirm} disabled={confirming}>
              {confirming ? 'Đang xác nhận...' : 'Xác nhận kết quả (không điều chỉnh tồn kho)'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setAdjustModalOpen(true)}
              disabled={adjusting || !hasDiscrepancy}
            >
              Yêu cầu điều chỉnh tồn kho
            </Button>
            {!hasDiscrepancy && (
              <p className="text-xs text-slate-500">
                Không có chênh lệch nên không thể yêu cầu điều chỉnh.
              </p>
            )}
          </div>
        )}

        {data.status === 'ADJUSTMENT_REQUESTED' && (
          <div className="mt-6 pt-4 border-t border-slate-100 text-sm text-slate-600">
            Đã gửi yêu cầu điều chỉnh tồn kho. Đang chờ manager áp dụng.
          </div>
        )}
        {data.status === 'CONFIRMED' && (
          <div className="mt-6 pt-4 border-t border-slate-100 text-sm text-slate-600">
            Phiên kiểm kê đã được xác nhận.
            {data.inventory_adjusted
              ? ' Hệ thống tồn kho đã được cập nhật theo kết quả kiểm kê.'
              : ' Không có điều chỉnh tồn kho được áp dụng.'}
          </div>
        )}
      </section>

      {hasItems && (
        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-900 mb-4">
            Kết quả kiểm kê chi tiết
          </h2>
          <Table>
            <TableHead>
              <TableHeader>Kệ</TableHeader>
              <TableHeader>Tên hàng</TableHeader>
              <TableHeader>Đơn vị</TableHeader>
              <TableHeader>SL hệ thống</TableHeader>
              <TableHeader>SL đếm</TableHeader>
              <TableHeader>Chênh lệch</TableHeader>
              <TableHeader>Ghi chú</TableHeader>
            </TableHead>
            <TableBody>
              {data.items!.map((item) => {
                const discrepancy = item.discrepancy ?? 0;
                return (
                  <TableRow key={item.stored_item_id}>
                    <TableCell className="font-mono">{item.shelf_code}</TableCell>
                    <TableCell className="font-bold">{item.item_name}</TableCell>
                    <TableCell className="text-slate-600">{item.unit}</TableCell>
                    <TableCell>{item.system_quantity}</TableCell>
                    <TableCell>{item.counted_quantity ?? '—'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={discrepancy !== 0 ? 'warning' : 'success'}
                      >
                        {discrepancy}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm max-w-[240px]">
                      {item.note || '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </section>
      )}

      {!hasItems && (
        <p className="text-slate-500 text-sm">
          Chưa có kết quả kiểm kê chi tiết (nhân viên chưa nộp hoặc phiên bị từ chối).
        </p>
      )}

      <Modal
        open={adjustModalOpen}
        onOpenChange={setAdjustModalOpen}
        title="Yêu cầu điều chỉnh tồn kho"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Bạn muốn yêu cầu cập nhật tồn kho theo chênh lệch đã phát hiện. Vui lòng mô tả
            lý do (tuỳ chọn).
          </p>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Lý do (tùy chọn)
            </label>
            <textarea
              rows={4}
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
              placeholder="Ví dụ: Điều chỉnh theo kiểm kê tháng 1, lệch do sai số nhập liệu..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setAdjustModalOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleRequestAdjustment} disabled={adjusting}>
              {adjusting ? 'Đang gửi...' : 'Gửi yêu cầu'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

