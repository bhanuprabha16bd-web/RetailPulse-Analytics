import React from 'react';
import { Box, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Chip, Typography } from '@mui/material';

interface Props {
  movements: any[];
}

const StockMovements: React.FC<Props> = ({ movements }) => {

  const getMovementColor = (type: string, qty: number) => {
    if (type === 'Sale' || type === 'Stock Removal' || qty < 0) return 'error';
    if (type === 'Stock Addition' || type === 'Return' || qty > 0) return 'success';
    return 'default';
  };

  return (
    <Box>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date & Time</TableCell>
              <TableCell>Product</TableCell>
              <TableCell>Movement Type</TableCell>
              <TableCell align="right">Prev Qty</TableCell>
              <TableCell align="right">Updated Qty</TableCell>
              <TableCell align="right">Change</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Adjusted By</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {movements.map(m => (
              <TableRow key={m.id} hover>
                <TableCell>{new Date(m.timestamp).toLocaleString()}</TableCell>
                <TableCell sx={{ fontWeight: 500 }}>{m.product?.name || `Product ID ${m.productId}`}</TableCell>
                <TableCell><Chip label={m.movementType} size="small" variant="outlined" color={getMovementColor(m.movementType, m.quantityChanged)} /></TableCell>
                <TableCell align="right">{m.previousQuantity ?? '—'}</TableCell>
                <TableCell align="right">{m.updatedQuantity ?? '—'}</TableCell>
                <TableCell align="right" sx={{ color: m.quantityChanged > 0 ? 'success.main' : 'error.main', fontWeight: 'bold' }}>
                  {m.quantityChanged > 0 ? '+' : ''}{m.quantityChanged}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{m.reason || m.referenceId || '—'}</Typography>
                  {m.remarks && <Typography variant="caption" color="text.secondary">{m.remarks}</Typography>}
                </TableCell>
                <TableCell>{m.user?.fullName || 'System'}</TableCell>
              </TableRow>
            ))}
            {!movements.length && (
              <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4 }}>No stock movements recorded yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default StockMovements;
