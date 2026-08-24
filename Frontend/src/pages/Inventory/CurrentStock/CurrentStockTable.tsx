import { TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Chip } from '@mui/material';

interface CurrentStockTableProps {
  visibleProducts: any[];
}

export default function CurrentStockTable({ visibleProducts }: CurrentStockTableProps) {
  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Product Name</TableCell>
            <TableCell>SKU</TableCell>
            <TableCell>Category</TableCell>
            <TableCell>Brand</TableCell>
            <TableCell align="right">Current</TableCell>
            <TableCell align="right">Reserved</TableCell>
            <TableCell align="right">Available</TableCell>
            <TableCell align="right">Reorder Lvl</TableCell>
            <TableCell align="center">Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {visibleProducts.map(p => (
            <TableRow key={p.id} hover>
              <TableCell sx={{ fontWeight: 500 }}>{p.name}</TableCell>
              <TableCell>{p.sku}</TableCell>
              <TableCell>{p.categoryName}</TableCell>
              <TableCell>{p.brand || '—'}</TableCell>
              <TableCell align="right">{p.stockQuantity}</TableCell>
              <TableCell align="right">{p.reservedStock}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>{p.available}</TableCell>
              <TableCell align="right">{p.reorderLevel}</TableCell>
              <TableCell align="center"><Chip label={p.statusObj.label} color={p.statusObj.color} size="small" /></TableCell>
            </TableRow>
          ))}
          {!visibleProducts.length && (
            <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4 }}>No products found matching filters.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
