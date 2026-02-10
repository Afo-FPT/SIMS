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
  { value: '', label: '-- Select type (optional) --' },
  { value: 'damage', label: 'Damage' },
  { value: 'safety', label: 'Safety' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'other', label: 'Other' },
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
      toast.warning('Note is required. Please describe the warehouse issue.');
      return;
    }
    try {
      setSubmitting(true);
      await createWarehouseIssueReport({ note: trimmed, type });
      toast.success('Issue report submitted.');
      setNote('');
      setType(undefined);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Warehouse issue report
        </h1>
        <p className="text-slate-500 mt-1">
          Report any warehouse issues. Note is required.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm max-w-2xl"
      >
        <div className="space-y-6">
          <Select
            label="Issue type (optional)"
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
              Note / description <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={5}
              placeholder="Describe the warehouse issue (required)..."
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
            />
            <p className="text-xs text-slate-500 mt-1">
              A note is required to submit a report.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit report'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
