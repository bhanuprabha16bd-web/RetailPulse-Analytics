import { axiosPrivate } from './axios';

// Types
export interface DataQualityIssue {
  id: number;
  companyId: number;
  issueId: string;
  issueType: string;
  severity: string;
  module: string;
  affectedRecord: string;
  resourceType?: string;
  resourceId?: number;
  description: string;
  status: string;
  detectedAt: string;
  resolvedAt?: string;
  resolvedBy?: number;
  resolutionNote?: string;
  relatedData?: string;
  reconciliationId?: number;
}

export interface DataQualityIssueDetail extends DataQualityIssue {
  statusHistory: IssueStatusHistory[];
  relatedDataParsed?: Record<string, any>;
  resolverName?: string;
}

export interface IssueStatusHistory {
  id: number;
  previousStatus: string;
  newStatus: string;
  changedBy: number;
  changedAt: string;
  note?: string;
  userName?: string;
}

export interface ReconciliationRun {
  id: number;
  companyId: number;
  executionId: string;
  startedAt: string;
  completedAt?: string;
  triggeredBy: number;
  triggeredByName?: string;
  recordsChecked: number;
  issuesFound: number;
  issuesResolved: number;
  failedChecks: number;
  status: string;
  errorMessage?: string;
}

export interface ReconciliationSummary {
  totalRecordsChecked: number;
  validRecords: number;
  warningsCount: number;
  errorsCount: number;
  unresolvedIssues: number;
  lastReconciliationTime?: string;
  lastReconciliationStatus?: string;
  changeFromLastRun?: number;
}

export interface PaginatedIssues {
  issues: DataQualityIssue[];
  total: number;
  page: number;
  limit: number;
}

export interface IssueFilters {
  page?: number;
  limit?: number;
  search?: string;
  issueType?: string;
  severity?: string;
  module?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
}

export interface IssueStats {
  byType: { name: string; value: number }[];
  bySeverity: { name: string; value: number }[];
}

export const dataQualityApi = {
  getSummary: async (): Promise<ReconciliationSummary> => {
    const response = await axiosPrivate.get('/data-quality/summary');
    return response.data;
  },
  
  getIssues: async (filters: IssueFilters): Promise<PaginatedIssues> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });
    const response = await axiosPrivate.get(`/data-quality/issues?${params.toString()}`);
    return response.data;
  },
  
  getIssueDetail: async (issueId: number): Promise<DataQualityIssueDetail> => {
    const response = await axiosPrivate.get(`/data-quality/issues/${issueId}`);
    return response.data;
  },
  
  updateIssueStatus: async (issueId: number, data: { newStatus: string; resolutionNote?: string }): Promise<DataQualityIssue> => {
    const response = await axiosPrivate.put(`/data-quality/issues/${issueId}/status`, data);
    return response.data;
  },
  
  runReconciliation: async (): Promise<ReconciliationRun> => {
    const response = await axiosPrivate.post('/data-quality/reconciliation/run');
    return response.data;
  },
  
  getReconciliationHistory: async (page: number = 1, limit: number = 10): Promise<{ history: ReconciliationRun[]; total: number; page: number; limit: number }> => {
    const response = await axiosPrivate.get(`/data-quality/reconciliation/history?page=${page}&limit=${limit}`);
    return response.data;
  },
  
  getIssueStats: async (): Promise<IssueStats> => {
    const response = await axiosPrivate.get('/data-quality/issues/stats');
    return response.data;
  },
};
