import React, { useEffect, useState } from 'react';
import { Paper, Typography, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, Chip, Button } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { importApi, DataImportError } from '../../api/importApi';

interface ErrorRecordsTableProps {
  importId: number;
}

export const ErrorRecordsTable: React.FC<ErrorRecordsTableProps> = ({ importId }) => {
  const [errors, setErrors] = useState<DataImportError[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchErrors = async () => {
      setLoading(true);
      try {
        const res = await importApi.getErrors(importId, page + 1, rowsPerPage);
        setErrors(res);
      } catch(err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchErrors();
  }, [importId, page, rowsPerPage]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Error Records</Typography>
        <Button 
          startIcon={<DownloadIcon />} 
          variant="outlined" 
          size="small"
          onClick={() => importApi.downloadErrorCsv(importId)}
        >
          Download Error CSV
        </Button>
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Row #</TableCell>
              <TableCell>Record Data</TableCell>
              <TableCell>Error Type</TableCell>
              <TableCell>Error Message</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} align="center">Loading...</TableCell></TableRow>
            ) : errors.length === 0 ? (
              <TableRow><TableCell colSpan={4} align="center">No errors found.</TableCell></TableRow>
            ) : (
              errors.map((err) => (
                <TableRow key={err.id}>
                  <TableCell>{err.rowNumber}</TableCell>
                  <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {err.rawData || '-'}
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={err.errorType} color="error" variant="outlined" />
                  </TableCell>
                  <TableCell>{err.errorMessage}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={-1} // Since we don't have total count in API currently, or we can handle it if added
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_e, newPage) => setPage(newPage)}
        onRowsPerPageChange={(_e) => {
          setRowsPerPage(parseInt(_e.target.value, 10));
          setPage(0);
        }}
        labelDisplayedRows={({ from, to }) => `${from}-${to}`}
      />
    </Box>
  );
};
