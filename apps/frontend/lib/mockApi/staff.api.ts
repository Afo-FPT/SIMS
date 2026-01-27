import type {
  StaffTask,
  Discrepancy,
  ListStaffTasksParams,
  SaveTaskProgressPayload,
  ReportDiscrepancyPayload,
  ScanResult,
} from '../../types/staff';
import { mockStaffTasks, mockDiscrepancies } from '../mock/staff.mock';
import { MOCK_INVENTORY } from '../customer-mock';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldError() {
  return Math.random() < 0.1; // 10% chance
}

export async function listStaffTasks(params: ListStaffTasksParams = {}): Promise<{
  items: StaffTask[];
  total: number;
}> {
  await delay(400 + Math.random() * 300);
  if (shouldError()) {
    throw new Error('Failed to fetch tasks');
  }

  let filtered = [...mockStaffTasks];

  // Filter by status
  if (params.status) {
    filtered = filtered.filter((t) => t.status === params.status);
  }

  // Filter by type
  if (params.type) {
    filtered = filtered.filter((t) => t.type === params.type);
  }

  // Search
  if (params.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        t.taskCode.toLowerCase().includes(q) ||
        t.customerName.toLowerCase().includes(q)
    );
  }

  // Pagination
  const page = params.page || 1;
  const limit = params.limit || 10;
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginated = filtered.slice(start, end);

  return {
    items: paginated,
    total: filtered.length,
  };
}

export async function getStaffTaskById(id: string): Promise<StaffTask> {
  await delay(300 + Math.random() * 200);
  if (shouldError()) {
    throw new Error('Failed to fetch task');
  }

  const task = mockStaffTasks.find((t) => t.id === id);
  if (!task) {
    throw new Error('Task not found');
  }

  return task;
}

export async function startTask(id: string): Promise<StaffTask> {
  await delay(400 + Math.random() * 200);
  if (shouldError()) {
    throw new Error('Failed to start task');
  }

  const index = mockStaffTasks.findIndex((t) => t.id === id);
  if (index === -1) {
    throw new Error('Task not found');
  }

  mockStaffTasks[index].status = 'IN_PROGRESS';
  return mockStaffTasks[index];
}

export async function saveTaskProgress(
  id: string,
  payload: SaveTaskProgressPayload
): Promise<StaffTask> {
  await delay(500 + Math.random() * 200);
  if (shouldError()) {
    throw new Error('Failed to save progress');
  }

  const index = mockStaffTasks.findIndex((t) => t.id === id);
  if (index === -1) {
    throw new Error('Task not found');
  }

  mockStaffTasks[index].items = payload.items;
  if (payload.notes) {
    mockStaffTasks[index].notes = payload.notes;
  }

  return mockStaffTasks[index];
}

export async function completeTask(id: string): Promise<StaffTask> {
  await delay(500 + Math.random() * 200);
  if (shouldError()) {
    throw new Error('Failed to complete task');
  }

  const index = mockStaffTasks.findIndex((t) => t.id === id);
  if (index === -1) {
    throw new Error('Task not found');
  }

  mockStaffTasks[index].status = 'COMPLETED';
  mockStaffTasks[index].completedAt = new Date().toISOString();
  return mockStaffTasks[index];
}

export async function reportDiscrepancy(
  payload: ReportDiscrepancyPayload
): Promise<Discrepancy> {
  await delay(500 + Math.random() * 200);
  if (shouldError()) {
    throw new Error('Failed to report discrepancy');
  }

  const newDiscrepancy: Discrepancy = {
    id: `disc-${mockDiscrepancies.length + 1}`,
    ...payload,
    reportedAt: new Date().toISOString(),
  };

  mockDiscrepancies.push(newDiscrepancy);
  return newDiscrepancy;
}

export async function scanSku(code: string): Promise<ScanResult> {
  await delay(300 + Math.random() * 200);
  if (shouldError()) {
    throw new Error('Failed to scan SKU');
  }

  // Find in inventory
  const item = MOCK_INVENTORY.find((i) => i.sku === code);
  if (!item) {
    throw new Error('SKU not found');
  }

  // Check if related to any active task
  const activeTask = mockStaffTasks.find(
    (t) =>
      t.status !== 'COMPLETED' &&
      t.items.some((i) => i.sku === code)
  );

  return {
    sku: item.sku,
    productName: item.name,
    shelf: item.shelf,
    currentQuantity: item.quantity,
    unit: item.unit,
    relatedTaskId: activeTask?.id,
    relatedTaskCode: activeTask?.taskCode,
  };
}
