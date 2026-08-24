import React from 'react';
import { Paper, Typography, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Chip } from '@mui/material';

interface AnalyticsLowStockTableProps {
  kpis: any;
}

const AnalyticsLowStockTable: React.FC<AnalyticsLowStockTableProps> = ({ kpis }) => {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Critical Low Stock Products</Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Product Name</TableCell>
              <TableCell align="right">Available Stock</TableCell>
              <TableCell align="right">Reorder Level</TableCell>
              <TableCell align="center">Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {kpis.top_low_stock.map((p: any, i: number) => (
              <TableRow key={i} hover>
                <TableCell>{p.name}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>{p.available}</TableCell>
                <TableCell align="right">{p.reorder_level}</TableCell>
                <TableCell align="center">
                  <Chip size="small" label={p.available <= 0 ? 'Out of Stock' : 'Low Stock'} color={p.available <= 0 ? 'error' : 'warning'} />
                </TableCell>
              </TableRow>
            ))}
            {kpis.top_low_stock.length === 0 && (
              <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3 }}>All products are sufficiently stocked.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default AnalyticsLowStockTable;
