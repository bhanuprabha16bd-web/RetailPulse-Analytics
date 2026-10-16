import { axiosPrivate as api } from './axios';

export type WorkflowStatus = 'Pending Approval' | 'Approved' | 'Rejected' | 'Cancelled' | 'Draft' | 'Submitted';
export type WorkflowPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type WorkflowRequestType =
  | 'Stock Adjustment'
  | 'Product Deactivation'
  | 'Product Price Change'
  | 'Customer Information Change'
  | 'Inventory Import Approval';

export interface WorkflowHistoryItem {
  id: number;
  action: string;
  fromStatus?: string;
  toStatus?: string;
  performedBy: number;
  performerName?: string;
  note?: string;
  createdAt: string;
}

export interface WorkflowComment {
  id: number;
  comment: string;
  commentedBy: number;
  authorName?: string;
  createdAt: string;
}

export interface WorkflowRequest {
  id: number;
  requestId: string;           // e.g. "REQ-0001"
  companyId: number;
  requestType: WorkflowRequestType;
  requestedBy: number;
  requesterName?: string;
  requesterEmail?: string;
  relatedRecordType?: string;
  relatedRecordId?: number;
  relatedRecordLabel?: string;
  currentValues?: Record<string, any>;
  requestedValues?: Record<string, any>;
  reason: string;
  priority: WorkflowPriority;
  status: WorkflowStatus;
  reviewedBy?: number;
  reviewerName?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt?: string;
  history: WorkflowHistoryItem[];
  comments: WorkflowComment[];
}

export interface WorkflowStats {
  totalRequests: number;
  pendingApproval: number;
  approved: number;
  rejected: number;
  cancelled: number;
  pendingGrowth?: number | null;
  totalGrowth?: number | null;
}

export interface WorkflowConfig {
  id: number;
  companyId: number;
  requestType: string;
  approverRole: string;
  requireReason: boolean;
  allowSelfApprove: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateWorkflowRequest {
  requestType: string;
  relatedRecordType?: string;
  relatedRecordId?: number;
  relatedRecordLabel?: string;
  currentValues?: Record<string, any>;
  requestedValues?: Record<string, any>;
  reason: string;
  priority?: string;
}

export interface ListWorkflowParams {
  page?: number;
  limit?: number;
  status?: string;
  request_type?: string;
  my_requests?: boolean;
  search?: string;
}

export const workflowApi = {
  getStats: (): Promise<WorkflowStats> =>
    api.get('/workflows/stats').then(r => r.data),

  getPendingCount: (): Promise<{ count: number }> =>
    api.get('/workflows/pending-count').then(r => r.data),

  // Backend returns a plain array
  listRequests: (params: ListWorkflowParams = {}): Promise<WorkflowRequest[]> =>
    api.get('/workflows/', { params }).then(r => r.data),

  // Get by REQ-XXXX string ID
  getRequest: (requestId: string): Promise<WorkflowRequest> =>
    api.get(`/workflows/${requestId}`).then(r => r.data),

  createRequest: (data: CreateWorkflowRequest): Promise<WorkflowRequest> =>
    api.post('/workflows/', data).then(r => r.data),

  approveRequest: (requestId: string, comment?: string): Promise<WorkflowRequest> =>
    api.post(`/workflows/${requestId}/approve`, { comment }).then(r => r.data),

  rejectRequest: (requestId: string, rejectionReason: string, comment?: string): Promise<WorkflowRequest> =>
    api.post(`/workflows/${requestId}/reject`, { rejectionReason, comment }).then(r => r.data),

  cancelRequest: (requestId: string): Promise<WorkflowRequest> =>
    api.post(`/workflows/${requestId}/cancel`).then(r => r.data),

  addComment: (requestId: string, comment: string): Promise<WorkflowComment> =>
    api.post(`/workflows/${requestId}/comments`, { comment }).then(r => r.data),

  getConfig: (): Promise<WorkflowConfig[]> =>
    api.get('/workflows/config').then(r => r.data),

  updateConfig: (configId: number, data: Partial<WorkflowConfig>): Promise<WorkflowConfig> =>
    api.put(`/workflows/config/${configId}`, data).then(r => r.data),
};
