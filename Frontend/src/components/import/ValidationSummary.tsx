import { Box, Typography, Paper, Grid, Button } from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Description as DescriptionIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import { ImportValidationResponse } from '../../api/importApi';

interface ValidationSummaryProps {
  validationData: ImportValidationResponse;
}

export default function ValidationSummary({ validationData }: ValidationSummaryProps) {
  return (
    <Paper sx={{ p: 3, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Validation Summary</Typography>
        <Button size="small" sx={{ textTransform: 'none' }}>View Invalid/Duplicate Records {'>'}</Button>
      </Box>
      <Grid container spacing={2}>
        <Grid size={3}>
          <Box sx={{ p: 2, border: '1px solid #eee', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ p: 1, bgcolor: '#f5f5f5', borderRadius: '50%' }}>
              <DescriptionIcon color="action" />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Total Records</Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>{validationData.totalRecords}</Typography>
            </Box>
          </Box>
        </Grid>
        <Grid size={3}>
          <Box sx={{ p: 2, border: '1px solid #eee', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2, borderColor: '#e8f5e9' }}>
            <Box sx={{ p: 1, bgcolor: '#e8f5e9', borderRadius: '50%' }}>
              <CheckCircleIcon color="success" />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Valid Records</Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'success.main' }}>{validationData.validRecords}</Typography>
              <Typography variant="caption" color="success.main">{((validationData.validRecords/validationData.totalRecords)*100).toFixed(1)}%</Typography>
            </Box>
          </Box>
        </Grid>
        <Grid size={3}>
          <Box sx={{ p: 2, border: '1px solid #eee', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2, borderColor: '#ffebee' }}>
            <Box sx={{ p: 1, bgcolor: '#ffebee', borderRadius: '50%' }}>
              <WarningIcon color="error" />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Invalid Records</Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'error.main' }}>{validationData.invalidRecords}</Typography>
              <Typography variant="caption" color="error.main">{((validationData.invalidRecords/validationData.totalRecords)*100).toFixed(1)}%</Typography>
            </Box>
          </Box>
        </Grid>
        <Grid size={3}>
          <Box sx={{ p: 2, border: '1px solid #eee', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2, borderColor: '#f3e5f5' }}>
            <Box sx={{ p: 1, bgcolor: '#f3e5f5', borderRadius: '50%' }}>
              <PeopleIcon sx={{ color: '#9c27b0' }} />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Duplicate Records</Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#9c27b0' }}>{validationData.duplicateRecords}</Typography>
              <Typography variant="caption" sx={{ color: '#9c27b0' }}>{((validationData.duplicateRecords/validationData.totalRecords)*100).toFixed(1)}%</Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
}
