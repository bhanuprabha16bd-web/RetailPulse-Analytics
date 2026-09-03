import React from 'react';
import { 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Paper, TablePagination, Chip, Button 
} from '@mui/material';
import { AuditLog, AuditLogFilters } from '../../api/auditApi';
import VisibilityIcon from '@mui/icons-material/Visibility';

interface AuditTableProps {
  logs: AuditLog[];
  total: number;
  filters: AuditLogFilters;
  setFilters: React.Dispatch<React.SetStateAction<AuditLogFilters>>;
  onRowClick: (log: AuditLog) => void;
}

const AuditTable: React.FC<AuditTableProps> = ({ logs, total, filters, setFilters, onRowClick }) => {
  // Triggered when user clicks next/prev page buttons
  const handleChangePage = (_event: unknown, newPage: number) => {
    // Material UI Pagination uses 0-based indexing, our backend uses 1-based, so we add 1.
    setFilters(prev => ({ ...prev, page: newPage + 1 }));
  };

  // Triggered when user changes the "Rows per page" dropdown
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, limit: parseInt(event.target.value, 10), page: 1 }));
  };

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      {/* Table container provides a vertical scrollbar if the list is too long */}
      <TableContainer sx={{ maxHeight: 600 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>Time</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Resource</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>IP Address</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.length === 0 ? (
              // Empty State
              <TableRow>
                <TableCell colSpan={8} align="center">No audit logs found.</TableCell>
              </TableRow>
            ) : (
              // Iterate through logs and render a row for each
              logs.map((log) => (
                <TableRow hover key={log.id}>
                  {/* Format timestamp to a short human-readable string */}
                  <TableCell>
                    {log.createdAt ? new Intl.DateTimeFormat(undefined, { 
                      dateStyle: 'short', timeStyle: 'short' 
                    }).format(new Date(log.createdAt)) : '-'}
                  </TableCell>
                  <TableCell>{log.user ? `${log.user.name}` : 'System'}</TableCell>
                  <TableCell><Chip label={log.action} size="small" variant="outlined" /></TableCell>
                  <TableCell>{log.resourceType || '-'}</TableCell>
                  {/* Truncate long descriptions to prevent the table from stretching horizontally */}
                  <TableCell sx={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {log.description || '-'}
                  </TableCell>
                  <TableCell>{log.ipAddress || '-'}</TableCell>
                  {/* Show Green for Success, Red for Failed */}
                  <TableCell>
                    <Chip 
                      label={log.status} 
                      size="small" 
                      color={log.status === 'Success' ? 'success' : 'error'} 
                    />
                  </TableCell>
                  <TableCell align="right">
                    {/* Opens the details slide-out drawer in the parent component */}
                    <Button 
                      size="small" 
                      variant="outlined"
                      startIcon={<VisibilityIcon />} 
                      onClick={() => onRowClick(log)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Pagination Controls Footer */}
      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100]}
        component="div"
        count={total} // Total records in the database to correctly calculate total pages
        rowsPerPage={filters.limit || 25}
        page={(filters.page || 1) - 1} // Subtract 1 for MUI's 0-based indexing
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
};

export default AuditTable;
