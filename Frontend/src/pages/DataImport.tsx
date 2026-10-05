import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Paper, List, ListItem, ListItemText, ListItemIcon } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ScheduleIcon from '@mui/icons-material/Schedule';
import NotificationsIcon from '@mui/icons-material/Notifications';

import { ImportStats } from '../components/import/ImportStats';
import { ImportConfiguration } from '../components/import/ImportConfiguration';
import { CSVPreview } from '../components/import/CSVPreview';
import { ValidationSummary } from '../components/import/ValidationSummary';
import { ProcessingProgress } from '../components/import/ProcessingProgress';
import { ImportResult } from '../components/import/ImportResult';
import { ImportHistory } from '../components/import/ImportHistory';
import { ImportDetailModal } from '../components/import/ImportDetailModal';

import { importApi, DataImport, DetailedValidationResponse, ImportPreviewResponse } from '../api/importApi';

export const DataImportPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  
  const [history, setHistory] = useState<DataImport[]>([]);
  
  // Wizard state
  const [step, setStep] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  
  const [previewData, setPreviewData] = useState<ImportPreviewResponse | null>(null);
  const [validationData, setValidationData] = useState<DetailedValidationResponse | null>(null);
  const [activeImport, setActiveImport] = useState<DataImport | null>(null);
  const [modalImportId, setModalImportId] = useState<number | null>(null);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, historyRes] = await Promise.all([
        importApi.getStats(),
        importApi.getHistory(1, 5)
      ]);
      setStats(statsRes);
      setHistory(historyRes);
    } catch (error) {
      console.error("Error fetching dashboard data", error);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleValidate = async (file: File, type: string) => {
    setIsLoading(true);
    try {
      // 1. Upload
      const preview = await importApi.uploadFile(file, type);
      setPreviewData(preview);
      
      // 2. Validate
      const validation = await importApi.validateImport(preview.importId);
      setValidationData({
        ...validation,
        previewData: preview.previewData
      });
      setStep(1);
    } catch (error) {
      console.error("Upload/Validate failed", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewData?.importId) return;
    setIsLoading(true);
    try {
      const result = await importApi.processImport(previewData.importId);
      setActiveImport(result);
      setStep(2);
      fetchDashboardData();
    } catch (error) {
      console.error("Processing failed", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelValidation = () => {
    setStep(0);
    setPreviewData(null);
    setValidationData(null);
  };

  const handleProcessingComplete = (data: DataImport) => {
    setActiveImport(data);
    setStep(3);
    fetchDashboardData();
  };

  const handleReset = () => {
    setStep(0);
    setPreviewData(null);
    setValidationData(null);
    setActiveImport(null);
  };

  return (
    <Box sx={{ bgcolor: '#f5f7fa', minHeight: '100vh', p: 3 }}>
      {/* Page Header */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Data Import &amp; Bulk Processing</Typography>
        <Typography variant="body2" color="text.secondary">
          Upload, validate and import your data with complete tracking and error handling
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Box sx={{ mb: 4 }}>
        <ImportStats stats={stats} isLoading={statsLoading} />
      </Box>

      <Grid container spacing={3}>
        {/* Left Column - Main Wizard */}
        <Grid size={{ xs: 12, md: 8 }}>
          {step === 0 && (
            <Box>
              <ImportConfiguration onValidate={handleValidate} isLoading={isLoading} />
            </Box>
          )}

          {step === 1 && validationData && previewData && (
            <Box>
              <ValidationSummary
                validationResult={validationData}
                onConfirm={handleConfirmImport}
                onCancel={handleCancelValidation}
                isLoading={isLoading}
              />
              <CSVPreview
                columns={previewData.columns}
                previewData={previewData.previewData}
              />
            </Box>
          )}

          {step === 2 && activeImport && (
            <ProcessingProgress
              importId={activeImport.id}
              initialData={activeImport}
              onComplete={handleProcessingComplete}
              onCancel={handleReset}
            />
          )}

          {step === 3 && activeImport && (
            <ImportResult
              data={activeImport}
              onReset={handleReset}
            />
          )}
        </Grid>

        {/* Right Column - Sidebar */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Box sx={{ mb: 3 }}>
            <ImportHistory history={history} onView={(id) => setModalImportId(id)} />
          </Box>

          <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>Quick Actions</Typography>
            <List dense>
              <ListItem>
                <ListItemIcon><HistoryIcon color="primary" /></ListItemIcon>
                <ListItemText primary="View Import History" />
              </ListItem>
              <ListItem>
                <ListItemIcon><AssessmentIcon color="error" /></ListItemIcon>
                <ListItemText primary="Download Error Report" secondary="Last failed import" />
              </ListItem>
              <ListItem>
                <ListItemIcon><ScheduleIcon color="primary" /></ListItemIcon>
                <ListItemText primary="Manage Scheduled Imports" />
              </ListItem>
            </List>
          </Paper>

          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>Recent Notifications</Typography>
            <List dense>
              <ListItem>
                <ListItemIcon><NotificationsIcon fontSize="small" color="primary" /></ListItemIcon>
                <ListItemText
                  primary="Import completed"
                  secondary="Products import completed successfully."
                />
              </ListItem>
            </List>
          </Paper>
        </Grid>
      </Grid>

      <ImportDetailModal
        importId={modalImportId}
        onClose={() => setModalImportId(null)}
      />
    </Box>
  );
};

export default DataImportPage;
