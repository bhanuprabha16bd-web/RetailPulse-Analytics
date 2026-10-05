import React from 'react';
import { Paper, Typography, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, IconButton } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import { DataImport, importApi } from '../../api/importApi';

interface ImportHistoryProps {
  history: DataImport[];
  onView: (id: number) => void;
}

export const ImportHistory: React.FC<ImportHistoryProps> = ({ history, onView }) => {
  
  const getStatusChip = (status: string) => {
    switch(status) {
      case 'Completed': return <Chip size="small" label={status} color="success" />;
      case 'Completed with Errors': return <Chip size="small" label={status} color="warning" />;
      case 'Failed': return <Chip size="small" label={status} color="error" />;
      case 'Processing': return <Chip size="small" label={status} color="primary" />;
      default: return <Chip size="small" label={status} color="default" />;
    }
  };

  return (
    <Paper sx={{ p: 2, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Import History</Typography>
        <Typography variant="body2" color="primary" sx={{ cursor: 'pointer' }}>View All</Typography>
      </Box>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>File Name</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {history.map((row) => (
              <TableRow key={row.id}>
                <TableCell>#{row.id}</TableCell>
                <TableCell>{row.importType}</TableCell>
                <TableCell>{row.filename}</TableCell>
                <TableCell>{getStatusChip(row.status)}</TableCell>
                <TableCell>{new Date(row.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => onView(row.id)}>
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                  {(row.failedRecords > 0) && (
                    <IconButton size="small" onClick={() => importApi.downloadErrorCsv(row.id)}>
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {history.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">No import history found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};
