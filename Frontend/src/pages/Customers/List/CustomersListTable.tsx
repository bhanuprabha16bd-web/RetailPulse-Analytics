import { TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Skeleton, Chip, Tooltip, IconButton, Typography, Button } from '@mui/material';
import { Visibility, EditOutlined, DeleteOutlined, Add } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Customer } from '../../../api/customers';

const formatCurrency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);

interface CustomersListTableProps {
  loading: boolean;
  shown: Customer[];
  segmentColors: Record<string, any>;
  edit: (c: Customer) => void;
  setTarget: (c: Customer) => void;
  create: () => void;
}

export default function CustomersListTable({
  loading, shown, segmentColors, edit, setTarget, create
}: CustomersListTableProps) {
  const navigate = useNavigate();
  return (
    <TableContainer>
      <Table sx={{ minWidth: 940 }}>
        <TableHead>
          <TableRow>
            <TableCell>Customer Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Phone Number</TableCell>
            <TableCell>Customer Segment</TableCell>
            <TableCell align="right">Total Purchases</TableCell>
            <TableCell align="right">Total Spend</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              {Array.from({ length: 8 }).map((__, j) => <TableCell key={j}><Skeleton /></TableCell>)}
            </TableRow>
          )) : shown.map(c => (
            <TableRow key={c.id} hover>
              <TableCell sx={{ fontWeight: 600 }}>{c.fullName}</TableCell>
              <TableCell>{c.email}</TableCell>
              <TableCell>{c.phone}</TableCell>
              <TableCell><Chip size="small" label={c.segment.replace(' Customer', '')} color={segmentColors[c.segment] || 'default'} /></TableCell>
              <TableCell align="right">{c.purchaseSummary?.totalOrders || 0}</TableCell>
              <TableCell align="right">{formatCurrency(c.purchaseSummary?.totalRevenue || 0)}</TableCell>
              <TableCell><Chip size="small" label={c.status} color={c.status === 'Active' ? 'success' : 'default'} /></TableCell>
              <TableCell align="right">
                <Tooltip title="View details"><IconButton onClick={() => navigate(`/customers/${c.id}`)}><Visibility fontSize="small" /></IconButton></Tooltip>
                <Tooltip title="Edit customer"><IconButton onClick={() => edit(c)}><EditOutlined fontSize="small" /></IconButton></Tooltip>
                <Tooltip title="Remove customer"><IconButton color="error" onClick={() => setTarget(c)}><DeleteOutlined fontSize="small" /></IconButton></Tooltip>
              </TableCell>
            </TableRow>
          ))}
          {!loading && !shown.length && (
            <TableRow>
              <TableCell colSpan={8} align="center" sx={{ py: 7 }}>
                <Typography sx={{ fontWeight: 600 }}>No customers found</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Add your first customer or adjust the filters.</Typography>
                <Button sx={{ mt: 2 }} variant="contained" startIcon={<Add />} onClick={create}>Add Customer</Button>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
