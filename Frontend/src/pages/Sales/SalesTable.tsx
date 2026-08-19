import { Box, Chip, CircularProgress, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { DeleteOutlined, VisibilityOutlined } from '@mui/icons-material';
import { Sale, currency } from './SalesShared';

interface SalesTableProps {
  loading: boolean;
  visibleSales: Sale[];
  setDetail: (sale: Sale) => void;
  setDeleteTarget: (sale: Sale) => void;
}

export default function SalesTable({ loading, visibleSales, setDetail, setDeleteTarget }: SalesTableProps) {
  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 7 }}><CircularProgress /></Box>;
  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Invoice</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>Customer</TableCell>
            <TableCell>Channel</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Items</TableCell>
            <TableCell align="right">Total Amount</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {visibleSales.map((sale) => (
            <TableRow key={sale.id} hover>
              <TableCell sx={{ fontWeight: 600 }}>{sale.invoiceNumber}</TableCell>
              <TableCell>{new Date(sale.createdAt).toLocaleDateString()}</TableCell>
              <TableCell>{sale.customerName || '—'}</TableCell>
              <TableCell>{sale.salesChannel}</TableCell>
              <TableCell>
                <Chip size="small" label={sale.paymentStatus} color={sale.paymentStatus === 'Paid' ? 'success' : sale.paymentStatus === 'Pending' ? 'warning' : 'error'} />
              </TableCell>
              <TableCell align="right">{sale.items.length}</TableCell>
              <TableCell align="right">{currency.format(sale.totalAmount)}</TableCell>
              <TableCell align="right">
                <IconButton onClick={() => setDetail(sale)}>
                  <VisibilityOutlined fontSize="small" />
                </IconButton>
                <IconButton color="error" onClick={() => setDeleteTarget(sale)}>
                  <DeleteOutlined fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
          {!visibleSales.length && (
            <TableRow>
              <TableCell colSpan={8} align="center" sx={{ py: 5 }}>No sales found.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
