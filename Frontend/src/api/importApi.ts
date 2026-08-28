import { axiosPrivate as api } from './axios';

export interface DataImport {
  id: number;
  importType: string;
  filename: string;
  uploadedBy: number;
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  duplicateRecords: number;
  status: string;
  createdAt: string;
  completedAt?: string;
}

export interface ImportPreviewResponse {
  importId: number;
  columns: string[];
  previewData: any[];
  totalRows: number;
}

export interface ImportValidationResponse {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  duplicateRecords: number;
}

export interface DataImportError {
  id: number;
  importId: number;
  rowNumber: number;
  errorType: string;
  errorMessage: string;
  rawData?: string;
}

export const importApi = {
  uploadFile: async (file: File, importType: string): Promise<ImportPreviewResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('import_type', importType);
    
    const response = await api.post('/import/upload', formData, {
      headers: {
        'Content-Type': undefined
      }
    });
    return response.data;
  },
  
  validateImport: async (importId: number): Promise<ImportValidationResponse> => {
    const response = await api.post(`/import/${importId}/validate`);
    return response.data;
  },
  
  processImport: async (importId: number): Promise<DataImport> => {
    const response = await api.post(`/import/${importId}/process`);
    return response.data;
  },
  
  getHistory: async (): Promise<DataImport[]> => {
    const response = await api.get('/import/history');
    return response.data;
  },
  
  getErrors: async (importId: number): Promise<DataImportError[]> => {
    const response = await api.get(`/import/${importId}/errors`);
    return response.data;
  },
};
