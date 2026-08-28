import {
  Box, Typography, Paper, Button, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { DataImport } from '../../api/importApi';

interface ImportHistoryProps {
  historyData?: DataImport[];
  refetchHistory: () => void;
}

export default function ImportHistory({ historyData, refetchHistory }: ImportHistoryProps) {
  return (
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
                  <Button size="small">View</Button>
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
  );
}
