import { useState } from 'react';
import { 
  Paper, Typography, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, TablePagination, CircularProgress, Box, Chip
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { dataQualityApi } from '../../api/dataQualityApi';
import { format } from 'date-fns';

const ReconciliationHistory = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);

  const { data, isLoading } = useQuery({
    queryKey: ['dataQualityReconciliationHistory', page, limit],
    queryFn: () => dataQualityApi.getReconciliationHistory(page, limit)
  });

  if (isLoading) {
    return (
      <Paper sx={{ p: 2, height: '100%' }}>
        <Typography variant="h6" gutterBottom>Reconciliation History</Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" gutterBottom>Reconciliation History</Typography>
      <TableContainer sx={{ flexGrow: 1 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ bgcolor: '#F8FAFC' }}>Execution ID</TableCell>
              <TableCell sx={{ bgcolor: '#F8FAFC' }}>Started At</TableCell>
              <TableCell sx={{ bgcolor: '#F8FAFC' }}>Records</TableCell>
              <TableCell sx={{ bgcolor: '#F8FAFC' }}>Issues Found</TableCell>
              <TableCell sx={{ bgcolor: '#F8FAFC' }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.history?.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell>{row.executionId.substring(0, 8)}...</TableCell>
                <TableCell>{format(new Date(row.startedAt), 'PP p')}</TableCell>
                <TableCell>{row.recordsChecked.toLocaleString()}</TableCell>
                <TableCell>{row.issuesFound.toLocaleString()}</TableCell>
                <TableCell>
                  <Chip 
                    size="small" 
                    label={row.status} 
                    color={row.status === 'Completed' ? 'success' : row.status === 'Failed' ? 'error' : 'default'}
                    variant="outlined"
                  />
                </TableCell>
              </TableRow>
            ))}
            {(!data?.history || data.history.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                  <Typography color="textSecondary">No history found.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={data?.total || 0}
        rowsPerPage={limit}
        page={page - 1}
        onPageChange={(_, newPage) => setPage(newPage + 1)}
        onRowsPerPageChange={(e) => {
          setLimit(parseInt(e.target.value, 10));
          setPage(1);
        }}
        rowsPerPageOptions={[5, 10, 25]}
      />
    </Paper>
  );
};

export default ReconciliationHistory;
