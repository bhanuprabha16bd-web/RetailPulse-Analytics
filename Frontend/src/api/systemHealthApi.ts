import { axiosPrivate } from './axios';

// ─────────────────── Types ───────────────────

export interface SystemOverview {
  overall_status: 'Healthy' | 'Degraded' | 'Unavailable';
  api_availability_pct: number;
  avg_response_time_ms: number;
  failed_api_requests: number;
  total_api_requests: number;
  jobs_completed: number;
  jobs_failed: number;
  jobs_active: number;
  jobs_pending: number;
  open_errors: number;
  open_incidents: number;
  last_health_check: string | null;
  components: ComponentHealth[];
  recent_alerts: RecentAlert[];
}

export interface ComponentHealth {
  component: string;
  status: 'Healthy' | 'Degraded' | 'Unavailable';
  response_time_ms: number | null;
  error_message: string | null;
  checked_at: string | null;
}

export interface RecentAlert {
  id: number;
  title: string;
  message: string;
  priority: string;
  created_at: string;
  is_read: boolean;
}

export interface ApiMetric {
  id: number;
  endpoint: string;
  method: string;
  status_code: number;
  response_time_ms: number;
  is_error: boolean;
  error_category: string | null;
  created_at: string;
}

export interface PaginatedApiMetrics {
  metrics: ApiMetric[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiTrend {
  timestamp: string;
  avg_response_time_ms: number;
  error_rate_pct: number;
  total_requests: number;
}

export interface EndpointSummary {
  endpoint: string;
  method: string;
  count: number;
  avg_response_time_ms: number;
  error_count: number;
  error_rate_pct: number;
}

export interface BackgroundJob {
  id: number;
  job_id: string;
  job_type: string;
  triggered_by_name: string | null;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  status: 'Pending' | 'Running' | 'Completed' | 'Failed' | 'Cancelled';
  retry_count: number;
  failure_reason: string | null;
  source_record_type: string | null;
  source_record_id: number | null;
  metadata: Record<string, unknown>;
}

export interface PaginatedJobs {
  jobs: BackgroundJob[];
  total: number;
  page: number;
  limit: number;
}

export interface SystemError {
  id: number;
  error_id: string;
  category: string;
  component: string;
  endpoint_or_job: string | null;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  occurrence_count: number;
  first_seen_at: string;
  last_seen_at: string;
  status: 'Open' | 'Investigating' | 'Resolved';
  resolution_notes: string | null;
  sample_message: string | null;
}

export interface PaginatedErrors {
  errors: SystemError[];
  total: number;
  page: number;
  limit: number;
}

export interface ErrorDistribution {
  distribution: { category: string; count: number }[];
}

export interface IncidentTimelineEntry {
  id: number;
  action: string;
  status_from: string | null;
  status_to: string | null;
  performed_by_name: string | null;
  notes: string | null;
  created_at: string;
}

export interface Incident {
  id: number;
  incident_id: string;
  title: string;
  description: string | null;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Open' | 'Investigating' | 'Resolved';
  affected_components: string[];
  detected_at: string;
  resolved_at: string | null;
  resolution_notes: string | null;
  timeline?: IncidentTimelineEntry[];
}

export interface PaginatedIncidents {
  incidents: Incident[];
  total: number;
  page: number;
  limit: number;
}

export interface MonitoringThreshold {
  id: number;
  threshold_key: string;
  threshold_value: number;
  is_active: boolean;
  description: string;
}

// ─────────────────── API Client ───────────────────

export const systemHealthApi = {
  // Overview
  getOverview: async (): Promise<SystemOverview> => {
    const response = await axiosPrivate.get('/system-health/overview');
    return response.data;
  },

  // Health check
  runHealthCheck: async (): Promise<{ message: string; results: ComponentHealth[] }> => {
    const response = await axiosPrivate.post('/system-health/run-health-check');
    return response.data;
  },

  getComponents: async (): Promise<{ components: ComponentHealth[] }> => {
    const response = await axiosPrivate.get('/system-health/components');
    return response.data;
  },

  // API Metrics
  getApiMetrics: async (params?: {
    page?: number;
    limit?: number;
    endpoint?: string;
    method?: string;
    status_code?: number;
    is_error?: boolean;
    start_date?: string;
    end_date?: string;
    sort_by?: string;
  }): Promise<PaginatedApiMetrics> => {
    const response = await axiosPrivate.get('/system-health/api-metrics', { params });
    return response.data;
  },

  getApiTrends: async (hours?: number): Promise<{ trends: ApiTrend[] }> => {
    const response = await axiosPrivate.get('/system-health/api-metrics/trends', { params: { hours } });
    return response.data;
  },

  getEndpointSummary: async (): Promise<{ summary: EndpointSummary[] }> => {
    const response = await axiosPrivate.get('/system-health/api-metrics/endpoint-summary');
    return response.data;
  },

  // Background Jobs
  getJobs: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    job_type?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
    sort_by?: string;
  }): Promise<PaginatedJobs> => {
    const response = await axiosPrivate.get('/system-health/jobs', { params });
    return response.data;
  },

