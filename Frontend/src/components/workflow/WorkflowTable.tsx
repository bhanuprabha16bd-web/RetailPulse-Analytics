import React from 'react';
import { 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Paper, Chip, IconButton, Skeleton, Box, Typography, TablePagination 
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AssignmentIcon from '@mui/icons-material/Assignment';
import StoreIcon from '@mui/icons-material/Store';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import InventoryIcon from '@mui/icons-material/Inventory';
import { WorkflowRequest } from '../../api/workflowApi';

interface WorkflowTableProps {
  requests: WorkflowRequest[];
  isLoading: boolean;
  total: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (event: unknown, newPage: number) => void;
  onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onViewRequest: (id: string) => void;
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'Product Price Change': return <MonetizationOnIcon fontSize="small" color="primary" />;
    case 'Stock Adjustment': return <InventoryIcon fontSize="small" color="secondary" />;
    case 'Store Location Update': return <StoreIcon fontSize="small" color="info" />;
    case 'New Promotional Campaign': return <LocalOfferIcon fontSize="small" color="warning" />;
    case 'Budget Override': return <AssignmentIcon fontSize="small" color="error" />;
    default: return <AssignmentIcon fontSize="small" />;
  }
};

const getPriorityColor = (priority: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
  switch (priority) {
    case 'High':
    case 'Critical': return 'error';
    case 'Medium': return 'warning';
    case 'Low': return 'success';
    default: return 'default';
  }
};

const getStatusColor = (status: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
  switch (status) {
    case 'Approved': return 'success';
    case 'Rejected': return 'error';
    case 'Cancelled': return 'default';
    default: return 'warning'; // 'Pending Approval' will use orange via warning, or we could use custom styling
  }
};

const getStatusProps = (status: string) => {
  if (status === 'Pending Approval') {
    return { sx: { bgcolor: '#ed6c02', color: 'white' } }; // Custom orange
  }
  return { color: getStatusColor(status) };
};

const WorkflowTable: React.FC<WorkflowTableProps> = ({ 
  requests, isLoading, total, page, rowsPerPage, onPageChange, onRowsPerPageChange, onViewRequest 
}) => {
  return (
    <Paper sx={{ width: '100%', mb: 2 }}>
      <TableContainer>
        <Table sx={{ minWidth: 750 }} size="medium">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Requested By</TableCell>
              <TableCell>Related Record</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              Array.from(new Array(rowsPerPage)).map((_, index) => (
                <TableRow key={index}>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                </TableRow>
              ))
            ) : requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    No requests found matching the criteria.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              requests.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getTypeIcon(row.requestType)}
                      <Typography sx={{ fontFamily: 'monospace' }}>{row.requestId}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{row.requestType}</TableCell>
                  <TableCell>{row.requesterName || '-'}</TableCell>
                  <TableCell>{row.relatedRecordLabel || '-'}</TableCell>
                  <TableCell sx={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {row.reason}
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={row.priority} color={getPriorityColor(row.priority)} />
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={row.status} {...getStatusProps(row.status)} />
                  </TableCell>
                  <TableCell>{new Date(row.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell align="center">
                    <IconButton size="small" color="primary" onClick={() => onViewRequest(row.requestId)}>
                      <VisibilityIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={total}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
      />
    </Paper>
  );
};

export default WorkflowTable;
