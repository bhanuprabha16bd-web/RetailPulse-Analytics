import React, { useState } from 'react';
import {
  Box, Typography, Paper, Button, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, Grid
} from '@mui/material';
import { Refresh as RefreshIcon, Download as DownloadIcon } from '@mui/icons-material';
import { importApi, DataImport } from '../../api/importApi';

interface ImportHistoryProps {
  historyData?: DataImport[];
  refetchHistory: () => void;
}

export default function ImportHistory({ historyData, refetchHistory }: ImportHistoryProps) {
  const [selectedImport, setSelectedImport] = useState<DataImport | null>(null);

  const handleView = (row: DataImport) => {
    setSelectedImport(row);
  };

  const handleClose = () => {
    setSelectedImport(null);
  };

  const handleDownloadErrors = async () => {
    if (!selectedImport) return;
    try {
      const errors = await importApi.getErrors(selectedImport.id);
      if (!errors || errors.length === 0) {
        alert("No errors found for this import.");
        return;
      }
      
      const headers = ['Row Number', 'Error Type', 'Error Message', 'Raw Data'];
      const csvRows = [headers.join(',')];
      
      errors.forEach(err => {
        const row = [
          err.rowNumber,
          `"${err.errorType}"`,
          `"${err.errorMessage.replace(/"/g, '""')}"`,
          `"${(err.rawData || '').replace(/"/g, '""')}"`
        ];
        csvRows.push(row.join(','));
      });
      
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `import_IMP-${selectedImport.id.toString().padStart(4, '0')}_errors.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error) {
      console.error("Failed to fetch errors:", error);
      alert("Failed to download errors.");
    }
  };

  return (
    <>
      <Paper sx={{ mt: 3, p: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Import History</Typography>
          <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={refetchHistory}>Refresh</Button>
        </Box>
        
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f9fafb' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Import ID</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Import Type</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Filename</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Upload Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Total</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Successful</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Failed</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {historyData?.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>IMP-{row.id.toString().padStart(4, '0')}</TableCell>
                  <TableCell>{row.importType}</TableCell>
                  <TableCell>{row.filename}</TableCell>
                  <TableCell>{new Date(row.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{row.totalRecords}</TableCell>
                  <TableCell sx={{ color: 'success.main', fontWeight: 'bold' }}>{row.successfulRecords}</TableCell>
                  <TableCell sx={{ color: 'error.main', fontWeight: 'bold' }}>{row.failedRecords}</TableCell>
                  <TableCell>
                    <Chip 
                      label={row.status} 
                      size="small"
                      color={
                        row.status === 'Completed' ? 'success' : 
                        row.status === 'Completed with Errors' ? 'warning' :
                        row.status === 'Failed' ? 'error' : 'default'
                      }
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => handleView(row)}>View</Button>
                  </TableCell>
                </TableRow>
              ))}
              {!historyData?.length && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 3 }}>No imports found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Import Details Dialog */}
      <Dialog open={!!selectedImport} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Import Details</DialogTitle>
        <DialogContent dividers>
          {selectedImport && (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Import ID</Typography>
                <Typography variant="body1" fontWeight="bold">IMP-{selectedImport.id.toString().padStart(4, '0')}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Type</Typography>
                <Typography variant="body1" fontWeight="bold">{selectedImport.importType}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">Filename</Typography>
                <Typography variant="body1">{selectedImport.filename}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Total Records</Typography>
                <Typography variant="body1" fontWeight="bold">{selectedImport.totalRecords}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Successful</Typography>
                <Typography variant="body1" fontWeight="bold" color="success.main">{selectedImport.successfulRecords}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Failed</Typography>
                <Typography variant="body1" fontWeight="bold" color="error.main">{selectedImport.failedRecords}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Duplicates</Typography>
                <Typography variant="body1" fontWeight="bold" color="warning.main">{selectedImport.duplicateRecords}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">Status</Typography>
                <Box mt={0.5}>
                  <Chip 
                    label={selectedImport.status} 
                    size="small"
                    color={
                      selectedImport.status === 'Completed' ? 'success' : 
                      selectedImport.status === 'Completed with Errors' ? 'warning' :
                      selectedImport.status === 'Failed' ? 'error' : 'default'
                    }
                  />
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
          {(selectedImport?.failedRecords || 0) > 0 || (selectedImport?.duplicateRecords || 0) > 0 ? (
            <Button 
              variant="outlined" 
              color="error" 
              startIcon={<DownloadIcon />}
              onClick={handleDownloadErrors}
            >
              Download Errors
            </Button>
          ) : (
            <Box /> // Empty box to keep 'Close' button on the right
          )}
          <Button variant="contained" onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
