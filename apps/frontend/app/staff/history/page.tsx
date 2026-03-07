'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import type { StaffTask, TaskType } from '../../../types/staff';
import { listStaffTasks } from '../../../lib/mockApi/staff.api';
import { useToastHelpers } from '../../../lib/toast';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../../../components/ui/Table';
import { LoadingSkeleton, TableSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Pagination } from '../../../components/ui/Pagination';

export default function StaffHistoryPage() {
  const toast = useToastHelpers();
  const [tasks, setTasks] = useState<StaffTask[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TaskType | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    loadHistory();
  }, [typeFilter, startDate, endDate, page]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      // Get all completed tasks first (no pagination limit for date filtering)
      const allResult = await listStaffTasks({
        status: 'COMPLETED',
        type: typeFilter || undefined,
        limit: 1000, // Get all for date filtering
      });

      // Filter by date range if provided
      let filtered = allResult.items;
      if (startDate) {
        filtered = filtered.filter(
          (t) => t.completedAt && new Date(t.completedAt) >= new Date(startDate)
        );
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filtered = filtered.filter(
          (t) => t.completedAt && new Date(t.completedAt) <= end
        );
      }

      // Apply pagination after date filtering
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginated = filtered.slice(start, end);

      setTasks(paginated);
      setTotal(filtered.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">History</h1>
        <p className="text-slate-500 mt-1">Completed tasks history</p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-4 items-end">
        <Select
          options={[
            { value: '', label: 'All types' },
            { value: 'Inbound', label: 'Inbound' },
            { value: 'Outbound', label: 'Outbound' },
            { value: 'Inventory Checking', label: 'Inventory Checking' },
          ]}
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value as TaskType | '');
            setPage(1);
          }}
        />
        <Input
          type="date"
          value={startDate}
          onChange={(e) => {
            setStartDate(e.target.value);
            setPage(1);
          }}
          className="w-auto"
        />
        <Input
          type="date"
          value={endDate}
          onChange={(e) => {
            setEndDate(e.target.value);
            setPage(1);
          }}
          className="w-auto"
        />
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : error ? (
        <ErrorState title="Failed to load history" message={error} onRetry={loadHistory} />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon="history"
          title="No completed tasks"
          message="You haven't completed any tasks yet"
        />
      ) : (
        <>
          <Table>
            <TableHead>
              <TableHeader>Task code</TableHeader>
              <TableHeader>Type</TableHeader>
              <TableHeader>Customer</TableHeader>
              <TableHeader>Completed at</TableHeader>
              <TableHeader>Due date</TableHeader>
              <TableHeader>Action</TableHeader>
            </TableHead>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-bold text-slate-900">{task.taskCode}</TableCell>
                  <TableCell>
                    <Badge variant="neutral">{task.type}</Badge>
                  </TableCell>
                  <TableCell className="text-slate-700">{task.customerName}</TableCell>
                  <TableCell className="text-slate-600 text-sm">
                    {task.completedAt
                      ? new Date(task.completedAt).toLocaleString()
                      : '—'}
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm">
                    {new Date(task.dueDate).toLocaleDateString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/staff/tasks/${task.id}`}
                      className="text-sm font-bold text-primary hover:underline"
                    >
                      View
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
