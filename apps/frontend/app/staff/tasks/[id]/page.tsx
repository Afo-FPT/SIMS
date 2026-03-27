'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { StaffTask, TaskItem, IssueType } from '../../../../types/staff';
import {
  getStaffTaskById,
  startTask,
  saveTaskProgress,
  completeTask,
  reportDiscrepancy,
} from '../../../../lib/mockApi/staff.api';
import { useToastHelpers } from '../../../../lib/toast';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Select } from '../../../../components/ui/Select';
import { Badge } from '../../../../components/ui/Badge';
import { Modal } from '../../../../components/ui/Modal';
import { LoadingSkeleton } from '../../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../../../../components/ui/Table';

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToastHelpers();
  const taskId = params.id as string;

  const [task, setTask] = useState<StaffTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<TaskItem[]>([]);
  const [notes, setNotes] = useState('');
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issueSku, setIssueSku] = useState('');
  const [issueType, setIssueType] = useState<IssueType>('missing');
  const [issueDesc, setIssueDesc] = useState('');

  useEffect(() => {
    loadTask();
  }, [taskId]);

  const loadTask = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getStaffTaskById(taskId);
      setTask(data);
      setItems([...data.items]);
      setNotes(data.notes || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load task');
      toast.error('Failed to load task');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTask = async () => {
    try {
      const updated = await startTask(taskId);
      setTask(updated);
      setItems([...updated.items]); // Ensure items are synced
      toast.success('Task started successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start task');
    }
  };

  const handleSaveProgress = async () => {
    try {
      await saveTaskProgress(taskId, { items, notes });
      toast.success('Progress saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save progress');
    }
  };

  const handleCompleteTask = async () => {
    try {
      // Validation
      if (task?.type === 'Inbound') {
        const incomplete = items.some(
          (i) => i.countedQty === undefined || i.countedQty === null || i.countedQty < 0
        );
        if (incomplete) {
          toast.warning('Please enter counted quantity for all items before submitting');
          return;
        }
      } else if (task?.type === 'Outbound') {
        const incomplete = items.some(
          (i) => i.pickedQty === undefined || i.pickedQty === null || i.pickedQty < 0
        );
        if (incomplete) {
          toast.warning('Please enter picked quantity for all items before submitting');
          return;
        }
      } else if (task?.type === 'Inventory Checking') {
        if (task.fullCheckRequired) {
          const incomplete = items.some(
            (i) => i.countedQty === undefined || i.countedQty === null || i.countedQty < 0
          );
          if (incomplete) {
            toast.warning('Full inventory check required. Please count all SKUs before submitting.');
            return;
          }
        } else {
          const incomplete = items.some(
            (i) => i.countedQty === undefined || i.countedQty === null || i.countedQty < 0
          );
          if (incomplete) {
            toast.warning('Please complete all counts before submitting');
            return;
          }
        }
      }

      const updated = await completeTask(taskId);
      setTask(updated);
      toast.success('Task completed successfully');
      setTimeout(() => router.push('/staff/tasks'), 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to complete task');
    }
  };

  const handleReportIssue = async () => {
    try {
      if (!issueSku || !issueDesc) {
        toast.warning('Please fill in SKU and description');
        return;
      }
      await reportDiscrepancy({
        taskId,
        sku: issueSku,
        issueType,
        description: issueDesc,
      });
      toast.success('Issue reported successfully');
      setIssueModalOpen(false);
      setIssueSku('');
      setIssueDesc('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to report issue');
    }
  };

  const updateItem = (index: number, field: keyof TaskItem, value: any) => {
    const newItems = [...items];
    if (field === 'countedQty' || field === 'pickedQty') {
      // Allow empty string for number inputs, convert to undefined
      newItems[index] = {
        ...newItems[index],
        [field]: value === '' || value === null ? undefined : Number(value) || 0,
      };
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    setItems(newItems);
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <LoadingSkeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="space-y-8">
        <ErrorState
          title="Failed to load task"
          message={error || 'Task not found'}
          onRetry={loadTask}
        />
      </div>
    );
  }

  const canEdit = task.status === 'IN_PROGRESS';
  const isCompleted = task.status === 'COMPLETED';

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/staff/tasks"
          className="text-slate-500 hover:text-primary font-bold flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Back
        </Link>
      </div>

      {/* Task Summary */}
      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900">{task.taskCode}</h1>
            <p className="text-slate-500 mt-1">Task detail</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="neutral">{task.type}</Badge>
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
            <Badge
              variant={
                task.priority === 'High' ? 'error' : task.priority === 'Medium' ? 'warning' : 'info'
              }
            >
              {task.priority}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-500 mb-1">Contract code</p>
            <p className="font-bold text-slate-900">{task.contractCode}</p>
          </div>
          <div>
            <p className="text-slate-500 mb-1">Customer</p>
            <p className="font-bold text-slate-900">{task.customerName}</p>
          </div>
          <div>
            <p className="text-slate-500 mb-1">Assigned by</p>
            <p className="font-bold text-slate-900">{task.assignedBy}</p>
          </div>
          <div>
            <p className="text-slate-500 mb-1">Due date</p>
            <p className="font-bold text-slate-900">
              {new Date(task.dueDate).toLocaleString()}
            </p>
          </div>
          {task.preferredExecutionTime && (
            <div>
              <p className="text-slate-500 mb-1">Preferred execution time</p>
              <p className="font-bold text-slate-900">
                {new Date(task.preferredExecutionTime).toLocaleString()}
              </p>
            </div>
          )}
          {task.inboundRef && (
            <div>
              <p className="text-slate-500 mb-1">Inbound reference</p>
              <p className="font-bold text-slate-900">{task.inboundRef}</p>
            </div>
          )}
          {task.outboundRef && (
            <div>
              <p className="text-slate-500 mb-1">Outbound reference</p>
              <p className="font-bold text-slate-900">{task.outboundRef}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {!isCompleted && (
          <div className="flex gap-3 mt-6 pt-6 border-t border-slate-100">
            {task.status === 'ASSIGNED' && (
              <Button onClick={handleStartTask}>Start Task</Button>
            )}
            {task.status === 'IN_PROGRESS' && (
              <>
                <Button variant="secondary" onClick={handleSaveProgress}>
                  Save progress
                </Button>
                <Button onClick={handleCompleteTask}>Mark as Completed</Button>
                <Button variant="ghost" onClick={() => setIssueModalOpen(true)}>
                  Report Issue
                </Button>
              </>
            )}
          </div>
        )}
      </section>

      {/* Full Check Warning */}
      {task.type === 'Inventory Checking' && task.fullCheckRequired && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-6">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-amber-600 text-2xl">warning</span>
            <div>
              <p className="font-black text-amber-900">FULL INVENTORY CHECK REQUIRED</p>
              <p className="text-sm text-amber-700 mt-1">
                You must count all SKUs before submitting. This is mandatory for inventory
                adjustments.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Task Execution */}
      {task.type === 'Inbound' && (
        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-900 mb-4">Inbound items</h2>
          <Table>
            <TableHead>
              <TableHeader>SKU</TableHeader>
              <TableHeader>Product name</TableHeader>
              <TableHeader>Expected qty</TableHeader>
              <TableHeader>Counted qty</TableHeader>
              <TableHeader>Notes</TableHeader>
            </TableHead>
            <TableBody>
              {items.map((item, i) => (
                <TableRow key={i}>
                  <TableCell className="font-bold text-slate-900">{item.sku}</TableCell>
                  <TableCell className="text-slate-700">{item.productName}</TableCell>
                  <TableCell className="text-slate-600">{item.expectedQty}</TableCell>
                  <TableCell>
                    {canEdit ? (
                      <Input
                        type="number"
                        min={0}
                        value={item.countedQty ?? ''}
                        onChange={(e) => updateItem(i, 'countedQty', e.target.value)}
                        className="w-24"
                      />
                    ) : (
                      <span className="text-slate-700">{item.countedQty ?? 0}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {canEdit ? (
                      <Input
                        value={item.notes || ''}
                        onChange={(e) => updateItem(i, 'notes', e.target.value)}
                        placeholder="Optional notes"
                        className="w-48"
                      />
                    ) : (
                      <span className="text-slate-600 text-sm">{item.notes || '—'}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}

      {task.type === 'Outbound' && (
        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-900 mb-4">Outbound items</h2>
          <Table>
            <TableHead>
              <TableHeader>SKU</TableHeader>
              <TableHeader>Product name</TableHeader>
              <TableHeader>Required qty</TableHeader>
              <TableHeader>Picked qty</TableHeader>
              <TableHeader>Notes</TableHeader>
            </TableHead>
            <TableBody>
              {items.map((item, i) => (
                <TableRow key={i}>
                  <TableCell className="font-bold text-slate-900">{item.sku}</TableCell>
                  <TableCell className="text-slate-700">{item.productName}</TableCell>
                  <TableCell className="text-slate-600">{item.requiredQty}</TableCell>
                  <TableCell>
                    {canEdit ? (
                      <Input
                        type="number"
                        min={0}
                        value={item.pickedQty ?? ''}
                        onChange={(e) => updateItem(i, 'pickedQty', e.target.value)}
                        className="w-24"
                      />
                    ) : (
                      <span className="text-slate-700">{item.pickedQty ?? 0}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {canEdit ? (
                      <Input
                        value={item.notes || ''}
                        onChange={(e) => updateItem(i, 'notes', e.target.value)}
                        placeholder="Optional notes"
                        className="w-48"
                      />
                    ) : (
                      <span className="text-slate-600 text-sm">{item.notes || '—'}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}

      {task.type === 'Inventory Checking' && (
        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-900 mb-4">Inventory checking</h2>
          <Table>
            <TableHead>
              <TableHeader>SKU</TableHeader>
              <TableHeader>Product name</TableHeader>
              <TableHeader>Current qty</TableHeader>
              <TableHeader>Counted qty</TableHeader>
              <TableHeader>Discrepancy</TableHeader>
              <TableHeader>Reason</TableHeader>
            </TableHead>
            <TableBody>
              {items.map((item, i) => {
                const hasDiscrepancy =
                  item.countedQty !== undefined &&
                  item.currentQty !== undefined &&
                  item.countedQty !== item.currentQty;

                return (
                  <TableRow key={i}>
                    <TableCell className="font-bold text-slate-900">{item.sku}</TableCell>
                    <TableCell className="text-slate-700">{item.productName}</TableCell>
                    <TableCell className="text-slate-600">{item.currentQty}</TableCell>
                    <TableCell>
                      {canEdit ? (
                        <Input
                          type="number"
                          min={0}
                          value={item.countedQty ?? ''}
                          onChange={(e) => updateItem(i, 'countedQty', e.target.value)}
                          className="w-24"
                        />
                      ) : (
                        <span className="text-slate-700">{item.countedQty ?? 0}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {canEdit ? (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.hasDiscrepancy || false}
                            onChange={(e) => updateItem(i, 'hasDiscrepancy', e.target.checked)}
                            className="rounded border-slate-300"
                          />
                          <span className="text-sm">Mark discrepancy</span>
                        </label>
                      ) : (
                        <Badge variant={hasDiscrepancy ? 'warning' : 'success'}>
                          {hasDiscrepancy ? 'Yes' : 'No'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {canEdit && item.hasDiscrepancy ? (
                        <Select
                          options={[
                            { value: 'missing', label: 'Missing' },
                            { value: 'damaged', label: 'Damaged' },
                            { value: 'miscount', label: 'Miscount' },
                            { value: 'other', label: 'Other' },
                          ]}
                          value={item.discrepancyReason || 'missing'}
                          onChange={(e) =>
                            updateItem(i, 'discrepancyReason', e.target.value as IssueType)
                          }
                          className="w-32"
                        />
                      ) : (
                        <span className="text-slate-600 text-sm">
                          {item.discrepancyReason || '—'}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </section>
      )}

      {/* Notes */}
      {canEdit && (
        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-900 mb-4">Notes</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Add notes about this task..."
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
          />
        </section>
      )}

      {/* Report Issue Modal */}
      <Modal
        open={issueModalOpen}
        onOpenChange={setIssueModalOpen}
        title="Report Issue / Discrepancy"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="SKU"
            value={issueSku}
            onChange={(e) => setIssueSku(e.target.value)}
            placeholder="Enter SKU"
            required
          />
          <Select
            label="Issue type"
            value={issueType}
            onChange={(e) => setIssueType(e.target.value as IssueType)}
            options={[
              { value: 'missing', label: 'Missing' },
              { value: 'damaged', label: 'Damaged' },
              { value: 'miscount', label: 'Miscount' },
              { value: 'other', label: 'Other' },
            ]}
          />
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
            <textarea
              value={issueDesc}
              onChange={(e) => setIssueDesc(e.target.value)}
              rows={4}
              placeholder="Describe the issue..."
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
              required
            />
          </div>
          <div className="flex gap-3 justify-end pt-4">
            <Button variant="ghost" onClick={() => setIssueModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReportIssue}>Submit</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
