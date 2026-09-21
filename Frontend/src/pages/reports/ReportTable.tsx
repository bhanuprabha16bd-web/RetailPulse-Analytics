import {
  Box,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material';

import type { ReportResponse } from './types';
import { humanize } from './utils';

interface ReportTableProps {
  report: ReportResponse | null;
  loading: boolean;
  page: number;
  sortBy: string;
  sortOrder: string;
  onSort: (key: string) => void;
  onPageChange: (nextPage: number) => void;
}

export function ReportTable({
  report,
  loading,
  page,
  sortBy,
  sortOrder,
  onSort,
  onPageChange,
}: ReportTableProps) {
  if (loading) {
    return (
      <Paper variant="outlined" sx={{ overflow: 'auto' }}>
        <Box sx={{ p: 6, textAlign: 'center' }}>
          <CircularProgress />
        </Box>
      </Paper>
    );
  }

  if (!report || !report.rows.length) {
    return (
      <Paper variant="outlined" sx={{ overflow: 'auto' }}>
        <Box sx={{ p: 6, textAlign: 'center' }}>
          <Typography color="text.secondary">Generate a report to view matching data.</Typography>
        </Box>
      </Paper>
    );
  }

  const columnKeys = Object.keys(report.rows[0]);

  return (
    <Paper variant="outlined" sx={{ overflow: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {columnKeys.map((key) => (
              <TableCell
                key={key}
                onClick={() => onSort(key)}
                sx={{ fontWeight: 700, whiteSpace: 'nowrap', cursor: 'pointer' }}
              >
                {humanize(key)} {sortBy === key ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>

        <TableBody>
          {report.rows.map((row, index) => (
            <TableRow key={index}>
              {columnKeys.map((key) => (
                <TableCell key={key} sx={{ whiteSpace: 'nowrap' }}>
                  {row[key] == null ? '-' : String(row[key])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <TablePagination
        component="div"
        count={report.total}
        page={page}
        rowsPerPage={25}
        onPageChange={(_, nextPage) => onPageChange(nextPage)}
        rowsPerPageOptions={[25]}
      />
    </Paper>
  );
}
