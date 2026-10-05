import React from 'react';
import { Box, Paper, Typography, Button, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip } from '@mui/material';
import { DetailedValidationResponse } from '../../api/importApi';

interface ValidationSummaryProps {
  validationResult: DetailedValidationResponse;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

export const ValidationSummary: React.FC<ValidationSummaryProps> = ({ validationResult, onConfirm, onCancel, isLoading }) => {
  return (
    <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Validation Summary</Typography>
        <Chip label="Validation Completed" color="success" size="small" />
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
            <Typography variant="body2" color="textSecondary">Total Rows</Typography>
            <Typography variant="h5">{validationResult.totalRecords}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e8f5e9' }}>
            <Typography variant="body2" color="textSecondary">Valid</Typography>
            <Typography variant="h5" color="success.main">{validationResult.validRecords}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#ffebee' }}>
            <Typography variant="body2" color="textSecondary">Invalid</Typography>
            <Typography variant="h5" color="error.main">{validationResult.invalidRecords}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#fff8e1' }}>
            <Typography variant="body2" color="textSecondary">Duplicates</Typography>
            <Typography variant="h5" color="warning.main">{validationResult.duplicateRecords}</Typography>
          </Paper>
        </Grid>
      </Grid>

      {validationResult.validationErrors.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="error" gutterBottom>
            Validation Errors ({validationResult.validationErrors.length} issues found)
          </Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 250 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Row</TableCell>
                  <TableCell>Field</TableCell>
                  <TableCell>Error Type</TableCell>
                  <TableCell>Message</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {validationResult.validationErrors.map((err, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{err.rowNumber}</TableCell>
                    <TableCell>{err.field || '-'}</TableCell>
                    <TableCell><Chip size="small" label={err.errorType} color="error" variant="outlined" /></TableCell>
                    <TableCell>{err.errorMessage}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
        Please review the summary before confirming import.
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button onClick={onCancel} variant="outlined">Cancel</Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          disabled={isLoading || validationResult.validRecords === 0}
        >
          {isLoading ? 'Processing...' : `Confirm Import (${validationResult.validRecords} records)`}
        </Button>
      </Box>
    </Paper>
  );
};

export default ValidationSummary;
