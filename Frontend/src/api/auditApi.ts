import { axiosPrivate } from './axios';

export interface AuditLog {
  id: number;
  companyId?: number;
  userId?: number;
  action: string;
  resourceType?: string;
  resourceId?: string;
  description?: string;
  status: string;
  beforeValues?: string;
  afterValues?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  company?: { id: number; name: string };
  user?: { id: number; name: string; email: string };
}

export interface PaginatedAuditLogs {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
}

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  userId?: number;
  action?: string;
  resourceType?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  sortBy?: string;
}

export const fetchAuditLogs = async (filters: AuditLogFilters): Promise<PaginatedAuditLogs> => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value.toString());
    }
  });
  const response = await axiosPrivate.get(`/audit-logs?${params.toString()}`);
  return response.data;
};

export const fetchAuditLogById = async (id: number): Promise<AuditLog> => {
  const response = await axiosPrivate.get(`/audit-logs/${id}`);
  return response.data;
};

export const clearAuditLogs = async (confirm: boolean): Promise<{ message: string }> => {
  const response = await axiosPrivate.delete(`/audit-logs/clear?confirm=${confirm}`);
  return response.data;
};

export const exportAuditLogs = async (format: 'csv' | 'pdf', filters: Omit<AuditLogFilters, 'page' | 'limit'>): Promise<Blob> => {
  const params = new URLSearchParams();
  params.append('format', format);
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value.toString());
    }
  });
  const response = await axiosPrivate.get(`/audit-logs/export?${params.toString()}`, {
    responseType: 'blob',
  });
  return response.data;
};