  getJobDetail: async (jobId: string): Promise<BackgroundJob> => {
    const response = await axiosPrivate.get(`/system-health/jobs/${jobId}`);
    return response.data;
  },

  retryJob: async (jobId: string): Promise<{ message: string; job_id: string; retry_count: number }> => {
    const response = await axiosPrivate.post(`/system-health/jobs/${jobId}/retry`);
    return response.data;
  },

  cancelJob: async (jobId: string): Promise<{ message: string; job_id: string }> => {
    const response = await axiosPrivate.post(`/system-health/jobs/${jobId}/cancel`);
    return response.data;
  },

  // System Errors
  getErrors: async (params?: {
    page?: number;
    limit?: number;
    severity?: string;
    category?: string;
    status?: string;
    component?: string;
    start_date?: string;
    end_date?: string;
    sort_by?: string;
  }): Promise<PaginatedErrors> => {
    const response = await axiosPrivate.get('/system-health/errors', { params });
    return response.data;
  },

  getErrorDistribution: async (): Promise<ErrorDistribution> => {
    const response = await axiosPrivate.get('/system-health/errors/distribution');
    return response.data;
  },

  updateError: async (errorId: number, data: { status?: string; resolution_notes?: string }): Promise<void> => {
    await axiosPrivate.patch(`/system-health/errors/${errorId}`, null, { params: data });
  },

  // Incidents
  getIncidents: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    severity?: string;
    sort_by?: string;
  }): Promise<PaginatedIncidents> => {
    const response = await axiosPrivate.get('/system-health/incidents', { params });
    return response.data;
  },

  getIncidentDetail: async (incidentId: string): Promise<Incident> => {
    const response = await axiosPrivate.get(`/system-health/incidents/${incidentId}`);
    return response.data;
  },

  updateIncident: async (
    incidentId: string,
    data: { status?: string; notes?: string; resolution_notes?: string }
  ): Promise<Incident> => {
    const response = await axiosPrivate.patch(`/system-health/incidents/${incidentId}`, data);
    return response.data;
  },

  createIncident: async (data: {
    title: string;
    description?: string;
    severity?: string;
    affected_components?: string[];
  }): Promise<Incident> => {
    const response = await axiosPrivate.post('/system-health/incidents', null, { params: data });
    return response.data;
  },

  // Thresholds
  getThresholds: async (): Promise<{ thresholds: MonitoringThreshold[] }> => {
    const response = await axiosPrivate.get('/system-health/thresholds');
    return response.data;
  },

  updateThresholds: async (thresholds: Record<string, number>): Promise<void> => {
    await axiosPrivate.put('/system-health/thresholds', { thresholds });
  },

  // System info
  getSystemInfo: async (): Promise<Record<string, string>> => {
    const response = await axiosPrivate.get('/system-health/system-info');
    return response.data;
  },
};
