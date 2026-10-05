import { axiosPrivate as api } from './axios';

export interface ImportStats {
  totalImports: number;
  completed: number;
  completedWithErrors: number;
  failed: number;
  lastImport: DataImport | null;
  totalGrowth: number | null;
  completedGrowth: number | null;
  failedGrowth: number | null;
}

export interface DataImport {
  id: number;
  companyId: number;
  importType: string;
  filename: string;
  uploadedBy: number;
  uploaderName?: string;
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  duplicateRecords: number;
  skippedRecords: number;
  processingProgress: number;  // 0-100
  processingSpeed: number;  // records/min
  status: string;
  createdAt: string;
  completedAt: string | null;
}

export interface ValidationErrorDetail {
  rowNumber: number;
  field?: string;
  errorType: string;
  errorMessage: string;
  rawData?: Record<string, string>;
}

export interface DetailedValidationResponse {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  duplicateRecords: number;
  validationErrors: ValidationErrorDetail[];
  previewData: Record<string, string>[];
}

export interface ImportPreviewResponse {
  importId: number;
  columns: string[];
  previewData: Record<string, string>[];
  totalRows: number;
}

export interface DataImportError {
  id: number;
  importId: number;
  rowNumber: number;
  errorType: string;
  errorMessage: string;
  rawData: string | null;
}

export const importApi = {
  getStats: async (): Promise<ImportStats> => {
    const response = await api.get('/import/stats');
    return response.data;
  },
  
  uploadFile: async (file: File, importType: string): Promise<ImportPreviewResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('import_type', importType);
    
    const response = await api.post('/import/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },
  
  validateImport: async (importId: number): Promise<DetailedValidationResponse> => {
    const response = await api.post(`/import/${importId}/validate`);
    return response.data;
  },
  
  processImport: async (importId: number): Promise<DataImport> => {
    const response = await api.post(`/import/${importId}/process`);
    return response.data;
  },
  
  getStatus: async (importId: number): Promise<DataImport> => {
    const response = await api.get(`/import/${importId}/status`);
    return response.data;
  },
  
  getHistory: async (page?: number, limit?: number): Promise<DataImport[]> => {
    const response = await api.get('/import/history', { params: { page, limit } });
    return response.data;
  },
  
  getImport: async (importId: number): Promise<DataImport> => {
    const response = await api.get(`/import/${importId}`);
    return response.data;
  },
  
  getErrors: async (importId: number, page?: number, limit?: number): Promise<DataImportError[]> => {
    const response = await api.get(`/import/${importId}/errors`, { params: { page, limit } });
    return response.data;
  },
  
  downloadErrorCsv: async (importId: number): Promise<void> => {
    window.location.href = `/api/import/${importId}/error-csv`;
  },
  
  downloadTemplate: async (importType: string): Promise<void> => {
    window.location.href = `/api/import/template/${importType}`;
  },
  
  cancelImport: async (importId: number): Promise<DataImport> => {
    const response = await api.post(`/import/${importId}/cancel`);
    return response.data;
  }
};
