import React from 'react';
import { Paper, Typography, Button, Box, Alert } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { DataImport, importApi } from '../../api/importApi';

interface ImportResultProps {
  data: DataImport;
  onReset: () => void;
}

export const ImportResult: React.FC<ImportResultProps> = ({ data, onReset }) => {
  let severity: 'success' | 'warning' | 'error' | 'info' = 'info';
  if (data.status === 'Completed') severity = 'success';
  if (data.status === 'Completed with Errors') severity = 'warning';
  if (data.status === 'Failed') severity = 'error';
  if (data.status === 'Cancelled') severity = 'warning';

  return (
    <Paper sx={{ p: 3, borderRadius: 2 }}>
      <Alert severity={severity} sx={{ mb: 3 }}>
        <Typography variant="subtitle1">
          {data.status === 'Completed' && 'Import completed successfully!'}
          {data.status === 'Completed with Errors' && 'Import completed with some errors.'}
          {data.status === 'Failed' && 'Import failed.'}
          {data.status === 'Cancelled' && 'Import cancelled.'}
        </Typography>
        <Typography variant="body2">
          {data.successfulRecords} records processed successfully. {data.failedRecords} failed, {data.duplicateRecords} duplicates.
        </Typography>
      </Alert>

      <Box sx={{ display: 'flex', gap: 2 }}>
        {(data.failedRecords > 0 || data.status === 'Completed with Errors') && (
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<DownloadIcon />}
            onClick={() => importApi.downloadErrorCsv(data.id)}
          >
            Download Result CSV
          </Button>
        )}
        <Button variant="outlined" onClick={onReset}>
          Start New Import
        </Button>
      </Box>
    </Paper>
  );
};
