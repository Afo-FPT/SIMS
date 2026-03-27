
export type TaskStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TaskType = 'Inbound' | 'Outbound' | 'Inventory Checking';
export type TaskPriority = 'High' | 'Medium' | 'Low';
export type IssueType = 'missing' | 'damaged' | 'miscount' | 'other';

export interface TaskItem {
  sku: string;
  productName: string;
  expectedQty?: number;
  requiredQty?: number;
  currentQty?: number;
  countedQty?: number;
  pickedQty?: number;
  notes?: string;
  hasDiscrepancy?: boolean;
  discrepancyReason?: string;
}

export interface StaffTask {
  id: string;
  taskCode: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  contractCode: string;
  customerName: string;
  assignedBy: string;
  assignedToStaffId?: string;
  assignedToStaffName?: string;
  assignedAt: string;
  preferredExecutionTime?: string;
  dueDate: string;
  completedAt?: string;
  inboundRef?: string;
  outboundRef?: string;
  items: TaskItem[];
  fullCheckRequired?: boolean;
  notes?: string;
  serviceRequestId?: string;
}

export interface Discrepancy {
  id: string;
  taskId: string;
  sku: string;
  issueType: IssueType;
  description: string;
  reportedAt: string;
  attachments?: string[];
}

export interface ScanResult {
  sku: string;
  productName: string;
  shelf: string;
  currentQuantity: number;
  unit: string;
  relatedTaskId?: string;
  relatedTaskCode?: string;
}

export interface ListStaffTasksParams {
  status?: TaskStatus;
  type?: TaskType;
  search?: string;
  page?: number;
  limit?: number;
}

export interface SaveTaskProgressPayload {
  items: TaskItem[];
  notes?: string;
}

export interface ReportDiscrepancyPayload {
  taskId: string;
  sku: string;
  issueType: IssueType;
  description: string;
  attachments?: string[];
}
