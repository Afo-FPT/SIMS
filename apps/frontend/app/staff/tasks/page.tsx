'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import type { StaffTask, TaskStatus, TaskType } from '../../../types/staff';
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

export default function StaffTasksPage() {
  const toast = useToastHelpers();
  const [tasks, setTasks] = useState<StaffTask[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<TaskType | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    loadTasks();
  }, [statusFilter, typeFilter, search, page]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await listStaffTasks({
        status: statusFilter || undefined,
        type: typeFilter || undefined,
        search: search || undefined,
        page,
        limit,
      });
      setTasks(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Tasks</h1>
        <p className="text-slate-500 mt-1">Manage your assigned tasks</p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search by task code or customer name"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          options={[
            { value: '', label: 'All status' },
            { value: 'ASSIGNED', label: 'Assigned' },
            { value: 'IN_PROGRESS', label: 'In Progress' },
            { value: 'COMPLETED', label: 'Completed' },
          ]}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as TaskStatus | '');
            setPage(1);
          }}
        />
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
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : error ? (
        <ErrorState title="Failed to load tasks" message={error} onRetry={loadTasks} />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon="assignment"
          title="No tasks found"
          message="Try adjusting your search or filters"
        />
      ) : (
        <>
          <Table>
            <TableHead>
              <TableHeader>Task code</TableHeader>
              <TableHeader>Customer</TableHeader>
              <TableHeader>Type</TableHeader>
              <TableHeader>Priority</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Due date</TableHeader>
              <TableHeader>Action</TableHeader>
            </TableHead>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-bold text-slate-900">{task.taskCode}</TableCell>
                  <TableCell className="text-slate-700">{task.customerName}</TableCell>
                  <TableCell>
                    <Badge variant="neutral">{task.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        task.priority === 'High'
                          ? 'error'
                          : task.priority === 'Medium'
                            ? 'warning'
                            : 'info'
                      }
                    >
                      {task.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        task.status === 'COMPLETED'
                          ? 'success'
                          : task.status === 'IN_PROGRESS'
                            ? 'info'
                            : 'warning'
                      }
                    >
                      {task.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm">
                    {new Date(task.dueDate).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/staff/tasks/${task.id}`}
                      className="text-sm font-bold text-primary hover:underline"
                    >
                      Open
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
