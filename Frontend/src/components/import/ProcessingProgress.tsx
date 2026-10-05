import React, { useEffect, useState, useRef } from 'react';
import { Box, Paper, Typography, CircularProgress, Button, LinearProgress } from '@mui/material';
import { importApi, DataImport } from '../../api/importApi';

interface ProcessingProgressProps {
  importId: number;
  initialData?: DataImport;
  onComplete: (data: DataImport) => void;
  onCancel: () => void;
}

export const ProcessingProgress: React.FC<ProcessingProgressProps> = ({ importId, initialData, onComplete, onCancel }) => {
  const [data, setData] = useState<DataImport | null>(initialData || null);
  const intervalRef = useRef<number | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await importApi.getStatus(importId);
      setData(res);
      if (['Completed', 'Completed with Errors', 'Failed', 'Cancelled'].includes(res.status)) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        onComplete(res);
      }
    } catch (err) {
      console.error("Error fetching status", err);
    }
  };

  useEffect(() => {
    fetchStatus();
    intervalRef.current = window.setInterval(fetchStatus, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [importId]);

  const handleCancel = async () => {
    try {
      await importApi.cancelImport(importId);
      if (intervalRef.current) clearInterval(intervalRef.current);
      onCancel();
    } catch (err) {
      console.error(err);
    }
  };

  const progress = data?.processingProgress || 0;

  return (
    <Paper sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}>
      <Typography variant="h6" gutterBottom>Processing Import #{importId}</Typography>

      <Box sx={{ position: 'relative', display: 'inline-flex', my: 3 }}>
        <CircularProgress variant="determinate" value={progress} size={120} thickness={4} />
        <Box
          sx={{
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="h5" component="div" color="text.secondary">
            {Math.round(progress)}%
          </Typography>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 400, mx: 'auto', mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="textSecondary">Upload Completed</Typography>
          <Typography variant="body2" color="textSecondary">Validate</Typography>
          <Typography variant="body2" color="textSecondary">Process In Progress</Typography>
        </Box>
        <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4 }} />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mb: 3 }}>
        <Box>
          <Typography variant="body2" color="textSecondary">Processed</Typography>
          <Typography variant="subtitle1">
            {data ? `${data.successfulRecords + data.failedRecords} / ${data.totalRecords}` : '0 / 0'}
          </Typography>
        </Box>
        <Box>
          <Typography variant="body2" color="textSecondary">Speed</Typography>
          <Typography variant="subtitle1">{data?.processingSpeed || 0} rec/min</Typography>
        </Box>
      </Box>

      <Button variant="outlined" color="warning" onClick={handleCancel}>
        Cancel Import
      </Button>
    </Paper>
  );
};

export default ProcessingProgress;
