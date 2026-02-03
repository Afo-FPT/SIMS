'use client';

import React, { useState } from 'react';
import {
  createWarehouseIssueReport,
  type CreateWarehouseIssueReportPayload,
} from '../../../lib/warehouse-issue-report.api';
import { useToastHelpers } from '../../../lib/toast';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';

const REPORT_TYPES: { value: string; label: string }[] = [
  { value: '', label: '-- Chọn loại (tùy chọn) --' },
  { value: 'damage', label: 'Hư hỏng / Damage' },
  { value: 'safety', label: 'An toàn / Safety' },
  { value: 'equipment', label: 'Thiết bị / Equipment' },
  { value: 'inventory', label: 'Tồn kho / Inventory' },
  { value: 'other', label: 'Khác / Other' },
];

export default function StaffReportIssuePage() {
  const toast = useToastHelpers();
  const [note, setNote] = useState('');
  const [type, setType] = useState<CreateWarehouseIssueReportPayload['type']>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = note.trim();
    if (!trimmed) {
      toast.warning('Ghi chú là bắt buộc. Vui lòng mô tả vấn đề về kho.');
      return;
    }
    try {
      setSubmitting(true);
      await createWarehouseIssueReport({ note: trimmed, type });
      toast.success('Đã gửi báo cáo sự cố.');
      setNote('');
      setType(undefined);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gửi báo cáo thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Báo cáo sự cố kho
        </h1>
        <p className="text-slate-500 mt-1">
          Báo cáo khi có vấn đề về kho. Ghi chú là bắt buộc.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm max-w-2xl"
      >
        <div className="space-y-6">
          <Select
            label="Loại sự cố (tùy chọn)"
            options={REPORT_TYPES}
            value={type ?? ''}
            onChange={(e) =>
              setType(
                e.target.value
                  ? (e.target.value as CreateWarehouseIssueReportPayload['type'])
                  : undefined
              )
            }
          />

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Ghi chú / Mô tả vấn đề <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={5}
              placeholder="Mô tả chi tiết vấn đề về kho (bắt buộc)..."
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
            />
            <p className="text-xs text-slate-500 mt-1">
              Bắt buộc phải có ghi chú để báo cáo sự cố.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Đang gửi...' : 'Gửi báo cáo'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
