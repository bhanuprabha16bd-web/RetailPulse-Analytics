export const reportTypes = [
  { value: 'sales', label: 'Sales Report' },
  { value: 'inventory', label: 'Inventory Report' },
  { value: 'customer', label: 'Customer Report' },
  { value: 'product-performance', label: 'Product Performance Report' },
  { value: 'stock-movement', label: 'Stock Movement Report' },
];

export type Filters = {
  start_date: string;
  end_date: string;
  product_id: string;
  category_id: string;
  brand: string;
  customer_id: string;
  sales_status: string;
  stock_status: string;
  user_id: string;
};

export type ReportResponse = {
  report_name: string;
  filters: Record<string, string | number>;
  rows: Record<string, unknown>[];
  total: number;
  page: number;
  limit: number;
};

export type Schedule = {
  id: number;
  report_type: string;
  reportType?: string;
  filters: Record<string, unknown>;
  frequency: string;
  execution_time: string;
  executionTime?: string;
  recipients: string[];
  format: string;
  is_active: boolean;
  isActive?: boolean;
  last_run_at?: string;
  lastRunAt?: string;
  last_status?: string;
  lastStatus?: string;
  last_error?: string;
  lastError?: string;
};

export type History = {
  id: number;
  report_type?: string;
  reportType?: string;
  generated_by?: number;
  generatedBy?: number;
  filters: Record<string, unknown>;
  format: string;
  status: string;
  error_message?: string;
  errorMessage?: string;
  created_at?: string;
  createdAt?: string;
};

export type ScheduleDraft = {
  frequency: string;
  execution_time: string;
  recipients: string;
  format: string;
  is_active: boolean;
};

export const initialFilters: Filters = {
  start_date: '',
  end_date: '',
  product_id: '',
  category_id: '',
  brand: '',
  customer_id: '',
  sales_status: '',
  stock_status: '',
  user_id: '',
};
