import { useState } from 'react';
import {
  Box, Typography, Grid, Button, Stepper, Step, StepLabel
} from '@mui/material';
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { importApi, DataImport, ImportPreviewResponse, ImportValidationResponse } from '../api/importApi';

import ImportConfiguration from '../components/import/ImportConfiguration';
import CSVPreview from '../components/import/CSVPreview';
import ColumnValidation from '../components/import/ColumnValidation';
import ValidationSummary from '../components/import/ValidationSummary';
import ImportResult from '../components/import/ImportResult';
import ImportHistory from '../components/import/ImportHistory';

const steps = ['Select & Upload', 'Preview & Validate', 'Import', 'Result', 'History'];

export default function DataImportPage() {
  const [importType, setImportType] = useState('Products');
  const [file, setFile] = useState<File | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  
  const [previewData, setPreviewData] = useState<ImportPreviewResponse | null>(null);
  const [validationData, setValidationData] = useState<ImportValidationResponse | null>(null);
  const [importResult, setImportResult] = useState<DataImport | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const { data: historyData, refetch: refetchHistory } = useQuery({
    queryKey: ['importHistory'],
    queryFn: importApi.getHistory,
  });

  const handleValidateFile = async () => {
    if (!file) return;
    setIsUploading(true);
    try {
      const preview = await importApi.uploadFile(file, importType);
      setPreviewData(preview);
      setActiveStep(1);
      
      const validation = await importApi.validateImport(preview.importId);
      setValidationData(validation);
      
    } catch (error) {
      console.error("Upload/Validation failed:", error);
      alert("Validation failed. Please check the file and try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleImportData = async () => {
    if (!previewData?.importId) return;
    setIsImporting(true);
    setActiveStep(2);
    try {
      const result = await importApi.processImport(previewData.importId);
      setImportResult(result);
      setActiveStep(3);
      refetchHistory();
    } catch (error) {
      console.error("Import failed:", error);
      alert("Import process failed.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Box sx={{ p: 3, bgcolor: '#f5f7fa', minHeight: '100vh' }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>Data Import & Integration Management</Typography>
          <Typography variant="body2" color="text.secondary">
            Import Products, Customers and Sales Transactions via CSV
          </Typography>
        </Box>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <ImportConfiguration
            importType={importType}
            setImportType={setImportType}
            file={file}
            setFile={setFile}
            handleValidateFile={handleValidateFile}
            isUploading={isUploading}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          {activeStep >= 1 && previewData && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, height: '100%' }}>
              
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 8 }}>
                  <CSVPreview previewData={previewData} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <ColumnValidation importType={importType} />
                </Grid>
              </Grid>

              {validationData && (
                <ValidationSummary validationData={validationData} />
              )}

              {validationData && activeStep === 1 && (
                <Button 
                  variant="contained" 
                  color="primary" 
                  size="large" 
                  fullWidth 
                  startIcon={<CloudUploadIcon />}
                  sx={{ py: 2, fontWeight: 'bold', fontSize: '1.1rem' }}
                  onClick={handleImportData}
                  disabled={isImporting}
                >
                  {isImporting ? 'Importing Data...' : 'Import Data'}
                </Button>
              )}
            </Box>
          )}
        </Grid>
      </Grid>

      <ImportResult 
        isImporting={isImporting} 
        importResult={importResult} 
      />

      <ImportHistory 
        historyData={historyData} 
        refetchHistory={refetchHistory} 
      />
      
    </Box>
  );
}
