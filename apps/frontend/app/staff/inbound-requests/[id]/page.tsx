'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToastHelpers } from '../../../../lib/toast';
import {
  getStorageRequestById,
  listContractShelves,
  staffCompleteStorageRequest,
  type StorageRequestView,
  type ContractShelfOption,
} from '../../../../lib/storage-requests.api';
import { Button } from '../../../../components/ui/Button';
import { Select } from '../../../../components/ui/Select';
import { Input } from '../../../../components/ui/Input';
import { LoadingSkeleton } from '../../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../../components/ui/ErrorState';

export default function StaffInboundPutawayDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToastHelpers();
  const id = params.id as string;

  const [req, setReq] = useState<StorageRequestView | null>(null);
  const [shelves, setShelves] = useState<ContractShelfOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // local editable rows
  const [rows, setRows] = useState<Array<{
    requestDetailId: string;
    shelfId: string;
    quantityActual: string;
    damageQuantity: string;
    lossReason: string;
    notes: string;
  }>>([]);

  const shelfOptions = useMemo(
    () => [
      { value: '', label: 'Select shelf' },
      ...shelves.map((s) => ({ value: s.shelf_id, label: `${s.shelf_code}${s.zone_code ? ` (${s.zone_code})` : ''}` })),
    ],
    [shelves]
  );

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getStorageRequestById(id);
      setReq(data);
      const shelfList = await listContractShelves(data.contract_id);
      setShelves(shelfList);
      setRows(
        data.items.map((it) => ({
          requestDetailId: it.request_detail_id,
          shelfId: it.shelf_id || '',
          quantityActual: it.quantity_actual?.toString() || '',
          damageQuantity: '',
          lossReason: '',
          notes: '',
        }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load inbound request');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const updateRow = (idx: number, patch: Partial<{
    shelfId: string;
    quantityActual: string;
    damageQuantity: string;
    lossReason: string;
    notes: string;
  }>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const formatDate = (s: string) => {
    try {
      return new Date(s).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return s;
    }
  };

  const handleComplete = async () => {
    if (!req) return;
    // validate
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const item = req.items[i];
      if (!r.shelfId) {
        toast.warning('Vui lòng chọn kệ cho tất cả mặt hàng');
        return;
      }
      const actual = Number(r.quantityActual);
      if (isNaN(actual) || actual < 0) {
        toast.warning('Số lượng thực tế phải là số >= 0 cho tất cả mặt hàng');
        return;
      }
      const requested = item.quantity_requested;
      const shortage = requested - actual;
      const damage = Number(r.damageQuantity) || 0;
      if (shortage > 0) {
        if (damage !== shortage) {
          toast.warning(
            `"${item.item_name}": Chênh lệch thiếu ${shortage} ${item.unit}. Số lượng hư hỏng phải bằng ${shortage} ${item.unit}.`
          );
          return;
        }
      } else if (damage > 0 && damage > actual) {
        toast.warning(
          `"${item.item_name}": Số lượng hư hỏng không được vượt quá số lượng thực tế (${actual} ${item.unit}).`
        );
        return;
      }
    }
    try {
      setSaving(true);
      await staffCompleteStorageRequest({
        requestId: req.request_id,
        items: rows.map((r) => ({
          requestDetailId: r.requestDetailId,
          shelfId: r.shelfId,
          quantityActual: Number(r.quantityActual),
          damageQuantity: r.damageQuantity ? Number(r.damageQuantity) : undefined,
          lossReason: r.lossReason || undefined,
          lossNotes: r.notes || undefined,
        })),
      });
      toast.success('Putaway completed. Stored quantities updated.');
      router.push('/staff/inbound-requests');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to complete putaway');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSkeleton className="h-64 w-full" />;
  if (error || !req) {
    return <ErrorState title="Failed to load" message={error || 'Not found'} onRetry={load} />;
  }

  const getDiscrepancy = (idx: number) => {
    const item = req.items[idx];
    const row = rows[idx];
    if (!row || !row.quantityActual) return null;
    const requested = item.quantity_requested;
    const actual = Number(row.quantityActual) || 0;
    return actual - requested;
  };

  return (
    <div className="space-y-6">
      <Link href="/staff/inbound-requests" className="text-sm font-bold text-slate-500 hover:text-primary">
        ← Back
      </Link>

      {/* Request Info */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 mb-2">Putaway {req.reference ?? req.request_id}</h1>
            <div className="space-y-1 text-sm">
              <p><span className="font-bold text-slate-600">Contract code:</span> {req.contract_code ?? req.contract_id}</p>
              <p><span className="font-bold text-slate-600">Customer:</span> {req.customer_id}</p>
              <p><span className="font-bold text-slate-600">Ngày tạo:</span> {formatDate(req.created_at)}</p>
              <p><span className="font-bold text-slate-600">Trạng thái:</span> 
                <span className={`ml-2 px-2 py-0.5 rounded-lg text-xs font-bold ${
                  req.status === 'APPROVED' ? 'bg-blue-100 text-blue-700' :
                  req.status === 'DONE_BY_STAFF' ? 'bg-emerald-100 text-emerald-700' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {req.status}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-start justify-end">
            <div className="bg-slate-50 rounded-xl p-4 text-sm">
              <p className="font-bold text-slate-700 mb-2">Tổng số mặt hàng</p>
              <p className="text-2xl font-black text-slate-900">{req.items.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Chi tiết hàng hóa</h2>
        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-4 py-3 text-left font-bold text-slate-700">STT</th>
                <th className="px-4 py-3 text-left font-bold text-slate-700">Tên hàng</th>
                <th className="px-4 py-3 text-right font-bold text-slate-700">Yêu cầu</th>
                <th className="px-4 py-3 text-left font-bold text-slate-700">Kệ</th>
                <th className="px-4 py-3 text-right font-bold text-slate-700">Thực tế</th>
                <th className="px-4 py-3 text-right font-bold text-slate-700">Chênh lệch</th>
              </tr>
            </thead>
            <tbody>
              {req.items.map((it, idx) => {
                const discrepancy = getDiscrepancy(idx);
                const row = rows[idx];
                return (
                  <tr key={it.request_detail_id} className="border-t border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-slate-600">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-900">{it.item_name}</p>
                        {it.quantity_per_unit && (
                          <p className="text-xs text-slate-500">{it.quantity_per_unit} {it.unit}/đơn vị</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700">
                      {it.quantity_requested} {it.unit}
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={row?.shelfId || ''}
                        onChange={(e) => updateRow(idx, { shelfId: e.target.value })}
                        options={shelfOptions}
                        className="min-w-[140px]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row?.quantityActual ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const requested = it.quantity_requested;
                          const shortage = requested - (Number(val) || 0);
                          const patch: { quantityActual: string; damageQuantity?: string } = { quantityActual: val };
                          if (shortage > 0) patch.damageQuantity = String(shortage);
                          else patch.damageQuantity = '';
                          updateRow(idx, patch);
                        }}
                        placeholder="0"
                        className="w-24 text-right"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {discrepancy !== null && (
                        <span className={`font-bold ${
                          discrepancy > 0 ? 'text-emerald-600' :
                          discrepancy < 0 ? 'text-red-600' :
                          'text-slate-500'
                        }`}>
                          {discrepancy > 0 ? '+' : ''}{discrepancy} {it.unit}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Damage/Loss Reporting */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Báo cáo hao hụt hàng</h2>
        <p className="text-sm text-slate-600">Ghi nhận các trường hợp hàng hư hỏng, thiếu hụt hoặc không đạt chất lượng</p>
        <div className="space-y-4">
          {req.items.map((it, idx) => {
            const row = rows[idx];
            const requested = it.quantity_requested;
            const actual = Number(row?.quantityActual) || 0;
            const damage = Number(row?.damageQuantity) || 0;
            const hasShortage = actual < requested;
            return (
              <div key={it.request_detail_id} className={`border rounded-xl p-4 ${hasShortage || damage > 0 ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-slate-900">{it.item_name}</p>
                    <p className="text-xs text-slate-500">Yêu cầu: {requested} {it.unit} | Thực tế: {actual} {it.unit}</p>
                  </div>
                  {hasShortage && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold">
                      Thiếu {requested - actual} {it.unit}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Số lượng hư hỏng {hasShortage && <span className="text-amber-600">(phải = {requested - actual} {it.unit})</span>}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max={hasShortage ? requested - actual : actual}
                      step="0.01"
                      value={row?.damageQuantity ?? ''}
                      onChange={(e) => updateRow(idx, { damageQuantity: e.target.value })}
                      placeholder={hasShortage ? String(requested - actual) : '0'}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Lý do hao hụt</label>
                    <Select
                      value={row?.lossReason || ''}
                      onChange={(e) => updateRow(idx, { lossReason: e.target.value })}
                      options={[
                        { value: '', label: '— Chọn lý do —' },
                        { value: 'damage', label: 'Hư hỏng trong quá trình vận chuyển' },
                        { value: 'damage_storage', label: 'Hư hỏng do bảo quản' },
                        { value: 'shortage', label: 'Thiếu hụt khi nhận hàng' },
                        { value: 'quality', label: 'Không đạt chất lượng' },
                        { value: 'expired', label: 'Hết hạn sử dụng' },
                        { value: 'other', label: 'Khác' },
                      ]}
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú</label>
                  <textarea
                    value={row?.notes ?? ''}
                    onChange={(e) => updateRow(idx, { notes: e.target.value })}
                    placeholder="Mô tả chi tiết về tình trạng hàng hóa..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-primary/20 text-sm resize-none"
                    rows={2}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-slate-50 rounded-3xl border border-slate-200 p-6">
        <h3 className="text-sm font-bold text-slate-700 mb-3">Tóm tắt</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-slate-600">Tổng số lượng yêu cầu</p>
            <p className="text-xl font-black text-slate-900">
              {req.items.reduce((sum, it) => sum + it.quantity_requested, 0)} {req.items[0]?.unit || ''}
            </p>
          </div>
          <div>
            <p className="text-slate-600">Tổng số lượng thực tế</p>
            <p className="text-xl font-black text-slate-900">
              {rows.reduce((sum, r, idx) => sum + (Number(r.quantityActual) || 0), 0)} {req.items[0]?.unit || ''}
            </p>
          </div>
          <div>
            <p className="text-slate-600">Tổng số lượng hư hỏng</p>
            <p className="text-xl font-black text-red-600">
              {rows.reduce((sum, r) => sum + (Number(r.damageQuantity) || 0), 0)} {req.items[0]?.unit || ''}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => router.push('/staff/inbound-requests')}>Hủy</Button>
        <Button onClick={handleComplete} isLoading={saving}>Hoàn tất putaway</Button>
      </div>
    </div>
  );
}

