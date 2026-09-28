import React from 'react';
import { 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Paper, TablePagination, Chip, IconButton, Checkbox, Box, CircularProgress, Typography
} from '@mui/material';
import { Visibility as VisibilityIcon, MoreVert as MoreVertIcon } from '@mui/icons-material';
import { format } from 'date-fns';
import { DataQualityIssue } from '../../api/dataQualityApi';
import { getSeverityColor, getStatusColor } from './DataQualityShared';

interface DataQualityTableProps {
  issues: DataQualityIssue[];
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onSelectIssue: (id: number) => void;
  isLoading: boolean;
}

const DataQualityTable: React.FC<DataQualityTableProps> = ({
  issues, total, page, limit, onPageChange, onLimitChange, onSelectIssue, isLoading
}) => {

  if (isLoading) {
    return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;
  }

  if (!issues.length) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="textSecondary">No issues found.</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox"><Checkbox /></TableCell>
              <TableCell sx={{ bgcolor: '#F8FAFC' }}>Issue ID</TableCell>
              <TableCell sx={{ bgcolor: '#F8FAFC' }}>Type</TableCell>
              <TableCell sx={{ bgcolor: '#F8FAFC' }}>Severity</TableCell>
              <TableCell sx={{ bgcolor: '#F8FAFC' }}>Module</TableCell>
              <TableCell sx={{ bgcolor: '#F8FAFC' }}>Affected Record</TableCell>
              <TableCell sx={{ bgcolor: '#F8FAFC' }}>Description</TableCell>
              <TableCell sx={{ bgcolor: '#F8FAFC' }}>Detected At</TableCell>
              <TableCell sx={{ bgcolor: '#F8FAFC' }}>Status</TableCell>
              <TableCell sx={{ bgcolor: '#F8FAFC', align: 'center' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {issues.map((row) => (
              <TableRow 
                hover 
                key={row.id} 
                onClick={() => onSelectIssue(row.id)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}><Checkbox /></TableCell>
                <TableCell>{row.issueId}</TableCell>
                <TableCell>{row.issueType}</TableCell>
                <TableCell>
                  <Chip size="small" label={row.severity} sx={getSeverityColor(row.severity)} />
                </TableCell>
                <TableCell>{row.module}</TableCell>
                <TableCell>{row.affectedRecord}</TableCell>
                <TableCell sx={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {row.description}
                </TableCell>
                <TableCell>{format(new Date(row.detectedAt), 'PP')}</TableCell>
                <TableCell>
                  <Chip size="small" label={row.status} sx={getStatusColor(row.status)} />
                </TableCell>
                <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                  <IconButton size="small" onClick={() => onSelectIssue(row.id)}>
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small">
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={total}
        rowsPerPage={limit}
        page={page - 1}
        onPageChange={(_, newPage) => onPageChange(newPage + 1)}
        onRowsPerPageChange={(e) => onLimitChange(parseInt(e.target.value, 10))}
      />
    </Paper>
  );
};

export default DataQualityTable;
